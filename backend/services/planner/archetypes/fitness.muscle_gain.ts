import type { ArchetypeModule, NormalizedGoal, StreakHabit, TodayTaskTemplate } from '../types';

function streaks(_: NormalizedGoal): StreakHabit[] {
  return [
    { title: 'Daily Protein', desc: '≥1.6 g/kg bodyweight', load: 1, proof_mode: 'flex' },
    { title: 'Sleep 7–9h', desc: 'Lights out on time', load: 1, proof_mode: 'flex' },
    { title: 'Mobility 10m', desc: 'Short mobility routine', load: 1, proof_mode: 'timer' as any },
    { title: 'Hydration 2–3L', desc: 'Track water intake', load: 1, proof_mode: 'flex' },
  ];
}

function weekly(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'mon-push', title: 'Push workout', desc: 'Chest/Shoulder/Triceps', weekday: 1, proof_mode: 'realtime', xp: { base: 40, peak: 60 } },
    { key: 'tue-legs', title: 'Legs workout', desc: 'Quads/Glutes', weekday: 2, proof_mode: 'realtime', xp: { base: 40, peak: 60 } },
    { key: 'wed-pull', title: 'Pull workout', desc: 'Back/Biceps', weekday: 3, proof_mode: 'realtime', xp: { base: 40, peak: 60 } },
    { key: 'thu-active', title: 'Active recovery', desc: 'Walk + Stretch', weekday: 4, proof_mode: 'flex', xp: { base: 20 } },
    { key: 'fri-posterior', title: 'Posterior chain', desc: 'Hinge/Row focus', weekday: 5, proof_mode: 'realtime', xp: { base: 40, peak: 60 } },
    { key: 'sat-upper', title: 'Upper focus', desc: 'Arms/Delts', weekday: 6, proof_mode: 'realtime', xp: { base: 35 } },
    { key: 'sun-review', title: 'Weekly review & plan', desc: 'Metrics + plan next week', weekday: 0, proof_mode: 'flex', xp: { base: 15 } },
  ];
}

function support(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'meal-prep', title: 'Meal prep', desc: 'Cook and portion proteins', weekday: 0, proof_mode: 'flex', xp: { base: 20 } },
    { key: 'grocery', title: 'Grocery run', desc: 'Protein sources + greens', weekday: 6, proof_mode: 'flex', xp: { base: 10 } },
    { key: 'checkin', title: 'Weigh‑in & photos', desc: 'Track progress', weekday: 0, proof_mode: 'realtime', xp: { base: 10 } },
  ];
}

const mod: ArchetypeModule = { getStreaks: streaks, getWeekly: weekly, getSupport: support };
export default mod;
