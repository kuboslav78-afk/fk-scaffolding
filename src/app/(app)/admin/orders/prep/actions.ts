"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";
import { computeInvoiceAmount } from "@/lib/order-amount";
import { addMonthsISO } from "@/lib/dates";
import { formatThousands } from "@/lib/format";

export async function addContact(formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return;

  const supabase = await createClient();
  await supabase.from("email_contacts").insert({ name, email });

  revalidatePath("/admin/orders/prep");
  revalidatePath("/admin/orders/invoices");
}

export async function deleteContact(id: string) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("email_contacts").delete().eq("id", id);

  revalidatePath("/admin/orders/prep");
  revalidatePath("/admin/orders/invoices");
}

export async function markOrdersPrepSent(orderIds: string[]) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;
  if (!orderIds.length) return;

  const supabase = await createClient();
  await supabase.from("orders").update({ prep_sent: true }).in("id", orderIds);

  revalidatePath("/admin/orders/prep");
}

function formatDateShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function padCol(value: string, width: number) {
  return value.length >= width ? value + " " : value.padEnd(width, " ");
}

/**
 * Pošle podklady pre FA cez Resend (rovnaký obsah ako mailto verzia), namiesto otvorenia
 * vlastného mail klienta. Sumu si dopočítame znova zo servera (nedôveruje sa klientskej sume),
 * ale dátum vystavenia berieme z klienta — rovnako ako mailto verzia, keďže sa nikde nepersistuje
 * (persistuje sa len cez samostatné tlačidlo "označiť" priamo v Objednávkach).
 */
export async function sendPrepEmailViaResend(
  orderIds: string[],
  labels: Record<string, string>,
  issuedDates: Record<string, string>,
  contactIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const requester = await getProfile();
  if (requester?.role !== "admin") return { ok: false, error: "Nemáš oprávnenie." };
  if (!orderIds.length) return { ok: false, error: "Nič nie je vybrané." };

  const supabase = await createClient();
  const [{ data: orders }, { data: contacts }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, work_type, price, hours, hourly_rate, full_invoice")
      .in("id", orderIds),
    supabase.from("email_contacts").select("id, name, email").in("id", contactIds),
  ]);

  if (!orders?.length) return { ok: false, error: "Objednávky sa nenašli." };
  if (!contacts?.length) return { ok: false, error: "Vyber aspoň jedného príjemcu." };

  const resend = getResendClient();
  if (!resend) return { ok: false, error: "RESEND_API_KEY nie je nastavený." };

  const sentOrderIds: string[] = [];
  const rows = orders
    .filter((o) => issuedDates[o.id])
    .map((o) => {
      sentOrderIds.push(o.id);
      const issuedDate = issuedDates[o.id];
      const dueDate = addMonthsISO(issuedDate, 1);
      const amount = computeInvoiceAmount(o) ?? 0;
      return {
        ref: labels[o.id] || "-",
        issued: formatDateShort(issuedDate),
        due: formatDateShort(dueDate),
        dueDateIso: dueDate,
        price: `${formatThousands(amount)} €`,
      };
    });

  if (!rows.length) return { ok: false, error: "Vybraným objednávkam chýba dátum vystavenia." };

  const columns: { key: "ref" | "issued" | "due" | "price"; label: string }[] = [
    { key: "ref", label: "Popis" },
    { key: "issued", label: "Vystavenie" },
    { key: "due", label: "Splatnosť" },
    { key: "price", label: "Cena" },
  ];
  const widths = columns.map((c) => Math.max(c.label.length, ...rows.map((r) => r[c.key].length)) + 3);
  const headerLine = columns.map((c, i) => padCol(c.label, widths[i])).join("");
  const separatorLine = columns.map((_, i) => "-".repeat(widths[i] - 1)).join(" ");
  const lines = [headerLine, separatorLine, ...rows.map((r) => columns.map((c, i) => padCol(r[c.key], widths[i])).join(""))];

  const dueDateCounts = new Map<string, number>();
  rows.forEach((r) => dueDateCounts.set(r.dueDateIso, (dueDateCounts.get(r.dueDateIso) ?? 0) + 1));
  const groupNotes = [...dueDateCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([date]) => `Všetky splatnosti ${formatDateShort(date)} môžu ísť na jednu FA.`);

  const greetingName = contacts.length === 1 ? contacts[0].name : null;

  const body = [
    greetingName ? `Ahoj ${greetingName},` : "Dobrý deň,",
    "",
    "posielam podklady na FA.",
    "",
    ...lines,
    "",
    ...groupNotes,
    groupNotes.length ? "" : null,
    "S pozdravom,",
    requester.full_name,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const { error: sendError } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: contacts.map((c) => c.email),
    subject: "Fakturky podklady",
    text: body,
  });

  if (sendError) return { ok: false, error: sendError.message };

  await supabase.from("orders").update({ prep_sent: true }).in("id", sentOrderIds);

  revalidatePath("/admin/orders/prep");
  return { ok: true };
}
