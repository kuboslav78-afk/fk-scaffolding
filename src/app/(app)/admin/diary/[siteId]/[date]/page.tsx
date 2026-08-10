import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/get-profile";

export default async function DiaryDayPage({
  params,
}: {
  params: Promise<{ siteId: string; date: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const { siteId, date } = await params;

  const supabase = await createClient();

  const [{ data: site }, { data: entries }] = await Promise.all([
    supabase.from("sites").select("id, name").eq("id", siteId).single(),
    supabase
      .from("site_diary_entries")
      .select("id, content, profiles!employee_id(full_name)")
      .eq("site_id", siteId)
      .eq("entry_date", date)
      .order("created_at"),
  ]);

  if (!site) notFound();

  let photosByEntry = new Map<string, string[]>();
  if (entries?.length) {
    const admin = createAdminClient();
    const { data: photos } = await admin
      .from("diary_photos")
      .select("diary_entry_id, storage_path")
      .in(
        "diary_entry_id",
        entries.map((e) => e.id)
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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <Link href={`/admin/diary/${siteId}`} className="btn-ghost btn-sm">
        ← Späť na kalendár
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{site.name}</h1>
        <p className="text-ink-500">{date}</p>
      </div>

      <div className="space-y-4">
        {entries?.map((e) => (
          <div key={e.id} className="card p-5">
            <p className="mb-2 text-sm font-medium text-ink-500">
              {/* @ts-expect-error supabase join shape */}
              {e.profiles?.full_name ?? "—"}
            </p>
            <p className="text-ink-800">{e.content}</p>
            {!!photosByEntry.get(e.id)?.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {photosByEntry.get(e.id)!.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="h-28 w-28 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        ))}
        {!entries?.length && (
          <p className="card p-5 text-sm text-ink-400">Žiadne zápisy pre tento deň.</p>
        )}
      </div>
    </div>
  );
}
