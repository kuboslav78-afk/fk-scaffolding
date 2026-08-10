"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";

export async function upsertAssignment(employeeId: string, workDate: string, siteId: string) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();

  if (!siteId) {
    await supabase
      .from("site_assignments")
      .delete()
      .eq("employee_id", employeeId)
      .eq("work_date", workDate);
  } else {
    await supabase
      .from("site_assignments")
      .upsert(
        { employee_id: employeeId, work_date: workDate, site_id: siteId, created_by: requester.id },
        { onConflict: "employee_id,work_date" }
      );
  }

  revalidatePath("/dashboard");
}

export async function setAvailability(workDate: string, status: "work" | "off") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("availability")
    .upsert(
      { employee_id: user.id, work_date: workDate, status },
      { onConflict: "employee_id,work_date" }
    );

  revalidatePath("/dashboard");
}

export async function clearAvailability(workDate: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("availability").delete().eq("employee_id", user.id).eq("work_date", workDate);

  revalidatePath("/dashboard");
}
