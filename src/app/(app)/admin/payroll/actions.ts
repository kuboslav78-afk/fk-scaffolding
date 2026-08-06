"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";

export async function updateHourlyRate(employeeId: string, rate: number) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ hourly_rate: Number.isFinite(rate) ? rate : null })
    .eq("id", employeeId);

  revalidatePath("/admin/payroll");
}

export async function addAccommodationCost(formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const month = String(formData.get("month") ?? "");
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!month) return;

  const supabase = await createClient();
  await supabase.from("accommodation_costs").insert({ month, amount, note });

  revalidatePath("/admin/payroll");
}

export async function updateAccommodationCost(id: string, formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;
  const note = String(formData.get("note") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase.from("accommodation_costs").update({ amount, note }).eq("id", id);

  revalidatePath("/admin/payroll");
}

export async function deleteAccommodationCost(id: string) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("accommodation_costs").delete().eq("id", id);

  revalidatePath("/admin/payroll");
}
