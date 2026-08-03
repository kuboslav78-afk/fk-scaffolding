"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    site_id: formData.get("site_id"),
    description: formData.get("description"),
  });

  revalidatePath("/dashboard");
}

export async function approveWorkHours(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("work_hours")
    .update({ approved: true, approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/dashboard");
}

export async function addDiaryEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const siteId = String(formData.get("site_id") ?? "");
  const photo = formData.get("photo");

  const { data: entry, error } = await supabase
    .from("site_diary_entries")
    .insert({
      employee_id: user.id,
      entry_date: formData.get("entry_date"),
      site_id: siteId,
      content: formData.get("content"),
    })
    .select("id")
    .single();

  if (error || !entry) {
    revalidatePath("/dashboard");
    return;
  }

  if (photo instanceof File && photo.size > 0) {
    const { data: site } = await supabase
      .from("sites")
      .select("foreman_id")
      .eq("id", siteId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const canUploadPhoto = profile?.role === "admin" || site?.foreman_id === user.id;

    if (canUploadPhoto) {
      const admin = createAdminClient();
      const path = `${entry.id}/${Date.now()}-${photo.name}`;

      const { error: uploadError } = await admin.storage
        .from("diary-photos")
        .upload(path, photo);

      if (!uploadError) {
        await admin.from("diary_photos").insert({
          diary_entry_id: entry.id,
          storage_path: path,
          uploaded_by: user.id,
        });
      }
    }
  }

  revalidatePath("/dashboard");
}
