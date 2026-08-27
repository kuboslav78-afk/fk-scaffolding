"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { parseFuelStatementPdf } from "@/lib/parse-fuel-pdf";

export async function addFuelTransaction(cardId: string, formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("fuel_transactions").insert({
    card_id: cardId,
    tx_date: formData.get("tx_date"),
    place: formData.get("place") || null,
    purpose: formData.get("purpose") || null,
    vehicle: formData.get("vehicle") || null,
    gross_amount: formData.get("gross_amount") || null,
    net_amount: formData.get("net_amount") || null,
  });

  revalidatePath(`/admin/fuel-cards/${cardId}`);
  revalidatePath("/admin/fuel-cards");
}

export async function deleteFuelTransaction(cardId: string, transactionId: string) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("fuel_transactions").delete().eq("id", transactionId);

  revalidatePath(`/admin/fuel-cards/${cardId}`);
  revalidatePath("/admin/fuel-cards");
}

export type FuelImportResult =
  | { ok: true; inserted: number; skipped: number; unmatchedCards: number[]; statementDate: string | null }
  | { ok: false; error: string };

/**
 * Naimportuje PDF výkaz od UTA. Karty sa párujú priamo podľa čísla ("EČV: KARTA N" v PDF ↔
 * fuel_cards.card_number), takže tu na rozdiel od importu faktúr netreba ručne dolaďovať zhody.
 * Duplicity (opakovaný import toho istého výkazu) sa preskočia podľa unique (card_id, doc_number, purpose).
 */
export async function importFuelStatementPdf(formData: FormData): Promise<FuelImportResult> {
  const requester = await getProfile();
  if (requester?.role !== "admin") return { ok: false, error: "Nemáš oprávnenie." };

  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Vyber PDF súbor." };

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = await parseFuelStatementPdf(buffer);
  } catch (err) {
    console.error("parseFuelStatementPdf failed:", err);
    return { ok: false, error: "PDF sa nepodarilo prečítať." };
  }

  if (!parsed.transactions.length) return { ok: false, error: "V PDF sa nenašli žiadne tankovania." };

  const supabase = await createClient();
  const { data: cards } = await supabase.from("fuel_cards").select("id, card_number");
  const cardIdByNumber = new Map((cards ?? []).map((c) => [c.card_number, c.id]));

  const unmatchedCards = new Set<number>();
  const toInsert: {
    card_id: string;
    tx_date: string | null;
    place: string | null;
    purpose: string | null;
    doc_number: string;
    gross_amount: number | null;
    net_amount: number | null;
  }[] = [];

  for (const t of parsed.transactions) {
    if (t.cardNumber == null) continue;
    const cardId = cardIdByNumber.get(t.cardNumber);
    if (!cardId) {
      unmatchedCards.add(t.cardNumber);
      continue;
    }
    toInsert.push({
      card_id: cardId,
      tx_date: t.date,
      place: t.place || null,
      purpose: t.product || null,
      doc_number: t.docNumber,
      gross_amount: t.grossAmount,
      net_amount: t.netAmount,
    });
  }

  if (!toInsert.length) {
    return {
      ok: false,
      error: unmatchedCards.size
        ? `Karty ${[...unmatchedCards].join(", ")} sa v systéme nenašli.`
        : "Žiadne riadky na import.",
    };
  }

  const { data: inserted, error } = await supabase
    .from("fuel_transactions")
    .upsert(toInsert, { onConflict: "card_id,doc_number,purpose", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error("fuel_transactions upsert failed:", error);
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/fuel-cards");
  return {
    ok: true,
    inserted: inserted?.length ?? 0,
    skipped: toInsert.length - (inserted?.length ?? 0),
    unmatchedCards: [...unmatchedCards],
    statementDate: parsed.statementDate,
  };
}

export async function updateFuelCard(cardId: string, formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase
    .from("fuel_cards")
    .update({
      holder_name: formData.get("holder_name") || null,
      card_type: formData.get("card_type") || null,
      valid_until: formData.get("valid_until") || null,
      active: formData.get("active") === "true",
    })
    .eq("id", cardId);

  revalidatePath(`/admin/fuel-cards/${cardId}`);
  revalidatePath("/admin/fuel-cards");
}
