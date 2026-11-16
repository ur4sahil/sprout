import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { COUNTABLES, STORY_COUNTABLES } from '../../../data/countables';
import type { StoryKind } from '../../../data/storyProblems';
import { STORY_NAMES } from '../../../data/storyProblems';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import type { Told } from '../k/stories';
import { tellStory } from '../k/stories';
import type { Explanation } from './addSubtract';
import { borrows, carries, equation, line, together } from './addSubtract';

// Math grade 2 B.8, B.9 and B.10: arrays and repeated addition, and word problems in one and two steps.

// ---- B.8 Arrays and repeated addition ----
// Levels: count an array to 3 by 3 / match array to 3 plus 3 plus 3 / to 5 by 5, typed. Oracle: multiply.

const array = (rows: number, cols: number, emoji: string): Visual => ({ kind: 'array', rows, cols, emoji });
const addition = (rows: number, cols: number): number[] => Array.from({ length: rows }, () => cols);
const additionText = (parts: number[]): string => parts.join(' + ');
const additionSpeak = (parts: number[]): Say => parts.flatMap((part, i): Say => (i === 0 ? [{ number: part }] : ['plus', { number: part }]));

function arrayExplanation(rows: number, cols: number, emoji: string): Explanation {
  const parts = addition(rows, cols);
  return {
    speak: ['There are', { number: rows }, 'rows with', { number: cols }, 'in each row.', ...additionSpeak(parts), 'is', { number: rows * cols }, '.'],
    steps: [`There are ${rows} rows with ${cols} in each row.`, `${additionText(parts)} = ${rows * cols}.`],
    visual: array(rows, cols, emoji),
  };
}

const HOW_MANY_ALL = 'How many are there in all?';

function arrays(level: Level, rng: Rng): QuestionDraft {
  // Levels 1 and 2 stay within 3 rows. Level 3 always has a side of 4 or 5.
  // Never a square at level 2: there the rows and the columns must give different additions.
  let rows = 0;
  let cols = 0;
  do {
    rows = rng.int(2, level === 3 ? 5 : 3);
    cols = rng.int(2, level === 1 ? 3 : 5);
  } while ((level === 2 && rows === cols) || (level === 3 && Math.max(rows, cols) < 4));
  const emoji = rng.pick(COUNTABLES).emoji;
  const total = rows * cols;
  const explanation = arrayExplanation(rows, cols, emoji);
  if (level === 2) {
    // The slips: the rows and columns swapped, or one row too many.
    const options = rng.shuffle([addition(rows, cols), addition(cols, rows), addition(rows + 1, cols)]);
    const prompt = 'Which adding matches the rows?';
    return {
      type: 'choice',
      mode: 'look',
      facts: { rows, cols, ask: 'addition', options: options.map(additionText) },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: array(rows, cols, emoji),
      options: options.map((parts): Visual => ({ kind: 'text', value: additionText(parts), size: 'l', speak: additionSpeak(parts) })),
      answerIndex: options.findIndex((parts) => parts.length === rows && parts[0] === cols),
      explanation,
    };
  }
  const base = { mode: 'look' as const, prompt: { text: HOW_MANY_ALL, speak: [HOW_MANY_ALL] as Say }, stimulus: array(rows, cols, emoji), explanation };
  if (level === 3) return { ...base, type: 'numberPad', facts: { rows, cols, ask: 'total' }, answer: total, maxDigits: 2 };
  // The slips: one row left out or counted twice, or the rows and columns added.
  const values = numeralChoices(total, [total - cols, total + cols, rows + cols], 1, 30, rng);
  return { ...base, type: 'choice', facts: { rows, cols, ask: 'total', options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(total) };
}

export const arraysGenerator: SkillGenerator = {
  skillId: 'M-2-B8',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  pool: { 1: 4, 2: 6 }, // 2 or 3 rows of 2 or 3, and the six arrays to 3 by 5 that are not square
  generate: arrays,
  exampleSeed: 218,
  example: () => arrays(1, makeRng(218)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'An array has rows with the same number in each row.', speak: ['An array has rows with the same number in each row.'], visual: array(2, 3, '⭐') },
    { beat: 'watch', text: arrayExplanation(2, 3, '⭐').steps.join(' '), speak: arrayExplanation(2, 3, '⭐').speak, visual: array(2, 3, '⭐') },
    { beat: 'try', text: HOW_MANY_ALL, speak: [HOW_MANY_ALL], visual: array(3, 2, '⭐'), reveal: { text: arrayExplanation(3, 2, '⭐').steps.join(' '), speak: arrayExplanation(3, 2, '⭐').speak, visual: array(3, 2, '⭐') } },
    { beat: 'remember', text: 'Add one row at a time.', speak: ['Add one row at a time.'], visual: array(2, 3, '⭐') },
  ],
  oracle: 'multiply',
};

// ---- B.9 One-step word problems to 100 ----
// Levels: add / subtract / compare, typed. Family: Stories. Oracles: add, subtract.

function storyExplanation(a: number, b: number, plus: boolean, why: string): Explanation {
  const answer = plus ? a + b : a - b;
  return together([line(why), line(a, plus ? 'plus' : 'minus', b, 'is', answer, '.')], equation(a, plus ? '+' : '-', b, '=', answer));
}
const WHY: Record<string, string> = { gets: 'Getting more means add.', table: 'In all means add.', givesAway: 'Giving away means subtract.', takes: 'Taking away means subtract.', compare: 'How many more means subtract.' };

function wordProblem(level: Level, rng: Rng): QuestionDraft {
  const kind: StoryKind = level === 1 ? rng.pick<StoryKind>(['gets', 'table']) : level === 2 ? rng.pick<StoryKind>(['givesAway', 'takes']) : 'compare';
  const plus = level === 1;
  const [name, name2] = rng.sample(STORY_NAMES, 2) as [string, string];
  const thing = rng.pick(STORY_COUNTABLES);
  // Two-digit numbers, with at most one new ten or one ten broken up.
  let a: number;
  let b: number;
  for (;;) {
    a = plus ? rng.int(12, 80) : rng.int(25, 99);
    b = rng.int(11, plus ? 99 - a : a - 5);
    if (b <= (plus ? 99 - a : a - 5) && (plus ? carries(a, b) : borrows(a, b)).length <= 1) break;
  }
  const told: Told = level === 3 ? { kind, name, name2, thing, a, b } : { kind, name, thing, a, b };
  const answer = plus ? a + b : a - b;
  const named = kind !== 'table';
  const facts: QuestionDraft['facts'] = { a, b, thing: thing.one, story: kind, oracle: plus ? 'add' : 'subtract', ...(named ? { name } : {}), ...(level === 3 ? { name2 } : {}) };
  const base = { mode: 'look' as const, prompt: tellStory(told), explanation: storyExplanation(a, b, plus, WHY[kind] as string) };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer, maxDigits: 2 };
  // The slips: the other operation, ten out, or one off.
  const values = numeralChoices(answer, [plus ? Math.abs(a - b) : a + b, answer - 10, answer + 10], 0, 120, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

const APPLE = STORY_COUNTABLES[0]!;

export const wordProblems100Generator: SkillGenerator = {
  skillId: 'M-2-B9',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables', 'storyProblems'],
  generate: wordProblem,
  exampleSeed: 219,
  example: () => wordProblem(1, makeRng(219)),
  lesson: (): LessonStep[] => {
    const add: Told = { kind: 'gets', name: 'Sam', thing: APPLE, a: 24, b: 15 };
    const take: Told = { kind: 'givesAway', name: 'Mia', thing: APPLE, a: 48, b: 12 };
    return [
      { beat: 'see', text: 'A story tells us what to do. Getting more means add. Giving away means subtract.', speak: ['A story tells us what to do. Getting more means add. Giving away means subtract.'], visual: equation(24, '+', 15) },
      { beat: 'watch', text: `${tellStory(add).text} ${storyExplanation(24, 15, true, WHY.gets as string).steps.join(' ')}`, speak: [...tellStory(add).speak, ...storyExplanation(24, 15, true, WHY.gets as string).speak], visual: equation(24, '+', 15, '=', 39) },
      { beat: 'try', text: tellStory(take).text, speak: tellStory(take).speak, visual: equation(48, '-', 12, '=', 'blank'), reveal: { text: storyExplanation(48, 12, false, WHY.givesAway as string).steps.join(' '), speak: storyExplanation(48, 12, false, WHY.givesAway as string).speak, visual: equation(48, '-', 12, '=', 36) } },
      { beat: 'remember', text: 'Listen for joining or taking away.', speak: ['Listen for joining or taking away.'], visual: equation(48, '-', 12, '=', 36) },
    ];
  },
  oracle: 'add',
};

// ---- B.10 Two-step word problems ----
// Levels: add then add / add then subtract. Family: Two-step stories. Oracle: twoStep.

function twoStepExplanation(a: number, b: number, c: number, plus: boolean): Explanation {
  const first = a + b;
  const answer = plus ? first + c : first - c;
  return together(
    [line('First step:', a, 'plus', b, 'is', first, '.'), line('Second step:', first, plus ? 'plus' : 'minus', c, 'is', answer, '.')],
    { kind: 'row', children: [equation(a, '+', b, '=', first), equation(first, plus ? '+' : '-', c, '=', answer)] },
  );
}

function twoStepProblem(level: Level, rng: Rng): QuestionDraft {
  const plus = level === 1;
  const a = rng.int(5, 30);
  const b = rng.int(2, 20);
  const c = plus ? rng.int(2, 20) : rng.int(2, Math.min(20, a + b - 1));
  const told: Told = { kind: plus ? 'addAdd' : 'addSub', name: rng.pick(STORY_NAMES), thing: rng.pick(STORY_COUNTABLES), a, b, c };
  const answer = plus ? a + b + c : a + b - c;
  return {
    type: 'numberPad',
    mode: 'look',
    facts: { a, op1: '+', b, op2: plus ? '+' : '-', c, name: told.name, thing: told.thing.one, story: told.kind },
    prompt: tellStory(told),
    answer,
    maxDigits: 2,
    explanation: twoStepExplanation(a, b, c, plus),
  };
}

export const twoStepGenerator: SkillGenerator = {
  skillId: 'M-2-B10',
  maxLevel: 2,
  itemTypes: ['numberPad'],
  lists: ['countables', 'storyProblems'],
  generate: twoStepProblem,
  exampleSeed: 220,
  example: () => twoStepProblem(1, makeRng(220)),
  lesson: (): LessonStep[] => {
    const add: Told = { kind: 'addAdd', name: 'Leo', thing: APPLE, a: 6, b: 4, c: 3 };
    const sub: Told = { kind: 'addSub', name: 'Ava', thing: APPLE, a: 8, b: 5, c: 2 };
    return [
      { beat: 'see', text: 'Some stories have two steps. Do one step at a time.', speak: ['Some stories have two steps. Do one step at a time.'], visual: equation(6, '+', 4, '+', 3) },
      { beat: 'watch', text: `${tellStory(add).text} ${twoStepExplanation(6, 4, 3, true).steps.join(' ')}`, speak: [...tellStory(add).speak, ...twoStepExplanation(6, 4, 3, true).speak], visual: twoStepExplanation(6, 4, 3, true).visual },
      { beat: 'try', text: tellStory(sub).text, speak: tellStory(sub).speak, visual: equation(8, '+', 5, '-', 2, '=', 'blank'), reveal: { text: twoStepExplanation(8, 5, 2, false).steps.join(' '), speak: twoStepExplanation(8, 5, 2, false).speak, visual: twoStepExplanation(8, 5, 2, false).visual } },
      { beat: 'remember', text: 'One step, then the next.', speak: ['One step, then the next.'], visual: twoStepExplanation(6, 4, 3, true).visual },
    ];
  },
  oracle: 'twoStep',
};
