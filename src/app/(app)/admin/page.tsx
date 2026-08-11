import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { todayISO } from "@/lib/dates";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const today = todayISO();
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
  const monthHoursTotal = [...hoursByEmployee.values()].reduce((sum, h) => sum + h, 0);

  const openOrders = (allOrders ?? []).filter((o) => !o.invoices || o.invoices.length === 0);

  const unpaidTotal = (unpaidInvoices ?? []).reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Administrácia</h1>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card flex items-start justify-between p-4 transition-shadow duration-150 hover:shadow-[0_4px_16px_rgba(23,21,15,0.08)]">
          <div>
            <p className="text-xs font-medium text-ink-400">Nezaplatené faktúry</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">{unpaidTotal.toFixed(2)} €</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
              <path d="M6 7h8M6 10h5M4 4h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <div className="card flex items-start justify-between p-4 transition-shadow duration-150 hover:shadow-[0_4px_16px_rgba(23,21,15,0.08)]">
          <div>
            <p className="text-xs font-medium text-ink-400">Hodiny tento mesiac</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">{monthHoursTotal} h</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <div className="card flex items-start justify-between p-4 transition-shadow duration-150 hover:shadow-[0_4px_16px_rgba(23,21,15,0.08)]">
          <div>
            <p className="text-xs font-medium text-ink-400">Objednávky bez faktúry</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">{openOrders.length}</p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
              <rect x="4.5" y="3.5" width="11" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M7 8h6M7 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink-900">Nezaplatené faktúry</h2>
          <ul className="divide-y divide-ink-100 text-sm">
            {unpaidInvoices?.map((i) => {
              const overdue = !!i.due_date && i.due_date < today;
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-ink-600">
                    {i.invoice_number} ·{" "}
                    {/* @ts-expect-error supabase join shape */}
                    {i.orders?.order_number ?? "—"} · {i.orders?.customer_name ?? "—"}
                    {i.due_date && (
                      <span className={overdue ? "ml-1 text-red-400" : "ml-1 text-ink-400"}>
                        (splatnosť {i.due_date}
                        {overdue ? " — po splatnosti" : ""})
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium text-ink-900">{i.amount} €</span>
                </li>
              );
            })}
            {!unpaidInvoices?.length && <li className="py-2 text-ink-400">Všetko uhradené.</li>}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink-900">Hodiny tento mesiac ({today.slice(0, 7)})</h2>
          <ul className="divide-y divide-ink-100 text-sm">
            {[...hoursByEmployee.entries()].map(([name, hours]) => (
              <li key={name} className="flex justify-between py-2.5">
                <span className="text-ink-600">{name}</span>
                <span className="font-medium text-ink-900">{hours} h</span>
              </li>
            ))}
            {!hoursByEmployee.size && (
              <li className="py-2 text-ink-400">Zatiaľ žiadne hodiny tento mesiac.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold text-ink-900">Objednávky bez faktúry ({openOrders.length})</h2>
        <ul className="divide-y divide-ink-100 text-sm">
          {openOrders.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-ink-600">
                {o.order_number ?? "—"} · {o.customer_name ?? "bez zákazníka"}
                {!o.peter_invoice_issued && (
                  <span className="badge-warning ml-2">Peter ešte nefakturoval</span>
                )}
              </span>
              <span className="shrink-0 font-medium text-ink-900">{o.price ? `${o.price} €` : ""}</span>
            </li>
          ))}
          {!openOrders.length && <li className="py-2 text-ink-400">Všetky objednávky majú faktúru.</li>}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold text-ink-900">Odpracované hodiny (posledné)</h2>
        <ul className="divide-y divide-ink-100 text-sm">
          {recentHours?.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-ink-600">
                {h.work_date} ·{" "}
                {/* @ts-expect-error supabase join shape */}
                {h.profiles?.full_name ?? "—"} ·{" "}
                {/* @ts-expect-error supabase join shape */}
                {h.sites?.name ?? "—"}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-medium text-ink-900">{h.hours_worked} h</span>
                <span className={h.approved ? "badge-success" : "badge-warning"}>
                  {h.approved ? "schválené" : "čaká"}
                </span>
              </span>
            </li>
          ))}
          {!recentHours?.length && <li className="py-2 text-ink-400">Zatiaľ žiadne záznamy.</li>}
        </ul>
      </section>
    </div>
  );
}
