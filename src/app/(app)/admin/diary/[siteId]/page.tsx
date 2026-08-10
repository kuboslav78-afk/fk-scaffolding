import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { MONTH_NAMES, parseMonthParam, monthRange, calendarGrid } from "@/lib/month";
import { DAY_NAMES_SHORT } from "@/lib/week";

export default async function DiaryCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const { siteId } = await params;
  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);
  const { rangeStart, rangeEnd, prevParam, nextParam } = monthRange(year, monthIndex);

  const supabase = await createClient();

  const [{ data: site }, { data: entries }] = await Promise.all([
    supabase.from("sites").select("id, name").eq("id", siteId).single(),
    supabase
      .from("site_diary_entries")
      .select("entry_date")
      .eq("site_id", siteId)
      .gte("entry_date", rangeStart)
      .lt("entry_date", rangeEnd),
  ]);

  if (!site) notFound();

  const entryCountByDate = new Map<string, number>();
  for (const e of entries ?? []) {
    entryCountByDate.set(e.entry_date, (entryCountByDate.get(e.entry_date) ?? 0) + 1);
  }
  const weeks = calendarGrid(year, monthIndex);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <Link href="/admin/diary" className="btn-ghost btn-sm">
        ← Späť na stavby
      </Link>

      <h1 className="text-2xl font-semibold text-ink-900">{site.name}</h1>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink-900">
          {MONTH_NAMES[monthIndex]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Link href={`/admin/diary/${siteId}?month=${prevParam}`} className="btn-ghost btn-sm px-2">
            ←
          </Link>
          <Link href={`/admin/diary/${siteId}`} className="btn-ghost btn-sm">
            dnes
          </Link>
          <Link href={`/admin/diary/${siteId}?month=${nextParam}`} className="btn-ghost btn-sm px-2">
            →
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-[#1c1a17]">
        <div className="grid grid-cols-7 border-b border-ink-100 bg-[#141210]">
          {DAY_NAMES_SHORT.map((d) => (
            <div
              key={d}
              className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weeks.flat().map((date, i) => {
            if (!date) {
              return <div key={i} className="min-h-[110px] border-b border-r border-ink-100 bg-black/10" />;
            }
            const dayNum = Number(date.slice(-2));
            const count = entryCountByDate.get(date) ?? 0;
            const isToday = date === today;

            return (
              <Link
                key={date}
                href={`/admin/diary/${siteId}/${date}`}
                className="group min-h-[110px] border-b border-r border-ink-100 p-2 text-left transition-colors duration-150 hover:bg-ink-100 sm:p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      "flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-semibold " +
                      (isToday ? "bg-brand-500 text-[#241a06]" : "text-ink-500")
                    }
                  >
                    {dayNum}
                  </span>
                  {count > 0 && (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                      {count}
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  {count > 0 ? (
                    <div className="truncate rounded-md border border-brand-500/25 bg-brand-500/10 px-2 py-1 text-[11px] font-medium text-brand-400">
                      {count} {count === 1 ? "zápis" : "zápisy"}
                    </div>
                  ) : (
                    <div className="text-[11px] text-ink-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      bez zápisu
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
