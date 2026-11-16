import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Blank, LessonStep, Level, QuestionDraft, Say, SortBin, Visual } from '../../../../engine/types';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';

// Math grade 2 A.1 to A.6: place value to 999, expanded form, comparing, skip counting, even and odd, number lines.

type Explanation = { speak: Say; steps: string[]; visual: Visual };
const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });
const digitsOf = (n: number): { hundreds: number; tens: number; ones: number } => ({ hundreds: Math.floor(n / 100), tens: Math.floor((n % 100) / 10), ones: n % 10 });
const blocks = (n: number): Visual => ({ kind: 'baseTen', ...digitsOf(n) });
const many = (count: number, one: string): string => `${count} ${count === 1 ? one : `${one}s`}`;

// ---- A.1 Hundreds, tens, ones ----
// Levels: blocks to numeral to 199 / to 999 / typed / choice: value of a digit. Oracle: place.

function blocksExplanation(n: number): Explanation {
  const { hundreds, tens, ones } = digitsOf(n);
  const speak: Say = [{ number: hundreds }, hundreds === 1 ? 'hundred is' : 'hundreds is', { number: hundreds * 100 }, '.'];
  const steps = [`${many(hundreds, 'hundred')} is ${hundreds * 100}.`];
  if (tens > 0) {
    speak.push({ number: tens }, tens === 1 ? 'ten is' : 'tens is', { number: tens * 10 }, '.');
    steps.push(`${many(tens, 'ten')} is ${tens * 10}.`);
  }
  if (ones > 0) {
    speak.push({ number: ones }, ones === 1 ? 'one.' : 'ones.');
    steps.push(`${many(ones, 'one')}.`);
  }
  speak.push('That makes', { number: n }, '.');
  steps.push(`That makes ${n}.`);
  return { speak, steps, visual: blocks(n) };
}

const WHAT_NUMBER = 'What number is this?';
const PLACES = ['hundreds', 'tens', 'ones'] as const;

function hundredsTensOnes(level: Level, rng: Rng): QuestionDraft {
  const n = level === 1 ? rng.int(101, 199) : rng.int(200, 999);
  const digits = digitsOf(n);
  if (level === 4) {
    // The value of one digit: the 4 in 347 is worth 40. A zero is never asked about.
    const place = rng.pick(PLACES.filter((each) => digits[each] > 0));
    const digit = digits[place];
    const worth = digit * (place === 'hundreds' ? 100 : place === 'tens' ? 10 : 1);
    const values = [digit, digit * 10, digit * 100];
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ...digits, ask: `${place}Value`, options: values },
      prompt: { text: `What is the ${digit} worth in ${n}?`, speak: ['What is the', { number: digit }, 'worth in', { number: n }, '?'] },
      stimulus: numeral(n),
      options: values.map((value) => numeral(value, 'l')),
      answerIndex: values.indexOf(worth),
      explanation: { speak: ['The', { number: digit }, `is in the ${place} place. It is worth`, { number: worth }, '.'], steps: [`The ${digit} is in the ${place} place.`, `It is worth ${worth}.`], visual: blocks(n) },
    };
  }
  const base = { mode: 'look' as const, prompt: { text: WHAT_NUMBER, speak: [WHAT_NUMBER] as Say }, stimulus: blocks(n), explanation: blocksExplanation(n) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { ...digits, ask: 'number' }, answer: n, maxDigits: 3 };
  // The slips: two digits the wrong way round, or one ten or one hundred out.
  const swapped = digits.hundreds * 100 + digits.ones * 10 + digits.tens;
  const values = numeralChoices(n, [swapped, n + 10, n - 10, n + 100, n - 100], 100, 999, rng);
  return { ...base, type: 'choice', facts: { ...digits, ask: 'number', options: values }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(n) };
}

export const hundredsTensOnesGenerator: SkillGenerator = {
  skillId: 'M-2-A1',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: hundredsTensOnes,
  exampleSeed: 201,
  example: () => hundredsTensOnes(1, makeRng(201)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A big square block is one hundred. A long block is one ten. A small block is one.', speak: ['A big square block is one hundred. A long block is one ten. A small block is one.'], visual: blocks(111) },
    { beat: 'watch', text: blocksExplanation(124).steps.join(' '), speak: blocksExplanation(124).speak, visual: blocks(124) },
    { beat: 'try', text: WHAT_NUMBER, speak: [WHAT_NUMBER], visual: blocks(235), reveal: { text: blocksExplanation(235).steps.join(' '), speak: blocksExplanation(235).speak, visual: blocks(235) } },
    { beat: 'remember', text: 'Hundreds, then tens, then ones.', speak: ['Hundreds, then tens, then ones.'], visual: blocks(124) },
  ],
  oracle: 'place',
};

// ---- A.2 Expanded form ----
// Levels: 300 plus 40 plus 2 to numeral / numeral to expanded / with zeros, typed. Oracle: place.

const expandedParts = (n: number): number[] => {
  const { hundreds, tens, ones } = digitsOf(n);
  return [hundreds * 100, tens * 10, ones].filter((part) => part > 0);
};
const expandedText = (parts: number[]): string => parts.join(' + ');
const expandedVisual = (parts: number[], last: number | 'blank' | null): Visual => equation(...parts.flatMap((part, i) => (i === 0 ? [part] : ['+', part])), ...(last === null ? [] : ['=', last]));
const expandedSpeak = (parts: number[]): Say => parts.flatMap((part, i): Say => (i === 0 ? [{ number: part }] : ['plus', { number: part }]));

function expandedExplanation(n: number): Explanation {
  const { hundreds, tens, ones } = digitsOf(n);
  return {
    speak: [{ number: hundreds }, hundreds === 1 ? 'hundred,' : 'hundreds,', { number: tens }, tens === 1 ? 'ten and' : 'tens and', { number: ones }, ones === 1 ? 'one is' : 'ones is', { number: n }, '.'],
    steps: [`${many(hundreds, 'hundred')}, ${many(tens, 'ten')} and ${many(ones, 'one')} is ${n}.`],
    visual: expandedVisual(expandedParts(n), n),
  };
}

function expandedForm(level: Level, rng: Rng): QuestionDraft {
  const digits = { hundreds: rng.int(1, 9), tens: rng.int(1, 9), ones: rng.int(1, 9) };
  if (level === 3) {
    // One zero: 506 is 500 plus 6, and 340 is 300 plus 40.
    if (rng.bool()) digits.tens = 0;
    else digits.ones = 0;
  }
  const n = digits.hundreds * 100 + digits.tens * 10 + digits.ones;
  const parts = expandedParts(n);
  const sumPrompt = { text: `${parts.join(' plus ')} is what number?`, speak: [...expandedSpeak(parts), 'is what number?'] as Say };
  if (level === 3) return { type: 'numberPad', mode: 'look', facts: { ...digits, ask: 'number' }, prompt: sumPrompt, stimulus: expandedVisual(parts, 'blank'), answer: n, maxDigits: 3, explanation: expandedExplanation(n) };
  if (level === 1) {
    // The slips: the parts read as digits in the wrong places, or one part left out.
    const values = numeralChoices(n, [digits.hundreds * 100 + digits.ones * 10 + digits.tens, digits.hundreds * 10 + digits.tens + digits.ones, n - digits.ones], 1, 999, rng);
    return { type: 'choice', mode: 'look', facts: { ...digits, ask: 'number', options: values }, prompt: sumPrompt, stimulus: expandedVisual(parts, 'blank'), options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(n), explanation: expandedExplanation(n) };
  }
  // Numeral to expanded form. The slips: a digit given the wrong worth.
  const wrong = [
    [digits.hundreds * 10, digits.tens * 10, digits.ones],
    [digits.hundreds * 100, digits.tens, digits.ones],
    [digits.hundreds * 100, digits.tens * 100, digits.ones],
  ];
  const options = rng.shuffle([parts, ...rng.sample(wrong, 2)]);
  const prompt = `Which one is the same as ${n}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ...digits, ask: 'expanded', options: options.map(expandedText) },
    prompt: { text: prompt, speak: ['Which one is the same as', { number: n }, '?'] },
    stimulus: numeral(n),
    options: options.map((each): Visual => ({ kind: 'text', value: expandedText(each), size: 'l', speak: expandedSpeak(each) })),
    answerIndex: options.indexOf(parts),
    explanation: expandedExplanation(n),
  };
}

export const expandedFormGenerator: SkillGenerator = {
  skillId: 'M-2-A2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: expandedForm,
  exampleSeed: 202,
  example: () => expandedForm(1, makeRng(202)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A number can be written as its hundreds, tens and ones added up.', speak: ['A number can be written as its hundreds, tens and ones added up.'], visual: expandedVisual([300, 40, 2], 342) },
    { beat: 'watch', text: expandedExplanation(342).steps.join(' '), speak: expandedExplanation(342).speak, visual: blocks(342) },
    { beat: 'try', text: '200 plus 50 plus 6 is what number?', speak: [...expandedSpeak([200, 50, 6]), 'is what number?'], visual: expandedVisual([200, 50, 6], 'blank'), reveal: { text: expandedExplanation(256).steps.join(' '), speak: expandedExplanation(256).speak, visual: expandedVisual([200, 50, 6], 256) } },
    { beat: 'remember', text: 'Each digit has its own place.', speak: ['Each digit has its own place.'], visual: expandedVisual([300, 40, 2], 342) },
  ],
  oracle: 'place',
};

// ---- A.3 Compare three-digit numbers ----
// Levels: different hundreds / same hundreds / pick the sign. Family: Compare with signs. Oracle: compare.

type Ask = 'most' | 'least';
const SIGNS = ['>', '<', '='] as const;
const SIGN_WORDS: Record<string, string> = { '>': 'is greater than', '<': 'is less than', '=': 'is equal to' };

function compareExplanation(a: number, b: number, ask: Ask = 'most'): Explanation {
  const visual = equation(a, a > b ? '>' : a < b ? '<' : '=', b);
  if (a === b) return { speak: [{ number: a }, 'and', { number: b }, 'are the same number. They are equal.'], steps: [`${a} and ${b} are the same number.`, 'They are equal.'], visual };
  const [big, small] = a > b ? [a, b] : [b, a];
  const [x, y] = [digitsOf(big), digitsOf(small)];
  const place = x.hundreds !== y.hundreds ? 'hundreds' : x.tens !== y.tens ? 'tens' : 'ones';
  const look = place === 'hundreds' ? 'Look at the biggest place first.' : place === 'tens' ? 'The hundreds are the same. Look at the tens.' : 'The hundreds and tens are the same. Look at the ones.';
  const last: Say = ask === 'most' ? [{ number: big }, 'is greater than', { number: small }, '.'] : [{ number: small }, 'is less than', { number: big }, '.'];
  const lastText = ask === 'most' ? `${big} is greater than ${small}.` : `${small} is less than ${big}.`;
  return { speak: [look, { number: big }, `has more ${place}.`, ...last], steps: [look, `${big} has more ${place}.`, lastText], visual };
}

function threeDigit(sameHundreds: boolean, rng: Rng): [number, number] {
  for (;;) {
    const a = rng.int(100, 999);
    const b = sameHundreds ? Math.floor(a / 100) * 100 + rng.int(0, 99) : rng.int(100, 999);
    if (a !== b && (Math.floor(a / 100) === Math.floor(b / 100)) === sameHundreds) return [a, b];
  }
}

function compareThreeDigit(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const [a, other] = threeDigit(rng.bool(), rng);
    // One time in five the two numbers are the same.
    const b = rng.bool(0.2) ? a : other;
    const answer = a > b ? '>' : a < b ? '<' : '=';
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { values: [a, b], ask: 'sign', options: [...SIGNS] },
      prompt: { text: `Which sign goes between ${a} and ${b}?`, speak: ['Which sign goes between', { number: a }, 'and', { number: b }, '?'] },
      stimulus: equation(a, 'blank', b),
      options: SIGNS.map((sign): Visual => ({ kind: 'text', value: sign, size: 'xl', speak: [SIGN_WORDS[sign] as string] })),
      answerIndex: SIGNS.indexOf(answer),
      explanation: compareExplanation(a, b),
    };
  }
  const values = threeDigit(level === 2, rng);
  const ask = rng.pick<Ask>(['most', 'least']);
  const wanted = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const prompt = ask === 'most' ? 'Which number is greater?' : 'Which number is less?';
  return { type: 'choice', mode: 'look', facts: { values, ask, options: values }, prompt: { text: prompt, speak: [prompt] }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(wanted), explanation: compareExplanation(values[0], values[1], ask) };
}

export const compareThreeDigitGenerator: SkillGenerator = {
  skillId: 'M-2-A3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: compareThreeDigit,
  exampleSeed: 203,
  example: () => compareThreeDigit(1, makeRng(203)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To compare big numbers, start with the hundreds.', speak: ['To compare big numbers, start with the hundreds.'], visual: { kind: 'row', children: [numeral(524, 'l'), numeral(389, 'l')] } },
    { beat: 'watch', text: compareExplanation(524, 389).steps.join(' '), speak: compareExplanation(524, 389).speak, visual: compareExplanation(524, 389).visual },
    { beat: 'try', text: 'Which number is greater?', speak: ['Which number is greater?'], visual: { kind: 'row', children: [numeral(641, 'l'), numeral(672, 'l')] }, reveal: { text: compareExplanation(641, 672).steps.join(' '), speak: compareExplanation(641, 672).speak, visual: compareExplanation(641, 672).visual } },
    { beat: 'remember', text: 'Compare the biggest place first.', speak: ['Compare the biggest place first.'], visual: compareExplanation(524, 389).visual },
  ],
  oracle: 'compare',
};

// ---- A.4 Skip count by 5s, 10s, 100s ----
// Levels: by 100s / by 10s from any number / by 5s, typed. Family: Skip counting. Oracle: sequence.

interface Row {
  start: number;
  step: number;
  length: number;
  blankIndex: number;
}
const valueAt = (row: Row, index: number): number => row.start + row.step * index;
const rowValues = (row: Row): number[] => Array.from({ length: row.length }, (_, i) => valueAt(row, i));
const rowVisual = (row: Row, filled: boolean): Visual => ({ kind: 'sequence', items: rowValues(row).map((value, i): Visual | Blank => (i === row.blankIndex && !filled ? 'blank' : numeral(value, 'l'))) });
const STEP_WORD: Record<number, string> = { 5: 'fives', 10: 'tens', 100: 'hundreds' };
const NEXT = 'What comes next?';

function skipExplanation(row: Row): Explanation {
  const values = rowValues(row);
  const answer = valueAt(row, row.blankIndex);
  return {
    speak: [`We are counting by ${STEP_WORD[row.step]}.`, ...values.map((value): { number: number } => ({ number: value })), 'Next is', { number: answer }, '.'],
    steps: [`We are counting by ${row.step}s.`, `${listText(values)}.`, `Next is ${answer}.`],
    visual: rowVisual(row, true),
  };
}

function skipCount(level: Level, rng: Rng): QuestionDraft {
  // By hundreds from any ten (130, 230, 330). By tens from any number (37, 47, 57). By fives from a five.
  const row: Row = level === 1 ? { start: 10 * rng.int(1, 50), step: 100, length: 5, blankIndex: 4 } : level === 2 ? { start: rng.int(1, 150), step: 10, length: 5, blankIndex: 4 } : { start: 5 * rng.int(1, 60), step: 5, length: 5, blankIndex: 4 };
  const answer = valueAt(row, 4);
  const base = { mode: 'look' as const, prompt: { text: NEXT, speak: [NEXT] as Say }, stimulus: rowVisual(row, false), explanation: skipExplanation(row) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { ...row }, answer, maxDigits: 3 };
  // The slips: one step too few or too many, or counting on by one or ten instead of the step.
  const values = numeralChoices(answer, [answer - row.step, answer + row.step, valueAt(row, 3) + (row.step === 100 ? 10 : 1)], 0, 1000, rng);
  return { ...base, type: 'choice', facts: { ...row, options: values }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(answer) };
}

const lessonRow = (start: number, step: number): Row => ({ start, step, length: 5, blankIndex: 4 });

export const skipCountBigGenerator: SkillGenerator = {
  skillId: 'M-2-A4',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: skipCount,
  exampleSeed: 204,
  example: () => skipCount(1, makeRng(204)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Skip counting jumps by the same amount each time. These jump by 100.', speak: ['Skip counting jumps by the same amount each time. These jump by', { number: 100 }, '.'], visual: rowVisual(lessonRow(100, 100), true) },
    { beat: 'watch', text: skipExplanation(lessonRow(37, 10)).steps.join(' '), speak: skipExplanation(lessonRow(37, 10)).speak, visual: rowVisual(lessonRow(37, 10), true) },
    { beat: 'try', text: NEXT, speak: [NEXT], visual: rowVisual(lessonRow(230, 100), false), reveal: { text: skipExplanation(lessonRow(230, 100)).steps.join(' '), speak: skipExplanation(lessonRow(230, 100)).speak, visual: rowVisual(lessonRow(230, 100), true) } },
    { beat: 'remember', text: 'Add the same amount each time.', speak: ['Add the same amount each time.'], visual: rowVisual(lessonRow(100, 100), true) },
  ],
  oracle: 'sequence',
};

// ---- A.5 Even and odd ----
// Levels: pairs of objects to 10 / numerals to 20 / sort: numerals to 100. Family: Even and odd. Oracle: parity.

const EVEN_ODD = (): Visual[] => [
  { kind: 'text', value: 'Even', size: 'l', speak: ['Even'] },
  { kind: 'text', value: 'Odd', size: 'l', speak: ['Odd'] },
];
const PARITY_BINS: SortBin[] = [
  { label: 'Even', speak: ['Even'] },
  { label: 'Odd', speak: ['Odd'] },
];

// Things drawn two by two, with one on its own when the number is odd.
function inPairs(emoji: string, n: number): Visual {
  const pair: Visual = { kind: 'emojiGroup', emoji, count: 2, layout: 'row' };
  const single: Visual = { kind: 'emojiGroup', emoji, count: 1, layout: 'row' };
  return { kind: 'row', children: [...Array.from({ length: Math.floor(n / 2) }, () => pair), ...(n % 2 === 1 ? [single] : [])] };
}

function parityExplanation(n: number, visual: Visual): Explanation {
  const odd = n % 2 === 1;
  const middle = odd ? 'One is left over.' : 'Every one has a partner.';
  return { speak: ['Make pairs.', middle, { number: n }, odd ? 'is odd.' : 'is even.'], steps: ['Make pairs.', middle, `${n} is ${odd ? 'odd' : 'even'}.`], visual };
}

function evenOdd(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    // Four numerals to sort, with at least one of each kind.
    for (;;) {
      const values = rng.sample(Array.from({ length: 89 }, (_, i) => i + 11), 4);
      const kinds = values.map((value) => value % 2);
      if (new Set(kinds).size < 2) continue;
      const prompt = 'Put each number in its group.';
      const evens = values.filter((value) => value % 2 === 0);
      const odds = values.filter((value) => value % 2 === 1);
      return {
        type: 'sort',
        mode: 'look',
        facts: { values },
        prompt: { text: prompt, speak: [prompt] },
        items: values.map((value) => numeral(value, 'l')),
        bins: PARITY_BINS,
        answerBin: kinds,
        explanation: {
          speak: ['Look at the last digit. Even numbers end in', { number: 0 }, { number: 2 }, { number: 4 }, { number: 6 }, 'or', { number: 8 }, '.'],
          steps: ['Look at the last digit.', `Even: ${listText(evens)}.`, `Odd: ${listText(odds)}.`],
          visual: { kind: 'row', children: evens.map((value) => numeral(value, 'l')) },
        },
      };
    }
  }
  const n = level === 1 ? rng.int(2, 10) : rng.int(1, 20);
  const thing = rng.pick(COUNTABLES);
  const prompt = `Is ${n} even or odd?`;
  const pictured = inPairs(level === 1 ? thing.emoji : '⚫', n);
  const facts: QuestionDraft['facts'] = level === 1 ? { values: [n], thing: thing.one, options: ['even', 'odd'] } : { values: [n], options: ['even', 'odd'] };
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts,
    prompt: { text: prompt, speak: ['Is', { number: n }, 'even or odd?'] },
    stimulus: level === 1 ? pictured : numeral(n),
    options: EVEN_ODD(),
    answerIndex: n % 2,
    explanation: parityExplanation(n, pictured),
  };
}

export const evenOddGenerator: SkillGenerator = {
  skillId: 'M-2-A5',
  maxLevel: 3,
  itemTypes: ['choice', 'sort'],
  lists: ['countables'],
  generate: evenOdd,
  exampleSeed: 205,
  example: () => evenOdd(1, makeRng(205)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Even numbers make pairs with none left over. Odd numbers leave one over.', speak: ['Even numbers make pairs with none left over. Odd numbers leave one over.'], visual: inPairs('⚫', 6) },
    { beat: 'watch', text: `Is 6 even or odd? ${parityExplanation(6, inPairs('⚫', 6)).steps.join(' ')}`, speak: ['Is', { number: 6 }, 'even or odd?', ...parityExplanation(6, inPairs('⚫', 6)).speak], visual: inPairs('⚫', 6) },
    { beat: 'try', text: 'Is 7 even or odd?', speak: ['Is', { number: 7 }, 'even or odd?'], visual: inPairs('⚫', 7), reveal: { text: parityExplanation(7, inPairs('⚫', 7)).steps.join(' '), speak: parityExplanation(7, inPairs('⚫', 7)).speak, visual: inPairs('⚫', 7) } },
    { beat: 'remember', text: 'Even numbers make pairs with none left over.', speak: ['Even numbers make pairs with none left over.'], visual: inPairs('⚫', 8) },
  ],
  oracle: 'parity',
};

// ---- A.6 Number lines to 100 ----
// Levels: marked point, steps of 10 / steps of 5 / steps of 1, typed. Family: Number line. Oracle: line.

const AT_THE_DOT = 'Which number is at the dot?';
const TICKS = 10;

// A line of ten steps with a dot on one mark, whose number is hidden.
const lineVisual = (min: number, step: number, index: number, hide: boolean): Visual => {
  const at = min + step * index;
  return hide ? { kind: 'numberLine', min, max: min + step * TICKS, step, marked: [at], hidden: [at] } : { kind: 'numberLine', min, max: min + step * TICKS, step, marked: [at] };
};

function lineExplanation(min: number, step: number, index: number): Explanation {
  const answer = min + step * index;
  return {
    speak: ['The marks go up by', { number: step }, '. Count along. The dot is at', { number: answer }, '.'],
    steps: [`The marks go up by ${step}.`, 'Count along.', `The dot is at ${answer}.`],
    visual: lineVisual(min, step, index, false),
  };
}

function numberLine(level: Level, rng: Rng): QuestionDraft {
  const step = level === 1 ? 10 : level === 2 ? 5 : 1;
  const min = level === 1 ? 0 : level === 2 ? 5 * rng.int(0, 10) : rng.int(0, 90);
  // Never an end of the line: the dot has a number on each side to count from.
  const index = rng.int(1, TICKS - 1);
  const answer = min + step * index;
  const base = { mode: 'look' as const, prompt: { text: AT_THE_DOT, speak: [AT_THE_DOT] as Say }, stimulus: lineVisual(min, step, index, true), explanation: lineExplanation(min, step, index) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { min, step, index }, answer, maxDigits: 3 };
  // The slips: one mark out, or the marks counted by ones.
  const values = numeralChoices(answer, [answer - step, answer + step, min + index], 0, 200, rng);
  return { ...base, type: 'choice', facts: { min, step, index, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

export const numberLinesGenerator: SkillGenerator = {
  skillId: 'M-2-A6',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: numberLine,
  exampleSeed: 206,
  example: () => numberLine(1, makeRng(206)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A number line shows numbers in order. Each mark is one jump.', speak: ['A number line shows numbers in order. Each mark is one jump.'], visual: { kind: 'numberLine', min: 0, max: 100, step: 10 } },
    { beat: 'watch', text: lineExplanation(0, 10, 4).steps.join(' '), speak: lineExplanation(0, 10, 4).speak, visual: lineVisual(0, 10, 4, false) },
    { beat: 'try', text: AT_THE_DOT, speak: [AT_THE_DOT], visual: lineVisual(20, 5, 3, true), reveal: { text: lineExplanation(20, 5, 3).steps.join(' '), speak: lineExplanation(20, 5, 3).speak, visual: lineVisual(20, 5, 3, false) } },
    { beat: 'remember', text: 'Find the size of each jump first.', speak: ['Find the size of each jump first.'], visual: { kind: 'numberLine', min: 0, max: 100, step: 10 } },
  ],
  oracle: 'line',
};
