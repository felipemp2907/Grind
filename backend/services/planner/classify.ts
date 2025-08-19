import type { ArchetypeKey, NormalizeInput } from './types';

const rules: Array<{ re: RegExp; key: ArchetypeKey }> = [
  { re: /(muscle|hypertrophy|bulk|weight|gym|strength)/i, key: 'fitness.muscle_gain' },
  { re: /(exam|ib|grade|score|test|sat|gcse|study)/i, key: 'study.exam' },
  { re: /(language|spanish|english|french|vocab|grammar|fluency)/i, key: 'language.learning' },
  { re: /(guitar|piano|music|practice|song|chords|scales)/i, key: 'music.guitar' },
  { re: /(run|marathon|half marathon|5k|10k|pace)/i, key: 'endurance.marathon' },
];

export function classifyArchetype(input: NormalizeInput): ArchetypeKey {
  const hay = `${input.title} ${input.description} ${input.category ?? ''}`;
  for (const r of rules) {
    if (r.re.test(hay)) return r.key;
  }
  return 'general.smart_goal';
}
