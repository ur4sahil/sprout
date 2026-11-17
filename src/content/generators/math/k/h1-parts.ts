import { makeRng } from '../../../../engine/rng';
import type { Rng } from '../../../../engine/rng';
import type { ItemType, LessonStep, Level, OracleId, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';

// Pieces the skills of plan section 15, wave H1 (Math kindergarten and grade 1) share.

export type Explanation = { speak: Say; steps: string[]; visual: Visual };

// Words with numbers in them, said with each number as a number.
export function spoken(words: string): Say {
  return words
    .split(/(\d+)/)
    .filter((part) => part.trim().length > 0)
    .map((part) => (/^\d+$/.test(part) ? { number: Number(part) } : part));
}

// "3 + 2 = 5" said aloud, token by token. Kindergarten says "take away" for the minus sign.
export function sayMath(expr: string, minusWord = 'minus'): Say {
  return expr.split(' ').map((token) => {
    if (/^\d+$/.test(token)) return { number: Number(token) };
    if (token === '+') return 'plus';
    if (token === '-' || token === '−') return minusWord;
    if (token === '=') return 'equals';
    if (token === '?') return 'what';
    return token;
  });
}

// A sum written for the screen: a true minus sign in place of the hyphen.
export const shown = (expr: string): string => expr.replace(/ - /g, ' − ');

export const mathText = (expr: string, minusWord = 'minus', size: 'm' | 'l' = 'l'): Visual => ({ kind: 'text', value: shown(expr), size, speak: sayMath(expr, minusWord) });
export const wordText = (value: string, size: 'm' | 'l' = 'l'): Visual => ({ kind: 'text', value, size, speak: spoken(value) });
export const picture = (emoji: string, name?: string): Visual => (name === undefined ? { kind: 'emojiGroup', emoji, count: 1, layout: 'row' } : { kind: 'emojiGroup', emoji, count: 1, layout: 'row', speak: [name] });
export const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });

export const YES_NO = ['Yes', 'No'];
export const yesNoOptions = (): Visual[] => YES_NO.map((word) => wordText(word));

// "a cat", "an elephant".
export const a = (word: string): string => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);

// A choice of numerals, the right one among them.
export function numberChoice(answer: number, values: number[]): { type: 'choice'; options: Visual[]; answerIndex: number } {
  const answerIndex = values.indexOf(answer);
  if (answerIndex === -1) throw new Error(`numberChoice: ${answer} is not among ${values.join(', ')}`);
  return { type: 'choice', options: values.map((value) => numeral(value)), answerIndex };
}

// Two to four things in a random order, the right one among them.
export function shuffled<T>(right: T, wrong: readonly T[], rng: Rng): { items: T[]; answerIndex: number } {
  const items = rng.shuffle([right, ...wrong]);
  return { items, answerIndex: items.indexOf(right) };
}

// The four beats of a lesson, from two questions the skill itself makes (plan section 8, Lesson beats).
export function lessonOf(see: string, seeVisual: Visual, watch: QuestionDraft, tryIt: QuestionDraft, remember: string, rememberVisual?: Visual): LessonStep[] {
  return [
    { beat: 'see', text: see, speak: spoken(see), visual: seeVisual },
    { beat: 'watch', text: watch.explanation.steps.join(' '), speak: watch.explanation.speak, visual: watch.explanation.visual ?? seeVisual },
    {
      beat: 'try',
      text: tryIt.prompt.text,
      speak: tryIt.prompt.speak,
      // With no picture to look at, the try beat shows the options, never the explanation, which gives the answer.
      visual: tryIt.stimulus ?? (tryIt.type === 'choice' ? { kind: 'row', children: tryIt.options } : (tryIt.explanation.visual ?? seeVisual)),
      reveal: { text: tryIt.explanation.steps.join(' '), speak: tryIt.explanation.speak, visual: tryIt.explanation.visual ?? seeVisual },
    },
    { beat: 'remember', text: remember, speak: spoken(remember), visual: rememberVisual ?? seeVisual },
  ];
}

interface SkillParts {
  skillId: string;
  maxLevel: Level;
  itemTypes: ItemType[];
  oracle: OracleId;
  exampleSeed: number;
  generate: (level: Level, rng: Rng) => QuestionDraft;
  lists?: string[];
  pool?: Partial<Record<Level, number>>;
  // The lesson, given the skill's own question maker: watch and try are usually two of its questions.
  lesson: (make: (level: Level, seed: number) => QuestionDraft) => LessonStep[];
}

export function h1Skill(parts: SkillParts): SkillGenerator {
  const make = (level: Level, seed: number): QuestionDraft => parts.generate(level, makeRng(seed));
  const skill: SkillGenerator = {
    skillId: parts.skillId,
    maxLevel: parts.maxLevel,
    itemTypes: parts.itemTypes,
    lists: parts.lists ?? [],
    generate: parts.generate,
    exampleSeed: parts.exampleSeed,
    example: () => make(1, parts.exampleSeed),
    lesson: () => parts.lesson(make),
    oracle: parts.oracle,
  };
  if (parts.pool) skill.pool = parts.pool;
  return skill;
}
