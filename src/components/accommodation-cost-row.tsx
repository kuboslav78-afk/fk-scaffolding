"use client";

import { useState, useTransition } from "react";
import { updateAccommodationCost, deleteAccommodationCost } from "@/app/(app)/admin/payroll/actions";
import { formatThousands } from "@/lib/format";

const TABLE_COLS = 3;

type Cost = {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
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
      <tr className="border-b border-ink-100">
        <td colSpan={TABLE_COLS} className="py-2.5">
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
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-ink-100 text-sm">
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{cost.created_at.slice(0, 10)}</td>
      <td className="py-2.5 pr-3 text-ink-700">{cost.note ?? "bez poznámky"}</td>
      <td className="whitespace-nowrap py-2.5">
        <div className="flex items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-md bg-sky-400/20 px-1.5 py-0.5 font-semibold text-sky-300">
            {formatThousands(cost.amount)} €
          </span>
          <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
            Upraviť
          </button>
          <button onClick={handleDelete} disabled={isPending} className="btn-danger btn-sm">
            Zmazať
          </button>
        </div>
      </td>
    </tr>
  );
}
