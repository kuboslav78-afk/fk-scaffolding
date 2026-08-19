"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";

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
