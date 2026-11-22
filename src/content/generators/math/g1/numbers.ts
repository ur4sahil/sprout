import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Blank, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { nearbyNumbers } from '../pk/parts';
import type { Shown as Explanation } from './wording';
import { explain, tensOf } from './wording';

// Math grade 1 A.1, A.2, A.5 and E.1: counting on, skip counting, ten more and less, number patterns.

// ---- A.1 Count to 120 ----
// Levels: next number to 50 / to 100 / across 100, typed / before and after to 120, typed.
// Family: Next, before, after. Oracle: sequence.

type Side = 'after' | 'before';

function sideExplanation(n: number, side: Side): Explanation {
  const answer = side === 'after' ? n + 1 : n - 1;
  const three = [n - 1, n, n + 1];
  const hint = side === 'after' ? `Count on one from ${n}.` : `Count back one from ${n}.`;
  return explain([`Count ${listText(three)}.`, `${answer} comes ${side} ${n}.`], { kind: 'sequence', items: three.map((value) => numeral(value, 'l')) }, { text: hint });
}

function sideQuestion(n: number, side: Side, typed: boolean, rng: Rng): QuestionDraft {
  const answer = side === 'after' ? n + 1 : n - 1;
  // The sequence oracle reads a row of two: n and the number after it, or the number before it and n.
  const row = side === 'after' ? { start: n, step: 1, length: 2, blankIndex: 1 } : { start: n - 1, step: 1, length: 2, blankIndex: 0 };
  const base = {
    mode: 'look' as const,
    prompt: { text: `What number comes ${side} ${n}?`, speak: [`What number comes ${side}`, { number: n }, '?'] as Say },
    stimulus: numeral(n),
    explanation: sideExplanation(n, side),
  };
  if (typed) return { ...base, type: 'numberPad', facts: { ...row, n, side }, answer, maxDigits: 3 };
  const values = nearbyNumbers(answer, answer - 2, answer + 2, rng);
  return { ...base, type: 'choice', facts: { ...row, n, side, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

function countTo120(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return sideQuestion(rng.int(20, 49), 'after', false, rng);
  if (level === 2) return sideQuestion(rng.int(50, 99), 'after', false, rng);
  if (level === 3) return sideQuestion(rng.int(95, 109), 'after', true, rng);
  const side = rng.pick<Side>(['after', 'before']);
  return sideQuestion(side === 'after' ? rng.int(60, 119) : rng.int(61, 120), side, true, rng);
}

export const countTo120Generator: SkillGenerator = {
  skillId: 'M-1-A1',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: countTo120,
  exampleSeed: 101,
  example: () => countTo120(1, makeRng(101)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Counting goes on past 100. After 99 comes 100, then 101.', speak: ['Counting goes on past', { number: 100 }, '. After', { number: 99 }, 'comes', { number: 100 }, ', then', { number: 101 }, '.'], visual: { kind: 'sequence', items: [99, 100, 101].map((value) => numeral(value, 'l')) } },
    { beat: 'watch', text: sideExplanation(47, 'after').steps.join(' '), speak: sideExplanation(47, 'after').speak, visual: sideExplanation(47, 'after').visual },
    {
      beat: 'try',
      text: 'What number comes after 109?',
      speak: ['What number comes after', { number: 109 }, '?'],
      visual: numeral(109),
      reveal: { text: sideExplanation(109, 'after').steps.join(' '), speak: sideExplanation(109, 'after').speak, visual: sideExplanation(109, 'after').visual },
    },
    { beat: 'remember', text: 'Counting goes up by one.', speak: ['Counting goes up by one.'], visual: { kind: 'sequence', items: [118, 119, 120].map((value) => numeral(value, 'l')) } },
  ],
  oracle: 'sequence',
};

// ---- Rows of numbers: A.2 Skip counting and E.1 Number patterns ----

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

const NEXT = 'What comes next?';
const MISSING = 'Which number is missing?';

// The hint for every row of numbers: find the jump, then make it (the same words in A.2 and E.1).
const JUMP_NEXT = 'Find the jump from each number to the next. Then make that jump again.';
const JUMP_BOX = 'Find the jump from each number to the next. Then fill the box.';

// Family: Skip counting, and Missing number in a row. Said as E.1 says it: "The numbers go up by 10."
function skipExplanation(row: Row): Explanation {
  const values = allValues(row);
  const answer = valueAt(row, row.blankIndex);
  const last = row.blankIndex === row.length - 1;
  const lines = [`The numbers go up by ${row.step}.`, `Count by ${row.step}s: ${listText(values)}.`, last ? `Next is ${answer}.` : `The missing number is ${answer}.`];
  return explain(lines, rowVisual(row, true), { text: last ? JUMP_NEXT : JUMP_BOX });
}

// Family: Number series. "The numbers go up by n. 7 + 2 = 9. Next is 9."
function patternExplanation(row: Row): Explanation {
  const answer = valueAt(row, row.blankIndex);
  const up = row.step > 0;
  const jump = Math.abs(row.step);
  const before = valueAt(row, row.blankIndex - 1);
  const lines = [`The numbers go ${up ? 'up' : 'down'} by ${jump}.`, `${before} ${up ? '+' : '−'} ${jump} = ${answer}.`, `Next is ${answer}.`];
  return explain(lines, rowVisual(row, true), { text: JUMP_NEXT });
}

function rowQuestion(row: Row, prompt: string, typed: boolean, explanation: Explanation, rng: Rng): QuestionDraft {
  const answer = valueAt(row, row.blankIndex);
  const base = { mode: 'look' as const, prompt: { text: prompt, speak: [prompt] as Say }, stimulus: rowVisual(row, false), explanation };
  if (typed) return { ...base, type: 'numberPad', facts: { ...row }, answer, maxDigits: 3 };
  // The slips: one step too few or too many, or counting on by one instead of by the step.
  const before = valueAt(row, row.blankIndex - 1);
  const values = numeralChoices(answer, [answer - row.step, answer + row.step, before + (row.step > 0 ? 1 : -1)], 0, 200, rng);
  return { ...base, type: 'choice', facts: { ...row, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

// A.2 Skip count by 2s, 5s, 10s. Levels: by 10s / by 5s / by 2s / missing number anywhere, typed.
function skipCount(level: Level, rng: Rng): QuestionDraft {
  const step = level === 1 ? 10 : level === 2 ? 5 : level === 3 ? 2 : rng.pick([2, 5, 10]);
  // Skip counting starts on a number in the count: 10, 20, 30 or 5, 10, 15 or 2, 4, 6.
  const start = step * rng.int(1, step === 10 ? 8 : step === 5 ? 12 : 20);
  const row: Row = { start, step, length: 5, blankIndex: level === 4 ? rng.int(0, 3) : 4 };
  return rowQuestion(row, level === 4 ? MISSING : NEXT, level === 4, skipExplanation(row), rng);
}

function rowLesson(seeText: string, seeSpeak: Say, see: Row, watch: Explanation, watchRow: Row, tryRow: Row, tryExplanation: Explanation, remember: string): LessonStep[] {
  return [
    { beat: 'see', text: seeText, speak: seeSpeak, visual: rowVisual(see, true) },
    { beat: 'watch', text: watch.steps.join(' '), speak: watch.speak, visual: rowVisual(watchRow, true) },
    { beat: 'try', text: NEXT, speak: [NEXT], visual: rowVisual(tryRow, false), reveal: { text: tryExplanation.steps.join(' '), speak: tryExplanation.speak, visual: rowVisual(tryRow, true) } },
    { beat: 'remember', text: remember, speak: [remember], visual: rowVisual(see, true) },
  ];
}

const row = (start: number, step: number): Row => ({ start, step, length: 5, blankIndex: 4 });

export const skipCountGenerator: SkillGenerator = {
  skillId: 'M-1-A2',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: skipCount,
  exampleSeed: 102,
  example: () => skipCount(1, makeRng(102)),
  lesson: () => rowLesson('Skip counting jumps by the same amount each time.', ['Skip counting jumps by the same amount each time.'], row(10, 10), skipExplanation(row(5, 5)), row(5, 5), row(2, 2), skipExplanation(row(2, 2)), 'Add the same amount each time.'),
  oracle: 'sequence',
};

// E.1 Number patterns. Levels: plus 1 and plus 2 rows / plus 5, plus 10 / minus patterns, typed.
// Unlike skip counting, a pattern may start on any number: 3, 8, 13, 18.
function numberPattern(level: Level, rng: Rng): QuestionDraft {
  let step: number;
  let start: number;
  if (level === 1) {
    step = rng.int(1, 2);
    start = rng.int(1, 40);
  } else if (level === 2) {
    step = rng.pick([5, 10]);
    start = rng.int(1, 40);
  } else {
    step = -rng.pick([1, 2, 5, 10]);
    // High enough that the row never goes below zero.
    start = rng.int(-step * 5, -step * 5 + 40);
  }
  const pattern = row(start, step);
  return rowQuestion(pattern, NEXT, level === 3, patternExplanation(pattern), rng);
}

export const numberPatternsGenerator: SkillGenerator = {
  skillId: 'M-1-E1',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: numberPattern,
  exampleSeed: 151,
  example: () => numberPattern(1, makeRng(151)),
  lesson: () => rowLesson('A number pattern follows a rule. Here the rule is plus 2.', ['A number pattern follows a rule. Here the rule is plus', { number: 2 }, '.'], row(3, 2), patternExplanation(row(4, 5)), row(4, 5), row(30, -2), patternExplanation(row(30, -2)), 'Find the jump.'),
  oracle: 'sequence',
};

// ---- A.5 Ten more, ten less ----
// Levels: ten more / ten less / typed, either. Family: Ten or a hundred more or less. Oracles: add, subtract.

type TenWay = 'more' | 'less';

// Which way the tens go and by how much, then the answer: "56 has 5 tens." "10 more makes 6 tens. The ones stay 6."
function tenExplanation(n: number, way: TenWay): Explanation {
  const answer = way === 'more' ? n + 10 : n - 10;
  const ones = n % 10;
  const lines = [
    `${n} has ${tensOf(Math.floor(n / 10))}.`,
    `10 ${way} ${way === 'more' ? 'makes' : 'leaves'} ${tensOf(Math.floor(answer / 10))}. ${ones === 0 ? 'There are still no ones.' : `The ones stay ${ones}.`}`,
    `10 ${way} than ${n} is ${answer}.`,
  ];
  // The same words as B.9: "Only the tens change."
  const hint = way === 'more' ? 'Only the tens change. The tens digit goes up.' : 'Only the tens change. The tens digit goes down.';
  return explain(lines, { kind: 'baseTen', hundreds: Math.floor(answer / 100), tens: Math.floor((answer % 100) / 10), ones: answer % 10 }, { text: hint });
}

function tenPrompt(n: number, way: TenWay): { text: string; speak: Say } {
  return { text: `What is 10 ${way} than ${n}?`, speak: ['What is', { number: 10 }, `${way} than`, { number: n }, '?'] };
}

function tenQuestion(n: number, way: TenWay, typed: boolean, rng: Rng): QuestionDraft {
  const answer = way === 'more' ? n + 10 : n - 10;
  // The oracle is named on the question, because the skill uses two.
  const facts = { a: n, b: 10, oracle: way === 'more' ? 'add' : 'subtract' };
  const base = { mode: 'look' as const, prompt: tenPrompt(n, way), stimulus: numeral(n), explanation: tenExplanation(n, way) };
  if (typed) return { ...base, type: 'numberPad', facts, answer, maxDigits: 3 };
  // The slips: one more or less instead of ten, or ten the wrong way.
  const values = numeralChoices(answer, [n + 1, n - 1, way === 'more' ? n - 10 : n + 10], 0, 120, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

function tenMoreLess(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return tenQuestion(rng.int(1, 89), 'more', false, rng);
  if (level === 2) return tenQuestion(rng.int(11, 99), 'less', false, rng);
  const way = rng.pick<TenWay>(['more', 'less']);
  return tenQuestion(way === 'more' ? rng.int(1, 89) : rng.int(11, 99), way, true, rng);
}

export const tenMoreLessGenerator: SkillGenerator = {
  skillId: 'M-1-A5',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: tenMoreLess,
  exampleSeed: 105,
  example: () => tenMoreLess(1, makeRng(105)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Ten more adds one ten. 24 has 2 tens. 34 has 3 tens.', speak: ['Ten more adds one ten.', { number: 24 }, 'has', { number: 2 }, 'tens.', { number: 34 }, 'has', { number: 3 }, 'tens.'], visual: { kind: 'baseTen', hundreds: 0, tens: 2, ones: 4 } },
    { beat: 'watch', text: `${tenPrompt(36, 'more').text} ${tenExplanation(36, 'more').steps.join(' ')}`, speak: [...tenPrompt(36, 'more').speak, ...tenExplanation(36, 'more').speak], visual: tenExplanation(36, 'more').visual },
    { beat: 'try', text: tenPrompt(52, 'less').text, speak: tenPrompt(52, 'less').speak, visual: numeral(52), reveal: { text: tenExplanation(52, 'less').steps.join(' '), speak: tenExplanation(52, 'less').speak, visual: tenExplanation(52, 'less').visual } },
    { beat: 'remember', text: 'Ten more changes the tens.', speak: ['Ten more changes the tens.'], visual: { kind: 'baseTen', hundreds: 0, tens: 3, ones: 4 } },
  ],
  oracle: 'add',
};
