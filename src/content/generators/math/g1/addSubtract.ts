import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import type { Line, Shown as Explanation } from './wording';
import { explain, hintFor } from './wording';

// Math grade 1 B.1, B.2, B.3 and B.7: adding and subtracting within 20, doubles, and three numbers.
// From grade 1 the word is "minus", not "take away". A sum is asked "What is 9 plus 7?".

const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });

// ---- B.1 Add within 20 ----
// Levels: sums to 12 / to 20 / typed. Family: Add. Oracle: add.

// Its first step, "Start at 9.", is the hint: a real move, and never the answer.
export function countOnExplanation(a: number, b: number): Explanation {
  const [bigger, smaller] = [Math.max(a, b), Math.min(a, b)];
  const counted = Array.from({ length: smaller }, (_, i) => bigger + i + 1);
  return explain([`Start at ${bigger}.`, `Count on ${smaller} more: ${listText(counted)}.`, `${a} + ${b} = ${a + b}.`], equation(a, '+', b, '=', a + b));
}

export function plusPrompt(a: number, b: number): { text: string; speak: Say } {
  return { text: `What is ${a} plus ${b}?`, speak: ['What is', { number: a }, 'plus', { number: b }, '?'] };
}

function addQuestion(a: number, b: number, typed: boolean, explanation: Explanation, rng: Rng): QuestionDraft {
  const sum = a + b;
  const base = { mode: 'look' as const, prompt: plusPrompt(a, b), stimulus: equation(a, '+', b, '=', 'blank'), explanation };
  if (typed) return { ...base, type: 'numberPad', facts: { a, b }, answer: sum, maxDigits: 2 };
  // The slips: one off, the minus answer, or ten out.
  const values = numeralChoices(sum, [Math.abs(a - b), sum - 10, sum + 10], 1, 30, rng);
  return { ...base, type: 'choice', facts: { a, b, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(sum) };
}

// Two numbers of at least `least` each that add up to a sum from lo to hi, neither above 10.
function parts(lo: number, hi: number, rng: Rng): [number, number] {
  for (;;) {
    const sum = rng.int(lo, hi);
    const a = rng.int(2, 10);
    const b = sum - a;
    if (b >= 2 && b <= 10) return [a, b];
  }
}

function addWithin20(level: Level, rng: Rng): QuestionDraft {
  const [a, b] = level === 1 ? parts(8, 12, rng) : level === 2 ? parts(11, 20, rng) : parts(8, 20, rng);
  return addQuestion(a, b, level === 3, countOnExplanation(a, b), rng);
}

export const addWithin20Generator: SkillGenerator = {
  skillId: 'M-1-B1',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: addWithin20,
  exampleSeed: 111,
  example: () => addWithin20(1, makeRng(111)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To add, start with the bigger number and count on.', speak: ['To add, start with the bigger number and count on.'], visual: { kind: 'numberLine', min: 0, max: 20, step: 1, marked: [8] } },
    { beat: 'watch', text: `8 plus 3. ${countOnExplanation(8, 3).steps.slice(0, 2).join(' ')}`, speak: [{ number: 8 }, 'plus', { number: 3 }, '.', ...countOnExplanation(8, 3).speak], visual: equation(8, '+', 3, '=', 11) },
    { beat: 'try', text: plusPrompt(4, 9).text, speak: plusPrompt(4, 9).speak, visual: equation(4, '+', 9, '=', 'blank'), reveal: { text: countOnExplanation(4, 9).steps.slice(0, 2).join(' '), speak: countOnExplanation(4, 9).speak, visual: equation(4, '+', 9, '=', 13) } },
    { beat: 'remember', text: 'Start with the bigger number.', speak: ['Start with the bigger number.'], visual: { kind: 'numberLine', min: 0, max: 20, step: 1 } },
  ],
  oracle: 'add',
};

// ---- B.2 Subtract within 20 ----
// Levels: from 12 or less / from 20 or less / typed. Family: Subtract. Oracle: subtract.

// The steps show a way to take away, by what the numbers allow: count back a small number; go down to 10 when
// the ones run out; take from the ones when they do not; think of adding when both are 10 or less.
export function minusExplanation(a: number, b: number): Explanation {
  const left = a - b;
  const visual = equation(a, '-', b, '=', left);
  const ones = a - 10; // the ones of a number from 11 to 20 (20 is 10 and 10)
  let lines: Line[];
  let hint: { text: string };
  if (b <= 3) {
    const back = Array.from({ length: b }, (_, i) => a - i - 1);
    lines = [`Start at ${a}.`, `Count back ${b}: ${listText(back)}.`, `${a} − ${b} = ${left}.`];
    hint = hintFor(left, `Start at ${a} and count back ${b}.`, `Start at ${a} and count back.`);
  } else if (a > 10 && b > ones) {
    const rest = b - ones;
    lines = [`Start at ${a}.`, `Take away ${ones} to get to 10: ${a} − ${ones} = 10.`, `Take away ${rest} more: 10 − ${rest} = ${left}.`, `So ${a} − ${b} = ${left}.`];
    hint = hintFor(left, `Take away ${ones} first to get to 10.`, 'Take away just enough to get to 10 first.');
  } else if (a > 10) {
    lines = [`${a} is 10 and ${ones}.`, `Take away from the ${ones}: ${ones} − ${b} = ${ones - b}.`, `10 and ${ones - b} make ${left}.`];
    hint = hintFor(left, 'Take away from the ones. The 10 stays.', 'Take away from the ones first.');
  } else {
    lines = [`Think: ${b} plus what makes ${a}?`, `${b} + ${left} = ${a}.`, `So ${a} − ${b} = ${left}.`];
    hint = hintFor(left, `Think: ${b} plus what makes ${a}?`, 'Count up from the number you take away to the first number.');
  }
  return explain(lines, visual, hint);
}

export function minusPrompt(a: number, b: number): { text: string; speak: Say } {
  return { text: `What is ${a} minus ${b}?`, speak: ['What is', { number: a }, 'minus', { number: b }, '?'] };
}

function subtractWithin20(level: Level, rng: Rng): QuestionDraft {
  const a = level === 1 ? rng.int(6, 12) : level === 2 ? rng.int(13, 20) : rng.int(6, 20);
  // Something is taken, and something is left.
  const b = rng.int(2, Math.min(a - 1, 10));
  const left = a - b;
  const base = { mode: 'look' as const, prompt: minusPrompt(a, b), stimulus: equation(a, '-', b, '=', 'blank'), explanation: minusExplanation(a, b) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { a, b }, answer: left, maxDigits: 2 };
  // The slips: one off, the plus answer, or a number from the question said again.
  const values = numeralChoices(left, [a + b, b, left + 10], 0, 30, rng);
  return { ...base, type: 'choice', facts: { a, b, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(left) };
}

export const subtractWithin20Generator: SkillGenerator = {
  skillId: 'M-1-B2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: subtractWithin20,
  exampleSeed: 112,
  example: () => subtractWithin20(1, makeRng(112)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Minus means take away. 9 minus 2 is 7.', speak: ['Minus means take away.', { number: 9 }, 'minus', { number: 2 }, 'is', { number: 7 }, '.'], visual: { kind: 'emojiGroup', emoji: '⚫', count: 9, layout: 'grid5', crossed: 2 } },
    { beat: 'watch', text: `11 minus 3. ${minusExplanation(11, 3).steps.join(' ')}`, speak: [{ number: 11 }, 'minus', { number: 3 }, '.', ...minusExplanation(11, 3).speak], visual: equation(11, '-', 3, '=', 8) },
    { beat: 'try', text: minusPrompt(14, 5).text, speak: minusPrompt(14, 5).speak, visual: equation(14, '-', 5, '=', 'blank'), reveal: { text: minusExplanation(14, 5).steps.join(' '), speak: minusExplanation(14, 5).speak, visual: equation(14, '-', 5, '=', 9) } },
    { beat: 'remember', text: 'Subtracting takes some away.', speak: ['Subtracting takes some away.'], visual: equation(11, '-', 3, '=', 8) },
  ],
  oracle: 'subtract',
};

// ---- B.3 Doubles and near doubles ----
// Levels: doubles to 5 plus 5 / to 10 plus 10 / near doubles, typed. Family: Doubles. Oracle: add.

// Said as doubles ("Double 7 is 14."), never "two groups of", which is times-table talk. A near double first says
// how its bigger number is the smaller one and 1 more.
function doublesExplanation(a: number, b: number): Explanation {
  const [small, big] = [Math.min(a, b), Math.max(a, b)];
  const visual = equation(a, '+', b, '=', a + b);
  if (a === b) return explain([`${a} + ${a} is a double: two ${a}s.`, `Double ${a} is ${a * 2}.`], visual, { text: `It is a double. Start at ${a} and count on ${a}.` });
  return explain([`${big} is ${small} and 1 more.`, `Double ${small} is ${small * 2}.`, `1 more is ${a + b}.`], visual, { text: `Find the double inside: ${small} + ${small}.` });
}

function doubles(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    // Near doubles: 6 plus 7 is double 6 and one more. Either number may come first.
    const small = rng.int(2, 9);
    const [a, b] = rng.bool() ? [small, small + 1] : [small + 1, small];
    return addQuestion(a, b, true, doublesExplanation(a, b), rng);
  }
  const a = level === 1 ? rng.int(1, 5) : rng.int(6, 10);
  return addQuestion(a, a, false, doublesExplanation(a, a), rng);
}

export const doublesGenerator: SkillGenerator = {
  skillId: 'M-1-B3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  pool: { 1: 5, 2: 5 }, // one double for each number
  generate: doubles,
  exampleSeed: 113,
  example: () => doubles(1, makeRng(113)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A double is a number added to itself. 3 plus 3 is 6.', speak: ['A double is a number added to itself.', { number: 3 }, 'plus', { number: 3 }, 'is', { number: 6 }, '.'], visual: { kind: 'emojiGroup', emoji: '🔴', count: 3, layout: 'row', emoji2: '🔵', count2: 3 } },
    { beat: 'watch', text: `4 plus 4. ${doublesExplanation(4, 4).steps.join(' ')}`, speak: [{ number: 4 }, 'plus', { number: 4 }, '.', ...doublesExplanation(4, 4).speak], visual: equation(4, '+', 4, '=', 8) },
    { beat: 'try', text: plusPrompt(6, 7).text, speak: plusPrompt(6, 7).speak, visual: equation(6, '+', 7, '=', 'blank'), reveal: { text: doublesExplanation(6, 7).steps.join(' '), speak: doublesExplanation(6, 7).speak, visual: equation(6, '+', 7, '=', 13) } },
    { beat: 'remember', text: 'Doubles are two of the same.', speak: ['Doubles are two of the same.'], visual: equation(5, '+', 5, '=', 10) },
  ],
  oracle: 'add',
};

// ---- B.7 Add three numbers ----
// Levels: sums to 10 / to 20 with a ten pair / typed. Oracle: add, with a third number.

function threeExplanation(numbers: [number, number, number]): Explanation {
  const [a, b, c] = numbers;
  const sum = a + b + c;
  const visual = equation(a, '+', b, '+', c, '=', sum);
  // A pair that makes ten is added first.
  const pairs: [number, number, number][] = [
    [a, b, c],
    [a, c, b],
    [b, c, a],
  ];
  const ten = pairs.find(([x, y]) => x + y === 10);
  if (ten) {
    const [x, y, z] = ten;
    return {
      speak: ['Find a pair that makes', { number: 10 }, '.', { number: x }, 'and', { number: y }, 'make', { number: 10 }, '.', { number: 10 }, 'plus', { number: z }, 'is', { number: sum }, '.'],
      steps: ['Find a pair that makes 10.', `${x} and ${y} make 10.`, `10 plus ${z} is ${sum}.`],
      visual,
    };
  }
  return {
    speak: ['Add two numbers first.', { number: a }, 'plus', { number: b }, 'is', { number: a + b }, '. Then', { number: a + b }, 'plus', { number: c }, 'is', { number: sum }, '.'],
    steps: ['Add two numbers first.', `${a} plus ${b} is ${a + b}.`, `Then ${a + b} plus ${c} is ${sum}.`],
    visual,
  };
}

function threePrompt([a, b, c]: [number, number, number]): { text: string; speak: Say } {
  return { text: `What is ${a} plus ${b} plus ${c}?`, speak: ['What is', { number: a }, 'plus', { number: b }, 'plus', { number: c }, '?'] };
}

function threeNumbers(level: Level, rng: Rng): [number, number, number] {
  // Level 2, and half of level 3: two of the three make ten.
  if (level === 2 || (level === 3 && rng.bool())) {
    const x = rng.int(1, 9);
    return rng.shuffle([x, 10 - x, rng.int(1, 9)]) as [number, number, number];
  }
  for (;;) {
    const numbers = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)] as [number, number, number];
    const sum = numbers[0] + numbers[1] + numbers[2];
    if (level === 1 ? sum >= 5 && sum <= 10 : sum >= 8 && sum <= 18) return numbers;
  }
}

function addThree(level: Level, rng: Rng): QuestionDraft {
  const numbers = threeNumbers(level, rng);
  const [a, b, c] = numbers;
  const sum = a + b + c;
  const base = { mode: 'look' as const, prompt: threePrompt(numbers), stimulus: equation(a, '+', b, '+', c, '=', 'blank'), explanation: threeExplanation(numbers) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { a, b, c }, answer: sum, maxDigits: 2 };
  // The slips: one off, or only two of the three added.
  const values = numeralChoices(sum, [a + b, b + c, a + c], 1, 30, rng);
  return { ...base, type: 'choice', facts: { a, b, c, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(sum) };
}

export const addThreeGenerator: SkillGenerator = {
  skillId: 'M-1-B7',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: addThree,
  exampleSeed: 117,
  example: () => addThree(1, makeRng(117)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Three numbers can be added in any order. Add two first, then the third.', speak: ['Three numbers can be added in any order. Add two first, then the third.'], visual: equation(2, '+', 3, '+', 4) },
    { beat: 'watch', text: threeExplanation([2, 3, 4]).steps.join(' '), speak: threeExplanation([2, 3, 4]).speak, visual: equation(2, '+', 3, '+', 4, '=', 9) },
    { beat: 'try', text: threePrompt([7, 5, 3]).text, speak: threePrompt([7, 5, 3]).speak, visual: equation(7, '+', 5, '+', 3, '=', 'blank'), reveal: { text: threeExplanation([7, 5, 3]).steps.join(' '), speak: threeExplanation([7, 5, 3]).speak, visual: equation(7, '+', 5, '+', 3, '=', 15) } },
    { beat: 'remember', text: 'Look for a pair that makes ten.', speak: ['Look for a pair that makes ten.'], visual: equation(7, '+', 3, '=', 10) },
  ],
  oracle: 'add',
};
