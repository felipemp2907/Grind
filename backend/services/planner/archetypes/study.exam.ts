import type { ArchetypeModule, NormalizedGoal, StreakHabit, TodayTaskTemplate } from '../types';

function streaks(_: NormalizedGoal): StreakHabit[] {
  return [
    { title: 'Study Block 60–90m', desc: 'Deep work session', load: 2, proof_mode: 'flex' },
    { title: 'Spaced Reps (Anki)', desc: 'Daily review', load: 1, proof_mode: 'flex' },
    { title: 'Concept Summary', desc: 'Write concise notes', load: 1, proof_mode: 'flex' },
  ];
}

function weekly(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'mon-topicA', title: 'Topic A deep dive', desc: 'Outline + core problems', weekday: 1, proof_mode: 'flex', xp: { base: 35, peak: 45 } },
    { key: 'tue-practiceA', title: 'Practice Qs Set A', desc: 'Timed practice', weekday: 2, proof_mode: 'realtime', xp: { base: 35, peak: 45 } },
    { key: 'wed-topicB', title: 'Topic B deep dive', desc: 'Outline + key proofs', weekday: 3, proof_mode: 'flex', xp: { base: 35, peak: 45 } },
    { key: 'thu-mixed', title: 'Mixed review', desc: 'Weak topics focus', weekday: 4, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'fri-mock', title: 'Mock exam', desc: 'Simulated conditions', weekday: 5, proof_mode: 'realtime', xp: { base: 45, peak: 60 } },
    { key: 'sat-error', title: 'Error log & fixes', desc: 'Address top 3 gaps', weekday: 6, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'sun-plan', title: 'Weekly plan & rest', desc: 'Plan next week', weekday: 0, proof_mode: 'flex', xp: { base: 15 } },
  ];
}

function support(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'formula', title: 'Build formula sheet', desc: 'One‑pager reference', weekday: 3, proof_mode: 'flex', xp: { base: 15 } },
    { key: 'papers', title: 'Past papers download', desc: 'Organize sets', weekday: 1, proof_mode: 'flex', xp: { base: 10 } },
    { key: 'group', title: 'Group session', desc: 'Study circle', weekday: 6, proof_mode: 'realtime', xp: { base: 20 } },
  ];
}

const mod: ArchetypeModule = { getStreaks: streaks, getWeekly: weekly, getSupport: support };
export default mod;
