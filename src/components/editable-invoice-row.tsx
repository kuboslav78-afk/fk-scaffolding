"use client";

import { useState, useTransition } from "react";
import { updateInvoice, deleteInvoice, toggleInvoiceFlag } from "@/app/(app)/admin/orders/actions";

const TABLE_COLS = 7;

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  issued_date: string;
  due_date: string | null;
  sent: boolean;
  paid: boolean;
  orderLabel: string;
};

export function EditableInvoiceRow({ invoice }: { invoice: Invoice }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [issuedDate, setIssuedDate] = useState(invoice.issued_date);
  const [dueDate, setDueDate] = useState(invoice.due_date ?? addDays(invoice.issued_date, 30));

  function handleDelete() {
    if (!confirm(`Naozaj zmazať faktúru ${invoice.invoice_number}?`)) return;
    startTransition(() => {
      deleteInvoice(invoice.id);
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-ink-100">
        <td colSpan={TABLE_COLS} className="p-3">
          <form
            action={(formData) => {
              startTransition(async () => {
                await updateInvoice(invoice.id, formData);
                setEditing(false);
              });
            }}
            className="space-y-2"
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <input type="text" name="invoice_number" defaultValue={invoice.invoice_number} required className="input" />
              <input type="number" step="0.01" name="amount" defaultValue={invoice.amount} required className="input" />
              <input
                type="date"
                name="issued_date"
                value={issuedDate}
                onChange={(e) => {
                  const nextIssued = e.target.value;
                  setIssuedDate(nextIssued);
                  setDueDate(addDays(nextIssued, 30));
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
      <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-ink-900">{invoice.invoice_number}</td>
      <td className="py-2.5 pr-3 text-ink-700">{invoice.orderLabel}</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-900">{invoice.amount} €</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{invoice.issued_date}</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{invoice.due_date ?? "—"}</td>
      <td className="whitespace-nowrap py-2.5 pr-3">
        <form action={toggleInvoiceFlag.bind(null, invoice.id, "sent", !invoice.sent)}>
          <button type="submit" className={invoice.sent ? "badge-success" : "badge-neutral"}>
            {invoice.sent ? "odoslaná ✓" : "odoslať"}
          </button>
        </form>
      </td>
      <td className="whitespace-nowrap py-2.5">
        <div className="flex flex-wrap gap-2">
          <form action={toggleInvoiceFlag.bind(null, invoice.id, "paid", !invoice.paid)}>
            <button type="submit" className={invoice.paid ? "badge-success" : "badge-neutral"}>
              {invoice.paid ? "uhradená ✓" : "uhradiť"}
            </button>
          </form>
          <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
            Upraviť
          </button>
          <button onClick={handleDelete} disabled={isPending} className="btn-danger btn-sm">
            Zmazať
          </button>
        </div>
      </td>
    </tr>
  );
}
