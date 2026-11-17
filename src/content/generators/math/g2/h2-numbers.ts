import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { nameOf } from '../g3/numbers';
import { skill } from '../pk/h2-lesson';

// Math grade 2, wave H2 (plan section 15): A.7 number names to 1,000, A.8 order three-digit numbers,
// A.9 regroup hundreds, tens and ones, A.10 even numbers as doubles, A.11 before, after and between,
// A.12 show a number with blocks, A.13 greatest and least from digits, A.14 hundred chart puzzles.

type Explanation = QuestionDraft['explanation'];
const digitsOf = (n: number): { hundreds: number; tens: number; ones: number } => ({ hundreds: Math.floor(n / 100), tens: Math.floor((n % 100) / 10), ones: n % 10 });
const blocks = (n: number): Visual => ({ kind: 'baseTen', ...digitsOf(n) });
const word = (k: number, place: string): string => `${k} ${k === 1 ? place.slice(0, -1) : place}`;
const sayPlaces = (n: number): Say => {
  const d = digitsOf(n);
  return [{ number: d.hundreds }, d.hundreds === 1 ? 'hundred,' : 'hundreds,', { number: d.tens }, d.tens === 1 ? 'ten and' : 'tens and', { number: d.ones }, d.ones === 1 ? 'one.' : 'ones.'];
};
const placesText = (n: number): string => {
  const d = digitsOf(n);
  return `${word(d.hundreds, 'hundreds')}, ${word(d.tens, 'tens')} and ${word(d.ones, 'ones')}.`;
};
const choice = (answer: number, values: number[], facts: QuestionDraft['facts'], base: Omit<Extract<QuestionDraft, { type: 'numberPad' }>, 'type' | 'answer' | 'maxDigits' | 'facts'>, silent = false): QuestionDraft => ({
  ...base,
  type: 'choice',
  facts: { ...facts, options: values },
  options: values.map((value): Visual => (silent ? { kind: 'text', value: String(value), size: 'l' } : numeral(value, 'l'))),
  answerIndex: values.indexOf(answer),
});
const noZero = (rng: Rng): number => rng.int(1, 9) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9);

// ---- A.7 Number names to 1,000 ----
// Levels: numeral to words / words to numeral, with a zero / words to numeral, typed. Oracle: numberName.
// The words are read, never said aloud: reading them is the skill.

function nameSlips(n: number): number[] {
  const d = digitsOf(n);
  const slips = [d.hundreds * 100 + d.ones * 10 + d.tens, d.hundreds * 100 + d.tens * 10, d.hundreds * 100 + d.ones, d.hundreds * 10 + d.ones, d.tens * 100 + d.hundreds * 10 + d.ones];
  return [...new Set(slips)].filter((value) => value !== n && value >= 10 && value <= 999);
}

function nameExplanation(n: number): Explanation {
  const d = digitsOf(n);
  const zeros = (['tens', 'ones'] as const).filter((place) => d[place] === 0);
  const name = nameOf(n);
  const steps = [`${name.charAt(0).toUpperCase()}${name.slice(1)} is ${placesText(n)}`];
  const speak: Say = ['It is', ...sayPlaces(n)];
  if (zeros.length > 0) {
    steps.push(`There are no ${zeros.join(' and no ')}, so a zero holds the place.`);
    speak.push(`There are no ${zeros.join(' and no ')}, so a zero holds the place.`);
  }
  steps.push(`The number is ${n}.`);
  speak.push('The number is', { number: n }, '.');
  return { speak, steps, visual: blocks(n) };
}

function numberNames(level: Level, rng: Rng): QuestionDraft {
  let n: number;
  if (level === 1) n = noZero(rng);
  else {
    const d = { hundreds: rng.int(1, 9), tens: rng.int(0, 9), ones: rng.int(0, 9) };
    if (level === 2) {
      if (rng.bool()) d.tens = 0;
      else d.ones = 0;
      if (d.tens === 0 && d.ones === 0) d.ones = rng.int(1, 9);
    }
    n = d.hundreds * 100 + d.tens * 10 + d.ones;
  }
  const others = rng.sample(nameSlips(n).length >= 2 ? nameSlips(n) : [...nameSlips(n), n + 1, n + 10], 2);
  const values = rng.shuffle([n, ...others]);
  const name = nameOf(n);
  if (level === 1) {
    const names = values.map(nameOf);
    const prompt = 'Which words name this number?';
    return {
      type: 'choice',
      mode: 'read',
      facts: { n, ask: 'words', options: names, read: names },
      prompt: { text: prompt, speak: [prompt] },
      // Silent, so a tap does not say the words to pick.
      stimulus: { kind: 'text', value: String(n), size: 'xl' },
      options: names.map((each): Visual => ({ kind: 'text', value: each, size: 'm' })),
      answerIndex: values.indexOf(n),
      explanation: nameExplanation(n),
    };
  }
  const prompt = level === 2 ? 'Which number do these words name?' : 'Write the number these words name.';
  const base = { mode: 'read' as const, prompt: { text: prompt, speak: [prompt] as Say }, stimulus: { kind: 'text', value: name, size: 'm' } as Visual, explanation: nameExplanation(n) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { n, ask: 'numeral', read: [name] }, answer: n, maxDigits: 3 };
  // The numerals stay silent: hearing one said would read the words for the child.
  return choice(n, values, { n, ask: 'numeral', read: [name] }, base, true);
}

export const numberNames2Generator: SkillGenerator = skill({
  skillId: 'M-2-A7',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: numberNames,
  exampleSeed: 951,
  lesson: { see: 'We write a number in words the way we say it: hundreds first, then the rest.', remember: 'When a place has nothing, a zero holds the place.', tryLevel: 2 },
  oracle: 'numberName',
});

// ---- A.8 Order three-digit numbers ----
// Levels: 3 numbers, different hundreds, smallest first / same hundreds / 4 numbers, largest first. Oracle: h2OrderBy.

function orderNumbers(level: Level, rng: Rng): QuestionDraft {
  const dir = level === 3 ? 'down' : 'up';
  let values: number[];
  for (;;) {
    if (level === 1) values = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3).map((h) => h * 100 + rng.int(0, 99));
    else if (level === 2) {
      const h = rng.int(1, 9) * 100;
      values = rng.sample(Array.from({ length: 99 }, (_, i) => h + i + 1), 3);
    } else {
      const [h1, h2] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2).map((h) => h * 100) as [number, number];
      values = rng.shuffle([h1 + rng.int(0, 49), h1 + rng.int(50, 99), h2 + rng.int(0, 49), h2 + rng.int(50, 99)]);
    }
    const sorted = [...values].sort((x, y) => (dir === 'up' ? x - y : y - x));
    if (new Set(values).size === values.length && values.some((value, i) => value !== sorted[i])) break;
  }
  const sorted = [...values].sort((x, y) => (dir === 'up' ? x - y : y - x));
  const prompt = dir === 'up' ? 'Put the numbers in order, smallest first.' : 'Put the numbers in order, largest first.';
  return {
    type: 'order',
    mode: 'look',
    facts: { values, dir },
    prompt: { text: prompt, speak: [prompt] },
    items: values.map((value) => numeral(value, 'l')),
    answerOrder: sorted.map((value) => values.indexOf(value)),
    explanation: {
      speak: ['Compare the hundreds first. When they are the same, compare the tens, then the ones. The order is', ...sorted.flatMap((value, i): Say => (i === 0 ? [{ number: value }] : [',', { number: value }])), '.'],
      steps: ['Compare the hundreds first.', 'When the hundreds are the same, compare the tens, then the ones.', `The order is ${listText(sorted)}.`],
      visual: { kind: 'sequence', items: sorted.map((value) => numeral(value, 'l')) },
    },
  };
}

export const orderNumbersGenerator: SkillGenerator = skill({
  skillId: 'M-2-A8',
  maxLevel: 3,
  itemTypes: ['order'],
  lists: [],
  generate: orderNumbers,
  exampleSeed: 952,
  lesson: { see: 'To put numbers in order, compare the biggest place first.', remember: 'Hundreds first, then tens, then ones.', tryLevel: 2 },
  oracle: 'h2OrderBy',
});

// ---- A.9 Regroup hundreds, tens and ones ----
// Levels: hundreds and 10 to 19 tens / hundreds, tens and 10 to 19 of one place / how many tens in a number, typed.
// Oracle: h2Regroup.

function regroup(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const n = rng.int(1, 9) * 100 + rng.int(1, 9) * 10;
    const d = digitsOf(n);
    const tens = d.hundreds * 10 + d.tens;
    const prompt = { text: `How many tens are in ${n}?`, speak: ['How many tens are in', { number: n }, '?'] as Say };
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { ...d, ask: 'tensIn' },
      prompt,
      stimulus: blocks(n),
      answer: tens,
      maxDigits: 2,
      explanation: {
        speak: ['One hundred is', { number: 10 }, 'tens. So', { number: d.hundreds }, 'hundreds is', { number: d.hundreds * 10 }, 'tens. Add', { number: d.tens }, 'more tens:', { number: tens }, 'tens.'],
        steps: [`1 hundred is 10 tens.`, `${word(d.hundreds, 'hundreds')} is ${d.hundreds * 10} tens.`, `${d.hundreds * 10} + ${d.tens} = ${tens} tens.`],
        visual: blocks(n),
      },
    };
  }
  const h = rng.int(1, 8);
  let t: number;
  let o: number;
  if (level === 1) [t, o] = [rng.int(10, 19), 0];
  else if (rng.bool()) [t, o] = [rng.int(10, 19), rng.int(1, 9)];
  else [t, o] = [rng.int(1, 9), rng.int(10, 19)];
  const n = h * 100 + t * 10 + o;
  const parts = o === 0 ? `${word(h, 'hundreds')} and ${t} tens` : `${word(h, 'hundreds')}, ${word(t, 'tens')} and ${o} ones`;
  const said: Say = o === 0 ? [{ number: h }, h === 1 ? 'hundred and' : 'hundreds and', { number: t }, 'tens'] : [{ number: h }, h === 1 ? 'hundred,' : 'hundreds,', { number: t }, t === 1 ? 'ten and' : 'tens and', { number: o }, 'ones'];
  const prompt = { text: `What number is ${parts}?`, speak: ['What number is', ...said, '?'] as Say };
  const steps: string[] = [];
  const speak: Say = [];
  if (t >= 10) {
    steps.push(`${t} tens is 1 hundred and ${t - 10} tens.`);
    speak.push({ number: t }, 'tens is one hundred and', { number: t - 10 }, 'tens.');
  }
  if (o >= 10) {
    steps.push(`${o} ones is 1 ten and ${o - 10} ones.`);
    speak.push({ number: o }, 'ones is one ten and', { number: o - 10 }, 'ones.');
  }
  steps.push(`That makes ${placesText(n)}`, `The number is ${n}.`);
  speak.push('That makes', ...sayPlaces(n), 'The number is', { number: n }, '.');
  // The slips: the extra hundred or ten left out, or a ten too many or too few.
  const slips = t >= 10 ? [n - 100, n + 10, n - 10] : [n - 10, n + 10, n - 100];
  const values = numeralChoices(n, slips, 100, 999, rng);
  return choice(n, values, { hundreds: h, tens: t, ones: o, ask: 'number' }, { mode: 'look', prompt, explanation: { speak, steps, visual: blocks(n) } });
}

export const regroupGenerator: SkillGenerator = skill({
  skillId: 'M-2-A9',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: regroup,
  exampleSeed: 953,
  lesson: { see: 'Ten ones make one ten. Ten tens make one hundred.', remember: 'When a place has ten or more, trade ten of them for one of the next place.' },
  oracle: 'h2Regroup',
});

// ---- A.10 Even numbers as doubles ----
// Levels: which double makes an even number / can a number be two equal numbers / the half, typed. Oracle: h2Even.

const sumText = (x: number, y: number): Visual => ({ kind: 'text', value: `${x} + ${y}`, size: 'l', speak: [{ number: x }, 'plus', { number: y }] });
const sayText = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: [value.toLowerCase()] });

function doubles(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    const n = rng.int(2, 20);
    const even = n % 2 === 0;
    const prompt = { text: `Can ${n} be made by adding two equal numbers?`, speak: ['Can', { number: n }, 'be made by adding two equal numbers?'] as Say };
    const why: Explanation = even
      ? { speak: [{ number: n }, 'is', { number: n / 2 }, 'plus', { number: n / 2 }, '. It is even.'], steps: [`${n} = ${n / 2} + ${n / 2}.`, `${n} is even.`], visual: { kind: 'equation', parts: [n / 2, '+', n / 2, '=', n] } }
      : { speak: ['Make pairs: one is left over. Two equal numbers always make an even number, and', { number: n }, 'is odd.'], steps: ['Make pairs: one is left over.', `Two equal numbers always make an even number. ${n} is odd.`], visual: { kind: 'emojiGroup', emoji: '🔵', count: n, layout: 'grid5' } };
    return { type: 'choice', mode: 'look', fixedOrder: true, facts: { ask: 'isDouble', n, options: ['yes', 'no'] }, prompt, options: ['Yes', 'No'].map(sayText), answerIndex: even ? 0 : 1, explanation: why };
  }
  const half = rng.int(2, 10);
  const total = half * 2;
  const explanation: Explanation = { speak: [{ number: half }, 'plus', { number: half }, 'is', { number: total }, '. An even number splits into two equal numbers.'], steps: [`${half} + ${half} = ${total}.`, 'An even number splits into two equal numbers.'], visual: { kind: 'equation', parts: [half, '+', half, '=', total] } };
  if (level === 3) {
    return { type: 'numberPad', mode: 'look', facts: { ask: 'half', total }, prompt: { text: `${total} is a number plus the same number. What is that number?`, speak: [{ number: total }, 'is a number plus the same number. What is that number?'] }, stimulus: { kind: 'equation', parts: [total, '=', 'blank', '+', 'blank'] }, answer: half, maxDigits: 2, explanation };
  }
  const halves = numeralChoices(half, [half + 2, half - 2], 1, 12, rng);
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'double', total, options: halves.map((x) => `${x} + ${x}`) },
    prompt: { text: `Which double makes ${total}?`, speak: ['Which double makes', { number: total }, '?'] },
    options: halves.map((x) => sumText(x, x)),
    answerIndex: halves.indexOf(half),
    explanation,
  };
}

export const doublesGenerator: SkillGenerator = skill({
  skillId: 'M-2-A10',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  pool: { 3: 9 },
  generate: doubles,
  exampleSeed: 954,
  lesson: { see: 'An even number can be made by adding a number to itself. Six is three plus three.', remember: 'Even numbers are doubles. Odd numbers are not.' },
  oracle: 'h2Even',
});

// ---- A.11 Before, after and between ----
// Levels: just after, often across a ten or a hundred / just before / between, typed. Oracle: sequence.

function edgeNumber(rng: Rng, after: boolean): number {
  const kind = rng.int(0, 2);
  const h = rng.int(1, 8) * 100;
  if (kind === 0) return after ? h + 99 : h + 100; // across a hundred: 399 then 400
  if (kind === 1) return after ? h + rng.int(0, 8) * 10 + 9 : h + rng.int(1, 9) * 10; // across a ten
  return h + rng.int(11, 98);
}

function beforeAfter(level: Level, rng: Rng): QuestionDraft {
  const ask = level === 1 ? 'after' : level === 2 ? 'before' : 'between';
  const n = level === 3 ? edgeNumber(rng, rng.bool()) : edgeNumber(rng, level === 1);
  const [start, length, blankIndex, answer] = ask === 'after' ? [n, 2, 1, n + 1] : ask === 'before' ? [n - 1, 2, 0, n - 1] : [n - 1, 3, 1, n];
  const row = Array.from({ length }, (_, i) => start + i);
  const text = ask === 'between' ? `What number is between ${n - 1} and ${n + 1}?` : `What number comes just ${ask} ${n}?`;
  const speak: Say = ask === 'between' ? ['What number is between', { number: n - 1 }, 'and', { number: n + 1 }, '?'] : [`What number comes just ${ask}`, { number: n }, '?'];
  const counted = ask === 'between' ? row : [answer - 1, answer, answer + 1].filter((value) => value >= 100);
  const explanation: Explanation = {
    speak: ['Count by ones:', ...counted.flatMap((value, i): Say => (i === 0 ? [{ number: value }] : [',', { number: value }])), '.', { number: answer }, ...(ask === 'between' ? ['is in between.'] : [`comes just ${ask}`, { number: n }, '.'])],
    steps: [`Count by ones: ${listText(counted)}.`, `${answer} ${ask === 'between' ? 'is in between' : `comes just ${ask} ${n}`}.`],
    visual: { kind: 'sequence', items: row.map((value) => numeral(value, 'l')) },
  };
  const base = { mode: 'look' as const, prompt: { text, speak }, stimulus: { kind: 'sequence', items: row.map((value, i) => (i === blankIndex ? 'blank' : numeral(value, 'l'))) } as Visual, explanation };
  const facts = { start, step: 1, length, blankIndex };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer, maxDigits: 3 };
  // The slips: ten or a hundred out, or the next number the other way.
  const values = numeralChoices(answer, [answer + 10, answer - 10, ask === 'after' ? n - 1 : n + 1, answer + 100], 100, 999, rng);
  return choice(answer, values, facts, base);
}

export const beforeAfterGenerator: SkillGenerator = skill({
  skillId: 'M-2-A11',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: beforeAfter,
  exampleSeed: 955,
  lesson: { see: 'Counting by ones goes on past a hundred: three hundred ninety-nine, four hundred.', remember: 'After nine ones comes a new ten. After nine tens comes a new hundred.', tryLevel: 2 },
  oracle: 'sequence',
});

// ---- A.12 Show a number with blocks ----
// Levels: 100 to 199 / 200 to 999 / with a zero. Oracle: place.

function showBlocks(level: Level, rng: Rng): QuestionDraft {
  let d: { hundreds: number; tens: number; ones: number };
  if (level === 3) {
    d = { hundreds: rng.int(1, 9), tens: rng.int(1, 9), ones: rng.int(1, 9) };
    if (rng.bool()) d.tens = 0;
    else d.ones = 0;
  } else {
    d = { hundreds: level === 1 ? 1 : rng.int(2, 9), tens: rng.int(1, 9), ones: rng.int(1, 9) };
    if (d.tens === d.ones) d.ones = d.ones === 9 ? 1 : d.ones + 1;
  }
  const n = d.hundreds * 100 + d.tens * 10 + d.ones;
  const swapped = d.hundreds * 100 + d.ones * 10 + d.tens;
  const slips = [swapped, n + 100, n - 100, n + 10, n - 10, d.tens * 100 + d.hundreds * 10 + d.ones].filter((value) => value !== n && value >= 10 && value <= 999);
  const values = rng.shuffle([n, ...rng.sample([...new Set(slips)].slice(0, 3), 2)]);
  const prompt = { text: `Which blocks show ${n}?`, speak: ['Which blocks show', { number: n }, '?'] as Say };
  return {
    type: 'choice',
    mode: 'look',
    facts: { ...d, ask: 'number', options: values },
    prompt,
    options: values.map(blocks),
    answerIndex: values.indexOf(n),
    explanation: { speak: [{ number: n }, 'is', ...sayPlaces(n)], steps: [`${n} is ${placesText(n)}`, 'Find the blocks with that many of each.'], visual: blocks(n) },
  };
}

export const showBlocksGenerator: SkillGenerator = skill({
  skillId: 'M-2-A12',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: showBlocks,
  exampleSeed: 956,
  lesson: { see: 'A flat is one hundred, a rod is one ten, and a small cube is one.', remember: 'Each digit tells how many blocks of its place.', tryLevel: 2 },
  oracle: 'place',
});

// ---- A.13 Greatest and least from digits ----
// Levels: the greatest number from three digits / the least / either, with a zero, typed. Oracle: h2Digits.

function digitsMake(level: Level, rng: Rng): QuestionDraft {
  const digits = level === 3 ? [0, ...rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2)] : rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  const shown = rng.shuffle(digits);
  const ask = level === 1 ? 'greatest' : level === 2 ? 'least' : rng.pick(['greatest', 'least'] as const);
  const down = [...digits].sort((x, y) => y - x);
  const up = [...digits].sort((x, y) => x - y);
  if (up[0] === 0) [up[0], up[1]] = [up[1] as number, 0];
  const answer = Number((ask === 'greatest' ? down : up).join(''));
  const prompt = { text: `Use each digit once. Make the ${ask} number you can.`, speak: [`Use each digit once. Make the ${ask} number you can.`] as Say };
  const stimulus: Visual = { kind: 'row', children: shown.map((digit) => numeral(digit, 'l')) };
  const steps = ask === 'greatest' ? ['Put the biggest digit in the hundreds place.', 'Put the next biggest in the tens place.', `The greatest number is ${answer}.`] : [digits.includes(0) ? 'A number cannot start with 0, so the smallest digit that is not 0 goes first.' : 'Put the smallest digit in the hundreds place.', 'Then the next smallest.', `The least number is ${answer}.`];
  const explanation: Explanation = { speak: [...steps.slice(0, -1).map((line) => line.replaceAll('0', 'zero')), `The ${ask} number is`, { number: answer }, '.'], steps, visual: numeral(answer) };
  const facts = { digits: shown, ask };
  if (level === 3) return { type: 'numberPad', mode: 'look', facts, prompt, stimulus, answer, maxDigits: 3, explanation };
  const perms = [0, 1, 2].flatMap((i) => [0, 1, 2].flatMap((j) => [0, 1, 2].filter((k) => i !== j && j !== k && i !== k).map((k) => Number(`${digits[i]}${digits[j]}${digits[k]}`)))).filter((value) => value !== answer);
  const values = rng.shuffle([answer, ...rng.sample(perms, 2)]);
  return choice(answer, values, facts, { mode: 'look', prompt, stimulus, explanation });
}

export const digitsMakeGenerator: SkillGenerator = skill({
  skillId: 'M-2-A13',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: digitsMake,
  exampleSeed: 957,
  lesson: { see: 'The same three digits can make different numbers. The place of each digit decides its worth.', remember: 'Biggest digit first for the greatest. Smallest digit first for the least, but never a zero.', tryLevel: 2 },
  oracle: 'h2Digits',
});

// ---- A.14 Hundred chart puzzles ----
// Levels: the middle of a piece of the chart to 100 / any cell / past 100, typed. Oracle: h2Chart.

function chart(level: Level, rng: Rng): QuestionDraft {
  // The top left cell: its row on the chart has room for 3 cells, and the piece fits in the chart.
  const row = level === 3 ? rng.int(10, 96) : rng.int(0, 7);
  const topLeft = row * 10 + rng.int(1, 8);
  const blank = level === 1 ? 4 : rng.pick([0, 1, 2, 3, 5, 6, 7, 8]);
  const cells = Array.from({ length: 9 }, (_, i) => topLeft + 10 * Math.floor(i / 3) + (i % 3));
  const answer = cells[blank] as number;
  const prompt = 'This is part of a hundred chart. Which number is missing?';
  const above = blank >= 3;
  const from = above ? answer - 10 : answer + 10;
  const steps = ['One step right is 1 more. One step down is 10 more.', above ? `Above the gap is ${from}. ${from} + 10 = ${answer}.` : `Below the gap is ${from}. ${from} − 10 = ${answer}.`];
  const explanation: Explanation = { speak: ['One step right is one more. One step down is ten more.', above ? 'Above the gap is' : 'Below the gap is', { number: from }, '.', { number: from }, above ? 'plus' : 'minus', { number: 10 }, 'is', { number: answer }, '.'], steps, visual: { kind: 'matrix', cells: cells.map((value) => numeral(value, 'm')) } };
  const base = { mode: 'look' as const, prompt: { text: prompt, speak: [prompt] as Say }, stimulus: { kind: 'matrix', cells: cells.map((value, i) => (i === blank ? 'blank' : numeral(value, 'm'))) } as Visual, explanation };
  const facts = { topLeft, blank };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer, maxDigits: 3 };
  const values = numeralChoices(answer, [answer + 10, answer - 10, answer + 1, answer - 1], 1, 100, rng);
  return choice(answer, values, facts, base);
}

export const chartGenerator: SkillGenerator = skill({
  skillId: 'M-2-A14',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: chart,
  exampleSeed: 958,
  lesson: { see: 'On a hundred chart, each row is ten numbers long.', remember: 'Right is one more. Down is ten more.', tryLevel: 2 },
  oracle: 'h2Chart',
});
