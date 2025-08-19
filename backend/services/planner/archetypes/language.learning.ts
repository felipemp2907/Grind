import type { ArchetypeModule, NormalizedGoal, StreakHabit, TodayTaskTemplate } from '../types';

function streaks(_: NormalizedGoal): StreakHabit[] {
  return [
    { title: '20 new words', desc: 'Add to deck', load: 1, proof_mode: 'flex' },
    { title: '15m listening', desc: 'Podcast/video', load: 1, proof_mode: 'flex' },
    { title: '10m speaking', desc: 'Shadowing/talk', load: 1, proof_mode: 'flex' },
    { title: 'Daily sentence', desc: '1–3 sentences', load: 1, proof_mode: 'flex' },
  ];
}

function weekly(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'mon-grammar', title: 'Grammar focus', desc: 'One pattern', weekday: 1, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'tue-convo', title: 'Conversation drill', desc: 'Role‑play/tutor', weekday: 2, proof_mode: 'realtime', xp: { base: 30 } },
    { key: 'wed-reading', title: 'Reading article', desc: 'Highlight vocab', weekday: 3, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'thu-listen', title: 'Listening comp', desc: 'Transcript check', weekday: 4, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'fri-vocab', title: 'Vocabulary test', desc: 'Self‑quiz', weekday: 5, proof_mode: 'realtime', xp: { base: 30 } },
    { key: 'sat-culture', title: 'Culture/media day', desc: 'Film/music', weekday: 6, proof_mode: 'flex', xp: { base: 20 } },
    { key: 'sun-review', title: 'Review + plan', desc: 'Plan next week', weekday: 0, proof_mode: 'flex', xp: { base: 15 } },
  ];
}

function support(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'deck', title: 'Deck maintenance', desc: 'Cull + tag', weekday: 0, proof_mode: 'flex', xp: { base: 10 } },
    { key: 'exchange', title: 'Language exchange', desc: 'Schedule chats', weekday: 3, proof_mode: 'flex', xp: { base: 10 } },
  ];
}

const mod: ArchetypeModule = { getStreaks: streaks, getWeekly: weekly, getSupport: support };
export default mod;
