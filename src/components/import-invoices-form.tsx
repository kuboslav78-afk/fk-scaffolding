"use client";

import { useState, useTransition } from "react";
import { checkInvoiceImport, commitInvoiceImport, type ImportRow, type CheckedRow } from "@/app/(app)/admin/orders/import/actions";
import { todayISO } from "@/lib/dates";

function emptyRow(key: string): ImportRow {
  const today = todayISO();
  return {
    key,
    orderNumber: "",
    invoiceNumber: "",
    amount: 0,
    peterDate: today,
  };
}

const STATUS_LABEL: Record<CheckedRow["status"], { label: string; className: string }> = {
  ok: { label: "✓ sedí", className: "badge-success" },
  mismatch: { label: "⚠ nesedí", className: "badge-warning" },
  not_found: { label: "✗ nenájdená", className: "badge-danger" },
  already_invoiced: { label: "✗ už má faktúru", className: "badge-danger" },
};

let rowCounter = 0;
function nextKey() {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

export function ImportInvoicesForm() {
  const [rows, setRows] = useState<ImportRow[]>(() =>
    Array.from({ length: 5 }, () => emptyRow(nextKey()))
  );
  const [checked, setChecked] = useState<CheckedRow[] | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRow(key: string, patch: Partial<ImportRow>) {
    setChecked(null);
    setResult(null);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, emptyRow(nextKey())]);
  }

  function removeRow(key: string) {
    setChecked(null);
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  function handleCheck() {
    const filled = rows.filter((r) => r.orderNumber.trim() && r.invoiceNumber.trim() && r.amount > 0);
    if (!filled.length) return;
    startTransition(async () => {
      const res = await checkInvoiceImport(filled);
      setChecked(res);
    });
  }

  function handleCommit() {
    if (!checked) return;
    startTransition(async () => {
      const res = await commitInvoiceImport(checked);
      if (res.inserted) {
        setResult(`Uložených ${res.inserted} faktúr.`);
        setChecked(null);
        setRows(Array.from({ length: 5 }, () => emptyRow(nextKey())));
      } else {
        setResult(res.error ? `Chyba: ${res.error}` : "Nič sa neuložilo.");
      }
    });
  }

  const checkedByKey = new Map((checked ?? []).map((c) => [c.key, c]));
  const savableCount = (checked ?? []).filter((c) => c.status === "ok" || c.status === "mismatch").length;

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="pb-2 pr-3">Zmluva č.</th>
              <th className="pb-2 pr-3">Číslo faktúry</th>
              <th className="pb-2 pr-3">Suma (€)</th>
              <th className="pb-2 pr-3">Dátum (Peter)</th>
              {checked && <th className="pb-2 pr-3">Vystavenie / Splatnosť</th>}
              {checked && <th className="pb-2 pr-3">Stav</th>}
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowChecked = checkedByKey.get(row.key);
              return (
                <tr key={row.key} className="border-b border-ink-100 align-top text-sm">
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={row.orderNumber}
                      onChange={(e) => updateRow(row.key, { orderNumber: e.target.value })}
                      placeholder="napr. 545"
                      className="input w-28"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={row.invoiceNumber}
                      onChange={(e) => updateRow(row.key, { invoiceNumber: e.target.value })}
                      placeholder="Číslo faktúry"
                      className="input w-32"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      step="0.01"
                      value={row.amount || ""}
                      onChange={(e) => updateRow(row.key, { amount: parseFloat(e.target.value) || 0 })}
                      className="input w-28"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="date"
                      value={row.peterDate}
                      onChange={(e) => updateRow(row.key, { peterDate: e.target.value })}
                      className="input w-[150px]"
                    />
                  </td>
                  {checked && (
                    <td className="py-2 pr-3 text-xs text-ink-500">
                      {rowChecked ? (
                        <div>
                          <p>
                            Vystavenie: <span className="text-ink-900">{rowChecked.issuedDate}</span>
                            {rowChecked.dateBumped && (
                              <span className="ml-1 text-amber-400" title="Posunuté, aby nepredbehlo faktúru s nižším číslom">
                                (posunuté)
                              </span>
                            )}
                          </p>
                          <p>
                            Splatnosť: <span className="text-ink-900">{rowChecked.dueDate}</span>
                          </p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  {checked && (
                    <td className="py-2 pr-3">
                      {rowChecked ? (
                        <div>
                          <span className={STATUS_LABEL[rowChecked.status].className}>
                            {STATUS_LABEL[rowChecked.status].label}
                          </span>
                          {rowChecked.message && (
                            <p className="mt-1 text-xs text-ink-400">{rowChecked.message}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="py-2">
                    <button type="button" onClick={() => removeRow(row.key)} className="btn-ghost btn-sm">
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button type="button" onClick={addRow} className="btn-ghost btn-sm mt-3">
          + Pridať riadok
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleCheck} disabled={isPending} className="btn-secondary">
          Skontrolovať
        </button>
        {checked && (
          <button type="button" onClick={handleCommit} disabled={isPending || !savableCount} className="btn-primary">
            Uložiť {savableCount ? `(${savableCount})` : ""}
          </button>
        )}
        {result && <p className="text-sm text-ink-600">{result}</p>}
      </div>
    </div>
  );
}
