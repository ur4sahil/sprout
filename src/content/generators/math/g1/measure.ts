import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { CoinName, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { Countable } from '../../../data/countables';
import { STORY_COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import type { Shown as Explanation } from './wording';
import { explain } from './wording';

// Math grade 1 C.1 to C.4: telling time, ordering by length, picture graphs and coins.

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

// A time is said as it is read on a digital clock (the owner's choice, Nov 22, 2026): "eight o'clock", "eight thirty",
// never "half past eight". On the hour the last step joins the words to the written time the options show: "It is 8
// o'clock. We write 8:00." ("8:00" would be said "eight o'clock" twice, so it is said by its digits). On the half hour
// the long hand's 6 is read as 30 minutes, and the time is written as it is said: "It is 8:30." is "eight thirty".
function timeExplanation(time: Time): Explanation {
  if (time.minute === 0) {
    return explain(
      ['The long hand points to 12.', `The short hand points to ${time.hour}.`, { text: `It is ${time.hour} o'clock. We write ${written(time)}.`, say: ['It is', { number: time.hour }, "o'clock. We write", { number: time.hour }, ', then two zeros.'] }],
      clock(time),
    );
  }
  return explain(['The long hand points to 6. That means 30 minutes.', `The short hand is halfway between ${time.hour} and ${nextHour(time.hour)}, so the hour is ${time.hour}.`, `It is ${written(time)}.`], clock(time));
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
  if (level === 4) {
    // Set the clock (added Nov 17, 2026): the hands start at 12 o'clock and move by half hours.
    let time: Time = { hour: rng.int(1, 12), minute: rng.pick([0, 30]) };
    if (time.hour === 12 && time.minute === 0) time = { hour: 12, minute: 30 };
    return {
      type: 'setClock',
      mode: 'look',
      facts: { hour: time.hour, minute: time.minute },
      prompt: { text: `Set the clock to ${written(time)}.`, speak: ['Set the clock to', { time }, '.'] },
      start: { hour: 12, minute: 0 },
      minuteStep: 30,
      answer: time,
      explanation: timeExplanation(time),
    };
  }
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
  maxLevel: 4,
  itemTypes: ['choice', 'setClock'],
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
const SHORTEST_FIRST = 'Put the bars in order, shortest first.';

// Every bar has a place in the steps, and the picture shows them all in order. The bars are one colour, so the
// steps name them by where they go, never "this one".
function orderLines(count: number): string[] {
  return ['Find the shortest bar. It goes first.', count === 3 ? 'The middle bar comes next.' : 'Then find the next shortest, and the next.', 'The longest bar goes last.'];
}

function orderExplanation(sorted: number[], color: ColorName): Explanation {
  return explain(orderLines(sorted.length), { kind: 'row', children: sorted.map((length) => bar(length, color)) }, { text: 'Find the shortest bar first.' });
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
    { beat: 'watch', text: orderLines(3).join(' '), speak: [orderLines(3).join(' ')], visual: { kind: 'row', children: [bar(2, 'green'), bar(5, 'green'), bar(8, 'green')] } },
    { beat: 'try', text: SHORTEST_FIRST, speak: [SHORTEST_FIRST], visual: { kind: 'row', children: [bar(7, 'orange'), bar(2, 'orange'), bar(4, 'orange')] }, reveal: { text: orderLines(3).join(' '), speak: [orderLines(3).join(' ')], visual: { kind: 'row', children: [bar(2, 'orange'), bar(4, 'orange'), bar(7, 'orange')] } } },
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
const chartVisual = (chart: Chart, type: 'picture' | 'bar' = 'picture'): Visual => ({ kind: 'graph', type, categories: chart.things.map((thing, i) => ({ label: thing.many, emoji: thing.emoji, value: chart.values[i] as number })) });

// Three things with three different values, so there is one most and one least.
function newChart(rng: Rng, most: number): Chart {
  return { things: rng.sample(STORY_COUNTABLES, 3), values: rng.sample(Array.from({ length: most }, (_, i) => i + 1), 3) };
}

// A graph question. Grade 1 reads picture graphs with up to 6 in a row. Grade 2 reads bar graphs up to 10.
export function graphQuestion(level: Level, rng: Rng, type: 'picture' | 'bar', most: number): QuestionDraft {
  const chart = newChart(rng, most);
  const names = chart.things.map((thing) => thing.many);
  const stimulus = chartVisual(chart, type);
  if (level === 4) {
    // Make the bar graph from a tally chart (buildBar, added Nov 17, 2026).
    const tallies: Visual = { kind: 'row', children: chart.things.map((thing, i): Visual => ({ kind: 'row', children: [{ kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row', speak: [{ word: thing.many }] }, { kind: 'tally', count: chart.values[i] as number }] })) };
    const prompt = 'Make a bar graph from the tally marks.';
    return {
      type: 'buildBar',
      mode: 'look',
      facts: { values: chart.values, things: chart.things.map((thing) => thing.one), ask: 'all' },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: tallies,
      categories: chart.things.map((thing) => ({ label: thing.many, emoji: thing.emoji })),
      max: most,
      answer: chart.values,
      explanation: {
        speak: ['Count each set of tally marks. A bundle with a line across is', { number: 5 }, '. Make each bar that long.'],
        steps: ['Count each set of tally marks. A bundle is 5.', (([first = '', ...rest]) => `${first[0]?.toUpperCase() ?? ''}${first.slice(1)}${rest.length ? `, ${rest.join(', ')}` : ''}.`)(chart.things.map((thing, i) => `${thing.many}: ${chart.values[i]}`)), 'Make each bar that long.'],
        visual: chartVisual(chart, 'bar'),
      },
    };
  }
  const row = type === 'picture' ? 'row' : 'bar';
  const base = { values: chart.values, things: chart.things.map((thing) => thing.one) };
  if (level === 1) {
    const index = rng.int(0, 2);
    const value = chart.values[index] as number;
    const prompt = `How many chose ${names[index]}?`;
    // The slips: reading another row.
    const values = numeralChoices(value, chart.values, 0, most + 2, rng);
    return {
      type: 'choice',
      mode: 'look',
      facts: { ...base, ask: 'value', index, options: values },
      prompt: { text: prompt, speak: [prompt] },
      stimulus,
      options: values.map((each) => numeral(each)),
      answerIndex: values.indexOf(value),
      explanation: { speak: [`Find ${names[index]}. ${type === 'picture' ? 'Count its row.' : 'Read the end of its bar.'}`, { number: value }, '.'], steps: [`Find ${names[index]}.`, `${type === 'picture' ? 'Count its row' : 'Read the end of its bar'}: ${value}.`], visual: stimulus },
    };
  }
  if (level === 2) {
    const ask = rng.pick(['most', 'least'] as const);
    const wanted = ask === 'most' ? Math.max(...chart.values) : Math.min(...chart.values);
    const index = chart.values.indexOf(wanted);
    const prompt = `Which one has the ${ask === 'most' ? 'most' : 'fewest'}?`;
    const line = `The ${names[index]} ${row} is the ${ask === 'most' ? 'longest' : 'shortest'}.`;
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
    maxDigits: most > 9 ? 2 : 1,
    explanation: {
      speak: [`The ${names[index]} ${row} has`, { number: a }, `. The ${names[other]} ${row} has`, { number: b }, '.', { number: a }, 'minus', { number: b }, 'is', { number: a - b }, '.'],
      steps: [`The ${names[index]} ${row} has ${a}.`, `The ${names[other]} ${row} has ${b}.`, `${a} minus ${b} is ${a - b}.`],
      visual: stimulus,
    },
  };
}

// Grade 1 picture graphs (the wording audit, Nov 22, 2026): the prompt first says who chose and what, the steps
// name each row ("Find the balloons row."), and a hint gives the move. The bar graphs of grade 2 keep
// graphQuestion's own words.
const GRAPH_LEAD = 'Children chose their favorite thing.';
const manyOf = (one: string): string => STORY_COUNTABLES.find((thing) => thing.one === one)?.many ?? one;
const ledBy = (words: string): { text: string; speak: Say } => ({ text: `${GRAPH_LEAD} ${words}`, speak: [`${GRAPH_LEAD} ${words}`] });

function pictureGraph(level: Level, rng: Rng): QuestionDraft {
  const question = graphQuestion(level, rng, 'picture', 6);
  const values = question.facts.values as number[];
  const names = (question.facts.things as string[]).map(manyOf);
  const visual = question.explanation.visual ?? chartVisual({ things: [], values: [] });
  const ask = question.facts.ask;
  if (ask === 'value') {
    const index = question.facts.index as number;
    const [name, value] = [names[index] as string, values[index] as number];
    const counted = Array.from({ length: value }, (_, i) => i + 1);
    const lines = [`Find the ${name} row.`, `Count its pictures: ${listText(counted)}.`, `${value} chose ${name}.`];
    return { ...question, prompt: ledBy(`How many chose ${name}?`), explanation: explain(lines, visual, { text: `Find the ${name} row. Count its pictures.` }) };
  }
  if (ask === 'most' || ask === 'least') {
    const wanted = ask === 'most' ? Math.max(...values) : Math.min(...values);
    const name = names[values.indexOf(wanted)] as string;
    const [row, most] = ask === 'most' ? ['longest', 'most'] : ['shortest', 'fewest'];
    const lines = [`The ${name} row is the ${row}.`, `So the ${name} row has the ${most}: ${wanted}.`];
    return { ...question, prompt: ledBy(`Which one has the ${most}?`), explanation: explain(lines, visual, { text: `Find the ${row} row.` }) };
  }
  const [index, other] = [question.facts.index as number, question.facts.other as number];
  const [a, b] = [values[index] as number, values[other] as number];
  const [name, otherName] = [names[index] as string, names[other] as string];
  const lines = [`The ${name} row has ${a}.`, `The ${otherName} row has ${b}.`, `${a} − ${b} = ${a - b}, so ${a - b} more chose ${name}.`];
  return { ...question, prompt: ledBy(`How many more chose ${name} than ${otherName}?`), explanation: explain(lines, visual, { text: 'Count both rows. Then take the smaller number away from the bigger number.' }) };
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
      { beat: 'watch', text: `How many chose ${names[0]}? Find the ${names[0]} row. Count its pictures: 4.`, speak: [`How many chose ${names[0]}? Find the ${names[0]} row. Count its pictures.`, { number: 4 }, '.'], visual: chartVisual(chart) },
      { beat: 'try', text: `How many chose ${names[2]}?`, speak: [`How many chose ${names[2]}?`], visual: chartVisual(chart), reveal: { text: `Find the ${names[2]} row. Count its pictures: 5.`, speak: [`Find the ${names[2]} row. Count its pictures.`, { number: 5 }, '.'] } },
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
const centsText = (cents: number): string => `${cents} ${cents === 1 ? 'cent' : 'cents'}`;

// What tells each coin apart, as the coins are drawn (CoinsVisual: true sizes and colours, an emblem on each face).
const LOOKS: Record<CoinName, string> = {
  penny: 'It is the only brown coin, with a shield on it.',
  nickel: 'It is silver, with a smooth edge and a building on it.',
  dime: 'It is the smallest coin. It is silver, with a torch on it.',
  quarter: 'It is the biggest coin. It is silver, with an eagle on it.',
};

// Looking comes first and the name last, so no step before the last one names the coin.
function coinExplanation(name: CoinName, hint: string): Explanation {
  return explain(['Look at its color, its size and its picture.', LOOKS[name], `This is ${an(name)}. It is worth ${centsText(CENTS[name])}.`], coin(name), { text: hint });
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
      explanation: coinExplanation(name, 'Look at its color, its size and the picture on it.'),
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
      explanation: coinExplanation(name, 'Name the coin first. Then think how many cents it is worth.'),
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
    // The coins in the order they are shown, then the one worth more: never the answer first.
    explanation: explain(
      [`The first coin is ${an(pair[0])}, worth ${centsText(CENTS[pair[0]])}.`, `The second coin is ${an(pair[1])}, worth ${centsText(CENTS[pair[1]])}.`, `${centsText(CENTS[more])} is more than ${centsText(CENTS[less])}, so the ${more} is worth more.`],
      coin(more),
      { text: 'Name each coin. Then think how many cents each one is worth.' },
    ),
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
    { beat: 'watch', text: coinExplanation('penny', WHICH_COIN).steps.join(' '), speak: coinExplanation('penny', WHICH_COIN).speak, visual: coin('penny') },
    { beat: 'try', text: WHICH_COIN, speak: [WHICH_COIN], visual: coin('quarter'), reveal: { text: coinExplanation('quarter', WHICH_COIN).steps.join(' '), speak: coinExplanation('quarter', WHICH_COIN).speak, visual: coin('quarter') } },
    { beat: 'remember', text: 'Each coin has its own size and value.', speak: ['Each coin has its own size and value.'], visual: { kind: 'coins', coins: [...COINS] } },
  ],
  oracle: 'money',
};
