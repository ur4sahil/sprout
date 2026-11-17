import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';

// Grade 2 skills added by the Nov 17, 2026 curriculum check: B.11 add up to four numbers, C.5 inches,
// feet and centimeters, C.6 compare lengths, C.7 line plots, D.3 rows and columns of squares.

type Explanation = { speak: Say; steps: string[]; visual: Visual };
// Words with numbers in them, said with each number as a number.
const spoken = (words: string): Say => words.split(/(\d+)/).filter((part) => part.length > 0).map((part) => (/^\d+$/.test(part) ? { number: Number(part) } : part));
const say = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: spoken(value) });
const ruler = (object: 'pencil' | 'crayon' | 'ribbon', lengthUnits: number): Visual => ({ kind: 'ruler', object, startUnit: 0, lengthUnits });

// ---- B.11 Add up to four numbers ----
// Levels: three numbers to 30 / four two-digit numbers to 100 / typed. Oracle: sumList.

function addMany(level: Level, rng: Rng): QuestionDraft {
  const count = level === 1 ? 3 : 4;
  let numbers: number[];
  do numbers = Array.from({ length: count }, () => (level === 1 ? rng.int(1, 9) : rng.int(10, 35)));
  while (numbers.reduce((s, n) => s + n, 0) > (level === 1 ? 30 : 100));
  const total = numbers.reduce((s, n) => s + n, 0);
  const parts = numbers.flatMap((n, i) => (i === 0 ? [n] : ['+', n]));
  const said: Say = numbers.flatMap((n, i): Say => (i === 0 ? [{ number: n }] : ['plus', { number: n }]));
  // Make a ten first when two of the ones do.
  const steps: string[] = [];
  let running = numbers[0] as number;
  for (const n of numbers.slice(1)) {
    steps.push(`${running} + ${n} = ${running + n}`);
    running += n;
  }
  const explanation: Explanation = { speak: ['Add two at a time.', ...said, 'is', { number: total }, '.'], steps: ['Add two at a time.', steps.join(', '), `The total is ${total}.`].slice(0, 4), visual: { kind: 'equation', parts: [...parts, '=', total] } };
  const base = { mode: 'look' as const, facts: { numbers }, prompt: { text: `${numbers.join(' + ')} equals what?`, speak: [...said, 'equals what?'] as Say }, stimulus: { kind: 'equation', parts: [...parts, '=', 'blank'] } as Visual, explanation };
  if (level === 3) return { ...base, type: 'numberPad', answer: total, maxDigits: 3 };
  const values = numeralChoices(total, [total + 10, total - 10, total + 1, total - 1], 1, 120, rng);
  return { ...base, type: 'choice', facts: { numbers, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(total) };
}

export const addManyGenerator: SkillGenerator = {
  skillId: 'M-2-B11',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: addMany,
  exampleSeed: 661,
  example: () => addMany(1, makeRng(661)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To add many numbers, add two at a time.', speak: ['To add many numbers, add two at a time.'], visual: { kind: 'equation', parts: [12, '+', 8, '+', 15, '+', 10] } },
    { beat: 'watch', text: '12 + 8 = 20, 20 + 15 = 35, 35 + 10 = 45.', speak: [{ number: 12 }, 'plus', { number: 8 }, 'is', { number: 20 }, '. Then', { number: 35 }, ', then', { number: 45 }, '.'], visual: { kind: 'equation', parts: [12, '+', 8, '+', 15, '+', 10, '=', 45] } },
    { beat: 'try', text: '4 + 6 + 7 equals what?', speak: [{ number: 4 }, 'plus', { number: 6 }, 'plus', { number: 7 }, 'equals what?'], visual: { kind: 'equation', parts: [4, '+', 6, '+', 7, '=', 'blank'] }, reveal: { text: '4 + 6 = 10, 10 + 7 = 17.', speak: [{ number: 4 }, 'plus', { number: 6 }, 'is', { number: 10 }, '. Plus', { number: 7 }, 'is', { number: 17 }, '.'], visual: { kind: 'equation', parts: [4, '+', 6, '+', 7, '=', 17] } } },
    { beat: 'remember', text: 'Look for numbers that make a ten.', speak: ['Look for numbers that make a ten.'], visual: { kind: 'equation', parts: [4, '+', 6, '=', 10] } },
  ],
  oracle: 'sumList',
};

// ---- C.5 Inches, feet and centimeters ----
// Levels: the unit that fits / which number is bigger in smaller units / about how long. Oracle: unitChoice.

const OBJECTS = [
  { emoji: '✏️', name: 'a pencil', unit: 'inches', inches: 7 },
  { emoji: '📱', name: 'a phone', unit: 'inches', inches: 6 },
  { emoji: '🥄', name: 'a spoon', unit: 'inches', inches: 6 },
  { emoji: '🚪', name: 'a door', unit: 'feet', inches: 84 },
  { emoji: '🛏️', name: 'a bed', unit: 'feet', inches: 72 },
  { emoji: '🚗', name: 'a car', unit: 'feet', inches: 168 },
] as const;

function units(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(OBJECTS);
  const picture: Visual = { kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row', speak: [thing.name.slice(2)] };
  if (level === 1) {
    const prompt = `Would you measure ${thing.name} in inches or in feet?`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ask: 'unit', inches: thing.inches, options: ['inches', 'feet'] },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: picture,
      options: ['inches', 'feet'].map(say),
      answerIndex: thing.unit === 'inches' ? 0 : 1,
      explanation: { speak: ['Small things are measured in inches. Big things are measured in feet. A foot is twelve inches.'], steps: ['Small things: inches. Big things: feet.', 'A foot is 12 inches.'], visual: picture },
    };
  }
  if (level === 2) {
    const n = rng.int(3, 9);
    const more = rng.bool();
    const prompt = `A ribbon is measured in inches and in centimeters. Which number is ${more ? 'bigger' : 'smaller'}?`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ask: more ? 'moreUnits' : 'fewerUnits', options: ['the inches', 'the centimeters'] },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: ruler('ribbon', n),
      options: ['the inches', 'the centimeters'].map(say),
      answerIndex: more ? 1 : 0,
      explanation: { speak: ['A centimeter is smaller than an inch. Smaller units fit more times, so the number of centimeters is bigger.'], steps: ['A centimeter is smaller than an inch.', 'Smaller units fit more times.', 'So the centimeters number is bigger.'], visual: ruler('ribbon', n) },
    };
  }
  // About how long: the real length, ten times too long, ten times too short.
  const near = thing.unit === 'inches' ? thing.inches : Math.round(thing.inches / 12);
  const choices = rng.shuffle([`${near} ${thing.unit}`, `${near * 10} ${thing.unit}`, `${near} ${thing.unit === 'inches' ? 'feet' : 'inches'}`]);
  const prompt = `About how long is ${thing.name}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'estimate', inches: thing.inches, options: choices },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: picture,
    options: choices.map(say),
    answerIndex: choices.indexOf(`${near} ${thing.unit}`),
    explanation: { speak: spoken(`${thing.name} is about ${near} ${thing.unit} long.`), steps: [`${thing.name[0]?.toUpperCase()}${thing.name.slice(1)} is about ${near} ${thing.unit} long.`], visual: picture },
  };
}

export const unitsGenerator: SkillGenerator = {
  skillId: 'M-2-C5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 5, 2: 2, 3: 5 },
  generate: units,
  exampleSeed: 662,
  example: () => units(1, makeRng(662)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'We measure length in inches, feet or centimeters. A foot is 12 inches.', speak: ['We measure length in inches, feet or centimeters. A foot is twelve inches.'], visual: ruler('pencil', 6) },
    { beat: 'watch', text: 'A pencil is small: about 7 inches. A door is big: about 7 feet.', speak: ['A pencil is small: about seven inches. A door is big: about seven feet.'], visual: { kind: 'row', children: [{ kind: 'emojiGroup', emoji: '✏️', count: 1, layout: 'row' }, { kind: 'emojiGroup', emoji: '🚪', count: 1, layout: 'row' }] } },
    { beat: 'try', text: 'Would you measure a bed in inches or in feet?', speak: ['Would you measure a bed in inches or in feet?'], visual: { kind: 'emojiGroup', emoji: '🛏️', count: 1, layout: 'row' }, reveal: { text: 'A bed is big: feet.', speak: ['A bed is big: feet.'], visual: { kind: 'emojiGroup', emoji: '🛏️', count: 1, layout: 'row' } } },
    { beat: 'remember', text: 'Small unit, bigger number.', speak: ['Small unit, bigger number.'], visual: ruler('ribbon', 5) },
  ],
  oracle: 'unitChoice',
};

// ---- C.6 Compare lengths ----
// Levels: which is longer / how much longer / typed. Oracles: compare, subtract.

function compareLengths(level: Level, rng: Rng): QuestionDraft {
  let [a, b] = [rng.int(3, 10), rng.int(2, 9)];
  if (a === b) a += 1;
  const picture: Visual = { kind: 'row', children: [ruler('pencil', a), ruler('crayon', b)] };
  if (level === 1) {
    const prompt = 'Which is longer?';
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { values: [a, b], ask: 'most', oracle: 'compare', options: ['pencil', 'crayon'] },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: picture,
      options: [say('the pencil'), say('the crayon')],
      answerIndex: a > b ? 0 : 1,
      explanation: { speak: ['The pencil is', { number: a }, 'centimeters. The crayon is', { number: b }, 'centimeters.'], steps: [`Pencil: ${a} cm. Crayon: ${b} cm.`, `The ${a > b ? 'pencil' : 'crayon'} is longer.`], visual: picture },
    };
  }
  const [long, short] = a > b ? [a, b] : [b, a];
  const prompt = { text: `The pencil is ${a} centimeters. The crayon is ${b} centimeters. How much longer is the ${a > b ? 'pencil' : 'crayon'}?`, speak: ['The pencil is', { number: a }, 'centimeters. The crayon is', { number: b }, `centimeters. How much longer is the ${a > b ? 'pencil' : 'crayon'}?`] as Say };
  const explanation: Explanation = { speak: [{ number: long }, 'minus', { number: short }, 'is', { number: long - short }, 'centimeters.'], steps: [`${long} − ${short} = ${long - short}.`, `It is ${long - short} centimeters longer.`], visual: picture };
  const base = { mode: 'look' as const, facts: { a: long, b: short, oracle: 'subtract' }, prompt, stimulus: picture, explanation };
  if (level === 3) return { ...base, type: 'numberPad', answer: long - short, maxDigits: 1 };
  const values = numeralChoices(long - short, [long, long + short, long - short + 1, short], 1, 20, rng, [1, 2, 2]);
  return { ...base, type: 'choice', facts: { ...base.facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(long - short) };
}

export const compareLengthsGenerator: SkillGenerator = {
  skillId: 'M-2-C6',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: compareLengths,
  exampleSeed: 663,
  example: () => compareLengths(1, makeRng(663)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To find how much longer, take the short length from the long one.', speak: ['To find how much longer, take the short length from the long one.'], visual: { kind: 'row', children: [ruler('pencil', 8), ruler('crayon', 5)] } },
    { beat: 'watch', text: '8 − 5 = 3. The pencil is 3 centimeters longer.', speak: [{ number: 8 }, 'minus', { number: 5 }, 'is', { number: 3 }, '. The pencil is three centimeters longer.'], visual: { kind: 'row', children: [ruler('pencil', 8), ruler('crayon', 5)] } },
    { beat: 'try', text: 'The pencil is 9 centimeters. The crayon is 4. How much longer is the pencil?', speak: ['The pencil is', { number: 9 }, 'centimeters. The crayon is', { number: 4 }, '. How much longer is the pencil?'], visual: { kind: 'row', children: [ruler('pencil', 9), ruler('crayon', 4)] }, reveal: { text: '9 − 4 = 5 centimeters.', speak: [{ number: 9 }, 'minus', { number: 4 }, 'is', { number: 5 }, 'centimeters.'], visual: { kind: 'row', children: [ruler('pencil', 9), ruler('crayon', 4)] } } },
    { beat: 'remember', text: 'How much longer? Subtract.', speak: ['How much longer? Subtract.'], visual: { kind: 'row', children: [ruler('pencil', 8), ruler('crayon', 5)] } },
  ],
  oracle: 'compare',
};

// ---- C.7 Line plots ----
// Levels: how many at one length / which length has the most / how many in all, typed. Oracle: graph.

function linePlots2(level: Level, rng: Rng): QuestionDraft {
  const min = rng.int(3, 8);
  const top = rng.int(0, 4);
  const counts = Array.from({ length: 5 }, (_, i) => (i === top ? 5 : rng.int(0, 4)));
  const visual: Visual = { kind: 'linePlot', min, max: min + 4, denominator: 1, counts, unit: 'Length of shoes (inches)' };
  if (level === 3) {
    const total = counts.reduce((s, c) => s + c, 0);
    return { type: 'numberPad', mode: 'look', facts: { values: counts, ask: 'total' }, prompt: { text: 'Each X is one shoe. How many shoes were measured?', speak: ['Each X is one shoe. How many shoes were measured?'] }, stimulus: visual, answer: total, maxDigits: 2, explanation: { speak: ['Count every X:', { number: total }, '.'], steps: [`${counts.join(' + ')} = ${total}.`], visual } };
  }
  if (level === 2) {
    const offered = rng.shuffle([top, ...rng.sample([0, 1, 2, 3, 4].filter((i) => i !== top), 2)]);
    const prompt = 'Which length did the most shoes have?';
    return { type: 'choice', mode: 'look', facts: { values: offered.map((i) => counts[i] as number), ask: 'most', options: offered.map((i) => min + i) }, prompt: { text: prompt, speak: [prompt] }, stimulus: visual, options: offered.map((i) => say(`${min + i} inches`)), answerIndex: offered.indexOf(top), explanation: { speak: ['The tallest stack of X marks is at', { number: min + top }, 'inches.'], steps: [`The tallest stack is at ${min + top} inches.`], visual } };
  }
  const index = rng.int(0, 4);
  const answer = counts[index] as number;
  const values = numeralChoices(answer, [answer + 1, answer - 1, counts[(index + 1) % 5] as number], 0, 6, rng);
  return { type: 'choice', mode: 'look', facts: { values: counts, ask: 'value', index, options: values }, prompt: { text: `How many shoes are ${min + index} inches long?`, speak: ['How many shoes are', { number: min + index }, 'inches long?'] }, stimulus: visual, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer), explanation: { speak: ['Count the X marks above', { number: min + index }, ':', { number: answer }, '.'], steps: [`Count the X marks above ${min + index}: ${answer}.`], visual } };
}

export const linePlots2Generator: SkillGenerator = {
  skillId: 'M-2-C7',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: linePlots2,
  exampleSeed: 664,
  example: () => linePlots2(1, makeRng(664)),
  lesson: (): LessonStep[] => {
    const sample: Visual = { kind: 'linePlot', min: 5, max: 9, denominator: 1, counts: [1, 3, 5, 2, 0], unit: 'Length of shoes (inches)' };
    return [
      { beat: 'see', text: 'A line plot puts an X above each length that was measured.', speak: ['A line plot puts an X above each length that was measured.'], visual: sample },
      { beat: 'watch', text: 'Above 6 there are 3 X marks: 3 shoes are 6 inches long.', speak: ['Above six there are three X marks: three shoes are six inches long.'], visual: sample },
      { beat: 'try', text: 'How many shoes are 7 inches long?', speak: ['How many shoes are seven inches long?'], visual: sample, reveal: { text: '5 X marks: 5 shoes.', speak: ['Five X marks: five shoes.'], visual: sample } },
      { beat: 'remember', text: 'One X is one thing measured.', speak: ['One X is one thing measured.'], visual: sample },
    ];
  },
  oracle: 'graph',
};

// ---- D.3 Rows and columns of squares ----
// Levels: how many squares / how many rows or columns / typed. Oracle: multiply.

function rowsColumns(level: Level, rng: Rng): QuestionDraft {
  const rows = rng.int(2, 5);
  let cols = rng.int(2, 5);
  if (cols === rows) cols = rows === 5 ? 4 : rows + 1;
  const grid: Visual = { kind: 'array', rows, cols, emoji: '🟩' };
  const explanation: Explanation = { speak: ['There are', { number: rows }, 'rows of', { number: cols }, 'squares.', { number: rows }, 'times', { number: cols }, 'is', { number: rows * cols }, '.'], steps: [`${rows} rows of ${cols} squares.`, `${rows} × ${cols} = ${rows * cols} squares.`], visual: grid };
  if (level === 2) {
    const ask = rng.pick(['rows', 'cols'] as const);
    const answer = ask === 'rows' ? rows : cols;
    const values = numeralChoices(answer, [ask === 'rows' ? cols : rows, answer + 1, answer - 1], 1, 8, rng);
    const prompt = ask === 'rows' ? 'How many rows go across?' : 'How many columns go up and down?';
    return { type: 'choice', mode: 'look', facts: { rows, cols, ask: 'missing', blank: ask, options: values }, prompt: { text: prompt, speak: [prompt] }, stimulus: grid, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer), explanation };
  }
  const prompt = 'The rectangle is cut into rows and columns of squares. How many squares are there?';
  const base = { mode: 'look' as const, facts: { rows, cols, ask: 'total' }, prompt: { text: prompt, speak: [prompt] as Say }, stimulus: grid, explanation };
  if (level === 3) return { ...base, type: 'numberPad', answer: rows * cols, maxDigits: 2 };
  const values = numeralChoices(rows * cols, [rows + cols, rows * cols + 1, rows * cols - 1], 1, 30, rng);
  return { ...base, type: 'choice', facts: { ...base.facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(rows * cols) };
}

export const rowsColumnsGenerator: SkillGenerator = {
  skillId: 'M-2-D3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: rowsColumns,
  exampleSeed: 665,
  example: () => rowsColumns(1, makeRng(665)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A rectangle can be cut into rows and columns of equal squares.', speak: ['A rectangle can be cut into rows and columns of equal squares.'], visual: { kind: 'array', rows: 3, cols: 4, emoji: '🟩' } },
    { beat: 'watch', text: '3 rows of 4 squares: 12 squares.', speak: ['Three rows of four squares: twelve squares.'], visual: { kind: 'array', rows: 3, cols: 4, emoji: '🟩' } },
    { beat: 'try', text: 'How many squares?', speak: ['How many squares?'], visual: { kind: 'array', rows: 2, cols: 5, emoji: '🟩' }, reveal: { text: '2 rows of 5: 10 squares.', speak: ['Two rows of five: ten squares.'], visual: { kind: 'array', rows: 2, cols: 5, emoji: '🟩' } } },
    { beat: 'remember', text: 'Rows go across. Columns go up and down.', speak: ['Rows go across. Columns go up and down.'], visual: { kind: 'array', rows: 3, cols: 4, emoji: '🟩' } },
  ],
  oracle: 'multiply',
};
