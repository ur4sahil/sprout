import { COUNTABLES } from '../../content/data/countables';
import type { Question, Say, Visual } from '../../engine/types';
import { add, alter, art, calm, ids, moment, num, numeral, picture, pointAt, scene, set, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, PieceLook, Scene } from '../types';

// Part 2 lessons (plan section 16): a second short lesson for a skill's harder levels, offered once the child is
// about half way up the skill. This file: Kindergarten Math, category C (adding and taking away), the levels above
// the first lessons in `../more/kAdd.ts`: answers typed on the number pad, the box in a new place, no picture to
// look at, bigger numbers, and finding the picture for a number sentence.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

interface Thing {
  emoji: string;
  one: string;
  many: string;
}

function thing(name: string): Thing {
  const found = COUNTABLES.find((each) => each.one === name);
  if (!found) throw new Error(`No countable called ${name}`);
  return found;
}

const many = (n: number, of: Thing): string => (n === 1 ? of.one : of.many);
const isAre = (n: number): string => (n === 1 ? 'is' : 'are');
const dots = (n: number): string => (n === 1 ? 'dot' : 'dots');
const word = (facts: Record<string, unknown>, key: string): string | undefined => (typeof facts[key] === 'string' ? (facts[key] as string) : undefined);
const thingOf = (facts: Record<string, unknown>, key = 'thing', fallback = 'apple'): Thing => thing(word(facts, key) ?? fallback);

const RED = '🔴';
const BLUE = '🔵';
const DOT = '⚫';
const FROG = '🐸';
const MINUS = '−';
const BOX = 'box'; // in a number sentence: the empty answer box

// The i-th piece of a group laid out in rows of five, from (x, y).
const spot = (i: number, x: number, y: number): { x: number; y: number } => ({ x: x + (i % 5), y: y + Math.floor(i / 5) });

function laid(prefix: string, look: PieceLook, count: number, x: number, y: number, from = 0): Piece[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}`, look, ...spot(from + i, x, y) }));
}

// A number sentence across the top of the stage. Numbers become numerals, BOX an empty box, anything else a sign.
function sentence(prefix: string, parts: (number | string)[], cols: number): Piece[] {
  const x0 = (cols - parts.length) / 2;
  return parts.map((part, i) => ({
    id: `${prefix}e${i}`,
    look: part === BOX ? { kind: 'box' as const } : typeof part === 'number' ? numeral(part) : text(part),
    x: x0 + i,
    y: 0.4,
  }));
}

const eq = (prefix: string, ...at: number[]): string[] => at.map((i) => `${prefix}e${i}`);

function relook(from: Scene, id: string, look: PieceLook, fields: Partial<Piece> = {}): Scene {
  return alter(from, (piece) => (piece.id === id ? { ...piece, ...fields, look } : piece));
}

// Counting out loud, one moment for each piece: each one lit in turn with its number above it and the hand on it.
// It keeps what is already lit, and `change` can also make each piece appear or cross it out.
function tally(start: Scene, pieceIds: readonly string[], from = 0, change: Partial<Piece> = {}): { moments: Moment[]; end: Scene } {
  let now = start;
  const moments: Moment[] = [];
  pieceIds.forEach((id, i) => {
    const n = from + i + 1;
    now = alter(now, (each) => (each.id === id ? { ...each, ...change, lit: true, badge: String(n) } : each.badge ? { ...each, badge: undefined } : each));
    const piece = now.pieces.find((each) => each.id === id);
    if (piece) now = pointAt(now, piece);
    moments.push(moment([{ number: n }], String(n), now));
  });
  return { moments, end: withoutHand(now) };
}

const last = (moments: Moment[], fallback: Scene): Scene => moments.at(-1)?.scene ?? fallback;
const first = (moments: Moment[], fallback: Scene): Scene => moments[0]?.scene ?? fallback;

const WIDE = 12;
const STAGE = 10;

// ---- Counting on: C.2 and C.4 ----

// The sum on top, and below it the bigger group in red with the smaller in blue after it. Start at the bigger number
// and count on the smaller one. With `boxFirst` the sentence reads "box = a + b".
function countOnMoments(prefix: string, a: number, b: number, boxFirst = false): Moment[] {
  const sum = a + b;
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const aAt = boxFirst ? 2 : 0;
  const bAt = boxFirst ? 4 : 2;
  const boxAt = boxFirst ? 0 : 4;
  const bigAt = a >= b ? aAt : bAt;
  const smallAt = a >= b ? bAt : aAt;
  const top = sentence(prefix, boxFirst ? [BOX, '=', a, '+', b] : [a, '+', b, '=', BOX], WIDE);
  const reds = laid(`${prefix}r`, art(RED), big, 3.5, 2);
  const blues = laid(`${prefix}u`, art(BLUE), small, 3.5, 2, big);
  const start = scene([...top, ...reds, ...blues], WIDE);
  const fromBig = set(start, [...eq(prefix, bigAt), ...ids(`${prefix}r`, big)], { lit: true });
  const withBadge = alter(fromBig, (piece) => (piece.id === `${prefix}r${big - 1}` ? { ...piece, badge: String(big) } : piece));
  const counted = tally(calm(set(withBadge, eq(prefix, smallAt), { lit: true })), ids(`${prefix}u`, small), big);
  const done = relook(set(counted.end, eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e${boxAt}`, numeral(sum));
  return [
    boxFirst
      ? moment(['The box is the same as', { number: a }, 'plus', { number: b }, '.'], `? = ${a} + ${b}`, set(start, eq(prefix, aAt, aAt + 1, bAt), { lit: true }))
      : moment([{ number: a }, 'plus', { number: b }, '. How many is that?'], `${a} + ${b} = ?`, set(start, eq(prefix, 0, 1, 2), { lit: true })),
    moment([a === b ? 'Start with' : 'Start with the bigger number,', { number: big }, '. Keep it in your head.'], `Start with ${big}.`, withBadge),
    moment(['Now count on', { number: small }, 'more.'], `Count on ${small} more.`, set(calm(start), [...eq(prefix, smallAt), ...ids(`${prefix}u`, small)], { lit: true })),
    ...counted.moments,
    boxFirst
      ? moment([{ number: sum }, ', equals', { number: a }, ', plus', { number: b }, '.'], `${sum} = ${a} + ${b}`, done)
      : moment([{ number: a }, ', plus', { number: b }, ', equals', { number: sum }, '.'], `${a} + ${b} = ${sum}`, done),
  ];
}

// Plus zero: none more, so the number stays the same.
function zeroPlusMoments(prefix: string, a: number, b: number): Moment[] {
  const n = a + b;
  const top = sentence(prefix, [a, '+', b, '=', BOX], WIDE);
  const start = scene([...top, ...laid(`${prefix}r`, art(RED), n, 3.5, 2)], WIDE);
  const zeroAt = a === 0 ? 0 : 2;
  return [
    moment([{ number: a }, 'plus', { number: b }, '. How many is that?'], `${a} + ${b} = ?`, set(start, eq(prefix, 0, 1, 2), { lit: true })),
    moment(['Zero means none. It adds no more.'], '0 means none.', set(start, eq(prefix, zeroAt), { lit: true })),
    moment(['So we just have', { number: n }, '.'], `Just ${n}`, set(start, ids(`${prefix}r`, n), { lit: true })),
    moment([{ number: a }, ', plus', { number: b }, ', equals', { number: n }, '.'], `${a} + ${b} = ${n}`, relook(set(start, eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e4`, numeral(n))),
  ];
}

function plusWhy(question: Question): Moment[] {
  const a = num(question.facts, 'a');
  const b = num(question.facts, 'b');
  if (a === 0 || b === 0) return zeroPlusMoments('w', a, b);
  return countOnMoments('w', a, b, question.level === 4);
}

// C.2 level 3: no answers to pick from; sums to 5, with zero now and then.
function addTo5Typed(): Lesson {
  const opening = countOnMoments('x', 1, 4);
  const zero = zeroPlusMoments('y', 0, 3);
  const one = turnQuestion('M-K-C2', 3, (f) => num(f, 'a') >= 2 && num(f, 'b') >= 2);
  const two = turnQuestion('M-K-C2', 3, (f) => num(f, 'b') === 0 && num(f, 'a') >= 2 && num(f, 'a') !== 3);
  const fallback = scene([], WIDE);
  const start = first(opening, fallback);
  const end = last(opening, fallback);
  return {
    parts: [
      show(moment(['You know how to add by counting on.'], 'You can count on.', calm(start))),
      show(moment(['Now there are no answers to pick from. You find the number yourself.'], 'No answers to pick from.', set(calm(start), ['xe4'], { lit: true }))),
      ...opening.map(show),
      show(moment(['The number we end on goes in the box. Tap it on the number pad.'], 'Tap the number you end on.', set(calm(end), ['xe4'], { lit: true }))),
      turn(one, plusWhy(one)),
      show(moment(['Sometimes one of the numbers is zero.'], 'One number can be 0.', calm(first(zero, fallback)))),
      ...zero.map(show),
      turn(two, plusWhy(two)),
      show(moment(['Count on, and tap the number you end on.'], 'Count on. Tap the number.', calm(end))),
    ],
  };
}

// C.4 level 3: typed. Level 4: the box comes first, "box = a + b".
function addTo10Typed(): Lesson {
  const opening = countOnMoments('x', 3, 7);
  const flipped = countOnMoments('y', 4, 5, true);
  const one = turnQuestion('M-K-C4', 3, (f) => num(f, 'a') >= 2 && num(f, 'b') >= 2 && num(f, 'a') !== 3 && num(f, 'b') !== 3 && num(f, 'a') + num(f, 'b') >= 7 && num(f, 'a') + num(f, 'b') !== 10);
  const two = turnQuestion('M-K-C4', 4, (f) => num(f, 'a') >= 2 && num(f, 'b') >= 2 && num(f, 'a') !== num(f, 'b') && num(f, 'a') + num(f, 'b') >= 6 && num(f, 'a') + num(f, 'b') <= 8 && num(f, 'a') + num(f, 'b') !== num(one.facts, 'a') + num(one.facts, 'b'));
  const fallback = scene([], WIDE);
  const start = first(opening, fallback);
  const boxStart = first(flipped, fallback);
  return {
    parts: [
      show(moment(['You know how to count on from the bigger number.'], 'You can count on.', calm(start))),
      show(moment(['Now you find the answer yourself, and tap it on the number pad.'], 'Tap your answer on the number pad.', set(calm(start), ['xe4'], { lit: true }))),
      ...opening.map(show),
      turn(one, plusWhy(one)),
      show(moment(['Sometimes the box comes first.'], 'The box can come first.', set(calm(boxStart), ['ye0'], { lit: true }))),
      show(moment(['This sign is called equals. It means, is the same as.'], '= means "is the same as".', set(calm(boxStart), ['ye1'], { lit: true }))),
      ...flipped.map(show),
      show(moment(['The box moved, but the work is the same. We add the two numbers.'], 'Still add the two numbers.', calm(last(flipped, fallback)))),
      turn(two, plusWhy(two)),
      show(moment(['The box can be first or last. Add the two numbers, and tap the answer.'], 'Box first or last: add the two numbers.', calm(last(flipped, fallback)))),
    ],
  };
}

// ---- Taking away: C.6, C.7 and the take away stories ----

interface AwayWords {
  first: Say;
  firstText: string;
  second: Say;
  secondText: string;
}

const awayWords = (a: number, b: number): AwayWords => ({
  first: ['Start with', { number: a }, '.'],
  firstText: `Start with ${a}.`,
  second: b === 1 ? ['Take away', { number: b }, '. Cross it out.'] : ['Take away', { number: b }, '. Cross them out, one at a time.'],
  secondText: `Take away ${b}.`,
});

// A group of a, the last b crossed out one by one, then the ones left counted.
function awayMoments(prefix: string, a: number, b: number, look: PieceLook, words: AwayWords = awayWords(a, b)): Moment[] {
  const left = a - b;
  const top = sentence(prefix, [a, MINUS, b, '=', BOX], STAGE);
  const start = scene([...top, ...laid(`${prefix}p`, look, a, 2.5, 2)], STAGE);
  const all = ids(`${prefix}p`, a);
  const gone = ids(`${prefix}p`, b, left);
  const kept = ids(`${prefix}p`, left);
  const crossing = tally(set(start, eq(prefix, 1, 2), { lit: true }), gone, 0, { crossed: true });
  const counted = tally(calm(crossing.end), kept);
  const done = relook(set(calm(counted.end), eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e4`, numeral(left));
  return [
    moment(words.first, words.firstText, set(start, [...all, `${prefix}e0`], { lit: true })),
    moment(words.second, words.secondText, set(start, eq(prefix, 1, 2), { lit: true })),
    ...crossing.moments,
    ...(left === 0
      ? [moment(['Every one is crossed out. None are left.'], 'None are left.', calm(crossing.end))]
      : [moment(['Now count the ones that are left.'], 'Count the ones left.', calm(crossing.end)), ...counted.moments]),
    moment([{ number: a }, ', take away', { number: b }, ', is', { number: left }, '.'], `${a} ${MINUS} ${b} = ${left}`, done),
  ];
}

// Take away zero: nothing is crossed out.
function awayZeroMoments(prefix: string, a: number): Moment[] {
  const top = sentence(prefix, [a, MINUS, 0, '=', BOX], STAGE);
  const start = scene([...top, ...laid(`${prefix}p`, art(DOT), a, 2.5, 2)], STAGE);
  return [
    moment(['Start with', { number: a }, '.'], `Start with ${a}.`, set(start, [...ids(`${prefix}p`, a), `${prefix}e0`], { lit: true })),
    moment(['Take away zero. That means none go away.'], 'Take away 0: none go.', set(start, eq(prefix, 1, 2), { lit: true })),
    moment([{ number: a }, ', take away', { number: 0 }, ', is', { number: a }, '.'], `${a} ${MINUS} 0 = ${a}`, relook(set(start, eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e4`, numeral(a))),
  ];
}

function dotsAwayWhy(question: Question): Moment[] {
  const a = num(question.facts, 'a');
  const b = num(question.facts, 'b');
  return b === 0 ? awayZeroMoments('w', a) : awayMoments('w', a, b, art(DOT));
}

// C.6 level 3: typed, and taking away every one leaves zero.
function subtractTo5Typed(): Lesson {
  const opening = awayMoments('x', 5, 3, art(DOT));
  const allGone = awayMoments('y', 3, 3, art(DOT));
  const one = turnQuestion('M-K-C6', 3, (f) => num(f, 'a') >= 3 && num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') >= 1 && !(num(f, 'a') === 5 && num(f, 'b') === 3));
  const two = turnQuestion('M-K-C6', 3, (f) => num(f, 'a') === num(f, 'b') && num(f, 'a') >= 2 && num(f, 'a') !== 3);
  const fallback = scene([], STAGE);
  const start = first(opening, fallback);
  const end = last(opening, fallback);
  return {
    parts: [
      show(moment(['You know how to take away. Cross some out, and count what is left.'], 'You can take away.', calm(start))),
      show(moment(['Now there are no answers to pick from. You find the number yourself.'], 'No answers to pick from.', set(calm(start), ['xe4'], { lit: true }))),
      ...opening.map(show),
      show(moment(['The number left goes in the box. Tap it on the number pad.'], 'Tap the number that is left.', set(calm(end), ['xe4'], { lit: true }))),
      turn(one, dotsAwayWhy(one)),
      show(moment(['What if we take away every one?'], 'Take away every one?', calm(first(allGone, fallback)))),
      ...allGone.map(show),
      show(moment(['When none are left, the answer is zero.'], 'None left is 0.', set(calm(last(allGone, fallback)), ['ye4'], { lit: true }))),
      turn(two, dotsAwayWhy(two)),
      show(moment(['Cross out, count what is left, and tap that number.'], 'Cross out. Count. Tap the number.', calm(end))),
    ],
  };
}

// C.7 level 3: typed, any numbers to 10. Checking by putting the parts back, and counting on from a full row of five.
function subtractTo10Typed(): Lesson {
  const opening = awayMoments('x', 9, 6, art(DOT));
  const one = turnQuestion('M-K-C7', 3, (f) => num(f, 'a') >= 6 && num(f, 'a') <= 8 && num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') >= 2);
  const two = turnQuestion('M-K-C7', 3, (f) => num(f, 'a') >= 9 && num(f, 'b') >= 3 && num(f, 'a') - num(f, 'b') >= 2 && !(num(f, 'a') === 9 && num(f, 'b') === 6));
  const fallback = scene([], STAGE);
  const start = first(opening, fallback);
  const end = last(opening, fallback);
  // 10 take away 2: the top row is a full five, so the ones left are counted on from five.
  const rows = scene([...sentence('y', [10, MINUS, 2, '=', BOX], STAGE), ...laid('yp', art(DOT), 10, 2.5, 2).map((piece, i) => (i >= 8 ? { ...piece, crossed: true } : piece))], STAGE);
  const fullRow = alter(set(rows, ids('yp', 5), { lit: true }), (piece) => (piece.id === 'yp4' ? { ...piece, badge: '5' } : piece));
  const countedOn = tally(alter(fullRow, (piece) => (piece.badge ? { ...piece, badge: undefined } : piece)), ids('yp', 3, 5), 5);
  return {
    parts: [
      show(moment(['You know how to take away with dots.'], 'You can take away with dots.', calm(start))),
      show(moment(['Now there are no answers to pick from. You find the number, and tap it on the number pad.'], 'Tap your answer on the number pad.', set(calm(start), ['xe4'], { lit: true }))),
      ...opening.map(show),
      show(moment(['Let us check.', { number: 3 }, 'left, and', { number: 6 }, 'crossed out, make', { number: 9 }, 'again.'], '3 and 6 make 9 again.', set(calm(end), ids('xp', 9), { lit: true }))),
      turn(one, dotsAwayWhy(one)),
      show(moment(['Here is', { number: 10 }, ', take away', { number: 2 }, '. The top row is full, so it is', { number: 5 }, '.'], 'A full row is 5.', fullRow)),
      show(moment(['We do not count that row again. We count on from', { number: 5 }, '.'], 'Count on from 5.', set(fullRow, ['yp5', 'yp6', 'yp7'], { lit: true }))),
      ...countedOn.moments.map(show),
      show(moment(['So', { number: 8 }, 'are left.'], `10 ${MINUS} 2 = 8`, relook(set(countedOn.end, eq('y', 0, 2, 4), { lit: true }), 'ye4', numeral(8)))),
      turn(two, dotsAwayWhy(two)),
      show(moment(['Cross out, count what is left, and tap that number.'], 'Cross out. Count. Tap the number.', calm(end))),
    ],
  };
}

// ---- C.8 Make 10, level 3: only a number sentence, typed ----

// The sentence alone; then a ten-frame with `have` full appears, and the empty boxes are filled and counted.
function frameTenMoments(prefix: string, have: number): Moment[] {
  const need = 10 - have;
  const cells: Piece[] = Array.from({ length: 10 }, (_, i) => ({ id: `${prefix}c${i}`, look: { kind: 'cell' as const }, ...spot(i, 2.5, 2), gone: true }));
  const full = laid(`${prefix}h`, art(RED), have, 2.5, 2).map((piece) => ({ ...piece, gone: true }));
  const extra = laid(`${prefix}n`, art(RED), need, 2.5, 2, have).map((piece) => ({ ...piece, gone: true }));
  const top = sentence(prefix, [have, '+', BOX, '=', 10], STAGE);
  const bare = scene([...cells, ...full, ...extra, ...top], STAGE);
  const framed = set(bare, [...ids(`${prefix}c`, 10), ...ids(`${prefix}h`, have)], { gone: false });
  const filled = tally(calm(framed), ids(`${prefix}n`, need), 0, { gone: false });
  const done = relook(set(calm(filled.end), eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e2`, numeral(need));
  return [
    moment([{ number: have }, 'plus what equals', { number: 10 }, '?'], `${have} + ? = 10`, set(bare, eq(prefix, 0, 1, 2, 3, 4), { lit: true })),
    moment(['Think of a ten-frame, with', { number: have }, have === 1 ? 'box full.' : 'boxes full.'], `A ten-frame with ${have} full`, set(framed, ids(`${prefix}h`, have), { lit: true })),
    moment(['Fill the empty boxes, and count as you go.'], 'Fill the empty boxes and count.', set(framed, ids(`${prefix}c`, need, have), { lit: true })),
    ...filled.moments,
    moment([{ number: have }, ', plus', { number: need }, ', equals', { number: 10 }, '.'], `${have} + ${need} = 10`, done),
  ];
}

function makeTenWhy(question: Question): Moment[] {
  return frameTenMoments('w', num(question.facts, 'a'));
}

function makeTenTyped(): Lesson {
  const opening = frameTenMoments('x', 5);
  const small = frameTenMoments('y', 2);
  const one = turnQuestion('M-K-C8', 3, (f) => num(f, 'a') >= 6 && num(f, 'a') <= 8);
  const two = turnQuestion('M-K-C8', 3, (f) => num(f, 'a') >= 1 && num(f, 'a') <= 4 && num(f, 'a') !== 2);
  const fallback = scene([], STAGE);
  const start = first(opening, fallback);
  const pairs = add(calm(last(opening, fallback)), [
    { id: 'p0', look: text('9+1'), x: 0, y: 4.6, w: 2 },
    { id: 'p1', look: text('8+2'), x: 2, y: 4.6, w: 2 },
    { id: 'p2', look: text('7+3'), x: 4, y: 4.6, w: 2 },
    { id: 'p3', look: text('6+4'), x: 6, y: 4.6, w: 2 },
    { id: 'p4', look: text('5+5'), x: 8, y: 4.6, w: 2 },
  ]);
  const smallFrame = small[1]?.scene ?? fallback;
  return {
    parts: [
      show(moment(['You know how to fill a ten-frame to make ten.'], 'You can fill a ten-frame.', calm(opening[1]?.scene ?? start))),
      show(moment(['Now there is no frame to look at. There is only a number sentence.'], 'Only a number sentence.', calm(start))),
      ...opening.map(show),
      show(moment(['The number in the box is how many more make ten. Tap it on the number pad.'], 'The box is how many more.', set(calm(last(opening, fallback)), ['xe2'], { lit: true }))),
      show(moment(['These pairs all make ten.', { number: 9 }, 'and', { number: 1 }, '.', { number: 8 }, 'and', { number: 2 }, '.', { number: 7 }, 'and', { number: 3 }, '.', { number: 6 }, 'and', { number: 4 }, '.', { number: 5 }, 'and', { number: 5 }, '.'], '9+1, 8+2, 7+3, 6+4, 5+5', set(pairs, ['p0', 'p1', 'p2', 'p3', 'p4'], { lit: true }))),
      turn(one, makeTenWhy(one)),
      show(moment(['When the first number is small, many boxes are empty. Here', { number: 2 }, 'are full, and', { number: 8 }, 'are empty.'], '2 full, 8 empty', set(calm(smallFrame), ids('yc', 8, 2), { lit: true }))),
      turn(two, makeTenWhy(two)),
      show(moment(['Think of the ten-frame, and count the empty boxes.'], 'Think of the ten-frame.', calm(last(opening, fallback)))),
    ],
  };
}

// ---- C.9 Break apart numbers, level 3: 9 and 10 ----

function breakMoments(prefix: string, total: number, a: number): Moment[] {
  const b = total - a;
  const top = sentence(prefix, [total, '=', a, '+', BOX], STAGE);
  const start = scene([...top, ...laid(`${prefix}d`, art(BLUE), total, 2.5, 2)], STAGE);
  const reds = alter(start, (piece) => (ids(`${prefix}d`, a).includes(piece.id) ? { ...piece, look: art(RED), lit: true } : piece));
  const counted = tally(calm(reds), ids(`${prefix}d`, b, a));
  const done = relook(set(calm(counted.end), eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e4`, numeral(b));
  return [
    moment([{ number: total }, 'is', { number: a }, 'and what?'], `${total} = ${a} + ?`, set(start, eq(prefix, 0, 2), { lit: true })),
    moment(['Here are', { number: total }, 'dots, in rows of', { number: 5 }, '.'], `${total} dots`, set(start, ids(`${prefix}d`, total), { lit: true })),
    moment(['Make', { number: a }, 'of them red.'], `${a} red`, set(reds, [`${prefix}e2`], { lit: true })),
    moment(['The rest are blue. Count only the blue ones.'], 'Count only the blue ones.', set(calm(reds), ids(`${prefix}d`, b, a), { lit: true })),
    ...counted.moments,
    moment([{ number: total }, ', is', { number: a }, ', and', { number: b }, '.'], `${total} = ${a} + ${b}`, done),
  ];
}

function breakWhy(question: Question): Moment[] {
  return breakMoments('w', num(question.facts, 'total'), num(question.facts, 'a'));
}

function breakApartBig(): Lesson {
  const opening = breakMoments('x', 10, 6);
  const one = turnQuestion('M-K-C9', 3, (f) => num(f, 'total') === 9 && num(f, 'a') >= 2 && num(f, 'b') >= 2 && num(f, 'a') !== 6 && num(f, 'b') !== 4);
  const two = turnQuestion('M-K-C9', 3, (f) => num(f, 'total') === 10 && num(f, 'a') >= 2 && num(f, 'b') >= 2 && num(f, 'a') !== 6 && num(f, 'b') !== num(one.facts, 'b'));
  const fallback = scene([], STAGE);
  const start = first(opening, fallback);
  const end = last(opening, fallback);
  return {
    parts: [
      show(moment(['You know how to break a number into two parts.'], 'A number breaks into 2 parts.', calm(start))),
      show(moment(['Now the numbers are bigger. They are', { number: 9 }, 'and', { number: 10 }, '.'], 'Now with 9 and 10', set(calm(start), ['xe0'], { lit: true }))),
      ...opening.map(show),
      show(moment(['The missing number is the blue part. It is not the whole number.'], 'The missing number is the blue part.', set(calm(end), [...ids('xd', 4, 6), 'xe4'], { lit: true }))),
      show(moment(['Let us check.', { number: 6 }, 'red, and', { number: 4 }, 'blue, make', { number: 10 }, 'in all.'], '6 and 4 make 10.', set(calm(end), [...ids('xd', 10), 'xe0'], { lit: true }))),
      turn(one, breakWhy(one)),
      show(moment(['Count slowly. With big numbers it is easy to be one too many, or one too few.'], 'Count slowly. Touch each dot once.', set(calm(end), ids('xd', 4, 6), { lit: true }))),
      turn(two, breakWhy(two)),
      show(moment(['Make the part you know, count the rest, and check that the two parts make the whole.'], 'Make one part. Count the rest. Check.', calm(end))),
    ],
  };
}

// ---- C.10 and C.11 Stories, level 3: no picture, typed ----

// An adding story with no picture: a dot is drawn for each thing, and all the dots are counted.
function storyAddMoments(prefix: string, facts: Record<string, unknown>): Moment[] {
  const kind = word(facts, 'story') ?? 'gets';
  const name = word(facts, 'name') ?? 'Sam';
  const of = thingOf(facts);
  const a = num(facts, 'a');
  const b = num(facts, 'b');
  const sum = a + b;
  const reds = laid(`${prefix}a`, art(RED), a, 3.5, 2).map((piece) => ({ ...piece, gone: true }));
  const blues = laid(`${prefix}b`, art(BLUE), b, 3.5, 2, a).map((piece) => ({ ...piece, gone: true }));
  const top = sentence(prefix, [a, '+', b, '=', sum], WIDE).map((piece) => ({ ...piece, gone: true }));
  const empty = scene([...reds, ...blues, ...top], WIDE);
  const firstDrawn = set(empty, ids(`${prefix}a`, a), { gone: false, lit: true });
  const secondDrawn = set(calm(firstDrawn), ids(`${prefix}b`, b), { gone: false, lit: true });
  const all = [...ids(`${prefix}a`, a), ...ids(`${prefix}b`, b)];
  const counted = tally(calm(secondDrawn), all);
  const done = set(counted.end, eq(prefix, 0, 1, 2, 3, 4), { gone: false, lit: true });
  const gets = kind === 'gets';
  return [
    moment(
      gets ? [`${name} has`, { number: a }, `${many(a, of)}. Draw`, { number: a }, `${dots(a)}.`] : [{ number: a }, `${many(a, of)} ${isAre(a)} on the table. Draw`, { number: a }, `${dots(a)}.`],
      gets ? `${name} has ${a}. Draw ${a} ${dots(a)}.` : `${a} on the table. Draw ${a} ${dots(a)}.`,
      firstDrawn,
    ),
    moment(
      gets ? [`${name} gets`, { number: b }, 'more. Draw', { number: b }, `more ${dots(b)}.`] : [{ number: b }, `more ${isAre(b)} in the box. Draw`, { number: b }, `more ${dots(b)}.`],
      gets ? `Gets ${b} more. Draw ${b} more.` : `${b} more in the box. Draw ${b} more.`,
      secondDrawn,
    ),
    moment([gets ? 'Getting more means we add. Count all the dots.' : 'In all means we add. Count all the dots.'], 'Add: count all the dots.', calm(secondDrawn)),
    ...counted.moments,
    moment([{ number: a }, ', plus', { number: b }, ', is', { number: sum }, '.'], `${a} + ${b} = ${sum}`, done),
  ];
}

// A take away story with no picture: a dot for each thing, the ones that go are crossed out, the rest are counted.
function storyAwayMoments(prefix: string, facts: Record<string, unknown>): Moment[] {
  const kind = word(facts, 'story') ?? 'givesAway';
  const name = word(facts, 'name') ?? 'Sam';
  const of = thingOf(facts);
  const a = num(facts, 'a');
  const b = num(facts, 'b');
  const words: AwayWords =
    kind === 'givesAway'
      ? {
          first: [`${name} has`, { number: a }, `${many(a, of)}. Draw`, { number: a }, `${dots(a)}.`],
          firstText: `${name} has ${a}. Draw ${a} ${dots(a)}.`,
          second: [`${name} gives away`, { number: b }, '. Giving away means take away. Cross out', { number: b }, '.'],
          secondText: `Gives away ${b}: cross out ${b}.`,
        }
      : {
          first: ['There', isAre(a), { number: a }, `${many(a, of)}. Draw`, { number: a }, `${dots(a)}.`],
          firstText: `${a} ${many(a, of)}. Draw ${a} ${dots(a)}.`,
          second: [`${name} takes`, { number: b }, '. Taking some means take away. Cross out', { number: b }, '.'],
          secondText: `Takes ${b}: cross out ${b}.`,
        };
  return awayMoments(prefix, a, b, art(DOT), words);
}

function additionStoriesTyped(): Lesson {
  const opening = storyAddMoments('x', { story: 'gets', name: 'Zoe', thing: 'balloon', a: 4, b: 3 });
  const one = turnQuestion('M-K-C10', 3, (f) => f.story === 'gets' && num(f, 'a') >= 2 && num(f, 'a') !== 4 && num(f, 'b') >= 2 && num(f, 'a') + num(f, 'b') <= 8 && num(f, 'a') + num(f, 'b') !== 7 && f.thing !== 'balloon');
  const two = turnQuestion('M-K-C10', 3, (f) => f.story === 'table' && num(f, 'a') >= 2 && num(f, 'b') >= 2 && num(f, 'a') + num(f, 'b') >= 6 && num(f, 'a') + num(f, 'b') !== num(one.facts, 'a') + num(one.facts, 'b') && f.thing !== one.facts.thing && f.thing !== 'balloon');
  const fallback = scene([], WIDE);
  const end = last(opening, fallback);
  const drawn = opening[1]?.scene ?? fallback;
  return {
    parts: [
      show(moment(['You know that getting more, or how many in all, means we add.'], 'Gets more or in all: add.', calm(drawn))),
      show(moment(['Now the story has no picture. So we draw our own dots.'], 'No picture: draw dots.', set(calm(drawn), [...ids('xa', 4), ...ids('xb', 3)], { gone: true }))),
      ...opening.map(show),
      show(moment(['Tap that number on the number pad.'], 'Tap the number.', set(calm(end), ['xe4'], { lit: true }))),
      turn(one, storyAddMoments('w', one.facts)),
      show(moment(['Listen for the two numbers in the story. Draw dots for the first, then for the second.'], 'Listen for the 2 numbers.', set(calm(end), ['xe0', 'xe2'], { lit: true }))),
      turn(two, storyAddMoments('w', two.facts)),
      show(moment(['Listen for the two numbers, draw the dots, and count them all.'], 'Listen. Draw dots. Count them all.', calm(end))),
    ],
  };
}

function subtractionStoriesTyped(): Lesson {
  const opening = storyAwayMoments('x', { story: 'takes', name: 'Max', thing: 'strawberry', a: 7, b: 3 });
  const one = turnQuestion('M-K-C11', 3, (f) => f.story === 'takes' && num(f, 'a') >= 5 && num(f, 'a') <= 9 && num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') >= 2 && num(f, 'a') !== 7 && f.thing !== 'strawberry');
  const two = turnQuestion('M-K-C11', 3, (f) => f.story === 'givesAway' && num(f, 'a') >= 5 && num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') >= 2 && num(f, 'a') !== num(one.facts, 'a') && f.thing !== one.facts.thing && f.thing !== 'strawberry');
  const fallback = scene([], STAGE);
  const start = first(opening, fallback);
  const end = last(opening, fallback);
  return {
    parts: [
      show(moment(['You know that giving away, or taking some, means take away.'], 'Gives away or takes: take away.', set(calm(start), ['xe1'], { lit: true }))),
      show(moment(['Now the story has no picture. So we draw our own dots.'], 'No picture: draw dots.', set(calm(start), ids('xp', 7), { lit: true }))),
      ...opening.map(show),
      show(moment(['Tap that number on the number pad.'], 'Tap the number.', set(calm(end), ['xe4'], { lit: true }))),
      turn(one, storyAwayMoments('w', one.facts)),
      show(moment(['The first number in the story is how many dots to draw. The second is how many to cross out.'], 'First number: draw. Second: cross out.', set(calm(end), ['xe0', 'xe2'], { lit: true }))),
      turn(two, storyAwayMoments('w', two.facts)),
      show(moment(['Draw the dots, cross out the ones that go, and count what is left.'], 'Draw. Cross out. Count what is left.', calm(end))),
    ],
  };
}

// ---- C.12 and C.13 Hops on a number line, level 3: typed, starting at or landing on zero ----

const LINE_COLS = 11;

function hopMoments(prefix: string, a: number, b: number, forward: boolean): Moment[] {
  const end = forward ? a + b : a - b;
  const line: Piece[] = Array.from({ length: 11 }, (_, n) => ({ id: `${prefix}n${n}`, look: numeral(n), x: n, y: 3 }));
  const top = sentence(prefix, [a, forward ? '+' : MINUS, b, '=', BOX], LINE_COLS);
  const start = scene([...top, ...line, { id: `${prefix}frog`, look: art(FROG), x: a, y: 2 }], LINE_COLS);
  const atStart = set(start, [`${prefix}n${a}`, `${prefix}frog`, `${prefix}e0`], { lit: true });
  let now = calm(set(atStart, [`${prefix}n${a}`], { lit: true }));
  const hops: Moment[] = [];
  for (let hop = 1; hop <= b; hop += 1) {
    const at = forward ? a + hop : a - hop;
    now = alter(now, (piece) => {
      if (piece.id === `${prefix}frog`) return { ...piece, x: at };
      if (piece.id === `${prefix}n${at}`) return { ...piece, lit: true, badge: String(hop) };
      return piece.badge ? { ...piece, badge: undefined } : piece;
    });
    hops.push(moment([{ number: at }], String(at), now));
  }
  const landed = set(now, [`${prefix}frog`, `${prefix}n${end}`], { lit: true });
  const done = relook(set(calm(landed), [...eq(prefix, 0, 2, 4), `${prefix}n${end}`, `${prefix}frog`], { lit: true }), `${prefix}e4`, numeral(end));
  return [
    moment([{ number: a }, forward ? 'plus' : 'take away', { number: b }, '. Start at', { number: a }, '.'], `Start at ${a}.`, atStart),
    moment([forward ? 'Hop forward' : 'Hop back', { number: b }, b === 1 ? 'time. Say the number you land on.' : 'times. Say each number you land on.'], `Hop ${forward ? 'forward' : 'back'} ${b}.`, set(calm(atStart), [`${prefix}e1`, `${prefix}e2`, `${prefix}frog`], { lit: true })),
    ...hops,
    moment(['We land on', { number: end }, '.'], `Land on ${end}.`, landed),
    moment([{ number: a }, forward ? ', plus' : ', take away', { number: b }, ', equals', { number: end }, '.'], `${a} ${forward ? '+' : MINUS} ${b} = ${end}`, done),
  ];
}

const hopWhy = (forward: boolean) => (question: Question): Moment[] => hopMoments('w', num(question.facts, 'a'), num(question.facts, 'b'), forward);

function addOnLineTyped(): Lesson {
  const opening = hopMoments('x', 6, 3, true);
  const fromZero = hopMoments('y', 0, 4, true);
  const one = turnQuestion('M-K-C12', 3, (f) => num(f, 'a') >= 2 && num(f, 'b') >= 2 && num(f, 'b') <= 5 && num(f, 'a') + num(f, 'b') >= 6 && num(f, 'a') !== 6);
  const two = turnQuestion('M-K-C12', 3, (f) => num(f, 'a') === 0 && num(f, 'b') >= 2 && num(f, 'b') !== 4);
  const fallback = scene([], LINE_COLS);
  const start = first(opening, fallback);
  const end = last(opening, fallback);
  return {
    parts: [
      show(moment(['You know that adding is hopping forward on a number line.'], 'Adding: hop forward.', calm(start))),
      show(moment(['Now there are no answers to pick from. You tap the number you land on.'], 'Tap the number you land on.', set(calm(start), ['xe4'], { lit: true }))),
      ...opening.map(show),
      show(moment(['Be careful. The start is not a hop. The first hop lands on the next number.'], 'The start is not a hop.', opening[2]?.scene ?? end)),
      turn(one, hopWhy(true)(one)),
      show(moment(['Sometimes we start at zero, the very beginning of the line.'], 'Start at 0.', set(calm(first(fromZero, fallback)), ['yn0', 'yfrog'], { lit: true }))),
      ...fromZero.map(show),
      turn(two, hopWhy(true)(two)),
      show(moment(['Start at the first number, hop forward, and tap where you land.'], 'Start. Hop forward. Tap where you land.', calm(end))),
    ],
  };
}

function takeAwayOnLineTyped(): Lesson {
  const opening = hopMoments('x', 9, 4, false);
  const toZero = hopMoments('y', 3, 3, false);
  const one = turnQuestion('M-K-C13', 3, (f) => num(f, 'a') >= 6 && num(f, 'b') >= 2 && num(f, 'b') <= 5 && num(f, 'a') - num(f, 'b') >= 1 && num(f, 'a') !== 9);
  const two = turnQuestion('M-K-C13', 3, (f) => num(f, 'a') === num(f, 'b') && num(f, 'a') !== 3 && num(f, 'a') <= 6);
  const fallback = scene([], LINE_COLS);
  const start = first(opening, fallback);
  const end = last(opening, fallback);
  return {
    parts: [
      show(moment(['You know that taking away is hopping back on a number line.'], 'Take away: hop back.', calm(start))),
      show(moment(['Now there are no answers to pick from. You tap the number you land on.'], 'Tap the number you land on.', set(calm(start), ['xe4'], { lit: true }))),
      ...opening.map(show),
      show(moment(['Be careful. The start is not a hop. The first hop back lands on the number before.'], 'The start is not a hop.', opening[2]?.scene ?? end)),
      turn(one, hopWhy(false)(one)),
      show(moment(['Sometimes we hop all the way back to zero.'], 'Hop back to 0.', set(calm(first(toZero, fallback)), ['yn0'], { lit: true }))),
      ...toZero.map(show),
      show(moment(['Taking away every one lands on zero.'], 'Take away every one: 0.', set(calm(last(toZero, fallback)), ['yn0', 'yfrog', 'ye4'], { lit: true }))),
      turn(two, hopWhy(false)(two)),
      show(moment(['Start at the first number, hop back, and tap where you land.'], 'Start. Hop back. Tap where you land.', calm(end))),
    ],
  };
}

// ---- C.14 Plus or take away, level 3: a number sentence with numbers to 10 ----

// Compare the first number with the last: bigger means plus, smaller means take away. Dots show the change.
function compareMoments(prefix: string, a: number, b: number, plus: boolean): Moment[] {
  const result = plus ? a + b : a - b;
  const top = sentence(prefix, [a, BOX, b, '=', result], STAGE);
  const group = laid(`${prefix}p`, art(DOT), a, 2.5, 2);
  const more = plus ? laid(`${prefix}m`, art(DOT), b, 2.5, 2, a).map((piece) => ({ ...piece, gone: true })) : [];
  const start = scene([...top, ...group, ...more], STAGE);
  const changed = plus ? set(start, [...ids(`${prefix}m`, b), `${prefix}e4`], { gone: false, lit: true }) : set(start, [...ids(`${prefix}p`, b, a - b), `${prefix}e4`], { crossed: true, lit: true });
  // The last number is lit, never crossed out.
  const shownChange = alter(changed, (piece) => (piece.id === `${prefix}e4` ? { ...piece, crossed: undefined } : piece));
  const signed = relook(set(calm(shownChange), [`${prefix}e1`], { lit: true }), `${prefix}e1`, text(plus ? '+' : MINUS));
  return [
    moment(['Look at the first number,', { number: a }, '.'], `First: ${a}`, set(start, [...ids(`${prefix}p`, a), `${prefix}e0`], { lit: true })),
    moment(['Now look at the last number,', { number: result }, '.'], `Last: ${result}`, set(start, [`${prefix}e4`], { lit: true })),
    moment(plus ? [{ number: result }, 'is bigger than', { number: a }, '. The group got bigger.'] : [{ number: result }, 'is smaller than', { number: a }, '. The group got smaller.'], plus ? `${result} is bigger than ${a}.` : `${result} is smaller than ${a}.`, shownChange),
    moment(plus ? ['Bigger means the sign is plus.'] : ['Smaller means the sign is take away.'], plus ? 'Bigger: +' : `Smaller: ${MINUS}`, signed),
    moment([{ number: a }, plus ? ', plus' : ', take away', { number: b }, ', equals', { number: result }, '.'], `${a} ${plus ? '+' : MINUS} ${b} = ${result}`, set(calm(signed), eq(prefix, 0, 1, 2, 3, 4), { lit: true })),
  ];
}

const isPlus = (f: Record<string, unknown>): boolean => num(f, 'result') === num(f, 'a') + num(f, 'b');

function signWhy(question: Question): Moment[] {
  return compareMoments('w', num(question.facts, 'a'), num(question.facts, 'b'), isPlus(question.facts));
}

function plusOrTakeAwayBig(): Lesson {
  const joined = compareMoments('x', 6, 3, true);
  const taken = compareMoments('y', 8, 5, false);
  const one = turnQuestion('M-K-C14', 3, (f) => !isPlus(f) && num(f, 'a') >= 7 && num(f, 'b') >= 2 && !(num(f, 'a') === 8 && num(f, 'b') === 5));
  const two = turnQuestion('M-K-C14', 3, (f) => isPlus(f) && num(f, 'result') >= 7 && num(f, 'a') >= 3 && num(f, 'b') >= 2 && !(num(f, 'a') === 6 && num(f, 'b') === 3));
  const fallback = scene([], STAGE);
  const start = first(joined, fallback);
  return {
    parts: [
      show(moment(['You know that plus makes a group bigger, and take away makes it smaller.'], 'Plus: bigger. Take away: smaller.', calm(start))),
      show(moment(['Now there is no picture, and the numbers go up to ten. The sign is missing.'], 'Which sign is missing?', set(calm(start), ['xe1'], { lit: true }))),
      ...joined.map(show),
      show(moment(['Here is another one.'], 'Another one', calm(first(taken, fallback)))),
      ...taken.map(show),
      turn(one, signWhy(one)),
      show(moment(['You do not need to count. Just ask, is the last number bigger or smaller than the first number?'], 'Is the last number bigger or smaller than the first?', set(calm(last(taken, fallback)), ['ye0', 'ye4'], { lit: true }))),
      turn(two, signWhy(two)),
      show(moment(['Last number bigger? Plus. Last number smaller? Take away.'], `Bigger: +. Smaller: ${MINUS}.`, calm(last(taken, fallback)))),
    ],
  };
}

// ---- C.15 and C.16 level 3: which picture shows the number sentence? ----

interface Offered {
  x: number;
  y: number;
  visual: Visual;
}

// The pictures as the questions draw them.
const plusPicture = (one: Thing, two: Thing, x: number, y: number): Visual => ({ kind: 'emojiGroup', emoji: one.emoji, count: x, emoji2: two.emoji, count2: y, layout: x + y <= 6 ? 'row' : 'grid5' });
const awayPicture = (one: Thing, x: number, y: number): Visual => ({ kind: 'emojiGroup', emoji: one.emoji, count: x, layout: x <= 5 ? 'row' : 'grid5', crossed: y });

// The sentence on top and the three pictures below. Each picture is checked against both numbers, left to right,
// and the one that matches is left lit at the end.
function findPictureMoments(prefix: string, plus: boolean, a: number, b: number, one: Thing, two: Thing, offered: Offered[], answerIndex: number): Moment[] {
  const label: Piece = { id: `${prefix}s`, look: text(`${a} ${plus ? '+' : MINUS} ${b}`), x: 4, y: 0.2, w: 4, h: 1.2 };
  const pics: Piece[] = offered.map((each, i) => ({ id: `${prefix}o${i}`, look: picture(each.visual), x: 0.2 + i * 3.9, y: 2, w: 3.8, h: 2.6, gone: true }));
  const picIds = pics.map((piece) => piece.id);
  const alone = scene([label, ...pics], WIDE);
  const out = set(alone, picIds, { gone: false });
  const only = (i: number): Scene => alter(out, (piece) => (piece.id === `${prefix}o${i}` ? { ...piece, lit: true } : piece.id === label.id ? piece : { ...piece, dim: true }));
  const holds = (each: Offered): Say => (plus ? ['This one has', { number: each.x }, `${many(each.x, one)}, and`, { number: each.y }, `${many(each.y, two)}.`] : ['This one has', { number: each.x }, `${many(each.x, one)}, with`, { number: each.y }, 'crossed out.']);
  const sign: Say = [{ number: a }, plus ? 'plus' : 'take away', { number: b }];
  return [
    moment(['The sentence says,', ...sign, '.'], `${a} ${plus ? '+' : MINUS} ${b}`, set(alone, [label.id], { lit: true })),
    moment(
      plus ? ['So we need', { number: a }, `${many(a, one)}, and`, { number: b }, `${many(b, two)}.`] : ['So we need', { number: a }, `${many(a, one)} in all, with`, { number: b }, 'crossed out.'],
      plus ? `We need ${a} and ${b}.` : `We need ${a}, with ${b} crossed out.`,
      out,
    ),
    ...offered.map((each, i) => {
      const fits = i === answerIndex;
      return moment([...holds(each), fits ? 'Both numbers match.' : 'That does not match.'], `${each.x} ${plus ? 'and' : 'with'} ${each.y}${plus ? '' : ' crossed out'}: ${fits ? 'yes' : 'no'}`, only(i));
    }),
    moment(['So this is the picture for', ...sign, '.'], `This picture shows ${a} ${plus ? '+' : MINUS} ${b}.`, set(only(answerIndex), [label.id], { lit: true })),
  ];
}

function findPictureWhy(question: Question): Moment[] {
  if (question.type !== 'choice') throw new Error('A picture question is a choice');
  const plus = question.facts.op !== '-';
  const named = Array.isArray(question.facts.options) ? question.facts.options : [];
  const offered = question.options.map((visual, i): Offered => {
    const parts = String(named[i] ?? '').split(' ');
    return { x: Number(parts[0]), y: Number(parts[2]), visual };
  });
  return findPictureMoments('w', plus, num(question.facts, 'a'), num(question.facts, 'b'), thingOf(question.facts, 'one'), thingOf(question.facts, 'two', 'banana'), offered, question.answerIndex);
}

const asksPicture = (f: Record<string, unknown>): boolean => f.ask === 'picture';

function additionPictures(): Lesson {
  const duck = thing('duck');
  const frog = thing('frog');
  const offered: Offered[] = [
    { x: 3, y: 4, visual: plusPicture(duck, frog, 3, 4) },
    { x: 2, y: 4, visual: plusPicture(duck, frog, 2, 4) },
    { x: 2, y: 3, visual: plusPicture(duck, frog, 2, 3) },
  ];
  const opening = findPictureMoments('x', true, 2, 4, duck, frog, offered, 1);
  const one = turnQuestion('M-K-C15', 3, (f) => asksPicture(f) && num(f, 'a') >= 3 && num(f, 'a') + num(f, 'b') <= 5 && f.one !== 'duck' && f.two !== 'frog');
  const two = turnQuestion('M-K-C15', 3, (f) => asksPicture(f) && num(f, 'a') >= 3 && num(f, 'b') >= 2 && num(f, 'b') !== 4 && num(f, 'a') + num(f, 'b') >= 7 && f.one !== 'duck' && f.one !== one.facts.one);
  const fallback = scene([], WIDE);
  const end = last(opening, fallback);
  const out = opening[1]?.scene ?? fallback;
  return {
    parts: [
      show(moment(['You know how to tell a picture as a plus sentence.'], 'A picture can be a plus sentence.', alter(out, (piece) => (piece.id === 'xo1' ? { ...piece, lit: true } : piece.id === 'xs' ? piece : { ...piece, gone: true })))),
      show(moment(['Now we go the other way. We read the sentence, and find its picture.'], 'Read the sentence. Find its picture.', calm(out))),
      ...opening.map(show),
      show(moment(['The first number is the first group. The second number is the second group.'], 'First number: first group. Second number: second group.', set(calm(end), ['xs', 'xo1'], { lit: true }))),
      turn(one, findPictureWhy(one)),
      show(moment(['Be careful. A picture can have one number right, and the other number wrong. Check both groups.'], 'Check both groups.', alter(out, (piece) => (piece.id === 'xo0' ? { ...piece, lit: true } : piece.id === 'xs' ? piece : { ...piece, dim: true })))),
      turn(two, findPictureWhy(two)),
      show(moment(['Read the sentence, count both groups, and pick the picture where both match.'], 'Both numbers must match.', calm(end))),
    ],
  };
}

function subtractionPictures(): Lesson {
  const star = thing('star');
  const offered: Offered[] = [
    { x: 6, y: 3, visual: awayPicture(star, 6, 3) },
    { x: 5, y: 2, visual: awayPicture(star, 5, 2) },
    { x: 6, y: 2, visual: awayPicture(star, 6, 2) },
  ];
  const opening = findPictureMoments('x', false, 6, 2, star, star, offered, 2);
  const one = turnQuestion('M-K-C16', 3, (f) => asksPicture(f) && num(f, 'a') >= 3 && num(f, 'a') <= 5 && f.one !== 'star');
  const two = turnQuestion('M-K-C16', 3, (f) => asksPicture(f) && num(f, 'a') >= 7 && num(f, 'b') >= 3 && f.one !== 'star' && f.one !== one.facts.one);
  const fallback = scene([], WIDE);
  const end = last(opening, fallback);
  const out = opening[1]?.scene ?? fallback;
  return {
    parts: [
      show(moment(['You know how to tell a picture as a take away sentence.'], 'A picture can be a take away sentence.', alter(out, (piece) => (piece.id === 'xo2' ? { ...piece, lit: true } : piece.id === 'xs' ? piece : { ...piece, gone: true })))),
      show(moment(['Now we go the other way. We read the sentence, and find its picture.'], 'Read the sentence. Find its picture.', calm(out))),
      ...opening.map(show),
      show(moment(['The first number is all of them, crossed out ones too. The second number is how many are crossed out.'], 'First number: all. Second number: crossed out.', set(calm(end), ['xs', 'xo2'], { lit: true }))),
      turn(one, findPictureWhy(one)),
      show(moment(['Be careful. A picture can have the right number crossed out, but the wrong number in all. Check both.'], 'Check both numbers.', alter(out, (piece) => (piece.id === 'xo1' ? { ...piece, lit: true } : piece.id === 'xs' ? piece : { ...piece, dim: true })))),
      turn(two, findPictureWhy(two)),
      show(moment(['Count them all, count the crossed out ones, and pick the picture where both match.'], 'Both numbers must match.', calm(end))),
    ],
  };
}

// ---- C.17 Make 5, level 3: only a number sentence, the box first or second, from 0 to 5 ----

// A frame of five with `known` full. The empty boxes are filled and counted; none empty means zero more.
function fiveMoments(prefix: string, known: number, boxFirst: boolean): Moment[] {
  const need = 5 - known;
  const boxAt = boxFirst ? 0 : 2;
  const knownAt = boxFirst ? 2 : 0;
  const cells: Piece[] = Array.from({ length: 5 }, (_, i) => ({ id: `${prefix}c${i}`, look: { kind: 'cell' as const }, ...spot(i, 2.5, 2) }));
  const full = laid(`${prefix}h`, art(DOT), known, 2.5, 2);
  const extra = laid(`${prefix}n`, art(DOT), need, 2.5, 2, known).map((piece) => ({ ...piece, gone: true }));
  const top = sentence(prefix, boxFirst ? [BOX, '+', known, '=', 5] : [known, '+', BOX, '=', 5], STAGE);
  const start = scene([...cells, ...full, ...extra, ...top], STAGE);
  const filled = tally(calm(start), ids(`${prefix}n`, need), 0, { gone: false });
  const done = relook(set(calm(filled.end), eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e${boxAt}`, numeral(need));
  return [
    moment(boxFirst ? ['What plus', { number: known }, 'equals', { number: 5 }, '?'] : [{ number: known }, 'plus what equals', { number: 5 }, '?'], boxFirst ? `? + ${known} = 5` : `${known} + ? = 5`, set(start, eq(prefix, 0, 1, 2, 3, 4), { lit: true })),
    known === 0
      ? moment(['Zero means none. All', { number: 5 }, 'boxes are empty.'], '0 full, 5 empty', set(start, [...ids(`${prefix}c`, 5), `${prefix}e${knownAt}`], { lit: true }))
      : moment(['Here are', { number: 5 }, 'boxes.', { number: known }, known === 1 ? 'is full.' : 'are full.'], `5 boxes, ${known} full`, set(start, [...ids(`${prefix}h`, known), `${prefix}e${knownAt}`], { lit: true })),
    ...(need === 0
      ? [moment(['Every box is full. We need no more.'], 'Full: no more needed.', set(start, [`${prefix}e${boxAt}`], { lit: true }))]
      : [moment(['Fill the empty boxes, and count as you go.'], 'Fill the empty boxes and count.', set(start, ids(`${prefix}c`, need, known), { lit: true })), ...filled.moments]),
    boxFirst
      ? moment([{ number: need }, ', plus', { number: known }, ', equals', { number: 5 }, '.'], `${need} + ${known} = 5`, done)
      : moment([{ number: known }, ', plus', { number: need }, ', equals', { number: 5 }, '.'], `${known} + ${need} = 5`, done),
  ];
}

const boxIsFirst = (f: Record<string, unknown>): boolean => f.blank === 'a';
const knownPart = (f: Record<string, unknown>): number => (boxIsFirst(f) ? num(f, 'b') : num(f, 'a'));

function makeFiveWhy(question: Question): Moment[] {
  return fiveMoments('w', knownPart(question.facts), boxIsFirst(question.facts));
}

function makeFiveTyped(): Lesson {
  const opening = fiveMoments('x', 2, true);
  const fullFrame = fiveMoments('y', 5, false);
  const noneFull = fiveMoments('z', 0, false)[1]?.scene ?? scene([], STAGE);
  const one = turnQuestion('M-K-C17', 3, (f) => boxIsFirst(f) && knownPart(f) >= 1 && knownPart(f) <= 4 && knownPart(f) !== 2);
  const two = turnQuestion('M-K-C17', 3, (f) => knownPart(f) === 0);
  const fallback = scene([], STAGE);
  const start = first(opening, fallback);
  const end = last(opening, fallback);
  return {
    parts: [
      show(moment(['You know how to count the empty places, to make five.'], 'Count the empty places to make 5.', set(calm(start), ids('xc', 3, 2), { lit: true }))),
      show(moment(['Now there is only a number sentence. And the box can come first.'], 'The box can come first.', set(calm(start), ['xe0'], { lit: true }))),
      ...opening.map(show),
      show(moment(['First or second, the box is the part that is missing. Tap it on the number pad.'], 'The box is the missing part.', set(calm(end), ['xe0'], { lit: true }))),
      turn(one, makeFiveWhy(one)),
      show(moment(['Sometimes the number we have is five already.'], 'What if we have 5 already?', calm(first(fullFrame, fallback)))),
      ...fullFrame.map(show),
      show(moment(['No more is zero. So zero goes in the box.'], 'No more is 0.', set(calm(last(fullFrame, fallback)), ['ye2'], { lit: true }))),
      show(moment(['And when we have zero, all', { number: 5 }, 'boxes are empty. Then we need', { number: 5 }, '.'], '0 full: we need 5.', noneFull)),
      turn(two, makeFiveWhy(two)),
      show(moment(['Think of five boxes. The empty ones are the missing number.'], 'The empty boxes are the missing number.', calm(end))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-K-C2': addTo5Typed,
  'M-K-C4': addTo10Typed,
  'M-K-C6': subtractTo5Typed,
  'M-K-C7': subtractTo10Typed,
  'M-K-C8': makeTenTyped,
  'M-K-C9': breakApartBig,
  'M-K-C10': additionStoriesTyped,
  'M-K-C11': subtractionStoriesTyped,
  'M-K-C12': addOnLineTyped,
  'M-K-C13': takeAwayOnLineTyped,
  'M-K-C14': plusOrTakeAwayBig,
  'M-K-C15': additionPictures,
  'M-K-C16': subtractionPictures,
  'M-K-C17': makeFiveTyped,
};
