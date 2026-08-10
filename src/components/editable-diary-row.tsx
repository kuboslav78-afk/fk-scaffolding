"use client";

import { useState, useTransition } from "react";
import { updateDiaryEntry, deleteDiaryEntry } from "@/app/(app)/hodiny/actions";

type Site = { id: string; name: string };

type DiaryEntry = {
  id: string;
  entry_date: string;
  content: string;
  site_id: string | null;
  siteName: string;
};

export function EditableDiaryRow({
  entry,
  sites,
  photos,
}: {
  entry: DiaryEntry;
  sites: Site[];
  photos: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Zmazať tento zápis do denníka?")) return;
    startTransition(() => {
      deleteDiaryEntry(entry.id);
    });
  }

  if (editing) {
    return (
      <li className="border-l-2 border-ink-100 pl-3">
        <form
          action={(formData) => {
            startTransition(async () => {
              await updateDiaryEntry(entry.id, formData);
              setEditing(false);
            });
          }}
          className="space-y-2"
        >
          <div className="grid grid-cols-2 gap-2">
            <input type="date" name="entry_date" defaultValue={entry.entry_date} required className="input" />
            <select name="site_id" defaultValue={entry.site_id ?? ""} required className="input">
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <textarea name="content" defaultValue={entry.content} required rows={3} className="input" />
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
    <li className="border-l-2 border-ink-100 pl-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-ink-500">
          {entry.entry_date} · {entry.siteName}
        </p>
        <span className="flex shrink-0 gap-2">
          <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
            Upraviť
          </button>
          <button onClick={handleDelete} disabled={isPending} className="btn-danger btn-sm">
            Zmazať
          </button>
        </span>
      </div>
      <p className="text-ink-800">{entry.content}</p>
      {!!photos.length && (
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-16 w-16 rounded-md object-cover" />
          ))}
        </div>
      )}
    </li>
  );
}
