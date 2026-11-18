import { COUNTABLES } from '../../content/data/countables';
import { PART_STORIES, THREE_STORIES } from '../../content/data/h1-stories';
import { DAYS, MONTHS, VOTES } from '../../content/data/h1-things';
import type { Question, Say } from '../../engine/types';
import { alter, art, calm, countAlong, group, ids, moment, num, numeral, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Part 2 lessons (plan section 16): a second short lesson for a skill's harder levels, offered once the child is
// about half way up the skill. Grade 1 Math: B.11 to B.19, C.3, C.5, C.7, C.8 and C.9.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });
const round = (n: number): number => Math.round(n * 100) / 100;

const RED = '🔴';
const BLUE = '🔵';
const YELLOW = '🟡';
const WHITE = '⚪';

type Part = number | string;
type Told = { moments: Moment[]; end: Scene };

// A number sentence as a row of pieces: numbers as numerals, 'blank' as an empty box, anything else as a sign.
function sentence(prefix: string, parts: readonly Part[], x: number, y: number, size = 1): Piece[] {
  return parts.map((part, i) => ({
    id: `${prefix}${i}`,
    look: typeof part === 'number' ? numeral(part) : part === 'blank' ? { kind: 'box' as const } : text(part === '-' ? '−' : part),
    x: round(x + i * size),
    y,
    w: size,
    h: size,
  }));
}

// The box with id `id` now shows `value`, lit.
function fillBox(from: Scene, id: string, value: number): Scene {
  return alter(from, (piece) => (piece.id === id ? { ...piece, look: numeral(value), lit: true } : piece));
}

const showing = (from: Scene, pieceIds: readonly string[]): Scene => set(from, pieceIds, { gone: false });
const hidden = (pieces: Piece[]): Piece[] => pieces.map((piece) => ({ ...piece, gone: true }));
const first = (told: Told): Scene => calm(withoutHand(told.moments[0]?.scene ?? told.end));

// The pointing hand under a piece, kept on the stage even when the piece is near the bottom or the edge.
function point(from: Scene, id: string): Scene {
  const target = from.pieces.find((piece) => piece.id === id);
  if (!target) return from;
  return alter(pointAt(from, target), (piece) => (piece.id === 'hand' ? { ...piece, x: Math.max(0, Math.min(piece.x, from.cols - 0.8)), y: Math.min(piece.y, from.rows - 0.8) } : piece));
}

// ---- M-1-B11 Order does not matter: typed, numbers to ten ----

// a + b = b + ?: the number on one side only is the one that is missing. No adding is needed.
function swapBoxMoments(p: string, a: number, b: number): Told {
  const base = scene(sentence(`${p}e`, [a, '+', b, '=', b, '+', 'blank'], 0.8, 1.8, 1.2));
  const end = fillBox(calm(base), `${p}e6`, a);
  return {
    moments: [
      moment([{ number: a }, 'plus', { number: b }, ', equals', { number: b }, 'plus what?'], `${a} + ${b} = ${b} + ?`, set(base, ids(`${p}e`, 7), { lit: true })),
      moment(['The two sides have the same two numbers, just swapped.'], 'The same two numbers, swapped.', set(base, [`${p}e3`], { lit: true })),
      moment([{ number: b }, 'is on both sides already.'], `${b} is on both sides.`, set(base, [`${p}e2`, `${p}e4`], { lit: true, badge: 'same' })),
      moment([{ number: a }, 'is on one side only. So', { number: a }, 'goes in the box.'], `${a} is on one side only.`, point(set(base, [`${p}e0`, `${p}e6`], { lit: true }), `${p}e0`)),
      moment(['The missing number is', { number: a }, '.'], `${a} + ${b} = ${b} + ${a}`, end),
    ],
    end,
  };
}

const swapBoxWhy = (q: Question): Moment[] => swapBoxMoments('w', num(q.facts, 'a'), num(q.facts, 'b')).moments;

function turnaroundPart2(): Lesson {
  const opening = swapBoxMoments('x', 9, 6);
  const start = first(opening);
  const total: Piece = { id: 'xtotal', look: numeral(15), x: 8, y: 3.4, w: 1.2, h: 1.2, crossed: true, lit: true };
  const notTotal: Scene = { ...opening.end, pieces: [...calm(opening.end).pieces, total] };
  const fresh = (f: Record<string, unknown>): boolean => num(f, 'a') !== 9 && num(f, 'b') !== 9 && num(f, 'a') !== 6 && num(f, 'b') !== 6;
  const one = turnQuestion('M-1-B11', 3, (f) => fresh(f) && num(f, 'a') >= 2 && num(f, 'b') >= 2 && num(f, 'a') + num(f, 'b') <= 11);
  const two = turnQuestion('M-1-B11', 3, (f) => fresh(f) && Math.max(num(f, 'a'), num(f, 'b')) >= 8 && Math.min(num(f, 'a'), num(f, 'b')) >= 3 && num(f, 'a') !== num(one.facts, 'a'));
  return {
    parts: [
      show(moment(['You know that we can add in any order, and the total stays the same.'], 'Any order, same total.', start)),
      show(moment(['Now the numbers are bigger, and you type the missing number yourself.'], 'Bigger numbers. You type the answer.', set(start, ['xe6'], { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['We did not have to add. We only looked for the number that was missing.'], 'No adding needed.', calm(opening.end))),
      show(moment(['Do not type the total. Nine plus six is fifteen, but the box wants nine.'], 'Not the total: the missing number.', notTotal)),
      turn(one, swapBoxWhy(one)),
      show(moment(['Big numbers work the same way. Find the number that is on one side only.'], 'Find the number on one side only.', set(calm(opening.end), ['xe0', 'xe6'], { lit: true }))),
      turn(two, swapBoxWhy(two)),
      show(moment(['The same two numbers go on both sides, in any order.'], 'Same two numbers, any order.', set(calm(opening.end), ids('xe', 7), { lit: true }))),
    ],
  };
}

// ---- M-1-B12 Subtract by thinking of adding: no picture, to twenty, then typed ----

// whole − part with no counters: count up from the part to the whole, stopping at ten on the way when ten is between.
function countUpMoments(p: string, whole: number, part: number): Told {
  const rest = whole - part;
  const size = 0.85;
  const x0 = round((10 - (rest + 1) * size) / 2);
  const line = Array.from({ length: rest + 1 }, (_, i): Piece => ({ id: `${p}n${part + i}`, look: numeral(part + i), x: round(x0 + i * size), y: 3.5, w: size, h: size, gone: true }));
  const minus = sentence(`${p}m`, [whole, '-', part, '=', 'blank'], 0.3, 0.4, 0.9);
  const plus = hidden(sentence(`${p}q`, [part, '+', 'blank', '=', whole], 5.2, 0.4, 0.9));
  const start = scene([...minus, ...plus, ...line]);
  const think = showing(start, ids(`${p}q`, 5));
  const lined = showing(calm(think), line.map((piece) => piece.id));
  const at = (value: number): string => `${p}n${value}`;
  const moments: Moment[] = [
    moment([{ number: whole }, 'minus', { number: part }, 'equals what?'], `${whole} − ${part} = ?`, set(start, ids(`${p}m`, 5), { lit: true })),
    moment(['Think:', { number: part }, ', plus what, makes', { number: whole }, '?'], `${part} + ? = ${whole}`, set(think, ids(`${p}q`, 5), { lit: true })),
    moment(['Start at', { number: part }, ', and count up to', { number: whole }, '.'], `Count up from ${part} to ${whole}.`, point(set(lined, [at(part)], { lit: true, badge: 'start' }), at(part))),
  ];
  let now = set(lined, [at(part)], { lit: true });
  if (part < 10 && whole > 10) {
    const toTen = 10 - part;
    const past = whole - 10;
    now = point(set(now, [at(10)], { lit: true, badge: `+${toTen}` }), at(10));
    moments.push(moment(['First hop up to ten. That is', { number: toTen }, '.'], `${part} to 10 is ${toTen}.`, now));
    now = point(set(now, [at(whole)], { lit: true, badge: `+${past}` }), at(whole));
    moments.push(moment(['Then hop from ten to', { number: whole }, '. That is', { number: past }, 'more.'], `10 to ${whole} is ${past}.`, now));
    now = fillBox(withoutHand(now), `${p}q2`, rest);
    moments.push(moment([{ number: toTen }, ', and', { number: past }, ', make', { number: rest }, '. We went up', { number: rest }, '.'], `${toTen} + ${past} = ${rest}`, now));
  } else {
    moments.push(moment(['Count each hop.'], 'Count each hop.', now));
    for (let hop = 1; hop <= rest; hop += 1) {
      now = point(alter(now, (piece) => (piece.id === at(part + hop) ? { ...piece, lit: true, badge: String(hop) } : piece.id.startsWith(`${p}n`) ? { ...piece, badge: undefined } : piece)), at(part + hop));
      moments.push(moment([{ number: hop }], String(hop), now));
    }
    now = fillBox(withoutHand(now), `${p}q2`, rest);
    moments.push(moment(['We went up', { number: rest }, '.'], `${part} + ${rest} = ${whole}`, now));
  }
  const end = fillBox(set(calm(now), [`${p}q2`], { lit: true }), `${p}m4`, rest);
  moments.push(moment(['So', { number: whole }, ', minus', { number: part }, ', is', { number: rest }, '.'], `${whole} − ${part} = ${rest}`, end));
  return { moments, end };
}

const countUpWhy = (q: Question): Moment[] => countUpMoments('w', num(q.facts, 'a'), num(q.facts, 'b')).moments;

function thinkAddPart2(): Lesson {
  const opening = countUpMoments('x', 13, 8);
  const start = first(opening);
  const crossesTen = (f: Record<string, unknown>): boolean => num(f, 'b') < 10 && num(f, 'a') > 10 && 10 - num(f, 'b') >= 2 && num(f, 'a') - 10 >= 2;
  const one = turnQuestion('M-1-B12', 2, (f) => crossesTen(f) && num(f, 'a') <= 12);
  const two = turnQuestion('M-1-B12', 3, (f) => crossesTen(f) && num(f, 'a') >= 14 && num(f, 'a') <= 16);
  return {
    parts: [
      show(moment(['You know how to take away, by thinking of adding.'], 'Minus? Think plus.', start)),
      show(moment(['Now there are no counters to look at, and the numbers go up to twenty.'], 'No counters now. Numbers to 20.', set(start, ['xm0'], { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['Ten is a good place to stop. Hop up to ten, then hop the rest.'], 'Stop at 10 on the way up.', set(calm(opening.end), ['xn10'], { lit: true }))),
      show(moment(['The answer is how far we went up. It is not the number we landed on.'], 'The answer is how far we went.', set(calm(opening.end), ['xq2', 'xm4'], { lit: true }))),
      turn(one, countUpWhy(one)),
      show(moment(['Next, you type the answer. Count up in the same way.'], 'Now type the answer.', set(calm(opening.end), ['xm4'], { lit: true }))),
      turn(two, countUpWhy(two)),
      show(moment(['To take away, count up from the small number to the big number.'], 'Count up from small to big.', calm(opening.end))),
    ],
  };
}

// ---- M-1-B13 Count on, M-1-B18 Count back: typed, with no number line ----

// The start number is kept in the head; then one new number for each step, with the count of steps above it.
function headMoments(p: string, start: number, steps: number, dir: 1 | -1): Told {
  const land = start + dir * steps;
  const word = dir > 0 ? 'plus' : 'minus';
  const sign = dir > 0 ? '+' : '−';
  const eq = sentence(`${p}e`, [start, dir > 0 ? '+' : '-', steps, '=', 'blank'], 2.5, 0.5);
  const held: Piece = { id: `${p}s`, look: numeral(start), x: 1.2, y: 2.7, w: 1.4, h: 1.4, gone: true };
  const said = Array.from({ length: steps }, (_, i): Piece => ({ id: `${p}c${i}`, look: numeral(start + dir * (i + 1)), x: 3.8 + i * 1.6, y: 2.9, w: 1.1, h: 1.1, gone: true }));
  const base = scene([...eq, held, ...said]);
  let now = set(showing(base, [`${p}s`]), [`${p}s`, `${p}e0`], { lit: true });
  const moments: Moment[] = [
    moment([{ number: start }, word, { number: steps }, 'equals what?'], `${start} ${sign} ${steps} = ?`, set(base, ids(`${p}e`, 5), { lit: true })),
    moment(['Keep', { number: start }, 'in your head. We do not count it.'], `Keep ${start} in your head.`, set(now, [`${p}s`], { badge: 'start' })),
    moment([dir > 0 ? 'Now count on' : 'Now count back', { number: steps }, '. Put up one finger for each number you say.'], `${dir > 0 ? 'Count on' : 'Count back'} ${steps}. One finger for each.`, set(set(now, [`${p}e0`], { lit: undefined }), [`${p}e2`], { lit: true })),
  ];
  now = set(now, [`${p}e0`], { lit: undefined });
  for (let hop = 1; hop <= steps; hop += 1) {
    now = point(alter(showing(now, [`${p}c${hop - 1}`]), (piece) => (piece.id === `${p}c${hop - 1}` ? { ...piece, lit: true, badge: String(hop) } : piece)), `${p}c${hop - 1}`);
    moments.push(moment([{ number: start + dir * hop }], String(start + dir * hop), now));
  }
  const landed = set(calm(withoutHand(now)), [`${p}c${steps - 1}`], { lit: true });
  const end = fillBox(landed, `${p}e4`, land);
  moments.push(
    moment([{ number: steps }, 'fingers are up, so we stop. The last number we said is', { number: land }, '.'], `${steps} fingers up. We stop on ${land}.`, landed),
    moment(['So', { number: start }, ',', word, { number: steps }, ', is', { number: land }, '.'], `${start} ${sign} ${steps} = ${land}`, end),
  );
  return { moments, end };
}

const headWhy = (q: Question, dir: 1 | -1): Moment[] => headMoments('w', num(q.facts, 'a'), num(q.facts, 'b'), dir).moments;

function countOnPart2(): Lesson {
  const opening = headMoments('x', 14, 3, 1);
  const start = first(opening);
  const past = headMoments('y', 8, 3, 1).end;
  const one = turnQuestion('M-1-B13', 3, (f) => num(f, 'b') === 2 && num(f, 'a') <= 7);
  const two = turnQuestion('M-1-B13', 3, (f) => num(f, 'b') === 3 && num(f, 'a') >= 16);
  return {
    parts: [
      show(moment(['You know how to count on along a number line.'], 'You can count on along a line.', start)),
      show(moment(['Now there is no line. You count on in your head, and type the answer.'], 'No number line now.', set(start, ['xe4'], { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['Say the big number quietly. Then count on. The last number you say is the answer.'], 'The last number you say is the answer.', set(calm(opening.end), ['xs', 'xc2'], { lit: true }))),
      turn(one, headWhy(one, 1)),
      show(moment(['Sometimes we go past ten. From eight, we say nine, ten, eleven. Just keep counting.'], '8 + 3: say 9, 10, 11.', set(calm(past), ['yc0', 'yc1', 'yc2'], { lit: true }))),
      turn(two, headWhy(two, 1)),
      show(moment(['Big number in your head, then count on, one finger for each.'], 'Big number in your head. Count on.', calm(opening.end))),
    ],
  };
}

function countBackPart2(): Lesson {
  const opening = headMoments('x', 15, 3, -1);
  const start = first(opening);
  const past = headMoments('y', 11, 3, -1).end;
  const one = turnQuestion('M-1-B18', 3, (f) => num(f, 'b') === 2 && num(f, 'a') <= 10);
  const two = turnQuestion('M-1-B18', 3, (f) => num(f, 'b') === 3 && num(f, 'a') >= 17);
  return {
    parts: [
      show(moment(['You know how to count back along a number line.'], 'You can count back along a line.', start)),
      show(moment(['Now there is no line. You count back in your head, and type the answer.'], 'No number line now.', set(start, ['xe4'], { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['Say the big number quietly. Then count back. The last number you say is the answer.'], 'The last number you say is the answer.', set(calm(opening.end), ['xs', 'xc2'], { lit: true }))),
      turn(one, headWhy(one, -1)),
      show(moment(['Sometimes we go back past ten. From eleven, we say ten, nine, eight. Just keep counting back.'], '11 − 3: say 10, 9, 8.', set(calm(past), ['yc0', 'yc1', 'yc2'], { lit: true }))),
      turn(two, headWhy(two, -1)),
      show(moment(['Big number in your head, then count back, one finger for each.'], 'Big number in your head. Count back.', calm(opening.end))),
    ],
  };
}

// ---- M-1-B14 Fact families: an adding fact answers a take away, typed ----

// The adding fact on top with its parts and whole named; the take away below takes one part from the whole.
function familyTypedMoments(p: string, numbers: readonly number[], ask: number): Told {
  const [a = 0, b = 0, c = 0] = numbers;
  const [x, y] = ask === b ? [a, b] : [b, a]; // the given fact is x + y = c, and the take away removes y
  const other = c - ask;
  const top = sentence(`${p}g`, [x, '+', y, '=', c], 2.5, 0.9);
  const below = hidden(sentence(`${p}q`, [c, '-', ask, '=', 'blank'], 2.5, 3.5));
  const base = scene([...top, ...below]);
  const named = alter(base, (piece) => (piece.id === `${p}g0` || piece.id === `${p}g2` ? { ...piece, lit: true, badge: 'part' } : piece.id === `${p}g4` ? { ...piece, lit: true, badge: 'whole' } : piece));
  const asked = showing(calm(base), ids(`${p}q`, 5));
  const taken = set(set(asked, [`${p}q0`, `${p}q2`], { lit: true }), [`${p}g2`], { crossed: true });
  const left = set(set(calm(taken), [`${p}g2`], { dim: true }), [`${p}g0`], { lit: true });
  const end = fillBox(left, `${p}q4`, other);
  return {
    moments: [
      moment([{ number: x }, 'plus', { number: y }, 'equals', { number: c }, '.'], `${x} + ${y} = ${c}`, set(base, ids(`${p}g`, 5), { lit: true })),
      moment(['The two parts are', { number: x }, ', and', { number: y }, '. The whole is', { number: c }, '.'], `Parts: ${x} and ${y}. Whole: ${c}.`, named),
      moment(['So', { number: c }, 'minus', { number: ask }, 'equals what?'], `${c} − ${ask} = ?`, set(asked, ids(`${p}q`, 5), { lit: true })),
      moment(['We start with the whole, and take away the part', { number: ask }, '.'], `Take the part ${ask} from the whole.`, taken),
      moment(['The other part is left. It is', { number: other }, '.'], `The other part, ${other}, is left.`, left),
      moment(['So', { number: c }, ', minus', { number: ask }, ', is', { number: other }, '.'], `${c} − ${ask} = ${other}`, end),
    ],
    end,
  };
}

const familyTypedWhy = (q: Question): Moment[] => familyTypedMoments('w', q.facts.numbers as number[], num(q.facts, 'b')).moments;

function familyPart2(): Lesson {
  const opening = familyTypedMoments('x', [6, 9, 15], 9);
  const start = first(opening);
  const whole = (f: Record<string, unknown>): number => (f.numbers as number[])[2] ?? 0;
  const small = (f: Record<string, unknown>): number => Math.min((f.numbers as number[])[0] ?? 0, (f.numbers as number[])[1] ?? 0);
  const one = turnQuestion('M-1-B14', 3, (f) => whole(f) >= 9 && whole(f) <= 12 && small(f) >= 3);
  const two = turnQuestion('M-1-B14', 3, (f) => whole(f) >= 16 && small(f) >= 4);
  return {
    parts: [
      show(moment(['You know the four facts in a fact family.'], 'A fact family has four facts.', start)),
      show(moment(['Now we use an adding fact, to answer a take away. No counting is needed.'], 'An adding fact answers a take away.', set(start, ids('xg', 5), { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['The whole, minus one part, is always the other part.'], 'Whole − part = the other part.', set(calm(opening.end), ['xg4', 'xg0', 'xq4'], { lit: true }))),
      turn(one, familyTypedWhy(one)),
      show(moment(['It works with big numbers too. Find the whole, take away one part, and see which part is left.'], 'Find the whole. Take one part. See what is left.', set(calm(opening.end), ['xg4', 'xq0'], { lit: true }))),
      turn(two, familyTypedWhy(two)),
      show(moment(['One adding fact tells you the take away facts too.'], 'An adding fact tells the take away facts.', set(calm(opening.end), [...ids('xg', 5), ...ids('xq', 5)], { lit: true }))),
    ],
  };
}

// ---- M-1-B15 Stories with three numbers: sums to twenty with no picture, then typed ----

// Counters in rows of ten. Two numbers that make ten fill the top row first; with no such pair the numbers go in order,
// and the full top row is still ten.
function threeBigMoments(p: string, counts: readonly [number, number, number], things: string): Told {
  const [a, b, c] = counts;
  const sum = a + b + c;
  const pairs: [number, number][] = [[0, 1], [0, 2], [1, 2]];
  const pair = pairs.find(([i, j]) => (counts[i] ?? 0) + (counts[j] ?? 0) === 10);
  const order = pair ? [pair[0], pair[1], 3 - pair[0] - pair[1]] : [0, 1, 2];
  const colors = [RED, BLUE, YELLOW];
  const size = 0.9;
  const counters: Piece[] = [];
  order.forEach((g) => {
    for (let i = 0; i < (counts[g] ?? 0); i += 1) {
      const at = counters.length;
      counters.push({ id: `${p}g${g}_${i}`, look: art(colors[g] ?? RED), x: round(0.5 + (at % 10) * size), y: round(2.1 + Math.floor(at / 10) * size), w: size, h: size, gone: true });
    }
  });
  const of = (g: number): string[] => Array.from({ length: counts[g] ?? 0 }, (_, i) => `${p}g${g}_${i}`);
  const cell = (g: number): string => `${p}e${g * 2}`;
  const base = scene([...sentence(`${p}e`, [a, '+', b, '+', c, '=', 'blank'], 1.5, 0.4), ...counters]);
  const topRow = counters.slice(0, 10).map((piece) => piece.id);
  const moments: Moment[] = [moment(['We add', { number: a }, ',', { number: b }, ', and', { number: c }, '.'], `${a} + ${b} + ${c} = ?`, set(base, ids(`${p}e`, 5), { lit: true }))];
  let now: Scene;
  if (pair) {
    const [i, j] = pair;
    const k = order[2] ?? 0;
    const [x, y, z] = [counts[i] ?? 0, counts[j] ?? 0, counts[k] ?? 0];
    now = set(showing(base, [...of(i), ...of(j)]), [cell(i), cell(j), ...of(i), ...of(j)], { lit: true });
    moments.push(moment(['Look for two numbers that make ten.', { number: x }, ', and', { number: y }, ', make ten.'], `${x} + ${y} = 10`, now));
    now = set(showing(calm(now), of(k)), [cell(k), ...of(k)], { lit: true });
    moments.push(moment(['Now add the last number. Ten, plus', { number: z }, ', is', { number: sum }, '.'], `10 + ${z} = ${sum}`, now));
  } else {
    const firstTwo = a + b;
    now = set(showing(base, [...of(0), ...of(1)]), [cell(0), cell(1), ...of(0), ...of(1)], { lit: true });
    moments.push(moment(['No two numbers make ten here. So add the first two.', { number: a }, ', plus', { number: b }, ', is', { number: firstTwo }, '.'], `${a} + ${b} = ${firstTwo}`, now));
    now = set(showing(calm(now), of(2)), [cell(2), ...of(2)], { lit: true });
    moments.push(moment(['Now add', { number: c }, 'more.'], `${firstTwo} + ${c}`, now));
    now = set(calm(now), topRow, { lit: true });
    moments.push(
      sum === 20
        ? moment(['Both rows are full. Ten, and ten, make', { number: 20 }, '.'], '10 + 10 = 20', set(now, counters.map((piece) => piece.id), { lit: true }))
        : moment(['The top row is full. That is ten. There are', { number: sum - 10 }, 'more below. Ten, and', { number: sum - 10 }, ', make', { number: sum }, '.'], `10 + ${sum - 10} = ${sum}`, now),
    );
  }
  const end = fillBox(set(calm(now), counters.map((piece) => piece.id), { lit: true }), `${p}e6`, sum);
  moments.push(moment(['So there are', { number: sum }, `${things} in all.`], `${a} + ${b} + ${c} = ${sum}`, end));
  return { moments, end };
}

function threeBigWhy(q: Question): Moment[] {
  const story = THREE_STORIES.find((each) => each.id === str(q.facts, 'story'));
  if (!story) throw new Error('No three-number story');
  return threeBigMoments('w', [num(q.facts, 'a'), num(q.facts, 'b'), num(q.facts, 'c')], story.things).moments;
}

function threePart2(): Lesson {
  const opening = threeBigMoments('x', [4, 7, 6], 'pieces of fruit');
  const other = threeBigMoments('y', [5, 8, 3], 'toys');
  const start = first(opening);
  const values = (f: Record<string, unknown>): number[] => [num(f, 'a'), num(f, 'b'), num(f, 'c')];
  const hasTen = (f: Record<string, unknown>): boolean => {
    const [a = 0, b = 0, c = 0] = values(f);
    return a + b === 10 || a + c === 10 || b + c === 10;
  };
  const one = turnQuestion('M-1-B15', 2, (f) => hasTen(f) && f.story !== 'fruit' && !values(f).includes(7) && num(f, 'a') !== 5);
  const two = turnQuestion('M-1-B15', 3, (f) => !hasTen(f) && f.story !== 'toys' && f.story !== one.facts.story && num(f, 'a') + num(f, 'b') > 10 && num(f, 'a') + num(f, 'b') + num(f, 'c') < 20 && num(f, 'a') !== 5);
  return {
    parts: [
      show(moment(['You know how to add three numbers: add two, then add the third.'], 'Add two, then add the third.', start)),
      show(moment(['Now the numbers are bigger, and the story has no picture to count.'], 'Bigger numbers. No picture.', set(start, ['xe0', 'xe2', 'xe4'], { lit: true }))),
      show(moment(['A bowl has four strawberries, seven bananas, and six apples. How many pieces of fruit?'], '4 strawberries, 7 bananas, 6 apples', set(start, ['xe6'], { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['We may add in any order. So start with the two numbers that are easiest.'], 'Add the easiest two first.', set(calm(opening.end), ['xe0', 'xe4'], { lit: true }))),
      turn(one, threeBigWhy(one)),
      show(moment(['Sometimes no two numbers make ten. Then add the first two, and add the third. A full row is ten.'], 'No ten? Add two, then the third.', calm(other.end))),
      show(moment(['Be sure to add all three numbers, not just two of them.'], 'Add all three numbers.', set(calm(other.end), ['ye0', 'ye2', 'ye4'], { lit: true }))),
      turn(two, threeBigWhy(two)),
      show(moment(['Three numbers: make ten if you can, then add the rest.'], 'Make ten if you can.', calm(opening.end))),
    ],
  };
}

// ---- M-1-B16 Stories with a missing part: the start is hidden, typed ----

// Every thing there is now, in rows of ten. The ones that came later are crossed out; the rest were there at the start.
function startMoments(p: string, known: number, total: number, emoji: string, things: string): Told {
  const before = total - known;
  const all = group(`${p}t`, art(emoji), total, 0.5, 2.2, 10, 0.9);
  const eq = sentence(`${p}e`, ['blank', '+', known, '=', total], 2.5, 0.4);
  const start = scene([...all, ...eq]);
  const came = ids(`${p}t`, known, before);
  const stayed = ids(`${p}t`, before);
  const marked = set(start, came, { lit: true });
  const crossed = set(calm(marked), came, { crossed: true });
  const counted = countAlong(crossed, stayed);
  const end = fillBox(calm(counted.end), `${p}e0`, before);
  const check = set(set(end, came, { crossed: false }), [...stayed, ...came, ...ids(`${p}e`, 5)], { lit: true });
  return {
    moments: [
      moment(['Now there are', { number: total }, `${things}.`], `Now there are ${total}.`, set(start, [...ids(`${p}t`, total), `${p}e4`], { lit: true })),
      moment([{ number: known }, 'of them came later.'], `${known} came later.`, set(marked, [`${p}e2`], { lit: true })),
      moment(['Take those', { number: known }, 'away, to go back to the start.'], `${total} − ${known}`, crossed),
      moment(['Count the ones that are left.'], 'Count the ones that are left.', set(crossed, stayed, { lit: true })),
      ...counted.moments,
      moment([{ number: total }, ', minus', { number: known }, ', is', { number: before }, '. So there were', { number: before }, `${things} at the start.`], `${total} − ${known} = ${before}`, end),
      moment(['Check it.', { number: before }, ', plus', { number: known }, ', is', { number: total }, '.'], `${before} + ${known} = ${total}`, check),
    ],
    end: check,
  };
}

function startWhy(q: Question): Moment[] {
  const story = PART_STORIES.find((each) => each.id === str(q.facts, 'story'));
  if (!story) throw new Error('No missing-part story');
  return startMoments('w', num(q.facts, 'b'), num(q.facts, 'total'), story.emoji, story.things).moments;
}

function partPart2(): Lesson {
  const opening = startMoments('x', 5, 12, '🦆', 'ducks');
  const start = first(opening);
  const hiddenStart = (f: Record<string, unknown>): boolean => f.blank === 'a' && num(f, 'a') >= 2 && num(f, 'b') >= 2 && num(f, 'b') !== 5;
  const one = turnQuestion('M-1-B16', 3, (f) => hiddenStart(f) && num(f, 'total') <= 10 && num(f, 'a') <= 6);
  const two = turnQuestion('M-1-B16', 3, (f) => hiddenStart(f) && f.story !== one.facts.story && num(f, 'total') >= 13 && num(f, 'total') <= 17 && num(f, 'a') <= 9);
  return {
    parts: [
      show(moment(['You know how to find how many came, and how many went away.'], 'How many came? How many went?', start)),
      show(moment(['Now the start of the story is hidden.'], 'The start is hidden.', set(start, ['xe0'], { lit: true }))),
      show(moment(['Some ducks swim on a pond. Five more ducks come. Now there are twelve ducks. How many ducks were there at the start?'], 'Some ducks, 5 more come, now 12', set(start, ids('xe', 5), { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['When the start is hidden, take away the ones that came, from how many there are now.'], 'Now, take away the ones that came.', calm(opening.end))),
      turn(one, startWhy(one)),
      show(moment(['The numbers can go up to twenty. Do just the same.'], 'Numbers to 20: do the same.', set(calm(opening.end), ['xe4'], { lit: true }))),
      turn(two, startWhy(two)),
      show(moment(['Find the hidden number, then check that the story works.'], 'Find it. Then check the story.', calm(opening.end))),
    ],
  };
}

// ---- M-1-B17 Make both sides equal: typed, with a take away on one side ----

type Side = Part[];

// Counters under each side. The side we know is worked out first; the other side is then made to match it,
// by adding white counters or by crossing counters out.
function minusBalanceMoments(p: string, left: Side, right: Side): Told {
  const boxOnLeft = left.includes('blank');
  const knownSide = boxOnLeft ? right : left;
  const otherSide = boxOnLeft ? left : right;
  const [k1, kOp, k2] = knownSide as [number, string, number];
  const value = kOp === '+' ? k1 + k2 : k1 - k2;
  const have = otherSide.find((part): part is number => typeof part === 'number') ?? 0;
  const otherMinus = otherSide[1] === '-';
  const missing = otherMinus ? have - value : value - have;
  const size = 0.7;
  const spot = (x0: number, i: number): { x: number; y: number; w: number; h: number } => ({ x: round(x0 + (i % 5) * size), y: round(1.7 + Math.floor(i / 5) * size), w: size, h: size });
  const knownX = boxOnLeft ? 6 : 0.5;
  const otherX = boxOnLeft ? 0.5 : 6;
  const knownCount = kOp === '+' ? value : k1;
  const otherCount = otherMinus ? have : value;
  const known = Array.from({ length: knownCount }, (_, i): Piece => ({ id: `${p}k${i}`, look: art(kOp === '+' && i >= k1 ? BLUE : RED), ...spot(knownX, i) }));
  const other = Array.from({ length: otherCount }, (_, i): Piece => ({ id: `${p}o${i}`, look: art(i < have ? YELLOW : WHITE), ...spot(otherX, i), gone: i >= have }));
  const all = [...left, '=', ...right];
  const start = scene([...sentence(`${p}e`, all, 1.5, 0.3), { id: `${p}eq`, look: text('='), x: 4.5, y: 2.2 }, ...known, ...other]);
  const boxId = `${p}e${all.indexOf('blank')}`;
  const knownWords = ids(`${p}e`, 3, boxOnLeft ? 4 : 0);
  const otherWords = ids(`${p}e`, 3, boxOnLeft ? 0 : 4);
  const kept = ids(`${p}k`, value);
  const worked = kOp === '+' ? set(start, [...knownWords, ...kept], { lit: true }) : set(set(start, ids(`${p}k`, k2, value), { crossed: true }), [...knownWords, ...kept], { lit: true });
  const still = alter(calm(worked), (piece) => piece);
  const moments: Moment[] = [
    moment(['Work out the side we know first.', { number: k1 }, kOp === '+' ? ', plus' : ', minus', { number: k2 }, ', is', { number: value }, '.'], `${k1} ${kOp === '+' ? '+' : '−'} ${k2} = ${value}`, worked),
  ];
  let end: Scene;
  if (otherMinus) {
    const stay = ids(`${p}o`, value);
    const rest = ids(`${p}o`, missing, value);
    const counted = countAlong(set(still, stay, { dim: true }), rest);
    const crossing = counted.moments.map((each, i) => ({ ...each, scene: set(each.scene, rest.slice(0, i + 1), { crossed: true }) }));
    end = fillBox(set(set(calm(counted.end), rest, { crossed: true }), stay, { dim: false, lit: true }), boxId, missing);
    moments.push(
      moment(['The other side starts with', { number: have }, '. It must end with', { number: value }, 'too.'], `${have} − ? must make ${value}.`, set(still, [...otherWords, ...ids(`${p}o`, have)], { lit: true })),
      moment(['Keep', { number: value }, '. Take away the rest, and count them.'], `Keep ${value}. Take away the rest.`, set(still, stay, { lit: true })),
      ...crossing,
      moment(['We took away', { number: missing }, '.', { number: have }, ', minus', { number: missing }, ', is', { number: value }, '. The missing number is', { number: missing }, '.'], `${have} − ${missing} = ${value}`, end),
    );
  } else {
    const added = ids(`${p}o`, missing, have);
    const counted = countAlong(set(showing(still, added), ids(`${p}o`, have), { lit: true }), added, have);
    const appearing = counted.moments.map((each, i) => ({ ...each, scene: set(each.scene, ids(`${p}o`, missing - i - 1, have + i + 1), { gone: true }) }));
    end = fillBox(set(calm(counted.end), ids(`${p}o`, value), { lit: true }), boxId, missing);
    moments.push(
      moment(['The other side has', { number: have }, ', and a box. It must make', { number: value }, 'too.'], `${have} + ? must make ${value}.`, set(still, [...otherWords, ...ids(`${p}o`, have)], { lit: true })),
      moment(['Count up from', { number: have }, 'to', { number: value }, '.'], `Count up from ${have} to ${value}.`, set(still, ids(`${p}o`, have), { lit: true })),
      ...appearing,
      moment(['We added', { number: missing }, '.', { number: have }, ', plus', { number: missing }, ', is', { number: value }, '. The missing number is', { number: missing }, '.'], `${have} + ${missing} = ${value}`, end),
    );
  }
  return { moments, end };
}

const minusBalanceWhy = (q: Question): Moment[] => minusBalanceMoments('w', q.facts.left as Side, q.facts.right as Side).moments;

function balancePart2(): Lesson {
  const opening = minusBalanceMoments('x', [9, '-', 2], [5, '+', 'blank']);
  const second = minusBalanceMoments('y', [6, '+', 2], [11, '-', 'blank']);
  const start = first(opening);
  const secondStart = first(second);
  const side = (f: Record<string, unknown>, which: 'left' | 'right'): Side => f[which] as Side;
  const one = turnQuestion('M-1-B17', 3, (f) => side(f, 'left')[1] === '-' && (side(f, 'left')[0] as number) <= 12 && side(f, 'left')[0] !== 9 && (side(f, 'left')[2] as number) >= 2 && (side(f, 'right')[0] as number) >= 2 && (side(f, 'left')[0] as number) - (side(f, 'left')[2] as number) - (side(f, 'right')[0] as number) >= 2);
  const two = turnQuestion('M-1-B17', 3, (f) => side(f, 'right')[1] === '-' && (side(f, 'right')[0] as number) <= 14 && side(f, 'right')[0] !== 11 && (side(f, 'left')[0] as number) >= 2 && (side(f, 'left')[2] as number) >= 2 && (side(f, 'left')[0] as number) + (side(f, 'left')[2] as number) >= 5 && (side(f, 'right')[0] as number) - (side(f, 'left')[0] as number) - (side(f, 'left')[2] as number) >= 2);
  return {
    parts: [
      show(moment(['You know the equal sign means, both sides make the same number.'], '= means the same as.', set(start, ['xe3', 'xeq'], { lit: true }))),
      show(moment(['Now one side can be a take away. Nine minus two, equals five plus what?'], '9 − 2 = 5 + ?', set(start, ids('xe', 7), { lit: true }))),
      ...opening.moments.map(show),
      turn(one, minusBalanceWhy(one)),
      show(moment(['The take away can be on the side with the box. Six plus two, equals eleven minus what?'], '6 + 2 = 11 − ?', set(secondStart, ids('ye', 7), { lit: true }))),
      ...second.moments.map(show),
      turn(two, minusBalanceWhy(two)),
      show(moment(['Work out the side you know. Then make the other side match, by adding or by taking away.'], 'Make both sides match.', calm(second.end))),
    ],
  };
}

// ---- M-1-B19 Go down to ten: both steps with no ten frame, typed ----

// The number taken away splits in two under itself: the part that gets down to ten, and the rest, which comes off the ten.
function splitMoments(p: string, a: number, b: number): Told {
  const ones = a - 10;
  const rest = b - ones;
  const eq = sentence(`${p}e`, [a, '-', b, '=', 'blank'], 2.5, 0.3);
  const parts: Piece[] = [
    { id: `${p}s0`, look: numeral(ones), x: 3.6, y: 1.5, w: 0.9, h: 0.9, gone: true },
    { id: `${p}s1`, look: numeral(rest), x: 5.5, y: 1.5, w: 0.9, h: 0.9, gone: true },
  ];
  const cards: Piece[] = [
    { id: `${p}c0`, look: text(`${a} − ${ones} = 10`), x: 2.8, y: 3, w: 4.4, h: 0.9, gone: true },
    { id: `${p}c1`, look: text(`10 − ${rest} = ${10 - rest}`), x: 2.8, y: 4.2, w: 4.4, h: 0.9, gone: true },
  ];
  const base = scene([...eq, ...parts, ...cards]);
  const s1 = set(showing(base, [`${p}s0`]), [`${p}e0`, `${p}s0`], { lit: true });
  const s2 = set(showing(calm(s1), [`${p}s1`]), [`${p}e2`, `${p}s0`, `${p}s1`], { lit: true });
  const s3 = set(showing(calm(s2), [`${p}c0`]), [`${p}c0`, `${p}s0`], { lit: true });
  const s4 = set(showing(calm(s3), [`${p}c1`]), [`${p}c1`, `${p}s1`], { lit: true });
  const end = fillBox(calm(s4), `${p}e4`, a - b);
  return {
    moments: [
      moment([{ number: a }, 'minus', { number: b }, 'equals what?'], `${a} − ${b} = ?`, set(base, ids(`${p}e`, 5), { lit: true })),
      moment([{ number: a }, 'is ten, and', { number: ones }, '. So taking away', { number: ones }, 'gets us down to ten.'], `${a} is 10 and ${ones}.`, s1),
      moment(['Split', { number: b }, 'into', { number: ones }, ', and', { number: rest }, '.'], `${b} is ${ones} and ${rest}.`, s2),
      moment(['First,', { number: a }, 'minus', { number: ones }, 'is ten.'], `${a} − ${ones} = 10`, s3),
      moment(['Then, ten minus', { number: rest }, 'is', { number: 10 - rest }, '.'], `10 − ${rest} = ${10 - rest}`, s4),
      moment(['So', { number: a }, ', minus', { number: b }, ', is', { number: a - b }, '.'], `${a} − ${b} = ${a - b}`, end),
    ],
    end,
  };
}

const splitWhy = (q: Question): Moment[] => splitMoments('w', num(q.facts, 'a'), num(q.facts, 'b')).moments;

function downPart2(): Lesson {
  const opening = splitMoments('x', 16, 9);
  const start = first(opening);
  const restOf = (f: Record<string, unknown>): number => num(f, 'b') - (num(f, 'a') - 10);
  const one = turnQuestion('M-1-B19', 3, (f) => num(f, 'a') === 12 && restOf(f) >= 2);
  const two = turnQuestion('M-1-B19', 3, (f) => (num(f, 'a') === 15 || num(f, 'a') === 17) && restOf(f) >= 2 && num(f, 'b') !== 9);
  return {
    parts: [
      show(moment(['You know how to stop at ten on the way, when you take away.'], 'Stop at 10 on the way.', start)),
      show(moment(['Now there is no ten frame. You do both steps yourself, and type the answer.'], 'No ten frame. Two steps.', set(start, ['xe4'], { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['We split the number we take away. One part gets us down to ten. The other part comes off the ten.'], 'Split it: down to 10, then the rest.', set(calm(opening.end), ['xs0', 'xs1'], { lit: true }))),
      turn(one, splitWhy(one)),
      show(moment(['How do we split? Look at the ones of the big number. That many come off first.'], 'The ones of the big number come off first.', set(calm(opening.end), ['xe0', 'xs0'], { lit: true }))),
      turn(two, splitWhy(two)),
      show(moment(['Down to ten, then take away the rest. Two small steps.'], 'Down to 10, then the rest.', set(calm(opening.end), ['xc0', 'xc1'], { lit: true }))),
    ],
  };
}

// ---- M-1-C3 Picture graphs: how many more ----

function countable(name: string): { emoji: string; one: string; many: string } {
  const found = COUNTABLES.find((each) => each.one === name);
  if (!found) throw new Error(`No countable called ${name}`);
  return found;
}

function graphScene(p: string, things: readonly string[], values: readonly number[]): Scene {
  const pieces: Piece[] = [];
  things.forEach((name, r) => {
    const thing = countable(name);
    const y = 0.7 + r * 1.35;
    pieces.push({ id: `${p}l${r}`, look: text(thing.many), x: 0.1, y: y + 0.15, w: 3, h: 0.7 });
    for (let i = 0; i < (values[r] ?? 0); i += 1) pieces.push({ id: `${p}r${r}_${i}`, look: art(thing.emoji), x: 3.3 + i, y });
  });
  return scene(pieces);
}

const rowIds = (p: string, r: number, n: number, from = 0): string[] => Array.from({ length: n }, (_, i) => `${p}r${r}_${from + i}`);

// Two rows, matched one to one from the left; the pictures with no partner are the extra ones.
function moreMoments(p: string, things: readonly string[], values: readonly number[], index: number, other: number): Told {
  const [a, b] = [values[index] ?? 0, values[other] ?? 0];
  const [big, small] = [countable(things[index] ?? '').many, countable(things[other] ?? '').many];
  const third = 3 - index - other;
  const base = set(graphScene(p, things, values), [`${p}l${third}`, ...rowIds(p, third, values[third] ?? 0)], { dim: true });
  const both = set(base, [`${p}l${index}`, `${p}l${other}`, ...rowIds(p, index, a), ...rowIds(p, other, b)], { lit: true });
  const matched = set(calm(base), [...rowIds(p, index, b), ...rowIds(p, other, b)], { lit: true, badge: '✓' });
  const paired = set(calm(base), [...rowIds(p, index, b), ...rowIds(p, other, b)], { dim: true });
  const extra = rowIds(p, index, a - b, b);
  const counted = countAlong(paired, extra);
  const end = set(withoutHand(counted.end), [`${p}l${index}`, ...extra], { lit: true });
  return {
    moments: [
      moment([`How many more chose ${big} than ${small}? Find those two rows.`], `Find ${big} and ${small}.`, set(base, [`${p}l${index}`, `${p}l${other}`], { lit: true })),
      moment([`The ${big} row has`, { number: a }, `. The ${small} row has`, { number: b }, '.'], `${big}: ${a}, ${small}: ${b}`, both),
      moment(['Match them up, one to one, from the left.'], 'Match them, one to one.', matched),
      moment([`Some ${big} have no partner. They are the extra ones. Count them.`], 'Count the extra ones.', set(paired, extra, { lit: true })),
      ...counted.moments,
      moment([{ number: a }, ', minus', { number: b }, ', is', { number: a - b }, '. So', { number: a - b }, `more chose ${big}.`], `${a} − ${b} = ${a - b}`, end),
    ],
    end,
  };
}

const moreWhy = (q: Question): Moment[] => moreMoments('w', q.facts.things as string[], q.facts.values as number[], num(q.facts, 'index'), num(q.facts, 'other')).moments;

function graphPart2(): Lesson {
  const things = ['banana', 'car', 'cookie'];
  const values = [5, 3, 2];
  const opening = moreMoments('x', things, values, 0, 2);
  const base = graphScene('x', things, values);
  const gap = (f: Record<string, unknown>): number => ((f.values as number[])[num(f, 'index')] ?? 0) - ((f.values as number[])[num(f, 'other')] ?? 0);
  const big = (f: Record<string, unknown>): number => (f.values as number[])[num(f, 'index')] ?? 0;
  const one = turnQuestion('M-1-C3', 3, (f) => gap(f) === 2 && big(f) <= 4 && Math.abs(num(f, 'index') - num(f, 'other')) === 1);
  const two = turnQuestion('M-1-C3', 3, (f) => gap(f) >= 3 && big(f) === 6 && Math.abs(num(f, 'index') - num(f, 'other')) === 2 && !(f.things as string[]).includes('banana'));
  return {
    parts: [
      show(moment(['You know how to find a row in a picture graph, and count it.'], 'Find the row. Count it.', base)),
      show(moment(['Now we look at two rows, and ask how many more one has.'], 'Two rows: how many more?', set(base, ['xl0', 'xl2'], { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['How many more means the extra ones. It does not mean how many in all.'], 'More means the extra ones.', set(calm(opening.end), rowIds('x', 0, 3, 2), { lit: true }))),
      turn(one, moreWhy(one)),
      show(moment(['The two rows may not be next to each other. Find each one by its name first.'], 'Find each row by its name.', set(base, ['xl0', 'xl2'], { lit: true, badge: 'this one' }))),
      turn(two, moreWhy(two)),
      show(moment(['Find the two rows. Then the big number, minus the small number, tells how many more.'], 'Big number minus small number.', calm(base))),
    ],
  };
}

// ---- M-1-C5 Measure with paper clips: how many clips longer ----

const CLIP = '📎';
const KEY = '🔑';
const OBJECTS: Record<string, string> = { pencil: '✏️', crayon: '🖍️', spoon: '🥄', carrot: '🥕' };

// The question has no picture, so we draw one: both things with their clips, from the same start. The clips with no
// partner are how much longer, and that is the big number minus the small number.
function longerMoments(p: string, name: string, long: number, short: number): Told {
  const eq = hidden(sentence(`${p}e`, [long, '-', short, '=', 'blank'], 2.9, 0.1, 0.9));
  const thing: Piece = { id: `${p}obj`, look: art(OBJECTS[name] ?? '✏️'), x: 0.2, y: 1.6 };
  const key: Piece = { id: `${p}key`, look: art(KEY), x: 0.2, y: 3.3 };
  const top = group(`${p}a`, art(CLIP), long, 1.4, 1.7, 10, 0.9).map((piece) => ({ ...piece, w: 0.8, h: 0.8 }));
  const bottom = group(`${p}b`, art(CLIP), short, 1.4, 3.4, 10, 0.9).map((piece) => ({ ...piece, w: 0.8, h: 0.8, gone: true }));
  const start = scene([...eq, thing, { ...key, gone: true }, ...top, ...bottom]);
  const two = showing(start, [`${p}key`, ...ids(`${p}b`, short)]);
  const paired = set(calm(two), [...ids(`${p}a`, short), ...ids(`${p}b`, short)], { dim: true });
  const extra = ids(`${p}a`, long - short, short);
  const counted = countAlong(paired, extra);
  const end = fillBox(set(showing(withoutHand(counted.end), ids(`${p}e`, 5)), extra, { lit: true }), `${p}e4`, long - short);
  return {
    moments: [
      moment([`The ${name} is`, { number: long }, 'paper clips long.'], `The ${name}: ${long} clips`, set(start, [`${p}obj`, ...ids(`${p}a`, long)], { lit: true })),
      moment(['The key is', { number: short }, 'paper clips long.'], `The key: ${short} clips`, set(two, [`${p}key`, ...ids(`${p}b`, short)], { lit: true })),
      moment(['Both rows start at the same place. Match the clips, one above one.'], 'Match the clips.', set(calm(two), [...ids(`${p}a`, short), ...ids(`${p}b`, short)], { lit: true, badge: '✓' })),
      moment([`The ${name} has extra clips. Count them.`], 'Count the extra clips.', set(paired, extra, { lit: true })),
      ...counted.moments,
      moment([{ number: long }, ', minus', { number: short }, ', is', { number: long - short }, `. The ${name} is`, { number: long - short }, 'clips longer.'], `${long} − ${short} = ${long - short}`, end),
    ],
    end,
  };
}

function longerWhy(q: Question): Moment[] {
  const name = /^The (\w+) is/.exec(q.prompt.text)?.[1] ?? 'pencil';
  return longerMoments('w', name, num(q.facts, 'a'), num(q.facts, 'b')).moments;
}

function clipPart2(): Lesson {
  const opening = longerMoments('x', 'carrot', 8, 3);
  const start = first(opening);
  const one = turnQuestion('M-1-C5', 3, (f) => num(f, 'a') <= 6 && num(f, 'b') !== 3 && num(f, 'a') - num(f, 'b') !== 5);
  const two = turnQuestion('M-1-C5', 3, (f) => num(f, 'a') === 9 && num(f, 'b') !== 3 && num(f, 'b') !== num(one.facts, 'b'));
  return {
    parts: [
      show(moment(['You know how to measure with paper clips: from the end, with no gaps.'], 'Measure with paper clips.', start)),
      show(moment(['Now we find how much longer one thing is than another.'], 'How much longer?', set(start, ['xobj'], { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['How many clips longer, means how many extra clips.'], 'Longer by the extra clips.', set(calm(opening.end), ids('xa', 5, 3), { lit: true }))),
      turn(one, longerWhy(one)),
      show(moment(['The question has no picture. So read the two numbers, and take the small one from the big one.'], 'No picture? Big number minus small number.', set(calm(opening.end), ids('xe', 5), { lit: true }))),
      turn(two, longerWhy(two)),
      show(moment(['To find how much longer, take the small number from the big number.'], 'Longer by: big minus small.', calm(opening.end))),
    ],
  };
}

// ---- M-1-C7 Days of the week, M-1-C8 Months of the year: tomorrow, yesterday and two steps ----

interface Ring {
  names: readonly string[];
  kind: 'day' | 'month';
  cols: number;
  rows: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  w: number;
  h: number;
}

const DAY_RING: Ring = { names: DAYS, kind: 'day', cols: 10, rows: 6, cx: 5, cy: 3, rx: 3.4, ry: 2.2, w: 2.2, h: 0.55 };
const MONTH_RING: Ring = { names: MONTHS, kind: 'month', cols: 12, rows: 7, cx: 6, cy: 3.5, rx: 4.4, ry: 2.8, w: 2.2, h: 0.5 };

// The names around a circle, like a clock, so the last one leads back to the first.
function ringScene(prefix: string, ring: Ring): Scene {
  const count = ring.names.length;
  const pieces: Piece[] = ring.names.map((name, i) => {
    const turnBy = (2 * Math.PI * i) / count;
    return { id: `${prefix}${i}`, look: text(name), x: round(ring.cx + ring.rx * Math.sin(turnBy) - ring.w / 2), y: round(ring.cy - ring.ry * Math.cos(turnBy) - ring.h / 2), w: ring.w, h: ring.h };
  });
  return scene(pieces, ring.cols, ring.rows);
}

// Find the start, then take one or two steps forward or back, counting each step. The start is never counted.
function stepsMoments(prefix: string, ring: Ring, start: string, shift: number): Told {
  const list = ring.names;
  const count = list.length;
  const at = list.indexOf(start);
  const dir = shift > 0 ? 1 : -1;
  const far = Math.abs(shift);
  const place = (by: number): number => (at + dir * by + count * 2) % count;
  const answer = list[place(far)] ?? '';
  const day = ring.kind === 'day';
  const base = ringScene(prefix, ring);
  let now = point(set(base, [`${prefix}${at}`], { lit: true, badge: day ? 'today' : 'start' }), `${prefix}${at}`);
  const rule: string = day
    ? far === 1
      ? dir > 0 ? 'Tomorrow is the day after today. Take one step forward.' : 'Yesterday is the day before today. Take one step back.'
      : dir > 0 ? 'In two days means two steps forward. We do not count today.' : 'Two days ago means two steps back. We do not count today.'
    : far === 1
      ? dir > 0 ? 'After means one step forward.' : 'Before means one step back.'
      : dir > 0 ? `Two months after means two steps forward. We do not count ${start}.` : `Two months before means two steps back. We do not count ${start}.`;
  const ruleText = `${far === 1 ? 'One step' : 'Two steps'} ${dir > 0 ? 'forward' : 'back'}.`;
  const moments: Moment[] = [
    moment([day ? `Today is ${start}. Find ${start}.` : `Find ${start}.`], day ? `Today is ${start}.` : `Find ${start}.`, now),
    moment([rule], ruleText, withoutHand(now)),
  ];
  for (let step = 1; step <= far; step += 1) {
    const name = list[place(step)] ?? '';
    now = point(set(now, [`${prefix}${place(step)}`], { lit: true, badge: String(step) }), `${prefix}${place(step)}`);
    moments.push(moment([`${step === 1 ? 'One step' : 'Two steps'}: ${name}.`], `${step === 1 ? '1 step' : '2 steps'}: ${name}`, now));
  }
  const end = set(calm(withoutHand(now)), [`${prefix}${place(far)}`], { lit: true });
  const last: string = day
    ? far === 1
      ? dir > 0 ? `So tomorrow is ${answer}.` : `So yesterday was ${answer}.`
      : dir > 0 ? `So in two days it will be ${answer}.` : `So two days ago it was ${answer}.`
    : far === 1
      ? dir > 0 ? `So after ${start} comes ${answer}.` : `So before ${start} comes ${answer}.`
      : dir > 0 ? `So two months after ${start} is ${answer}.` : `So two months before ${start} is ${answer}.`;
  moments.push(moment([last], `The answer is ${answer}.`, end));
  return { moments, end };
}

const stepsWhy = (q: Question, ring: Ring): Moment[] => stepsMoments('w', ring, str(q.facts, 'start'), num(q.facts, 'shift')).moments;

function daysPart2(): Lesson {
  const ring = DAY_RING;
  const base = ringScene('x', ring);
  const lit = (names: readonly string[], badge?: string): Scene => set(base, names.map((name) => `x${ring.names.indexOf(name)}`), { lit: true, badge });
  const tomorrow = stepsMoments('x', ring, 'Wednesday', 1);
  const yesterday = stepsMoments('x', ring, 'Wednesday', -1);
  const twoOn = stepsMoments('x', ring, 'Monday', 2);
  const one = turnQuestion('M-1-C7', 3, (f) => f.shift === 2 && ['Tuesday', 'Wednesday', 'Thursday'].includes(str(f, 'start')));
  const two = turnQuestion('M-1-C7', 3, (f) => f.shift === -2 && ['Sunday', 'Monday'].includes(str(f, 'start')));
  return {
    parts: [
      show(moment(['You know the days of the week, and which day comes after, and before.'], 'The days of the week', base)),
      show(moment(['Now we use three new words: today, tomorrow, and yesterday.'], 'Today, tomorrow, yesterday', lit(['Wednesday'], 'today'))),
      ...tomorrow.moments.map(show),
      ...yesterday.moments.slice(1).map(show),
      show(moment(['Some questions ask about two days. Then we take two steps.'], 'Two days: two steps.', calm(base))),
      ...twoOn.moments.map(show),
      show(moment(['Take care. The first step lands on the next day, not on today.'], 'Do not count today.', set(lit(['Tuesday'], '1'), ['x1'], { dim: true }))),
      turn(one, stepsWhy(one, ring)),
      show(moment(['The days go round. Going back from Sunday, we come to Saturday.'], 'Before Sunday comes Saturday.', point(lit(['Sunday', 'Saturday']), 'x6'))),
      turn(two, stepsWhy(two, ring)),
      show(moment(['Tomorrow is one step forward. Yesterday is one step back. Two days is two steps.'], 'Tomorrow: forward. Yesterday: back.', calm(base))),
    ],
  };
}

function monthsPart2(): Lesson {
  const ring = MONTH_RING;
  const base = ringScene('x', ring);
  const lit = (names: readonly string[], badge?: string): Scene => set(base, names.map((name) => `x${ring.names.indexOf(name)}`), { lit: true, badge });
  const twoOn = stepsMoments('x', ring, 'May', 2);
  const twoBack = stepsMoments('x', ring, 'October', -2);
  const one = turnQuestion('M-1-C8', 3, (f) => f.shift === 2 && ['February', 'March', 'July', 'August'].includes(str(f, 'start')));
  const two = turnQuestion('M-1-C8', 3, (f) => f.shift === -2 && ['January', 'February'].includes(str(f, 'start')));
  return {
    parts: [
      show(moment(['You know the months of the year, and which month comes after, and before.'], 'The months of the year', base)),
      show(moment(['Now we move two months at a time. Two months means two steps.'], 'Two months: two steps.', lit(['May'], 'start'))),
      ...twoOn.moments.map(show),
      show(moment(['Take care. The first step lands on the next month, not on the month we start from.'], 'Do not count the start.', set(lit(['June'], '1'), ['x4'], { dim: true }))),
      show(moment(['Before means we step back instead.'], 'Before: step back.', calm(base))),
      ...twoBack.moments.map(show),
      turn(one, stepsWhy(one, ring)),
      show(moment(['The months go round. After December comes January. So, before January comes December.'], 'December and January are neighbors.', point(lit(['December', 'January']), 'x11'))),
      turn(two, stepsWhy(two, ring)),
      show(moment(['After is forward. Before is back. Two months is two steps.'], 'After: forward. Before: back.', calm(base))),
    ],
  };
}

// ---- M-1-C9 Tally charts: how many more ----

type Vote = (typeof VOTES)[number];
const ROW_Y = [0.4, 2.2, 4.0];
const MARK_H = 1.2;

// One tally mark is a stick. The fifth mark goes across the first four, to make a bundle of five.
function marks(prefix: string, value: number, y: number): Piece[] {
  return Array.from({ length: value }, (_, k): Piece => {
    const left = 2.2 + Math.floor(k / 5) * 2.6;
    if (k % 5 === 4) return { id: `${prefix}${k}`, look: text(' '), x: left - 0.15, y, w: 1.9, h: MARK_H, crossed: true };
    return { id: `${prefix}${k}`, look: text('|'), x: left + (k % 5) * 0.4, y, w: 0.4, h: MARK_H };
  });
}

function chartScene(prefix: string, vote: Vote, values: readonly number[]): Scene {
  return scene(vote.rows.flatMap((row, r): Piece[] => [{ id: `${prefix}e${r}`, look: art(row.emoji), x: 0.4, y: ROW_Y[r] ?? 0, w: MARK_H, h: MARK_H }, ...marks(`${prefix}r${r}m`, values[r] ?? 0, ROW_Y[r] ?? 0)]));
}

// Read the two rows the question names, write each count at the end of its row, then take the small one from the big one.
function tallyMoreMoments(prefix: string, vote: Vote, values: readonly number[], index: number, other: number): Told {
  const [a, b] = [values[index] ?? 0, values[other] ?? 0];
  const [big, small] = [vote.rows[index]?.label ?? '', vote.rows[other]?.label ?? ''];
  const third = 3 - index - other;
  const thirdIds = [`${prefix}e${third}`, ...ids(`${prefix}r${third}m`, values[third] ?? 0)];
  const count = (r: number, value: number): Piece => ({ id: `${prefix}v${r}`, look: numeral(value), x: 8.3, y: (ROW_Y[r] ?? 0) + 0.1, w: 1.2, h: 1, gone: true });
  const card: Piece = { id: `${prefix}card`, look: text(`${a} − ${b} = ${a - b}`), x: 2.6, y: (ROW_Y[third] ?? 0) + 0.15, w: 4.4, h: 0.9, gone: true };
  const base: Scene = { ...chartScene(prefix, vote, values), pieces: [...chartScene(prefix, vote, values).pieces, count(index, a), count(other, b), card] };
  const without = set(base, thirdIds, { dim: true });
  const rowOf = (r: number, value: number): string[] => [`${prefix}e${r}`, ...ids(`${prefix}r${r}m`, value)];
  const read = (label: string, value: number): Say =>
    value > 5
      ? [`Read the ${label} row. A bundle is five, and`, { number: value - 5 }, 'more. That is', { number: value }, '.']
      : value === 5
        ? [`Read the ${label} row. It is one bundle. That is`, { number: 5 }, '.']
        : [`Read the ${label} row. It has`, { number: value }, value === 1 ? 'mark.' : 'marks.'];
  const s1 = set(showing(without, [`${prefix}v${index}`]), [...rowOf(index, a), `${prefix}v${index}`], { lit: true });
  const s2 = set(showing(calm(s1), [`${prefix}v${other}`]), [...rowOf(other, b), `${prefix}v${other}`], { lit: true });
  const s3 = set(set(showing(calm(s2), [`${prefix}card`]), thirdIds, { gone: true }), [`${prefix}v${index}`, `${prefix}v${other}`, `${prefix}card`], { lit: true });
  const end = set(calm(s3), [`${prefix}card`, `${prefix}e${index}`], { lit: true });
  return {
    moments: [
      moment([`How many more ${vote.asked} ${big} than ${small}? Find those two rows. We do not need the other row.`], `Find ${big} and ${small}.`, point(set(without, [`${prefix}e${index}`, `${prefix}e${other}`], { lit: true }), `${prefix}e${index}`)),
      moment(read(big, a), `${big}: ${a}`, s1),
      moment(read(small, b), `${small}: ${b}`, s2),
      moment(['Now take the small number from the big number.', { number: a }, ', minus', { number: b }, ', is', { number: a - b }, '.'], `${a} − ${b} = ${a - b}`, s3),
      moment(['So', { number: a - b }, `more ${vote.asked} ${big} than ${small}.`], `${a - b} more ${vote.asked} ${big}.`, end),
    ],
    end,
  };
}

function tallyMoreWhy(q: Question): Moment[] {
  const vote = VOTES.find((each) => each.question === q.facts.vote) ?? (VOTES[0] as Vote);
  return tallyMoreMoments('w', vote, q.facts.values as number[], num(q.facts, 'index'), num(q.facts, 'other')).moments;
}

function tallyPart2(): Lesson {
  const fruit = VOTES[1] as Vote;
  const values = [3, 8, 6];
  const chart = chartScene('x', fruit, values);
  const opening = tallyMoreMoments('x', fruit, values, 1, 0);
  const valueAt = (f: Record<string, unknown>, key: string): number => (f.values as number[])[num(f, key)] ?? 0;
  const gap = (f: Record<string, unknown>): number => valueAt(f, 'index') - valueAt(f, 'other');
  const one = turnQuestion('M-1-C9', 3, (f) => f.vote !== fruit.question && gap(f) >= 2 && gap(f) <= 3 && valueAt(f, 'index') <= 6 && valueAt(f, 'other') >= 2);
  const two = turnQuestion('M-1-C9', 3, (f) => f.vote !== fruit.question && f.vote !== one.facts.vote && gap(f) >= 2 && gap(f) !== 5 && gap(f) !== gap(one.facts) && valueAt(f, 'index') >= 7 && valueAt(f, 'other') >= 2);
  return {
    parts: [
      show(moment(['You know how to read a row of tally marks. A bundle is five.'], 'A bundle is 5.', set(chart, ids('xr1m', 5), { lit: true }))),
      show(moment(['Now we look at two rows, and ask how many more one has.'], 'Two rows: how many more?', set(chart, ['xe0', 'xe1'], { lit: true }))),
      show(moment(['Children voted for a fruit. They chose apples, bananas, or grapes.'], 'Apples, bananas or grapes', set(chart, ['xe0', 'xe1', 'xe2'], { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['Read both rows first. Then it is the big number, minus the small number.'], 'Read both rows. Big minus small.', set(calm(opening.end), ['xv0', 'xv1'], { lit: true }))),
      turn(one, tallyMoreWhy(one)),
      show(moment(['Take care to read the right rows. Find each one by its picture.'], 'Find each row by its picture.', set(chart, ['xe0', 'xe1', 'xe2'], { lit: true, badge: '?' }))),
      turn(two, tallyMoreWhy(two)),
      show(moment(['How many more? Count each row, then take away.'], 'Count each row. Then take away.', calm(opening.end))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-1-B11': turnaroundPart2,
  'M-1-B12': thinkAddPart2,
  'M-1-B13': countOnPart2,
  'M-1-B14': familyPart2,
  'M-1-B15': threePart2,
  'M-1-B16': partPart2,
  'M-1-B17': balancePart2,
  'M-1-B18': countBackPart2,
  'M-1-B19': downPart2,
  'M-1-C3': graphPart2,
  'M-1-C5': clipPart2,
  'M-1-C7': daysPart2,
  'M-1-C8': monthsPart2,
  'M-1-C9': tallyPart2,
};
