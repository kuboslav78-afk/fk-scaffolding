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

export async function updateSite(siteId: string, formData: FormData) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return;

  const supabase = await createClient();
  await supabase
    .from("sites")
    .update({
      name: formData.get("name"),
      address: formData.get("address") || null,
    })
    .eq("id", siteId);

  revalidatePath("/admin/sites");
}

export async function deleteSite(siteId: string) {
  const requester = await getProfile();
  if (requester?.role !== "admin") return { error: "Nemáš oprávnenie." };

  const supabase = await createClient();

  const [{ count: hoursCount }, { count: diaryCount }, { count: ordersCount }] = await Promise.all([
    supabase.from("work_hours").select("id", { count: "exact", head: true }).eq("site_id", siteId),
    supabase
      .from("site_diary_entries")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("site_id", siteId),
  ]);

  if ((hoursCount ?? 0) + (diaryCount ?? 0) + (ordersCount ?? 0) > 0) {
    return {
      error:
        "Stavbu nemožno zmazať — má naviazané hodiny, zápisy do denníka alebo objednávky. Zmaž ich najprv, alebo stavbu ponechaj.",
    };
  }

  const { error } = await supabase.from("sites").delete().eq("id", siteId);
  if (error) {
    return { error: "Zmazanie zlyhalo, skús to prosím znova." };
  }

  revalidatePath("/admin/sites");
  return {};
}
