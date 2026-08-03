"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addWorkHours(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("work_hours").insert({
    employee_id: user.id,
    work_date: formData.get("work_date"),
    hours_worked: formData.get("hours_worked"),
    site_name: formData.get("site_name"),
    description: formData.get("description"),
  });

  revalidatePath("/dashboard");
}

export async function addDiaryEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("site_diary_entries").insert({
    employee_id: user.id,
    entry_date: formData.get("entry_date"),
    site_name: formData.get("site_name"),
    content: formData.get("content"),
  });

  revalidatePath("/dashboard");
}
