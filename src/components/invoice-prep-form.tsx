"use client";

import { useMemo, useState, useTransition } from "react";
import { addMonthsISO } from "@/lib/dates";
import { markOrdersPrepSent } from "@/app/(app)/admin/orders/prep/actions";

type Order = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  invoiceAmount: number | null;
  issuedDate: string | null;
  siteName: string;
  prepSent: boolean;
};

type Contact = { id: string; name: string; email: string };

function formatDateShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function shortRef(orderNumber: string | null) {
  return orderNumber ? orderNumber.slice(-3) : "-";
}

function padCol(value: string, width: number) {
  return value.length >= width ? value + " " : value.padEnd(width, " ");
}

export function InvoicePrepForm({
  orders,
  contacts,
  adminName,
}: {
  orders: Order[];
  contacts: Contact[];
  adminName: string;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [issuedDates, setIssuedDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(orders.map((o) => [o.id, o.issuedDate ?? ""]))
  );
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [justSentIds, setJustSentIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const dueDates = Object.fromEntries(
    orders.map((o) => [o.id, issuedDates[o.id] ? addMonthsISO(issuedDates[o.id], 1) : ""])
  );

  const selectedOrders = orders
    .filter((o) => selected[o.id] && issuedDates[o.id])
    .map((o) => ({ ...o, issuedDate: issuedDates[o.id], dueDate: dueDates[o.id] }));

  const selectedContacts = contacts.filter((c) => selectedContactIds.includes(c.id));

  const mailtoHref = useMemo(() => {
    if (!selectedOrders.length || !selectedContacts.length) return null;

    const to = selectedContacts.map((c) => c.email).join(",");
    const subject = "Fakturky podklady";

    const greetingName = selectedContacts.length === 1 ? selectedContacts[0].name : null;

    const columns: { key: "ref" | "issued" | "due" | "price"; label: string }[] = [
      { key: "ref", label: "Zmluva č." },
      { key: "issued", label: "Vystavenie" },
      { key: "due", label: "Splatnosť" },
      { key: "price", label: "Cena" },
    ];

    const rows = selectedOrders.map((o) => ({
      ref: shortRef(o.order_number),
      issued: formatDateShort(o.issuedDate),
      due: formatDateShort(o.dueDate),
      price: `${(o.invoiceAmount ?? 0).toFixed(2)} €`,
    }));

    const widths = columns.map((c) => Math.max(c.label.length, ...rows.map((r) => r[c.key].length)) + 3);

    const headerLine = columns.map((c, i) => padCol(c.label, widths[i])).join("");
    const separatorLine = columns.map((_, i) => "-".repeat(widths[i] - 1)).join(" ");
    const lines = [headerLine, separatorLine, ...rows.map((r) => columns.map((c, i) => padCol(r[c.key], widths[i])).join(""))];

    const dueDateCounts = new Map<string, number>();
    selectedOrders.forEach((o) => dueDateCounts.set(o.dueDate, (dueDateCounts.get(o.dueDate) ?? 0) + 1));
    const groupNotes = [...dueDateCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([date]) => `Všetky splatnosti ${formatDateShort(date)} môžu ísť na jednu FA.`);

    const body = [
      greetingName ? `Ahoj ${greetingName},` : "Dobrý deň,",
      "",
      "posielam podklady na FA.",
      "",
      ...lines,
      "",
      ...groupNotes,
      groupNotes.length ? "" : null,
      "S pozdravom,",
      adminName,
    ]
      .filter((l) => l !== null)
      .join("\n");

    return `mailto:${encodeURIComponent(to).replace(/%2C/g, ",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [selectedOrders, selectedContacts, adminName]);

  function handleSent() {
    const ids = selectedOrders.map((o) => o.id);
    setJustSentIds((prev) => [...prev, ...ids]);
    startTransition(() => {
      markOrdersPrepSent(ids);
    });
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="pb-2 pr-3"></th>
              <th className="pb-2 pr-3">Zmluva č.</th>
              <th className="pb-2 pr-3">Zákazník</th>
              <th className="pb-2 pr-3">Moja faktúra</th>
              <th className="pb-2 pr-3">Dátum vystavenia</th>
              <th className="pb-2 pr-3">Splatnosť (+1 mesiac)</th>
              <th className="pb-2">Stav</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const sent = o.prepSent || justSentIds.includes(o.id);
              return (
                <tr
                  key={o.id}
                  className={
                    sent
                      ? "border-b border-ink-100 bg-emerald-500/10 align-top text-sm"
                      : "border-b border-ink-100 align-top text-sm"
                  }
                >
                  <td className="py-2.5 pr-3">
                    <input
                      type="checkbox"
                      checked={!!selected[o.id]}
                      onChange={(e) => setSelected((s) => ({ ...s, [o.id]: e.target.checked }))}
                      className="h-4 w-4 rounded border-ink-200 accent-brand-500"
                    />
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 font-medium text-ink-900">{o.order_number ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-ink-700">{o.customer_name ?? "bez zákazníka"}</td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-ink-900">
                    {o.invoiceAmount != null ? `${o.invoiceAmount.toFixed(2)} €` : ""}
                  </td>
                  <td className="py-2.5 pr-3">
                    <input
                      type="date"
                      value={issuedDates[o.id] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setIssuedDates((d) => ({ ...d, [o.id]: v }));
                        if (v) setSelected((s) => ({ ...s, [o.id]: true }));
                      }}
                      className="w-[150px] rounded-lg border border-ink-200 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="py-2.5 pr-3 text-ink-500">{dueDates[o.id] ? formatDateShort(dueDates[o.id]) : "—"}</td>
                  <td className="py-2.5">
                    {sent && <span className="badge-success">✓ Odoslané</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!orders.length && (
          <p className="py-4 text-sm text-ink-400">Žiadne objednávky bez faktúry — všetko je vybavené.</p>
        )}
      </div>

      {!!orders.length && (
        <div className="card space-y-3 p-5">
          <h2 className="font-semibold text-ink-900">Komu poslať</h2>
          {!contacts.length && (
            <p className="text-sm text-ink-400">
              Zatiaľ žiadne kontakty — pridaj účtovníčku nižšie.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={selectedContactIds.includes(c.id)}
                  onChange={(e) =>
                    setSelectedContactIds((ids) =>
                      e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)
                    )
                  }
                  className="h-4 w-4 rounded border-ink-200 accent-brand-500"
                />
                {c.name} <span className="text-ink-400">({c.email})</span>
              </label>
            ))}
          </div>

          <div className="pt-2">
            {mailtoHref ? (
              <a href={mailtoHref} onClick={handleSent} className="btn-primary">
                Pripraviť email ({selectedOrders.length})
              </a>
            ) : (
              <button type="button" disabled className="btn-primary opacity-50">
                Pripraviť email
              </button>
            )}
            {!selectedOrders.length && (
              <p className="mt-2 text-xs text-ink-400">
                Vyber aspoň jednu objednávku a nastav jej dátum vystavenia.
              </p>
            )}
            {!!selectedOrders.length && !selectedContacts.length && (
              <p className="mt-2 text-xs text-ink-400">Vyber aspoň jedného príjemcu.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
