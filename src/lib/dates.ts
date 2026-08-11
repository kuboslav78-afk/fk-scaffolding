/**
 * Dátumová aritmetika nad ISO reťazcami (YYYY-MM-DD) bez konverzie cez časové pásmo.
 *
 * `new Date(iso + "T00:00:00")` sa parsuje ako LOKÁLNY čas, ale `.toISOString()` vracia UTC —
 * v kladnom UTC offsete (napr. Bratislava, UTC+2 v lete) to posúva výsledný dátum o deň dozadu.
 * Preto tu vždy počítame v UTC zložkách a formátujeme priamo z čísel, nikdy cez toISOString
 * po lokálnej manipulácii.
 */

function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function formatISODate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function todayISO(): string {
  const now = new Date();
  return formatISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addDaysISO(iso: string, days: number): string {
  const { y, m, d } = parseISODate(iso);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addMonthsISO(iso: string, months: number): string {
  const { y, m, d } = parseISODate(iso);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);
  return formatISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

const SK_MONTHS = [
  "január",
  "február",
  "marec",
  "apríl",
  "máj",
  "jún",
  "júl",
  "august",
  "september",
  "október",
  "november",
  "december",
];

export function formatDateSK(iso: string): string {
  const { y, m, d } = parseISODate(iso);
  return `${d}. ${SK_MONTHS[m - 1]} ${y}`;
}
