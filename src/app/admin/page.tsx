import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { NavBar } from "@/components/nav-bar";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const { data: recentHours } = await supabase
    .from("work_hours")
    .select("id, work_date, hours_worked, approved, sites(name), profiles!employee_id(full_name)")
    .order("work_date", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar fullName={profile.full_name} role={profile.role} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-lg font-semibold text-neutral-900">Administrácia</h1>

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
