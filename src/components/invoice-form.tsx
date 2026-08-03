"use client";

import { useState } from "react";
import { createInvoice } from "@/app/admin/orders/actions";

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
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
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
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          {basePrice != null && (
            <label className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
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
          <label className="text-xs text-neutral-500">Dátum vystavenia</label>
          <input
            type="date"
            name="issued_date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Splatnosť</label>
          <input
            type="date"
            name="due_date"
            className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Pridať faktúru
      </button>
    </form>
  );
}
