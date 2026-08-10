import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { WeekAssignmentCell } from "@/components/week-assignment-cell";
import { AvailabilityDayCard } from "@/components/availability-day-card";
import { DAY_NAMES, parseWeekParam, weekParamString, weekDates, adjacentWeekParams } from "@/lib/week";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const { week } = await searchParams;
  const monday = parseWeekParam(week);
  const days = weekDates(monday);
  const rangeStart = days[0];
  const rangeEnd = days[6];
  const { prevParam, nextParam } = adjacentWeekParams(monday);
  const weekParam = weekParamString(monday);

  const supabase = await createClient();

  if (profile.role === "admin") {
    const [{ data: employees }, { data: sites }, { data: assignments }, { data: availabilities }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("role", ["employee", "foreman"])
          .order("full_name"),
        supabase.from("sites").select("id, name").order("name"),
        supabase
          .from("site_assignments")
          .select("employee_id, work_date, site_id")
          .gte("work_date", rangeStart)
          .lte("work_date", rangeEnd),
        supabase
          .from("availability")
          .select("employee_id, work_date, status")
          .gte("work_date", rangeStart)
          .lte("work_date", rangeEnd),
      ]);

    const assignmentMap = new Map<string, string>();
    for (const a of assignments ?? []) assignmentMap.set(`${a.employee_id}_${a.work_date}`, a.site_id);

    const availabilityMap = new Map<string, "work" | "off">();
    for (const a of availabilities ?? []) {
      availabilityMap.set(`${a.employee_id}_${a.work_date}`, a.status as "work" | "off");
    }

    const assignedSlotsThisWeek = assignments?.length ?? 0;
    const totalSlots = (employees?.length ?? 0) * 7;
    const offRequests = (availabilities ?? []).filter((a) => a.status === "off").length;

    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-semibold text-ink-900">Nástenka</h1>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-medium text-ink-400">Zamestnancov</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">{employees?.length ?? 0}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-ink-400">Priradené smeny tento týždeň</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">
              {assignedSlotsThisWeek} / {totalSlots}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-ink-400">Žiadosti o voľno</p>
            <p className="mt-1 text-2xl font-semibold text-brand-400">{offRequests}</p>
          </div>
        </section>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">Týždenný rozpis</h2>
          <div className="flex items-center gap-1">
            <Link href={`/dashboard?week=${prevParam}`} className="btn-ghost btn-sm px-2">
              ←
            </Link>
            <Link href="/dashboard" className="btn-ghost btn-sm">
              tento týždeň
            </Link>
            <Link href={`/dashboard?week=${nextParam}`} className="btn-ghost btn-sm px-2">
              →
            </Link>
          </div>
        </div>

        <div className="card overflow-x-auto p-5">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                <th className="pb-2 pr-3">Zamestnanec</th>
                {days.map((d, i) => (
                  <th key={d} className="pb-2 pr-3">
                    {DAY_NAMES[i]}
                    <br />
                    <span className="normal-case text-ink-400">{d}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees?.map((e) => (
                <tr key={e.id} className="border-b border-ink-100 align-top text-sm">
                  <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-ink-900">{e.full_name}</td>
                  {days.map((d) => (
                    <td key={d} className="py-2.5 pr-3">
                      <WeekAssignmentCell
                        employeeId={e.id}
                        date={d}
                        siteId={assignmentMap.get(`${e.id}_${d}`) ?? null}
                        sites={sites ?? []}
                        availabilityStatus={availabilityMap.get(`${e.id}_${d}`)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!employees?.length && <p className="py-4 text-sm text-ink-400">Zatiaľ žiadni zamestnanci.</p>}
        </div>
      </div>
    );
  }

  const [{ data: myAssignments }, { data: myAvailability }] = await Promise.all([
    supabase
      .from("site_assignments")
      .select("work_date, sites(name)")
      .eq("employee_id", profile.id)
      .gte("work_date", rangeStart)
      .lte("work_date", rangeEnd),
    supabase
      .from("availability")
      .select("work_date, status")
      .eq("employee_id", profile.id)
      .gte("work_date", rangeStart)
      .lte("work_date", rangeEnd),
  ]);

  const siteByDate = new Map<string, string>();
  for (const a of myAssignments ?? []) {
    // @ts-expect-error supabase join shape
    siteByDate.set(a.work_date, a.sites?.name ?? null);
  }

  const statusByDate = new Map<string, "work" | "off">();
  for (const a of myAvailability ?? []) {
    statusByDate.set(a.work_date, a.status as "work" | "off");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Vitaj, {profile.full_name}</h1>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">Môj týždenný plán</h2>
        <div className="flex items-center gap-1">
          <Link href={`/dashboard?week=${prevParam}`} className="btn-ghost btn-sm px-2">
            ←
          </Link>
          <Link href="/dashboard" className="btn-ghost btn-sm">
            tento týždeň
          </Link>
          <Link href={`/dashboard?week=${nextParam}`} className="btn-ghost btn-sm px-2">
            →
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((d, i) => (
          <AvailabilityDayCard
            key={d}
            date={d}
            dayName={DAY_NAMES[i]}
            siteName={siteByDate.get(d) ?? null}
            status={statusByDate.get(d) ?? null}
          />
        ))}
      </section>
    </div>
  );
}
