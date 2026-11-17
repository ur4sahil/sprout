import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Visual } from '../../../../engine/types';
import { DAYS, MONTHS } from '../../../data/h1-things';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from '../k/h1-parts';
import { h1Skill, lessonOf, wordText } from '../k/h1-parts';

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
  const first = times[0] as Time;
  const line = first.minute === 0 ? `The long hand on 12 means o'clock. This clock shows ${written(first)}.` : `The long hand on 6 means half past. This clock shows ${written(first)}.`;
  const explanation: Explanation = {
    speak: ['The short hand shows the hour.', first.minute === 0 ? 'The long hand on twelve means o clock.' : 'The long hand on six means half past.', 'This clock shows', { time: first }, '.'],
    steps: ['The short hand shows the hour.', line],
    visual: clock(first),
  };
  return {
    type: 'match',
    mode: 'look',
    facts: { leftValues: times.map(written), rightValues: right.map(written) },
    prompt: { text: 'Match each clock to its time.', speak: ['Match each clock to its time.'] },
    left: times.map(clock),
    right: right.map((time): Visual => ({ kind: 'text', value: written(time), size: 'l', speak: [{ time }] })),
    answerPairs: times.map((time, i): [number, number] => [i, right.indexOf(time)]),
    explanation,
  };
}

export const matchClocksGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-C6',
  maxLevel: 3,
  itemTypes: ['match'],
  oracle: 'matchEqual',
  exampleSeed: 931,
  generate: matchClocks,
  lesson: (make) => lessonOf('A clock with hands and a time written in numbers can show the same time.', { kind: 'row', children: [clock({ hour: 3, minute: 0 }), { kind: 'text', value: '3:00', size: 'l' }] }, make(1, 931), make(2, 932), 'Short hand: the hour. Long hand on 12: o clock. On 6: half past.'),
});

// ---- C.7 and C.8 Days of the week, months of the year ----
// Levels: what comes after / what comes before / two later or two earlier, tomorrow or yesterday.
// Oracle: h1Calendar.

type Kind = 'day' | 'month';

function calendarExplanation(kind: Kind, start: string, shift: number): Explanation {
  const list: readonly string[] = kind === 'day' ? DAYS : MONTHS;
  const at = list.indexOf(start);
  const answer = list[(at + shift + list.length * 2) % list.length] as string;
  const path = Array.from({ length: Math.abs(shift) + 1 }, (_, i) => list[(at + Math.sign(shift) * i + list.length * 2) % list.length] as string);
  const counted = `${shift > 0 ? 'Count on' : 'Count back'}: ${path.join(', ')}.`;
  const whole = kind === 'day' ? `The days go ${DAYS.join(', ')}, then start again.` : `The months go ${MONTHS.join(', ')}, then start again.`;
  return { speak: [counted, `The answer is ${answer}.`], steps: [whole, counted, `The answer is ${answer}.`], visual: wordText(answer) };
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
      explanation: calendarExplanation(kind, start, shift),
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
