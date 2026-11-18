import { COUNTABLES } from '../../content/data/countables';
import type { Question, Say } from '../../engine/types';
import { add, alter, art, calm, ids, moment, num, numeral, pointAt, scene, set, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, PieceLook, Scene } from '../types';

// Kindergarten Math lessons, category C: adding and taking away (plan section 16).

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
// Unlike countAlong it keeps what is already lit, and `change` can also make each piece appear or cross it out.
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

// ---- Joining two groups: C.3 and the adding stories ----

const JOIN_COLS = 12;

interface JoinWords {
  first: Say;
  firstText: string;
  second: Say;
  secondText: string;
}

// Two groups apart with a plus between them; the second slides over to join the first, and all are counted.
function joinMoments(prefix: string, a: number, b: number, of: Thing, words: JoinWords, sumWord = 'plus'): Moment[] {
  const sum = a + b;
  const left = laid(`${prefix}a`, art(of.emoji), a, 0.5, 2);
  const right = laid(`${prefix}b`, art(of.emoji), b, 6.5, 2);
  const apart = scene([...left, { id: `${prefix}plus`, look: text('+'), x: 5.5, y: 2 }, ...right], JOIN_COLS);
  const together = alter(apart, (piece) => {
    if (piece.id === `${prefix}plus`) return { ...piece, gone: true };
    const fromB = piece.id.startsWith(`${prefix}b`);
    const index = Number(piece.id.slice(prefix.length + 1)) + (fromB ? a : 0);
    return { ...piece, ...spot(index, 3.5, 2) };
  });
  const all = [...ids(`${prefix}a`, a), ...ids(`${prefix}b`, b)];
  const counted = tally(together, all);
  const done = add(counted.end, sentence(prefix, [a, '+', b, '=', sum], JOIN_COLS));
  return [
    moment(words.first, words.firstText, set(apart, ids(`${prefix}a`, a), { lit: true })),
    moment(words.second, words.secondText, set(calm(apart), ids(`${prefix}b`, b), { lit: true })),
    moment(['Let us push them together.'], 'Push them together.', calm(together)),
    moment(['Now count them all.'], 'Count them all.', calm(together)),
    ...counted.moments,
    moment([{ number: a }, `, ${sumWord}`, { number: b }, ', is', { number: sum }, '.'], `${a} + ${b} = ${sum}`, done),
  ];
}

const picturesWords = (a: number, b: number, of: Thing): JoinWords => ({
  first: ['Here', isAre(a), { number: a }, `${many(a, of)}.`],
  firstText: `${a} ${many(a, of)}`,
  second: ['And here', isAre(b), { number: b }, 'more.'],
  secondText: `${b} more`,
});

// ---- C.3 Add with pictures to 10 ----

function picturesWhy(question: Question): Moment[] {
  const a = num(question.facts, 'a');
  const b = num(question.facts, 'b');
  const of = thingOf(question.facts);
  return joinMoments('w', a, b, of, picturesWords(a, b, of));
}

function addPictures10(): Lesson {
  const star = thing('star');
  const opening = joinMoments('x', 4, 3, star, picturesWords(4, 3, star));
  const first = turnQuestion('M-K-C3', 1, (f) => num(f, 'a') + num(f, 'b') <= 6 && num(f, 'a') >= 2 && num(f, 'b') >= 2);
  const second = turnQuestion('M-K-C3', 2, (f) => num(f, 'a') + num(f, 'b') >= 8 && f.thing !== first.facts.thing);
  const end = last(opening, scene([], JOIN_COLS));
  return {
    parts: [
      show(moment(['To add, we put two groups together, and find how many in all.'], 'Adding puts groups together.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['Rows of five make a big group easy to count.'], 'Rows of 5 are easy to count.', calm(end))),
      turn(first, picturesWhy(first)),
      turn(second, picturesWhy(second)),
      show(moment(['Push the groups together, and count them all. The last number tells how many.'], 'Push together and count them all.', calm(end))),
    ],
  };
}

// ---- Counting on: C.2 and C.4 ----

const ON_COLS = 12;

// The sum on top, and below it the bigger group in red with the smaller in blue after it.
// Start at the bigger number and count on the smaller one.
function countOnMoments(prefix: string, a: number, b: number): Moment[] {
  const sum = a + b;
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const bigAt = a >= b ? 0 : 2; // where the bigger number sits in the sentence
  const top = sentence(prefix, [a, '+', b, '=', BOX], ON_COLS);
  const reds = laid(`${prefix}r`, art(RED), big, 3.5, 2);
  const blues = laid(`${prefix}u`, art(BLUE), small, 3.5, 2, big);
  const start = scene([...top, ...reds, ...blues], ON_COLS);
  const fromBig = set(start, [...eq(prefix, bigAt), ...ids(`${prefix}r`, big)], { lit: true });
  const withBadge = alter(fromBig, (piece) => (piece.id === `${prefix}r${big - 1}` ? { ...piece, badge: String(big) } : piece));
  const counted = tally(calm(set(withBadge, [`${prefix}e${2 - bigAt}`], { lit: true })), ids(`${prefix}u`, small), big, {});
  const done = relook(set(counted.end, eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e4`, numeral(sum));
  return [
    moment([{ number: a }, 'plus', { number: b }, '. How many is that?'], `${a} + ${b} = ?`, set(start, eq(prefix, 0, 1, 2), { lit: true })),
    moment([a === b ? 'Start with' : 'Start with the bigger number,', { number: big }, '. Keep it in your head.'], `Start with ${big}.`, withBadge),
    moment(['Now count on', { number: small }, 'more.'], `Count on ${small} more.`, set(calm(start), [`${prefix}e${2 - bigAt}`, ...ids(`${prefix}u`, small)], { lit: true })),
    ...counted.moments,
    moment([{ number: a }, ', plus', { number: b }, ', equals', { number: sum }, '.'], `${a} + ${b} = ${sum}`, done),
  ];
}

// Plus zero: none more, so the number stays the same.
function zeroPlusMoments(prefix: string, a: number, b: number): Moment[] {
  const n = a + b;
  const top = sentence(prefix, [a, '+', b, '=', BOX], ON_COLS);
  const start = scene([...top, ...laid(`${prefix}r`, art(RED), n, 3.5, 2)], ON_COLS);
  const zeroAt = a === 0 ? 0 : 2;
  return [
    moment([{ number: a }, 'plus', { number: b }, '. How many is that?'], `${a} + ${b} = ?`, set(start, eq(prefix, 0, 1, 2), { lit: true })),
    moment(['Zero means none. Plus zero adds no more.'], '0 means none.', set(start, eq(prefix, zeroAt), { lit: true })),
    moment(['So we still have', { number: n }, '.'], `Still ${n}`, set(start, ids(`${prefix}r`, n), { lit: true })),
    moment([{ number: a }, ', plus', { number: b }, ', equals', { number: n }, '.'], `${a} + ${b} = ${n}`, relook(set(start, eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e4`, numeral(n))),
  ];
}

function plusWhy(question: Question): Moment[] {
  const a = num(question.facts, 'a');
  const b = num(question.facts, 'b');
  return a === 0 || b === 0 ? zeroPlusMoments('w', a, b) : countOnMoments('w', a, b);
}

function addTo5(): Lesson {
  const opening = countOnMoments('x', 3, 2);
  const zero = zeroPlusMoments('y', 4, 0);
  const first = turnQuestion('M-K-C2', 1, (f) => num(f, 'a') >= 1 && num(f, 'b') >= 1 && num(f, 'a') + num(f, 'b') >= 4 && num(f, 'a') !== 3);
  const second = turnQuestion('M-K-C2', 2, (f) => num(f, 'a') === 0 && num(f, 'b') >= 2);
  const end = last(opening, scene([], ON_COLS));
  return {
    parts: [
      show(moment(['Let us learn a quick way to add: counting on.'], 'Add by counting on.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['We do not count the big group again. We just count on.'], 'Start at the big number. Count on.', calm(end))),
      turn(first, plusWhy(first)),
      ...zero.map(show),
      turn(second, plusWhy(second)),
      show(moment(['Start with the bigger number, and count on the rest.'], 'Start big, count on.', calm(end))),
    ],
  };
}

function addTo10(): Lesson {
  const opening = countOnMoments('x', 5, 3);
  const flipped = countOnMoments('y', 2, 6);
  const first = turnQuestion('M-K-C4', 1, (f) => num(f, 'a') > num(f, 'b') && num(f, 'b') >= 2 && num(f, 'a') + num(f, 'b') >= 5);
  const second = turnQuestion('M-K-C4', 2, (f) => num(f, 'a') < num(f, 'b') && num(f, 'a') >= 2 && num(f, 'a') + num(f, 'b') >= 8);
  const end = last(opening, scene([], ON_COLS));
  return {
    parts: [
      show(moment(['Let us add by counting on from the bigger number.'], 'Count on from the bigger number.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      turn(first, plusWhy(first)),
      show(moment(['Sometimes the bigger number comes second. We still start with it.'], 'Start with the bigger one, wherever it is.', calm(flipped[0]?.scene ?? end))),
      ...flipped.map(show),
      turn(second, plusWhy(second)),
      show(moment(['Start with the bigger number, and count on the smaller one.'], 'Start big, count on.', calm(last(flipped, end)))),
    ],
  };
}

// ---- Taking away: C.5, C.6, C.7 and the take away stories ----

const AWAY_COLS = 10;

interface AwayWords {
  first: Say;
  firstText: string;
  second: Say;
  secondText: string;
}

const awayWords = (a: number, b: number): AwayWords => ({
  first: ['Start with', { number: a }, '.'],
  firstText: `Start with ${a}.`,
  second: b === 0 ? ['Take away zero. That means none go away.'] : ['Take away', { number: b }, '. Cross them out, one at a time.'],
  secondText: b === 0 ? 'Take away 0: none go.' : `Take away ${b}.`,
});

// A group of a, the last b crossed out one by one, then the ones left counted.
function awayMoments(prefix: string, a: number, b: number, look: PieceLook, words: AwayWords = awayWords(a, b)): Moment[] {
  const left = a - b;
  const top = sentence(prefix, [a, MINUS, b, '=', BOX], AWAY_COLS);
  const start = scene([...top, ...laid(`${prefix}p`, look, a, 2.5, 2)], AWAY_COLS);
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
      : [moment([b === 0 ? 'Count them. They are all still here.' : 'Now count the ones that are left.'], 'Count the ones left.', calm(crossing.end)), ...counted.moments]),
    moment([{ number: a }, ', take away', { number: b }, ', is', { number: left }, '.'], `${a} ${MINUS} ${b} = ${left}`, done),
  ];
}

function picturesAwayWhy(question: Question): Moment[] {
  const of = thingOf(question.facts);
  return awayMoments('w', num(question.facts, 'a'), num(question.facts, 'b'), art(of.emoji));
}

function dotsAwayWhy(question: Question): Moment[] {
  return awayMoments('w', num(question.facts, 'a'), num(question.facts, 'b'), art(DOT));
}

function subtractPictures5(): Lesson {
  const apple = thing('apple');
  const opening = awayMoments('x', 5, 2, art(apple.emoji), {
    first: ['Here are', { number: 5 }, 'apples.'],
    firstText: '5 apples',
    second: ['We eat', { number: 2 }, '. A cross means that one is gone.'],
    secondText: 'Eat 2. Cross them out.',
  });
  const first = turnQuestion('M-K-C5', 1, (f) => num(f, 'a') === 3 && f.thing !== 'apple');
  const second = turnQuestion('M-K-C5', 2, (f) => num(f, 'b') >= 2 && f.thing !== first.facts.thing && f.thing !== 'apple');
  const end = last(opening, scene([], AWAY_COLS));
  return {
    parts: [
      show(moment(['Taking away makes a group smaller. Let us see how.'], 'Taking away makes a group smaller.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['The crossed out ones are gone. We count only the ones left.'], 'Count only the ones left.', calm(end))),
      turn(first, picturesAwayWhy(first)),
      turn(second, picturesAwayWhy(second)),
      show(moment(['Cross out the ones taken away, then count what is left.'], 'Cross out, then count what is left.', calm(end))),
    ],
  };
}

function subtractTo5(): Lesson {
  const opening = awayMoments('x', 5, 2, art(DOT));
  const zero = awayMoments('y', 3, 0, art(DOT));
  const first = turnQuestion('M-K-C6', 1, (f) => num(f, 'a') === 4 && num(f, 'b') >= 1);
  const second = turnQuestion('M-K-C6', 2, (f) => num(f, 'b') === 0 && num(f, 'a') >= 2 && num(f, 'a') !== 3);
  const end = last(opening, scene([], AWAY_COLS));
  return {
    parts: [
      show(moment(['Take away means some go away. Let us use dots to see it.'], 'Take away: some go away.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      turn(first, dotsAwayWhy(first)),
      show(moment(['What if we take away zero?'], `Take away 0?`, calm(zero[0]?.scene ?? end))),
      ...zero.map(show),
      turn(second, dotsAwayWhy(second)),
      show(moment(['Start with the first number, cross out the second, and count what is left.'], 'Cross out, then count what is left.', calm(end))),
    ],
  };
}

function subtractTo10(): Lesson {
  const opening = awayMoments('x', 7, 3, art(DOT));
  const first = turnQuestion('M-K-C7', 1, (f) => num(f, 'a') >= 5 && num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') >= 2);
  const second = turnQuestion('M-K-C7', 2, (f) => num(f, 'a') >= 9 && num(f, 'b') >= 3 && num(f, 'b') <= 6);
  const end = last(opening, scene([], AWAY_COLS));
  return {
    parts: [
      show(moment(['Let us take away with bigger numbers, using dots.'], 'Take away with dots.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['The dots in rows of five help us count the ones left.'], 'Rows of 5 help us count.', calm(end))),
      turn(first, dotsAwayWhy(first)),
      turn(second, dotsAwayWhy(second)),
      show(moment(['Make the first number, cross out the second, and count what is left.'], 'Cross out, then count what is left.', calm(end))),
    ],
  };
}

// ---- Filling a frame: C.8 Make 10 and C.17 Make 5 ----

const FRAME_COLS = 10;

// A frame of `total` boxes with `have` full. The empty boxes are filled one at a time and counted.
function fillMoments(prefix: string, have: number, total: number, look: PieceLook): Moment[] {
  const need = total - have;
  const cells: Piece[] = Array.from({ length: total }, (_, i) => ({ id: `${prefix}c${i}`, look: { kind: 'cell' }, ...spot(i, 2.5, 2) }));
  const full = laid(`${prefix}h`, look, have, 2.5, 2);
  const extra = laid(`${prefix}n`, look, need, 2.5, 2, have).map((piece) => ({ ...piece, gone: true }));
  const top = sentence(prefix, [have, '+', BOX, '=', total], FRAME_COLS);
  const start = scene([...cells, ...full, ...extra, ...top], FRAME_COLS);
  const filled = tally(calm(start), ids(`${prefix}n`, need), 0, { gone: false });
  const done = relook(set(calm(filled.end), eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e2`, numeral(need));
  return [
    moment(['This frame has', { number: total }, 'boxes.'], `${total} boxes`, set(start, ids(`${prefix}c`, total), { lit: true })),
    moment([{ number: have }, have === 1 ? 'box is full.' : 'boxes are full.'], `${have} full`, set(start, ids(`${prefix}h`, have), { lit: true })),
    moment(['Let us fill each empty box, and count as we go.'], 'Fill the empty boxes and count.', set(start, ids(`${prefix}c`, need, have), { lit: true })),
    ...filled.moments,
    moment(['We put in', { number: need }, 'more. Now the frame is full.'], `${need} more fill it.`, set(calm(filled.end), ids(`${prefix}n`, need), { lit: true })),
    moment([{ number: have }, ', and', { number: need }, ', make', { number: total }, '.'], `${have} + ${need} = ${total}`, done),
  ];
}

function makeTenWhy(question: Question): Moment[] {
  return fillMoments('w', num(question.facts, 'a'), 10, art(RED));
}

function makeTen(): Lesson {
  const opening = fillMoments('x', 7, 10, art(RED));
  const first = turnQuestion('M-K-C8', 1, (f) => num(f, 'a') === 6 || num(f, 'a') === 8);
  const second = turnQuestion('M-K-C8', 2, (f) => num(f, 'a') >= 2 && num(f, 'a') <= 4);
  const end = last(opening, scene([], FRAME_COLS));
  return {
    parts: [
      show(moment(['Let us find how many more make ten, with a ten-frame.'], 'How many more make 10?', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['The empty boxes tell us how many more make ten.'], 'Empty boxes = how many more.', calm(end))),
      turn(first, makeTenWhy(first)),
      turn(second, makeTenWhy(second)),
      show(moment(['Count the empty boxes. That is how many more make ten.'], 'Count the empty boxes.', calm(end))),
    ],
  };
}

function makeFiveWhy(question: Question): Moment[] {
  const name = word(question.facts, 'thing');
  const have = num(question.facts, 'a');
  if (name === undefined) return fillMoments('w', have, 5, art(DOT));
  const of = thing(name);
  return fillMoments('w', have, 5, art(of.emoji));
}

function makeFive(): Lesson {
  const opening = fillMoments('x', 3, 5, art(DOT));
  const first = turnQuestion('M-K-C17', 1, (f) => num(f, 'a') === 4 || num(f, 'a') === 2);
  const second = turnQuestion('M-K-C17', 2, (f) => num(f, 'a') !== num(first.facts, 'a') && num(f, 'a') !== 3);
  const end = last(opening, scene([], FRAME_COLS));
  const pairs = add(calm(end), [
    { id: 'p0', look: text('4+1'), x: 0.5, y: 4.4, w: 2 },
    { id: 'p1', look: text('3+2'), x: 3, y: 4.4, w: 2 },
    { id: 'p2', look: text('2+3'), x: 5.5, y: 4.4, w: 2 },
    { id: 'p3', look: text('1+4'), x: 8, y: 4.4, w: 2 },
  ]);
  return {
    parts: [
      show(moment(['Let us find how many more make five.'], 'How many more make 5?', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment([{ number: 5 }, 'can be made in many ways:', { number: 4 }, 'and', { number: 1 }, ',', { number: 3 }, 'and', { number: 2 }, ',', { number: 2 }, 'and', { number: 3 }, ',', { number: 1 }, 'and', { number: 4 }, '.'], '4+1, 3+2, 2+3, 1+4', set(pairs, ['p0', 'p1', 'p2', 'p3'], { lit: true }))),
      turn(first, makeFiveWhy(first)),
      turn(second, makeFiveWhy(second)),
      show(moment(['Count the empty boxes. That is how many more make five.'], 'Count the empty boxes.', calm(end))),
    ],
  };
}

// ---- C.9 Break apart numbers ----

function breakMoments(prefix: string, total: number, a: number): Moment[] {
  const b = total - a;
  const top = sentence(prefix, [total, '=', a, '+', BOX], AWAY_COLS);
  const start = scene([...top, ...laid(`${prefix}d`, art(BLUE), total, 2.5, 2)], AWAY_COLS);
  const reds = alter(start, (piece) => (ids(`${prefix}d`, a).includes(piece.id) ? { ...piece, look: art(RED), lit: true } : piece));
  const counted = tally(calm(reds), ids(`${prefix}d`, b, a));
  const done = relook(set(calm(counted.end), eq(prefix, 0, 2, 4), { lit: true }), `${prefix}e4`, numeral(b));
  return [
    moment([{ number: total }, 'is', { number: a }, 'and what?'], `${total} = ${a} + ?`, set(start, eq(prefix, 0, 2), { lit: true })),
    moment(['Here are', { number: total }, 'dots.'], `${total} dots`, set(start, ids(`${prefix}d`, total), { lit: true })),
    moment(['Make', { number: a }, 'of them red.'], `${a} red`, set(reds, [`${prefix}e2`], { lit: true })),
    moment(['The rest are blue. Count the blue ones.'], 'Count the blue ones.', set(calm(reds), ids(`${prefix}d`, b, a), { lit: true })),
    ...counted.moments,
    moment([{ number: total }, ', is', { number: a }, ', and', { number: b }, '.'], `${total} = ${a} + ${b}`, done),
  ];
}

function breakWhy(question: Question): Moment[] {
  return breakMoments('w', num(question.facts, 'total'), num(question.facts, 'a'));
}

function breakApart(): Lesson {
  const opening = breakMoments('x', 5, 2);
  const first = turnQuestion('M-K-C9', 1, (f) => num(f, 'total') === 4 && num(f, 'a') >= 1);
  const second = turnQuestion('M-K-C9', 2, (f) => num(f, 'a') >= 2 && num(f, 'b') >= 2);
  const end = last(opening, scene([], AWAY_COLS));
  return {
    parts: [
      show(moment(['A number can break apart into two parts. Let us find the missing part.'], 'A number breaks into 2 parts.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['The red part and the blue part together make the whole number.'], 'Red and blue make the whole.', calm(end))),
      turn(first, breakWhy(first)),
      turn(second, breakWhy(second)),
      show(moment(['Make the part you know, then count the rest.'], 'Make one part, count the rest.', calm(end))),
    ],
  };
}

// ---- C.10 and C.11 Stories ----

// The story told again, a sentence at a time, over the pictures.
function storyMoments(prefix: string, facts: Record<string, unknown>): Moment[] {
  const kind = word(facts, 'story') ?? 'gets';
  const name = word(facts, 'name') ?? 'Sam';
  const of = thingOf(facts);
  const a = num(facts, 'a');
  const b = num(facts, 'b');
  const things = many(a, of);
  if (kind === 'gets' || kind === 'table') {
    const words: JoinWords =
      kind === 'gets'
        ? { first: [`${name} has`, { number: a }, `${things}.`], firstText: `${name} has ${a}.`, second: [`${name} gets`, { number: b }, 'more. Getting more means we add.'], secondText: `Gets ${b} more: add.` }
        : { first: [{ number: a }, `${things} ${isAre(a)} on the table.`], firstText: `${a} on the table`, second: [{ number: b }, `more ${isAre(b)} in the box. In all means we add.`], secondText: `${b} more: add.` };
    return joinMoments(prefix, a, b, of, words);
  }
  const words: AwayWords =
    kind === 'givesAway'
      ? { first: [`${name} has`, { number: a }, `${things}.`], firstText: `${name} has ${a}.`, second: [`${name} gives away`, { number: b }, '. Giving away means take away.'], secondText: `Gives away ${b}: take away.` }
      : { first: ['There', isAre(a), { number: a }, `${things}.`], firstText: `${a} ${things}`, second: [`${name} takes`, { number: b }, '. Taking some means take away.'], secondText: `Takes ${b}: take away.` };
  return awayMoments(prefix, a, b, art(of.emoji), words);
}

const storyWhy = (question: Question): Moment[] => storyMoments('w', question.facts);

function additionStories(): Lesson {
  const opening = storyMoments('x', { story: 'gets', name: 'Mia', thing: 'cookie', a: 3, b: 2 });
  const first = turnQuestion('M-K-C10', 1, (f) => f.story === 'table' && num(f, 'a') + num(f, 'b') >= 4);
  const second = turnQuestion('M-K-C10', 2, (f) => f.story === 'gets' && num(f, 'a') + num(f, 'b') <= 8 && f.thing !== 'cookie');
  const end = last(opening, scene([], JOIN_COLS));
  return {
    parts: [
      show(moment(['Some stories tell us to add. Let us listen for the clue.'], 'Listen for the adding clue.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['Gets more, or how many in all, means we put the groups together.'], 'Gets more or in all: add.', calm(end))),
      turn(first, storyWhy(first)),
      turn(second, storyWhy(second)),
      show(moment(['When a story puts groups together, we add.'], 'Groups go together: add.', calm(end))),
    ],
  };
}

function subtractionStories(): Lesson {
  const opening = storyMoments('x', { story: 'givesAway', name: 'Leo', thing: 'apple', a: 5, b: 2 });
  const first = turnQuestion('M-K-C11', 1, (f) => f.story === 'takes' && num(f, 'a') >= 4);
  const second = turnQuestion('M-K-C11', 2, (f) => f.story === 'givesAway' && num(f, 'a') <= 8 && f.thing !== 'apple');
  const end = last(opening, scene([], AWAY_COLS));
  return {
    parts: [
      show(moment(['Some stories tell us to take away. Let us listen for the clue.'], 'Listen for the take away clue.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['Gives away, takes, or how many are left, means some go away.'], 'Gives away, takes, left: take away.', calm(end))),
      turn(first, storyWhy(first)),
      turn(second, storyWhy(second)),
      show(moment(['When a story has some go away, we take away.'], 'Some go away: take away.', calm(end))),
    ],
  };
}

// ---- C.12 and C.13 Hops on a number line ----

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
    moment([forward ? 'Hop forward' : 'Hop back', { number: b }, b === 1 ? 'time. Say each number you land on.' : 'times. Say each number you land on.'], `Hop ${forward ? 'forward' : 'back'} ${b}.`, set(calm(atStart), [`${prefix}e1`, `${prefix}e2`, `${prefix}frog`], { lit: true })),
    ...hops,
    moment(['We land on', { number: end }, '.'], `Land on ${end}.`, landed),
    moment([{ number: a }, forward ? ', plus' : ', take away', { number: b }, ', equals', { number: end }, '.'], `${a} ${forward ? '+' : MINUS} ${b} = ${end}`, done),
  ];
}

const hopWhy = (forward: boolean) => (question: Question): Moment[] => hopMoments('w', num(question.facts, 'a'), num(question.facts, 'b'), forward);

function addOnLine(): Lesson {
  const opening = hopMoments('x', 3, 4, true);
  const first = turnQuestion('M-K-C12', 1, (f) => num(f, 'a') >= 1 && num(f, 'b') >= 2 && num(f, 'a') !== 3);
  const second = turnQuestion('M-K-C12', 2, (f) => num(f, 'a') + num(f, 'b') >= 7 && num(f, 'b') >= 2 && num(f, 'b') <= 5);
  const end = last(opening, scene([], LINE_COLS));
  return {
    parts: [
      show(moment(['On a number line, adding means hopping forward.'], 'Adding: hop forward.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['Each hop forward is one more. Count the hops, not the start.'], 'Each hop is 1 more.', calm(end))),
      turn(first, hopWhy(true)(first)),
      turn(second, hopWhy(true)(second)),
      show(moment(['To add, start at the first number, and hop forward.'], 'Start, then hop forward.', calm(end))),
    ],
  };
}

function takeAwayOnLine(): Lesson {
  const opening = hopMoments('x', 7, 3, false);
  const first = turnQuestion('M-K-C13', 1, (f) => num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') >= 1);
  const second = turnQuestion('M-K-C13', 2, (f) => num(f, 'a') >= 7 && num(f, 'b') >= 2 && num(f, 'b') <= 5 && num(f, 'a') !== 7);
  const end = last(opening, scene([], LINE_COLS));
  return {
    parts: [
      show(moment(['On a number line, taking away means hopping back.'], 'Take away: hop back.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['Each hop back is one less. Count the hops, not the start.'], 'Each hop back is 1 less.', calm(end))),
      turn(first, hopWhy(false)(first)),
      turn(second, hopWhy(false)(second)),
      show(moment(['To take away, start at the first number, and hop back.'], 'Start, then hop back.', calm(end))),
    ],
  };
}

// ---- C.14 Plus or take away? ----

function signMoments(prefix: string, a: number, b: number, plus: boolean, look: PieceLook): Moment[] {
  const result = plus ? a + b : a - b;
  const top = sentence(prefix, [a, BOX, b, '=', result], AWAY_COLS);
  const group = laid(`${prefix}p`, look, a, 2.5, 2);
  const more = plus ? laid(`${prefix}m`, look, b, 2.5, 2, a).map((piece) => ({ ...piece, gone: true })) : [];
  const start = scene([...top, ...group, ...more], AWAY_COLS);
  const changed = plus ? set(start, ids(`${prefix}m`, b), { gone: false, lit: true }) : set(start, ids(`${prefix}p`, b, a - b), { crossed: true, lit: true });
  const after = plus ? set(calm(changed), [...ids(`${prefix}p`, a), ...ids(`${prefix}m`, b)], { lit: true }) : set(calm(changed), ids(`${prefix}p`, a - b), { lit: true });
  const signed = relook(set(calm(after), eq(prefix, 0, 1, 2, 3, 4), { lit: true }), `${prefix}e1`, text(plus ? '+' : MINUS));
  return [
    moment(['We start with', { number: a }, '.'], `Start with ${a}.`, set(start, [...ids(`${prefix}p`, a), `${prefix}e0`], { lit: true })),
    moment(plus ? ['Then', { number: b }, 'more come.'] : ['Then', { number: b }, b === 1 ? 'is crossed out.' : 'are crossed out.'], plus ? `${b} more come.` : `${b} crossed out`, changed),
    moment(plus ? ['Now there are', { number: result }, '. The group got bigger.'] : ['Now', { number: result }, result === 1 ? 'is left. The group got smaller.' : 'are left. The group got smaller.'], plus ? `${result}: bigger` : `${result}: smaller`, set(after, [`${prefix}e4`], { lit: true })),
    moment(plus ? ['Bigger means the sign is plus.'] : ['Smaller means the sign is take away.'], plus ? 'Bigger: +' : `Smaller: ${MINUS}`, signed),
  ];
}

function signWhy(question: Question): Moment[] {
  const a = num(question.facts, 'a');
  const b = num(question.facts, 'b');
  const plus = num(question.facts, 'result') === a + b;
  const name = word(question.facts, 'thing');
  return signMoments('w', a, b, plus, art(name === undefined ? DOT : thing(name).emoji));
}

function plusOrTakeAway(): Lesson {
  const apple = thing('apple');
  const joined = signMoments('x', 3, 2, true, art(apple.emoji));
  const taken = signMoments('y', 5, 2, false, art(apple.emoji));
  const isPlus = (f: Record<string, unknown>): boolean => num(f, 'result') === num(f, 'a') + num(f, 'b');
  const first = turnQuestion('M-K-C14', 1, (f) => !isPlus(f) && num(f, 'a') >= 3);
  const second = turnQuestion('M-K-C14', 2, (f) => isPlus(f) && num(f, 'b') >= 2);
  const end = last(taken, scene([], AWAY_COLS));
  return {
    parts: [
      show(moment(['Plus makes a group bigger. Take away makes it smaller.'], 'Plus: bigger. Take away: smaller.', calm(joined[0]?.scene ?? end))),
      ...joined.map(show),
      show(moment(['Now let us watch a group get smaller.'], 'Watch it get smaller.', calm(taken[0]?.scene ?? end))),
      ...taken.map(show),
      turn(first, signWhy(first)),
      show(moment(['In a number sentence, look at the end number. Is it bigger or smaller?'], 'Bigger or smaller at the end?', set(calm(last(joined, end)), ['xe0', 'xe4'], { lit: true }))),
      turn(second, signWhy(second)),
      show(moment(['Got bigger? Plus. Got smaller? Take away.'], 'Bigger: +. Smaller: −.', calm(end))),
    ],
  };
}

// ---- C.15 and C.16 Number sentences for pictures ----

// Two kinds of things side by side: count each kind, then say the plus sentence.
function plusSentenceMoments(prefix: string, a: number, b: number, one: Thing, two: Thing): Moment[] {
  const sum = a + b;
  const top = sentence(prefix, [a, '+', b, '=', sum], JOIN_COLS).map((piece) => ({ ...piece, gone: true }));
  const start = scene([...laid(`${prefix}a`, art(one.emoji), a, 0.5, 2), ...laid(`${prefix}b`, art(two.emoji), b, 6.5, 2), ...top], JOIN_COLS);
  const firstCount = tally(start, ids(`${prefix}a`, a));
  const afterFirst = set(calm(firstCount.end), [`${prefix}e0`], { gone: false, lit: true });
  const secondCount = tally(calm(afterFirst), ids(`${prefix}b`, b));
  const afterSecond = set(calm(secondCount.end), eq(prefix, 0, 1, 2), { gone: false, lit: true });
  const all = set(calm(afterSecond), [...ids(`${prefix}a`, a), ...ids(`${prefix}b`, b), ...eq(prefix, 3, 4)], { gone: false, lit: true });
  return [
    moment(['First count the', `${one.many}.`], `Count the ${one.many}.`, set(start, ids(`${prefix}a`, a), { lit: true })),
    ...firstCount.moments,
    moment(['That is', { number: a }, '. Now count the', `${two.many}.`], `${a}. Now the ${two.many}.`, afterFirst),
    ...secondCount.moments,
    moment(['That is', { number: b }, 'more. Plus puts them together.'], `${a} + ${b}`, afterSecond),
    moment(['Together they make', { number: sum }, '.'], `${sum} in all`, all),
    moment(['So the sentence is,', { number: a }, 'plus', { number: b }, 'equals', { number: sum }, '.'], `${a} + ${b} = ${sum}`, set(calm(all), eq(prefix, 0, 1, 2, 3, 4), { lit: true })),
  ];
}

// Some crossed out: count them all, count the crossed out ones, count the ones left, then say the take away sentence.
function awaySentenceMoments(prefix: string, a: number, b: number, of: Thing): Moment[] {
  const left = a - b;
  const top = sentence(prefix, [a, MINUS, b, '=', left], AWAY_COLS).map((piece) => ({ ...piece, gone: true }));
  const start = scene([...laid(`${prefix}p`, art(of.emoji), a, 2.5, 2).map((piece, i) => (i >= left ? { ...piece, crossed: true } : piece)), ...top], AWAY_COLS);
  const allCount = tally(start, ids(`${prefix}p`, a));
  const afterAll = set(calm(allCount.end), [`${prefix}e0`], { gone: false, lit: true });
  const crossedCount = tally(calm(afterAll), ids(`${prefix}p`, b, left));
  const afterCrossed = set(calm(crossedCount.end), eq(prefix, 0, 1, 2), { gone: false, lit: true });
  const leftCount = tally(calm(afterCrossed), ids(`${prefix}p`, left));
  const done = set(calm(leftCount.end), eq(prefix, 0, 1, 2, 3, 4), { gone: false, lit: true });
  return [
    moment(['First count them all, crossed out ones too.'], 'Count them all.', set(start, ids(`${prefix}p`, a), { lit: true })),
    ...allCount.moments,
    moment(['That is', { number: a }, '. Now count the crossed out ones.'], `${a}. Now the crossed out ones.`, afterAll),
    ...crossedCount.moments,
    moment(['That is', { number: b }, 'taken away. Now count the ones left.'], `${a} ${MINUS} ${b}. Now the ones left.`, afterCrossed),
    ...leftCount.moments,
    moment(['So the sentence is,', { number: a }, 'take away', { number: b }, 'equals', { number: left }, '.'], `${a} ${MINUS} ${b} = ${left}`, done),
  ];
}

function plusSentenceWhy(question: Question): Moment[] {
  return plusSentenceMoments('w', num(question.facts, 'a'), num(question.facts, 'b'), thingOf(question.facts, 'one'), thingOf(question.facts, 'two', 'banana'));
}

function awaySentenceWhy(question: Question): Moment[] {
  return awaySentenceMoments('w', num(question.facts, 'a'), num(question.facts, 'b'), thingOf(question.facts, 'one'));
}

function additionSentences(): Lesson {
  const opening = plusSentenceMoments('x', 3, 2, thing('apple'), thing('banana'));
  const first = turnQuestion('M-K-C15', 1, (f) => f.ask === 'sentence' && num(f, 'a') + num(f, 'b') >= 4);
  const second = turnQuestion('M-K-C15', 2, (f) => f.ask === 'sentence' && num(f, 'a') + num(f, 'b') >= 7 && num(f, 'a') + num(f, 'b') <= 9);
  const end = last(opening, scene([], JOIN_COLS));
  return {
    parts: [
      show(moment(['A picture of two groups can be told as a plus sentence.'], 'A picture can be a plus sentence.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['The first group, plus the second group, equals all of them.'], 'First + second = all.', calm(end))),
      turn(first, plusSentenceWhy(first)),
      turn(second, plusSentenceWhy(second)),
      show(moment(['Count each group, then say the plus sentence.'], 'Count each group. Say the sentence.', calm(end))),
    ],
  };
}

function subtractionSentences(): Lesson {
  const opening = awaySentenceMoments('x', 5, 2, thing('apple'));
  const first = turnQuestion('M-K-C16', 1, (f) => f.ask === 'sentence' && num(f, 'a') >= 3 && num(f, 'a') !== 5);
  const second = turnQuestion('M-K-C16', 2, (f) => f.ask === 'sentence' && num(f, 'a') >= 7 && num(f, 'b') <= 4);
  const end = last(opening, scene([], AWAY_COLS));
  return {
    parts: [
      show(moment(['A picture with some crossed out can be told as a take away sentence.'], 'A picture can be a take away sentence.', calm(opening[0]?.scene ?? end))),
      ...opening.map(show),
      show(moment(['All of them, take away the crossed out ones, equals the ones left.'], `All ${MINUS} crossed out = left.`, calm(end))),
      turn(first, awaySentenceWhy(first)),
      turn(second, awaySentenceWhy(second)),
      show(moment(['Count them all, then the crossed out ones, then the ones left.'], 'All, crossed out, left.', calm(end))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-K-C2': addTo5,
  'M-K-C3': addPictures10,
  'M-K-C4': addTo10,
  'M-K-C5': subtractPictures5,
  'M-K-C6': subtractTo5,
  'M-K-C7': subtractTo10,
  'M-K-C8': makeTen,
  'M-K-C9': breakApart,
  'M-K-C10': additionStories,
  'M-K-C11': subtractionStories,
  'M-K-C12': addOnLine,
  'M-K-C13': takeAwayOnLine,
  'M-K-C14': plusOrTakeAway,
  'M-K-C15': additionSentences,
  'M-K-C16': subtractionSentences,
  'M-K-C17': makeFive,
};
