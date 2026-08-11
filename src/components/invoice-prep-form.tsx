"use client";

import { useMemo, useState } from "react";
import { todayISO, addMonthsISO } from "@/lib/dates";

type Order = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  price: number | null;
  siteName: string;
};

type Contact = { id: string; name: string; email: string };

function formatDateShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
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
  const today = todayISO();
  const defaultDueDate = addMonthsISO(today, 1);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dueDates, setDueDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(orders.map((o) => [o.id, defaultDueDate]))
  );
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  const selectedOrders = orders
    .filter((o) => selected[o.id] && dueDates[o.id])
    .map((o) => ({ ...o, dueDate: dueDates[o.id] }));

  const selectedContacts = contacts.filter((c) => selectedContactIds.includes(c.id));

  const mailtoHref = useMemo(() => {
    if (!selectedOrders.length || !selectedContacts.length) return null;

    const to = selectedContacts.map((c) => c.email).join(",");
    const subject = "Fakturky podklady";

    const greetingName = selectedContacts.length === 1 ? selectedContacts[0].name : null;
    const todayShort = formatDateShort(today);

    const lines = selectedOrders.map(
      (o) =>
        `Zmluva č. ${o.order_number ?? "-"}   Vystavenie: ${todayShort}   Splatnosť: ${formatDateShort(o.dueDate)}   Cena: ${o.price ?? 0} €`
    );

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
  }, [selectedOrders, selectedContacts, adminName, today]);

  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="pb-2 pr-3"></th>
              <th className="pb-2 pr-3">Zmluva č.</th>
              <th className="pb-2 pr-3">Zákazník</th>
              <th className="pb-2 pr-3">Cena</th>
              <th className="pb-2">Dátum splatnosti</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-ink-100 align-top text-sm">
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
                <td className="whitespace-nowrap py-2.5 pr-3 text-ink-900">{o.price != null ? `${o.price} €` : ""}</td>
                <td className="py-2.5">
                  <input
                    type="date"
                    value={dueDates[o.id] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDueDates((d) => ({ ...d, [o.id]: v }));
                      if (v) setSelected((s) => ({ ...s, [o.id]: true }));
                    }}
                    className="w-[150px] rounded-lg border border-ink-200 px-1.5 py-1 text-xs"
                  />
                </td>
              </tr>
            ))}
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
              <a href={mailtoHref} className="btn-primary">
                Pripraviť email ({selectedOrders.length})
              </a>
            ) : (
              <button type="button" disabled className="btn-primary opacity-50">
                Pripraviť email
              </button>
            )}
            {!selectedOrders.length && (
              <p className="mt-2 text-xs text-ink-400">
                Vyber aspoň jednu objednávku a nastav jej dátum splatnosti.
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
