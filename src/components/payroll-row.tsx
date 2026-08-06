"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateHourlyRate } from "@/app/(app)/admin/payroll/actions";

type Employee = {
  id: string;
  full_name: string;
  hourly_rate: number | null;
};

export function PayrollRow({
  employee,
  hours,
  monthParam,
}: {
  employee: Employee;
  hours: number;
  monthParam: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [rate, setRate] = useState(employee.hourly_rate?.toString() ?? "");

  const wage = hours * (parseFloat(rate) || 0);

  return (
    <tr className="border-b border-ink-100 align-top text-sm">
      <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-ink-900">
        <Link href={`/admin/payroll/${employee.id}?month=${monthParam}`} className="hover:text-brand-400">
          {employee.full_name}
        </Link>
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-700">{hours} h</td>
      <td className="whitespace-nowrap py-2.5 pr-3">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step="0.01"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-[90px] rounded-lg border border-ink-200 px-1.5 py-1 text-xs"
            placeholder="€/h"
          />
          <button
            onClick={() =>
              startTransition(() => updateHourlyRate(employee.id, parseFloat(rate) || 0))
            }
            disabled={isPending}
            className="badge-neutral"
          >
            uložiť
          </button>
        </div>
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 font-semibold text-ink-900">{wage.toFixed(2)} €</td>
      <td className="whitespace-nowrap py-2.5">
        <Link href={`/admin/payroll/${employee.id}?month=${monthParam}`} className="btn-ghost btn-sm">
          Detail
        </Link>
      </td>
    </tr>
  );
}
