import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { NavBar } from "@/components/nav-bar";
import { OrderForm } from "@/components/order-form";
import { InvoiceForm } from "@/components/invoice-form";
import { toggleInvoiceFlag, togglePeterInvoiceIssued } from "./actions";

const WORK_TYPE_LABELS: Record<string, string> = {
  montaz: "Montáž",
  demontaz: "Demontáž",
  hodiny: "Hodinovka",
};

export default async function OrdersPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: sites }, { data: orders }, { data: invoices }] = await Promise.all([
    supabase.from("sites").select("id, name, project_number").order("name"),
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, work_type, order_date, start_date, handover_date, price, contribution_amount, hours, hourly_rate, peter_invoice_issued, note, sites(name)"
      )
      .order("order_date", { ascending: false })
      .limit(30),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, amount, issued_date, due_date, sent, paid, orders(order_number, customer_name)"
      )
      .order("issued_date", { ascending: false })
      .limit(30),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar fullName={profile.full_name} role={profile.role} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-lg font-semibold text-neutral-900">Objednávky</h1>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Nová objednávka</h2>
            <OrderForm sites={sites ?? []} />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Existujúce objednávky</h2>
            <ul className="divide-y divide-neutral-100 text-sm">
              {orders?.map((o) => (
                <li key={o.id} className="space-y-1 py-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-neutral-900">
                      {o.order_number ?? "—"} · {o.customer_name ?? "bez zákazníka"}
                    </span>
                    <span className="text-neutral-500">{o.price ? `${o.price} €` : ""}</span>
                  </div>
                  <p className="text-neutral-500">
                    {/* @ts-expect-error supabase join shape */}
                    {o.sites?.name ?? "bez stavby"}
                    {o.work_type ? ` · ${WORK_TYPE_LABELS[o.work_type]}` : ""}
                    {o.work_type === "hodiny" && o.hours != null
                      ? ` · ${o.hours} h × ${o.hourly_rate} €`
                      : ""}
                    {o.start_date ? ` · ${o.start_date} → ${o.handover_date ?? "?"}` : ""}
                  </p>
                  {o.price != null && o.work_type !== "hodiny" && (
                    <p className="text-xs text-neutral-400">
                      moja faktúra (80 %): {(o.price * 0.8).toFixed(2)} € · SUKA:{" "}
                      {o.contribution_amount ?? (o.price * 0.1).toFixed(2)} €
                    </p>
                  )}
                  {o.note && <p className="text-xs text-neutral-400">{o.note}</p>}
                  <form action={togglePeterInvoiceIssued.bind(null, o.id, !o.peter_invoice_issued)}>
                    <button
                      type="submit"
                      className={
                        o.peter_invoice_issued
                          ? "rounded-md bg-green-100 px-2 py-1 text-xs text-green-700"
                          : "rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600"
                      }
                    >
                      {o.peter_invoice_issued ? "Peter fakturoval ✓" : "označiť: Peter fakturoval"}
                    </button>
                  </form>
                </li>
              ))}
              {!orders?.length && (
                <li className="py-2 text-neutral-400">Zatiaľ žiadne objednávky.</li>
              )}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Nová faktúra</h2>
            <InvoiceForm orders={orders ?? []} />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Existujúce faktúry</h2>
            <ul className="divide-y divide-neutral-100 text-sm">
              {invoices?.map((i) => (
                <li key={i.id} className="space-y-2 py-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-700">
                      {i.invoice_number} ·{" "}
                      {/* @ts-expect-error supabase join shape */}
                      {i.orders?.order_number ?? "—"} · {i.orders?.customer_name ?? "—"}
                    </span>
                    <span className="font-medium text-neutral-900">{i.amount} €</span>
                  </div>
                  <div className="flex gap-2">
                    <form action={toggleInvoiceFlag.bind(null, i.id, "sent", !i.sent)}>
                      <button
                        type="submit"
                        className={
                          i.sent
                            ? "rounded-md bg-green-100 px-2 py-1 text-xs text-green-700"
                            : "rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600"
                        }
                      >
                        {i.sent ? "odoslaná ✓" : "označiť ako odoslanú"}
                      </button>
                    </form>
                    <form action={toggleInvoiceFlag.bind(null, i.id, "paid", !i.paid)}>
                      <button
                        type="submit"
                        className={
                          i.paid
                            ? "rounded-md bg-green-100 px-2 py-1 text-xs text-green-700"
                            : "rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600"
                        }
                      >
                        {i.paid ? "uhradená ✓" : "označiť ako uhradenú"}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
              {!invoices?.length && (
                <li className="py-2 text-neutral-400">Zatiaľ žiadne faktúry.</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
