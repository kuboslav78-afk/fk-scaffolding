import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";
import { NavBar } from "@/components/nav-bar";
import { addWorkHours, addDiaryEntry, approveWorkHours } from "./actions";

export default async function DashboardPage() {
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
    .select("id, work_date, hours_worked, description, approved, sites(name)")
    .eq("employee_id", profile.id)
    .order("work_date", { ascending: false })
    .limit(10);

  const { data: diaryEntries } = await supabase
    .from("site_diary_entries")
    .select("id, entry_date, content, sites(name)")
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
    <div className="min-h-screen bg-neutral-50">
      <NavBar fullName={profile.full_name} role={profile.role} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-lg font-semibold text-neutral-900">
          Vitaj, {profile.full_name}
        </h1>

        {isForemanSomewhere && (
          <section className="rounded-lg border border-amber-300 bg-amber-50 p-5">
            <h2 className="mb-4 font-medium text-neutral-900">
              Na schválenie ({foremanSites!.map((s) => s.name).join(", ")})
            </h2>
            <ul className="divide-y divide-amber-200 text-sm">
              {pendingApprovals.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-neutral-700">
                    {h.work_date} · {h.employee_name} · {h.site_name} ·{" "}
                    <span className="font-medium">{h.hours_worked} h</span>
                  </span>
                  <form action={approveWorkHours.bind(null, h.id)}>
                    <button
                      type="submit"
                      className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800"
                    >
                      Schváliť
                    </button>
                  </form>
                </li>
              ))}
              {!pendingApprovals.length && (
                <li className="py-2 text-neutral-500">Nič na schválenie.</li>
              )}
            </ul>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Evidencia hodín</h2>
            <form action={addWorkHours} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  name="work_date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  name="hours_worked"
                  placeholder="Počet hodín"
                  required
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <select
                name="site_id"
                required
                defaultValue=""
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Vyber stavbu
                </option>
                {sites?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <textarea
                name="description"
                placeholder="Popis práce"
                rows={2}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Uložiť hodiny
              </button>
            </form>

            <ul className="mt-5 divide-y divide-neutral-100 text-sm">
              {hours?.map((h) => (
                <li key={h.id} className="flex justify-between py-2">
                  <span className="text-neutral-600">
                    {h.work_date} ·{" "}
                    {/* @ts-expect-error supabase join shape */}
                    {h.sites?.name ?? "—"}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">{h.hours_worked} h</span>
                    <span
                      className={
                        h.approved
                          ? "text-xs text-green-600"
                          : "text-xs text-amber-600"
                      }
                    >
                      {h.approved ? "schválené" : "čaká"}
                    </span>
                  </span>
                </li>
              ))}
              {!hours?.length && (
                <li className="py-2 text-neutral-400">Zatiaľ žiadne záznamy.</li>
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Stavebný denník</h2>
            <form action={addDiaryEntry} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  name="entry_date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
                <select
                  name="site_id"
                  required
                  defaultValue=""
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
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
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              {(isForemanSomewhere || profile.role === "admin") && (
                <div>
                  <label className="text-xs text-neutral-500">
                    Fotka (len vedúci stavby / admin)
                  </label>
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    className="block w-full text-sm"
                  />
                </div>
              )}
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Pridať zápis
              </button>
            </form>

            <ul className="mt-5 space-y-3 text-sm">
              {diaryEntries?.map((d) => (
                <li key={d.id} className="border-l-2 border-neutral-200 pl-3">
                  <p className="text-neutral-500">
                    {d.entry_date} ·{" "}
                    {/* @ts-expect-error supabase join shape */}
                    {d.sites?.name ?? "—"}
                  </p>
                  <p className="text-neutral-800">{d.content}</p>
                  {!!photosByEntry.get(d.id)?.length && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {photosByEntry.get(d.id)!.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt=""
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {!diaryEntries?.length && (
                <li className="text-neutral-400">Zatiaľ žiadne zápisy.</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
