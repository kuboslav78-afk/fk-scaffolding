"use client";

import { useState, useTransition } from "react";
import { resetEmployeePassword } from "@/app/(app)/admin/employees/actions";

export function ResetPasswordButton({ employeeId }: { employeeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm("Nastaviť zamestnancovi nové dočasné heslo? Staré prestane platiť.")) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await resetEmployeePassword(employeeId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.tempPassword) setResult({ email: res.email ?? "", tempPassword: res.tempPassword });
    });
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={isPending} className="btn-secondary btn-sm">
        {isPending ? "Resetujem…" : "Resetovať heslo"}
      </button>
      {error && <p className="basis-full text-xs text-red-400">{error}</p>}
      {result && (
        <div className="basis-full rounded-lg border border-amber-900/40 bg-amber-500/10 p-2 text-xs text-amber-300">
          <p>
            Nové heslo pre <span className="font-mono">{result.email}</span>:{" "}
            <span className="font-mono">{result.tempPassword}</span>
          </p>
          <p className="mt-1">Toto heslo sa už nikde nezobrazí, ulož si ho teraz.</p>
        </div>
      )}
    </>
  );
}
