"use client";

import { useState } from "react";
import { createInvoice } from "@/app/(app)/admin/orders/actions";

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Order = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  price: number | null;
  work_type: string | null;
};

export function InvoiceForm({ orders }: { orders: Order[] }) {
  const [amount, setAmount] = useState("");
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [applyPeterCut, setApplyPeterCut] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [issuedDate, setIssuedDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(today, 30));

  function computeAmount(price: number | null, applyCut: boolean) {
    if (price == null) return "";
    return (applyCut ? price * 0.8 : price).toFixed(2);
  }

  function handleOrderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const order = orders.find((o) => o.id === e.target.value);
    const price = order?.price ?? null;
    const shouldApplyCut = order?.work_type !== "hodiny";
    setBasePrice(price);
    setApplyPeterCut(shouldApplyCut);
    setAmount(computeAmount(price, shouldApplyCut));
  }

  function handleCutToggle(checked: boolean) {
    setApplyPeterCut(checked);
    setAmount(computeAmount(basePrice, checked));
  }

  return (
    <form action={createInvoice} className="space-y-3">
      <select
        name="order_id"
        required
        defaultValue=""
        onChange={handleOrderChange}
        className="input"
      >
        <option value="" disabled>
          Vyber objednávku
        </option>
        {orders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.order_number ?? "—"} · {o.customer_name ?? "bez zákazníka"}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          name="invoice_number"
          placeholder="Číslo faktúry"
          required
          className="input"
        />
        <div>
          <input
            type="number"
            step="0.01"
            name="amount"
            placeholder="Suma (€)"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
          />
          {basePrice != null && (
            <label className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={applyPeterCut}
                onChange={(e) => handleCutToggle(e.target.checked)}
              />
              odpočítať 20 % (Peter)
            </label>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Dátum vystavenia</label>
          <input
            type="date"
            name="issued_date"
            required
            value={issuedDate}
            onChange={(e) => {
              const next = e.target.value;
              setIssuedDate(next);
              setDueDate(addDays(next, 30));
            }}
            className="input"
          />
        </div>
        <div>
          <label className="label">Splatnosť</label>
          <input
            type="date"
            name="due_date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input"
          />
        </div>
      </div>
      <button
        type="submit"
        className="btn-primary"
      >
        Pridať faktúru
      </button>
    </form>
  );
}
