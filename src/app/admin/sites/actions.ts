"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";

export async function createSite(formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  const foremanId = formData.get("foreman_id");

  await supabase.from("sites").insert({
    name: formData.get("name"),
    address: formData.get("address"),
    foreman_id: foremanId ? foremanId : null,
  });

  revalidatePath("/admin/sites");
}

export async function updateSiteForeman(siteId: string, foremanId: string | null) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase.from("sites").update({ foreman_id: foremanId }).eq("id", siteId);

  revalidatePath("/admin/sites");
}
