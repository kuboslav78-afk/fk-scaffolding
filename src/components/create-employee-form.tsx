"use client";

import { useState, useTransition } from "react";
import { createEmployee } from "@/app/(app)/admin/employees/actions";

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
          className="input"
        />
        <input type="email" name="email" placeholder="Email" required className="input" />
        <select name="role" defaultValue="employee" className="input">
          <option value="employee">Zamestnanec</option>
          <option value="foreman">Vedúci stavby</option>
          <option value="admin">Administrátor</option>
        </select>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Vytváram…" : "Vytvoriť účet"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {created && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
