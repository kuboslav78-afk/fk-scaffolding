import { redirect } from "next/navigation";
import { getProfile } from "@/lib/get-profile";

export default async function Home() {
  const profile = await getProfile();
  redirect(profile ? "/dashboard" : "/login");
}
