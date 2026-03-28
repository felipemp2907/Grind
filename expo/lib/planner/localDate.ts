export function startOfDayLocal(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
export function endOfDayLocal(d: Date)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
export function addDaysLocal(base: Date, days: number) { const d = new Date(base); d.setDate(d.getDate()+days); return d; }
export function toLocalYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
export function eachDayLocalInclusive(startISO: string, endISO: string) {
  const s = startOfDayLocal(new Date(startISO));
  const e = endOfDayLocal(new Date(endISO));
  const out: string[] = [];
  for (let d = new Date(s); d.getTime() <= e.getTime(); d.setDate(d.getDate()+1)) out.push(toLocalYYYYMMDD(d));
  return out;
}
