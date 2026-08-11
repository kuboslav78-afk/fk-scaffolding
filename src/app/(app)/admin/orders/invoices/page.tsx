import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { OrdersSubnav } from "@/components/orders-subnav";
import { EditableInvoiceRow } from "@/components/editable-invoice-row";

export default async function InvoicesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: invoices }, { data: contacts }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, amount, issued_date, due_date, sent, paid, orders(order_number, customer_name)"
      )
      .order("issued_date", { ascending: false })
      .limit(200),
    supabase.from("email_contacts").select("name, email"),
  ]);

  const peterContact = contacts?.find((c) => c.name.toLowerCase().includes("peter"));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Faktúry</h1>
        <Link href="/admin/orders/invoices/new" className="btn-primary">
          + Nová faktúra
        </Link>
      </div>

      <OrdersSubnav active="invoices" />

      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="pb-2 pr-3">Číslo</th>
              <th className="pb-2 pr-3">Objednávka</th>
              <th className="pb-2 pr-3">Suma</th>
              <th className="pb-2 pr-3">Vystavená</th>
              <th className="pb-2 pr-3">Splatnosť</th>
              <th className="pb-2 pr-3">Odoslaná</th>
              <th className="pb-2">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {invoices?.map((i) => (
              <EditableInvoiceRow
                key={i.id}
                invoice={{
                  id: i.id,
                  invoice_number: i.invoice_number,
                  amount: i.amount,
                  issued_date: i.issued_date,
                  due_date: i.due_date,
                  sent: i.sent,
                  paid: i.paid,
                  // @ts-expect-error supabase join shape
                  orderLabel: `${i.orders?.order_number ?? "—"} · ${i.orders?.customer_name ?? "—"}`,
                }}
                peterEmail={peterContact?.email ?? null}
              />
            ))}
          </tbody>
        </table>
        {!invoices?.length && <p className="py-4 text-sm text-ink-400">Zatiaľ žiadne faktúry.</p>}
      </div>
    </div>
  );
}
