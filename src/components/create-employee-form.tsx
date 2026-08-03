"use client";

import { useState, useTransition } from "react";
import { createEmployee } from "@/app/admin/employees/actions";

export function CreateEmployeeForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setCreated(null);
    startTransition(async () => {
      const result = await createEmployee(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.tempPassword && result?.email) {
        setCreated({ email: result.email, tempPassword: result.tempPassword });
      }
    });
  }

  return (
    <div className="space-y-3">
      <form action={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="full_name"
          placeholder="Meno a priezvisko"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          name="role"
          defaultValue="employee"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="employee">Zamestnanec</option>
          <option value="foreman">Vedúci stavby</option>
          <option value="admin">Administrátor</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {isPending ? "Vytváram…" : "Vytvoriť účet"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {created && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Účet vytvorený — odovzdaj tieto údaje zamestnancovi:</p>
          <p>
            Email: <span className="font-mono">{created.email}</span>
          </p>
          <p>
            Dočasné heslo: <span className="font-mono">{created.tempPassword}</span>
          </p>
          <p className="mt-1 text-xs">Toto heslo sa už nikde nezobrazí, ulož si ho teraz.</p>
        </div>
      )}
    </div>
  );
}
