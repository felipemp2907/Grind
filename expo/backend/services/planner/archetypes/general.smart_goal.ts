import type { ArchetypeModule, NormalizedGoal, StreakHabit, TodayTaskTemplate } from '../types';

function streaks(_: NormalizedGoal): StreakHabit[] {
  return [
    { title: '30m Focus Block', desc: 'Single task, no distractions', load: 2, proof_mode: 'flex' },
    { title: 'Log Progress', desc: 'Short note + next step', load: 1, proof_mode: 'flex' },
    { title: 'Prepare Tomorrow', desc: 'Lay out materials', load: 1, proof_mode: 'flex' },
  ];
}

function weekly(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'mon-plan', title: 'Plan & backlog', desc: 'Define week big rocks', weekday: 1, proof_mode: 'flex', xp: { base: 20 } },
    { key: 'tue-do', title: 'Do (big rock)', desc: 'Ship progress', weekday: 2, proof_mode: 'flex', xp: { base: 30 } },
    { key: 'wed-support', title: 'Do (support)', desc: 'Enable main goal', weekday: 3, proof_mode: 'flex', xp: { base: 25 } },
    { key: 'thu-review', title: 'Review & adjust', desc: 'Course‑correct', weekday: 4, proof_mode: 'flex', xp: { base: 20 } },
    { key: 'fri-deliver', title: 'Deliverable/Share', desc: 'Publish/send', weekday: 5, proof_mode: 'flex', xp: { base: 30 } },
    { key: 'sat-skill', title: 'Skill/Research', desc: 'Learn enabler', weekday: 6, proof_mode: 'flex', xp: { base: 20 } },
    { key: 'sun-review', title: 'Weekly review', desc: 'Reflect + plan', weekday: 0, proof_mode: 'flex', xp: { base: 15 } },
  ];
}

function support(_: NormalizedGoal): TodayTaskTemplate[] {
  return [
    { key: 'setup', title: 'Tooling setup', desc: 'Accounts/templates', weekday: 1, proof_mode: 'flex', xp: { base: 10 } },
    { key: 'sync', title: 'Calendar sync', desc: 'Block times', weekday: 0, proof_mode: 'flex', xp: { base: 10 } },
  ];
}

const mod: ArchetypeModule = { getStreaks: streaks, getWeekly: weekly, getSupport: support };
export default mod;
