import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Blank, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';
import { nearbyNumbers } from '../pk/parts';

// Math K A.4 to A.7: rows of numbers that go up by the same step, with one number missing.
// Families: Skip counting, Missing number in a row, and Next, before, after. Oracle: sequence.

interface Row {
  start: number;
  step: number;
  length: number;
  blankIndex: number;
}

const valueAt = (row: Row, index: number): number => row.start + row.step * index;
const allValues = (row: Row): number[] => Array.from({ length: row.length }, (_, i) => valueAt(row, i));

function rowVisual(row: Row, filled: boolean): Visual {
  const items: (Visual | Blank)[] = allValues(row).map((value, i) => (i === row.blankIndex && !filled ? 'blank' : numeral(value, 'l')));
  return { kind: 'sequence', items };
}

// Three numbers next to each other in the row's own step, smallest first, that include the answer.
function optionsFor(row: Row, rng: Rng): number[] {
  const answer = valueAt(row, row.blankIndex);
  const lowest = row.step; // counting never offers zero or less
  const units = nearbyNumbers(answer / row.step, Math.max(lowest / row.step, answer / row.step - 2), answer / row.step + 2, rng);
  return units.map((unit) => unit * row.step);
}

// `asNext`: the question asked what comes next, so the answer is given as the next number, not a missing one.
function explainRow(row: Row, asNext = false): { speak: Say; steps: string[]; visual: Visual } {
  const answer = valueAt(row, row.blankIndex);
  const values = allValues(row);
  const counted: Say = values.map((value) => ({ number: value }));
  if (row.step === 10) {
    return {
      speak: ['We are counting by tens.', ...counted, row.blankIndex === row.length - 1 ? 'Next is' : 'The missing number is', { number: answer }, '.'],
      steps: ['We are counting by 10s.', `${listText(values)}.`, row.blankIndex === row.length - 1 ? `Next is ${answer}.` : `The missing number is ${answer}.`],
      visual: rowVisual(row, true),
    };
  }
  if (asNext) {
    return { speak: ['Count on.', ...counted, 'Next is', { number: answer }, '.'], steps: [`Count on: ${listText(values)}.`, `Next is ${answer}.`], visual: rowVisual(row, true) };
  }
  return {
    speak: ['Count along the row.', ...counted, 'The missing number is', { number: answer }, '.'],
    steps: [`Count along the row: ${listText(values)}.`, `The missing number is ${answer}.`],
    visual: rowVisual(row, true),
  };
}

function build(row: Row, prompt: string, typed: boolean, rng: Rng): QuestionDraft {
  const answer = valueAt(row, row.blankIndex);
  const asNext = prompt === 'What comes next?';
  const base = { mode: 'look' as const, prompt: { text: prompt, speak: [prompt] as Say }, stimulus: rowVisual(row, false), explanation: explainRow(row, asNext) };
  if (typed) return { ...base, type: 'numberPad', facts: { ...row }, answer, maxDigits: 3 };
  const values = optionsFor(row, rng);
  return { ...base, type: 'choice', facts: { ...row, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

function lesson(see: Row, watch: Row, tryIt: Row, seeText: string, seeSpeak: Say, ask: string, remember: string): LessonStep[] {
  const asNext = ask === 'What comes next?';
  const explain = (row: Row): ReturnType<typeof explainRow> => explainRow(row, asNext);
  return [
    { beat: 'see', text: seeText, speak: seeSpeak, visual: rowVisual(see, true) },
    { beat: 'watch', text: explain(watch).steps.join(' '), speak: explain(watch).speak, visual: rowVisual(watch, true) },
    {
      beat: 'try',
      text: ask,
      speak: [ask],
      visual: rowVisual(tryIt, false),
      reveal: { text: explain(tryIt).steps.join(' '), speak: explain(tryIt).speak, visual: rowVisual(tryIt, true) },
    },
    { beat: 'remember', text: remember, speak: [remember], visual: rowVisual(see, true) },
  ];
}

// ---- A.4 What comes next ----
// Levels: to 10 / to 20 / to 50 / to 100, typed. Three numbers, then the blank.
const NEXT_MAX = [10, 20, 50, 100];
function whatComesNext(level: Level, rng: Rng): QuestionDraft {
  const max = NEXT_MAX[level - 1] ?? 100;
  const min = level === 1 ? 1 : (NEXT_MAX[level - 2] ?? 1) - 6; // each level reaches back a little, then on into new numbers
  const start = rng.int(Math.max(1, min), max - 3);
  return build({ start, step: 1, length: 4, blankIndex: 3 }, 'What comes next?', level === 4, rng);
}

export const whatComesNextGenerator: SkillGenerator = {
  skillId: 'M-K-A4',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  pool: { 1: 7 }, // rows of four that end by 10 start at 1 to 7
  generate: whatComesNext,
  exampleSeed: 24,
  example: () => whatComesNext(1, makeRng(24)),
  lesson: () =>
    lesson(
      { start: 1, step: 1, length: 5, blankIndex: 4 },
      { start: 3, step: 1, length: 4, blankIndex: 3 },
      { start: 6, step: 1, length: 4, blankIndex: 3 },
      'When we count, each number is one more.',
      ['When we count, each number is one more.'],
      'What comes next?',
      'Counting goes up by one.',
    ),
  oracle: 'sequence',
};

// ---- A.6 Missing number ----
// Levels: row of 4, blank at the end, to 10 / blank anywhere, to 20 / to 50 / typed, to 100.
function missingNumber(level: Level, rng: Rng): QuestionDraft {
  const max = NEXT_MAX[level - 1] ?? 100;
  const min = level === 1 ? 1 : (NEXT_MAX[level - 2] ?? 1) - 6;
  const start = rng.int(Math.max(1, min), max - 3);
  const blankIndex = level === 1 ? 3 : rng.int(0, 3);
  return build({ start, step: 1, length: 4, blankIndex }, 'Which number is missing?', level === 4, rng);
}

export const missingNumberGenerator: SkillGenerator = {
  skillId: 'M-K-A6',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  pool: { 1: 7 },
  generate: missingNumber,
  exampleSeed: 26,
  example: () => missingNumber(1, makeRng(26)),
  lesson: () =>
    lesson(
      { start: 4, step: 1, length: 4, blankIndex: 3 },
      { start: 5, step: 1, length: 4, blankIndex: 2 },
      { start: 2, step: 1, length: 4, blankIndex: 1 },
      'Numbers in a row go up by one.',
      ['Numbers in a row go up by one.'],
      'Which number is missing?',
      'Count on from a number you know.',
    ),
  oracle: 'sequence',
};

// ---- A.7 Count by tens ----
// Levels: next ten, to 50 / to 100 / a missing ten anywhere.
function countByTens(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const start = rng.int(1, 7) * 10;
    return build({ start, step: 10, length: 4, blankIndex: rng.int(0, 3) }, 'Which number is missing?', false, rng);
  }
  // Two or three tens are shown, then the blank.
  const length = rng.int(3, 4);
  const lastTen = level === 1 ? 5 : 10;
  const start = rng.int(1, lastTen - (length - 1)) * 10;
  return build({ start, step: 10, length, blankIndex: length - 1 }, 'What comes next?', false, rng);
}

export const countByTensGenerator: SkillGenerator = {
  skillId: 'M-K-A7',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 5 }, // 10 20 ?, 20 30 ?, 30 40 ?, 10 20 30 ?, 20 30 40 ?
  generate: countByTens,
  exampleSeed: 27,
  example: () => countByTens(1, makeRng(27)),
  lesson: () =>
    lesson(
      { start: 10, step: 10, length: 5, blankIndex: 4 },
      { start: 10, step: 10, length: 4, blankIndex: 3 },
      { start: 20, step: 10, length: 4, blankIndex: 3 },
      'We can count by tens: 10, 20, 30, 40, 50.',
      ['We can count by tens.', { number: 10 }, { number: 20 }, { number: 30 }, { number: 40 }, { number: 50 }, '.'],
      'What comes next?',
      'Add the same amount each time.',
    ),
  oracle: 'sequence',
};

// ---- A.5 Before and after ----
// Levels: after, to 10 / before, to 10 / either, to 20 / either, to 100.
type Side = 'after' | 'before';

function sideExplanation(n: number, side: Side): { speak: Say; steps: string[]; visual: Visual } {
  const answer = side === 'after' ? n + 1 : n - 1;
  const three = [n - 1, n, n + 1];
  return {
    speak: ['Count', ...three.map((value): { number: number } => ({ number: value })), '.', { number: answer }, `comes ${side}`, { number: n }, '.'],
    steps: [`Count ${listText(three)}.`, `${answer} comes ${side} ${n}.`],
    visual: { kind: 'sequence', items: three.map((value) => numeral(value, 'l')) },
  };
}

function sideQuestion(n: number, side: Side, rng: Rng): QuestionDraft {
  const answer = side === 'after' ? n + 1 : n - 1;
  // The sequence oracle reads a row of two: n and the number after it, or the number before it and n.
  const row = side === 'after' ? { start: n, step: 1, length: 2, blankIndex: 1 } : { start: n - 1, step: 1, length: 2, blankIndex: 0 };
  const values = nearbyNumbers(answer, Math.max(1, answer - 2), answer + 2, rng);
  return {
    type: 'choice',
    mode: 'look',
    facts: { ...row, n, side, options: values },
    prompt: { text: `What number comes ${side} ${n}?`, speak: [`What number comes ${side}`, { number: n }, '?'] },
    stimulus: numeral(n),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(answer),
    explanation: sideExplanation(n, side),
  };
}

function beforeAndAfter(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return sideQuestion(rng.int(1, 9), 'after', rng);
  if (level === 2) return sideQuestion(rng.int(2, 10), 'before', rng);
  const side = rng.pick<Side>(['after', 'before']);
  if (level === 3) return sideQuestion(rng.int(side === 'before' ? 9 : 8, side === 'before' ? 20 : 19), side, rng);
  return sideQuestion(rng.int(18, 99), side, rng);
}

export const beforeAndAfterGenerator: SkillGenerator = {
  skillId: 'M-K-A5',
  maxLevel: 4,
  itemTypes: ['choice'],
  lists: [],
  generate: beforeAndAfter,
  exampleSeed: 25,
  example: () => beforeAndAfter(1, makeRng(25)),
  lesson: () => [
    {
      beat: 'see',
      text: 'Every number has one before it and one after it.',
      speak: ['Every number has one before it and one after it.'],
      visual: { kind: 'numberLine', min: 1, max: 10, step: 1 },
    },
    { beat: 'watch', text: sideExplanation(4, 'after').steps.join(' '), speak: sideExplanation(4, 'after').speak, visual: sideExplanation(4, 'after').visual },
    {
      beat: 'try',
      text: 'What number comes before 7?',
      speak: ['What number comes before', { number: 7 }, '?'],
      visual: numeral(7),
      reveal: { text: sideExplanation(7, 'before').steps.join(' '), speak: sideExplanation(7, 'before').speak, visual: sideExplanation(7, 'before').visual },
    },
    { beat: 'remember', text: 'Counting goes up by one.', speak: ['Counting goes up by one.'], visual: { kind: 'numberLine', min: 1, max: 10, step: 1 } },
  ],
  oracle: 'sequence',
};
