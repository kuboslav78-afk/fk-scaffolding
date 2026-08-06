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

export async function upsertAccommodationCost(employeeId: string, month: string, amount: number) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase
    .from("accommodation_costs")
    .upsert(
      { employee_id: employeeId, month, amount: Number.isFinite(amount) ? amount : 0 },
      { onConflict: "employee_id,month" }
    );

  revalidatePath("/admin/payroll");
  revalidatePath(`/admin/payroll/${employeeId}`);
}
