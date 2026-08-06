import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { OrderForm } from "@/components/order-form";

export default async function NewOrderPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: sites } = await supabase.from("sites").select("id, name, project_number").order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="btn-ghost btn-sm">
          ← Späť na objednávky
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-ink-900">Nová objednávka</h1>
      <div className="card p-5">
        <OrderForm sites={sites ?? []} />
      </div>
    </div>
  );
}
