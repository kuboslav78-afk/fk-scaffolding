"use client";

import { useState, useTransition } from "react";
import { updateSite, deleteSite, updateSiteForeman } from "@/app/(app)/admin/sites/actions";

type Profile = { id: string; full_name: string };

type Site = {
  id: string;
  name: string;
  short_name: string | null;
  address: string | null;
  foreman_id: string | null;
};

export function EditableSiteRow({ site, profiles }: { site: Site; profiles: Profile[] }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Naozaj zmazať stavbu "${site.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSite(site.id);
      if (result?.error) setError(result.error);
    });
  }

  if (editing) {
    return (
      <li className="space-y-2 border-b border-ink-100 py-3 last:border-0">
        <form
          action={(formData) => {
            startTransition(async () => {
              await updateSite(site.id, formData);
              setEditing(false);
            });
          }}
          className="space-y-2"
        >
          <input
            type="text"
            name="short_name"
            defaultValue={site.short_name ?? ""}
            placeholder="Krátky názov (napr. Kongresshalle)"
            className="input"
          />
          <input type="text" name="name" defaultValue={site.name} required className="input" />
          <input type="text" name="address" defaultValue={site.address ?? ""} placeholder="Adresa" className="input" />
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="btn-primary btn-sm">
              Uložiť
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary btn-sm">
              Zrušiť
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="space-y-2 border-b border-ink-100 py-3 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink-900">{site.short_name || site.name}</p>
          {site.short_name && <p className="text-ink-500">{site.name}</p>}
          {site.address && <p className="text-ink-500">{site.address}</p>}
        </div>
        <span className="flex shrink-0 gap-2">
          <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
            Upraviť
          </button>
          <button onClick={handleDelete} disabled={isPending} className="btn-danger btn-sm">
            Zmazať
          </button>
        </span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <form
        action={async (formData: FormData) => {
          const foremanId = formData.get("foreman_id");
          await updateSiteForeman(site.id, foremanId ? String(foremanId) : null);
        }}
        className="flex items-center gap-2"
      >
        <span className="text-ink-500">Vedúci:</span>
        <select
          name="foreman_id"
          defaultValue={site.foreman_id ?? ""}
          className="rounded-lg border border-ink-200 px-2 py-1 text-xs"
        >
          <option value="">— nepridelený —</option>
          {profiles.map((p) => (
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
  );
}
