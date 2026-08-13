"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";

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
