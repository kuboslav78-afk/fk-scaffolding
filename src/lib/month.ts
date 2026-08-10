export const MONTH_NAMES = [
  "Január",
  "Február",
  "Marec",
  "Apríl",
  "Máj",
  "Jún",
  "Júl",
  "August",
  "September",
  "Október",
  "November",
  "December",
];

export function parseMonthParam(month: string | undefined): { year: number; monthIndex: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y, monthIndex: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export function monthParamString(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function monthRange(year: number, monthIndex: number) {
  const rangeStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(year, monthIndex + 1, 1);
  const rangeEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

  const prevMonthDate = new Date(year, monthIndex - 1, 1);
  const prevParam = monthParamString(prevMonthDate.getFullYear(), prevMonthDate.getMonth());
  const nextParam = monthParamString(nextMonthDate.getFullYear(), nextMonthDate.getMonth());

  return { rangeStart, rangeEnd, prevParam, nextParam };
}

/** Kalendárna mriežka mesiaca, týždne od pondelka; mimo mesiaca = null. */
export function calendarGrid(year: number, monthIndex: number): (string | null)[][] {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = (firstDay.getDay() + 6) % 7; // 0 = pondelok

  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
