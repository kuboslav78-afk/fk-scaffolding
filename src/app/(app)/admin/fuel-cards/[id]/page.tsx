import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";
import { addFuelTransaction, deleteFuelTransaction, updateFuelCard, toggleFuelTransactionPrivate } from "../actions";
import { formatThousands } from "@/lib/format";

const SK_MONTHS = [
  "január", "február", "marec", "apríl", "máj", "jún",
  "júl", "august", "september", "október", "november", "december",
];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${SK_MONTHS[m - 1]} ${y}`;
}

export default async function FuelCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: card }, { data: transactions }] = await Promise.all([
    supabase.from("fuel_cards").select("id, card_number, holder_name, card_type, valid_until, active").eq("id", id).single(),
    supabase
      .from("fuel_transactions")
      .select("id, tx_date, place, purpose, is_private, gross_amount, net_amount")
      .eq("card_id", id)
      .order("tx_date", { ascending: false }),
  ]);

  if (!card) notFound();

  const total = (transactions ?? []).reduce((s, t) => s + (t.net_amount ?? 0), 0);
  const privateTotal = (transactions ?? [])
    .filter((t) => t.is_private)
    .reduce((s, t) => s + (t.net_amount ?? 0), 0);

  const monthGroups = new Map<string, typeof transactions>();
  for (const t of transactions ?? []) {
    const ym = t.tx_date.slice(0, 7);
    if (!monthGroups.has(ym)) monthGroups.set(ym, []);
    monthGroups.get(ym)!.push(t);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <Link href="/admin/fuel-cards" className="text-sm text-ink-500 hover:text-ink-900">
        ← Späť na palivové karty
      </Link>

      <div className="card space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label">Karta {card.card_number}</p>
            <h1 className="text-2xl font-semibold text-ink-900">{card.holder_name ?? "bez mena"}</h1>
          </div>
          <div className="text-right">
            <p className="label">Spolu bez DPH</p>
            <p className="text-3xl font-semibold text-sky-300">{formatThousands(total)} €</p>
            {privateTotal > 0 && (
              <p className="mt-1 text-xs text-amber-400">z toho súkromné: {formatThousands(privateTotal)} €</p>
            )}
          </div>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-ink-500 hover:text-ink-900">Upraviť kartu</summary>
          <form action={updateFuelCard.bind(null, card.id)} className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <input type="text" name="holder_name" defaultValue={card.holder_name ?? ""} placeholder="Meno držiteľa" className="input" />
            <input type="text" name="card_type" defaultValue={card.card_type ?? ""} placeholder="Typ karty" className="input" />
            <input type="text" name="valid_until" defaultValue={card.valid_until ?? ""} placeholder="Platnosť do (MM/RRRR)" className="input" />
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" name="active" value="true" defaultChecked={card.active} />
              Aktívna
            </label>
            <button type="submit" className="btn-secondary btn-sm col-span-2 md:col-span-4 justify-self-start">
              Uložiť
            </button>
          </form>
        </details>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-ink-900">Pridať tankovanie</h2>
        <form action={addFuelTransaction.bind(null, card.id)} className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <input type="date" name="tx_date" required className="input" />
          <input type="text" name="place" placeholder="Miesto tankovania" className="input md:col-span-2" />
          <input type="text" name="purpose" placeholder="Produkt (napr. Nafta)" className="input" />
          <input type="number" step="0.01" name="net_amount" placeholder="Suma bez DPH (€)" required className="input" />
          <input type="number" step="0.01" name="gross_amount" placeholder="Cena za tank. (€)" className="input" />
          <label className="flex items-center gap-2 text-sm text-ink-700 md:col-span-1">
            <input type="checkbox" name="is_private" value="true" />
            Súkromné
          </label>
          <button type="submit" className="btn-primary btn-sm col-span-2 md:col-span-1">
            Pridať
          </button>
        </form>
      </div>

      {[...monthGroups.entries()].map(([ym, rows]) => {
        const monthTotal = (rows ?? []).reduce((s, t) => s + (t.net_amount ?? 0), 0);
        return (
          <div key={ym} className="card overflow-x-auto p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-ink-900">{monthLabel(ym)}</h3>
              <span className="inline-flex items-center rounded-md bg-sky-400/20 px-1.5 py-0.5 font-semibold text-sky-300">
                {formatThousands(monthTotal)} €
              </span>
            </div>
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="pb-2 pr-3">Dátum</th>
                  <th className="pb-2 pr-3">Miesto</th>
                  <th className="pb-2 pr-3">Produkt</th>
                  <th className="pb-2 pr-3">Typ</th>
                  <th className="pb-2 pr-3">Cena</th>
                  <th className="pb-2 pr-3">Bez DPH</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((t) => (
                  <tr key={t.id} className="border-b border-ink-100 text-sm">
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-500">{t.tx_date}</td>
                    <td className="py-2 pr-3 text-ink-700">{t.place ?? "—"}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-500">{t.purpose ?? "—"}</td>
                    <td className="whitespace-nowrap py-2 pr-3">
                      <form action={toggleFuelTransactionPrivate.bind(null, card.id, t.id, !t.is_private)}>
                        <button type="submit" className={t.is_private ? "badge-warning" : "badge-neutral"}>
                          {t.is_private ? "Súkromné" : "Firemné"}
                        </button>
                      </form>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-500">
                      {t.gross_amount != null ? `${formatThousands(t.gross_amount)} €` : "—"}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-900">
                      {t.net_amount != null ? `${formatThousands(t.net_amount)} €` : "—"}
                    </td>
                    <td className="whitespace-nowrap py-2">
                      <form action={deleteFuelTransaction.bind(null, card.id, t.id)}>
                        <button type="submit" className="btn-ghost btn-sm text-red-400">
                          Zmazať
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {!transactions?.length && <p className="text-sm text-ink-400">Zatiaľ žiadne tankovania.</p>}
    </div>
  );
}
