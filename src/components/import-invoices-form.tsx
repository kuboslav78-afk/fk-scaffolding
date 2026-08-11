"use client";

import { useRef, useState, useTransition } from "react";
import {
  checkInvoiceImport,
  commitInvoiceImport,
  parseInvoicePdfsAction,
  type ImportRow,
  type CheckedRow,
} from "@/app/(app)/admin/orders/import/actions";
import { todayISO } from "@/lib/dates";

function emptyRow(key: string): ImportRow {
  return {
    key,
    orderNumber: "",
    invoiceNumber: "",
    amount: 0,
    peterDate: todayISO(),
  };
}

const STATUS_LABEL: Record<CheckedRow["status"], { label: string; className: string }> = {
  ok: { label: "✓ sedí", className: "badge-success" },
  mismatch: { label: "⚠ nesedí", className: "badge-warning" },
  not_found: { label: "✗ nenájdená", className: "badge-danger" },
  already_invoiced: { label: "✗ už má faktúru", className: "badge-danger" },
  ambiguous: { label: "⚠ viacero zhôd", className: "badge-warning" },
};

let rowCounter = 0;
function nextKey() {
  rowCounter += 1;
  return `row-${rowCounter}`;
}

export function ImportInvoicesForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rowNotes, setRowNotes] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<CheckedRow[] | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

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
    setRowNotes((n) => {
      const next = { ...n };
      delete next[key];
      return next;
    });
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length) return;

    setIsUploading(true);
    setChecked(null);
    setResult(null);

    const formData = new FormData();
    for (const file of Array.from(files)) formData.append("pdfs", file);

    try {
      const parsed = await parseInvoicePdfsAction(formData);
      const newRows: ImportRow[] = [];
      const newNotes: Record<string, string> = {};

      for (const p of parsed) {
        const key = nextKey();
        newRows.push({
          key,
          orderNumber: p.contractRef ?? "",
          invoiceNumber: p.invoiceNumber ?? "",
          amount: p.amount ?? 0,
          peterDate: p.issuedDate ?? todayISO(),
        });
        if (p.error) newNotes[key] = `${p.fileName}: ${p.error}`;
        else if (!p.contractRef) newNotes[key] = `${p.fileName}: nenašla sa referencia "Z-XXX" — zadaj zmluvu ručne`;
      }

      setRows((rs) => [...rs, ...newRows]);
      setRowNotes((n) => ({ ...n, ...newNotes }));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        setRows([]);
        setRowNotes({});
      } else {
        setResult(res.error ? `Chyba: ${res.error}` : "Nič sa neuložilo.");
      }
    });
  }

  const checkedByKey = new Map((checked ?? []).map((c) => [c.key, c]));
  const savableCount = (checked ?? []).filter((c) => c.status === "ok" || c.status === "mismatch").length;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <label className="label">Nahrať PDF faktúry (viac naraz)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFilesSelected}
          disabled={isUploading}
          className="block w-full text-sm"
        />
        {isUploading && <p className="label mt-1">Načítavam PDF…</p>}
        <p className="mt-1 text-xs text-ink-400">
          Systém si sám vytiahne číslo faktúry, sumu, dátum a referenciu na zmluvu (Z-XXX). Riadky bez
          nájdenej referencie treba doplniť ručne.
        </p>
      </div>

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
              const note = rowNotes[row.key];
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
                    {note && <p className="mt-1 max-w-[160px] text-[11px] text-amber-400">{note}</p>}
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
        {!rows.length && (
          <p className="py-4 text-sm text-ink-400">Nahraj PDF faktúry vyššie, alebo pridaj riadok ručne.</p>
        )}

        <button type="button" onClick={addRow} className="btn-ghost btn-sm mt-3">
          + Pridať riadok
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleCheck} disabled={isPending || !rows.length} className="btn-secondary">
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
