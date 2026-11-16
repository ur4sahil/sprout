import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';

// Math grade 1 A.3 and A.4: tens and ones, and comparing two-digit numbers.

type Explanation = { speak: Say; steps: string[]; visual: Visual };

// ---- A.3 Tens and ones ----
// Levels: blocks to numeral, to 30 / to 99 / typed / "how many tens in 47", typed. Oracle: place.

const blocks = (n: number): Visual => ({ kind: 'baseTen', hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 });
const tensWord = (tens: number): string => (tens === 1 ? 'ten' : 'tens');

function blocksExplanation(n: number): Explanation {
  const [tens, ones] = [Math.floor(n / 10), n % 10];
  const first: Say = [{ number: tens }, `${tensWord(tens)} is`, { number: tens * 10 }, '.'];
  const firstText = `${tens} ${tensWord(tens)} is ${tens * 10}.`;
  if (ones === 0) return { speak: [...first, 'There are no ones.'], steps: [firstText, 'There are no ones.'], visual: blocks(n) };
  const more = ones === 1 ? 'more one makes' : 'more ones makes';
  return { speak: [...first, { number: ones }, more, { number: n }, '.'], steps: [firstText, `${ones} ${more} ${n}.`], visual: blocks(n) };
}

const WHAT_NUMBER = 'What number is this?';

function tensAndOnes(level: Level, rng: Rng): QuestionDraft {
  const n = level === 1 ? rng.int(11, 30) : level === 2 ? rng.int(31, 99) : rng.int(11, 99);
  const [tens, ones] = [Math.floor(n / 10), n % 10];
  const digits = { hundreds: 0, tens, ones };
  if (level === 4) {
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { ...digits, ask: 'tensDigit' },
      prompt: { text: `How many tens are in ${n}?`, speak: ['How many tens are in', { number: n }, '?'] },
      stimulus: numeral(n),
      answer: tens,
      maxDigits: 1,
      explanation: {
        speak: [{ number: n }, 'is', { number: tens }, `${tensWord(tens)} and`, { number: ones }, ones === 1 ? 'one.' : 'ones.'],
        steps: [`${n} is ${tens} ${tensWord(tens)} and ${ones} ${ones === 1 ? 'one' : 'ones'}.`],
        visual: blocks(n),
      },
    };
  }
  const base = { mode: 'look' as const, prompt: { text: WHAT_NUMBER, speak: [WHAT_NUMBER] as Say }, stimulus: blocks(n), explanation: blocksExplanation(n) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { ...digits, ask: 'number' }, answer: n, maxDigits: 2 };
  // The slips: the digits the wrong way round, the blocks counted one by one, or one ten out.
  const values = numeralChoices(n, [ones * 10 + tens, tens + ones, n + 10, n - 10], 1, 109, rng);
  return { ...base, type: 'choice', facts: { ...digits, ask: 'number', options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(n) };
}

export const tensAndOnesGenerator: SkillGenerator = {
  skillId: 'M-1-A3',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: tensAndOnes,
  exampleSeed: 103,
  example: () => tensAndOnes(1, makeRng(103)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A long block is one ten. A small block is one.', speak: ['A long block is one ten. A small block is one.'], visual: blocks(11) },
    { beat: 'watch', text: blocksExplanation(23).steps.join(' '), speak: blocksExplanation(23).speak, visual: blocks(23) },
    { beat: 'try', text: WHAT_NUMBER, speak: [WHAT_NUMBER], visual: blocks(35), reveal: { text: blocksExplanation(35).steps.join(' '), speak: blocksExplanation(35).speak, visual: blocks(35) } },
    { beat: 'remember', text: 'Count tens first, then ones.', speak: ['Count tens first, then ones.'], visual: blocks(23) },
  ],
  oracle: 'place',
};

// ---- A.4 Compare two-digit numbers ----
// Levels: greater of two, different tens / same tens / pick the sign: greater, less, equal. Oracle: compare.

type Ask = 'most' | 'least';
const SIGNS = ['>', '<', '='] as const;
const SIGN_WORDS: Record<string, string> = { '>': 'is greater than', '<': 'is less than', '=': 'is equal to' };

function compareExplanation(a: number, b: number, ask: Ask = 'most'): Explanation {
  const visual: Visual = { kind: 'equation', parts: [a, a > b ? '>' : a < b ? '<' : '=', b] };
  if (a === b) return { speak: [{ number: a }, 'and', { number: b }, 'are the same number. They are equal.'], steps: [`${a} and ${b} are the same number.`, 'They are equal.'], visual };
  const [big, small] = a > b ? [a, b] : [b, a];
  const sameTens = Math.floor(a / 10) === Math.floor(b / 10);
  const look = sameTens ? 'The tens are the same. Look at the ones.' : 'Look at the biggest place first.';
  const place = sameTens ? 'ones' : 'tens';
  // Asked for the smaller number, the last line names it.
  const last: Say = ask === 'most' ? [{ number: big }, 'is greater than', { number: small }, '.'] : [{ number: small }, 'is less than', { number: big }, '.'];
  const lastText = ask === 'most' ? `${big} is greater than ${small}.` : `${small} is less than ${big}.`;
  return { speak: [look, { number: big }, `has more ${place}.`, ...last], steps: [look, `${big} has more ${place}.`, lastText], visual };
}

function twoDigit(level: Level, rng: Rng): [number, number] {
  for (;;) {
    const a = rng.int(10, 99);
    // Same tens at level 2. Different tens at level 1. Either at level 3.
    const b = level === 2 ? Math.floor(a / 10) * 10 + rng.int(0, 9) : rng.int(10, 99);
    if (a === b) continue;
    if (level === 1 && Math.floor(a / 10) === Math.floor(b / 10)) continue;
    return [a, b];
  }
}

function compareTwoDigit(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    // One time in five the two numbers are the same.
    const [a, other] = twoDigit(3, rng);
    const b = rng.bool(0.2) ? a : other;
    const answer = a > b ? '>' : a < b ? '<' : '=';
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { values: [a, b], ask: 'sign', options: [...SIGNS] },
      prompt: { text: `Which sign goes between ${a} and ${b}?`, speak: ['Which sign goes between', { number: a }, 'and', { number: b }, '?'] },
      stimulus: { kind: 'equation', parts: [a, 'blank', b] },
      options: SIGNS.map((sign): Visual => ({ kind: 'text', value: sign, size: 'xl', speak: [SIGN_WORDS[sign] as string] })),
      answerIndex: SIGNS.indexOf(answer),
      explanation: compareExplanation(a, b),
    };
  }
  const values = twoDigit(level, rng);
  const ask = rng.pick<Ask>(['most', 'least']);
  const wanted = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const prompt = ask === 'most' ? 'Which number is greater?' : 'Which number is less?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, options: values },
    prompt: { text: prompt, speak: [prompt] },
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(wanted),
    explanation: compareExplanation(values[0], values[1], ask),
  };
}

export const compareTwoDigitGenerator: SkillGenerator = {
  skillId: 'M-1-A4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: compareTwoDigit,
  exampleSeed: 104,
  example: () => compareTwoDigit(1, makeRng(104)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To compare two numbers, look at the tens first.', speak: ['To compare two numbers, look at the tens first.'], visual: { kind: 'row', children: [numeral(52), numeral(38)] } },
    { beat: 'watch', text: compareExplanation(52, 38).steps.join(' '), speak: compareExplanation(52, 38).speak, visual: compareExplanation(52, 38).visual },
    {
      beat: 'try',
      text: 'Which number is greater?',
      speak: ['Which number is greater?'],
      visual: { kind: 'row', children: [numeral(64), numeral(67)] },
      reveal: { text: compareExplanation(64, 67).steps.join(' '), speak: compareExplanation(64, 67).speak, visual: compareExplanation(64, 67).visual },
    },
    { beat: 'remember', text: 'Compare the biggest place first.', speak: ['Compare the biggest place first.'], visual: compareExplanation(52, 38).visual },
  ],
  oracle: 'compare',
};
