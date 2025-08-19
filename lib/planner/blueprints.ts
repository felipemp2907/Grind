import { GoalInput, StreakTaskSpec, ScheduledTask, PlanResult } from './types';

function daysBetween(aISO: string, bISO: string) {
  const a = new Date(aISO), b = new Date(bISO);
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
}
function dayISO(startISO: string, offset: number) {
  const d = new Date(startISO);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0,10);
}
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

type Blueprint = (g: GoalInput) => PlanResult;

const makeLanguage: Blueprint = (g) => {
  const days = clamp(daysBetween(g.createdAtISO, g.deadlineISO), 14, 365*2);
  const streaks: StreakTaskSpec[] = [
    { title: 'Daily Vocabulary (20 cards)', description: 'Spaced repetition: add/review 20 cards.', xp: 20, proofRequired: true },
    { title: 'Listening Practice (10–20m)', description: 'Podcasts/YouTube comprehensible input.', xp: 15, proofRequired: true },
    { title: 'Speaking/Shadowing (5–10m)', description: 'Record yourself or do shadowing.', xp: 15, proofRequired: true },
  ];
  const schedule: ScheduledTask[] = [];
  const tracks = [
    { title: 'Grammar Lesson', desc: 'Study one grammar point. Summarize in notes.' },
    { title: 'Reading Session', desc: 'Read an article/graded reader. Note 10 new words.' },
    { title: 'Conversation Session', desc: '30m conversation or self-talk. Log topics.' },
  ];
  for (let d = 0; d <= days; d++) {
    if ([1,3,5].includes((d % 7))) {
      const t = tracks[(Math.floor(d/2)) % tracks.length];
      schedule.push({
        goalId: g.id,
        title: t.title,
        description: t.desc,
        xp: 30,
        dateISO: dayISO(g.createdAtISO, d),
        isStreak: false,
        proofRequired: true,
        tags: ['language']
      });
    }
  }
  return { streaks, schedule, notes: ['Language blueprint applied'] };
};

const makeMuscle: Blueprint = (g) => {
  const days = clamp(daysBetween(g.createdAtISO, g.deadlineISO), 28, 365);
  const streaks: StreakTaskSpec[] = [
    { title: 'Daily Protein Intake', description: '1.6–2.2 g/kg bodyweight. Log source.', xp: 25, proofRequired: true },
    { title: 'Sleep 7–9h / Mobility 10m', description: 'Recovery habit + short mobility.', xp: 15, proofRequired: true },
  ];
  const schedule: ScheduledTask[] = [];
  const weekly = [
    { title: 'Upper Body A', desc: 'Push & pull compounds + accessories.' },
    { title: 'Lower Body A', desc: 'Squat/hinge focus + posterior chain.' },
    { title: 'Upper Body B', desc: 'Alt compounds, higher reps.' },
    { title: 'Lower Body B', desc: 'Accessories + unilateral work.' },
  ];
  for (let d = 0; d <= days; d++) {
    if ([0,2,4,6].includes(d % 7)) {
      const w = weekly[(Math.floor(d/2)) % weekly.length];
      schedule.push({
        goalId: g.id,
        title: w.title,
        description: w.desc,
        xp: 40,
        dateISO: dayISO(g.createdAtISO, d),
        isStreak: false,
        proofRequired: true,
        tags: ['fitness']
      });
    }
  }
  return { streaks, schedule, notes: ['Muscle blueprint applied'] };
};

const makeExamStudy: Blueprint = (g) => {
  const days = clamp(daysBetween(g.createdAtISO, g.deadlineISO), 14, 365*2);
  const streaks: StreakTaskSpec[] = [
    { title: 'Daily Review (Pomodoro x2)', description: '2×25m active recall + spaced repetition.', xp: 25, proofRequired: true },
    { title: 'Question Bank (20m)', description: 'Do past questions; log weaknesses.', xp: 20, proofRequired: true },
  ];
  const schedule: ScheduledTask[] = [];
  for (let d = 0; d <= days; d++) {
    if ((d % 7) === 2) {
      schedule.push({ goalId: g.id, title: 'Deep Study Block (90m)', description: 'New content + summary sheet.', xp: 35, dateISO: dayISO(g.createdAtISO, d), isStreak: false, proofRequired: true, tags: ['exam']});
    }
    if ((d % 7) === 5) {
      schedule.push({ goalId: g.id, title: 'Weekly Mock / Past Paper', description: 'Full timed practice. Grade & review.', xp: 40, dateISO: dayISO(g.createdAtISO, d), isStreak: false, proofRequired: true, tags: ['exam']});
    }
  }
  return { streaks, schedule, notes: ['Exam blueprint applied'] };
};

const makeInstrument: Blueprint = (g) => {
  const days = clamp(daysBetween(g.createdAtISO, g.deadlineISO), 14, 365*2);
  const streaks: StreakTaskSpec[] = [
    { title: 'Technique Drills (15m)', description: 'Scales/arpeggios/etudes. Slow metronome.', xp: 20, proofRequired: true },
    { title: 'Repertoire (15m)', description: 'Work on 1–2 pieces, bars/phrases.', xp: 20, proofRequired: true },
  ];
  const schedule: ScheduledTask[] = [];
  for (let d = 0; d <= days; d++) {
    if ([1,4].includes(d % 7)) {
      schedule.push({ goalId: g.id, title: 'Theory & Ear (30m)', description: 'Intervals, chords, transcription.', xp: 30, dateISO: dayISO(g.createdAtISO, d), isStreak: false, proofRequired: true, tags: ['music'] });
    }
  }
  return { streaks, schedule, notes: ['Instrument blueprint applied'] };
};

const makeCoding: Blueprint = (g) => {
  const days = clamp(daysBetween(g.createdAtISO, g.deadlineISO), 14, 365*2);
  const streaks: StreakTaskSpec[] = [
    { title: 'Daily Coding (30m)', description: 'Implement/Refactor feature; commit daily.', xp: 25, proofRequired: true },
    { title: 'Notes/Flashcards (10m)', description: 'Summarize concept learned.', xp: 15, proofRequired: true },
  ];
  const schedule: ScheduledTask[] = [];
  for (let d = 0; d <= days; d++) {
    if ([2,5].includes(d % 7)) {
      schedule.push({ goalId: g.id, title: 'Project Milestone', description: 'Ship a small feature or module.', xp: 35, dateISO: dayISO(g.createdAtISO, d), isStreak: false, proofRequired: true, tags: ['coding'] });
    }
  }
  return { streaks, schedule, notes: ['Coding blueprint applied'] };
};

const makeMoneyOnline: Blueprint = (g) => {
  const days = clamp(daysBetween(g.createdAtISO, g.deadlineISO), 21, 365);
  const streaks: StreakTaskSpec[] = [
    { title: 'Daily Output (1 micro-asset)', description: 'Publish 1 concrete thing: post, listing, landing, cold DM.', xp: 30, proofRequired: true },
    { title: 'Metrics Log (5m)', description: 'Track impressions, clicks, leads, revenue.', xp: 10, proofRequired: true },
  ];
  const schedule: ScheduledTask[] = [];
  for (let d = 0; d <= days; d++) {
    const iso = dayISO(g.createdAtISO, d);
    if (d < 7) {
      schedule.push({ goalId: g.id, title: 'Niche & Offer Research', description: 'Validate 3 problems. Draft 1 irresistible offer.', xp: 40, dateISO: iso, isStreak: false, proofRequired: true, tags: ['biz'] });
    } else if (d < 14) {
      schedule.push({ goalId: g.id, title: 'Setup Channel', description: 'Pick 1 channel (shop, newsletter, SM). Ship MVP page.', xp: 40, dateISO: iso, isStreak: false, proofRequired: true, tags: ['biz'] });
    } else {
      if ([1,4].includes(d % 7)) {
        schedule.push({ goalId: g.id, title: 'Distribution Sprint', description: 'Outreach/ads/collabs. 10 reachouts minimum.', xp: 40, dateISO: iso, isStreak: false, proofRequired: true, tags: ['biz'] });
      }
      if ((d % 7) === 6) {
        schedule.push({ goalId: g.id, title: 'Weekly Optimization', description: 'Review metrics/KPIs. Tweak offer or creative.', xp: 35, dateISO: iso, isStreak: false, proofRequired: true, tags: ['biz'] });
      }
    }
  }
  return { streaks, schedule, notes: ['Business blueprint applied'] };
};

const makeGeneric: Blueprint = (g) => {
  const days = clamp(daysBetween(g.createdAtISO, g.deadlineISO), 7, 365);
  const streaks: StreakTaskSpec[] = [
    { title: 'Daily Progress (25–40m)', description: 'Small, verifiable action toward the goal.', xp: 25, proofRequired: true },
    { title: 'Journal (5m)', description: 'What moved the needle? What next?', xp: 10, proofRequired: false },
  ];
  const schedule: ScheduledTask[] = [];
  for (let d = 0; d <= days; d++) {
    if ((d % 7) === 3) {
      schedule.push({ goalId: g.id, title: 'Checkpoint', description: 'Assess progress, set next micro-milestone.', xp: 30, dateISO: dayISO(g.createdAtISO, d), isStreak: false, proofRequired: true, tags: ['generic'] });
    }
  }
  return { streaks, schedule, notes: ['Generic blueprint applied'] };
};

export function chooseBlueprint(g: GoalInput): PlanResult {
  const t = `${g.title} ${g.description ?? ''} ${g.category ?? ''}`.toLowerCase();
  if (/\b(spanish|language|french|english|german|japanese|mandarin|learn .*language)\b/.test(t)) return makeLanguage(g);
  if (/\b(muscle|hypertrophy|gain mass|build muscle|strength)\b/.test(t)) return makeMuscle(g);
  if (/\b(exam|sat|ib|gcse|enem|vestibular|test|study)\b/.test(t)) return makeExamStudy(g);
  if (/\b(guitar|piano|violin|instrument|singing)\b/.test(t)) return makeInstrument(g);
  if (/\b(code|coding|programming|dev|software|app|website)\b/.test(t)) return makeCoding(g);
  if (/\b(money|income|online business|dropship|ecom|affiliate|newsletter|youtube|tiktok|agency)\b/.test(t)) return makeMoneyOnline(g);
  return makeGeneric(g);
}
