"use client";

import { useTransition } from "react";
import { setAvailability, clearAvailability } from "@/app/(app)/dashboard/actions";

export function AvailabilityDayCard({
  date,
  dayName,
  siteName,
  status,
}: {
  date: string;
  dayName: string;
  siteName: string | null;
  status: "work" | "off" | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{dayName}</p>
      <p className="mt-0.5 text-sm text-ink-400">{date}</p>

      <p className="mt-3 text-sm text-ink-900">
        {siteName ? (
          <span>
            Priradený: <span className="font-medium">{siteName}</span>
          </span>
        ) : (
          <span className="text-ink-400">Nepriradený</span>
        )}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => startTransition(() => setAvailability(date, "work"))}
          disabled={isPending}
          className={status === "work" ? "badge-success" : "badge-neutral"}
        >
          Chcem pracovať
        </button>
        <button
          onClick={() => startTransition(() => setAvailability(date, "off"))}
          disabled={isPending}
          className={status === "off" ? "badge-danger" : "badge-neutral"}
        >
          Chcem voľno
        </button>
        {status && (
          <button
            onClick={() => startTransition(() => clearAvailability(date))}
            disabled={isPending}
            className="btn-ghost btn-sm"
          >
            zrušiť
          </button>
        )}
      </div>
    </div>
  );
}
