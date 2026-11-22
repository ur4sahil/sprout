import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { partLabel } from '../../../../engine/describe';
import { COUNTABLES } from '../../../data/countables';
import { MEASURED } from '../../../data/measures';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { byWord } from './numbers';

// Math grade 3 F.1 to F.7: time to the minute, elapsed time, area, perimeter, mass and volume,
// scaled graphs and line plots.

type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint };
type Time = { hour: number; minute: number };
const written = (time: Time): string => `${time.hour}:${String(time.minute).padStart(2, '0')}`;
const clock = (time: Time): Visual => ({ kind: 'clock', hour: time.hour, minute: time.minute });
const timeText = (time: Time): Visual => ({ kind: 'text', value: written(time), size: 'l', speak: [{ time }] });
const later = (time: Time, minutes: number): Time => {
  const total = ((((time.hour % 12) * 60 + time.minute + minutes) % 720) + 720) % 720;
  const hour = Math.floor(total / 60);
  return { hour: hour === 0 ? 12 : hour, minute: total % 60 };
};
const same = (a: Time, b: Time): boolean => a.hour === b.hour && a.minute === b.minute;
function threeTimes(right: Time, slips: Time[], rng: Rng): Time[] {
  const unique = slips.filter((slip, i) => !same(slip, right) && slips.findIndex((other) => same(other, slip)) === i);
  return rng.shuffle([right, ...rng.sample(unique, 2)]);
}

// ---- F.1 Time to the minute ----
// Levels: read the clock / match a time to its clock / quarter past and quarter to. Oracle: time.

function minuteExplanation(time: Time): Explanation {
  const fives = Math.floor(time.minute / 5) * 5;
  const more = time.minute - fives;
  const count = fives === 0 ? `The long hand is the minute hand. It is ${more} minutes past the 12.` : `The long hand is the minute hand. Count by fives to ${fives}${more > 0 ? `, then ${more} more: ${time.minute}` : ''}.`;
  return {
    speak: ['The short hand is the hour hand. It has passed the', { number: time.hour }, ', so the hour is', { number: time.hour }, '. The long hand shows', { number: time.minute }, 'minutes. It is', { time }, '.'],
    steps: [`The short hand is the hour hand. It has passed the ${time.hour}, so the hour is ${time.hour}.`, count, `It is ${written(time)}.`],
    visual: clock(time),
    // The first step reads the hour for the child: the hint says where to look instead.
    hint: { text: 'Look at the short hand first. Which number has it just passed?' },
  };
}

function quarterWords(time: Time): { text: string; speak: Say } {
  if (time.minute === 15) return { text: `quarter past ${time.hour}`, speak: ['quarter past', { number: time.hour }] };
  if (time.minute === 30) return { text: `half past ${time.hour}`, speak: ['half past', { number: time.hour }] };
  const next = later(time, 15).hour;
  return { text: `quarter to ${next}`, speak: ['quarter to', { number: next }] };
}

function timeToMinute(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const hour = rng.int(1, 12);
    const minute = rng.pick([15, 30, 45]);
    const time = { hour, minute };
    const words = quarterWords(time);
    // The slips: the quarter on the wrong side of the hour, or the hour of the words with the wrong minutes.
    const choices = threeTimes(time, [later(time, 30), later(time, -30), { hour: later(time, 15).hour, minute: 45 }, { hour, minute: 15 === minute ? 45 : 15 }], rng);
    return {
      type: 'choice',
      mode: 'look',
      facts: { hour, minute, options: choices.map(written) },
      prompt: { text: `What time is ${words.text}?`, speak: ['What time is', ...words.speak, '?'] },
      options: choices.map(timeText),
      answerIndex: choices.findIndex((each) => same(each, time)),
      explanation: {
        speak: [...words.speak, 'is', { number: minute }, 'minutes past', { number: hour }, '. It is', { time }, '.'],
        steps: [`A quarter of an hour is 15 minutes. Half an hour is 30.`, `${words.text[0]?.toUpperCase()}${words.text.slice(1)} is ${minute} minutes past ${hour}.`, `It is ${written(time)}.`],
        visual: clock(time),
      },
    };
  }
  let minute = rng.int(1, 59);
  while (minute % 5 === 0) minute = rng.int(1, 59);
  const time = { hour: rng.int(1, 12), minute };
  // The slips: the hour hand read an hour out, and the long hand read ten minutes off. One of each, so both hands
  // must be read: with two hour slips the hour alone would give the answer.
  const hourSlip = rng.pick([later(time, 60), later(time, -60)]);
  const minuteSlip = rng.pick([{ hour: time.hour, minute: (minute + 10) % 60 }, { hour: time.hour, minute: Math.abs(minute - 10) }]);
  const choices = threeTimes(time, [hourSlip, minuteSlip], rng);
  if (level === 2) {
    return { type: 'choice', mode: 'look', facts: { hour: time.hour, minute, options: choices.map(written), show: 'clocks' }, prompt: { text: `Which clock shows ${written(time)}?`, speak: ['Which clock shows', { time }, '?'] }, stimulus: timeText(time), options: choices.map(clock), answerIndex: choices.findIndex((each) => same(each, time)), explanation: minuteExplanation(time) };
  }
  const prompt = 'What time does the clock show?';
  return { type: 'choice', mode: 'look', facts: { hour: time.hour, minute, options: choices.map(written) }, prompt: { text: prompt, speak: [prompt] }, stimulus: clock(time), options: choices.map(timeText), answerIndex: choices.findIndex((each) => same(each, time)), explanation: minuteExplanation(time) };
}

export const timeToMinuteGenerator: SkillGenerator = {
  skillId: 'M-3-F1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: timeToMinute,
  exampleSeed: 351,
  example: () => timeToMinute(1, makeRng(351)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Each small mark on a clock is one minute. The numbers are five minutes apart.', speak: ['Each small mark on a clock is one minute. The numbers are five minutes apart.'], visual: clock({ hour: 3, minute: 47 }) },
    { beat: 'watch', text: minuteExplanation({ hour: 3, minute: 47 }).steps.join(' '), speak: minuteExplanation({ hour: 3, minute: 47 }).speak, visual: clock({ hour: 3, minute: 47 }) },
    { beat: 'try', text: 'What time does the clock show?', speak: ['What time does the clock show?'], visual: clock({ hour: 8, minute: 22 }), reveal: { text: minuteExplanation({ hour: 8, minute: 22 }).steps.join(' '), speak: minuteExplanation({ hour: 8, minute: 22 }).speak, visual: clock({ hour: 8, minute: 22 }) } },
    { beat: 'remember', text: 'Count by fives, then count on the ones.', speak: ['Count by fives, then count on the ones.'], visual: clock({ hour: 3, minute: 47 }) },
  ],
  oracle: 'time',
};

// ---- F.2 Elapsed time ----
// Levels: whole hours later / half hours / minutes later, typed. Oracle: elapsed.

// Counting on from a time: whole hours one at a time ("Count on 3 hours: 9:00, 10:00, 11:00."), then a half hour.
function laterExplanation(start: Time, plus: number): Explanation {
  const end = later(start, plus);
  const hours = Math.floor(plus / 60);
  const hourWord = hours === 1 ? 'hour' : 'hours';
  const stops = Array.from({ length: hours }, (_, i) => later(start, (i + 1) * 60));
  const stopsText = stops.map(written).join(', ');
  const stopsSay: Say = stops.flatMap((time, i): Say => (i === 0 ? [{ time }] : [',', { time }]));
  if (plus % 60 === 0) {
    return { speak: ['Count on', { number: hours }, `${hourWord}:`, ...stopsSay, '. It will be', { time: end }, '.'], steps: [`Count on ${hours} ${hourWord}: ${stopsText}.`, `It will be ${written(end)}.`], visual: clock(end) };
  }
  if (hours === 0) {
    return { speak: ['Half an hour is', { number: 30 }, 'minutes.', { number: 30 }, 'minutes after', { time: start }, 'is', { time: end }, '.'], steps: ['Half an hour is 30 minutes.', `30 minutes after ${written(start)} is ${written(end)}.`], visual: clock(end) };
  }
  return {
    speak: [{ number: hours }, 'and a half hours is', { number: hours }, `${hourWord} and`, { number: 30 }, 'minutes. Count on', { number: hours }, `${hourWord}:`, ...stopsSay, '. Then', { number: 30 }, 'more minutes is', { time: end }, '.'],
    steps: [`${hours} and a half hours is ${hours} ${hourWord} and 30 minutes.`, `Count on ${hours} ${hourWord}: ${stopsText}. Then 30 more minutes: ${written(end)}.`, `It will be ${written(end)}.`],
    visual: clock(end),
  };
}

// A time given in minutes after 12 o'clock, on a 12-hour clock: 75 is 1:15.
export const clockAt = (minutes: number): Time => {
  const total = ((minutes % 720) + 720) % 720;
  const hour = Math.floor(total / 60);
  return { hour: hour === 0 ? 12 : hour, minute: total % 60 };
};
const minutesOf = (time: Time): number => (time.hour % 12) * 60 + time.minute;
// "1 hour and 20 minutes", "2 hours".
const hoursAndMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}${rest > 0 ? ` and ${rest} minutes` : ''}`;
};

// How many minutes from one time to a later one, both in minutes after 12 o'clock and in fives. Inside one hour, count
// on in fives; past the next o'clock, stop there first: "6:35 to 7:00 is 25 minutes. 7:00 to 7:20 is 20 minutes."
// `label` ends the last line: "That is 35 minutes long."
export function spanExplanation(from: number, to: number, label: string): Explanation {
  const minutes = to - from;
  const toHour = Math.ceil((from + 1) / 60) * 60;
  const [start, hour, end] = [clockAt(from), clockAt(toHour), clockAt(to)];
  const visual: Visual = { kind: 'row', children: [clock(start), clock(end)] };
  if (to <= toHour) {
    return {
      speak: ['Count on in fives from', { time: start }, 'to', { time: end }, '. That is', { number: minutes }, `minutes ${label}.`],
      steps: [`Count on in fives from ${written(start)} to ${written(end)}.`, `That is ${minutes} minutes ${label}.`],
      visual,
    };
  }
  const [first, rest] = [toHour - from, to - toHour];
  return {
    speak: ['From', { time: start }, 'to', { time: hour }, 'is', { number: first }, 'minutes. Then', { number: rest }, 'more minutes to', { time: end }, '. That is', { number: minutes }, `minutes ${label}.`],
    steps: [
      `${written(start)} to ${written(hour)} is ${first} minutes.`,
      rest < 60 ? `${written(hour)} to ${written(end)} is ${rest} minutes.` : `${written(hour)} to ${written(end)} is ${hoursAndMinutes(rest)}, which is ${rest} minutes.`,
      `${first} + ${rest} = ${minutes} minutes ${label}.`,
    ],
    visual,
  };
}

function elapsed(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    // How long from one time to another, under an hour, sometimes past the next hour.
    const start = { hour: rng.int(1, 12), minute: rng.int(0, 11) * 5 };
    const minutes = rng.int(2, 11) * 5;
    const end = later(start, minutes);
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { hour: start.hour, minute: start.minute, endHour: end.hour, endMinute: end.minute, ask: 'minutes' },
      prompt: { text: `A show starts at ${written(start)} and ends at ${written(end)}. How many minutes long is it?`, speak: ['A show starts at', { time: start }, 'and ends at', { time: end }, '. How many minutes long is it?'] },
      stimulus: { kind: 'row', children: [clock(start), clock(end)] },
      answer: minutes,
      maxDigits: 2,
      explanation: spanExplanation(minutesOf(start), minutesOf(start) + minutes, 'long'),
    };
  }
  const start = { hour: rng.int(1, 12), minute: level === 1 ? rng.pick([0, 30]) : rng.pick([0, 15, 30, 45]) };
  const plus = level === 1 ? rng.int(1, 4) * 60 : rng.pick([30, 90, 150]);
  const end = later(start, plus);
  const words = level === 1 ? `${plus / 60} ${plus === 60 ? 'hour' : 'hours'}` : plus === 30 ? 'half an hour' : `${Math.floor(plus / 60)} and a half hours`;
  const wordsSay: Say = level === 1 ? [{ number: plus / 60 }, plus === 60 ? 'hour' : 'hours'] : plus === 30 ? ['half an hour'] : [{ number: Math.floor(plus / 60) }, 'and a half hours'];
  // The slips: an hour out either way, or the start time itself.
  const choices = threeTimes(end, [later(end, 60), later(end, -60), later(end, 30), later(end, -30)], rng);
  return {
    type: 'choice',
    mode: 'look',
    facts: { hour: start.hour, minute: start.minute, plus, ask: 'end', options: choices.map(written) },
    prompt: { text: `It is ${written(start)}. What time will it be in ${words}?`, speak: ['It is', { time: start }, '. What time will it be in', ...wordsSay, '?'] },
    stimulus: clock(start),
    options: choices.map(timeText),
    answerIndex: choices.findIndex((each) => same(each, end)),
    explanation: { ...laterExplanation(start, plus), hint: level === 1 ? { text: 'Count on one hour at a time.' } : { text: 'Half an hour is 30 minutes. Count on any whole hours first, then 30 more minutes.' } },
  };
}

export const elapsedTimeGenerator: SkillGenerator = {
  skillId: 'M-3-F2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: elapsed,
  exampleSeed: 352,
  example: () => elapsed(1, makeRng(352)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Elapsed time is how much time goes by.', speak: ['Elapsed time is how much time goes by.'], visual: clock({ hour: 2, minute: 30 }) },
    { beat: 'watch', text: laterExplanation({ hour: 2, minute: 30 }, 90).steps.join(' '), speak: laterExplanation({ hour: 2, minute: 30 }, 90).speak, visual: laterExplanation({ hour: 2, minute: 30 }, 90).visual },
    { beat: 'try', text: 'It is 9:00. What time will it be in 3 hours?', speak: ['It is', { time: { hour: 9, minute: 0 } }, '. What time will it be in', { number: 3 }, 'hours?'], visual: clock({ hour: 9, minute: 0 }), reveal: { text: laterExplanation({ hour: 9, minute: 0 }, 180).steps.join(' '), speak: laterExplanation({ hour: 9, minute: 0 }, 180).speak, visual: laterExplanation({ hour: 9, minute: 0 }, 180).visual } },
    { beat: 'remember', text: 'Count on the hours first, then the minutes.', speak: ['Count on the hours first, then the minutes.'], visual: clock({ hour: 4, minute: 0 }) },
  ],
  oracle: 'elapsed',
};

// ---- F.3 Area and F.4 Perimeter ----
// Area levels: count square units / rows times columns / typed. Perimeter levels: add the sides on a grid /
// a rectangle with two sides given / typed. Oracle: rect.

const SQUARE = '🟩';
const grid = (length: number, width: number): Visual => ({ kind: 'array', rows: width, cols: length, emoji: SQUARE });

function areaExplanation(length: number, width: number): Explanation {
  return {
    speak: ['There are', { number: width }, 'rows of', { number: length }, 'squares.', ...([{ number: width }, 'times', { number: length }, 'is', { number: length * width }] as Say), '. The area is', { number: length * width }, 'square units.'],
    steps: [`There are ${width} rows of ${length} squares.`, `${width} × ${length} = ${length * width}.`, `The area is ${length * width} square units.`],
    visual: grid(length, width),
  };
}

function perimeterExplanation(length: number, width: number, unit: string): Explanation {
  const p = 2 * (length + width);
  return {
    speak: ['Add all four sides:', { number: length }, 'plus', { number: width }, 'plus', { number: length }, 'plus', { number: width }, 'is', { number: p }, '.'],
    steps: ['The perimeter is the distance all the way around.', `${length} + ${width} + ${length} + ${width} = ${p}.`, `The perimeter is ${p} ${unit}.`],
    visual: grid(length, width),
  };
}

function rectSlips(right: number, length: number, width: number, area: boolean): number[] {
  return area ? [2 * (length + width), length + width, right + length, right - width] : [length * width, length + width, 2 * length + width, right + 2];
}

function rectangleSkill(area: boolean): (level: Level, rng: Rng) => QuestionDraft {
  return (level, rng) => {
    const length = rng.int(level === 1 ? 3 : 4, level === 1 ? 6 : 9);
    let width = rng.int(2, level === 1 ? 4 : 7);
    if (width === length) width -= 1;
    const right = area ? length * width : 2 * (length + width);
    const unit = level === 1 ? 'units' : 'centimeters';
    const ask = area ? 'area' : 'perimeter';
    const explanation = area ? areaExplanation(length, width) : perimeterExplanation(length, width, area ? 'square units' : unit);
    const prompt =
      level === 1
        ? { text: area ? 'What is the area? Each square is one square unit.' : 'What is the perimeter? Each side of a square is one unit.', speak: [area ? 'What is the area? Each square is one square unit.' : 'What is the perimeter? Each side of a square is one unit.'] as Say }
        : area
          ? { text: `A rectangle is ${length} squares long and ${width} squares wide. What is its area?`, speak: ['A rectangle is', { number: length }, 'squares long and', { number: width }, 'squares wide. What is its area?'] as Say }
          : { text: `A rectangle is ${length} centimeters long and ${width} centimeters wide. What is its perimeter?`, speak: ['A rectangle is', { number: length }, 'centimeters long and', { number: width }, 'centimeters wide. What is its perimeter?'] as Say };
    const stimulus: Visual | undefined = level === 3 ? undefined : level === 1 || area ? grid(length, width) : { kind: 'shape', shape: 'rectangle', color: 'blue', size: 'l', rotation: 0 };
    const base = { mode: 'look' as const, prompt, ...(stimulus ? { stimulus } : {}), explanation };
    const facts = { length, width, ask };
    if (level === 3) return { ...base, type: 'numberPad', facts, answer: right, maxDigits: 3 };
    const values = numeralChoices(right, rectSlips(right, length, width, area), 1, 200, rng);
    return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(right) };
  };
}

const areaQuestion = rectangleSkill(true);
export const areaGenerator: SkillGenerator = {
  skillId: 'M-3-F3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: areaQuestion,
  exampleSeed: 353,
  example: () => areaQuestion(1, makeRng(353)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Area is how many squares cover a shape.', speak: ['Area is how many squares cover a shape.'], visual: grid(4, 3) },
    { beat: 'watch', text: areaExplanation(4, 3).steps.join(' '), speak: areaExplanation(4, 3).speak, visual: areaExplanation(4, 3).visual },
    { beat: 'try', text: 'What is the area?', speak: ['What is the area?'], visual: grid(5, 2), reveal: { text: areaExplanation(5, 2).steps.join(' '), speak: areaExplanation(5, 2).speak, visual: areaExplanation(5, 2).visual } },
    { beat: 'remember', text: 'Area of a rectangle: rows times squares in a row.', speak: ['Area of a rectangle: rows times squares in a row.'], visual: grid(4, 3) },
  ],
  oracle: 'rect',
};

const perimeterQuestion = rectangleSkill(false);
export const perimeterGenerator: SkillGenerator = {
  skillId: 'M-3-F4',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: perimeterQuestion,
  exampleSeed: 354,
  example: () => perimeterQuestion(1, makeRng(354)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Perimeter is the distance all the way around a shape.', speak: ['Perimeter is the distance all the way around a shape.'], visual: grid(4, 3) },
    { beat: 'watch', text: perimeterExplanation(4, 3, 'units').steps.join(' '), speak: perimeterExplanation(4, 3, 'units').speak, visual: perimeterExplanation(4, 3, 'units').visual },
    { beat: 'try', text: 'A rectangle is 6 centimeters long and 2 centimeters wide. What is its perimeter?', speak: ['A rectangle is', { number: 6 }, 'centimeters long and', { number: 2 }, 'centimeters wide. What is its perimeter?'], visual: grid(6, 2), reveal: { text: perimeterExplanation(6, 2, 'centimeters').steps.join(' '), speak: perimeterExplanation(6, 2, 'centimeters').speak, visual: perimeterExplanation(6, 2, 'centimeters').visual } },
    { beat: 'remember', text: 'Add all four sides.', speak: ['Add all four sides.'], visual: grid(4, 3) },
  ],
  oracle: 'rect',
};

// ---- F.5 Mass and volume ----
// Levels: pick the sensible unit / read a balance / how much more. Oracles: measureUnit, add, subtract.

const UNITS = ['grams', 'kilograms', 'liters'] as const;

function massVolume(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const thing = rng.pick(MEASURED);
    const kind = thing.liters !== undefined ? 'volume' : 'mass';
    const grams = thing.grams ?? 0;
    const right = kind === 'volume' ? 'liters' : grams < 1000 ? 'grams' : 'kilograms';
    const question = kind === 'volume' ? `how much water ${thing.name} holds` : `how heavy ${thing.name} is`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { kind, grams, options: [...UNITS] },
      prompt: { text: `Which unit would you use to measure ${question}?`, speak: [`Which unit would you use to measure ${question}?`] },
      stimulus: { kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row' },
      options: UNITS.map((unit): Visual => ({ kind: 'text', value: unit, size: 'l', speak: [unit] })),
      answerIndex: UNITS.indexOf(right),
      explanation: {
        speak: kind === 'volume' ? ['Liters measure how much a container holds.'] : grams < 1000 ? ['Grams are for light things. A paper clip is about one gram.'] : ['Kilograms are for heavy things. A big bag of flour is about one kilogram.'],
        steps: kind === 'volume' ? ['Liters measure how much a container holds.', `Use liters for ${thing.name}.`] : grams < 1000 ? ['Grams are for light things.', `${thing.name[0]?.toUpperCase()}${thing.name.slice(1)} is light, so use grams.`] : ['Kilograms are for heavy things.', `${thing.name[0]?.toUpperCase()}${thing.name.slice(1)} is heavy, so use kilograms.`],
        visual: { kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row' },
      },
    };
  }
  if (level === 2) {
    const a = rng.int(2, 9);
    const b = rng.int(1, 9);
    const total = a + b;
    const values = numeralChoices(total, [a, b, total + 1, total - 1, total + 2], 1, 30, rng);
    // "a 7 kilogram weight", "an 8 kilogram weight": a weight is named by its size, so 1 is never "1 kilograms".
    const article = (n: number): string => (n === 8 ? 'an' : 'a');
    return {
      type: 'choice',
      mode: 'look',
      facts: { a, b, oracle: 'add', options: values },
      prompt: {
        text: `The box balances ${article(a)} ${a} kilogram weight and ${article(b)} ${b} kilogram weight. How many kilograms does the box weigh?`,
        speak: [`The box balances ${article(a)}`, { number: a }, `kilogram weight and ${article(b)}`, { number: b }, 'kilogram weight. How many kilograms does the box weigh?'],
      },
      stimulus: { kind: 'scale', left: ['blank'], right: [a, b] },
      options: values.map((value) => numeral(value, 'l')),
      answerIndex: values.indexOf(total),
      explanation: { speak: ['The scale is level, so the box weighs the same as the two weights.', { number: a }, 'plus', { number: b }, 'is', { number: total }, 'kilograms.'], steps: ['The scale is level.', 'The box weighs the same as the two weights together.', `${a} + ${b} = ${total} kilograms.`], visual: { kind: 'scale', left: [total], right: [a, b] } },
    };
  }
  const liters = rng.bool();
  const [big, small] = [rng.int(6, 20), rng.int(1, 5)];
  const [first, second] = liters ? ['A bucket holds', 'A watering can holds'] : ['A pumpkin weighs', 'A melon weighs'];
  // 1 liter, 2 liters.
  const unit = (count: number): string => `${liters ? 'liter' : 'kilogram'}${count === 1 ? '' : 's'}`;
  const question = liters ? 'How many more liters does the bucket hold?' : 'How many more kilograms does the pumpkin weigh?';
  const answer = big - small;
  const values = numeralChoices(answer, [big + small, answer + 1, answer - 1, big], 1, 40, rng);
  const more = liters ? `The bucket holds ${answer} more ${unit(answer)}.` : `The pumpkin weighs ${answer} more ${unit(answer)}.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { a: big, b: small, oracle: 'subtract', options: values },
    prompt: { text: `${first} ${big} ${unit(big)}. ${second} ${small} ${unit(small)}. ${question}`, speak: [first, { number: big }, `${unit(big)}.`, second, { number: small }, `${unit(small)}.`, question] },
    options: values.map((value) => numeral(value, 'l')),
    answerIndex: values.indexOf(answer),
    explanation: {
      speak: ['To find how many more, subtract the smaller amount from the bigger one.', { number: big }, 'minus', { number: small }, 'is', { number: answer }, `${unit(answer)}.`],
      steps: ['To find how many more, subtract the smaller amount from the bigger one.', `${big} − ${small} = ${answer}.`, more],
      visual: { kind: 'equation', parts: [big, '-', small, '=', answer] },
    },
  };
}

export const massVolumeGenerator: SkillGenerator = {
  skillId: 'M-3-F5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['measures'],
  generate: massVolume,
  exampleSeed: 355,
  example: () => massVolume(1, makeRng(355)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Grams and kilograms measure how heavy things are. Liters measure how much a container holds.', speak: ['Grams and kilograms measure how heavy things are. Liters measure how much a container holds.'], visual: { kind: 'row', children: [{ kind: 'emojiGroup', emoji: '🍎', count: 1, layout: 'row' }, { kind: 'emojiGroup', emoji: '🍉', count: 1, layout: 'row' }, { kind: 'emojiGroup', emoji: '🪣', count: 1, layout: 'row' }] } },
    { beat: 'watch', text: 'An apple is light: grams. A watermelon is heavy: kilograms. A bucket holds water: liters.', speak: ['An apple is light: grams. A watermelon is heavy: kilograms. A bucket holds water: liters.'], visual: { kind: 'emojiGroup', emoji: '🍉', count: 1, layout: 'row' } },
    { beat: 'try', text: 'Which unit would you use to measure how heavy a dog is?', speak: ['Which unit would you use to measure how heavy a dog is?'], visual: { kind: 'emojiGroup', emoji: '🐕', count: 1, layout: 'row' }, reveal: { text: 'A dog is heavy, so use kilograms.', speak: ['A dog is heavy, so use kilograms.'], visual: { kind: 'emojiGroup', emoji: '🐕', count: 1, layout: 'row' } } },
    { beat: 'remember', text: 'Light: grams. Heavy: kilograms. Liquid: liters.', speak: ['Light: grams. Heavy: kilograms. Liquid: liters.'], visual: { kind: 'emojiGroup', emoji: '🪣', count: 1, layout: 'row' } },
  ],
  oracle: 'measureUnit',
};

// ---- F.6 Scaled graphs ----
// Levels: picture graph, one picture is 2 / bar graph with steps of 5 / how many more, typed. Oracle: graph.

function scaledGraph(level: Level, rng: Rng): QuestionDraft {
  const things = rng.sample(COUNTABLES, 3);
  const scale = level === 1 ? 2 : 5;
  // A picture graph keeps to 6 pictures in a row, so it fits a phone.
  const steps = rng.sample(level === 1 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7, 8], 3);
  const values = steps.map((step) => step * scale);
  const categories = things.map((thing, i) => ({ label: thing.many, emoji: thing.emoji, value: values[i] as number }));
  const pictureFits = Math.max(...steps) <= 6;
  const visual: Visual = { kind: 'graph', type: level === 1 ? 'picture' : rng.pick(pictureFits ? (['picture', 'bar'] as const) : (['bar'] as const)), categories, scale };
  const shown: Visual = level === 1 ? { ...visual, type: 'picture' } : level === 2 ? { ...visual, type: 'bar' } : visual;
  const capital = (words: string): string => `${words[0]?.toUpperCase() ?? ''}${words.slice(1)}`;
  if (level === 3) {
    const order = [0, 1, 2].sort((x, y) => (values[y] as number) - (values[x] as number));
    const [more, less] = [order[0] as number, order[2] as number];
    const answer = (values[more] as number) - (values[less] as number);
    // A picture graph has pictures, not steps: each picture stands for the scale.
    const key = shown.kind === 'graph' && shown.type === 'picture' ? `Each picture stands for ${scale}.` : `Each step on the scale is ${scale}.`;
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { values, ask: 'difference', index: more, other: less },
      prompt: { text: `How many more ${categories[more]!.label} are there than ${categories[less]!.label}?`, speak: [`How many more ${categories[more]!.label} are there than ${categories[less]!.label}?`] },
      stimulus: shown,
      answer,
      maxDigits: 2,
      explanation: { speak: ['There are', { number: values[more] as number }, categories[more]!.label, 'and', { number: values[less] as number }, `${categories[less]!.label}.`, { number: values[more] as number }, 'minus', { number: values[less] as number }, 'is', { number: answer }, '.'], steps: [key, `${capital(categories[more]!.label)}: ${values[more]}. ${capital(categories[less]!.label)}: ${values[less]}.`, `${values[more]} − ${values[less]} = ${answer}.`], visual: shown },
    };
  }
  const index = rng.int(0, 2);
  const answer = values[index] as number;
  const options = numeralChoices(answer, [steps[index] as number, answer + scale, answer - scale, answer + 1], 1, 60, rng);
  const each = level === 1 ? `Each picture stands for ${scale}.` : `The scale counts up by ${byWord(scale)}.`;
  const eachSay: Say = level === 1 ? ['Each picture stands for', { number: scale }, '.'] : [`The scale counts up by ${byWord(scale)}.`];
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask: 'value', index, options },
    prompt: { text: `How many ${categories[index]!.label} are there?`, speak: [`How many ${categories[index]!.label} are there?`] },
    stimulus: shown,
    options: options.map((value) => numeral(value, 'l')),
    answerIndex: options.indexOf(answer),
    explanation: { speak: [...eachSay, 'So there are', { number: answer }, `${categories[index]!.label}.`], steps: [each, level === 1 ? `There are ${steps[index]} pictures: ${Array.from({ length: steps[index] as number }, (_, i) => (i + 1) * scale).join(', ')}.` : `The bar ends at ${answer}.`, `So there are ${answer} ${categories[index]!.label}.`], visual: shown },
  };
}

export const scaledGraphsGenerator: SkillGenerator = {
  skillId: 'M-3-F6',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: scaledGraph,
  exampleSeed: 356,
  example: () => scaledGraph(1, makeRng(356)),
  lesson: (): LessonStep[] => {
    const sample: Visual = { kind: 'graph', type: 'picture', scale: 2, categories: [{ label: 'apples', emoji: '🍎', value: 6 }, { label: 'stars', emoji: '⭐', value: 10 }, { label: 'ducks', emoji: '🦆', value: 4 }] };
    return [
      { beat: 'see', text: 'On some graphs, one picture stands for more than one thing.', speak: ['On some graphs, one picture stands for more than one thing.'], visual: sample },
      { beat: 'watch', text: 'Each picture stands for 2. There are 3 apple pictures: 2, 4, 6. So there are 6 apples.', speak: ['Each picture stands for two. There are three apple pictures: two, four, six. So there are six apples.'], visual: sample },
      { beat: 'try', text: 'How many stars are there?', speak: ['How many stars are there?'], visual: sample, reveal: { text: '5 pictures: 2, 4, 6, 8, 10. There are 10 stars.', speak: ['Five pictures: two, four, six, eight, ten. There are ten stars.'], visual: sample } },
      { beat: 'remember', text: 'Read the key first: what does one picture stand for?', speak: ['Read the key first: what does one picture stand for?'], visual: sample },
    ];
  },
  oracle: 'graph',
};

// ---- F.7 Line plots ----
// Levels: how many at one length / which length has the most / how many in all, typed. Oracle: graph.

function linePlot(level: Level, rng: Rng): QuestionDraft {
  const denominator = level === 3 ? 4 : 2;
  const startWhole = rng.int(4, 8);
  const min = startWhole * denominator;
  const ticks = 5;
  let counts = Array.from({ length: ticks }, () => rng.int(0, 4));
  // One length always has the most, so "which has the most" has one answer.
  const top = rng.int(0, ticks - 1);
  counts = counts.map((count, i) => (i === top ? 5 : Math.min(count, 4)));
  const label = (i: number): string => partLabel(min + i, denominator);
  const visual: Visual = { kind: 'linePlot', min, max: min + ticks - 1, denominator: denominator as 2 | 4, counts, unit: 'Length of pencils (inches)' };
  if (level === 3) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { values: counts, ask: 'total' },
      prompt: { text: 'Each X is one pencil. How many pencils were measured in all?', speak: ['Each X is one pencil. How many pencils were measured in all?'] },
      stimulus: visual,
      answer: total,
      maxDigits: 2,
      // The first step only repeats the question, so the hint says how to count.
      explanation: { speak: ['Count every X. There are', { number: total }, 'pencils.'], steps: ['Each X is one pencil.', `${counts.join(' + ')} = ${total}.`, `${total} pencils were measured.`], visual, hint: { text: 'Count the X marks above every length, then add them all up.' } },
    };
  }
  if (level === 2) {
    // Three lengths are offered, the one with the most marks among them.
    const offered = rng.shuffle([top, ...rng.sample([0, 1, 2, 3, 4].filter((i) => i !== top), 2)]);
    const prompt = 'Which length has the most pencils?';
    return {
      type: 'choice',
      mode: 'look',
      facts: { values: offered.map((i) => counts[i] as number), ask: 'most', options: offered.map(label) },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: visual,
      options: offered.map((i): Visual => ({ kind: 'text', value: label(i), size: 'l', speak: [...labelSay(min + i, denominator), 'inches'] })),
      answerIndex: offered.indexOf(top),
      explanation: { speak: ['The tallest stack of X marks is at', ...labelSay(min + top, denominator), 'inches. It has', { number: 5 }, 'pencils.'], steps: ['Look for the tallest stack of X marks.', `It is at ${label(top)} inches, with 5 pencils.`], visual },
    };
  }
  const index = rng.int(0, ticks - 1);
  const answer = counts[index] as number;
  const options = numeralChoices(answer, [answer + 1, answer - 1, counts[(index + 1) % ticks] as number], 0, 6, rng);
  return {
    type: 'choice',
    mode: 'look',
    facts: { values: counts, ask: 'value', index, options },
    prompt: { text: `How many pencils are ${label(index)} inches long?`, speak: ['How many pencils are', ...labelSay(min + index, denominator), 'inches long?'] },
    stimulus: visual,
    options: options.map((value) => numeral(value, 'l')),
    answerIndex: options.indexOf(answer),
    explanation: { speak: ['Find', ...labelSay(min + index, denominator), 'inches on the line. Count the X marks above it:', { number: answer }, '.'], steps: [`Find ${label(index)} on the line.`, `Count the X marks above it: ${answer}.`], visual },
  };
}

// "7 and a half" for 7 1/2, "6 and three fourths" for 6 3/4.
function labelSay(value: number, denominator: number): Say {
  const whole = Math.floor(value / denominator);
  const part = value % denominator;
  if (part === 0) return [{ number: whole }];
  if (denominator === 2) return [{ number: whole }, 'and a half'];
  return [{ number: whole }, 'and', { number: part }, part === 1 ? 'fourth' : 'fourths'];
}

export const linePlotsGenerator: SkillGenerator = {
  skillId: 'M-3-F7',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: linePlot,
  exampleSeed: 357,
  example: () => linePlot(1, makeRng(357)),
  lesson: (): LessonStep[] => {
    const sample: Visual = { kind: 'linePlot', min: 12, max: 16, denominator: 2, counts: [1, 3, 0, 2, 1], unit: 'Length of pencils (inches)' };
    return [
      { beat: 'see', text: 'A line plot shows each thing measured as an X above its length.', speak: ['A line plot shows each thing measured as an X above its length.'], visual: sample },
      { beat: 'watch', text: 'Above 6 1/2 there are 3 X marks, so 3 pencils are 6 1/2 inches long.', speak: ['Above six and a half there are three X marks, so three pencils are six and a half inches long.'], visual: sample },
      { beat: 'try', text: 'How many pencils are 7 1/2 inches long?', speak: ['How many pencils are seven and a half inches long?'], visual: sample, reveal: { text: 'There are 2 X marks above 7 1/2, so 2 pencils.', speak: ['There are two X marks above seven and a half, so two pencils.'], visual: sample } },
      { beat: 'remember', text: 'One X is one thing measured.', speak: ['One X is one thing measured.'], visual: sample },
    ];
  },
  oracle: 'graph',
};
