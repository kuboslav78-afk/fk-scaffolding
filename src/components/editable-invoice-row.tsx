"use client";

import { useState, useTransition } from "react";
import {
  updateInvoice,
  deleteInvoice,
  toggleInvoiceFlag,
  sendInvoiceToPeter,
} from "@/app/(app)/admin/orders/actions";
import { addMonthsISO } from "@/lib/dates";

const TABLE_COLS = 7;

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  issued_date: string;
  due_date: string | null;
  sent: boolean;
  paid: boolean;
  hasPdf: boolean;
  orderLabel: string;
};

export function EditableInvoiceRow({
  invoice,
  peterEmail,
}: {
  invoice: Invoice;
  peterEmail: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [issuedDate, setIssuedDate] = useState(invoice.issued_date);
  const [dueDate, setDueDate] = useState(invoice.due_date ?? addMonthsISO(invoice.issued_date, 1));
  const [sendError, setSendError] = useState<string | null>(null);

  function handleSendPdf() {
    setSendError(null);
    startTransition(async () => {
      const res = await sendInvoiceToPeter(invoice.id);
      if (!res.ok) setSendError(res.error);
    });
  }

  const mailtoHref = peterEmail
    ? `mailto:${encodeURIComponent(peterEmail)}?subject=${encodeURIComponent(
        `Faktúra ${invoice.invoice_number}`
      )}&body=${encodeURIComponent(
        [
          `Faktúra č. ${invoice.invoice_number}`,
          `Objednávka: ${invoice.orderLabel}`,
          `Suma: ${invoice.amount} €`,
          `Vystavená: ${invoice.issued_date}`,
          invoice.due_date ? `Splatnosť: ${invoice.due_date}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      )}`
    : null;

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
      <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-ink-900">{invoice.invoice_number}</td>
      <td className="py-2.5 pr-3 text-ink-700">{invoice.orderLabel}</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-900">{invoice.amount} €</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{invoice.issued_date}</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{invoice.due_date ?? "—"}</td>
      <td className="whitespace-nowrap py-2.5 pr-3">
        {invoice.sent ? (
          <form action={toggleInvoiceFlag.bind(null, invoice.id, "sent", false)}>
            <button type="submit" className="badge-success">
              odoslaná ✓
            </button>
          </form>
        ) : invoice.hasPdf ? (
          <button type="button" onClick={handleSendPdf} disabled={isPending} className="badge-neutral">
            {isPending ? "odosielam…" : "Poslať Petrovi (PDF)"}
          </button>
        ) : mailtoHref ? (
          <a
            href={mailtoHref}
            onClick={() => startTransition(() => toggleInvoiceFlag(invoice.id, "sent", true))}
            className="badge-neutral"
          >
            Poslať Petrovi
          </a>
        ) : (
          <form action={toggleInvoiceFlag.bind(null, invoice.id, "sent", true)}>
            <button
              type="submit"
              className="badge-neutral"
              title="Nastav kontakt „Peter“ v Podkladoch pre FA"
            >
              odoslať
            </button>
          </form>
        )}
        {sendError && <p className="mt-1 max-w-[180px] text-[11px] text-red-400">{sendError}</p>}
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
