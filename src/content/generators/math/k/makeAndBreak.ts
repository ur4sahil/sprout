import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import type { PlaceWeights } from './numerals';
import { numeralChoices } from './numerals';

// Math K C.8 and C.9. Families: Make 10, and Break apart. Oracle: missing.
// Both ask for the second part: a and what make the total.

type Explanation = { speak: Say; steps: string[]; visual: Visual };

// ---- C.8 Make 10 ----
// Levels: ten frame with 5 to 9 filled / 1 to 9 filled / equation only, typed.

const frame = (filled: number): Visual => ({ kind: 'tenFrame', filled, frames: 1 });

function makeTenExplanation(a: number): Explanation {
  const b = 10 - a;
  const full = a === 1 ? 'box is full.' : 'boxes are full.';
  const empty = b === 1 ? 'is empty.' : 'are empty.';
  return {
    speak: [{ number: a }, full, { number: b }, empty, { number: a }, 'and', { number: b }, 'make', { number: 10 }, '.'],
    steps: [`${a} ${full}`, `${b} ${empty}`, `${a} and ${b} make 10.`],
    visual: frame(a),
  };
}

const HOW_MANY_MORE: { text: string; speak: Say } = { text: 'How many more to make 10?', speak: ['How many more to make', { number: 10 }, '?'] };

function makeTenQuestion(a: number, level: Level, rng: Rng): QuestionDraft {
  const b = 10 - a;
  const facts = { a, b, total: 10, blank: 'b' };
  if (level === 3) {
    return {
      type: 'numberPad',
      mode: 'look',
      facts,
      prompt: { text: `${a} plus what equals 10?`, speak: [{ number: a }, 'plus what equals', { number: 10 }, '?'] },
      stimulus: { kind: 'equation', parts: [a, '+', 'blank', '=', 10] },
      answer: b,
      maxDigits: 2,
      explanation: makeTenExplanation(a),
    };
  }
  // The slips: one off, or counting the full boxes instead of the empty ones.
  const values = numeralChoices(b, [a], 0, 10, rng, level === 1 ? [1, 1, 2] : [1, 1, 1]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { ...facts, options: values },
    prompt: HOW_MANY_MORE,
    stimulus: frame(a),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(b),
    explanation: makeTenExplanation(a),
  };
}

const makeTen = (level: Level, rng: Rng): QuestionDraft => makeTenQuestion(level === 1 ? rng.int(5, 9) : rng.int(1, 9), level, rng);

function makeTenLesson(): LessonStep[] {
  const shown = makeTenExplanation(8);
  const revealed = makeTenExplanation(6);
  return [
    {
      beat: 'see',
      text: 'A ten frame has 10 boxes. 5 and 5 make 10.',
      speak: ['A ten frame has', { number: 10 }, 'boxes.', { number: 5 }, 'and', { number: 5 }, 'make', { number: 10 }, '.'],
      visual: frame(5),
    },
    { beat: 'watch', text: shown.steps.join(' '), speak: shown.speak, visual: shown.visual },
    { beat: 'try', text: HOW_MANY_MORE.text, speak: HOW_MANY_MORE.speak, visual: frame(6), reveal: { text: revealed.steps.join(' '), speak: revealed.speak, visual: revealed.visual } },
    {
      beat: 'remember',
      text: 'Know your pairs that make 10.',
      speak: ['Know your pairs that make', { number: 10 }, '.'],
      visual: { kind: 'equation', parts: [7, '+', 3, '=', 10] },
    },
  ];
}

export const makeTenGenerator: SkillGenerator = {
  skillId: 'M-K-C8',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  pool: { 1: 5 }, // one question for each number of counters
  generate: makeTen,
  exampleSeed: 38,
  example: () => makeTen(1, makeRng(38)),
  lesson: makeTenLesson,
  oracle: 'missing',
};

// ---- C.9 Break apart numbers ----
// Levels: "5 is 2 and blank", totals to 5 / to 8 / to 10.

// The two parts as dots of two colours.
function twoColours(a: number, b: number): Visual {
  return { kind: 'emojiGroup', emoji: '🔴', count: a, emoji2: '🔵', count2: b, layout: a + b <= 5 ? 'row' : 'grid5' };
}

function breakExplanation(total: number, a: number): Explanation {
  const b = total - a;
  return { speak: [{ number: a }, 'and', { number: b }, 'make', { number: total }, '.'], steps: [`${a} and ${b} make ${total}.`], visual: twoColours(a, b) };
}

function breakPrompt(total: number, a: number): { text: string; speak: Say } {
  return { text: `${total} is ${a} and what?`, speak: [{ number: total }, 'is', { number: a }, 'and what?'] };
}

function breakQuestion(total: number, a: number, rng: Rng, weights: PlaceWeights): QuestionDraft {
  const b = total - a;
  // The slips: one off, or a number from the question said again.
  const values = numeralChoices(b, [a, total], 0, 10, rng, weights);
  return {
    type: 'choice',
    mode: 'look',
    facts: { a, b, total, blank: 'b', options: values },
    prompt: breakPrompt(total, a),
    stimulus: { kind: 'equation', parts: [total, '=', a, '+', 'blank'] },
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(b),
    explanation: breakExplanation(total, a),
  };
}

const TOTALS: Record<number, [number, number]> = { 1: [2, 5], 2: [6, 8], 3: [9, 10] };

function breakApart(level: Level, rng: Rng): QuestionDraft {
  const [lo, hi] = TOTALS[level] ?? (TOTALS[3] as [number, number]);
  const total = rng.int(lo, hi);
  // Small totals have small answers, which can rarely sit last.
  return breakQuestion(total, rng.int(1, total - 1), rng, level === 1 ? [1, 1, 2] : [1, 1, 1]);
}

function breakLesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'A number can split into two parts. 5 is 2 and 3.',
      speak: ['A number can split into two parts.', { number: 5 }, 'is', { number: 2 }, 'and', { number: 3 }, '.'],
      visual: twoColours(2, 3),
    },
    {
      beat: 'watch',
      text: `${breakPrompt(4, 1).text} ${breakExplanation(4, 1).steps.join(' ')}`,
      speak: [...breakPrompt(4, 1).speak, ...breakExplanation(4, 1).speak],
      visual: twoColours(1, 3),
    },
    {
      beat: 'try',
      text: breakPrompt(5, 4).text,
      speak: breakPrompt(5, 4).speak,
      visual: { kind: 'equation', parts: [5, '=', 4, '+', 'blank'] },
      reveal: { text: breakExplanation(5, 4).steps.join(' '), speak: breakExplanation(5, 4).speak, visual: twoColours(4, 1) },
    },
    { beat: 'remember', text: 'A number can split in many ways.', speak: ['A number can split in many ways.'], visual: twoColours(3, 2) },
  ];
}

export const breakApartGenerator: SkillGenerator = {
  skillId: 'M-K-C9',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: breakApart,
  exampleSeed: 39,
  example: () => breakApart(1, makeRng(39)),
  lesson: breakLesson,
  oracle: 'missing',
};
