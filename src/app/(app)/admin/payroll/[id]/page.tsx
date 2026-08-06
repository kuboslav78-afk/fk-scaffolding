import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { MONTH_NAMES, parseMonthParam, monthParamString, monthRange } from "@/lib/month";

export default async function PayrollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);
  const { rangeStart, rangeEnd, prevParam, nextParam } = monthRange(year, monthIndex);

  const supabase = await createClient();

  const [{ data: employee }, { data: dayEntries }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, hourly_rate").eq("id", id).single(),
    supabase
      .from("work_hours")
      .select("id, work_date, hours_worked, description, approved, sites(name)")
      .eq("employee_id", id)
      .gte("work_date", rangeStart)
      .lt("work_date", rangeEnd)
      .order("work_date"),
  ]);

  if (!employee) notFound();

  const totalHours = (dayEntries ?? []).reduce((sum, h) => sum + h.hours_worked, 0);
  const hourlyRate = employee.hourly_rate ?? 0;
  const wage = totalHours * hourlyRate;
  const monthParam = monthParamString(year, monthIndex);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <Link href={`/admin/payroll?month=${monthParam}`} className="btn-ghost btn-sm">
        ← Späť na výplaty
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">{employee.full_name}</h1>
        <div className="flex items-center gap-1">
          <Link href={`/admin/payroll/${id}?month=${prevParam}`} className="btn-ghost btn-sm px-2">
            ←
          </Link>
          <Link href={`/admin/payroll/${id}`} className="btn-ghost btn-sm">
            dnes
          </Link>
          <Link href={`/admin/payroll/${id}?month=${nextParam}`} className="btn-ghost btn-sm px-2">
            →
          </Link>
        </div>
      </div>

      <h2 className="font-semibold text-ink-900">
        {MONTH_NAMES[monthIndex]} {year}
      </h2>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Hodiny</p>
          <p className="mt-1 text-xl font-semibold text-ink-900">{totalHours} h</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Hodinovka</p>
          <p className="mt-1 text-xl font-semibold text-ink-900">{hourlyRate.toFixed(2)} €/h</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-ink-400">Mzda</p>
          <p className="mt-1 text-xl font-semibold text-brand-400">{wage.toFixed(2)} €</p>
        </div>
      </section>

      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="pb-2 pr-3">Dátum</th>
              <th className="pb-2 pr-3">Stavba</th>
              <th className="pb-2 pr-3">Hodiny</th>
              <th className="pb-2 pr-3">Popis</th>
              <th className="pb-2">Stav</th>
            </tr>
          </thead>
          <tbody>
            {dayEntries?.map((h) => (
              <tr key={h.id} className="border-b border-ink-100 align-top text-sm">
                <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-ink-900">{h.work_date}</td>
                <td className="py-2.5 pr-3 text-ink-700">
                  {/* @ts-expect-error supabase join shape */}
                  {h.sites?.name ?? "bez stavby"}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-ink-900">{h.hours_worked} h</td>
                <td className="py-2.5 pr-3 text-ink-500">{h.description ?? "—"}</td>
                <td className="whitespace-nowrap py-2.5">
                  <span className={h.approved ? "badge-success" : "badge-warning"}>
                    {h.approved ? "schválené" : "čaká"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!dayEntries?.length && (
          <p className="py-4 text-sm text-ink-400">Žiadne odpracované hodiny za tento mesiac.</p>
        )}
      </div>
    </div>
  );
}
