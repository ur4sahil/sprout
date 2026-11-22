import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { ACTIVITIES, TWO_RECTANGLES } from '../../../data/h5-stories';
import type { SkillGenerator } from '../../../generator';
import type { Explanation, Prompt } from './h5-parts';
import { equation, find, numberAnswer } from './h5-parts';
import { clockAt, spanExplanation } from './measure';

// Math grade 3, wave H5: F.8 area of two rectangles together, F.9 perimeter and area problems,
// F.10 time problems and schedules.

const SQUARE = '🟩';
const grid = (length: number, width: number): Visual => ({ kind: 'array', rows: width, cols: length, emoji: SQUARE });
const times = (a: number, b: number): Say => [{ number: a }, 'times', { number: b }];

// ---- F.8 Area of two rectangles ----
// Levels: two rectangles of squares / two rectangles told in a story / typed. Oracle: expression3.

function twoAreasExplanation(l1: number, w1: number, l2: number, w2: number, unit: string): Explanation {
  const [a1, a2] = [l1 * w1, l2 * w2];
  return {
    speak: ['Find the area of each rectangle, then add.', ...times(l1, w1), 'is', { number: a1 }, '.', ...times(l2, w2), 'is', { number: a2 }, '.', { number: a1 }, 'plus', { number: a2 }, 'is', { number: a1 + a2 }, `${unit}.`],
    steps: ['Find the area of each rectangle, then add.', `${l1} × ${w1} = ${a1}. ${l2} × ${w2} = ${a2}.`, `${a1} + ${a2} = ${a1 + a2} ${unit}.`],
    visual: { kind: 'row', children: [grid(l1, w1), grid(l2, w2)] },
  };
}

function twoAreas(level: Level, rng: Rng): QuestionDraft {
  const small = level === 1;
  const [l1, w1, l2, w2] = find(
    (): [number, number, number, number] => [rng.int(3, small ? 6 : 9), rng.int(2, small ? 4 : 8), rng.int(2, small ? 5 : 9), rng.int(2, small ? 4 : 8)],
    ([a, b, c, d]) => a !== b && c !== d && !(a === c && b === d),
  );
  const answer = l1 * w1 + l2 * w2;
  const expr = `(${l1} × ${w1}) + (${l2} × ${w2})`;
  // The slips: one rectangle only, the sides added, the sides joined into one big rectangle.
  const slips = [l1 * w1, l2 * w2, l1 + w1 + l2 + w2, (l1 + l2) * Math.max(w1, w2), answer + 10, answer - 10].filter((slip) => slip > 0 && slip !== answer);
  if (small) {
    const prompt = 'This shape is made of two rectangles. What is its area? Each square is one square unit.';
    return numberAnswer({ prompt: { text: prompt, speak: [prompt] }, stimulus: { kind: 'row', children: [grid(l1, w1), grid(l2, w2)] }, explanation: twoAreasExplanation(l1, w1, l2, w2, 'square units') }, { expr, ask: 'value' }, answer, slips, false, rng, [1, 200]);
  }
  const place = rng.pick(TWO_RECTANGLES);
  // Sides are told as F.3 and F.4 tell them, "long and wide", one sentence for each rectangle.
  const prompt: Prompt = {
    text: `A ${place.place} is made of two rectangles. One is ${l1} ${place.unit} long and ${w1} ${place.unit} wide. The other is ${l2} ${place.unit} long and ${w2} ${place.unit} wide. How many square ${place.unit} is the ${place.place}?`,
    speak: [`A ${place.place} is made of two rectangles. One is`, { number: l1 }, `${place.unit} long and`, { number: w1 }, `${place.unit} wide. The other is`, { number: l2 }, `${place.unit} long and`, { number: w2 }, `${place.unit} wide. How many square ${place.unit} is the ${place.place}?`],
  };
  return numberAnswer({ prompt, explanation: twoAreasExplanation(l1, w1, l2, w2, `square ${place.unit}`) }, { expr, ask: 'value', place: place.place }, answer, slips, level === 3, rng, [1, 200], 3);
}

export const twoAreasGenerator: SkillGenerator = {
  skillId: 'M-3-F8',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['h5-stories'],
  generate: twoAreas,
  exampleSeed: 3138,
  example: () => twoAreas(1, makeRng(3138)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Some shapes are two rectangles put together. Their areas add up.', speak: ['Some shapes are two rectangles put together. Their areas add up.'], visual: { kind: 'row', children: [grid(4, 3), grid(2, 2)] } },
    { beat: 'watch', text: twoAreasExplanation(4, 3, 2, 2, 'square units').steps.join(' '), speak: twoAreasExplanation(4, 3, 2, 2, 'square units').speak, visual: twoAreasExplanation(4, 3, 2, 2, 'square units').visual },
    { beat: 'try', text: 'A garden is two rectangles: 5 meters by 3 meters, and 2 meters by 4 meters. What is its area?', speak: ['A garden is two rectangles:', { number: 5 }, 'meters by', { number: 3 }, 'meters, and', { number: 2 }, 'meters by', { number: 4 }, 'meters. What is its area?'], visual: { kind: 'row', children: [grid(5, 3), grid(2, 4)] }, reveal: { text: twoAreasExplanation(5, 3, 2, 4, 'square meters').steps.join(' '), speak: twoAreasExplanation(5, 3, 2, 4, 'square meters').speak, visual: twoAreasExplanation(5, 3, 2, 4, 'square meters').visual } },
    { beat: 'remember', text: 'Split the shape into rectangles, find each area, then add.', speak: ['Split the shape into rectangles, find each area, then add.'], visual: { kind: 'row', children: [grid(4, 3), grid(2, 2)] } },
  ],
  oracle: 'expression3',
};

// ---- F.9 Perimeter and area problems ----
// Levels: same perimeter, which has more (or less) area / a missing side from the perimeter / a missing side from the
// perimeter or the area, typed. Oracle: expression3.

function samePerimeterExplanation(rects: [number, number][], ask: 'most' | 'least'): Explanation {
  const areas = rects.map(([l, w]) => l * w);
  const best = areas.indexOf(ask === 'most' ? Math.max(...areas) : Math.min(...areas));
  const [bl, bw] = rects[best] as [number, number];
  const p = 2 * (bl + bw);
  return {
    speak: ['Both have a perimeter of', { number: p }, 'units. Their areas are', { number: areas[0] as number }, 'and', { number: areas[1] as number }, 'square units. The', { number: bl }, 'by', { number: bw }, 'rectangle has', ask === 'most' ? 'more.' : 'less.'],
    steps: [`Both perimeters are ${p} units.`, rects.map(([l, w]) => `${l} × ${w} = ${l * w}`).join('. ') + '.', `The ${bl} by ${bw} rectangle has ${ask === 'most' ? 'more' : 'less'} area.`],
    visual: { kind: 'row', children: rects.map(([l, w]) => grid(l, w)) },
  };
}

function sideExplanation(length: number, other: number, from: 'perimeter' | 'area'): Explanation {
  if (from === 'area') {
    const area = length * other;
    // Which two sides: one side and the side next to it, never "side × side", which is a square's rule.
    return {
      speak: ['The area is one side times the side next to it.', { number: length }, 'times blank is', { number: area }, ', and', ...times(length, other), 'is', { number: area }, '. So the other side is', { number: other }, 'centimeters.'],
      steps: ['The area is one side times the side next to it.', `${length} × □ = ${area}, and ${length} × ${other} = ${area}.`, `The other side is ${other} centimeters.`],
      visual: grid(length, other),
      hint: { text: 'Area is a side times the side next to it. What number times the side you know makes the area?' },
    };
  }
  const p = 2 * (length + other);
  return {
    speak: ['Two sides are', { number: length }, 'long, which makes', { number: 2 * length }, '. That leaves', { number: p - 2 * length }, 'for the other two sides, so each is', { number: other }, '.'],
    steps: [`The two ${length} centimeter sides make ${2 * length}.`, `${p} − ${2 * length} = ${p - 2 * length} for the other two sides.`, `${p - 2 * length} ÷ 2 = ${other} centimeters.`],
    visual: grid(length, other),
    // No number word: the side can be 2.
    hint: { text: 'Opposite sides of a rectangle are the same length. Take away the sides you know, then halve what is left.' },
  };
}

function perimeterArea(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const half = rng.int(6, 10);
    const rects = find(
      (): [number, number][] => rng.sample(Array.from({ length: Math.floor(half / 2) }, (_, i): [number, number] => [half - (i + 1), i + 1]), 2),
      (pair) => pair.length === 2,
    );
    const ask: 'most' | 'least' = rng.bool() ? 'most' : 'least';
    const question = `Both rectangles have a perimeter of ${2 * half} units. Which one has ${ask === 'most' ? 'more' : 'less'} area?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { exprs: rects.map(([l, w]) => `${l} × ${w}`), ask, options: rects.map(([l, w]) => `${l} by ${w}`) },
      prompt: { text: question, speak: ['Both rectangles have a perimeter of', { number: 2 * half }, `units. Which one has ${ask === 'most' ? 'more' : 'less'} area?`] },
      options: rects.map(([l, w]) => ({ ...grid(l, w), speak: [{ number: l }, 'by', { number: w }] })),
      answerIndex: rects.findIndex(([l, w]) => l * w === (ask === 'most' ? Math.max : Math.min)(...rects.map(([x, y]) => x * y))),
      // The first step only repeats the question: the hint says what to find.
      explanation: { ...samePerimeterExplanation(rects, ask), hint: { text: 'Find the area of each rectangle: count its squares, or multiply its sides.' } },
    };
  }
  const from = level === 2 ? 'perimeter' : rng.pick(['perimeter', 'area'] as const);
  const [length, other] = find((): [number, number] => [rng.int(3, 9), rng.int(2, 9)], ([x, y]) => x !== y);
  if (from === 'area') {
    const area = length * other;
    const prompt: Prompt = { text: `A rectangle has an area of ${area} square centimeters. One side is ${length} centimeters long. How long is the other side?`, speak: ['A rectangle has an area of', { number: area }, 'square centimeters. One side is', { number: length }, 'centimeters long. How long is the other side?'] };
    return numberAnswer({ prompt, explanation: sideExplanation(length, other, 'area') }, { expr: `${length} × □ = ${area}`, ask: 'missing' }, other, [], true, rng, [1, 100], 2);
  }
  const p = 2 * (length + other);
  const prompt: Prompt = { text: `A rectangle has a perimeter of ${p} centimeters. One side is ${length} centimeters long. How long is the side next to it?`, speak: ['A rectangle has a perimeter of', { number: p }, 'centimeters. One side is', { number: length }, 'centimeters long. How long is the side next to it?'] };
  // The slips: the perimeter less one side, less two sides but not halved, or the side given.
  return numberAnswer({ prompt, stimulus: { kind: 'shape', shape: 'rectangle', color: 'blue', size: 'l', rotation: 0 }, explanation: sideExplanation(length, other, 'perimeter') }, { expr: `${length} + □ + ${length} + □ = ${p}`, ask: 'missing' }, other, [p - length, p - 2 * length, length, other + 2].filter((slip) => slip !== other), level === 3, rng, [1, 40], 2);
}

export const perimeterAreaGenerator: SkillGenerator = {
  skillId: 'M-3-F9',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: perimeterArea,
  exampleSeed: 3139,
  example: () => perimeterArea(1, makeRng(3139)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Rectangles with the same perimeter can have different areas.', speak: ['Rectangles with the same perimeter can have different areas.'], visual: { kind: 'row', children: [grid(5, 1), grid(3, 3)] } },
    { beat: 'watch', text: samePerimeterExplanation([[5, 1], [3, 3]], 'most').steps.join(' '), speak: samePerimeterExplanation([[5, 1], [3, 3]], 'most').speak, visual: samePerimeterExplanation([[5, 1], [3, 3]], 'most').visual },
    { beat: 'try', text: 'A rectangle has a perimeter of 18 centimeters. One side is 6 centimeters long. How long is the side next to it?', speak: ['A rectangle has a perimeter of', { number: 18 }, 'centimeters. One side is', { number: 6 }, 'centimeters long. How long is the side next to it?'], visual: grid(6, 3), reveal: { text: sideExplanation(6, 3, 'perimeter').steps.join(' '), speak: sideExplanation(6, 3, 'perimeter').speak, visual: sideExplanation(6, 3, 'perimeter').visual } },
    { beat: 'remember', text: 'Perimeter goes around the outside. Area covers the inside.', speak: ['Perimeter goes around the outside. Area covers the inside.'], visual: grid(4, 2) },
  ],
  oracle: 'expression3',
};

// ---- F.10 Time problems and schedules ----
// Levels: how long one thing on a schedule lasts / when something ends / minutes across two things on a schedule, typed.
// Oracle: elapsed.

type Time = { hour: number; minute: number };
const written = (time: Time): string => `${time.hour}:${String(time.minute).padStart(2, '0')}`;
const at = clockAt;
const timeText = (time: Time): Visual => ({ kind: 'text', value: written(time), size: 'l', speak: [{ time }] });

interface Slot {
  name: string;
  start: number; // minutes after midnight
  end: number;
}

function schedule(rng: Rng): Slot[] {
  const names = rng.sample(ACTIVITIES, 3);
  // The day starts between 8:00 and 10:25.
  let clock = rng.int(16, 20) * 30 + rng.pick([0, 5, 10, 15, 20, 25]);
  return names.map((name) => {
    const start = clock;
    const end = start + rng.int(4, 11) * 5;
    clock = end + rng.int(0, 3) * 5;
    return { name, start, end };
  });
}

function scheduleVisual(slots: Slot[]): Visual {
  return {
    kind: 'text',
    value: slots.map((slot) => `${slot.name} ${written(at(slot.start))} to ${written(at(slot.end))}.`).join(' '),
    size: 'm',
    speak: slots.flatMap((slot): Say => [`${slot.name},`, { time: at(slot.start) }, 'to', { time: at(slot.end) }, '.']),
  };
}

// When something ends: add the minutes to the start; past the next hour, stop there first. The last line, said
// last, is the end time the question asks for: "Math ends at 8:35."
function endExplanation(start: number, plus: number, name: string): Explanation {
  const end = start + plus;
  const toHour = Math.ceil((start + 1) / 60) * 60;
  const [s, hour, e] = [at(start), at(toHour), at(end)];
  const visual: Visual = { kind: 'row', children: [{ kind: 'clock', ...s }, { kind: 'clock', ...e }] };
  const last = `${name} ends at ${written(e)}.`;
  const lastSay: Say = [`${name} ends at`, { time: e }, '.'];
  if (end === toHour || (end < toHour && s.minute === 0)) {
    return { speak: [{ number: plus }, 'minutes after', { time: s }, 'is', { time: e }, '.', ...lastSay], steps: [`${plus} minutes after ${written(s)} is ${written(e)}.`, last], visual };
  }
  if (end < toHour) {
    const past = s.minute + plus;
    return {
      speak: ['Add the minutes:', { number: s.minute }, 'plus', { number: plus }, 'is', { number: past }, '.', { number: past }, 'minutes past', { number: s.hour }, 'is', { time: e }, '.', ...lastSay],
      steps: [`Add the minutes: ${s.minute} + ${plus} = ${past}.`, `${past} minutes past ${s.hour} is ${written(e)}.`, last],
      visual,
    };
  }
  const first = toHour - start;
  const rest = plus - first;
  return {
    speak: ['From', { time: s }, 'to', { time: hour }, 'is', { number: first }, 'minutes.', { number: rest }, 'more minutes after', { time: hour }, 'is', { time: e }, '.', ...lastSay],
    steps: [`${written(s)} to ${written(hour)} is ${first} minutes.`, `${plus} − ${first} = ${rest}, so count ${rest} more minutes from ${written(hour)}: ${written(e)}.`, last],
    visual,
  };
}

function timeProblems(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    const start = rng.int(1, 12) * 60 + rng.int(0, 11) * 5;
    const plus = rng.int(3, 11) * 5;
    const end = start + plus;
    const name = rng.pick(ACTIVITIES);
    // The slips: ten minutes out either way, or an hour out.
    const choices = rng.shuffle([end, ...rng.sample([end + 10, end - 10, end + 60, end - 60], 2)]).map(at);
    const startTime = at(start);
    return {
      type: 'choice',
      mode: 'look',
      facts: { hour: startTime.hour, minute: startTime.minute, plus, ask: 'end', name, options: choices.map(written) },
      prompt: { text: `${name} starts at ${written(startTime)} and lasts ${plus} minutes. What time does it end?`, speak: [`${name} starts at`, { time: startTime }, 'and lasts', { number: plus }, 'minutes. What time does it end?'] },
      stimulus: { kind: 'clock', ...startTime },
      options: choices.map(timeText),
      answerIndex: choices.findIndex((time) => written(time) === written(at(end))),
      explanation: { ...endExplanation(start, plus, name), hint: { text: 'Add the minutes to the start time. If you pass the next hour, count up to that hour first.' } },
    };
  }
  const slots = schedule(rng);
  const plan = slots.map((slot) => `${slot.name} ${written(at(slot.start))}-${written(at(slot.end))}`).join(', ');
  if (level === 1) {
    const i = rng.int(0, 2);
    const slot = slots[i] as Slot;
    const minutes = slot.end - slot.start;
    const [s, e] = [at(slot.start), at(slot.end)];
    return numberAnswer(
      { prompt: { text: `How many minutes long is ${slot.name}?`, speak: [`How many minutes long is ${slot.name}?`] }, stimulus: scheduleVisual(slots), explanation: spanExplanation(slot.start, slot.end, 'long') },
      { hour: s.hour, minute: s.minute, endHour: e.hour, endMinute: e.minute, ask: 'minutes', plan, pick: i },
      minutes,
      [minutes + 5, minutes - 5, minutes + 10, minutes - 10],
      false,
      rng,
      [5, 120],
    );
  }
  const i = rng.int(0, 1);
  const [first, second] = [slots[i] as Slot, slots[i + 1] as Slot];
  const [s, e] = [at(first.start), at(second.end)];
  return {
    type: 'numberPad',
    mode: 'look',
    facts: { hour: s.hour, minute: s.minute, endHour: e.hour, endMinute: e.minute, ask: 'minutes', plan, pick: i },
    prompt: { text: `How many minutes is it from the start of ${first.name} to the end of ${second.name}?`, speak: [`How many minutes is it from the start of ${first.name} to the end of ${second.name}?`] },
    stimulus: scheduleVisual(slots),
    answer: second.end - first.start,
    maxDigits: 3,
    explanation: spanExplanation(first.start, second.end, 'in all'),
  };
}

export const timeProblemsGenerator: SkillGenerator = {
  skillId: 'M-3-F10',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['h5-stories'],
  generate: timeProblems,
  exampleSeed: 3140,
  example: () => timeProblems(1, makeRng(3140)),
  lesson: (): LessonStep[] => {
    const sample: Slot[] = [{ name: 'Reading', start: 9 * 60 + 5, end: 9 * 60 + 40 }, { name: 'Art', start: 9 * 60 + 45, end: 10 * 60 + 20 }, { name: 'Music', start: 10 * 60 + 30, end: 11 * 60 + 5 }];
    const watch = spanExplanation(9 * 60 + 45, 10 * 60 + 20, 'long');
    const attempt = spanExplanation(9 * 60 + 5, 9 * 60 + 40, 'long');
    return [
      { beat: 'see', text: 'A schedule tells when each thing starts and ends.', speak: ['A schedule tells when each thing starts and ends.'], visual: scheduleVisual(sample) },
      { beat: 'watch', text: `How long is Art? ${watch.steps.join(' ')}`, speak: ['How long is Art?', ...watch.speak], visual: watch.visual },
      { beat: 'try', text: 'How many minutes long is Reading?', speak: ['How many minutes long is Reading?'], visual: scheduleVisual(sample), reveal: { text: attempt.steps.join(' '), speak: attempt.speak, visual: attempt.visual } },
      { beat: 'remember', text: 'Count on to the next hour, then on to the end time.', speak: ['Count on to the next hour, then on to the end time.'], visual: equation(25, '+', 20, '=', 45) },
    ];
  },
  oracle: 'elapsed',
};
