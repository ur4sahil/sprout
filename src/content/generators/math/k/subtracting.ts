import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { apple, star } from '../pk/parts';
import type { PlaceWeights } from './numerals';
import { numeralChoices } from './numerals';

// Math K C.5 to C.7. Family: Subtract. Oracle: subtract.

type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint };

// A group with the last few crossed out.
export function crossedGroup(emoji: string, a: number, b: number): Visual {
  const base = { kind: 'emojiGroup' as const, emoji, count: a, layout: a <= 5 ? ('row' as const) : ('grid5' as const) };
  return b > 0 ? { ...base, crossed: b } : base;
}

function leftSpeak(left: number): Say {
  if (left === 0) return ['None are left.'];
  return [{ number: left }, left === 1 ? 'is left.' : 'are left.'];
}

function leftText(left: number): string {
  return left === 0 ? 'None are left.' : `${left} ${left === 1 ? 'is' : 'are'} left.`;
}

// "Start with a. Take away b. The rest are left."
export function takeAwayExplanation(a: number, b: number, visual: Visual): Explanation {
  return {
    speak: ['Start with', { number: a }, '. Take away', { number: b }, '.', ...leftSpeak(a - b)],
    steps: [`Start with ${a}.`, `Take away ${b}.`, leftText(a - b)],
    visual,
  };
}

// Every pair "a take away b" with a from lo to hi and at least one taken and one left.
function pairs(lo: number, hi: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = lo; a <= hi; a += 1) for (let b = 1; b < a; b += 1) out.push([a, b]);
  return out;
}

// ---- C.5 Subtract with pictures to 5 ----
// Levels: crossed-out pictures, start 2 to 3 / start 4 to 5.

const HOW_MANY_LEFT = 'How many are left?';

function picturesQuestion(thing: Countable, a: number, b: number, rng: Rng, weights: PlaceWeights): QuestionDraft {
  // The slips: the number at the start, or the number crossed out.
  const values = numeralChoices(a - b, [a, b], 0, 7, rng, weights);
  return {
    type: 'choice',
    mode: 'look',
    facts: { a, b, thing: thing.one, options: values },
    prompt: { text: HOW_MANY_LEFT, speak: [HOW_MANY_LEFT] },
    stimulus: crossedGroup(thing.emoji, a, b),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(a - b),
    explanation: { ...takeAwayExplanation(a, b, crossedGroup(thing.emoji, a, b)), hint: { text: 'Count the ones that are not crossed out.' } },
  };
}

function picturesTo5(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  const [a, b] = rng.pick(level === 1 ? pairs(2, 3) : pairs(4, 5));
  return picturesQuestion(thing, a, b, rng, level === 1 ? [1, 1, 3] : [1, 1, 2]);
}

function picturesLesson(): LessonStep[] {
  const shown = takeAwayExplanation(4, 1, crossedGroup(apple.emoji, 4, 1));
  const revealed = takeAwayExplanation(5, 2, crossedGroup(star.emoji, 5, 2));
  return [
    {
      beat: 'see',
      text: 'Subtracting takes some away. A cross means one is gone.',
      speak: ['Subtracting takes some away. A cross means one is gone.'],
      visual: crossedGroup(apple.emoji, 3, 1),
    },
    { beat: 'watch', text: shown.steps.join(' '), speak: shown.speak, visual: shown.visual },
    {
      beat: 'try',
      text: HOW_MANY_LEFT,
      speak: [HOW_MANY_LEFT],
      visual: crossedGroup(star.emoji, 5, 2),
      reveal: { text: revealed.steps.join(' '), speak: revealed.speak, visual: revealed.visual },
    },
    { beat: 'remember', text: 'Subtracting takes some away.', speak: ['Subtracting takes some away.'], visual: crossedGroup(apple.emoji, 4, 1) },
  ];
}

export const subtractPicturesTo5Generator: SkillGenerator = {
  skillId: 'M-K-C5',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: picturesTo5,
  exampleSeed: 35,
  example: () => picturesTo5(1, makeRng(35)),
  lesson: picturesLesson,
  oracle: 'subtract',
};

// ---- C.6 and C.7 Subtract with an equation ----

const DOT = '⚫';

// Asked the natural way (the owner's choice, Nov 22, 2026), and with "take away" in kindergarten.
function minusPrompt(a: number, b: number): { text: string; speak: Say } {
  return { text: `What is ${a} take away ${b}?`, speak: ['What is', { number: a }, 'take away', { number: b }, '?'] };
}

// Fingers show any take away within 10, zero included.
const FINGERS: Hint = { text: 'Hold up fingers for the first number. Put down fingers for the second number. Count the fingers still up.' };

function minusQuestion(a: number, b: number, typed: boolean, rng: Rng, weights: PlaceWeights): QuestionDraft {
  const left = a - b;
  const base = {
    mode: 'look' as const,
    prompt: minusPrompt(a, b),
    stimulus: { kind: 'equation', parts: [a, '-', b, '=', 'blank'] } as Visual,
    explanation: { ...takeAwayExplanation(a, b, crossedGroup(DOT, a, b)), hint: FINGERS },
  };
  if (typed) return { ...base, type: 'numberPad', facts: { a, b }, answer: left, maxDigits: 2 };
  // The slips: one off, the adding answer, or a number from the question said again.
  const values = numeralChoices(left, [a, b, a + b], 0, 12, rng, weights);
  return { ...base, type: 'choice', facts: { a, b, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(left) };
}

function minusLesson(see: [number, number], watch: [number, number], tryIt: [number, number]): LessonStep[] {
  const shown = takeAwayExplanation(...watch, crossedGroup(DOT, ...watch));
  const revealed = takeAwayExplanation(...tryIt, crossedGroup(DOT, ...tryIt));
  return [
    {
      beat: 'see',
      text: `Subtracting takes some away. ${see[0]} take away ${see[1]} is ${see[0] - see[1]}.`,
      speak: ['Subtracting takes some away.', { number: see[0] }, 'take away', { number: see[1] }, 'is', { number: see[0] - see[1] }, '.'],
      visual: crossedGroup(apple.emoji, ...see),
    },
    {
      beat: 'watch',
      text: `${watch[0]} take away ${watch[1]}. ${shown.steps.join(' ')}`,
      speak: [{ number: watch[0] }, 'take away', { number: watch[1] }, '.', ...shown.speak],
      visual: shown.visual,
    },
    {
      beat: 'try',
      text: minusPrompt(...tryIt).text,
      speak: minusPrompt(...tryIt).speak,
      visual: { kind: 'equation', parts: [tryIt[0], '-', tryIt[1], '=', 'blank'] },
      reveal: { text: revealed.steps.join(' '), speak: revealed.speak, visual: revealed.visual },
    },
    { beat: 'remember', text: 'Subtracting takes some away.', speak: ['Subtracting takes some away.'], visual: { kind: 'equation', parts: [watch[0], '-', watch[1], '=', watch[0] - watch[1]] } },
  ];
}

// C.6 Subtract to 5. Levels: equation within 5 / with zero / typed.
function subtractTo5(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return minusQuestion(...rng.pick(pairs(2, 5)), false, rng, [1, 1, 3]);
  if (level === 2) {
    // Take away zero three times in four, take away everything once in four. An answer of zero
    // has to be the first option, so it is kept to a quarter and the others lean away from first.
    const a = rng.int(1, 5);
    return rng.bool(0.25) ? minusQuestion(a, a, false, rng, [1, 1, 1]) : minusQuestion(a, 0, false, rng, [1, 3, 3]);
  }
  const a = rng.int(1, 5);
  return minusQuestion(a, rng.int(0, a), true, rng, [1, 1, 1]);
}

export const subtractTo5Generator: SkillGenerator = {
  skillId: 'M-K-C6',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: subtractTo5,
  exampleSeed: 36,
  example: () => subtractTo5(1, makeRng(36)),
  lesson: () => minusLesson([3, 1], [4, 1], [5, 2]),
  oracle: 'subtract',
};

// C.7 Subtract to 10. Levels: within 7 / within 10 / typed.
function subtractTo10(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return minusQuestion(...rng.pick(pairs(2, 7)), false, rng, [1, 1, 2]);
  if (level === 2) return minusQuestion(...rng.pick(pairs(8, 10)), false, rng, [1, 1, 1]);
  return minusQuestion(...rng.pick(pairs(2, 10)), true, rng, [1, 1, 1]);
}

export const subtractTo10Generator: SkillGenerator = {
  skillId: 'M-K-C7',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: subtractTo10,
  exampleSeed: 37,
  example: () => subtractTo10(1, makeRng(37)),
  lesson: () => minusLesson([5, 2], [7, 3], [9, 4]),
  oracle: 'subtract',
};
