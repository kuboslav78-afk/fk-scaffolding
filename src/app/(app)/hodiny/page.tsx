import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";
import { addWorkHours, addDiaryEntry, approveWorkHours } from "./actions";
import { EditableHourRow } from "@/components/editable-hour-row";
import { EditableDiaryRow } from "@/components/editable-diary-row";
import { todayISO } from "@/lib/dates";

export default async function HodinyPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const { data: sites } = await supabase.from("sites").select("id, name").order("name");

  const { data: foremanSites } = await supabase
    .from("sites")
    .select("id, name")
    .eq("foreman_id", profile.id);

  const isForemanSomewhere = !!foremanSites?.length;

  const { data: hours } = await supabase
    .from("work_hours")
    .select("id, work_date, hours_worked, description, approved, site_id, sites(name)")
    .eq("employee_id", profile.id)
    .order("work_date", { ascending: false })
    .limit(10);

  const { data: diaryEntries } = await supabase
    .from("site_diary_entries")
    .select("id, entry_date, content, site_id, sites(name)")
    .eq("employee_id", profile.id)
    .order("entry_date", { ascending: false })
    .limit(10);

  let pendingApprovals: {
    id: string;
    work_date: string;
    hours_worked: number;
    site_name: string;
    employee_name: string;
  }[] = [];

  if (isForemanSomewhere) {
    const siteIds = foremanSites!.map((s) => s.id);
    const { data: pending } = await supabase
      .from("work_hours")
      .select("id, work_date, hours_worked, site_id, sites(name), profiles!employee_id(full_name)")
      .in("site_id", siteIds)
      .eq("approved", false)
      .order("work_date", { ascending: false });

    pendingApprovals = (pending ?? []).map((h) => ({
      id: h.id,
      work_date: h.work_date,
      hours_worked: h.hours_worked,
      // @ts-expect-error supabase join shape
      site_name: h.sites?.name ?? "—",
      // @ts-expect-error supabase join shape
      employee_name: h.profiles?.full_name ?? "—",
    }));
  }

  let photosByEntry = new Map<string, string[]>();
  if (diaryEntries?.length) {
    const admin = createAdminClient();
    const { data: photos } = await admin
      .from("diary_photos")
      .select("diary_entry_id, storage_path")
      .in(
        "diary_entry_id",
        diaryEntries.map((d) => d.id)
      );

    if (photos?.length) {
      const { data: signedUrls } = await admin.storage
        .from("diary-photos")
        .createSignedUrls(
          photos.map((p) => p.storage_path),
          3600
        );

      photosByEntry = photos.reduce((map, p, i) => {
        const url = signedUrls?.[i]?.signedUrl;
        if (url) {
          const existing = map.get(p.diary_entry_id) ?? [];
          existing.push(url);
          map.set(p.diary_entry_id, existing);
        }
        return map;
      }, new Map<string, string[]>());
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Hodiny a denník</h1>

      {isForemanSomewhere && (
        <section className="card border-amber-900/40 bg-amber-500/10 p-5">
          <h2 className="mb-4 font-semibold text-ink-900">
            Na schválenie ({foremanSites!.map((s) => s.name).join(", ")})
          </h2>
          <ul className="divide-y divide-amber-900/40 text-sm">
            {pendingApprovals.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-ink-700">
                  {h.work_date} · {h.employee_name} · {h.site_name} ·{" "}
                  <span className="font-medium">{h.hours_worked} h</span>
                </span>
                <form action={approveWorkHours.bind(null, h.id)}>
                  <button type="submit" className="btn-primary btn-sm">
                    Schváliť
                  </button>
                </form>
              </li>
            ))}
            {!pendingApprovals.length && <li className="py-2 text-ink-400">Nič na schválenie.</li>}
          </ul>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink-900">Evidencia hodín</h2>
          <form action={addWorkHours} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                name="work_date"
                required
                defaultValue={todayISO()}
                className="input"
              />
              <input
                type="number"
                step="0.25"
                min="0.25"
                name="hours_worked"
                placeholder="Počet hodín"
                required
                className="input"
              />
            </div>
            <select name="site_id" required defaultValue="" className="input">
              <option value="" disabled>
                Vyber stavbu
              </option>
              {sites?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <textarea name="description" placeholder="Popis práce" rows={2} className="input" />
            <button type="submit" className="btn-primary">
              Uložiť hodiny
            </button>
          </form>

          <ul className="mt-5 divide-y divide-ink-100 text-sm">
            {hours?.map((h) => (
              <EditableHourRow
                key={h.id}
                hour={{
                  id: h.id,
                  work_date: h.work_date,
                  hours_worked: h.hours_worked,
                  description: h.description,
                  approved: h.approved,
                  site_id: h.site_id,
                  // @ts-expect-error supabase join shape
                  siteName: h.sites?.name ?? "—",
                }}
                sites={sites ?? []}
              />
            ))}
            {!hours?.length && <li className="py-2 text-ink-400">Zatiaľ žiadne záznamy.</li>}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink-900">Stavebný denník</h2>
          <form action={addDiaryEntry} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                name="entry_date"
                required
                defaultValue={todayISO()}
                className="input"
              />
              <select name="site_id" required defaultValue="" className="input">
                <option value="" disabled>
                  Vyber stavbu
                </option>
                {sites?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="content"
              placeholder="Zápis do denníka"
              rows={3}
              required
              className="input"
            />
            {(isForemanSomewhere || profile.role === "admin") && (
              <div>
                <label className="label">Fotka (len vedúci stavby / admin)</label>
                <input type="file" name="photo" accept="image/*" className="block w-full text-sm" />
              </div>
            )}
            <button type="submit" className="btn-primary">
              Pridať zápis
            </button>
          </form>

          <ul className="mt-5 space-y-3 text-sm">
            {diaryEntries?.map((d) => (
              <EditableDiaryRow
                key={d.id}
                entry={{
                  id: d.id,
                  entry_date: d.entry_date,
                  content: d.content,
                  site_id: d.site_id,
                  // @ts-expect-error supabase join shape
                  siteName: d.sites?.name ?? "—",
                }}
                sites={sites ?? []}
                photos={photosByEntry.get(d.id) ?? []}
              />
            ))}
            {!diaryEntries?.length && <li className="text-ink-400">Zatiaľ žiadne zápisy.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
