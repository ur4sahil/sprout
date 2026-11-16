import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { countAloud, listText, numeral } from '../../../generator';

// Pieces the Math pre-K generators share.

export const SCATTER_SLOTS = Array.from({ length: 20 }, (_, i) => i);
export const apple = COUNTABLES[0] as Countable;
export const star = COUNTABLES[1] as Countable;

export function thingsWord(thing: Countable, n: number): string {
  return n === 1 ? thing.one : thing.many;
}

export function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// A numeral with no spoken label, for listen questions: the child must know it by its shape.
export function silentNumeral(value: number): Visual {
  return { kind: 'text', value: String(value), size: 'xl' };
}

// Three numerals next to each other that include n, smallest first, inside lo to hi.
// The wrong answers are one or two away (plan section 5, distractor rules).
export function nearbyNumbers(n: number, lo: number, hi: number, rng: Rng, preferMiddle = false): number[] {
  const starts = [n - 2, n - 1, n].filter((start) => start >= lo && start + 2 <= hi);
  // Next to the edge of the range only two sets fit. A skill that asks mostly for numbers near one edge
  // sets `preferMiddle`: the set with the answer in the middle is used, so the answer does not sit at
  // the end too often. At the very edge it has to.
  const start = preferMiddle && starts.length === 2 ? n - 1 : rng.pick(starts);
  return [start, start + 1, start + 2];
}

export type GroupLayout = 'row' | 'grid5' | 'scatter' | 'dice';

export function group(thing: Countable, n: number, layout: GroupLayout, rng: Rng): Visual {
  if (layout !== 'scatter') return { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout };
  const slots = rng.sample(SCATTER_SLOTS, n).sort((a, b) => a - b);
  return { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: 'scatter', slots };
}

// A group drawn the tidy way for its size: one row up to 5, rows of five above that.
export function tidyGroup(thing: Countable, n: number): Visual {
  return { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: n <= 5 ? 'row' : 'grid5' };
}

export function countExplanation(thing: Countable, n: number): { speak: Say; steps: string[]; visual: Visual } {
  const there = n === 1 ? 'There is' : 'There are';
  return {
    speak: ["Let's count.", ...countAloud(n), `${there}`, { number: n }, `${thingsWord(thing, n)}.`],
    steps: [`Let's count: ${listText(Array.from({ length: n }, (_, i) => i + 1))}.`, `${there} ${n} ${thingsWord(thing, n)}.`],
    visual: { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: n <= 5 ? 'row' : 'grid5', numbered: true },
  };
}

// Family: Count objects. "How many {things} are there?" with three numerals next to each other.
export function countQuestion(thing: Countable, n: number, layout: GroupLayout, lo: number, hi: number, rng: Rng): QuestionDraft {
  const stimulus = group(thing, n, layout, rng);
  const values = nearbyNumbers(n, lo, hi, rng, true);
  const facts: QuestionDraft['facts'] = { n, thing: thing.one, options: values };
  if (stimulus.kind === 'emojiGroup' && stimulus.slots) facts.slots = stimulus.slots;
  const prompt = `How many ${thing.many} are there?`;
  return {
    type: 'choice',
    mode: 'look',
    facts,
    prompt: { text: prompt, speak: [prompt] },
    stimulus,
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(n),
    explanation: countExplanation(thing, n),
  };
}

export interface CountLevel {
  from: number; // the smallest count asked
  to: number; // the largest
  layout: GroupLayout;
}

// The lesson every "Count objects" skill gives, with its own numbers.
export function countLesson(see: number, watch: number, tryIt: number): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'Counting tells us how many.',
      speak: ['Counting tells us how many. Here are', { number: see }, 'apples.'],
      visual: tidyGroup(apple, see),
    },
    {
      beat: 'watch',
      text: countExplanation(apple, watch).steps.join(' '),
      speak: countExplanation(apple, watch).speak,
      visual: countExplanation(apple, watch).visual,
    },
    {
      beat: 'try',
      text: 'How many stars are there?',
      speak: ['How many stars are there?'],
      visual: tidyGroup(star, tryIt),
      reveal: {
        text: countExplanation(star, tryIt).steps.join(' '),
        speak: countExplanation(star, tryIt).speak,
        visual: countExplanation(star, tryIt).visual,
      },
    },
    {
      beat: 'remember',
      text: 'Touch each one once and say one number.',
      speak: ['Touch each one once and say one number.'],
      visual: { kind: 'emojiGroup', emoji: apple.emoji, count: watch, layout: watch <= 5 ? 'row' : 'grid5', numbered: true },
    },
  ];
}

// A whole "Count objects" skill from its levels.
export function countSkill(skillId: string, levels: CountLevel[], optionsLo: number, optionsHi: number, lessonNumbers: [number, number, number], exampleSeed: number): SkillGenerator {
  const generate = (level: Level, rng: Rng): QuestionDraft => {
    const shape = levels[level - 1] ?? (levels[levels.length - 1] as CountLevel);
    const thing = rng.pick(COUNTABLES);
    const n = rng.int(shape.from, shape.to);
    return countQuestion(thing, n, shape.layout, optionsLo, optionsHi, rng);
  };
  return {
    skillId,
    maxLevel: levels.length as Level,
    itemTypes: ['choice'],
    lists: ['countables'],
    generate,
    exampleSeed,
    example: () => generate(1, makeRng(exampleSeed)),
    lesson: () => countLesson(...lessonNumbers),
    oracle: 'count',
  };
}

// ---- Shapes and colours ----

export const SHAPE_FACT: Partial<Record<ShapeName, string>> = {
  circle: 'A circle is round with no corners.',
  square: 'A square has four equal sides.',
  triangle: 'A triangle has three sides.',
  rectangle: 'A rectangle has two long sides and two short sides.',
  star: 'A star has five points.',
  heart: 'A heart has two round tops and a point at the bottom.',
};

// The same facts for the screen, with numerals.
export const SHAPE_FACT_TEXT: Partial<Record<ShapeName, string>> = {
  circle: 'A circle is round with no corners.',
  square: 'A square has 4 equal sides.',
  triangle: 'A triangle has 3 sides.',
  rectangle: 'A rectangle has 2 long sides and 2 short sides.',
  star: 'A star has 5 points.',
  heart: 'A heart has 2 round tops and a point at the bottom.',
};

export function shape(name: ShapeName, color: ColorName, size: 's' | 'm' | 'l' = 'm', rotation = 0): Visual {
  return { kind: 'shape', shape: name, color, size, rotation };
}

// "a circle", "an oval".
export function a(word: string): string {
  return /^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`;
}

// Pairs of colours that are easy to mix up on a screen, or for a child who sees red and green alike.
// The plan rules out red with green and blue with purple. The rest are the same idea.
const HARD_PAIRS: [ColorName, ColorName][] = [
  ['red', 'green'],
  ['blue', 'purple'],
  ['brown', 'black'],
  ['red', 'orange'],
  ['red', 'pink'],
  ['orange', 'yellow'],
  ['purple', 'pink'],
  ['green', 'brown'],
];

export function easyToTellApart(one: ColorName, two: ColorName): boolean {
  return one !== two && !HARD_PAIRS.some(([x, y]) => (x === one && y === two) || (x === two && y === one));
}

// Two colours for a question that turns on telling them apart.
export function twoClearColors(rng: Rng): [ColorName, ColorName] {
  for (;;) {
    const [one, two] = rng.sample(COLOR_NAMES, 2) as [ColorName, ColorName];
    if (easyToTellApart(one, two)) return [one, two];
  }
}
