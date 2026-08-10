"use client";

import { useState, useTransition } from "react";
import {
  updateOrder,
  markPeterInvoiceIssued,
  unmarkPeterInvoiceIssued,
} from "@/app/(app)/admin/orders/actions";
import { DeleteOrderButton } from "@/components/delete-order-button";

const WORK_TYPE_LABELS: Record<string, string> = {
  montaz: "Montáž",
  demontaz: "Demontáž",
  hodiny: "Hodinovka",
};

const TABLE_COLS = 8;

type Site = { id: string; name: string };

type Order = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  work_type: string | null;
  order_date: string;
  start_date: string | null;
  handover_date: string | null;
  price: number | null;
  contribution_amount: number | null;
  hours: number | null;
  hourly_rate: number | null;
  peter_invoice_issued: boolean;
  peter_invoice_date: string | null;
  note: string | null;
  site_id: string | null;
  siteName: string;
};

export function EditableOrderRow({
  order,
  sites,
  pdfUrl,
}: {
  order: Order;
  sites: Site[];
  pdfUrl: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [peterDate, setPeterDate] = useState(new Date().toISOString().slice(0, 10));

  if (editing) {
    return (
      <tr className="border-b border-ink-100">
        <td colSpan={TABLE_COLS} className="p-3">
          <form
            action={(formData) => {
              startTransition(async () => {
                await updateOrder(order.id, formData);
                setEditing(false);
              });
            }}
            className="space-y-2"
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <input type="text" name="order_number" defaultValue={order.order_number ?? ""} placeholder="Číslo objednávky" className="input" />
              <select name="work_type" defaultValue={order.work_type ?? ""} className="input">
                <option value="">Typ práce</option>
                <option value="montaz">Montáž</option>
                <option value="demontaz">Demontáž</option>
                <option value="hodiny">Hodinovka</option>
              </select>
              <input type="text" name="customer_name" defaultValue={order.customer_name ?? ""} placeholder="Zákazník" className="input" />
              <select name="site_id" defaultValue={order.site_id ?? ""} className="input">
                <option value="">Bez stavby</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              <input type="date" name="order_date" defaultValue={order.order_date} required className="input" />
              <input type="date" name="start_date" defaultValue={order.start_date ?? ""} className="input" />
              <input type="date" name="handover_date" defaultValue={order.handover_date ?? ""} className="input" />
              <input type="number" step="0.01" name="price" defaultValue={order.price ?? ""} placeholder="Cena (€)" className="input" />
              <input type="number" step="0.01" name="contribution_amount" defaultValue={order.contribution_amount ?? ""} placeholder="SUKA (€)" className="input" />
              {order.work_type === "hodiny" && (
                <input type="number" step="0.5" name="hours" defaultValue={order.hours ?? ""} placeholder="Hodiny" className="input" />
              )}
              {order.work_type === "hodiny" && (
                <input type="number" step="0.01" name="hourly_rate" defaultValue={order.hourly_rate ?? ""} placeholder="Sadzba (€/hod)" className="input" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <textarea name="description" defaultValue={""} placeholder="Popis práce" rows={2} className="input" />
              <textarea name="note" defaultValue={order.note ?? ""} placeholder="Poznámka" rows={2} className="input" />
            </div>
            <div>
              <label className="label">
                {pdfUrl ? "Nahradiť archivované PDF" : "Nahrať PDF k objednávke"}
              </label>
              <input type="file" name="pdf" accept="application/pdf" className="block w-full text-sm" />
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
      <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-ink-900">{order.order_number ?? "—"}</td>
      <td className="py-2.5 pr-3 text-ink-700">{order.customer_name ?? "bez zákazníka"}</td>
      <td className="py-2.5 pr-3 text-ink-500">{order.siteName}</td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">
        {order.work_type ? WORK_TYPE_LABELS[order.work_type] : "—"}
        {order.work_type === "hodiny" && order.hours != null ? ` · ${order.hours}h × ${order.hourly_rate}€` : ""}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">
        {order.start_date ? `${order.start_date} → ${order.handover_date ?? "?"}` : "—"}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-ink-900">
        {order.price != null ? `${order.price} €` : ""}
        {order.price != null && order.work_type !== "hodiny" && (
          <div className="text-xs text-ink-400">
            80%: {(order.price * 0.8).toFixed(2)} € · SUKA:{" "}
            {order.contribution_amount ?? (order.price * 0.1).toFixed(2)} €
          </div>
        )}
        {order.note && <div className="text-xs text-ink-400">{order.note}</div>}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3">
        {order.peter_invoice_issued ? (
          <button
            onClick={() => startTransition(() => unmarkPeterInvoiceIssued(order.id))}
            disabled={isPending}
            className="badge-success"
          >
            ✓ {order.peter_invoice_date ?? ""}
          </button>
        ) : (
          <span className="flex items-center gap-1">
            <input
              type="date"
              value={peterDate}
              onChange={(e) => setPeterDate(e.target.value)}
              className="w-[130px] rounded-lg border border-ink-200 px-1.5 py-1 text-xs"
            />
            <button
              onClick={() => startTransition(() => markPeterInvoiceIssued(order.id, peterDate))}
              disabled={isPending}
              className="badge-neutral"
            >
              označiť
            </button>
          </span>
        )}
      </td>
      <td className="whitespace-nowrap py-2.5">
        <div className="flex gap-2">
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
              PDF
            </a>
          )}
          <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">
            Upraviť
          </button>
          <DeleteOrderButton orderId={order.id} />
        </div>
      </td>
    </tr>
  );
}
