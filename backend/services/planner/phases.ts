import type { NormalizedGoal, PhaseSpan, PhaseName } from './types';

function dateAdd(d: string, days: number): string {
  const [y, m, dd] = d.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, dd);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = `${dt.getMonth() + 1}`.padStart(2, '0');
  const dd2 = `${dt.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd2}`;
}

export function designPhases(goal: NormalizedGoal): PhaseSpan[] {
  const total = goal.days;
  if (total < 28) {
    const f = Math.round(total * 0.4);
    const b = Math.round(total * 0.4);
    const p = total - f - b;
    const spans: PhaseSpan[] = [];
    let cursor = goal.startDate;
    const push = (name: PhaseName, len: number) => {
      const start = cursor;
      const end = dateAdd(cursor, Math.max(1, len) - 1);
      spans.push({ name, start, end });
      cursor = dateAdd(end, 1);
    };
    push('foundation', f);
    push('build', b);
    push('peak', p);
    return spans;
  }
  const f = Math.round(total * 0.25);
  const b = Math.round(total * 0.5);
  const p = Math.round(total * 0.2);
  const d = total - f - b - p;
  const spans: PhaseSpan[] = [];
  let cursor = goal.startDate;
  const push = (name: PhaseName, len: number) => {
    const start = cursor;
    const end = dateAdd(cursor, Math.max(1, len) - 1);
    spans.push({ name, start, end });
    cursor = dateAdd(end, 1);
  };
  push('foundation', f);
  push('build', b);
  push('peak', p);
  push('deload', d);
  return spans;
}

export function phaseForDate(phases: PhaseSpan[], ymd: string): PhaseName {
  for (const ph of phases) {
    if (ymd >= ph.start && ymd <= ph.end) return ph.name;
  }
  return phases[phases.length - 1]?.name ?? 'build';
}
