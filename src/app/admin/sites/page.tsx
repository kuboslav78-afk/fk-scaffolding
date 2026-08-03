import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { NavBar } from "@/components/nav-bar";
import { createSite, updateSiteForeman } from "./actions";

export default async function SitesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: sites }, { data: profiles }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, address, foreman_id, profiles(full_name)")
      .order("name"),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar fullName={profile.full_name} role={profile.role} />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-lg font-semibold text-neutral-900">Stavby</h1>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Nová stavba</h2>
            <form action={createSite} className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Názov stavby"
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                name="address"
                placeholder="Adresa"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <select
                name="foreman_id"
                defaultValue=""
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Bez vedúceho (zatiaľ)</option>
                {profiles?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Vytvoriť stavbu
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 font-medium text-neutral-900">Existujúce stavby</h2>
            <ul className="divide-y divide-neutral-100 text-sm">
              {sites?.map((s) => (
                <li key={s.id} className="space-y-2 py-3">
                  <div>
                    <p className="font-medium text-neutral-900">{s.name}</p>
                    {s.address && <p className="text-neutral-500">{s.address}</p>}
                  </div>
                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      const foremanId = formData.get("foreman_id");
                      await updateSiteForeman(s.id, foremanId ? String(foremanId) : null);
                    }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-neutral-500">Vedúci:</span>
                    <select
                      name="foreman_id"
                      defaultValue={s.foreman_id ?? ""}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    >
                      <option value="">— nepridelený —</option>
                      {profiles?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                    >
                      Uložiť
                    </button>
                  </form>
                </li>
              ))}
              {!sites?.length && (
                <li className="py-2 text-neutral-400">Zatiaľ žiadne stavby.</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
