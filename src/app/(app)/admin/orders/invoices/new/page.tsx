import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { InvoiceForm } from "@/components/invoice-form";

export default async function NewInvoicePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, price, work_type")
    .order("order_date", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders/invoices" className="btn-ghost btn-sm">
          ← Späť na faktúry
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-ink-900">Nová faktúra</h1>
      <div className="card p-5">
        <InvoiceForm orders={orders ?? []} />
      </div>
    </div>
  );
}
