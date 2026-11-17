import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';
import { numberWordQuestion } from '../k/h1-counting';
import type { Explanation } from '../k/h1-parts';
import { h1Skill, lessonOf, numberChoice, spoken } from '../k/h1-parts';
import { numeralChoices } from '../k/numerals';
import { findNumberQuestion } from '../pk/findNumber';
import { silentNumeral } from '../pk/parts';

// Math grade 1, plan section 15 wave H1: A.6 hear and find numbers to 120, A.7 show tens and ones,
// A.8 order numbers to 120, A.9 hundred chart puzzles, A.10 number words to 100.

const reversed = (n: number): number => Number(String(n).split('').reverse().join(''));

// ---- A.6 Hear and find numbers to 120 ----
// Levels: 21 to 99 / 100 to 120 / any to 120. Wrong numerals are the slips a child makes writing what they
// hear: digits swapped, one or ten off, and "one hundred seven" written 1007. Listen. Oracle: attribute.

function slips(n: number): number[] {
  const out = [n - 1, n + 1, n - 10, n + 10];
  if (n < 100 && n % 10 !== 0 && reversed(n) !== n) out.push(reversed(n));
  if (n > 100) out.push(1000 + (n - 100), n - 100, Number(`1${String(n).slice(1).split('').reverse().join('')}`));
  return [...new Set(out)].filter((value) => value >= 1 && value !== n);
}

function hearNumber(level: Level, rng: Rng): QuestionDraft {
  const n = level === 1 ? rng.int(21, 99) : level === 2 ? rng.int(100, 120) : rng.int(11, 120);
  // Where the answer sits is chosen first, so it is not always in the middle.
  const below = slips(n).filter((value) => value < n);
  const above = slips(n).filter((value) => value > n);
  const places = [0, 1, 2, 3].filter((place) => below.length >= place && above.length >= 3 - place);
  const place = rng.pick(places);
  const values = [...rng.sample(below, place), n, ...rng.sample(above, 3 - place)].sort((x, y) => x - y);
  return findNumberQuestion(n, values);
}

export const hearNumberGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-A6',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'attribute',
  exampleSeed: 901,
  generate: hearNumber,
  lesson: (make) => lessonOf('One hundred seven is written 107: a 1 for the hundred, a 0 for no tens, a 7 for the ones.', numeral(107), make(1, 901), make(2, 902), 'Listen for the hundreds, the tens and the ones.', { kind: 'row', children: [silentNumeral(107), silentNumeral(170)] }),
});

// ---- A.7 Show tens and ones ----
// Levels: which blocks show a number to 50 / to 99, with digits swapped / another way: 3 tens and 16 ones
// is 46. Oracle: h1TensOnes.

const blocks = (tens: number, ones: number): Visual => ({ kind: 'baseTen', hundreds: 0, tens, ones });
const tensOnesText = (tens: number, ones: number): string => `${tens} ${tens === 1 ? 'ten' : 'tens'} and ${ones} ${ones === 1 ? 'one' : 'ones'}`;

function tensOnesExplanation(n: number, trade: boolean): Explanation {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const lines = [`${n} is ${tensOnesText(t, o)}.`];
  if (trade) lines.push(`Trade 1 ten for 10 ones: ${tensOnesText(t - 1, o + 10)} is also ${n}.`);
  return { speak: lines.flatMap(spoken), steps: lines, visual: blocks(t, o) };
}

function showTensOnes(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const t = rng.int(2, 9);
    const o = rng.int(0, 9);
    const n = t * 10 + o;
    const right: [number, number] = [t - 1, o + 10];
    const wrong = rng.sample([[t, o + 10], [t - 1, o], [t + 1, o + 10], [t - 1, o + 1]].filter(([x]) => (x as number) <= 9) as [number, number][], 3);
    const options = rng.shuffle([right, ...wrong]);
    const prompt = `Which is another way to make ${n}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { n, options },
      prompt: { text: prompt, speak: spoken(prompt) },
      stimulus: blocks(t, o),
      options: options.map(([x, y]): Visual => ({ kind: 'text', value: tensOnesText(x, y), size: 'm', speak: spoken(tensOnesText(x, y)) })),
      answerIndex: options.indexOf(right),
      explanation: tensOnesExplanation(n, true),
    };
  }
  const n = level === 1 ? rng.int(11, 50) : rng.int(21, 99);
  const t = Math.floor(n / 10);
  const o = n % 10;
  const candidates: [number, number][] = [[o, t], [t, o + 1], [t, o - 1], [t + 1, o], [t - 1, o], [t, o + 2], [t, o - 2], [t + 2, o], [t - 2, o]];
  const wrong = candidates.filter(([x, y]) => x >= 0 && x <= 9 && y >= 0 && y <= 9 && !(x === t && y === o) && x * 10 + y > 0);
  const unique = wrong.filter((pair, i) => wrong.findIndex((other) => other[0] === pair[0] && other[1] === pair[1]) === i);
  const options = rng.shuffle([[t, o] as [number, number], ...rng.sample(unique, level === 1 ? 2 : 3)]);
  const prompt = `Which blocks show ${n}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { n, options },
    prompt: { text: prompt, speak: spoken(prompt) },
    options: options.map(([x, y]) => blocks(x, y)),
    answerIndex: options.findIndex(([x, y]) => x === t && y === o),
    explanation: tensOnesExplanation(n, false),
  };
}

export const showTensOnesGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-A7',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1TensOnes',
  exampleSeed: 903,
  generate: showTensOnes,
  lesson: (make) => lessonOf('A rod is 10 ones stuck together. 46 is 4 rods and 6 ones.', blocks(4, 6), make(1, 903), make(2, 904), 'Tens first, then ones. 10 ones make a ten.', blocks(3, 16)),
});

// ---- A.8 Order numbers to 120 ----
// Levels: 3 numbers to 50 with different tens / 4 numbers to 99, two with the same tens / 4 numbers to 120.
// Oracle: order.

function orderExplanation(values: number[]): Explanation {
  const sorted = [...values].sort((x, y) => x - y);
  return {
    speak: ['Smallest first:', ...sorted.map((value) => ({ number: value })), '.'],
    steps: ['Compare the tens first, then the ones.', `Smallest first: ${listText(sorted)}.`],
    visual: { kind: 'row', children: sorted.map((value) => numeral(value, 'l')) },
  };
}

function orderTo120(level: Level, rng: Rng): QuestionDraft {
  let values: number[];
  if (level === 1) {
    const tens = rng.sample([1, 2, 3, 4], 3);
    values = tens.map((t) => t * 10 + rng.int(0, 9));
  } else {
    for (;;) {
      values = Array.from({ length: 4 }, () => (level === 2 ? rng.int(10, 99) : rng.int(10, 120)));
      const tens = values.map((value) => Math.floor(value / 10));
      const sameTens = new Set(tens).size < 4;
      const big = values.some((value) => value >= 100);
      if (new Set(values).size === 4 && sameTens && (level === 2 || big)) break;
    }
  }
  const prompt = 'Put the numbers in order, smallest first.';
  return {
    type: 'order',
    mode: 'look',
    facts: { values },
    prompt: { text: prompt, speak: [prompt] },
    items: values.map((value) => numeral(value, 'l')),
    answerOrder: values.map((_, i) => i).sort((x, y) => (values[x] as number) - (values[y] as number)),
    explanation: orderExplanation(values),
  };
}

export const orderTo120Generator: SkillGenerator = h1Skill({
  skillId: 'M-1-A8',
  maxLevel: 3,
  itemTypes: ['order'],
  oracle: 'order',
  exampleSeed: 905,
  generate: orderTo120,
  lesson: (make) => lessonOf('To put numbers in order, look at the tens first. 23 comes before 41.', { kind: 'row', children: [numeral(23, 'l'), numeral(41, 'l')] }, make(1, 905), make(2, 906), 'Tens first. Same tens? Then look at the ones.'),
});

// ---- A.9 Hundred chart puzzles ----
// A 3 by 3 piece of the hundred chart with one box empty. Levels: a box beside the middle, to 50 /
// any box, to 100 / typed, to 120. Oracle: h1Chart.

function chartPiece(topLeft: number, blank: number | null): Visual {
  return { kind: 'matrix', cells: Array.from({ length: 9 }, (_, i) => (i === blank ? 'blank' : numeral(topLeft + Math.floor(i / 3) * 10 + (i % 3), 'm'))) };
}

function chartExplanation(topLeft: number, blank: number): Explanation {
  const answer = topLeft + Math.floor(blank / 3) * 10 + (blank % 3);
  const lines = ['Across, the numbers go up by 1.', 'Down, they go up by 10.', `The box needs ${answer}.`];
  return { speak: lines.flatMap(spoken), steps: lines, visual: chartPiece(topLeft, null) };
}

function hundredChart(level: Level, rng: Rng): QuestionDraft {
  // The left column of the piece is 1 to 8 in its row, so the piece never wraps onto the next row.
  const topLeft = rng.int(0, level === 1 ? 2 : level === 2 ? 7 : 9) * 10 + rng.int(1, 8);
  const blank = level === 1 ? rng.pick([3, 5]) : rng.int(0, 8);
  const answer = topLeft + Math.floor(blank / 3) * 10 + (blank % 3);
  const prompt = 'This is part of a hundred chart. Which number goes in the empty box?';
  const base = { mode: 'look' as const, facts: { topLeft, blank }, prompt: { text: prompt, speak: [prompt] }, stimulus: chartPiece(topLeft, blank), explanation: chartExplanation(topLeft, blank) };
  if (level === 3) return { ...base, type: 'numberPad', answer, maxDigits: 3 };
  const values = numeralChoices(answer, [answer - 10, answer + 10, answer + 2, answer - 2], 1, 130, rng);
  return { ...base, facts: { ...base.facts, options: values }, ...numberChoice(answer, values) };
}

export const hundredChartGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-A9',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'h1Chart',
  exampleSeed: 907,
  generate: hundredChart,
  lesson: (make) => lessonOf('On a hundred chart, each row is ten numbers. The number under another is 10 more.', chartPiece(34, null), make(1, 907), make(2, 908), 'Right is 1 more. Down is 10 more.'),
});

// ---- A.10 Number words to 100 ----
// Levels: teen words (fourteen, not forty) / twenty-one to ninety-nine / the numeral, pick its words.
// Read: nothing that shows the words, or the numeral, says them. Oracle: numberName.

function numberWordsTo100(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const n = rng.int(13, 19);
    return numberWordQuestion(n, numeralChoices(n, [(n % 10) * 10], 1, 99, rng)).word;
  }
  const n = rng.int(21, 99);
  const values = numeralChoices(n, [reversed(n), n + 10, n - 10].filter((value) => value >= 1 && value <= 99 && value !== n), 1, 99, rng);
  const made = numberWordQuestion(n, values);
  return level === 3 ? made.numeralAsk : made.word;
}

export const numberWordsTo100Generator: SkillGenerator = h1Skill({
  skillId: 'M-1-A10',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'numberName',
  exampleSeed: 909,
  lists: ['h1-numberWords'],
  pool: { 1: 7 },
  generate: numberWordsTo100,
  lesson: (make) => lessonOf('A number word is read in parts. Forty-seven is forty and seven: 47.', numeral(47), make(1, 909), make(2, 910), 'Teen words end in teen. Tens words end in ty.'),
});
