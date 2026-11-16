import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';
import { apple, star, tidyGroup } from '../pk/parts';
import { explain as countOn } from './M-K-C4';
import type { PlaceWeights } from './numerals';
import { numeralChoices } from './numerals';

// Math K C.1 to C.3. Families: Add with pictures (C.1, C.3) and Add (C.2). Oracle: add.

type Explanation = { speak: Say; steps: string[]; visual: Visual };

// ---- Add with pictures ----

// Two groups side by side.
function twoGroups(thing: Countable, a: number, b: number): Visual {
  return { kind: 'row', children: [tidyGroup(thing, a), tidyGroup(thing, b)] };
}

// The same things pushed together and counted.
function countedTogether(thing: Countable, a: number, b: number): Visual {
  return { kind: 'emojiGroup', emoji: thing.emoji, count: a, emoji2: thing.emoji, count2: b, layout: a + b <= 5 ? 'row' : 'grid5', numbered: true };
}

function picturesExplanation(thing: Countable, a: number, b: number): Explanation {
  const sum = a + b;
  return {
    speak: [{ number: a }, 'and', { number: b }, 'more. Count them all.', { number: sum }, '.'],
    steps: [`${a} and ${b} more.`, `Count them all: ${listText(Array.from({ length: sum }, (_, i) => i + 1))}.`],
    visual: countedTogether(thing, a, b),
  };
}

const IN_ALL = 'How many in all?';

function picturesQuestion(thing: Countable, a: number, b: number, rng: Rng, weights: PlaceWeights): QuestionDraft {
  // The slips: counting only one of the groups.
  const values = numeralChoices(a + b, [a, b], 1, 12, rng, weights);
  return {
    type: 'choice',
    mode: 'look',
    facts: { a, b, thing: thing.one, options: values },
    prompt: { text: IN_ALL, speak: [IN_ALL] },
    stimulus: twoGroups(thing, a, b),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(a + b),
    explanation: picturesExplanation(thing, a, b),
  };
}

function picturesLesson(see: [number, number], watch: [number, number], tryIt: [number, number]): LessonStep[] {
  const shown = picturesExplanation(apple, ...watch);
  const revealed = picturesExplanation(star, ...tryIt);
  return [
    {
      beat: 'see',
      text: `Adding puts groups together. Here are ${see[0]} apples and ${see[1]} more.`,
      speak: ['Adding puts groups together. Here are', { number: see[0] }, 'apples and', { number: see[1] }, 'more.'],
      visual: twoGroups(apple, ...see),
    },
    { beat: 'watch', text: shown.steps.join(' '), speak: shown.speak, visual: shown.visual },
    {
      beat: 'try',
      text: IN_ALL,
      speak: [IN_ALL],
      visual: twoGroups(star, ...tryIt),
      reveal: { text: revealed.steps.join(' '), speak: revealed.speak, visual: revealed.visual },
    },
    { beat: 'remember', text: 'Adding puts groups together.', speak: ['Adding puts groups together.'], visual: countedTogether(apple, ...see) },
  ];
}

// Two groups of at least one that add up to a sum from lo to hi.
function twoParts(lo: number, hi: number, rng: Rng): [number, number] {
  const sum = rng.int(lo, hi);
  const a = rng.int(1, sum - 1);
  return [a, sum - a];
}

// C.1 Add with pictures to 5. Levels: sums to 3 / to 5.
function picturesTo5(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  const [a, b] = level === 1 ? twoParts(2, 3, rng) : twoParts(4, 5, rng);
  // Sums this small can rarely sit last, so last place gets extra weight when it is open.
  return picturesQuestion(thing, a, b, rng, level === 1 ? [1, 1, 3] : [1, 1, 1]);
}

export const addPicturesTo5Generator: SkillGenerator = {
  skillId: 'M-K-C1',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: picturesTo5,
  exampleSeed: 31,
  example: () => picturesTo5(1, makeRng(31)),
  lesson: () => picturesLesson([2, 1], [1, 2], [3, 1]),
  oracle: 'add',
};

// C.3 Add with pictures to 10. Levels: sums 4 to 7 / 6 to 10.
function picturesTo10(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  const [a, b] = level === 1 ? twoParts(4, 7, rng) : twoParts(6, 10, rng);
  return picturesQuestion(thing, a, b, rng, [1, 1, 1]);
}

export const addPicturesTo10Generator: SkillGenerator = {
  skillId: 'M-K-C3',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: picturesTo10,
  exampleSeed: 33,
  example: () => picturesTo10(1, makeRng(33)),
  lesson: () => picturesLesson([4, 2], [3, 4], [5, 3]),
  oracle: 'add',
};

// ---- C.2 Add to 5 ----
// Levels: equation, sums to 5 / with zero / typed.

function plusExplanation(a: number, b: number): Explanation {
  if (a > 0 && b > 0) return countOn(a, b);
  const sum = a + b;
  return {
    speak: ['Zero means none.', { number: sum }, 'and none more is', { number: sum }, '.'],
    steps: ['Zero means none.', `${a} + ${b} = ${sum}`],
    visual: { kind: 'equation', parts: [a, '+', b, '=', sum] },
  };
}

function plusPrompt(a: number, b: number): { text: string; speak: Say } {
  return { text: `${a} plus ${b} equals what?`, speak: [{ number: a }, 'plus', { number: b }, 'equals what?'] };
}

function plusQuestion(a: number, b: number, typed: boolean, rng: Rng, weights: PlaceWeights = [1, 1, 1]): QuestionDraft {
  const sum = a + b;
  const base = { mode: 'look' as const, prompt: plusPrompt(a, b), stimulus: { kind: 'equation', parts: [a, '+', b, '=', 'blank'] } as Visual, explanation: plusExplanation(a, b) };
  if (typed) return { ...base, type: 'numberPad', facts: { a, b }, answer: sum, maxDigits: 2 };
  // The slips: one off, the take-away answer, or a number from the question said again.
  const values = numeralChoices(sum, [a, b, Math.abs(a - b)], 0, 7, rng, weights);
  return { ...base, type: 'choice', facts: { a, b, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(sum) };
}

function addTo5(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return plusQuestion(...twoParts(2, 5, rng), false, rng);
  if (level === 2) {
    const n = rng.int(1, 5);
    return rng.bool() ? plusQuestion(n, 0, false, rng) : plusQuestion(0, n, false, rng);
  }
  const sum = rng.int(1, 5);
  const a = rng.int(0, sum);
  return plusQuestion(a, sum - a, true, rng);
}

function addTo5Lesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'Adding puts groups together. 2 and 1 make 3.',
      speak: ['Adding puts groups together.', { number: 2 }, 'and', { number: 1 }, 'make', { number: 3 }, '.'],
      visual: { kind: 'emojiGroup', emoji: '🍎', count: 2, layout: 'row', emoji2: '🍌', count2: 1 },
    },
    {
      beat: 'watch',
      text: '3 plus 1. Start at 3. Count on 1 more: 4.',
      speak: [{ number: 3 }, 'plus', { number: 1 }, '.', ...countOn(3, 1).speak],
      visual: { kind: 'equation', parts: [3, '+', 1, '=', 4] },
    },
    {
      beat: 'try',
      text: plusPrompt(2, 3).text,
      speak: plusPrompt(2, 3).speak,
      visual: { kind: 'equation', parts: [2, '+', 3, '=', 'blank'] },
      reveal: { text: 'Start at 3. Count on 2 more: 4, 5.', speak: countOn(2, 3).speak, visual: { kind: 'equation', parts: [2, '+', 3, '=', 5] } },
    },
    { beat: 'remember', text: 'Start with the bigger number.', speak: ['Start with the bigger number.'], visual: { kind: 'numberLine', min: 0, max: 5, step: 1 } },
  ];
}

export const addTo5Generator: SkillGenerator = {
  skillId: 'M-K-C2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: addTo5,
  exampleSeed: 32,
  example: () => addTo5(1, makeRng(32)),
  lesson: addTo5Lesson,
  oracle: 'add',
};
