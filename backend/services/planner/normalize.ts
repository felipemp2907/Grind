import type { NormalizeInput, NormalizedGoal } from './types';

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function normalizeGoal(input: NormalizeInput): NormalizedGoal {
  const tz = input.tzOffsetMinutes ?? 0;
  const now = new Date();
  const start = new Date(now.getTime() - tz * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  const startDate = toYMD(new Date(start.getTime() + tz * 60 * 1000));

  let deadline: Date;
  if (input.deadlineISO) {
    const d = new Date(input.deadlineISO);
    deadline = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } else {
    deadline = new Date(start);
    deadline.setDate(deadline.getDate() + 90);
  }
  const deadlineYMD = toYMD(deadline);

  const days = Math.max(1, Math.ceil((deadline.getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1);

  const constraints = {
    daysAvailable: input.constraints?.daysAvailable ?? [0, 1, 2, 3, 4, 5, 6],
    timeBudgetPerDay: input.constraints?.timeBudgetPerDay ?? 90,
    injuries: input.constraints?.injuries ?? [],
    resources: input.constraints?.resources ?? [],
  };

  const experience = input.experience_level ?? 'beginner';

  return {
    title: input.title,
    description: input.description,
    startDate,
    deadline: deadlineYMD,
    days,
    tzOffsetMinutes: tz,
    constraints,
    experience,
  };
}
