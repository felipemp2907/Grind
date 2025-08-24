export function startOfDayLocal(d: Date) { 
  const x = new Date(d); 
  x.setHours(0,0,0,0); 
  return x; 
}

export function endOfDayLocal(d: Date) { 
  const x = new Date(d); 
  x.setHours(23,59,59,999); 
  return x; 
}

export function daysBetweenInclusive(a: Date, b: Date) {
  const A = startOfDayLocal(a).getTime();
  const B = endOfDayLocal(b).getTime();
  const diff = Math.round((B - A) / 86400000);
  return Math.max(0, diff);
}

export function eachDayISOInclusive(startISO: string, endISO: string) {
  const s = startOfDayLocal(new Date(startISO));
  const e = endOfDayLocal(new Date(endISO));
  const days = daysBetweenInclusive(s, e);
  const out: string[] = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(s); 
    d.setDate(s.getDate() + i);
    out.push(d.toISOString().slice(0,10));
  }
  return out;
}