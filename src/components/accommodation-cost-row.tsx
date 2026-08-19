"use client";

import { useState, useTransition } from "react";
import { updateAccommodationCost, deleteAccommodationCost } from "@/app/(app)/admin/payroll/actions";
import { formatThousands } from "@/lib/format";

type Cost = {
  id: string;
  amount: number;
  note: string | null;
};

export function AccommodationCostRow({ cost }: { cost: Cost }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Naozaj zmazať tento náklad?")) return;
    startTransition(() => {
      deleteAccommodationCost(cost.id);
    });
  }

  if (editing) {
    return (
      <li className="py-2.5">
        <form
          action={(formData) => {
            startTransition(async () => {
              await updateAccommodationCost(cost.id, formData);
              setEditing(false);
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="number" step="0.01" name="amount" defaultValue={cost.amount} required className="input w-28" />
          <input type="text" name="note" defaultValue={cost.note ?? ""} placeholder="Poznámka" className="input flex-1 min-w-[160px]" />
          <button type="submit" disabled={isPending} className="btn-primary btn-sm">
            Uložiť
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary btn-sm">
            Zrušiť
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="text-ink-600">{cost.note ?? "bez poznámky"}</span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="font-medium text-ink-900">{formatThousands(cost.amount)} €</span>
        <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
          Upraviť
        </button>
        <button onClick={handleDelete} disabled={isPending} className="btn-danger btn-sm">
          Zmazať
        </button>
      </span>
    </li>
  );
}
