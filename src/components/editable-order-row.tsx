"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateOrder,
  markPeterInvoiceIssued,
  unmarkPeterInvoiceIssued,
} from "@/app/(app)/admin/orders/actions";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { todayISO, formatDateSK } from "@/lib/dates";
import { computeInvoiceAmount } from "@/lib/order-amount";

const WORK_TYPE_LABELS: Record<string, string> = {
  montaz: "Montáž",
  demontaz: "Demontáž",
  hodiny: "Hodinovka",
};

const TABLE_COLS = 6;

type Site = { id: string; name: string };

type Order = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  work_type: string | null;
  order_date: string;
  display_month: string;
  start_date: string | null;
  handover_date: string | null;
  price: number | null;
  contribution_amount: number | null;
  hours: number | null;
  hourly_rate: number | null;
  peter_invoice_issued: boolean;
  peter_invoice_date: string | null;
  full_invoice: boolean;
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
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [peterDate, setPeterDate] = useState(todayISO());

  const myInvoiceAmount = computeInvoiceAmount(order);

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
              <input type="month" name="display_month" defaultValue={order.display_month} required className="input" />
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
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" name="full_invoice" value="true" defaultChecked={order.full_invoice} />
              Fakturovať 100% (bez 20% zrážky pre Petra)
            </label>
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
    <tr
      onClick={() => router.push(`/admin/orders/${order.id}`)}
      className="cursor-pointer border-b border-ink-100 text-sm hover:bg-ink-50"
    >
      <td className="whitespace-nowrap py-2.5 pr-2">
        <span className="inline-flex items-center rounded-md bg-yellow-400/20 px-1.5 py-0.5 font-semibold text-yellow-300">
          {order.order_number ?? "—"}
        </span>
        {order.customer_name && (
          <span className="ml-1.5 text-xs text-ink-400">{order.customer_name.split(" ")[0]}</span>
        )}
      </td>
      <td className="truncate overflow-hidden py-2.5 pr-2 text-ink-700">{order.siteName}</td>
      <td className="whitespace-nowrap py-2.5 pr-2 text-ink-500">
        {order.handover_date ? formatDateSK(order.handover_date) : "—"}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-2">
        {myInvoiceAmount != null ? (
          <span className="inline-flex items-center rounded-md bg-sky-400/20 px-1.5 py-0.5 font-semibold text-sky-300">
            {myInvoiceAmount.toFixed(2)} €
          </span>
        ) : (
          <span className="text-ink-900">—</span>
        )}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-2" onClick={(e) => e.stopPropagation()}>
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
              className="w-[108px] rounded-lg border border-ink-200 px-1 py-1 text-xs"
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
      <td className="whitespace-nowrap py-2.5" onClick={(e) => e.stopPropagation()}>
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
