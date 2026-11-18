import { COUNTABLES } from '../content/data/countables';
import type { Question, Say } from '../engine/types';
import { add, alter, art, calm, countAlong, group, ids, moment, num, numeral, scene, set, str, text, turnQuestion, withoutHand } from './build';
import type { Lesson, LessonPart, Moment, Scene } from './types';

// Kindergarten Math lessons (plan section 16).

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

function thing(name: string): { emoji: string; one: string; many: string } {
  const found = COUNTABLES.find((each) => each.one === name);
  if (!found) throw new Error(`No countable called ${name}`);
  return found;
}
const many = (n: number, of: { one: string; many: string }): string => (n === 1 ? of.one : of.many);

// Count them all, one by one, and say how many.
function countMoments(start: Scene, pieceIds: readonly string[], of: { one: string; many: string }): { moments: Moment[]; end: Scene } {
  const n = pieceIds.length;
  const counted = countAlong(start, pieceIds);
  const last: Say = ['The last number we said is', { number: n }, '.'];
  const total: Say = [n === 1 ? 'So there is' : 'So there are', { number: n }, `${many(n, of)}.`];
  const all = set(counted.end, [...pieceIds], { lit: true });
  return {
    moments: [...counted.moments, moment(last, `The last number is ${n}.`, counted.end), moment(total, `There ${n === 1 ? 'is' : 'are'} ${n} ${many(n, of)}.`, all)],
    end: all,
  };
}

// ---- M-K-A1 Count to 20 ----

function countWhy(question: Question): Moment[] {
  const n = num(question.facts, 'n');
  const of = thing(str(question.facts, 'thing'));
  const start = scene(group('w', art(of.emoji), n, n <= 5 ? 5 - n / 2 : 2.5, n <= 10 ? 1.5 : 0.5));
  return [moment(['Let us count them together, one at a time.'], 'Count them together, one at a time.', start), ...countMoments(start, ids('w', n), of).moments];
}

export function countLesson(): Lesson {
  const apple = thing('apple');
  const star = thing('star');
  const apples = scene(group('a', art(apple.emoji), 5, 2.5, 2));
  const counted = countMoments(apples, ids('a', 5), apple);
  const stars = scene(group('s', art(star.emoji), 12, 2.5, 0.5));
  const low = turnQuestion('M-K-A1', 1).facts;
  const smallest = (f: Record<string, unknown>): boolean => num(f, 'n') <= Math.max(8, num(low, 'n'));
  const first = turnQuestion('M-K-A1', 1, smallest);
  const second = turnQuestion('M-K-A1', 1, (f) => num(f, 'n') >= 11);
  return {
    parts: [
      show(moment(['Counting tells us how many there are.'], 'Counting tells us how many.', apples)),
      show(moment(['Here are some apples. How many are there?'], 'How many apples?', apples)),
      show(moment(['We touch each apple, and say one number for each one.'], 'Touch each one and say one number.', set(apples, ['a0'], { lit: true }))),
      ...counted.moments.map(show),
      show(moment(['Each apple gets just one number. We never skip one, and we never count one twice.'], 'One number for each apple.', calm(counted.end))),
      turn(first, countWhy(first)),
      show(moment(['When there are more, count the top row first, then the next row.'], 'Top row first, then the next row.', stars)),
      ...countMoments(stars, ids('s', 12), star).moments.map(show),
      turn(second, countWhy(second)),
      show(moment(['Touch each one once. The last number tells how many.'], 'The last number tells how many.', calm(apples))),
    ],
  };
}

// ---- M-K-C1 Add with pictures to 5 ----

// Two groups with a plus between them; then the second slides over to join the first, and all are counted.
function joinMoments(a: number, b: number, of: { emoji: string; one: string; many: string }, prefix: string): Moment[] {
  const left = group(`${prefix}a`, art(of.emoji), a, 0.5, 2, 5);
  const right = group(`${prefix}b`, art(of.emoji), b, 6, 2, 5);
  const apart = scene([...left, { id: `${prefix}plus`, look: text('+'), x: 4.5, y: 2 }, ...right]);
  const together = alter(apart, (piece) => {
    if (piece.id === `${prefix}plus`) return { ...piece, gone: true };
    const index = piece.id.startsWith(`${prefix}b`) ? a + Number(piece.id.slice(prefix.length + 1)) : null;
    return index === null ? piece : { ...piece, x: 0.5 + index, y: 2 };
  });
  const all = [...ids(`${prefix}a`, a), ...ids(`${prefix}b`, b)];
  const counted = countAlong(together, all);
  const sum = add(set(counted.end, all, { lit: true }), [
    { id: `${prefix}e0`, look: numeral(a), x: 2, y: 4 },
    { id: `${prefix}e1`, look: text('+'), x: 3, y: 4 },
    { id: `${prefix}e2`, look: numeral(b), x: 4, y: 4 },
    { id: `${prefix}e3`, look: text('='), x: 5, y: 4 },
    { id: `${prefix}e4`, look: numeral(a + b), x: 6, y: 4 },
  ]);
  return [
    moment(['Here', a === 1 ? 'is' : 'are', { number: a }, `${many(a, of)}.`], `${a} ${many(a, of)}`, set(apart, ids(`${prefix}a`, a), { lit: true })),
    moment(['And here', b === 1 ? 'is' : 'are', { number: b }, `more.`], `${b} more`, set(calm(apart), ids(`${prefix}b`, b), { lit: true })),
    moment(['Let us push them together.'], 'Push them together.', calm(together)),
    moment(['Now count them all.'], 'Count them all.', calm(together)),
    ...counted.moments,
    moment([{ number: a }, 'and', { number: b }, 'more make', { number: a + b }, '.'], `${a} + ${b} = ${a + b}`, sum),
  ];
}

function addWhy(question: Question): Moment[] {
  const of = thing(str(question.facts, 'thing'));
  return joinMoments(num(question.facts, 'a'), num(question.facts, 'b'), of, 'w');
}

export function addPicturesLesson(): Lesson {
  const apple = thing('apple');
  const first = turnQuestion('M-K-C1', 1, (f) => num(f, 'a') >= 1 && num(f, 'b') >= 1 && num(f, 'a') + num(f, 'b') >= 3);
  const second = turnQuestion('M-K-C1', 2, (f) => num(f, 'a') + num(f, 'b') >= 4 && str(f, 'thing') !== 'apple');
  const opening = joinMoments(3, 2, apple, 'x');
  const groups = opening[0]?.scene ?? scene([]);
  return {
    parts: [
      show(moment(['Adding means putting groups together, to find how many in all.'], 'Adding puts groups together.', calm(groups))),
      ...opening.map(show),
      show(moment(['When we add, the group gets bigger.'], 'Adding makes the group bigger.', withoutHand(opening.at(-1)?.scene ?? groups))),
      turn(first, addWhy(first)),
      turn(second, addWhy(second)),
      show(moment(['To add, put the groups together, and count them all.'], 'Put them together and count them all.', withoutHand(opening.at(-1)?.scene ?? groups))),
    ],
  };
}

// ---- M-K-D1 Teen numbers ----

const COUNTER = '🔴';

// A full ten-frame on the left, `ones` counters to its right, and the count on from ten.
function teenMoments(ones: number, prefix: string): Moment[] {
  const cells = Array.from({ length: 10 }, (_, i) => ({ id: `${prefix}c${i}`, look: { kind: 'cell' as const }, x: 0.5 + (i % 5), y: 1 + Math.floor(i / 5) }));
  const tens = group(`${prefix}t`, art(COUNTER), 10, 0.5, 1, 5).map((piece) => ({ ...piece, gone: true }));
  const extra = group(`${prefix}o`, art(COUNTER), ones, 6.5, 1, 3).map((piece) => ({ ...piece, gone: true }));
  const empty = scene([...cells, ...tens, ...extra]);
  const full = set(empty, ids(`${prefix}t`, 10), { gone: false });
  const withOnes = set(full, ids(`${prefix}o`, ones), { gone: false, lit: true });
  const counted = countAlong(set(withOnes, ids(`${prefix}t`, 10), { lit: true }), ids(`${prefix}o`, ones), 10);
  const value = 10 + ones;
  const named = add(withoutHand(counted.end), [
    { id: `${prefix}n1`, look: numeral(1), x: 2.5, y: 4, w: 1, h: 1.2 },
    { id: `${prefix}n2`, look: numeral(ones), x: 7, y: 4, w: 1, h: 1.2 },
  ]);
  return [
    moment(['This ten-frame is full. That is ten.'], 'A full ten-frame is 10.', set(full, ids(`${prefix}t`, 10), { lit: true })),
    moment(['Here', ones === 1 ? 'is' : 'are', { number: ones }, 'more.'], `${ones} more`, calm(withOnes)),
    moment(['Start at ten, and count on.'], 'Start at 10 and count on.', set(calm(withOnes), ids(`${prefix}t`, 10), { lit: true })),
    ...counted.moments,
    moment(['Ten and', { number: ones }, 'more make', { number: value }, '.'], `10 and ${ones} make ${value}`, named),
    moment(['In', { number: value }, ', the one means one ten, and the', { number: ones }, 'means', { number: ones }, 'more.'], `${value}: 1 ten and ${ones} more`, set(named, [`${prefix}n1`, `${prefix}n2`, ...ids(`${prefix}t`, 10), ...ids(`${prefix}o`, ones)], { lit: true })),
  ];
}

function teenWhy(question: Question): Moment[] {
  return teenMoments(num(question.facts, 'ones'), 'w');
}

export function teenLesson(): Lesson {
  const cells = Array.from({ length: 10 }, (_, i) => ({ id: `xc${i}`, look: { kind: 'cell' as const }, x: 0.5 + (i % 5), y: 1 + Math.floor(i / 5) }));
  const counters = group('xt', art(COUNTER), 10, 0.5, 1, 5).map((piece) => ({ ...piece, gone: true }));
  const frame = scene([...cells, ...counters]);
  const fill = countAlong(frame, ids('xt', 10));
  // Each counter appears as it is counted.
  const filling = fill.moments.map((each, i) => ({ ...each, scene: set(each.scene, ids('xt', i + 1), { gone: false }) }));
  const first = turnQuestion('M-K-D1', 1, (f) => f.ask === 'number' && num(f, 'ones') >= 2 && num(f, 'ones') <= 5);
  const second = turnQuestion('M-K-D1', 1, (f) => f.ask === 'number' && num(f, 'ones') >= 6);
  return {
    parts: [
      show(moment(['A ten-frame has ten boxes.'], 'A ten-frame has 10 boxes.', frame)),
      show(moment(['Let us fill it, one counter in each box.'], 'One counter in each box.', frame)),
      ...filling.map(show),
      ...teenMoments(3, 'x').map((each) => show(each)),
      show(moment(['Every teen number is ten and some more.'], 'A teen number is 10 and some more.', calm(teenMoments(3, 'x').at(-1)?.scene ?? frame))),
      turn(first, teenWhy(first)),
      turn(second, teenWhy(second)),
      show(moment(['Fill the ten first, then count on from ten.'], 'Fill the ten, then count on.', calm(teenMoments(3, 'x').at(-1)?.scene ?? frame))),
    ],
  };
}
