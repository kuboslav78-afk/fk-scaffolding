"use client";

import { useState, useTransition } from "react";
import { updateWorkHours, deleteWorkHours } from "@/app/(app)/hodiny/actions";

type Site = { id: string; name: string };

type Hour = {
  id: string;
  work_date: string;
  hours_worked: number;
  description: string | null;
  approved: boolean;
  site_id: string | null;
  siteName: string;
};

export function EditableHourRow({ hour, sites }: { hour: Hour; sites: Site[] }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Zmazať tento záznam hodín?")) return;
    startTransition(() => {
      deleteWorkHours(hour.id);
    });
  }

  if (editing) {
    return (
      <li className="space-y-2 border-b border-ink-100 py-2.5 last:border-0">
        <form
          action={(formData) => {
            startTransition(async () => {
              await updateWorkHours(hour.id, formData);
              setEditing(false);
            });
          }}
          className="grid grid-cols-2 gap-2"
        >
          <input type="date" name="work_date" defaultValue={hour.work_date} required className="input" />
          <input
            type="number"
            step="0.25"
            min="0.25"
            name="hours_worked"
            defaultValue={hour.hours_worked}
            required
            className="input"
          />
          <select name="site_id" defaultValue={hour.site_id ?? ""} required className="input col-span-2">
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            defaultValue={hour.description ?? ""}
            placeholder="Popis práce"
            rows={2}
            className="input col-span-2"
          />
          <div className="col-span-2 flex gap-2">
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
    <li className="flex items-center justify-between gap-2 py-2.5">
      <span className="text-ink-600">
        {hour.work_date} · {hour.siteName}
      </span>
      <span className="flex items-center gap-2">
        <span className="font-medium text-ink-900">{hour.hours_worked} h</span>
        <span className={hour.approved ? "badge-success" : "badge-warning"}>
          {hour.approved ? "schválené" : "čaká"}
        </span>
        {!hour.approved && (
          <>
            <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
              Upraviť
            </button>
            <button onClick={handleDelete} disabled={isPending} className="btn-danger btn-sm">
              Zmazať
            </button>
          </>
        )}
      </span>
    </li>
  );
}
