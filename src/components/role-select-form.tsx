"use client";

import { useRef } from "react";
import { updateEmployeeRole } from "@/app/(app)/admin/employees/actions";

export function RoleSelectForm({
  employeeId,
  role,
  disabled,
}: {
  employeeId: string;
  role: "admin" | "foreman" | "employee";
  disabled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateEmployeeRole}>
      <input type="hidden" name="employee_id" value={employeeId} />
      <select
        name="role"
        defaultValue={role}
        disabled={disabled}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-ink-700 disabled:opacity-40"
      >
        <option value="employee">Zamestnanec</option>
        <option value="foreman">Vedúci stavby</option>
        <option value="admin">Administrátor</option>
      </select>
    </form>
  );
}
