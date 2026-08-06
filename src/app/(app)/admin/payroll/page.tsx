import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { PayrollRow } from "@/components/payroll-row";
import { AccommodationCostRow } from "@/components/accommodation-cost-row";
import { addAccommodationCost } from "./actions";
import { MONTH_NAMES, parseMonthParam, monthParamString, monthRange } from "@/lib/month";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);
  const { rangeStart, rangeEnd, prevParam, nextParam } = monthRange(year, monthIndex);

  const supabase = await createClient();

  const [{ data: employees }, { data: hours }, { data: accommodations }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, hourly_rate")
      .in("role", ["employee", "foreman"])
      .order("full_name"),
    supabase
      .from("work_hours")
      .select("employee_id, hours_worked")
      .gte("work_date", rangeStart)
      .lt("work_date", rangeEnd),
    supabase
      .from("accommodation_costs")
      .select("id, amount, note")
      .eq("month", rangeStart)
      .order("created_at"),
  ]);

  const hoursByEmployee = new Map<string, number>();
  for (const h of hours ?? []) {
    hoursByEmployee.set(h.employee_id, (hoursByEmployee.get(h.employee_id) ?? 0) + h.hours_worked);
  }

  const wagesTotal = (employees ?? []).reduce(
    (sum, e) => sum + (hoursByEmployee.get(e.id) ?? 0) * (e.hourly_rate ?? 0),
    0
  );
  const accommodationTotal = (accommodations ?? []).reduce((sum, a) => sum + a.amount, 0);
  const monthParam = monthParamString(year, monthIndex);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Výplaty</h1>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">
          {MONTH_NAMES[monthIndex]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Link href={`/admin/payroll?month=${prevParam}`} className="btn-ghost btn-sm px-2">
            ←
          </Link>
          <Link href="/admin/payroll" className="btn-ghost btn-sm">
            dnes
          </Link>
          <Link href={`/admin/payroll?month=${nextParam}`} className="btn-ghost btn-sm px-2">
            →
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Mzdy spolu</p>
          <p className="mt-1 text-xl font-semibold text-ink-900">{wagesTotal.toFixed(2)} €</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Ubytovanie spolu</p>
          <p className="mt-1 text-xl font-semibold text-ink-900">{accommodationTotal.toFixed(2)} €</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Náklady spolu</p>
          <p className="mt-1 text-xl font-semibold text-brand-400">
            {(wagesTotal + accommodationTotal).toFixed(2)} €
          </p>
        </div>
      </section>

      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="pb-2 pr-3">Zamestnanec</th>
              <th className="pb-2 pr-3">Hodiny</th>
              <th className="pb-2 pr-3">Hodinovka</th>
              <th className="pb-2 pr-3">Mzda</th>
              <th className="pb-2">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {employees?.map((e) => (
              <PayrollRow
                key={e.id}
                employee={e}
                hours={hoursByEmployee.get(e.id) ?? 0}
                monthParam={monthParam}
              />
            ))}
          </tbody>
        </table>
        {!employees?.length && (
          <p className="py-4 text-sm text-ink-400">Zatiaľ žiadni zamestnanci.</p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-semibold text-ink-900">
          Náklady na ubytovanie — {MONTH_NAMES[monthIndex]} {year}
        </h2>
        <ul className="divide-y divide-ink-100">
          {accommodations?.map((a) => (
            <AccommodationCostRow key={a.id} cost={a} />
          ))}
        </ul>
        {!accommodations?.length && (
          <p className="py-2 text-sm text-ink-400">Zatiaľ žiadne náklady na ubytovanie.</p>
        )}

        <form action={addAccommodationCost} className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
          <input type="hidden" name="month" value={rangeStart} />
          <input type="number" step="0.01" name="amount" required placeholder="Suma (€)" className="input w-32" />
          <input type="text" name="note" placeholder="Poznámka (napr. faktúra ubytovňa XY)" className="input flex-1 min-w-[220px]" />
          <button type="submit" className="btn-primary btn-sm">
            + Pridať náklad
          </button>
        </form>
      </div>
    </div>
  );
}
