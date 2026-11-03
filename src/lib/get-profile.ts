import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getProfile = cache(async function getProfile() {
  const supabase = await createClient();

  // Lokálne overenie JWT (proxy už session obnovil) — ušetrí sieťový round-trip na Supabase Auth.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .single();

  return profile;
});
