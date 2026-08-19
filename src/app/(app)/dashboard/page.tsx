import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { WeekAssignmentCell } from "@/components/week-assignment-cell";
import { AvailabilityDayCard } from "@/components/availability-day-card";
import { TaskRow } from "@/components/task-row";
import { addTask } from "./actions";
import { DAY_NAMES, parseWeekParam, weekParamString, weekDates, adjacentWeekParams } from "@/lib/week";
import { todayISO } from "@/lib/dates";
import { formatThousands } from "@/lib/format";

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
    const now = new Date();
    const today = todayISO();
    const startOfMonth = `${today.slice(0, 7)}-01`;
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfNextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

    const [
      { data: employees },
      { data: sites },
      { data: assignments },
      { data: availabilities },
      { data: tasks },
      { data: monthOrders },
      { data: unpaidInvoices },
    ] = await Promise.all([
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
      supabase
        .from("admin_tasks")
        .select("id, title, done")
        .order("done", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("orders").select("price").gte("order_date", startOfMonth).lt("order_date", startOfNextMonth),
      supabase.from("invoices").select("id, amount, due_date").eq("paid", false),
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

    const monthlyTurnover = (monthOrders ?? []).reduce((sum, o) => sum + (o.price ?? 0), 0);
    const pendingInvoices = unpaidInvoices ?? [];
    const pendingSum = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);
    const overdueInvoices = pendingInvoices.filter((i) => i.due_date && i.due_date < today);
    const overdueSum = overdueInvoices.reduce((sum, i) => sum + i.amount, 0);

    const pendingTasks = (tasks ?? []).filter((t) => !t.done);
    const doneTasks = (tasks ?? []).filter((t) => t.done);

    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-semibold text-ink-900">Nástenka</h1>

        <section className="card border-amber-900/40 bg-amber-500/10 p-5 shadow-[0_0_40px_-12px_rgba(240,162,58,0.35)]">
          <h2 className="mb-4 font-semibold text-ink-900">Úlohy ({pendingTasks.length})</h2>
          <form action={addTask} className="mb-4 flex gap-2">
            <input type="text" name="title" placeholder="Nová úloha…" required className="input" />
            <button type="submit" className="btn-primary btn-sm shrink-0">
              Pridať
            </button>
          </form>
          <ul className="divide-y divide-amber-900/30">
            {pendingTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
            {!pendingTasks.length && <li className="py-2 text-sm text-ink-400">Žiadne úlohy — všetko vybavené.</li>}
          </ul>
          {!!doneTasks.length && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-ink-500">Hotové ({doneTasks.length})</summary>
              <ul className="mt-2 divide-y divide-amber-900/30">
                {doneTasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-medium text-ink-400">Mesačný obrat ({today.slice(0, 7)})</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">{formatThousands(monthlyTurnover)} €</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-ink-400">Čaká na úhradu</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">
              {pendingInvoices.length} · {formatThousands(pendingSum)} €
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-ink-400">Po splatnosti</p>
            <p className="mt-1 text-2xl font-semibold text-red-400">
              {overdueInvoices.length} · {formatThousands(overdueSum)} €
            </p>
          </div>
        </section>

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
