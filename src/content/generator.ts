import type { Rng } from '../engine/rng';
import type { ItemType, LessonStep, Level, OracleId, QuestionDraft, Say, Visual } from '../engine/types';

// The contract every skill generator meets (plan section 5).
export interface SkillGenerator {
  skillId: string;
  maxLevel: Level;
  itemTypes: ItemType[];
  lists: string[]; // data files it reads, such as ['countables']
  pool?: Partial<Record<Level, number>>; // how many different questions a level has, when fewer than 8
  generate(level: Level, rng: Rng): QuestionDraft; // pure, no Date, no Math.random
  exampleSeed: number; // the fixed seed behind example()
  example(): QuestionDraft; // used by Learn with an example
  lesson(): LessonStep[]; // four beats, plan section 8
  oracle: OracleId; // independent answer check
}

// A numeral a child can tap. It says its own number.
export function numeral(value: number, size: 'm' | 'l' | 'xl' = 'xl'): Visual {
  return { kind: 'text', value: String(value), size, speak: [{ number: value }] };
}

// "1, 2, 3" as spoken number parts.
export function countAloud(to: number): Say {
  return Array.from({ length: to }, (_, i) => ({ number: i + 1 }));
}

export function listText(values: readonly number[]): string {
  return values.join(', ');
}
