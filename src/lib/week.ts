export const DAY_NAMES = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
export const DAY_NAMES_SHORT = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

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
    return getMonday(new Date(`${week}T00:00:00`));
  }
  return getMonday(new Date());
}

export function weekParamString(monday: Date) {
  return monday.toISOString().slice(0, 10);
}

export function weekDates(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function adjacentWeekParams(monday: Date) {
  const prev = new Date(monday);
  prev.setDate(prev.getDate() - 7);
  const next = new Date(monday);
  next.setDate(next.getDate() + 7);
  return { prevParam: weekParamString(prev), nextParam: weekParamString(next) };
}
