import { addDaysISO } from "./dates";

export const DAY_NAMES = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
export const DAY_NAMES_SHORT = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

function formatLocalISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getMonday(d: Date) {
  const date = toDateOnly(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function parseWeekParam(week: string | undefined) {
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    const [y, m, d] = week.split("-").map(Number);
    return getMonday(new Date(y, m - 1, d));
  }
  return getMonday(new Date());
}

export function weekParamString(monday: Date) {
  return formatLocalISO(monday);
}

export function weekDates(monday: Date) {
  const mondayISO = formatLocalISO(monday);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(mondayISO, i));
}

export function adjacentWeekParams(monday: Date) {
  const mondayISO = formatLocalISO(monday);
  return {
    prevParam: addDaysISO(mondayISO, -7),
    nextParam: addDaysISO(mondayISO, 7),
  };
}
