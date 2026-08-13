import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { OrdersSubnav } from "@/components/orders-subnav";
import { InvoicePrepForm } from "@/components/invoice-prep-form";
import { DeleteContactButton } from "@/components/delete-contact-button";
import { addContact } from "./actions";

export default async function InvoicePrepPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: orders }, { data: invoices }, { data: contacts }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, customer_name, price, order_date, peter_invoice_issued, peter_invoice_date, prep_sent, sites(name)")
      .order("order_date", { ascending: false }),
    supabase.from("invoices").select("order_id"),
    supabase.from("email_contacts").select("id, name, email").order("name"),
  ]);

  const invoicedOrderIds = new Set((invoices ?? []).map((i) => i.order_id));
  const uninvoicedOrders = (orders ?? [])
    .filter((o) => !invoicedOrderIds.has(o.id))
    .map((o) => ({
      id: o.id,
      order_number: o.order_number,
      customer_name: o.customer_name,
      price: o.price,
      issuedDate: o.peter_invoice_issued ? o.peter_invoice_date : null,
      prepSent: o.prep_sent,
      // @ts-expect-error supabase join shape
      siteName: o.sites?.name ?? "bez stavby",
    }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Objednávky</h1>

      <OrdersSubnav active="prep" />

      <div>
        <h2 className="mb-1 font-semibold text-ink-900">Podklady pre faktúry</h2>
        <p className="text-sm text-ink-500">
          Vyber objednávky bez faktúry, nastav im dátum vystavenia (splatnosť sa dopočíta) a priprav email pre účtovníčku.
        </p>
      </div>

      <InvoicePrepForm orders={uninvoicedOrders} contacts={contacts ?? []} adminName={profile.full_name} />

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold text-ink-900">Kontakty</h2>
        <ul className="divide-y divide-ink-100 text-sm">
          {contacts?.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-ink-700">
                {c.name} <span className="text-ink-400">({c.email})</span>
              </span>
              <DeleteContactButton contactId={c.id} />
            </li>
          ))}
          {!contacts?.length && <li className="py-2 text-ink-400">Zatiaľ žiadne kontakty.</li>}
        </ul>
        <form action={addContact} className="flex flex-wrap gap-2 border-t border-ink-100 pt-3">
          <input type="text" name="name" placeholder="Meno (napr. Andrea, Peter)" required className="input flex-1 min-w-[160px]" />
          <input type="email" name="email" placeholder="Email" required className="input flex-1 min-w-[200px]" />
          <button type="submit" className="btn-primary btn-sm shrink-0">
            + Pridať kontakt
          </button>
        </form>
      </div>
    </div>
  );
}
