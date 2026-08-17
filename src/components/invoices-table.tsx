"use client";

import { useState, useTransition } from "react";
import {
  updateInvoice,
  deleteInvoiceGroup,
  toggleInvoiceGroupFlag,
  sendGroupedInvoicesToPeter,
} from "@/app/(app)/admin/orders/actions";
import { addMonthsISO } from "@/lib/dates";

const TABLE_COLS = 8;

export type InvoiceGroup = {
  invoiceNumber: string;
  ids: string[];
  amount: number;
  issued_date: string;
  due_date: string | null;
  sent: boolean;
  paid: boolean;
  hasPdf: boolean;
  orderNumbers: string[];
  customerName: string;
  orderLabel: string;
};

function GroupedInvoiceRow({
  group,
  peterEmail,
  selected,
  onToggleSelect,
}: {
  group: InvoiceGroup;
  peterEmail: string | null;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [issuedDate, setIssuedDate] = useState(group.issued_date);
  const [dueDate, setDueDate] = useState(group.due_date ?? addMonthsISO(group.issued_date, 1));

  const single = group.ids.length === 1;

  const mailtoHref = peterEmail
    ? `mailto:${encodeURIComponent(peterEmail)}?subject=${encodeURIComponent(
        `Faktúra ${group.invoiceNumber}`
      )}&body=${encodeURIComponent(
        [
          `Faktúra č. ${group.invoiceNumber}`,
          `Objednávka: ${group.orderLabel}`,
          `Suma: ${group.amount.toFixed(2)} €`,
          `Vystavená: ${group.issued_date}`,
          group.due_date ? `Splatnosť: ${group.due_date}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      )}`
    : null;

  function handleDelete() {
    if (!confirm(`Naozaj zmazať faktúru ${group.invoiceNumber}${single ? "" : ` (${group.ids.length} položky)`}?`))
      return;
    startTransition(() => {
      deleteInvoiceGroup(group.ids);
    });
  }

  if (editing && single) {
    return (
      <tr className="border-b border-ink-100">
        <td colSpan={TABLE_COLS} className="p-3">
          <form
            action={(formData) => {
              startTransition(async () => {
                await updateInvoice(group.ids[0], formData);
                setEditing(false);
              });
            }}
            className="space-y-2"
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <input type="text" name="invoice_number" defaultValue={group.invoiceNumber} required className="input" />
              <input type="number" step="0.01" name="amount" defaultValue={group.amount} required className="input" />
              <input
                type="date"
                name="issued_date"
                value={issuedDate}
                onChange={(e) => {
                  const nextIssued = e.target.value;
                  setIssuedDate(nextIssued);
                  setDueDate(addMonthsISO(nextIssued, 1));
                }}
                required
                className="input"
              />
              <input
                type="date"
                name="due_date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="btn-primary btn-sm">
                Uložiť
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary btn-sm">
                Zrušiť
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-ink-100 align-top text-sm">
      <td className="py-2.5 pr-3">
        {!group.sent && group.hasPdf && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-ink-200 accent-brand-500"
          />
        )}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-ink-900">{group.invoiceNumber}</td>
      <td className="py-2.5 pr-3 text-ink-700">{group.orderLabel}</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-900">{group.amount.toFixed(2)} €</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{group.issued_date}</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{group.due_date ?? "—"}</td>
      <td className="whitespace-nowrap py-2.5 pr-3">
        {group.sent ? (
          <form action={toggleInvoiceGroupFlag.bind(null, group.ids, "sent", false)}>
            <button type="submit" className="badge-success">
              odoslaná ✓
            </button>
          </form>
        ) : group.hasPdf ? (
          <span className="badge-neutral">na odoslanie ✓ (vyber a pošli nižšie)</span>
        ) : mailtoHref ? (
          <a
            href={mailtoHref}
            onClick={() => startTransition(() => toggleInvoiceGroupFlag(group.ids, "sent", true))}
            className="badge-neutral"
          >
            Poslať Petrovi
          </a>
        ) : (
          <form action={toggleInvoiceGroupFlag.bind(null, group.ids, "sent", true)}>
            <button
              type="submit"
              className="badge-neutral"
              title="Nastav kontakt „Peter“ v Podkladoch pre FA"
            >
              odoslať
            </button>
          </form>
        )}
      </td>
      <td className="whitespace-nowrap py-2.5">
        <div className="flex flex-wrap gap-2">
          <form action={toggleInvoiceGroupFlag.bind(null, group.ids, "paid", !group.paid)}>
            <button type="submit" className={group.paid ? "badge-success" : "badge-neutral"}>
              {group.paid ? "uhradená ✓" : "uhradiť"}
            </button>
          </form>
          {single && (
            <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
              Upraviť
            </button>
          )}
          <button onClick={handleDelete} disabled={isPending} className="btn-danger btn-sm">
            Zmazať
          </button>
        </div>
      </td>
    </tr>
  );
}

export function InvoicesTable({ groups, peterEmail }: { groups: InvoiceGroup[]; peterEmail: string | null }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const selectedNumbers = groups.filter((g) => selected[g.invoiceNumber]).map((g) => g.invoiceNumber);

  function handleSend() {
    setResult(null);
    startTransition(async () => {
      const res = await sendGroupedInvoicesToPeter(selectedNumbers);
      if (res.ok) {
        setResult(`Odoslaných ${res.sent} faktúr Petrovi.`);
        setSelected({});
      } else {
        setResult(`Chyba: ${res.error}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="pb-2 pr-3"></th>
              <th className="pb-2 pr-3">Číslo</th>
              <th className="pb-2 pr-3">Objednávka</th>
              <th className="pb-2 pr-3">Suma</th>
              <th className="pb-2 pr-3">Vystavená</th>
              <th className="pb-2 pr-3">Splatnosť</th>
              <th className="pb-2 pr-3">Odoslaná</th>
              <th className="pb-2">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <GroupedInvoiceRow
                key={g.invoiceNumber}
                group={g}
                peterEmail={peterEmail}
                selected={!!selected[g.invoiceNumber]}
                onToggleSelect={() =>
                  setSelected((s) => ({ ...s, [g.invoiceNumber]: !s[g.invoiceNumber] }))
                }
              />
            ))}
          </tbody>
        </table>
        {!groups.length && <p className="py-4 text-sm text-ink-400">Zatiaľ žiadne faktúry.</p>}
      </div>

      {!!groups.length && (
        <div className="card flex flex-wrap items-center gap-3 p-5">
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || !selectedNumbers.length}
            className="btn-primary"
          >
            {isPending ? "Odosielam…" : `Poslať Petrovi (${selectedNumbers.length})`}
          </button>
          {!selectedNumbers.length && (
            <p className="text-xs text-ink-400">Zaškrtni faktúry vyššie, ktoré chceš poslať naraz.</p>
          )}
          {result && <p className="text-sm text-ink-600">{result}</p>}
        </div>
      )}
    </div>
  );
}
