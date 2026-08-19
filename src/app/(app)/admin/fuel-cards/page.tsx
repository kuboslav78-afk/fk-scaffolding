import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/get-profile";

export default async function FuelCardsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: cards }, { data: transactions }] = await Promise.all([
    supabase.from("fuel_cards").select("id, card_number, holder_name, card_type, valid_until, active").order("card_number"),
    supabase.from("fuel_transactions").select("card_id, tx_date, net_amount"),
  ]);

  const thisMonth = new Date().toISOString().slice(0, 7);

  const statsByCard = new Map<string, { total: number; thisMonthTotal: number; count: number; lastDate: string | null }>();
  for (const t of transactions ?? []) {
    const s = statsByCard.get(t.card_id) ?? { total: 0, thisMonthTotal: 0, count: 0, lastDate: null };
    s.total += t.net_amount ?? 0;
    if (t.tx_date?.startsWith(thisMonth)) s.thisMonthTotal += t.net_amount ?? 0;
    s.count += 1;
    if (!s.lastDate || t.tx_date > s.lastDate) s.lastDate = t.tx_date;
    statsByCard.set(t.card_id, s);
  }

  const grandTotal = [...statsByCard.values()].reduce((sum, s) => sum + s.total, 0);
  const grandThisMonth = [...statsByCard.values()].reduce((sum, s) => sum + s.thisMonthTotal, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold text-ink-900">Palivové karty</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="label">Spolu (bez DPH)</p>
          <p className="text-2xl font-semibold text-ink-900">{grandTotal.toFixed(2)} €</p>
        </div>
        <div className="card p-5">
          <p className="label">Tento mesiac</p>
          <p className="text-2xl font-semibold text-ink-900">{grandThisMonth.toFixed(2)} €</p>
        </div>
        <div className="card p-5">
          <p className="label">Aktívnych kariet</p>
          <p className="text-2xl font-semibold text-ink-900">{cards?.filter((c) => c.active).length ?? 0}</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="pb-2 pr-3">Karta</th>
              <th className="pb-2 pr-3">Držiteľ</th>
              <th className="pb-2 pr-3">Typ</th>
              <th className="pb-2 pr-3">Platnosť do</th>
              <th className="pb-2 pr-3">Tento mesiac</th>
              <th className="pb-2 pr-3">Spolu</th>
              <th className="pb-2 pr-3">Posledné tankovanie</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {cards?.map((c) => {
              const s = statsByCard.get(c.id);
              return (
                <tr key={c.id} className={`border-b border-ink-100 text-sm ${c.active ? "" : "opacity-50"}`}>
                  <td className="whitespace-nowrap py-2.5 pr-3">
                    <span className="inline-flex items-center rounded-md bg-yellow-400/20 px-1.5 py-0.5 font-semibold text-yellow-300">
                      Karta {c.card_number}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-ink-900">{c.holder_name ?? "—"}</td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{c.card_type ?? "—"}</td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{c.valid_until ?? "—"}</td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-ink-700">
                    {s ? `${s.thisMonthTotal.toFixed(2)} €` : "0.00 €"}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3">
                    <span className="inline-flex items-center rounded-md bg-sky-400/20 px-1.5 py-0.5 font-semibold text-sky-300">
                      {s ? s.total.toFixed(2) : "0.00"} €
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-ink-500">{s?.lastDate ?? "—"}</td>
                  <td className="whitespace-nowrap py-2.5">
                    <Link href={`/admin/fuel-cards/${c.id}`} className="btn-ghost btn-sm">
                      Detail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!cards?.length && <p className="py-4 text-sm text-ink-400">Zatiaľ žiadne palivové karty.</p>}
      </div>
    </div>
  );
}
