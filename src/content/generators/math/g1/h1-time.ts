import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Visual } from '../../../../engine/types';
import { DAYS, MONTHS } from '../../../data/h1-things';
import type { SkillGenerator } from '../../../generator';
import { h1Skill, lessonOf, wordText } from '../k/h1-parts';
import type { Line, Shown as Explanation } from './wording';
import { explain } from './wording';

// Math grade 1, plan section 15 wave H1: C.6 match clocks to times, C.7 days of the week,
// C.8 months of the year.

// ---- C.6 Match clocks to times ----
// Three clock faces, three written times. Levels: hours / half hours / both, two at the same hour.
// Oracle: matchEqual.

interface Time {
  hour: number;
  minute: number;
}
const written = (time: Time): string => `${time.hour}:${String(time.minute).padStart(2, '0')}`;
const clock = (time: Time): Visual => ({ kind: 'clock', hour: time.hour, minute: time.minute });

function matchClocks(level: Level, rng: Rng): QuestionDraft {
  let times: Time[];
  if (level === 3) {
    const [h1, h2] = rng.sample(Array.from({ length: 12 }, (_, i) => i + 1), 2) as [number, number];
    times = rng.shuffle([{ hour: h1, minute: 0 }, { hour: h1, minute: 30 }, { hour: h2, minute: rng.pick([0, 30]) }]);
  } else {
    times = rng.sample(Array.from({ length: 12 }, (_, i) => i + 1), 3).map((hour) => ({ hour, minute: level === 1 ? 0 : 30 }));
  }
  const right = rng.shuffle(times);
  return {
    type: 'match',
    mode: 'look',
    facts: { leftValues: times.map(written), rightValues: right.map(written) },
    prompt: { text: 'Match each clock to its time.', speak: ['Match each clock to its time.'] },
    left: times.map(clock),
    right: right.map((time): Visual => ({ kind: 'text', value: written(time), size: 'l', speak: [{ time }] })),
    answerPairs: times.map((time, i): [number, number] => [i, right.indexOf(time)]),
    explanation: matchExplanation(times, level),
  };
}

// The rule for the hands, then one step for each clock, in the order they stand, so the pair a child mixed up is
// always explained. A clock's time is said once, as a digital clock is read (the owner's choice, Nov 22, 2026: "five
// thirty", never "half past five"). On the hour it is shown in both forms ("The first clock shows 5 o'clock: 5:00."); on
// the half hour it is written as it is said ("The first clock shows 5:30.").
const ORDER = ['first', 'second', 'third'];
const RULES: Record<number, string> = {
  1: "The long hand on 12 means o'clock. The short hand shows the hour.",
  2: 'The long hand on 6 means 30 minutes. The short hand has just passed the hour.',
  3: "The long hand on 12 means o'clock. On 6 it means 30 minutes. The short hand shows the hour.",
};
const HINTS: Record<number, string> = {
  1: "The long hand on 12 means o'clock. Then read the short hand.",
  2: 'The long hand on 6 means 30 minutes. Then read the hour the short hand has just passed.',
  3: "Look at the long hand first: on 12 it is o'clock, on 6 it is 30 minutes.",
};

function matchExplanation(times: readonly Time[], level: Level): Explanation {
  const clocks = times.map((time, i): Line => {
    const shows = time.minute === 0 ? `${time.hour} o'clock: ${written(time)}` : written(time);
    return { text: `The ${ORDER[i] as string} clock shows ${shows}.`, say: [`The ${ORDER[i] as string} clock shows`, { time }, '.'] };
  });
  return explain([RULES[level] as string, ...clocks], { kind: 'row', children: times.map(clock) }, { text: HINTS[level] as string });
}

export const matchClocksGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-C6',
  maxLevel: 3,
  itemTypes: ['match'],
  oracle: 'matchEqual',
  exampleSeed: 931,
  generate: matchClocks,
  lesson: (make) => lessonOf('A clock with hands and a time written in numbers can show the same time.', { kind: 'row', children: [clock({ hour: 3, minute: 0 }), { kind: 'text', value: '3:00', size: 'l' }] }, make(1, 931), make(2, 932), "Short hand: the hour. Long hand on 12: o'clock. On 6: 30 minutes."),
});

// ---- C.7 and C.8 Days of the week, months of the year ----
// Levels: what comes after / what comes before / two later or two earlier, tomorrow or yesterday.
// Oracle: h1Calendar.

type Kind = 'day' | 'month';

// Only the part of the list that matters is said: the name before, the start, and the name after. A list that
// starts again (after Saturday, before January) says so. Two away is counted on or back one name at a time.
function calendarExplanation(kind: Kind, start: string, shift: number, level: Level): Explanation {
  const list: readonly string[] = kind === 'day' ? DAYS : MONTHS;
  const at = list.indexOf(start);
  const name = (by: number): string => list[(at + by + list.length * 2) % list.length] as string;
  const answer = name(shift);
  const units = kind === 'day' ? 'days' : 'months';
  const whole = kind === 'day' ? 'week' : 'year';
  const inOrder = `Say the ${units} in order: ${name(-1)}, ${start}, ${name(1)}.`;
  const visual = wordText(answer);
  if (level === 3 && kind === 'day' && Math.abs(shift) === 1) {
    const lines = shift === 1 ? ['Tomorrow is the day after today.', `The day after ${start} is ${answer}.`, `Tomorrow is ${answer}.`] : ['Yesterday was the day before today.', `The day before ${start} is ${answer}.`, `Yesterday was ${answer}.`];
    return explain(lines, visual, { text: shift === 1 ? 'Tomorrow is the day after today.' : 'Yesterday was the day before today.' });
  }
  if (Math.abs(shift) === 2) {
    const path = [name(Math.sign(shift)), name(shift)];
    const way = shift > 0 ? 'on' : 'back';
    const last = kind === 'day' ? (shift > 0 ? `In 2 days it will be ${answer}.` : `2 days ago it was ${answer}.`) : `2 months ${shift > 0 ? 'after' : 'before'} ${start} is ${answer}.`;
    return explain([`Count ${way} 2 ${units} from ${start}.`, `${path.join(', ')}.`, last], visual, { text: `Count ${way} 2 ${units} from ${start}.` });
  }
  if (shift === 1) {
    const last = at === list.length - 1 ? `After ${start}, the ${whole} starts again with ${answer}.` : `${answer} comes after ${start}.`;
    return explain([inOrder, last], visual, { text: `Say the ${units} in order, starting at ${start}.` });
  }
  const last = at === 0 ? `Before ${start} comes ${answer}, at the end of the ${whole} before.` : `${answer} comes before ${start}.`;
  return explain([inOrder, last], visual, { text: `Say the ${units} in order. Stop just before ${start}.` });
}

function calendar(kind: Kind) {
  const list: readonly string[] = kind === 'day' ? DAYS : MONTHS;
  const unit = kind === 'day' ? 'day' : 'month';
  return (level: Level, rng: Rng): QuestionDraft => {
    const start = rng.pick(list);
    const shift = level === 1 ? 1 : level === 2 ? -1 : rng.pick([2, -2, 1, -1]);
    const at = list.indexOf(start);
    const name = (by: number): string => list[(at + by + list.length * 2) % list.length] as string;
    let prompt: string;
    if (level === 1) prompt = `What ${unit} comes after ${start}?`;
    else if (level === 2) prompt = `What ${unit} comes before ${start}?`;
    else if (kind === 'day') prompt = shift === 1 ? `Today is ${start}. What day is tomorrow?` : shift === -1 ? `Today is ${start}. What day was yesterday?` : shift === 2 ? `Today is ${start}. What day will it be in 2 days?` : `Today is ${start}. What day was it 2 days ago?`;
    else prompt = shift === 1 ? `What month comes after ${start}?` : shift === -1 ? `What month comes before ${start}?` : shift === 2 ? `What month is 2 months after ${start}?` : `What month is 2 months before ${start}?`;
    // Wrong answers: one too far, one too few, and the other direction.
    const wrong = [...new Set([name(shift + Math.sign(shift)), name(shift - Math.sign(shift)), name(-shift)])].filter((each) => each !== name(shift) && each !== start);
    const options = rng.shuffle([name(shift), ...rng.sample(wrong, Math.min(2, wrong.length))]);
    return {
      type: 'choice',
      mode: 'look',
      facts: { kind, start, shift, options },
      prompt: { text: prompt, speak: [prompt.replace('2 days', 'two days').replace('2 months', 'two months')] },
      stimulus: wordText(start),
      options: options.map((each) => wordText(each)),
      answerIndex: options.indexOf(name(shift)),
      explanation: calendarExplanation(kind, start, shift, level),
    };
  };
}

export const daysGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-C7',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1Calendar',
  exampleSeed: 933,
  lists: ['h1-things'],
  pool: { 1: 7, 2: 7 },
  generate: calendar('day'),
  lesson: (make) => lessonOf('A week has seven days: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.', wordText('Sunday'), make(1, 933), make(2, 934), 'After Saturday comes Sunday again.', wordText('Saturday')),
});

export const monthsGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-C8',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1Calendar',
  exampleSeed: 935,
  lists: ['h1-things'],
  generate: calendar('month'),
  lesson: (make) => lessonOf('A year has twelve months. It starts with January and ends with December.', wordText('January'), make(1, 935), make(2, 936), 'After December comes January again.', wordText('December')),
});
