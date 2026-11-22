import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { aboutCentimeters } from '../../../../engine/units';
import { listText, numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { line, together } from './addSubtract';
import type { Explanation } from './addSubtract';

// Grade 2 skills added by the Nov 17, 2026 curriculum check: B.11 add up to four numbers, C.5 inches,
// feet and centimeters, C.6 compare lengths, C.7 line plots, D.3 rows and columns of squares.

// Words with numbers in them, said with each number as a number.
const spoken = (words: string): Say => words.split(/(\d+)/).filter((part) => part.length > 0).map((part) => (/^\d+$/.test(part) ? { number: Number(part) } : part));
const say = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: spoken(value) });
// C.6's rulers count centimeters and say so at their end (the owner's choice, Nov 22, 2026).
const ruler = (object: 'pencil' | 'crayon' | 'ribbon', lengthUnits: number): Visual => ({ kind: 'ruler', object, startUnit: 0, lengthUnits, unit: 'cm' });
// One thing measured both ways: an inch ruler above it, a centimeter ruler below it.
const bothWays = (object: 'pencil' | 'crayon' | 'ribbon', inches: number): Visual => ({ kind: 'twoRulers', object, inches });
const cap = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
// A count said number by number: "Count them: 1, 2, 3."
const counted = (lead: string, upTo: number): { text: string; speak: Say } => {
  const values = Array.from({ length: upTo }, (_, i) => i + 1);
  return { text: `${lead} ${listText(values)}.`, speak: [lead, ...values.flatMap((value, i): Say => (i === 0 ? [{ number: value }] : [',', { number: value }])), '.'] };
};

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
  // One sum for each step. With one-digit numbers, two that make a ten are added first, as the lesson teaches.
  const pairAt = level === 1 ? [[0, 1], [0, 2], [1, 2]].find(([i, j]) => (numbers[i as number] as number) + (numbers[j as number] as number) === 10) : undefined;
  const order = pairAt ? [numbers[pairAt[0] as number] as number, numbers[pairAt[1] as number] as number, ...numbers.filter((_, k) => !pairAt.includes(k))] : numbers;
  const sums: ReturnType<typeof line>[] = [];
  let running = order[0] as number;
  order.slice(1).forEach((n, k) => {
    sums.push(line(...(pairAt && k === 0 ? ['Make a ten first:'] : []), running, '+', n, '=', running + n, '.'));
    running += n;
  });
  const explanation = together([...sums, line('The total is', total, '.')], { kind: 'equation', parts: [...parts, '=', total] }, { text: pairAt ? 'Look for two numbers that make a ten. Add those first.' : 'Add two numbers at a time.' });
  const base = { mode: 'look' as const, facts: { numbers }, prompt: { text: `What is ${numbers.join(' plus ')}?`, speak: ['What is', ...said, '?'] as Say }, stimulus: { kind: 'equation', parts: [...parts, '=', 'blank'] } as Visual, explanation };
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
    { beat: 'try', text: 'What is 4 plus 6 plus 7?', speak: ['What is', { number: 4 }, 'plus', { number: 6 }, 'plus', { number: 7 }, '?'], visual: { kind: 'equation', parts: [4, '+', 6, '+', 7, '=', 'blank'] }, reveal: { text: '4 + 6 = 10, 10 + 7 = 17.', speak: [{ number: 4 }, 'plus', { number: 6 }, 'is', { number: 10 }, '. Plus', { number: 7 }, 'is', { number: 17 }, '.'], visual: { kind: 'equation', parts: [4, '+', 6, '+', 7, '=', 17] } } },
    { beat: 'remember', text: 'Look for numbers that make a ten.', speak: ['Look for numbers that make a ten.'], visual: { kind: 'equation', parts: [4, '+', 6, '=', 10] } },
  ],
  oracle: 'sumList',
};

// ---- C.5 Inches, feet and centimeters ----
// Levels: the unit that fits / which number is bigger in smaller units / about how long. Oracle: unitChoice.

// A door is tall, the rest are long. The thing is in the facts: a phone and a spoon are both 6 inches.
const OBJECTS = [
  { emoji: '✏️', name: 'a pencil', unit: 'inches', inches: 7, way: 'long' },
  { emoji: '📱', name: 'a phone', unit: 'inches', inches: 6, way: 'long' },
  { emoji: '🥄', name: 'a spoon', unit: 'inches', inches: 6, way: 'long' },
  { emoji: '🚪', name: 'a door', unit: 'feet', inches: 84, way: 'tall' },
  { emoji: '🛏️', name: 'a bed', unit: 'feet', inches: 72, way: 'long' },
  { emoji: '🚗', name: 'a car', unit: 'feet', inches: 168, way: 'long' },
] as const;
type MeasuredThing = (typeof OBJECTS)[number];
// The things drawn on the two rulers of level 2.
const BOTH_WAYS = ['pencil', 'crayon', 'ribbon'] as const;
const pictureOf = (thing: MeasuredThing): Visual => ({ kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row', speak: [thing.name.slice(2)] });
// Whether it fits in one hand is the question a child can answer: small things are measured in inches.
const sizeLine = (thing: MeasuredThing): ReturnType<typeof line> => line(`${cap(thing.name)} is ${thing.unit === 'inches' ? 'small' : 'big'}, so we measure it in ${thing.unit}.`);

function units(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    // One thing measured both ways (the owner's choice, Nov 22, 2026): it lies between an inch ruler and a
    // centimeter ruler, so both numbers can be read and compared. 2, 4 or 6 inches end close to 5, 10 or 15
    // centimeters. The steps end on the side the question asks about.
    const object = rng.pick(BOTH_WAYS);
    const inches = rng.pick([2, 4, 6]);
    const the = `the ${object}`;
    const more = rng.bool();
    const prompt = `${cap(the)} is measured in inches and in centimeters. Which number is ${more ? 'bigger' : 'smaller'}?`;
    const steps = [
      line('An inch is longer than a centimeter.'),
      line(more ? `So more centimeters than inches fit along ${the}.` : `So fewer inches than centimeters fit along ${the}.`),
      line(`${cap(the)} is`, inches, 'inches long, and about', aboutCentimeters(inches), 'centimeters long.'),
      line(more ? 'The centimeters number is bigger.' : 'The inches number is smaller.'),
    ];
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ask: more ? 'moreUnits' : 'fewerUnits', thing: object, inches, options: ['the inches', 'the centimeters'] },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: bothWays(object, inches),
      options: ['the inches', 'the centimeters'].map(say),
      answerIndex: more ? 1 : 0,
      explanation: together(steps, bothWays(object, inches), { text: 'Which is longer: an inch or a centimeter?' }),
    };
  }
  const thing = rng.pick(OBJECTS);
  const picture = pictureOf(thing);
  if (level === 1) {
    const prompt = `Would you measure ${thing.name} in inches or in feet?`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ask: 'unit', inches: thing.inches, thing: thing.name.slice(2), options: ['inches', 'feet'] },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: picture,
      options: ['inches', 'feet'].map(say),
      answerIndex: thing.unit === 'inches' ? 0 : 1,
      explanation: together([line('Inches are for small things. Feet are for big things.'), sizeLine(thing), line('A foot is', 12, 'inches.')], picture, { text: 'Could you hold it in one hand?' }),
    };
  }
  // About how long: the real length, ten times too long, ten times too short.
  const near = thing.unit === 'inches' ? thing.inches : Math.round(thing.inches / 12);
  const choices = rng.shuffle([`${near} ${thing.unit}`, `${near * 10} ${thing.unit}`, `${near} ${thing.unit === 'inches' ? 'feet' : 'inches'}`]);
  const prompt = `About how ${thing.way} is ${thing.name}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'estimate', inches: thing.inches, thing: thing.name.slice(2), options: choices },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: picture,
    options: choices.map(say),
    answerIndex: choices.indexOf(`${near} ${thing.unit}`),
    explanation: together([sizeLine(thing), line('It is about', near, `${thing.unit} ${thing.way}.`)], picture, { text: 'Pick the unit first: inches or feet? Then pick the number.' }),
  };
}

export const unitsGenerator: SkillGenerator = {
  skillId: 'M-2-C5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  // Level 2 has a thing, its length and the side asked: 18 questions.
  pool: { 1: 6, 3: 6 },
  generate: units,
  exampleSeed: 662,
  example: () => units(1, makeRng(662)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'We measure length in inches, feet or centimeters. A foot is 12 inches.', speak: ['We measure length in inches, feet or centimeters. A foot is twelve inches.'], visual: bothWays('pencil', 6) },
    { beat: 'watch', text: 'A pencil is small: about 7 inches. A door is big: about 7 feet.', speak: ['A pencil is small: about seven inches. A door is big: about seven feet.'], visual: { kind: 'row', children: [{ kind: 'emojiGroup', emoji: '✏️', count: 1, layout: 'row' }, { kind: 'emojiGroup', emoji: '🚪', count: 1, layout: 'row' }] } },
    { beat: 'try', text: 'Would you measure a bed in inches or in feet?', speak: ['Would you measure a bed in inches or in feet?'], visual: { kind: 'emojiGroup', emoji: '🛏️', count: 1, layout: 'row' }, reveal: { text: 'A bed is big: feet.', speak: ['A bed is big: feet.'], visual: { kind: 'emojiGroup', emoji: '🛏️', count: 1, layout: 'row' } } },
    { beat: 'remember', text: 'Small unit, bigger number.', speak: ['Small unit, bigger number.'], visual: bothWays('ribbon', 4) },
  ],
  oracle: 'unitChoice',
};

// ---- C.6 Compare lengths ----
// Levels: which is longer / how much longer / typed. Oracles: compare, subtract.

function compareLengths(level: Level, rng: Rng): QuestionDraft {
  let a = rng.int(3, 10);
  const b = rng.int(2, 9);
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
      explanation: together(
        [line('The pencil is', a, 'centimeters long.'), line('The crayon is', b, 'centimeters long.'), line(Math.max(a, b), 'is more than', Math.min(a, b), `, so the ${a > b ? 'pencil' : 'crayon'} is longer.`)],
        picture,
        { text: 'Look at where each one ends on its ruler.' },
      ),
    };
  }
  const [long, short] = a > b ? [a, b] : [b, a];
  const longer = a > b ? 'pencil' : 'crayon';
  const prompt = { text: `The pencil is ${a} centimeters. The crayon is ${b} centimeters. How much longer is the ${longer}?`, speak: ['The pencil is', { number: a }, 'centimeters. The crayon is', { number: b }, `centimeters. How much longer is the ${longer}?`] as Say };
  const explanation: Explanation = together(
    [line('To find how much longer, subtract the short length from the long one.'), line(long, '−', short, '=', long - short, '.'), line(`The ${longer} is`, long - short, long - short === 1 ? 'centimeter longer.' : 'centimeters longer.')],
    picture,
    { text: 'How much longer? Subtract.' },
  );
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
    // The stacks with marks, added up: an empty stack adds nothing.
    const stacks = counts.filter((count) => count > 0);
    const sum = stacks.length > 1 ? line(...stacks.flatMap((count, i) => (i === 0 ? [count] : ['+', count])), '=', total, '.') : line('There are', total, 'X marks.');
    const explanation = together([line('Count the X marks above each number.'), sum, line(total, 'shoes were measured.')], visual, { text: 'Count every X mark.' });
    return { type: 'numberPad', mode: 'look', facts: { values: counts, ask: 'total' }, prompt: { text: 'Each X is one shoe. How many shoes were measured?', speak: ['Each X is one shoe. How many shoes were measured?'] }, stimulus: visual, answer: total, maxDigits: 2, explanation };
  }
  if (level === 2) {
    const offered = rng.shuffle([top, ...rng.sample([0, 1, 2, 3, 4].filter((i) => i !== top), 2)]);
    const prompt = 'Which length has the most shoes?';
    const explanation = together([line('Find the tallest stack of X marks.'), line('It is above', min + top, '.'), line('The most shoes are', min + top, 'inches long.')], visual, { text: 'Look for the tallest stack of X marks.' });
    return { type: 'choice', mode: 'look', facts: { values: offered.map((i) => counts[i] as number), ask: 'most', options: offered.map((i) => min + i) }, prompt: { text: prompt, speak: [prompt] }, stimulus: visual, options: offered.map((i) => say(`${min + i} inches`)), answerIndex: offered.indexOf(top), explanation };
  }
  const index = rng.int(0, 4);
  const answer = counts[index] as number;
  const at = min + index;
  const values = numeralChoices(answer, [answer + 1, answer - 1, counts[(index + 1) % 5] as number], 0, 6, rng);
  const count = answer === 0 ? line('There are no X marks above it.') : counted('Count the X marks above it:', answer);
  const shoes = answer === 0 ? line('No shoes are', at, 'inches long.') : line(answer, answer === 1 ? 'shoe is' : 'shoes are', at, 'inches long.');
  const explanation = together([line('Find', at, 'on the line.'), count, shoes], visual, { text: 'Find the number on the line. Then count the X marks above it.' });
  return { type: 'choice', mode: 'look', facts: { values: counts, ask: 'value', index, options: values }, prompt: { text: `How many shoes are ${at} inches long?`, speak: ['How many shoes are', { number: at }, 'inches long?'] }, stimulus: visual, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer), explanation };
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
  // Grade 2 adds the rows, one number for each row, as B.8 does: times comes in grade 3.
  const rowSum = Array.from({ length: rows }, () => cols);
  const explanation = together(
    [line('There are', rows, 'rows, with', cols, 'squares in each row.'), line(...rowSum.flatMap((part, i) => (i === 0 ? [part] : ['+', part])), '=', rows * cols, '.'), line('There are', rows * cols, 'squares.')],
    grid,
    { text: 'Count the squares in one row. Then add one row at a time.' },
  );
  if (level === 2) {
    const ask = rng.pick(['rows', 'cols'] as const);
    const answer = ask === 'rows' ? rows : cols;
    const values = numeralChoices(answer, [ask === 'rows' ? cols : rows, answer + 1, answer - 1], 1, 8, rng);
    const prompt = ask === 'rows' ? 'How many rows go across?' : 'How many columns go up and down?';
    // The steps count what was asked, not the squares.
    const counting =
      ask === 'rows'
        ? together([line('Rows go across.'), counted('Count down one side, one row at a time:', rows), line('There are', rows, 'rows.')], grid, { text: 'Count the squares down one side.' })
        : together([line('Columns go up and down.'), counted('Count along the top, one column at a time:', cols), line('There are', cols, 'columns.')], grid, { text: 'Count the squares along the top row.' });
    return { type: 'choice', mode: 'look', facts: { rows, cols, ask: 'missing', blank: ask, options: values }, prompt: { text: prompt, speak: [prompt] }, stimulus: grid, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer), explanation: counting };
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
