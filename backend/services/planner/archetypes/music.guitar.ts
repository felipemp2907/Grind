import type { ArchetypeModule, NormalizedGoal, StreakHabit, TodayTaskTemplate } from '../types';

function streaks(_: NormalizedGoal): StreakHabit[] {
  return [
    { title: 'Technique 15m', desc: 'Metronome drills', load: 1, proof_mode: 'flex' },
    { title: 'Repertoire 20m', desc: 'Song practice', load: 1, proof_mode: 'flex' },
    { title: 'Ear training 5m', desc: 'Intervals/chords', load: 1, proof_mode: 'flex' },
    { title: 'Journal note', desc: 'What improved?', load: 1, proof_mode: 'flex' },
  ];
}

function weekly(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'mon-rhythm', title: 'Chords/Rhythm', desc: 'Strum patterns', weekday: 1, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'tue-scales', title: 'Scales & picking', desc: 'Alt picking', weekday: 2, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'wed-songA', title: 'Song section A', desc: 'Bars X–Y', weekday: 3, proof_mode: 'realtime', xp: { base: 30 } },
    { key: 'thu-songB', title: 'Song section B', desc: 'Bars Y–Z', weekday: 4, proof_mode: 'realtime', xp: { base: 30 } },
    { key: 'fri-record', title: 'Recording/Feedback', desc: 'Record + review', weekday: 5, proof_mode: 'realtime', xp: { base: 35 } },
    { key: 'sat-improv', title: 'Improvisation', desc: 'Jam + ideas', weekday: 6, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'sun-recap', title: 'Recap & plan', desc: 'Next week plan', weekday: 0, proof_mode: 'flex', xp: { base: 15 } },
  ];
}

function support(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'strings', title: 'String change', desc: 'Swap + tune', weekday: 6, proof_mode: 'flex', xp: { base: 10 } },
    { key: 'backing', title: 'Backing track prep', desc: 'Find BPM/keys', weekday: 3, proof_mode: 'flex', xp: { base: 10 } },
    { key: 'teacher', title: 'Teacher session', desc: 'Book lesson', weekday: 2, proof_mode: 'realtime', xp: { base: 20 } },
  ];
}

const mod: ArchetypeModule = { getStreaks: streaks, getWeekly: weekly, getSupport: support };
export default mod;
