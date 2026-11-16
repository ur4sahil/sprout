import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { CoinName, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { graphQuestion } from '../g1/measure';
import { numeralChoices } from '../k/numerals';

// Math grade 2 C.1 to C.4: time to five minutes, counting coins, measuring with a ruler, bar graphs.

type Explanation = { speak: Say; steps: string[]; visual: Visual };

// ---- C.1 Time to five minutes ----
// Levels: quarter hours / five-minute marks / match clock to time. Family: Time. Oracle: time.

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
  const points = time.minute / 5;
  const next = nextHour(time.hour);
  // Where the short hand sits: just past the hour, halfway to the next, or getting close to it.
  const short: Say =
    time.minute < 30
      ? ['The short hand is just past', { number: time.hour }, '.']
      : time.minute === 30
        ? ['The short hand is halfway between', { number: time.hour }, 'and', { number: next }, '.']
        : ['The short hand is past', { number: time.hour }, 'and getting close to', { number: next }, '.'];
  const shortText = time.minute < 30 ? `The short hand is just past ${time.hour}.` : time.minute === 30 ? `The short hand is halfway between ${time.hour} and ${next}.` : `The short hand is past ${time.hour} and getting close to ${next}.`;
  return {
    speak: [...short, 'The long hand points to', { number: points }, '. Count by fives to', { number: time.minute }, '. It is', { time }, '.'],
    steps: [shortText, `The long hand points to ${points}.`, `Count by fives to ${time.minute}.`, `It is ${written(time)}.`],
    visual: clock(time),
  };
}

// The times offered beside the right one: an hour out, minutes out, and the long hand's number read as the minutes.
function nearTimes(time: Time, step: number, clocks: boolean, rng: Rng): Time[] {
  const minutes = (by: number): number => (time.minute + by + 60) % 60;
  const candidates: Time[] = [
    { hour: rng.bool() ? nextHour(time.hour) : hourBefore(time.hour), minute: time.minute },
    { hour: time.hour, minute: minutes(step) },
    { hour: time.hour, minute: minutes(-step) },
    // Written times only: the number the long hand points to, read as the minutes.
    ...(clocks ? [] : [{ hour: time.hour, minute: time.minute / 5 }]),
  ];
  const different = candidates.filter((other, i, list) => written(other) !== written(time) && list.findIndex((each) => written(each) === written(other)) === i);
  return rng.sample(different, 2);
}

const WHAT_TIME = 'What time is it?';

function timeToFive(level: Level, rng: Rng): QuestionDraft {
  // Never on the hour: that is grade 1.
  const minute = level === 1 ? rng.pick([15, 30, 45]) : 5 * rng.int(1, 11);
  const time: Time = { hour: rng.int(1, 12), minute };
  const options = rng.shuffle([time, ...nearTimes(time, level === 1 ? 15 : 5, level === 3, rng)]);
  const facts = { hour: time.hour, minute: time.minute, options: options.map(written) };
  if (level === 3) {
    return { type: 'choice', mode: 'look', facts: { ...facts, show: 'clocks' }, prompt: { text: `Which clock shows ${written(time)}?`, speak: ['Which clock shows', { time }, '?'] }, stimulus: timeText(time), options: options.map(clock), answerIndex: options.indexOf(time), explanation: timeExplanation(time) };
  }
  return { type: 'choice', mode: 'look', facts, prompt: { text: WHAT_TIME, speak: [WHAT_TIME] }, stimulus: clock(time), options: options.map(timeText), answerIndex: options.indexOf(time), explanation: timeExplanation(time) };
}

export const timeToFiveGenerator: SkillGenerator = {
  skillId: 'M-2-C1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: timeToFive,
  exampleSeed: 231,
  example: () => timeToFive(1, makeRng(231)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Each number on a clock is 5 minutes for the long hand. Count by fives.', speak: ['Each number on a clock is', { number: 5 }, 'minutes for the long hand. Count by fives.'], visual: clock({ hour: 3, minute: 15 }) },
    { beat: 'watch', text: timeExplanation({ hour: 3, minute: 15 }).steps.join(' '), speak: timeExplanation({ hour: 3, minute: 15 }).speak, visual: clock({ hour: 3, minute: 15 }) },
    { beat: 'try', text: WHAT_TIME, speak: [WHAT_TIME], visual: clock({ hour: 8, minute: 40 }), reveal: { text: timeExplanation({ hour: 8, minute: 40 }).steps.join(' '), speak: timeExplanation({ hour: 8, minute: 40 }).speak, visual: clock({ hour: 8, minute: 40 }) } },
    { beat: 'remember', text: 'Short hand shows the hour.', speak: ['Short hand shows the hour.'], visual: clock({ hour: 3, minute: 15 }) },
  ],
  oracle: 'time',
};

// ---- C.2 Count coins ----
// Levels: same coins / two kinds / three kinds, typed in cents. Family: Count coins. Oracle: money.

const CENTS: Record<CoinName, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
const BIGGEST_FIRST: CoinName[] = ['quarter', 'dime', 'nickel', 'penny'];
const HOW_MUCH = 'How much money is this?';
const centsText = (value: number): Visual => ({ kind: 'text', value: `${value}¢`, size: 'l', speak: [{ cents: value }] });
const total = (coins: CoinName[]): number => coins.reduce((sum, coin) => sum + CENTS[coin], 0);

function coinsExplanation(coins: CoinName[]): Explanation {
  // The running total, counted on from the biggest coin.
  const running = coins.map((_, i) => total(coins.slice(0, i + 1)));
  return {
    speak: ['Start with the biggest coin and count on.', ...running.map((value): { number: number } => ({ number: value })), '.', { cents: total(coins) }, '.'],
    steps: ['Start with the biggest coin and count on.', `${running.join(', ')}.`, `${total(coins)} cents.`],
    visual: { kind: 'coins', coins },
  };
}

// A handful of coins of `kinds` different kinds, biggest first, worth less than a dollar.
function handful(kinds: number, rng: Rng): CoinName[] {
  for (;;) {
    const chosen = rng.sample(BIGGEST_FIRST, kinds);
    const coins = BIGGEST_FIRST.filter((coin) => chosen.includes(coin)).flatMap((coin) => Array.from({ length: rng.int(kinds === 1 ? 2 : 1, kinds === 1 ? 5 : 3) }, () => coin));
    if (coins.length <= 7 && total(coins) < 100) return coins;
  }
}

function countCoins(level: Level, rng: Rng): QuestionDraft {
  const coins = handful(level, rng);
  const worth = total(coins);
  const base = { mode: 'look' as const, prompt: { text: HOW_MUCH, speak: [HOW_MUCH] as Say }, stimulus: { kind: 'coins', coins } as Visual, explanation: coinsExplanation(coins) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { coins, ask: 'total' }, answer: worth, maxDigits: 2 };
  // The slips: the coins counted as if each were one cent, or one coin too few or too many.
  const values = numeralChoices(worth, [coins.length, worth - CENTS[coins[coins.length - 1] as CoinName], worth + CENTS[coins[0] as CoinName]], 1, 150, rng);
  return { ...base, type: 'choice', facts: { coins, ask: 'total', options: values }, options: values.map(centsText), answerIndex: values.indexOf(worth) };
}

export const countCoinsGenerator: SkillGenerator = {
  skillId: 'M-2-C2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: countCoins,
  exampleSeed: 232,
  example: () => countCoins(1, makeRng(232)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To count coins, start with the coin worth the most.', speak: ['To count coins, start with the coin worth the most.'], visual: { kind: 'coins', coins: ['dime', 'dime', 'penny'] } },
    { beat: 'watch', text: coinsExplanation(['dime', 'dime', 'penny']).steps.join(' '), speak: coinsExplanation(['dime', 'dime', 'penny']).speak, visual: { kind: 'coins', coins: ['dime', 'dime', 'penny'] } },
    { beat: 'try', text: HOW_MUCH, speak: [HOW_MUCH], visual: { kind: 'coins', coins: ['quarter', 'nickel', 'nickel'] }, reveal: { text: coinsExplanation(['quarter', 'nickel', 'nickel']).steps.join(' '), speak: coinsExplanation(['quarter', 'nickel', 'nickel']).speak, visual: { kind: 'coins', coins: ['quarter', 'nickel', 'nickel'] } } },
    { beat: 'remember', text: 'Start with the coin worth the most.', speak: ['Start with the coin worth the most.'], visual: { kind: 'coins', coins: ['quarter', 'dime', 'nickel', 'penny'] } },
  ],
  oracle: 'money',
};

// ---- C.3 Measure with a ruler ----
// Levels: whole units from zero / typed / object not starting at zero. Family: Ruler. Oracle: measure.

type Thing = 'pencil' | 'crayon' | 'ribbon';
const THINGS: Thing[] = ['pencil', 'crayon', 'ribbon'];
const ruler = (object: Thing, startUnit: number, lengthUnits: number): Visual => ({ kind: 'ruler', object, startUnit, lengthUnits });

function rulerExplanation(object: Thing, start: number, length: number): Explanation {
  return {
    speak: ['It starts at', { number: start }, 'and ends at', { number: start + length }, '. Count the spaces between.', { number: length }, '.'],
    steps: [`It starts at ${start} and ends at ${start + length}.`, `Count the spaces between: ${length}.`],
    visual: ruler(object, start, length),
  };
}

function measure(level: Level, rng: Rng): QuestionDraft {
  const object = rng.pick(THINGS);
  // At level 3 the object starts part-way along the ruler.
  const start = level === 3 ? rng.int(1, 4) : 0;
  const length = level === 3 ? rng.int(2, 6) : rng.int(2, 9);
  const prompt = `How long is the ${object}?`;
  const base = { mode: 'look' as const, prompt: { text: prompt, speak: [prompt] as Say }, stimulus: ruler(object, start, length), explanation: rulerExplanation(object, start, length) };
  if (level === 2) return { ...base, type: 'numberPad', facts: { startUnit: start, lengthUnits: length, object }, answer: length, maxDigits: 2 };
  // The slips: the mark where it ends, the mark where it starts, or the marks counted instead of the spaces.
  const values = numeralChoices(length, [start + length, start, length + 1], 1, 12, rng);
  return { ...base, type: 'choice', facts: { startUnit: start, lengthUnits: length, object, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(length) };
}

export const rulerGenerator: SkillGenerator = {
  skillId: 'M-2-C3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: measure,
  exampleSeed: 233,
  example: () => measure(1, makeRng(233)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A ruler measures how long something is. Line one end up with zero.', speak: ['A ruler measures how long something is. Line one end up with zero.'], visual: ruler('pencil', 0, 5) },
    { beat: 'watch', text: rulerExplanation('pencil', 0, 5).steps.join(' '), speak: rulerExplanation('pencil', 0, 5).speak, visual: ruler('pencil', 0, 5) },
    { beat: 'try', text: 'How long is the crayon?', speak: ['How long is the crayon?'], visual: ruler('crayon', 2, 3), reveal: { text: rulerExplanation('crayon', 2, 3).steps.join(' '), speak: rulerExplanation('crayon', 2, 3).speak, visual: ruler('crayon', 2, 3) } },
    { beat: 'remember', text: 'Count the spaces, not the marks.', speak: ['Count the spaces, not the marks.'], visual: ruler('pencil', 0, 5) },
  ],
  oracle: 'measure',
};

// ---- C.4 Bar graphs ----
// Levels: read a bar / most and least / how many more, typed. Family: Graphs. Oracle: graph.

const barGraph = (level: Level, rng: Rng): QuestionDraft => graphQuestion(level, rng, 'bar', 10);

export const barGraphsGenerator: SkillGenerator = {
  skillId: 'M-2-C4',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: barGraph,
  exampleSeed: 234,
  example: () => barGraph(1, makeRng(234)),
  lesson: (): LessonStep[] => {
    const chart: Visual = { kind: 'graph', type: 'bar', categories: [{ label: 'apples', emoji: '🍎', value: 7 }, { label: 'cookies', emoji: '🍪', value: 4 }, { label: 'balls', emoji: '⚽', value: 9 }] };
    return [
      { beat: 'see', text: 'A bar graph shows how many with bars. A longer bar means more.', speak: ['A bar graph shows how many with bars. A longer bar means more.'], visual: chart },
      { beat: 'watch', text: 'How many chose apples? Find apples. Read the end of its bar: 7.', speak: ['How many chose apples? Find apples. Read the end of its bar.', { number: 7 }, '.'], visual: chart },
      { beat: 'try', text: 'How many chose balls?', speak: ['How many chose balls?'], visual: chart, reveal: { text: 'Find balls. Read the end of its bar: 9.', speak: ['Find balls. Read the end of its bar.', { number: 9 }, '.'] } },
      { beat: 'remember', text: 'Read one row at a time.', speak: ['Read one row at a time.'], visual: chart },
    ];
  },
  oracle: 'graph',
};
