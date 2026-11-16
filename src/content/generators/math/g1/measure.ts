import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { CoinName, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { Countable } from '../../../data/countables';
import { STORY_COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';

// Math grade 1 C.1 to C.4: telling time, ordering by length, picture graphs and coins.

type Explanation = { speak: Say; steps: string[]; visual: Visual };

// ---- C.1 Tell time: hour and half hour ----
// Levels: hours / half hours / match a clock to a written time. Family: Time. Oracle: time.

interface Time {
  hour: number;
  minute: number;
}
const written = (time: Time): string => `${time.hour}:${String(time.minute).padStart(2, '0')}`;
const clock = (time: Time): Visual => ({ kind: 'clock', hour: time.hour, minute: time.minute });
const timeText = (time: Time): Visual => ({ kind: 'text', value: written(time), size: 'l', speak: [{ time }] });
const nextHour = (hour: number): number => (hour % 12) + 1;
const hourBefore = (hour: number): number => ((hour + 10) % 12) + 1;

function timeExplanation(time: Time): Explanation {
  if (time.minute === 0) {
    return {
      speak: ['The long hand points to', { number: 12 }, '. The short hand points to', { number: time.hour }, '. It is', { time }, '.'],
      steps: ['The long hand points to 12.', `The short hand points to ${time.hour}.`, `It is ${time.hour} o'clock.`],
      visual: clock(time),
    };
  }
  return {
    speak: ['The long hand points to', { number: 6 }, '. The short hand is halfway between', { number: time.hour }, 'and', { number: nextHour(time.hour) }, '. It is', { time }, '.'],
    steps: ['The long hand points to 6.', `The short hand is halfway between ${time.hour} and ${nextHour(time.hour)}.`, `It is half past ${time.hour}.`],
    visual: clock(time),
  };
}

// The times offered beside the right one: the hour before or after, and the same hour at the other half.
function nearTimes(time: Time, rng: Rng): Time[] {
  const others: Time[] = [
    { hour: nextHour(time.hour), minute: time.minute },
    { hour: hourBefore(time.hour), minute: time.minute },
    { hour: time.hour, minute: time.minute === 0 ? 30 : 0 },
  ];
  return rng.sample(others, 2);
}

const WHAT_TIME = 'What time is it?';

function tellTime(level: Level, rng: Rng): QuestionDraft {
  const time: Time = { hour: rng.int(1, 12), minute: level === 1 ? 0 : level === 2 ? 30 : rng.pick([0, 30]) };
  const options = rng.shuffle([time, ...nearTimes(time, rng)]);
  const facts = { hour: time.hour, minute: time.minute, options: options.map(written) };
  if (level === 3) {
    return {
      type: 'choice',
      mode: 'look',
      facts: { ...facts, show: 'clocks' },
      prompt: { text: `Which clock shows ${written(time)}?`, speak: ['Which clock shows', { time }, '?'] },
      stimulus: timeText(time),
      options: options.map(clock),
      answerIndex: options.indexOf(time),
      explanation: timeExplanation(time),
    };
  }
  return {
    type: 'choice',
    mode: 'look',
    facts,
    prompt: { text: WHAT_TIME, speak: [WHAT_TIME] },
    stimulus: clock(time),
    options: options.map(timeText),
    answerIndex: options.indexOf(time),
    explanation: timeExplanation(time),
  };
}

export const tellTimeGenerator: SkillGenerator = {
  skillId: 'M-1-C1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: tellTime,
  exampleSeed: 131,
  example: () => tellTime(1, makeRng(131)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A clock has two hands. The short hand shows the hour. The long hand shows the minutes.', speak: ['A clock has two hands. The short hand shows the hour. The long hand shows the minutes.'], visual: clock({ hour: 3, minute: 0 }) },
    { beat: 'watch', text: timeExplanation({ hour: 3, minute: 0 }).steps.join(' '), speak: timeExplanation({ hour: 3, minute: 0 }).speak, visual: clock({ hour: 3, minute: 0 }) },
    { beat: 'try', text: WHAT_TIME, speak: [WHAT_TIME], visual: clock({ hour: 7, minute: 30 }), reveal: { text: timeExplanation({ hour: 7, minute: 30 }).steps.join(' '), speak: timeExplanation({ hour: 7, minute: 30 }).speak, visual: clock({ hour: 7, minute: 30 }) } },
    { beat: 'remember', text: 'Short hand shows the hour.', speak: ['Short hand shows the hour.'], visual: clock({ hour: 9, minute: 0 }) },
  ],
  oracle: 'time',
};

// ---- C.2 Order by length ----
// Levels: 3 bars / 4 bars / 4 bars with close lengths. Family: Order by length. Oracle: order.

const bar = (length: number, color: ColorName): Visual => ({ kind: 'bar', length, color, orientation: 'horizontal' });
const SHORTEST_FIRST = 'Put them in order, shortest first.';

function orderExplanation(sorted: number[], color: ColorName): Explanation {
  return { speak: ['This one is the shortest. This one is the longest.'], steps: ['This one is the shortest.', 'This one is the longest.'], visual: { kind: 'row', children: [bar(sorted[0] as number, color), bar(sorted[sorted.length - 1] as number, color)] } };
}

// Lengths that differ by at least `gap`, from 1 to 10, not already in order.
function lengths(count: number, gap: number, close: boolean, rng: Rng): number[] {
  for (;;) {
    const picked = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], count);
    const sorted = picked.slice().sort((x, y) => x - y);
    const gaps = sorted.slice(1).map((value, i) => value - (sorted[i] as number));
    if (gaps.some((each) => each < gap)) continue;
    // Close lengths: every bar is one unit from the next.
    if (close && gaps.some((each) => each !== 1)) continue;
    if (picked.every((value, i) => value === sorted[i])) continue;
    return picked;
  }
}

function orderByLength(level: Level, rng: Rng): QuestionDraft {
  const values = level === 1 ? lengths(3, 2, false, rng) : level === 2 ? lengths(4, 2, false, rng) : lengths(4, 1, true, rng);
  const color = rng.pick(COLOR_NAMES);
  const sorted = values.slice().sort((x, y) => x - y);
  return {
    type: 'order',
    mode: 'look',
    facts: { values, color },
    prompt: { text: SHORTEST_FIRST, speak: [SHORTEST_FIRST] },
    items: values.map((value) => bar(value, color)),
    answerOrder: sorted.map((value) => values.indexOf(value)),
    explanation: orderExplanation(sorted, color),
  };
}

export const orderByLengthGenerator: SkillGenerator = {
  skillId: 'M-1-C2',
  maxLevel: 3,
  itemTypes: ['order'],
  lists: ['colors'],
  generate: orderByLength,
  exampleSeed: 132,
  example: () => orderByLength(1, makeRng(132)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Some things are longer than others. Line them up at one end to see.', speak: ['Some things are longer than others. Line them up at one end to see.'], visual: { kind: 'row', children: [bar(6, 'blue'), bar(3, 'blue')] } },
    { beat: 'watch', text: 'This one is the shortest. This one is the longest.', speak: ['This one is the shortest. This one is the longest.'], visual: { kind: 'row', children: [bar(2, 'green'), bar(5, 'green'), bar(8, 'green')] } },
    { beat: 'try', text: SHORTEST_FIRST, speak: [SHORTEST_FIRST], visual: { kind: 'row', children: [bar(7, 'orange'), bar(2, 'orange'), bar(4, 'orange')] }, reveal: { text: 'This one is the shortest. This one is the longest.', speak: ['This one is the shortest. This one is the longest.'], visual: { kind: 'row', children: [bar(2, 'orange'), bar(4, 'orange'), bar(7, 'orange')] } } },
    { beat: 'remember', text: 'Line up one end, then look at the other.', speak: ['Line up one end, then look at the other.'], visual: { kind: 'row', children: [bar(2, 'green'), bar(5, 'green'), bar(8, 'green')] } },
  ],
  oracle: 'order',
};

// ---- C.3 Picture graphs ----
// Levels: read one category / most or least / how many more, typed. Family: Graphs, and How many more. Oracle: graph.

interface Chart {
  things: Countable[];
  values: number[];
}
const chartVisual = (chart: Chart): Visual => ({ kind: 'graph', type: 'picture', categories: chart.things.map((thing, i) => ({ label: thing.many, emoji: thing.emoji, value: chart.values[i] as number })) });

// Three things with three different values, so there is one most and one least.
function newChart(rng: Rng): Chart {
  return { things: rng.sample(STORY_COUNTABLES, 3), values: rng.sample([1, 2, 3, 4, 5, 6], 3) };
}

function pictureGraph(level: Level, rng: Rng): QuestionDraft {
  const chart = newChart(rng);
  const names = chart.things.map((thing) => thing.many);
  const stimulus = chartVisual(chart);
  const base = { values: chart.values, things: chart.things.map((thing) => thing.one) };
  if (level === 1) {
    const index = rng.int(0, 2);
    const value = chart.values[index] as number;
    const prompt = `How many chose ${names[index]}?`;
    // The slips: reading another row.
    const values = numeralChoices(value, chart.values, 0, 8, rng);
    return {
      type: 'choice',
      mode: 'look',
      facts: { ...base, ask: 'value', index, options: values },
      prompt: { text: prompt, speak: [prompt] },
      stimulus,
      options: values.map((each) => numeral(each)),
      answerIndex: values.indexOf(value),
      explanation: { speak: [`Find ${names[index]}. Count its row.`, { number: value }, '.'], steps: [`Find ${names[index]}.`, `Count its row: ${value}.`], visual: stimulus },
    };
  }
  if (level === 2) {
    const ask = rng.pick(['most', 'least'] as const);
    const wanted = ask === 'most' ? Math.max(...chart.values) : Math.min(...chart.values);
    const index = chart.values.indexOf(wanted);
    const prompt = `Which one has the ${ask === 'most' ? 'most' : 'fewest'}?`;
    const line = `The ${names[index]} row is the ${ask === 'most' ? 'longest' : 'shortest'}.`;
    return {
      type: 'choice',
      mode: 'look',
      // The pictures stay in the order of the graph's rows, so they are not shuffled.
      fixedOrder: true,
      facts: { ...base, ask, options: chart.things.map((thing) => thing.one) },
      prompt: { text: prompt, speak: [prompt] },
      stimulus,
      options: chart.things.map((thing): Visual => ({ kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row', speak: [{ word: thing.many }] })),
      answerIndex: index,
      explanation: { speak: [line, 'It has', { number: wanted }, '.'], steps: [line, `It has ${wanted}.`], visual: stimulus },
    };
  }
  // How many more: the bigger of two rows against the smaller.
  const [one, two] = rng.sample([0, 1, 2], 2) as [number, number];
  const [index, other] = (chart.values[one] as number) > (chart.values[two] as number) ? [one, two] : [two, one];
  const [a, b] = [chart.values[index] as number, chart.values[other] as number];
  const prompt = `How many more chose ${names[index]} than ${names[other]}?`;
  return {
    type: 'numberPad',
    mode: 'look',
    facts: { ...base, ask: 'difference', index, other },
    prompt: { text: prompt, speak: [prompt] },
    stimulus,
    answer: a - b,
    maxDigits: 1,
    explanation: {
      speak: [`The ${names[index]} row has`, { number: a }, `. The ${names[other]} row has`, { number: b }, '.', { number: a }, 'minus', { number: b }, 'is', { number: a - b }, '.'],
      steps: [`The ${names[index]} row has ${a}.`, `The ${names[other]} row has ${b}.`, `${a} minus ${b} is ${a - b}.`],
      visual: stimulus,
    },
  };
}

export const pictureGraphsGenerator: SkillGenerator = {
  skillId: 'M-1-C3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: pictureGraph,
  exampleSeed: 133,
  example: () => pictureGraph(1, makeRng(133)),
  lesson: (): LessonStep[] => {
    const chart: Chart = { things: STORY_COUNTABLES.slice(0, 3) as Countable[], values: [4, 2, 5] };
    const names = chart.things.map((thing) => thing.many);
    return [
      { beat: 'see', text: 'A picture graph shows how many. Each picture stands for one.', speak: ['A picture graph shows how many. Each picture stands for one.'], visual: chartVisual(chart) },
      { beat: 'watch', text: `How many chose ${names[0]}? Find ${names[0]}. Count its row: 4.`, speak: [`How many chose ${names[0]}? Find ${names[0]}. Count its row.`, { number: 4 }, '.'], visual: chartVisual(chart) },
      { beat: 'try', text: `How many chose ${names[2]}?`, speak: [`How many chose ${names[2]}?`], visual: chartVisual(chart), reveal: { text: `Find ${names[2]}. Count its row: 5.`, speak: [`Find ${names[2]}. Count its row.`, { number: 5 }, '.'] } },
      { beat: 'remember', text: 'Read one row at a time.', speak: ['Read one row at a time.'], visual: chartVisual(chart) },
    ];
  },
  oracle: 'graph',
};

// ---- C.4 Coins ----
// Levels: name penny, nickel, dime, quarter / value of one coin / which coin is worth more. Family: Coins. Oracle: money.

const COINS: CoinName[] = ['penny', 'nickel', 'dime', 'quarter'];
const CENTS: Record<CoinName, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
const coin = (name: CoinName): Visual => ({ kind: 'coins', coins: [name] });
const an = (name: CoinName): string => `a ${name}`;

function coinExplanation(name: CoinName): Explanation {
  const cents = CENTS[name];
  return {
    speak: [`This is ${an(name)}. It is worth`, { cents }, '. Look at its size, its colour and its picture.'],
    steps: [`This is ${an(name)}.`, `It is worth ${cents} ${cents === 1 ? 'cent' : 'cents'}.`, 'Look at its size, its colour and its picture.'],
    visual: coin(name),
  };
}

const WHICH_COIN = 'Which coin is this?';

function coins(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const name = rng.pick(COINS);
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { coins: [name], ask: 'name', options: [...COINS] },
      prompt: { text: WHICH_COIN, speak: [WHICH_COIN] },
      stimulus: coin(name),
      options: COINS.map((each): Visual => ({ kind: 'text', value: each, size: 'l', speak: [each] })),
      answerIndex: COINS.indexOf(name),
      explanation: coinExplanation(name),
    };
  }
  if (level === 2) {
    const name = rng.pick(COINS);
    const prompt = 'How much is this coin worth?';
    return {
      type: 'choice',
      mode: 'look',
      // Amounts are shown smallest to largest.
      fixedOrder: true,
      facts: { coins: [name], ask: 'value', options: COINS.map((each) => CENTS[each]) },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: coin(name),
      options: COINS.map((each): Visual => ({ kind: 'text', value: `${CENTS[each]}¢`, size: 'l', speak: [{ cents: CENTS[each] }] })),
      answerIndex: COINS.indexOf(name),
      explanation: coinExplanation(name),
    };
  }
  const pair = rng.sample(COINS, 2) as [CoinName, CoinName];
  const more = CENTS[pair[0]] > CENTS[pair[1]] ? pair[0] : pair[1];
  const less = more === pair[0] ? pair[1] : pair[0];
  const prompt = 'Which coin is worth more?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { coins: pair, ask: 'worthMore', options: pair },
    prompt: { text: prompt, speak: [prompt] },
    options: pair.map(coin),
    answerIndex: pair.indexOf(more),
    explanation: {
      speak: [`${an(more).charAt(0).toUpperCase()}${an(more).slice(1)} is worth`, { cents: CENTS[more] }, `. ${an(less).charAt(0).toUpperCase()}${an(less).slice(1)} is worth`, { cents: CENTS[less] }, `. The ${more} is worth more.`],
      steps: [`${an(more).charAt(0).toUpperCase()}${an(more).slice(1)} is worth ${CENTS[more]} cents.`, `${an(less).charAt(0).toUpperCase()}${an(less).slice(1)} is worth ${CENTS[less]} ${CENTS[less] === 1 ? 'cent' : 'cents'}.`, `The ${more} is worth more.`],
      visual: coin(more),
    },
  };
}

export const coinsGenerator: SkillGenerator = {
  skillId: 'M-1-C4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 4, 2: 4 }, // the four coins
  generate: coins,
  exampleSeed: 134,
  example: () => coins(1, makeRng(134)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'There are four coins: penny, nickel, dime and quarter.', speak: ['There are four coins: penny, nickel, dime and quarter.'], visual: { kind: 'coins', coins: [...COINS] } },
    { beat: 'watch', text: coinExplanation('penny').steps.join(' '), speak: coinExplanation('penny').speak, visual: coin('penny') },
    { beat: 'try', text: WHICH_COIN, speak: [WHICH_COIN], visual: coin('quarter'), reveal: { text: coinExplanation('quarter').steps.join(' '), speak: coinExplanation('quarter').speak, visual: coin('quarter') } },
    { beat: 'remember', text: 'Each coin has its own size and value.', speak: ['Each coin has its own size and value.'], visual: { kind: 'coins', coins: [...COINS] } },
  ],
  oracle: 'money',
};
