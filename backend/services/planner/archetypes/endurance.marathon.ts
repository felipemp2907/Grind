import type { ArchetypeModule, NormalizedGoal, StreakHabit, TodayTaskTemplate } from '../types';

function streaks(_: NormalizedGoal): StreakHabit[] {
  return [
    { title: 'Mobility 10m', desc: 'Hips/ankles', load: 1, proof_mode: 'flex' },
    { title: 'Hydration', desc: '2–3L per day', load: 1, proof_mode: 'flex' },
    { title: 'Sleep 7–9h', desc: 'Lights out window', load: 1, proof_mode: 'flex' },
    { title: 'Nutrition log', desc: 'Log meals', load: 1, proof_mode: 'flex' },
  ];
}

function weekly(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'mon-rest', title: 'Rest/Mobility', desc: 'Walk + stretch', weekday: 1, proof_mode: 'flex', xp: { base: 15 } },
    { key: 'tue-intervals', title: 'Intervals', desc: 'Track session', weekday: 2, proof_mode: 'realtime', xp: { base: 45, peak: 60 } },
    { key: 'wed-easy', title: 'Easy run', desc: 'Conversational pace', weekday: 3, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'thu-tempo', title: 'Tempo run', desc: 'Threshold pace', weekday: 4, proof_mode: 'realtime', xp: { base: 40, peak: 55 } },
    { key: 'fri-strength', title: 'Strength & mobility', desc: 'Core + legs', weekday: 5, proof_mode: 'flex', xp: { base: 30 } },
    { key: 'sat-easy', title: 'Easy run', desc: 'Aerobic base', weekday: 6, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'sun-long', title: 'Long run', desc: 'Build endurance', weekday: 0, proof_mode: 'realtime', xp: { base: 50, peak: 70 } },
  ];
}

function support(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'shoes', title: 'Shoe rotation check', desc: 'Foam wear check', weekday: 0, proof_mode: 'flex', xp: { base: 10 } },
    { key: 'routes', title: 'Route planning', desc: 'Map safe routes', weekday: 3, proof_mode: 'flex', xp: { base: 10 } },
    { key: 'race', title: 'Race registration', desc: 'Confirm logistics', weekday: 0, proof_mode: 'flex', xp: { base: 10 } },
  ];
}

const mod: ArchetypeModule = { getStreaks: streaks, getWeekly: weekly, getSupport: support };
export default mod;
