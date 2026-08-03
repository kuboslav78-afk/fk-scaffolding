import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { NavBar } from "@/components/nav-bar";
import { addWorkHours, addDiaryEntry } from "./actions";

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const { data: hours } = await supabase
    .from("work_hours")
    .select("id, work_date, hours_worked, site_name, description")
    .eq("employee_id", profile.id)
    .order("work_date", { ascending: false })
    .limit(10);

  const { data: diaryEntries } = await supabase
    .from("site_diary_entries")
    .select("id, entry_date, site_name, content")
    .eq("employee_id", profile.id)
    .order("entry_date", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar fullName={profile.full_name} role={profile.role} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-lg font-semibold text-neutral-900">
          Vitaj, {profile.full_name}
        </h1>

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
              <input
                type="text"
                name="site_name"
                placeholder="Stavba"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
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
                    {h.work_date} {h.site_name ? `· ${h.site_name}` : ""}
                  </span>
                  <span className="font-medium text-neutral-900">{h.hours_worked} h</span>
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
                <input
                  type="text"
                  name="site_name"
                  placeholder="Stavba"
                  required
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <textarea
                name="content"
                placeholder="Zápis do denníka"
                rows={3}
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
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
                    {d.entry_date} · {d.site_name}
                  </p>
                  <p className="text-neutral-800">{d.content}</p>
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
