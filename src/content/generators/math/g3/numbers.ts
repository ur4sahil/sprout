import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeralChoices } from '../k/numerals';

// Math grade 3 A.1 to A.4: place value to 9,999, number names, comparing four-digit numbers, rounding.

type Explanation = { speak: Say; steps: string[]; visual: Visual };
const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });

// 4306 is written 4,306 from a thousand up.
export const written = (n: number): string => (n >= 1000 ? `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, '0')}` : String(n));
// A numeral a child can tap, written with its comma. It says its own number.
export const bigNumeral = (n: number, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value: written(n), size, speak: [{ number: n }] });

const digitsOf = (n: number): { thousands: number; hundreds: number; tens: number; ones: number } => ({
  thousands: Math.floor(n / 1000),
  hundreds: Math.floor((n % 1000) / 100),
  tens: Math.floor((n % 100) / 10),
  ones: n % 10,
});
const blocks = (n: number): Visual => ({ kind: 'baseTen', ...digitsOf(n) });
const many = (count: number, one: string): string => `${count} ${count === 1 ? one : `${one}s`}`;
const PLACES = ['thousands', 'hundreds', 'tens', 'ones'] as const;
const WORTH = { thousands: 1000, hundreds: 100, tens: 10, ones: 1 } as const;

// "4 thousands, 3 hundreds, 0 tens, 6 ones", written out, for a number too big to draw in blocks.
function placeWords(n: number): { text: string; speak: Say } {
  const d = digitsOf(n);
  const parts = PLACES.map((place) => ({ count: d[place], name: place }));
  return {
    text: parts.map((part) => `${part.count} ${part.count === 1 ? part.name.slice(0, -1) : part.name}`).join(', '),
    speak: parts.flatMap((part, i) => [{ number: part.count }, `${part.count === 1 ? part.name.slice(0, -1) : part.name}${i < 3 ? ',' : ''}`]),
  };
}

function placeExplanation(n: number, visual: Visual): Explanation {
  const d = digitsOf(n);
  const speak: Say = [];
  const lines: string[] = [];
  for (const place of PLACES) {
    if (d[place] === 0) continue;
    const name = d[place] === 1 ? place.slice(0, -1) : place;
    speak.push({ number: d[place] }, `${name} is`, { number: d[place] * WORTH[place] }, '.');
    lines.push(`${many(d[place], place.slice(0, -1))} is ${written(d[place] * WORTH[place])}.`);
  }
  // At most four steps: the places on one line, then the number.
  speak.push('That makes', { number: n }, '.');
  return { speak, steps: [lines.join(' '), `That makes ${written(n)}.`], visual };
}

// ---- A.1 Thousands, hundreds, tens, ones ----
// Levels: blocks to numeral to 1,999 / place words to numeral to 9,999 / typed / choice: value of a digit. Oracle: place.

const WHAT_NUMBER = 'What number is this?';

function placeValue(level: Level, rng: Rng): QuestionDraft {
  // Level 1 draws one thousand cube and up to five hundreds, so the picture stays readable.
  const n = level === 1 ? 1000 + rng.int(1, 5) * 100 + rng.int(0, 9) * 10 + rng.int(1, 9) : rng.int(2001, 9999);
  const d = digitsOf(n);
  if (level === 4) {
    // The value of one digit: the 4 in 4,306 is worth 4,000. A zero is never asked about.
    const place = rng.pick(PLACES.filter((each) => d[each] > 0));
    const digit = d[place];
    const worth = digit * WORTH[place];
    const values = [digit * 10, digit * 100, digit * 1000];
    const offered = place === 'ones' ? [digit, digit * 10, digit * 100] : values;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ...d, ask: `${place}Value`, options: offered },
      prompt: { text: `What is the ${digit} worth in ${written(n)}?`, speak: ['What is the', { number: digit }, 'worth in', { number: n }, '?'] },
      stimulus: bigNumeral(n, 'xl'),
      options: offered.map((value) => bigNumeral(value)),
      answerIndex: offered.indexOf(worth),
      explanation: {
        speak: ['The', { number: digit }, `is in the ${place} place. It is worth`, { number: worth }, '.'],
        steps: [`The ${digit} is in the ${place} place.`, `It is worth ${written(worth)}.`],
        visual: bigNumeral(n, 'xl'),
      },
    };
  }
  const words = placeWords(n);
  // Above level 1 the places are written out in the question itself, which wraps on a narrow phone.
  const prompt = level === 1 ? { text: WHAT_NUMBER, speak: [WHAT_NUMBER] as Say } : { text: `${words.text}. What number is this?`, speak: [...words.speak, '. What number is this?'] as Say };
  const base = level === 1 ? { mode: 'look' as const, prompt, stimulus: blocks(n), explanation: placeExplanation(n, blocks(n)) } : { mode: 'look' as const, prompt, explanation: placeExplanation(n, bigNumeral(n, 'xl')) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { ...d, ask: 'number' }, answer: n, maxDigits: 4 };
  // The slips: two digits the wrong way round, or one ten, hundred or thousand out.
  const swapped = d.thousands * 1000 + d.tens * 100 + d.hundreds * 10 + d.ones;
  const values = numeralChoices(n, [swapped, n + 10, n - 10, n + 100, n - 100, n + 1000, n - 1000], 1000, 9999, rng);
  return { ...base, type: 'choice', facts: { ...d, ask: 'number', options: values }, options: values.map((value) => bigNumeral(value)), answerIndex: values.indexOf(n) };
}

export const placeValue4Generator: SkillGenerator = {
  skillId: 'M-3-A1',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: placeValue,
  exampleSeed: 301,
  example: () => placeValue(1, makeRng(301)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A big cube is one thousand. It is ten hundreds stacked up.', speak: ['A big cube is one thousand. It is ten hundreds stacked up.'], visual: blocks(1000) },
    { beat: 'watch', text: placeExplanation(1324, blocks(1324)).steps.join(' '), speak: placeExplanation(1324, blocks(1324)).speak, visual: blocks(1324) },
    { beat: 'try', text: WHAT_NUMBER, speak: [WHAT_NUMBER], visual: blocks(1213), reveal: { text: placeExplanation(1213, blocks(1213)).steps.join(' '), speak: placeExplanation(1213, blocks(1213)).speak, visual: blocks(1213) } },
    { beat: 'remember', text: 'Thousands, then hundreds, then tens, then ones.', speak: ['Thousands, then hundreds, then tens, then ones.'], visual: bigNumeral(4306, 'xl') },
  ],
  oracle: 'place',
};

// ---- A.2 Number names to 10,000 ----
// Levels: words to numeral, no zeros / with a zero / numeral to words. Oracle: numberName.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function below100(n: number): string {
  if (n < 20) return ONES[n] as string;
  return n % 10 === 0 ? (TENS[Math.floor(n / 10)] as string) : `${TENS[Math.floor(n / 10)]}-${ONES[n % 10]}`;
}
// 3047 is "three thousand forty-seven".
export function nameOf(n: number): string {
  const d = digitsOf(n);
  const parts: string[] = [];
  if (d.thousands > 0) parts.push(`${ONES[d.thousands]} thousand`);
  if (d.hundreds > 0) parts.push(`${ONES[d.hundreds]} hundred`);
  if (n % 100 > 0) parts.push(below100(n % 100));
  return parts.length === 0 ? 'zero' : parts.join(' ');
}

function nameExplanation(n: number): Explanation {
  const d = digitsOf(n);
  const zeros = PLACES.filter((place) => d[place] === 0);
  const count = (k: number, place: (typeof PLACES)[number]): string => `${k} ${k === 1 ? place.slice(0, -1) : place}`;
  const lines = [`${nameOf(n)}`, `${PLACES.map((place) => count(d[place], place)).join(', ')}.`];
  if (zeros.length > 0) lines.push(`There are no ${zeros.join(' and no ')}, so a zero holds the place.`);
  lines.push(`The number is ${written(n)}.`);
  const word = (k: number, place: (typeof PLACES)[number]): string => (k === 1 ? place.slice(0, -1) : place);
  const speak: Say = [{ number: n }, 'is', { number: d.thousands }, `${word(d.thousands, 'thousands')},`, { number: d.hundreds }, `${word(d.hundreds, 'hundreds')},`, { number: d.tens }, `${word(d.tens, 'tens')} and`, { number: d.ones }, `${word(d.ones, 'ones')}.`];
  if (zeros.length > 0) speak.push(`There are no ${zeros.join(' and no ')}, so a zero holds the place.`);
  return { speak, steps: lines, visual: bigNumeral(n, 'xl') };
}

function withZero(rng: Rng): number {
  const d = { thousands: rng.int(1, 9), hundreds: rng.int(0, 9), tens: rng.int(0, 9), ones: rng.int(1, 9) };
  // Exactly one of the hundreds and the tens is zero.
  if (rng.bool()) d.hundreds = 0;
  else d.tens = 0;
  if (d.hundreds === 0 && d.tens === 0) d.tens = rng.int(1, 9);
  if (d.hundreds !== 0 && d.tens !== 0) d.hundreds = 0;
  return d.thousands * 1000 + d.hundreds * 100 + d.tens * 10 + d.ones;
}

const noZero = (rng: Rng): number => rng.int(1, 9) * 1000 + rng.int(1, 9) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9);

// Numbers a child might confuse with n: a zero in the wrong place, or two digits swapped.
function nameSlips(n: number): number[] {
  const d = digitsOf(n);
  const slips = [
    d.thousands * 1000 + d.tens * 100 + d.hundreds * 10 + d.ones,
    d.thousands * 1000 + d.hundreds * 100 + d.ones * 10 + d.tens,
    d.thousands * 1000 + d.hundreds * 10 + d.tens * 100 + d.ones,
    d.thousands * 100 + d.hundreds * 10 + d.tens + d.ones * 1000,
  ];
  return [...new Set(slips)].filter((value) => value !== n && value >= 1000 && value <= 9999 && value % 10 !== 0);
}

function numberNames(level: Level, rng: Rng): QuestionDraft {
  const n = level === 1 ? noZero(rng) : withZero(rng);
  const slips = nameSlips(n);
  const others = rng.sample(slips.length >= 2 ? slips : [...slips, n + 1, n - 1, n + 10], 2);
  // In a random order: sorted, the answer would sit in the middle too often.
  const values = rng.shuffle([n, ...others]);
  if (level === 3) {
    // The numeral shown, the words to pick. The words are not read aloud: reading them is the skill.
    const names = values.map(nameOf);
    const prompt = 'Which words name this number?';
    return {
      type: 'choice',
      mode: 'read',
      facts: { n, ask: 'words', options: names, read: names },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: bigNumeral(n, 'xl'),
      options: names.map((name): Visual => ({ kind: 'text', value: name, size: 'm' })),
      answerIndex: values.indexOf(n),
      explanation: nameExplanation(n),
    };
  }
  const prompt = 'Which number is this?';
  return {
    type: 'choice',
    mode: 'read',
    facts: { n, ask: 'numeral', options: values, read: [nameOf(n)] },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'text', value: nameOf(n), size: 'm' },
    // The numerals stay silent: hearing one said would read the words for the child.
    options: values.map((value): Visual => ({ kind: 'text', value: written(value), size: 'l' })),
    answerIndex: values.indexOf(n),
    explanation: nameExplanation(n),
  };
}

export const numberNamesGenerator: SkillGenerator = {
  skillId: 'M-3-A2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: numberNames,
  exampleSeed: 302,
  example: () => numberNames(1, makeRng(302)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'We read a big number the way we say it: thousands first.', speak: ['We read a big number the way we say it: thousands first.'], visual: bigNumeral(2615, 'xl') },
    { beat: 'watch', text: nameExplanation(2615).steps.join(' '), speak: nameExplanation(2615).speak, visual: nameExplanation(2615).visual },
    { beat: 'try', text: 'Which number is four thousand six?', speak: ['Which number is', { number: 4006 }, '?'], visual: { kind: 'text', value: nameOf(4006), size: 'm' }, reveal: { text: nameExplanation(4006).steps.join(' '), speak: nameExplanation(4006).speak, visual: nameExplanation(4006).visual } },
    { beat: 'remember', text: 'An empty place still needs a zero.', speak: ['An empty place still needs a zero.'], visual: bigNumeral(4006, 'xl') },
  ],
  oracle: 'numberName',
};

// ---- A.3 Compare four-digit numbers ----
// Levels: different thousands / same thousands / pick the sign / order 3 numbers. Oracles: compare, and order at level 4.

type Ask = 'most' | 'least';
const SIGNS = ['>', '<', '='] as const;
const SIGN_WORDS: Record<string, string> = { '>': 'greater than', '<': 'less than', '=': 'equal to' };

function compareExplanation(a: number, b: number, ask: Ask = 'most'): Explanation {
  const visual = equation(written(a), a > b ? '>' : a < b ? '<' : '=', written(b));
  if (a === b) return { speak: [{ number: a }, 'and', { number: b }, 'are the same number. They are equal.'], steps: [`${written(a)} and ${written(b)} are the same number.`, 'They are equal.'], visual };
  const [big, small] = a > b ? [a, b] : [b, a];
  const [x, y] = [digitsOf(big), digitsOf(small)];
  const place = PLACES.find((each) => x[each] !== y[each]) ?? 'ones';
  const same = PLACES.slice(0, PLACES.indexOf(place));
  const look = same.length === 0 ? 'Look at the thousands first.' : `The ${same.join(' and ')} are the same. Look at the ${place}.`;
  const last: Say = ask === 'most' ? [{ number: big }, 'is greater than', { number: small }, '.'] : [{ number: small }, 'is less than', { number: big }, '.'];
  const lastText = ask === 'most' ? `${written(big)} is greater than ${written(small)}.` : `${written(small)} is less than ${written(big)}.`;
  return { speak: [look, { number: big }, `has more ${place}.`, ...last], steps: [look, `${written(big)} has more ${place}.`, lastText], visual };
}

function fourDigit(sameThousands: boolean, rng: Rng): [number, number] {
  for (;;) {
    const a = rng.int(1000, 9999);
    const b = sameThousands ? Math.floor(a / 1000) * 1000 + rng.int(0, 999) : rng.int(1000, 9999);
    if (a !== b && (Math.floor(a / 1000) === Math.floor(b / 1000)) === sameThousands) return [a, b];
  }
}

function compareFourDigit(level: Level, rng: Rng): QuestionDraft {
  if (level === 4) {
    // Three numbers with the same thousands, so the order turns on the hundreds and below.
    const thousands = rng.int(1, 9) * 1000;
    const values = rng.sample([...Array(99).keys()].map((i) => thousands + (i + 1) * 10 + rng.int(0, 9)), 3);
    const prompt = 'Put the numbers in order, smallest first.';
    const order = values.map((_, i) => i).sort((x, y) => (values[x] as number) - (values[y] as number));
    const sorted = order.map((i) => values[i] as number);
    return {
      type: 'order',
      mode: 'look',
      facts: { values, oracle: 'order' },
      prompt: { text: prompt, speak: [prompt] },
      items: values.map((value) => bigNumeral(value)),
      answerOrder: order,
      explanation: {
        speak: ['The thousands are the same, so look at the hundreds, then the tens. Smallest first:', ...sorted.flatMap((value, i): Say => (i === 0 ? [{ number: value }] : [',', { number: value }])), '.'],
        steps: ['The thousands are the same.', 'Look at the hundreds, then the tens.', `Smallest first: ${sorted.map(written).join(', ')}.`],
        visual: { kind: 'row', children: sorted.map((value) => bigNumeral(value)) },
      },
    };
  }
  if (level === 3) {
    const [a, other] = fourDigit(rng.bool(), rng);
    // One time in five the two numbers are the same.
    const b = rng.bool(0.2) ? a : other;
    const answer = a > b ? '>' : a < b ? '<' : '=';
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { values: [a, b], ask: 'sign', options: [...SIGNS] },
      prompt: { text: `Which sign goes between ${written(a)} and ${written(b)}?`, speak: ['Which sign goes between', { number: a }, 'and', { number: b }, '?'] },
      stimulus: equation(written(a), 'blank', written(b)),
      options: SIGNS.map((sign): Visual => ({ kind: 'text', value: sign, size: 'xl', speak: [SIGN_WORDS[sign] as string] })),
      answerIndex: SIGNS.indexOf(answer),
      explanation: compareExplanation(a, b),
    };
  }
  const values = fourDigit(level === 2, rng);
  const ask = rng.pick<Ask>(['most', 'least']);
  const wanted = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const prompt = ask === 'most' ? 'Which number is greater?' : 'Which number is less?';
  return { type: 'choice', mode: 'look', facts: { values, ask, options: values }, prompt: { text: prompt, speak: [prompt] }, options: values.map((value) => bigNumeral(value)), answerIndex: values.indexOf(wanted), explanation: compareExplanation(values[0], values[1], ask) };
}

export const compareFourDigitGenerator: SkillGenerator = {
  skillId: 'M-3-A3',
  maxLevel: 4,
  itemTypes: ['choice', 'order'],
  lists: [],
  generate: compareFourDigit,
  exampleSeed: 303,
  example: () => compareFourDigit(1, makeRng(303)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To compare big numbers, start with the thousands.', speak: ['To compare big numbers, start with the thousands.'], visual: { kind: 'row', children: [bigNumeral(5240), bigNumeral(3899)] } },
    { beat: 'watch', text: compareExplanation(5240, 3899).steps.join(' '), speak: compareExplanation(5240, 3899).speak, visual: compareExplanation(5240, 3899).visual },
    { beat: 'try', text: 'Which number is greater?', speak: ['Which number is greater?'], visual: { kind: 'row', children: [bigNumeral(6412), bigNumeral(6721)] }, reveal: { text: compareExplanation(6412, 6721).steps.join(' '), speak: compareExplanation(6412, 6721).speak, visual: compareExplanation(6412, 6721).visual } },
    { beat: 'remember', text: 'Compare the biggest place first.', speak: ['Compare the biggest place first.'], visual: compareExplanation(5240, 3899).visual },
  ],
  oracle: 'compare',
};

// ---- A.4 Round to 10 and 100 ----
// Levels: nearest ten, on a number line / nearest ten / nearest hundred / typed, either. Oracle: round.

const roundTo = (n: number, to: number): number => Math.floor((n + to / 2) / to) * to;

function roundExplanation(n: number, to: number): Explanation {
  const below = Math.floor(n / to) * to;
  const above = below + to;
  const half = below + to / 2;
  const answer = roundTo(n, to);
  const unit = to === 10 ? 'ten' : 'hundred';
  const where: Say = n === half ? [{ number: n }, 'is exactly halfway. Halfway rounds up.'] : n > half ? [{ number: n }, 'is past', { number: half }, ', the halfway point.'] : [{ number: n }, 'is before', { number: half }, ', the halfway point.'];
  const whereText = n === half ? `${written(n)} is exactly halfway. Halfway rounds up.` : n > half ? `${written(n)} is past ${written(half)}, the halfway point.` : `${written(n)} is before ${written(half)}, the halfway point.`;
  return {
    speak: [{ number: n }, `is between`, { number: below }, 'and', { number: above }, '.', ...where, `It rounds to`, { number: answer }, '.'],
    steps: [`${written(n)} is between ${written(below)} and ${written(above)}.`, whereText, `To the nearest ${unit}, it rounds to ${written(answer)}.`],
    visual: { kind: 'numberLine', min: below, max: above, step: to / 10, marked: [n] },
  };
}

function rounding(level: Level, rng: Rng): QuestionDraft {
  const to = level === 3 || (level === 4 && rng.bool()) ? 100 : 10;
  // Not already a round number. For hundreds, never a multiple of ten either, so rounding is needed.
  let n = rng.int(101, 989);
  while (n % to === 0 || (to === 100 && n % 10 === 0)) n = rng.int(101, 989);
  const answer = roundTo(n, to);
  const below = Math.floor(n / to) * to;
  const unit = to === 10 ? 'ten' : 'hundred';
  const prompt = { text: `Round ${n} to the nearest ${unit}.`, speak: ['Round', { number: n }, `to the nearest ${unit}.`] as Say };
  const base = { mode: 'look' as const, prompt, explanation: roundExplanation(n, to) };
  if (level === 4) return { ...base, type: 'numberPad', facts: { n, to }, answer, maxDigits: 4, stimulus: bigNumeral(n, 'xl') };
  // The two round numbers on either side, and one more a step further out, in order.
  // The extra one usually goes on the far side of the answer, so the answer sits in each place about as often.
  const farSide = answer === below ? below + 2 * to : below - to;
  const nearSide = answer === below ? below - to : below + 2 * to;
  const pick = rng.bool(1 / 3) ? nearSide : farSide;
  const further = pick >= 0 ? pick : below + 2 * to;
  const values = [below, below + to, further].sort((x, y) => x - y);
  const stimulus: Visual = level === 1 ? { kind: 'numberLine', min: below, max: below + to, step: 1, marked: [n] } : bigNumeral(n, 'xl');
  return { ...base, type: 'choice', stimulus, facts: { n, to, options: values }, options: values.map((value) => bigNumeral(value)), answerIndex: values.indexOf(answer) };
}

export const roundingGenerator: SkillGenerator = {
  skillId: 'M-3-A4',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: rounding,
  exampleSeed: 304,
  example: () => rounding(1, makeRng(304)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Rounding finds the nearest ten or hundred.', speak: ['Rounding finds the nearest ten or hundred.'], visual: { kind: 'numberLine', min: 40, max: 50, step: 1, marked: [47] } },
    { beat: 'watch', text: roundExplanation(47, 10).steps.join(' '), speak: roundExplanation(47, 10).speak, visual: roundExplanation(47, 10).visual },
    { beat: 'try', text: 'Round 362 to the nearest hundred.', speak: ['Round', { number: 362 }, 'to the nearest hundred.'], visual: bigNumeral(362, 'xl'), reveal: { text: roundExplanation(362, 100).steps.join(' '), speak: roundExplanation(362, 100).speak, visual: roundExplanation(362, 100).visual } },
    { beat: 'remember', text: 'Halfway or more rounds up. Less than halfway rounds down.', speak: ['Halfway or more rounds up. Less than halfway rounds down.'], visual: roundExplanation(47, 10).visual },
  ],
  oracle: 'round',
};
