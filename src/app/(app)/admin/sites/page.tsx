import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Stavby</h1>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink-900">Nová stavba</h2>
          <form action={createSite} className="space-y-3">
            <input type="text" name="name" placeholder="Názov stavby" required className="input" />
            <input type="text" name="address" placeholder="Adresa" className="input" />
            <select name="foreman_id" defaultValue="" className="input">
              <option value="">Bez vedúceho (zatiaľ)</option>
              {profiles?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary">
              Vytvoriť stavbu
            </button>
          </form>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-ink-900">Existujúce stavby</h2>
          <ul className="divide-y divide-ink-100 text-sm">
            {sites?.map((s) => (
              <li key={s.id} className="space-y-2 py-3">
                <div>
                  <p className="font-medium text-ink-900">{s.name}</p>
                  {s.address && <p className="text-ink-500">{s.address}</p>}
                </div>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    const foremanId = formData.get("foreman_id");
                    await updateSiteForeman(s.id, foremanId ? String(foremanId) : null);
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="text-ink-500">Vedúci:</span>
                  <select
                    name="foreman_id"
                    defaultValue={s.foreman_id ?? ""}
                    className="rounded-lg border border-ink-200 px-2 py-1 text-xs"
                  >
                    <option value="">— nepridelený —</option>
                    {profiles?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-secondary btn-sm">
                    Uložiť
                  </button>
                </form>
              </li>
            ))}
            {!sites?.length && <li className="py-2 text-ink-400">Zatiaľ žiadne stavby.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
