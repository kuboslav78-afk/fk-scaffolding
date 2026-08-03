"use client";

import { useRef, useState, useTransition } from "react";
import { createOrder, parseOrderPdfAction } from "@/app/admin/orders/actions";

type Site = { id: string; name: string; project_number: string | null };

export function OrderForm({ sites }: { sites: Site[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);

  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [workType, setWorkType] = useState("");
  const [siteId, setSiteId] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState("");
  const [handoverDate, setHandoverDate] = useState("");
  const [price, setPrice] = useState("");
  const [contribution, setContribution] = useState("");

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    const formData = new FormData();
    formData.set("pdf", file);

    startTransition(async () => {
      const result = await parseOrderPdfAction(formData);
      if (result.error || !result.parsed) {
        setParseError(result.error ?? "Nepodarilo sa načítať údaje z PDF.");
        return;
      }

      const p = result.parsed;
      if (p.order_number) setOrderNumber(p.order_number);
      if (p.customer_name) setCustomerName(p.customer_name);
      if (p.work_type) setWorkType(p.work_type);
      if (p.order_date) setOrderDate(p.order_date);
      if (p.start_date) setStartDate(p.start_date);
      if (p.handover_date) setHandoverDate(p.handover_date);
      if (p.price != null) setPrice(String(p.price));
      if (p.price != null) setContribution((p.price * 0.1).toFixed(2));

      const matchedSite = p.project_number
        ? sites.find((s) => s.project_number === p.project_number)
        : undefined;

      if (matchedSite) {
        setSiteId(matchedSite.id);
        setNewSiteName("");
      } else {
        setSiteId("");
        setNewSiteName(p.site_description ?? "");
        setProjectNumber(p.project_number ?? "");
      }
    });
  }

  return (
    <form ref={formRef} action={createOrder} className="space-y-3">
      <div>
        <label className="text-xs text-neutral-500">Nahrať objednávku (PDF) — auto-vyplní polia</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handlePdfChange}
          className="block w-full text-sm"
        />
        {isPending && <p className="text-xs text-neutral-500">Načítavam z PDF…</p>}
        {parseError && <p className="text-xs text-red-600">{parseError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          name="order_number"
          placeholder="Číslo objednávky"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          name="work_type"
          value={workType}
          onChange={(e) => setWorkType(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Typ práce</option>
          <option value="montaz">Montáž</option>
          <option value="demontaz">Demontáž</option>
        </select>
      </div>

      <input
        type="text"
        name="customer_name"
        placeholder="Zákazník"
        required
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />

      {siteId === "" && !newSiteName ? (
        <select
          name="site_id"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Bez stavby</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      ) : newSiteName ? (
        <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-2">
          <p className="text-xs text-amber-900">
            V databáze sa nenašla zodpovedajúca stavba — vytvorí sa nová:
          </p>
          <input
            type="text"
            name="new_site_name"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
          <input type="hidden" name="project_number" value={projectNumber} />
          <button
            type="button"
            onClick={() => {
              setNewSiteName("");
              setSiteId("");
            }}
            className="text-xs text-neutral-500 underline"
          >
            radšej vybrať existujúcu stavbu
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            name="site_id"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Bez stavby</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-neutral-500">Dátum objednávky</label>
          <input
            type="date"
            name="order_date"
            required
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Začiatok</label>
          <input
            type="date"
            name="start_date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Odovzdanie</label>
          <input
            type="date"
            name="handover_date"
            value={handoverDate}
            onChange={(e) => setHandoverDate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-500">Cena objednávky (€)</label>
          <input
            type="number"
            step="0.01"
            name="price"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              const n = parseFloat(e.target.value);
              setContribution(Number.isFinite(n) ? (n * 0.1).toFixed(2) : "");
            }}
            className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Príspevok SUKA 10% (€)</label>
          <input
            type="number"
            step="0.01"
            name="contribution_amount"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
        </div>
      </div>

      {!!parseFloat(price) && (
        <p className="text-xs text-neutral-500">
          Moja faktúra (Peter si necháva 20%): {(parseFloat(price) * 0.8).toFixed(2)} € — vytvor
          ju nižšie po uložení objednávky
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="peter_invoice_issued" value="true" />
        Peter už vystavil svoju faktúru (splatnosti sedia)
      </label>

      <textarea
        name="description"
        placeholder="Popis práce (voliteľné)"
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />

      <textarea
        name="note"
        placeholder="Poznámka"
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />

      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Vytvoriť objednávku
      </button>
    </form>
  );
}
