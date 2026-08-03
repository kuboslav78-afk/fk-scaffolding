import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { NavBar } from "@/components/nav-bar";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const startOfMonth = `${today.slice(0, 7)}-01`;

  const [{ data: recentHours }, { data: unpaidInvoices }, { data: monthHours }, { data: allOrders }] =
    await Promise.all([
      supabase
        .from("work_hours")
        .select("id, work_date, hours_worked, approved, sites(name), profiles!employee_id(full_name)")
        .order("work_date", { ascending: false })
        .limit(10),
      supabase
        .from("invoices")
        .select("id, invoice_number, amount, due_date, orders(order_number, customer_name)")
        .eq("paid", false)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("work_hours")
        .select("hours_worked, profiles!employee_id(full_name)")
        .gte("work_date", startOfMonth),
      supabase
        .from("orders")
        .select("id, order_number, customer_name, price, peter_invoice_issued, invoices(id)")
        .order("order_date", { ascending: false })
        .limit(30),
    ]);

  const hoursByEmployee = new Map<string, number>();
  for (const h of monthHours ?? []) {
    // @ts-expect-error supabase join shape
    const name: string = h.profiles?.full_name ?? "—";
    hoursByEmployee.set(name, (hoursByEmployee.get(name) ?? 0) + h.hours_worked);
  }

  const openOrders = (allOrders ?? []).filter((o) => !o.invoices || o.invoices.length === 0);

  const unpaidTotal = (unpaidInvoices ?? []).reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar fullName={profile.full_name} role={profile.role} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-lg font-semibold text-neutral-900">Administrácia</h1>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">
              Nezaplatené faktúry ({unpaidTotal.toFixed(2)} €)
            </h2>
            <ul className="divide-y divide-neutral-100 text-sm">
              {unpaidInvoices?.map((i) => {
                const overdue = !!i.due_date && i.due_date < today;
                return (
                  <li key={i.id} className="flex justify-between py-2">
                    <span className="text-neutral-600">
                      {i.invoice_number} ·{" "}
                      {/* @ts-expect-error supabase join shape */}
                      {i.orders?.order_number ?? "—"} · {i.orders?.customer_name ?? "—"}
                      {i.due_date && (
                        <span className={overdue ? "ml-1 text-red-600" : "ml-1 text-neutral-400"}>
                          (splatnosť {i.due_date}
                          {overdue ? " — po splatnosti" : ""})
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-neutral-900">{i.amount} €</span>
                  </li>
                );
              })}
              {!unpaidInvoices?.length && (
                <li className="py-2 text-neutral-400">Všetko uhradené.</li>
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">
              Hodiny tento mesiac ({today.slice(0, 7)})
            </h2>
            <ul className="divide-y divide-neutral-100 text-sm">
              {[...hoursByEmployee.entries()].map(([name, hours]) => (
                <li key={name} className="flex justify-between py-2">
                  <span className="text-neutral-600">{name}</span>
                  <span className="font-medium text-neutral-900">{hours} h</span>
                </li>
              ))}
              {!hoursByEmployee.size && (
                <li className="py-2 text-neutral-400">Zatiaľ žiadne hodiny tento mesiac.</li>
              )}
            </ul>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-neutral-900">
            Objednávky bez faktúry ({openOrders.length})
          </h2>
          <ul className="divide-y divide-neutral-100 text-sm">
            {openOrders.map((o) => (
              <li key={o.id} className="flex justify-between py-2">
                <span className="text-neutral-600">
                  {o.order_number ?? "—"} · {o.customer_name ?? "bez zákazníka"}
                  {!o.peter_invoice_issued && (
                    <span className="ml-1 text-xs text-amber-600">(Peter ešte nefakturoval)</span>
                  )}
                </span>
                <span className="font-medium text-neutral-900">{o.price ? `${o.price} €` : ""}</span>
              </li>
            ))}
            {!openOrders.length && (
              <li className="py-2 text-neutral-400">Všetky objednávky majú faktúru.</li>
            )}
          </ul>
        </section>

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
      </main>
    </div>
  );
}
