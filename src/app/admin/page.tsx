import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { NavBar } from "@/components/nav-bar";
import { addOrder, addInvoice } from "./actions";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: orders }, { data: invoices }, { data: recentHours }] = await Promise.all([
    supabase.from("orders").select("id, customer_name, site_name, order_date, status").order("order_date", { ascending: false }).limit(10),
    supabase.from("invoices").select("id, invoice_number, customer_name, amount, issued_date, paid").order("issued_date", { ascending: false }).limit(10),
    supabase.from("work_hours").select("id, work_date, hours_worked, approved, sites(name), profiles!employee_id(full_name)").order("work_date", { ascending: false }).limit(10),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar fullName={profile.full_name} role={profile.role} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-lg font-semibold text-neutral-900">Administrácia</h1>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-neutral-900">Odpracované hodiny (posledné)</h2>
          <ul className="divide-y divide-neutral-100 text-sm">
            {recentHours?.map((h) => (
              <li key={h.id} className="flex justify-between py-2">
                <span className="text-neutral-600">
                  {h.work_date} ·{" "}
                  {/* @ts-expect-error supabase join shape */}
                  {h.profiles?.full_name ?? "—"} ·{" "}
                  {/* @ts-expect-error supabase join shape */}
                  {h.sites?.name ?? "—"}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900">{h.hours_worked} h</span>
                  <span className={h.approved ? "text-xs text-green-600" : "text-xs text-amber-600"}>
                    {h.approved ? "schválené" : "čaká"}
                  </span>
                </span>
              </li>
            ))}
            {!recentHours?.length && (
              <li className="py-2 text-neutral-400">Zatiaľ žiadne záznamy.</li>
            )}
          </ul>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Objednávky</h2>
            <form action={addOrder} className="space-y-3">
              <input
                type="text"
                name="customer_name"
                placeholder="Zákazník"
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="site_name"
                  placeholder="Stavba"
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  name="order_date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                name="description"
                placeholder="Popis objednávky"
                rows={2}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Pridať objednávku
              </button>
            </form>

            <ul className="mt-5 divide-y divide-neutral-100 text-sm">
              {orders?.map((o) => (
                <li key={o.id} className="flex justify-between py-2">
                  <span className="text-neutral-600">
                    {o.order_date} · {o.customer_name}
                  </span>
                  <span className="text-neutral-500">{o.status}</span>
                </li>
              ))}
              {!orders?.length && (
                <li className="py-2 text-neutral-400">Zatiaľ žiadne objednávky.</li>
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Faktúry</h2>
            <form action={addInvoice} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="invoice_number"
                  placeholder="Číslo faktúry"
                  required
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  name="customer_name"
                  placeholder="Zákazník"
                  required
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  placeholder="Suma (€)"
                  required
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  name="issued_date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Pridať faktúru
              </button>
            </form>

            <ul className="mt-5 divide-y divide-neutral-100 text-sm">
              {invoices?.map((i) => (
                <li key={i.id} className="flex justify-between py-2">
                  <span className="text-neutral-600">
                    {i.invoice_number} · {i.customer_name}
                  </span>
                  <span className={i.paid ? "text-green-600" : "text-amber-600"}>
                    {i.amount} € {i.paid ? "✓" : ""}
                  </span>
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
