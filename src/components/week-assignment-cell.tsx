"use client";

import { useState, useTransition } from "react";
import { upsertAssignment } from "@/app/(app)/dashboard/actions";

type Site = { id: string; name: string };

export function WeekAssignmentCell({
  employeeId,
  date,
  siteId,
  sites,
  availabilityStatus,
}: {
  employeeId: string;
  date: string;
  siteId: string | null;
  sites: Site[];
  availabilityStatus?: "work" | "off";
}) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(siteId ?? "");

  return (
    <div className="space-y-1">
      <select
        value={value}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          startTransition(() => upsertAssignment(employeeId, date, next));
        }}
        className="w-full min-w-[140px] rounded-lg border border-ink-200 bg-[#141210] px-1.5 py-1 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
      >
        <option value="">—</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {availabilityStatus === "off" && <p className="text-[11px] text-red-400">žiada voľno</p>}
      {availabilityStatus === "work" && <p className="text-[11px] text-emerald-400">chce pracovať</p>}
    </div>
  );
}
