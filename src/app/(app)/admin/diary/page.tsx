import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";

export default async function DiarySitesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: sites } = await supabase.from("sites").select("id, name, address").order("name");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Stavebný denník</h1>
      <p className="text-sm text-ink-500">Vyber stavbu a spätne dohľadaj, čo sa na nej robilo a kedy.</p>

      <div className="card divide-y divide-ink-100 p-2">
        {sites?.map((s) => (
          <Link
            key={s.id}
            href={`/admin/diary/${s.id}`}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 transition-colors duration-150 hover:bg-ink-100"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-900">{s.name}</p>
              {s.address && <p className="truncate text-sm text-ink-500">{s.address}</p>}
            </div>
            <span className="shrink-0 text-ink-400">→</span>
          </Link>
        ))}
        {!sites?.length && <p className="px-3 py-4 text-sm text-ink-400">Zatiaľ žiadne stavby.</p>}
      </div>
    </div>
  );
}
