import type { Countable } from '../../content/data/countables';
import { COUNTABLES } from '../../content/data/countables';
import type { EnoughPair } from '../../content/data/h1-things';
import { ENOUGH_PAIRS } from '../../content/data/h1-things';
import type { Question, Say } from '../../engine/types';
import { add, alter, art, calm, countAlong, group, ids, moment, num, numeral, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Part 2 lessons (plan section 16): a second short lesson for a skill's harder levels, offered once the child is
// about half way up the skill. Kindergarten Math: counting (A.1 to A.8, A.12, A.13), ordering (B.3), enough (B.4)
// and teen numbers (D.1).

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

function last(moments: readonly Moment[]): Scene {
  const end = moments[moments.length - 1];
  if (!end) throw new Error('No moments');
  return end.scene;
}

function find(from: Scene, id: string): Piece {
  const piece = from.pieces.find((each) => each.id === id);
  if (!piece) throw new Error(`No piece ${id}`);
  return piece;
}

const point = (from: Scene, id: string): Scene => pointAt(from, find(from, id));

// Keep some pieces lit through a count (countAlong clears every highlight before it starts).
const keepLit = (moments: Moment[], keep: readonly string[]): Moment[] => moments.map((each) => ({ ...each, scene: set(each.scene, keep, { lit: true }) }));

function thing(name: string): Countable {
  const found = COUNTABLES.find((each) => each.one === name);
  if (!found) throw new Error(`No countable called ${name}`);
  return found;
}

const many = (n: number, of: { one: string; many: string }): string => (n === 1 ? of.one : of.many);
const isAre = (n: number): string => (n === 1 ? 'is' : 'are');
const an = (n: number): string => (n === 8 || n === 11 || n === 18 ? 'an' : 'a');
const numbers = (f: Record<string, unknown>, key: string): number[] => {
  const value = f[key];
  if (!Array.isArray(value) || !value.every((each) => typeof each === 'number')) throw new Error(`facts.${key} is not a list of numbers`);
  return value as number[];
};

// "two, three, four", said with a little pause between the numbers.
const sayList = (values: readonly number[]): Say => values.flatMap((value, i): Say => (i === 0 ? [{ number: value }] : [',', { number: value }]));

const COUNTER = '🔴';

// ---- A.1 Count to 20: scattered things, bigger groups, and typing the number ----

// Things in the question's own places: a grid five wide, read row by row.
function spread(p: string, emoji: string, slots: readonly number[]): Scene {
  return scene(slots.map((slot, i): Piece => ({ id: `${p}${i}`, look: art(emoji), x: 2.5 + (slot % 5), y: 0.4 + Math.floor(slot / 5) * 1.1 })));
}

const inRows = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

function countAll(start: Scene, pieceIds: readonly string[], of: Countable): Moment[] {
  const n = pieceIds.length;
  const counted = countAlong(start, pieceIds);
  const all = set(counted.end, pieceIds, { lit: true });
  return [
    ...counted.moments,
    moment(['The last number we said is', { number: n }, '.'], `The last number is ${n}.`, counted.end),
    moment(['So there', isAre(n), { number: n }, `${many(n, of)}.`], `There ${isAre(n)} ${n} ${many(n, of)}.`, all),
  ];
}

function countBigWhy(question: Question): Moment[] {
  const n = num(question.facts, 'n');
  const of = thing(str(question.facts, 'thing'));
  const slots = Array.isArray(question.facts.slots) ? numbers(question.facts, 'slots').slice().sort((x, y) => x - y) : inRows(n);
  const start = spread('w', of.emoji, slots);
  const top = slots.filter((slot) => slot < 5).map((_, i) => `w${i}`);
  return [moment(['Start at the top row, and go from left to right.'], 'Top row first, left to right.', set(start, top, { lit: true })), ...countAll(start, ids('w', n), of)];
}

function countBigLesson(): Lesson {
  const star = thing('star');
  const duck = thing('duck');
  const slots = [1, 3, 5, 7, 8, 11, 12, 16, 19];
  const stars = spread('x', star.emoji, slots);
  const topRow = set(stars, ['x0', 'x1'], { lit: true });
  const counted = countAll(stars, ids('x', 9), star);
  const ducks = spread('y', duck.emoji, inRows(13));
  const countedDucks = countAll(ducks, ids('y', 13), duck);
  const typed = add(last(countedDucks), [
    { id: 'yn1', look: numeral(1), x: 8, y: 1.8, w: 0.9, h: 1.3, lit: true },
    { id: 'yn2', look: numeral(3), x: 8.9, y: 1.8, w: 0.9, h: 1.3, lit: true },
  ]);
  const first = turnQuestion('M-K-A1', 4, (f) => num(f, 'n') <= 10 && num(f, 'n') !== 9 && f.thing !== 'star' && f.thing !== 'duck');
  const second = turnQuestion('M-K-A1', 3, (f) => num(f, 'n') >= 15 && num(f, 'n') <= 18 && f.thing !== 'duck' && f.thing !== first.facts.thing);
  return {
    parts: [
      show(moment(['You know how to count. Touch each one, and say one number.'], 'Touch each one. Say one number.', set(stars, ['x0'], { lit: true }))),
      show(moment(['Now the stars are not in neat rows. Where do we start?'], 'Where do we start?', stars)),
      show(moment(['Start at the top row, and go from left to right.'], 'Top row first, left to right.', topRow)),
      ...counted.map(show),
      show(moment(['Going row by row, we touch each one once, and we miss none.'], 'Row by row. Miss none.', calm(last(counted)))),
      turn(first, countBigWhy(first)),
      show(moment(['Bigger groups are counted the same way, row by row.'], 'Bigger groups: row by row.', ducks)),
      ...countedDucks.map(show),
      show(moment(['Sometimes there are no answers to pick, and you type the number. For', { number: 13 }, ', tap one, then three.'], '13: tap 1, then 3.', typed)),
      turn(second, countBigWhy(second)),
      show(moment(['Go row by row, and touch each one once. The last number tells how many.'], 'Row by row. The last number tells how many.', calm(last(countedDucks)))),
    ],
  };
}

// ---- Ten frames (A.2, A.3): typing the number, and counting back from a full frame ----

function framePieces(p: string, x0: number, y0: number, filled: number): Piece[] {
  const cells: Piece[] = Array.from({ length: 10 }, (_, i) => ({ id: `${p}c${i}`, look: { kind: 'cell' }, x: x0 + (i % 5), y: y0 + Math.floor(i / 5) }));
  return [...cells, ...group(`${p}d`, art(COUNTER), filled, x0, y0, 5)];
}

// Counting back from `full`: one number for each empty box, each lit in turn with its number above it.
function countBack(start: Scene, cellIds: readonly string[], full: number): { moments: Moment[]; end: Scene } {
  let now = calm(start);
  const moments: Moment[] = [];
  cellIds.forEach((id, i) => {
    const n = full - 1 - i;
    now = point(alter(now, (each) => (each.id === id ? { ...each, lit: true, badge: String(n) } : each.badge ? { ...each, badge: undefined } : each)), id);
    moments.push(moment([{ number: n }], String(n), now));
  });
  return { moments, end: withoutHand(now) };
}

// One frame: count on from a full row of five, or count back from ten when only a box or two is empty.
function oneFrame(p: string, n: number): Moment[] {
  const start = scene(framePieces(p, 2.5, 2, n));
  const dots = ids(`${p}d`, n);
  const total = (from: Scene): Moment => moment(['So there', isAre(n), { number: n }, n === 1 ? 'counter.' : 'counters.'], `${n} ${n === 1 ? 'counter' : 'counters'}`, set(from, dots, { lit: true }));
  if (n < 5) {
    const counted = countAlong(start, dots);
    return [moment(['Count the counters, one at a time.'], 'Count the counters.', start), ...counted.moments, total(counted.end)];
  }
  if (n === 10) return [moment(['Both rows are full. A full frame is', { number: 10 }, '.'], 'A full frame is 10.', set(start, dots, { lit: true }))];
  if (n >= 8) {
    const empties = ids(`${p}c`, 10 - n, n).reverse();
    const back = countBack(start, empties, 10);
    return [
      moment(['A full frame would be ten.'], 'A full frame would be 10.', set(start, ids(`${p}c`, 10), { lit: true })),
      moment(['Count back, one number for each empty box.'], 'Count back for each empty box.', set(start, empties, { lit: true })),
      ...back.moments,
      total(back.end),
    ];
  }
  const top = ids(`${p}d`, 5);
  const row = set(start, top, { lit: true });
  const out = [moment(['The top row is full. A full row is five.'], 'A full row is 5.', row)];
  if (n === 5) return [...out, total(row)];
  const counted = countAlong(row, ids(`${p}d`, n - 5, 5), 5);
  return [...out, moment(['Start at five, and count on.'], 'Start at 5. Count on.', row), ...keepLit(counted.moments, top), total(counted.end)];
}

function tenFrameTypedLesson(): Lesson {
  const full = set(scene(framePieces('x', 2.5, 2, 10)), ids('xd', 10), { lit: true });
  const nine = set(calm(full), ['xd9'], { gone: true });
  const top = ids('xd', 5);
  const row = set(nine, top, { lit: true });
  const check = countAlong(row, ids('xd', 4, 5), 5);
  const six = oneFrame('y', 6);
  const ten = add(set(scene(framePieces('z', 2.5, 2, 10)), ids('zd', 10), { lit: true }), [
    { id: 'zn1', look: numeral(1), x: 4.1, y: 4.3, w: 0.9, h: 1.3, lit: true },
    { id: 'zn2', look: numeral(0), x: 5, y: 4.3, w: 0.9, h: 1.3, lit: true },
  ]);
  const first = turnQuestion('M-K-A2', 3, (f) => num(f, 'n') === 8);
  const second = turnQuestion('M-K-A2', 3, (f) => num(f, 'n') === 7);
  return {
    parts: [
      show(moment(['You know that a full row is five, and a full frame is ten.'], 'A full row is 5. A full frame is 10.', full)),
      show(moment(['Now there are no answers to pick. You find the number, and type it.'], 'Find the number and type it.', calm(full))),
      show(moment(['Look at this frame. Only one box is empty.'], 'One box is empty.', set(nine, ['xc9'], { lit: true }))),
      show(moment(['A full frame would be ten. One less than ten, is', { number: 9 }, '.'], 'One less than 10 is 9.', set(nine, ids('xd', 9), { lit: true }))),
      show(moment(['Let us check. Start at five, and count on.'], 'Check: start at 5. Count on.', row)),
      ...keepLit(check.moments, top).map(show),
      show(moment(['Yes,', { number: 9 }, '. The empty boxes tell us how far we are from ten.'], 'Empty boxes: how far from 10.', set(check.end, ['xc9'], { lit: true }))),
      turn(first, oneFrame('w', num(first.facts, 'n'))),
      show(moment(['When only a few counters are in the bottom row, it is quicker to count on from five.'], 'A few below: count on from 5.', calm(last(six)))),
      ...six.slice(1).map(show),
      show(moment(['A full frame is ten. To type ten, tap one, then zero.'], '10: tap 1, then 0.', ten)),
      turn(second, oneFrame('w', num(second.facts, 'n'))),
      show(moment(['Count on from five, or count back from ten. Pick the quick way.'], 'Count on from 5, or back from 10.', calm(ten))),
    ],
  };
}

const FRAMES_COLS = 11;

function twoFrames(p: string, n: number): Scene {
  const written: Piece[] = [
    { id: `${p}n1`, look: numeral(Math.floor(n / 10)), x: 2.25, y: 4.4, w: 1, h: 1.2, gone: true },
    { id: `${p}n2`, look: numeral(n % 10), x: 7.75, y: 4.4, w: 1, h: 1.2, gone: true },
  ];
  return scene([...framePieces(`${p}a`, 0.25, 2, 10), ...framePieces(`${p}b`, 5.75, 2, n - 10), ...written], FRAMES_COLS, 6);
}

// How the number is written: a one for the full frame, then the number of extra counters.
function writtenMoment(p: string, n: number, from: Scene): Moment {
  const lit = set(calm(from), [`${p}n1`, `${p}n2`], { gone: false, lit: true });
  if (n === 20) return moment(['We write', { number: 20 }, 'as a two, then a zero.'], '20: a 2, then a 0', lit);
  return moment(['We write', { number: n }, 'as a one, for the full frame, then', an(n - 10), { number: n - 10 }, '.'], `${n}: a 1, then ${an(n - 10)} ${n - 10}`, lit);
}

// Two frames: ten for the full one, then count on, or count back from twenty when only a box or two is empty.
function twoFrameMoments(p: string, n: number): Moment[] {
  const extra = n - 10;
  const ten = ids(`${p}ad`, 10);
  const more = ids(`${p}bd`, extra);
  const start = twoFrames(p, n);
  const lit = set(start, ten, { lit: true });
  const out = [moment(['This frame is full. That is ten.'], 'A full frame is 10.', lit)];
  const done = (from: Scene): Moment => moment(['Ten, and', { number: extra }, 'more, make', { number: n }, '.'], `10 and ${extra} more make ${n}`, set(from, [...ten, ...more], { lit: true }));
  if (extra === 10) {
    const both = moment(['The other frame is full too. Ten, and ten more, make', { number: 20 }, '.'], '10 and 10 make 20', set(lit, more, { lit: true }));
    return [...out, both, writtenMoment(p, n, both.scene)];
  }
  if (extra >= 8) {
    const empties = ids(`${p}bc`, 10 - extra, extra).reverse();
    const back = countBack(lit, empties, 20);
    const total = moment(['So there are', { number: n }, 'counters.'], `${n} counters`, set(back.end, [...ten, ...more], { lit: true }));
    return [
      ...out,
      moment(['Two full frames would be twenty.'], '2 full frames would be 20.', set(lit, ids(`${p}bc`, 10), { lit: true })),
      moment(['Count back, one number for each empty box.'], 'Count back for each empty box.', set(lit, empties, { lit: true })),
      ...keepLit(back.moments, ten),
      total,
      writtenMoment(p, n, total.scene),
    ];
  }
  if (extra >= 5) {
    const top = ids(`${p}bd`, 5);
    const row = set(lit, top, { lit: true });
    out.push(moment(['Here the top row is full. Ten, and five more, make fifteen.'], '10 and 5 make 15', row));
    if (extra === 5) return [...out, writtenMoment(p, n, row)];
    out.push(moment(['Start at fifteen, and count on.'], 'Start at 15. Count on.', row));
    const counted = countAlong(row, ids(`${p}bd`, extra - 5, 5), 15);
    const end = done(counted.end);
    return [...out, ...keepLit(counted.moments, [...ten, ...top]), end, writtenMoment(p, n, end.scene)];
  }
  out.push(moment(['Start at ten, and count on.'], 'Start at 10. Count on.', lit));
  const counted = countAlong(lit, more, 10);
  const end = done(counted.end);
  return [...out, ...keepLit(counted.moments, ten), end, writtenMoment(p, n, end.scene)];
}

function tenFramesTypedLesson(): Lesson {
  const fourteen = twoFrameMoments('x', 14);
  const opening = fourteen[0]?.scene ?? last(fourteen);
  const nineteen = twoFrames('y', 19);
  const tenLit = set(nineteen, ids('yad', 10), { lit: true });
  const oneEmpty = set(tenLit, ['ybc9'], { lit: true });
  const allLit = set(nineteen, [...ids('yad', 10), ...ids('ybd', 9)], { lit: true });
  const first = turnQuestion('M-K-A3', 3, (f) => num(f, 'n') >= 12 && num(f, 'n') <= 13);
  const second = turnQuestion('M-K-A3', 3, (f) => num(f, 'n') === 18);
  return {
    parts: [
      show(moment(['You know that a full frame is ten, and then we count on.'], 'A full frame is 10. Then count on.', opening)),
      show(moment(['Now you type the number yourself. Let us see how it is written.'], 'Now you type the number.', calm(opening))),
      ...fourteen.slice(1).map(show),
      show(moment(['The one is the full ten. The number after it tells how many more.'], 'The 1 is the ten. Then how many more.', set(last(fourteen), [...ids('xad', 10), ...ids('xbd', 4)], { lit: true }))),
      turn(first, twoFrameMoments('w', num(first.facts, 'n'))),
      show(moment(['Look at these frames. Only one box is empty.'], 'One box is empty.', oneEmpty)),
      show(moment(['Two full frames would be twenty. One less than twenty, is', { number: 19 }, '.'], 'One less than 20 is 19.', allLit)),
      show(writtenMoment('y', 19, allLit)),
      turn(second, twoFrameMoments('w', num(second.facts, 'n'))),
      show(moment(['Start at ten and count on, or count back from twenty. Then type the one first.'], 'Count on from 10, or back from 20.', calm(allLit))),
    ],
  };
}

// ---- Rows of big numbers (A.4, A.6, A.7, A.12): each number is drawn digit by digit, so one digit can light up ----

const SLOT = 1.6; // the width of one number in a row
const SLOT_GAP = 0.6;
const slotX = (i: number, length: number): number => (10 - (length * SLOT + (length - 1) * SLOT_GAP)) / 2 + i * (SLOT + SLOT_GAP);

// One number as its front number (the tens) and its back number (the ones).
function numberPieces(id: string, value: number, x: number, y: number, w = SLOT, h = 1.3): Piece[] {
  if (value < 10) return [{ id: `${id}o`, look: text(String(value)), x: x + w / 4, y, w: w / 2, h }];
  const front = String(Math.floor(value / 10));
  const fw = front.length === 1 ? w / 2 : (w * 2) / 3;
  return [
    { id: `${id}t`, look: text(front), x, y, w: fw, h },
    { id: `${id}o`, look: text(String(value % 10)), x: x + fw, y, w: w - fw, h },
  ];
}
const numberIds = (id: string, value: number): string[] => (value < 10 ? [`${id}o`] : [`${id}t`, `${id}o`]);

// A row of numbers with an empty box where one is missing. The missing number's digits wait, hidden, in its place.
function digitRow(p: string, values: readonly number[], blank: number, y = 2): Scene {
  const pieces = values.flatMap((value, i) => numberPieces(`${p}${i}`, value, slotX(i, values.length), y).map((piece): Piece => (i === blank ? { ...piece, gone: true } : piece)));
  return scene([...pieces, { id: `${p}box`, look: { kind: 'box' }, x: slotX(blank, values.length), y, w: SLOT, h: 1.3 }]);
}

const litNumber = (from: Scene, p: string, i: number, value: number): Scene => set(from, numberIds(`${p}${i}`, value), { lit: true });
const handAt = (from: Scene, p: string, i: number): Scene => point(from, `${p}${i}o`);
// The box goes and the missing number shows, lit.
const fillBox = (from: Scene, p: string, i: number, value: number): Scene => set(set(from, [`${p}box`], { gone: true }), numberIds(`${p}${i}`, value), { gone: false, lit: true });
const allNumbers = (p: string, values: readonly number[]): string[] => values.flatMap((value, i) => numberIds(`${p}${i}`, value));

const rowValues = (f: Record<string, unknown>): number[] => Array.from({ length: num(f, 'length') }, (_, i) => num(f, 'start') + num(f, 'step') * i);

// "What comes next?" with big numbers: the back number goes up by one, and after a nine a new ten begins.
function nextMoments(p: string, values: readonly number[]): Moment[] {
  const blank = values.length - 1;
  const answer = values[blank] as number;
  const before = values[blank - 1] as number;
  const start = digitRow(p, values, blank);
  const known = values.slice(0, blank);
  let now = start;
  known.forEach((value, i) => {
    now = litNumber(now, p, i, value);
  });
  const out = [moment([...sayList(known), '.'], known.join(', '), now)];
  const ones = set(calm(now), [`${p}${blank - 1}o`], { lit: true });
  const filled = fillBox(calm(now), p, blank, answer);
  if (answer === 100) {
    out.push(moment([{ number: before }, 'ends in a nine, and its front number is nine too.'], `${before}: two nines`, set(ones, [`${p}${blank - 1}t`], { lit: true })));
    out.push(moment(['After', { number: 99 }, 'comes a very big ten:', { number: 100 }, '.'], 'After 99 comes 100.', filled));
  } else if (answer % 10 === 0) {
    out.push(moment([{ number: before }, 'ends in a nine.'], `${before} ends in 9.`, ones));
    out.push(moment(['After a nine, the back number starts again at zero, and the front number goes up by one.'], 'After 9: back to 0, front goes up 1.', filled));
  } else if (before < 10) {
    out.push(moment(['One more than', { number: before }, ', is', { number: answer }, '.'], `${before} + 1 = ${answer}`, filled));
  } else {
    out.push(moment(['Look at the back number of', { number: before }, '. It is', { number: before % 10 }, '.'], `The back number is ${before % 10}.`, ones));
    out.push(moment(['One more than', { number: before % 10 }, ', is', { number: answer % 10 }, '. The front number stays the same.'], `Back number: ${before % 10} + 1 = ${answer % 10}`, set(calm(filled), [`${p}${blank}o`], { lit: true })));
  }
  out.push(moment(['Next is', { number: answer }, '.'], `Next is ${answer}.`, set(filled, allNumbers(p, values), { lit: true })));
  return out;
}

const nextWhy = (question: Question): Moment[] => [moment(['Let us read the row.'], 'Read the row.', set(digitRow('w', rowValues(question.facts), num(question.facts, 'length') - 1), ['wbox'], { lit: true })), ...nextMoments('w', rowValues(question.facts))];

function nextBigLesson(): Lesson {
  const values = [41, 42, 43, 44];
  const row = digitRow('x', values, 3);
  const parts41 = alter(row, (piece) => (piece.id === 'x0t' ? { ...piece, lit: true, badge: 'front' } : piece.id === 'x0o' ? { ...piece, lit: true, badge: 'back' } : piece));
  const backs = set(row, ['x0o', 'x1o', 'x2o'], { lit: true });
  const filled = fillBox(row, 'x', 3, 44);
  const nextBack = set(set(filled, ['x3t'], { lit: undefined }), ['x0o', 'x1o', 'x2o'], { lit: true });
  const fronts = set(calm(filled), ['x0t', 'x1t', 'x2t', 'x3t'], { lit: true });
  const crossing = [27, 28, 29, 30];
  const crossRow = digitRow('y', crossing, 3);
  const crossed = nextMoments('y', crossing);
  const first = turnQuestion('M-K-A4', 3, (f) => num(f, 'start') % 10 >= 1 && num(f, 'start') % 10 <= 5 && num(f, 'start') !== 41);
  const second = turnQuestion('M-K-A4', 4, (f) => num(f, 'start') % 10 === 7 && num(f, 'start') !== 27 && num(f, 'start') !== 97);
  return {
    parts: [
      show(moment(['You know that the next number is one more.'], 'The next number is 1 more.', set(row, ['xbox'], { lit: true }))),
      show(moment(['Big numbers have two parts. In', { number: 41 }, ', the front number is', { number: 4 }, ', and the back number is', { number: 1 }, '.'], '41: front 4, back 1', parts41)),
      show(moment(['Look at the back numbers:', ...sayList([1, 2, 3]), '. They count up by one.'], 'Back numbers: 1, 2, 3', backs)),
      show(moment(['So the next back number is', { number: 4 }, '.'], 'The next back number is 4.', nextBack)),
      show(moment(['The front number stays the same. It is still', { number: 4 }, '.'], 'The front number stays 4.', fronts)),
      show(moment(['So next is', { number: 44 }, '.'], 'Next is 44.', set(filled, allNumbers('x', values), { lit: true }))),
      turn(first, nextWhy(first)),
      show(moment(['But what comes after a nine?'], 'What comes after a 9?', set(crossRow, ['y2o'], { lit: true }))),
      ...crossed.map(show),
      turn(second, nextWhy(second)),
      show(moment(['The back number goes up by one. After a nine, a new ten begins.'], 'Back number up by 1. After 9, a new ten.', calm(last(crossed)))),
    ],
  };
}

// "Which number is missing?" in a row that counts up or back by one: go from the number before the box, then
// check with the number after it. When the box is first, go from the number after it.
function missingMoments(p: string, values: readonly number[], blank: number): Moment[] {
  const answer = values[blank] as number;
  const up = (values[1] as number) > (values[0] as number);
  const start = digitRow(p, values, blank);
  const out: Moment[] = [];
  let filled: Scene;
  if (blank === 0) {
    const known = values[1] as number;
    const at = handAt(litNumber(start, p, 1, known), p, 1);
    out.push(moment(['The box is first, so look at the number after it,', { number: known }, '.'], `Look at ${known}.`, at));
    filled = fillBox(withoutHand(at), p, 0, answer);
    out.push(
      up
        ? moment(['The missing number is one less. One less than', { number: known }, ', is', { number: answer }, '.'], `${known} - 1 = ${answer}`, filled)
        : moment(['We are counting back, so the first number is one more. One more than', { number: known }, ', is', { number: answer }, '.'], `${known} + 1 = ${answer}`, filled),
    );
  } else {
    const known = values[blank - 1] as number;
    const at = handAt(litNumber(start, p, blank - 1, known), p, blank - 1);
    out.push(moment(['The number before the box is', { number: known }, '.'], `Before the box: ${known}`, at));
    filled = fillBox(withoutHand(at), p, blank, answer);
    if (up && answer % 10 === 0) out.push(moment(['After', { number: known }, ', a new ten begins:', { number: answer }, '.'], `After ${known} comes ${answer}.`, filled));
    else out.push(moment([up ? 'One more than' : 'One less than', { number: known }, ', is', { number: answer }, '.'], `${known} ${up ? '+' : '-'} 1 = ${answer}`, filled));
    const after = values[blank + 1];
    if (after !== undefined) out.push(moment(['Check with the next number:', { number: answer }, ',', { number: after }, '. It fits.'], `Check: ${answer}, ${after}`, litNumber(calm(filled), p, blank + 1, after)));
  }
  out.push(moment(['The missing number is', { number: answer }, '.'], `The missing number is ${answer}.`, set(calm(filled), allNumbers(p, values), { lit: true })));
  return out;
}

const missingWhy = (question: Question): Moment[] => {
  const values = rowValues(question.facts);
  const blank = num(question.facts, 'blankIndex');
  return [moment(['Find the box in the row.'], 'Find the box.', set(digitRow('w', values, blank), ['wbox'], { lit: true })), ...missingMoments('w', values, blank)];
};

function missingBigLesson(): Lesson {
  const opening = missingMoments('x', [34, 35, 36, 37], 1);
  const crossing = missingMoments('y', [48, 49, 50, 51], 2);
  const front = missingMoments('z', [59, 60, 61, 62], 0);
  const first = turnQuestion('M-K-A6', 3, (f) => (num(f, 'blankIndex') === 1 || num(f, 'blankIndex') === 2) && num(f, 'start') % 10 <= 5 && num(f, 'start') % 10 >= 1 && num(f, 'start') !== 34 && num(f, 'start') >= 20);
  const second = turnQuestion('M-K-A6', 4, (f) => (num(f, 'blankIndex') === 1 || num(f, 'blankIndex') === 2) && (num(f, 'start') + num(f, 'blankIndex')) % 10 === 0 && num(f, 'start') !== 48 && num(f, 'start') + num(f, 'blankIndex') < 100);
  return {
    parts: [
      show(moment(['You know how to count along a row, to find the missing number.'], 'Count along to find the missing number.', set(digitRow('x', [34, 35, 36, 37], 1), ['xbox'], { lit: true }))),
      show(moment(['Big numbers work the same way.'], 'Big numbers work the same way.', digitRow('x', [34, 35, 36, 37], 1))),
      ...opening.map(show),
      turn(first, missingWhy(first)),
      show(moment(['Watch out when the number before the box ends in a nine.'], 'Watch out after a 9.', set(digitRow('y', [48, 49, 50, 51], 2), ['y1o'], { lit: true }))),
      ...crossing.slice(0, -1).map(show),
      show(moment(['Sometimes the box comes first.'], 'The box can come first.', set(digitRow('z', [59, 60, 61, 62], 0), ['zbox'], { lit: true }))),
      ...front.slice(0, -1).map(show),
      turn(second, missingWhy(second)),
      show(moment(['Go one more from the number before the box. Then check with the number after it.'], 'One more, then check.', calm(last(opening)))),
    ],
  };
}

function countBackBigLesson(): Lesson {
  const opening = missingMoments('x', [23, 22, 21, 20], 2);
  const crossing = missingMoments('y', [21, 20, 19, 18], 2);
  const front = missingMoments('z', [15, 14, 13, 12], 0);
  const answerOf = (f: Record<string, unknown>): number => num(f, 'start') - num(f, 'blankIndex');
  const first = turnQuestion('M-K-A12', 3, (f) => num(f, 'blankIndex') >= 1 && num(f, 'start') >= 24 && answerOf(f) % 10 !== 9);
  const second = turnQuestion('M-K-A12', 3, (f) => num(f, 'blankIndex') === 0 && num(f, 'start') >= 8 && num(f, 'start') !== 15 && num(f, 'start') !== answerOf(first.facts));
  return {
    parts: [
      show(moment(['You know that counting back goes down by one.'], 'Counting back goes down by 1.', set(digitRow('x', [23, 22, 21, 20], 2), ['xbox'], { lit: true }))),
      show(moment(['Now the numbers are bigger, and you type the answer yourself.'], 'Bigger numbers. Type the answer.', digitRow('x', [23, 22, 21, 20], 2))),
      ...opening.map(show),
      show(moment(['Watch out when we count back past a ten.'], 'Watch out at a ten.', litNumber(digitRow('y', [21, 20, 19, 18], 2), 'y', 1, 20))),
      ...crossing.slice(1, -1).map(show),
      turn(first, missingWhy(first)),
      show(moment(['Sometimes the box comes first.'], 'The box can come first.', set(digitRow('z', [15, 14, 13, 12], 0), ['zbox'], { lit: true }))),
      ...front.slice(0, -1).map(show),
      show(moment([...sayList([15, 14, 13, 12]), '. Each number is one less.'], '15, 14, 13, 12', set(last(front), allNumbers('z', [15, 14, 13, 12]), { lit: true }))),
      turn(second, missingWhy(second)),
      show(moment(['Counting back, each number is one less. If the box is first, go one more.'], 'One less each time. Box first: one more.', calm(last(front)))),
    ],
  };
}

// ---- A.7 Count by tens: a missing ten anywhere in the row ----

const TENS = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);

// The row of tens with its box, above a strip of every ten from 10 to 100.
function tensScene(p: string, values: readonly number[], blank: number): Scene {
  const strip = TENS.map((value, i): Piece => ({ id: `${p}s${value}`, look: numeral(value), x: i, y: 4.6, w: 1, h: 0.9, dim: true }));
  return add(digitRow(p, values, blank, 1.4), strip);
}
const onStrip = (from: Scene, p: string, values: readonly number[]): Scene => set(from, values.map((value) => `${p}s${value}`), { dim: undefined, lit: true });

function tensMoments(p: string, values: readonly number[], blank: number): Moment[] {
  const answer = values[blank] as number;
  const start = tensScene(p, values, blank);
  const ref = blank === 0 ? 1 : blank - 1;
  const known = values[ref] as number;
  const at = handAt(onStrip(litNumber(start, p, ref, known), p, [known]), p, ref);
  const filled = onStrip(fillBox(withoutHand(at), p, blank, answer), p, [answer]);
  const fronts = set(calm(filled), values.map((_, i) => `${p}${i}t`), { lit: true });
  const all = onStrip(set(calm(filled), allNumbers(p, values), { lit: true }), p, values);
  return [
    blank === 0 ? moment(['The box is first, so look at the number after it,', { number: known }, '.'], `Look at ${known}.`, at) : moment(['The number before the box is', { number: known }, '.'], `Before the box: ${known}`, at),
    blank === 0 ? moment(['The missing number is ten less. Ten less than', { number: known }, ', is', { number: answer }, '.'], `${known} - 10 = ${answer}`, filled) : moment(['Counting by tens, each number is ten more. Ten more than', { number: known }, ', is', { number: answer }, '.'], `${known} + 10 = ${answer}`, filled),
    moment(['Look at the front numbers:', ...sayList(values.map((value) => value / 10)), '. They count up by one.'], `Front numbers: ${values.map((value) => value / 10).join(', ')}`, fronts),
    moment(['Count by tens:', ...sayList(values), '.'], values.join(', '), all),
    moment(['The missing number is', { number: answer }, '.'], `The missing number is ${answer}.`, all),
  ];
}

const tensWhy = (question: Question): Moment[] => {
  const values = rowValues(question.facts);
  const blank = num(question.facts, 'blankIndex');
  return [moment(['Find the box in the row of tens.'], 'Find the box.', set(tensScene('w', values, blank), ['wbox'], { lit: true })), ...tensMoments('w', values, blank)];
};

function missingTenLesson(): Lesson {
  const values = [30, 40, 50, 60];
  const start = tensScene('x', values, 1);
  const opening = tensMoments('x', values, 1);
  const front = [50, 60, 70, 80];
  const frontStart = tensScene('y', front, 0);
  const frontMoments = tensMoments('y', front, 0);
  const first = turnQuestion('M-K-A7', 3, (f) => (num(f, 'blankIndex') === 1 || num(f, 'blankIndex') === 2) && num(f, 'start') !== 30);
  const second = turnQuestion('M-K-A7', 3, (f) => num(f, 'blankIndex') === 0 && num(f, 'start') !== 50 && num(f, 'start') !== num(first.facts, 'start') && num(f, 'start') >= 20);
  return {
    parts: [
      show(moment(['You know how to count by tens:', ...sayList([10, 20, 30, 40]), ', and on.'], '10, 20, 30, 40 ...', onStrip(start, 'x', [10, 20, 30, 40]))),
      show(moment(['Now a ten is missing from the middle of a row.'], 'A ten is missing.', set(start, ['xbox'], { lit: true }))),
      ...opening.slice(0, 4).map(show),
      show(moment(['The front numbers count just like one, two, three. That is a good trick.'], 'Front numbers count by ones.', last(opening.slice(0, 3)))),
      turn(first, tensWhy(first)),
      show(moment(['Sometimes the box comes first.'], 'The box can come first.', set(frontStart, ['ybox'], { lit: true }))),
      ...frontMoments.slice(0, 4).map(show),
      turn(second, tensWhy(second)),
      show(moment(['Ten more takes us forward. Ten less takes us back.'], '10 more: forward. 10 less: back.', calm(last(frontMoments)))),
    ],
  };
}

// ---- A.5 Before and after: bigger numbers, and stepping past a ten ----

// Ten numbers in a line, starting at `from`.
function lineScene(p: string, from: number, y = 2): Scene {
  return scene(Array.from({ length: 10 }, (_, i): Piece => ({ id: `${p}n${from + i}`, look: numeral(from + i), x: i, y })));
}

function sideMoments(p: string, n: number, side: 'after' | 'before', from = Math.max(1, n - 4)): Moment[] {
  const target = side === 'after' ? n + 1 : n - 1;
  const found = point(set(lineScene(p, from), [`${p}n${n}`], { lit: true }), `${p}n${n}`);
  const stepped = point(set(found, [`${p}n${target}`], { lit: true }), `${p}n${target}`);
  const step: Say =
    side === 'after'
      ? target % 10 === 0
        ? [{ number: n }, 'ends in a nine. One step forward starts a new ten:', { number: target }, '.']
        : ['Take one step forward, to', { number: target }, '.']
      : n % 10 === 0
        ? ['One step back from', { number: n }, 'lands on a nine:', { number: target }, '.']
        : ['Take one step back, to', { number: target }, '.'];
  return [
    moment(['Find', { number: n }, 'on the number line.'], `Find ${n}.`, found),
    moment(step, side === 'after' ? `One step forward: ${target}` : `One step back: ${target}`, stepped),
    moment([{ number: target }, `comes ${side}`, { number: n }, '.'], `${target} comes ${side} ${n}.`, withoutHand(stepped)),
  ];
}

const sideWhy = (question: Question): Moment[] => sideMoments('w', num(question.facts, 'n'), str(question.facts, 'side') === 'before' ? 'before' : 'after');

function beforeAfterBigLesson(): Lesson {
  const teens = lineScene('x', 11);
  const before17 = sideMoments('x', 17, 'before', 11);
  const after29 = sideMoments('y', 29, 'after', 25);
  const before50 = sideMoments('z', 50, 'before', 45);
  const first = turnQuestion('M-K-A5', 3, (f) => num(f, 'n') >= 12 && num(f, 'n') <= 18 && num(f, 'n') !== 17 && num(f, 'n') !== 16);
  const second = turnQuestion('M-K-A5', 4, (f) => f.side === 'before' && num(f, 'n') % 10 === 0 && num(f, 'n') !== 50);
  return {
    parts: [
      show(moment(['You know that after is one step forward, and before is one step back.'], 'After: forward. Before: back.', set(teens, ['xn14', 'xn15', 'xn16'], { lit: true }))),
      show(moment(['It is the same with bigger numbers. What comes before', { number: 17 }, '?'], 'What comes before 17?', teens)),
      ...before17.map(show),
      turn(first, sideWhy(first)),
      show(moment(['Now even bigger numbers. Watch out at a nine.'], 'Watch out at a 9.', set(lineScene('y', 25), ['yn29'], { lit: true }))),
      ...after29.slice(1).map(show),
      show(moment(['Going back from a ten is tricky too.'], 'Going back from a ten.', set(lineScene('z', 45), ['zn50'], { lit: true }))),
      ...before50.slice(1).map(show),
      turn(second, sideWhy(second)),
      show(moment(['After is one step forward. Before is one step back, even past a ten.'], 'One step forward, or one step back.', calm(last(before50)))),
    ],
  };
}

// ---- A.8 Count one kind: many more, typed ----

function mixedScene(p: string, n: number, slots: readonly number[], a: string, b: string): Scene {
  return scene(slots.map((slot, i): Piece => ({ id: i < n ? `${p}a${i}` : `${p}b${i - n}`, look: art(i < n ? a : b), x: 2.5 + (slot % 5), y: 0.4 + Math.floor(slot / 5) * 1.1 })));
}

// The ids of the kind we count, in reading order: top row first, left to right.
const readingOrder = (p: string, n: number, slots: readonly number[]): string[] =>
  Array.from({ length: n }, (_, i) => i)
    .sort((x, y) => (slots[x] as number) - (slots[y] as number))
    .map((i) => `${p}a${i}`);

function oneKind(p: string, n: number, slots: readonly number[], of: Countable, other: Countable): Moment[] {
  const faded = set(mixedScene(p, n, slots, of.emoji, other.emoji), ids(`${p}b`, slots.length - n), { dim: true });
  const order = readingOrder(p, n, slots);
  const counted = countAlong(faded, order);
  return [
    moment([`We count only the ${of.many}, so let us fade the ${other.many}.`], `Count only the ${of.many}.`, faded),
    ...counted.moments,
    moment(['There', isAre(n), { number: n }, `${many(n, of)}.`], `${n} ${many(n, of)}`, set(counted.end, order, { lit: true })),
  ];
}

function oneKindWhy(question: Question): Moment[] {
  const f = question.facts;
  return oneKind('w', num(f, 'n'), numbers(f, 'slots'), thing(str(f, 'thing')), thing(str(f, 'other')));
}

function countOneKindBigLesson(): Lesson {
  const star = thing('star');
  const frog = thing('frog');
  const slots = [0, 2, 3, 5, 6, 8, 11, 12, 14, 17, 19, 1, 7, 10, 16];
  const mixed = mixedScene('x', 11, slots, star.emoji, frog.emoji);
  const opening = oneKind('x', 11, slots, star, frog);
  const order = readingOrder('x', 11, slots);
  const again = set(calm(last(opening)), order.slice(0, 3), { lit: true });
  const typed = add(set(calm(last(opening)), order, { lit: true }), [
    { id: 'xn1', look: numeral(1), x: 8, y: 1.8, w: 0.9, h: 1.3, lit: true },
    { id: 'xn2', look: numeral(1), x: 8.9, y: 1.8, w: 0.9, h: 1.3, lit: true },
  ]);
  const first = turnQuestion('M-K-A8', 3, (f) => num(f, 'n') <= 10 && f.thing !== 'star' && f.other !== 'star');
  const second = turnQuestion('M-K-A8', 3, (f) => num(f, 'n') >= 12 && f.thing !== 'star' && f.thing !== first.facts.thing);
  return {
    parts: [
      show(moment(['You know how to count one kind, and skip the others.'], 'Count one kind. Skip the others.', set(mixed, ids('xa', 11), { lit: true }))),
      show(moment(['Now there are many more, and you type the number yourself.'], 'Many more. Type the number.', mixed)),
      ...opening.map(show),
      show(moment(['There are no answers to pick from. So count again, row by row, to be sure.'], 'Count again to be sure.', again)),
      show(moment(['If you get', { number: 11 }, 'again, you are right.'], '11 again: right.', set(again, order, { lit: true }))),
      turn(first, oneKindWhy(first)),
      show(moment(['To type a number past ten, tap the one first.', { number: 11 }, 'is a one, then a one.'], '11: tap 1, then 1.', typed)),
      turn(second, oneKindWhy(second)),
      show(moment(['Count one kind, row by row. Skip the others, then count again to check.'], 'Count one kind. Count again to check.', calm(mixed))),
    ],
  };
}

// ---- A.13 Tally marks: many bundles, counted by fives ----

const BUNDLE = 2.3; // from one bundle's left edge to the next

// Bundles of five: four lines, and the fifth one across them (drawn as a crossing over the bundle).
function tallyPieces(p: string, n: number, y = 2): Piece[] {
  return Array.from({ length: n }, (_, j): Piece => {
    const xb = 0.6 + Math.floor(j / 5) * BUNDLE;
    const k = j % 5;
    return k < 4 ? { id: `${p}m${j}`, look: text('|'), x: xb + k * 0.4, y, w: 0.4, h: 1.4 } : { id: `${p}m${j}`, look: text(''), x: xb - 0.15, y, w: 1.9, h: 1.4, crossed: true };
  });
}

// Count the bundles by fives, then the loose marks by ones.
function tallyBig(p: string, n: number): Moment[] {
  const start = scene(tallyPieces(p, n));
  const bundles = Math.floor(n / 5);
  const rest = n % 5;
  const marks = ids(`${p}m`, n);
  const bundled = ids(`${p}m`, bundles * 5);
  const out = [moment(['Count the bundles by fives.'], 'Count the bundles by 5s.', set(start, bundled, { lit: true }))];
  let now = start;
  for (let b = 0; b < bundles; b += 1) {
    const cross = `${p}m${b * 5 + 4}`;
    now = point(alter(set(now, ids(`${p}m`, 5, b * 5), { lit: true }), (piece) => (piece.id === cross ? { ...piece, badge: String((b + 1) * 5) } : piece.badge ? { ...piece, badge: undefined } : piece)), cross);
    out.push(moment([{ number: (b + 1) * 5 }], String((b + 1) * 5), now));
  }
  let end = withoutHand(now);
  if (rest > 0) {
    out.push(moment(['Now count on by ones.'], 'Count on by 1s.', set(calm(end), [...bundled, ...ids(`${p}m`, rest, bundles * 5)], { lit: true })));
    const counted = countAlong(end, ids(`${p}m`, rest, bundles * 5), bundles * 5);
    out.push(...keepLit(counted.moments, bundled));
    end = counted.end;
  }
  out.push(moment(['There are', { number: n }, 'tally marks.'], `${n} tally marks`, set(end, marks, { lit: true })));
  return out;
}

function tallyBigLesson(): Lesson {
  const thirteen = tallyBig('x', 13);
  const start = thirteen[0]?.scene ?? last(thirteen);
  const seventeen = tallyBig('y', 17);
  const twenty = scene(tallyPieces('z', 20));
  const first = turnQuestion('M-K-A13', 3, (f) => num(f, 'n') >= 11 && num(f, 'n') <= 14 && num(f, 'n') !== 13);
  const second = turnQuestion('M-K-A13', 3, (f) => num(f, 'n') >= 16 && num(f, 'n') <= 19 && num(f, 'n') !== 17);
  return {
    parts: [
      show(moment(['You know that a bundle of tally marks is five.'], 'A bundle is 5.', set(calm(start), ids('xm', 5), { lit: true }))),
      show(moment(['When there are many marks, we do not count them one by one.'], 'Many marks: do not count one by one.', calm(start))),
      ...thirteen.map(show),
      show(moment(['Bundles first, by fives. Then the loose marks, by ones.'], 'Bundles by 5s, then loose marks by 1s.', calm(last(thirteen)))),
      turn(first, tallyBig('w', num(first.facts, 'n'))),
      show(moment(['Here are three bundles. Keep counting by fives.'], '3 bundles', seventeen[0]?.scene ?? last(seventeen))),
      ...seventeen.slice(1).map(show),
      turn(second, tallyBig('w', num(second.facts, 'n'))),
      show(moment(['Four bundles make', { number: 20 }, ':', ...sayList([5, 10, 15, 20]), '.'], '5, 10, 15, 20', set(twenty, ids('zm', 20), { lit: true }))),
      show(moment(['Count the bundles by fives, then count on by ones.'], 'Bundles by 5s, then count on.', calm(twenty))),
    ],
  };
}

// ---- B.3 Put numbers in order: four numbers to 20 ----

const CARD = 1.4;
const cardX = (i: number): number => 0.9 + i * 2.2;
const cardPieces = (p: string, value: number, i: number): Piece[] => numberPieces(`${p}c${value}`, value, cardX(i), 0.6, CARD, 1.2);
const cardIds = (p: string, value: number): string[] => numberIds(`${p}c${value}`, value);

// Numbers below ten come first; then the numbers that start with a one, by the number after the one; twenty is last.
function orderBig(p: string, values: readonly number[]): Moment[] {
  const sorted = values.slice().sort((x, y) => x - y);
  const small = sorted.filter((value) => value < 10);
  const teens = sorted.filter((value) => value >= 10 && value < 20);
  let now = scene(values.flatMap((value, i) => cardPieces(p, value, i)));
  let placed = 0;
  // The card drops to its place in the bottom row.
  const drop = (value: number): void => {
    const dx = cardX(placed) - cardX(values.indexOf(value));
    const pick = new Set(cardIds(p, value));
    now = alter(calm(now), (piece) => (pick.has(piece.id) ? { ...piece, x: piece.x + dx, y: 3.3, lit: true } : piece));
    placed += 1;
  };
  const place = (): string => (placed === 1 ? 'comes first.' : 'comes next.');
  const out: Moment[] = [];
  if (small.length === 1) {
    const only = small[0] as number;
    drop(only);
    out.push(moment([{ number: only }, 'is the only number below ten, so it is the smallest. It comes first.'], `${only} is the smallest.`, now));
  } else if (small.length > 1) {
    out.push(moment(['These numbers are below ten. They are the smallest, so they come first.'], 'Numbers below 10 come first.', set(calm(now), small.flatMap((value) => cardIds(p, value)), { lit: true })));
    small.forEach((value) => {
      drop(value);
      out.push(moment([{ number: value }, place()], placed === 1 ? `${value} is first.` : `Then ${value}`, now));
    });
  }
  if (teens.length === 1) {
    const only = teens[0] as number;
    drop(only);
    out.push(moment([{ number: only }, place()], placed === 1 ? `${only} is first.` : `Then ${only}`, now));
  } else if (teens.length > 1) {
    out.push(moment(['These numbers all start with a one. So look at the number after the one.'], 'They start with 1. Look at the next number.', set(calm(now), teens.map((value) => `${p}c${value}o`), { lit: true })));
    teens.forEach((value, i) => {
      drop(value);
      now = set(set(now, [`${p}c${value}t`], { lit: undefined }), [`${p}c${value}o`], { lit: true });
      out.push(moment([i === 0 ? 'The smallest one is' : 'Then', { number: value % 10 }, ', so', { number: value }, place()], placed === 1 ? `${value} is first.` : `Then ${value}`, now));
    });
  }
  if (sorted.includes(20)) {
    drop(20);
    out.push(moment([{ number: 20 }, 'starts with a two, so it is the biggest. It comes last.'], '20 is the biggest.', now));
  }
  out.push(moment(['In order:', ...sayList(sorted), '.'], sorted.join(', '), set(now, sorted.flatMap((value) => cardIds(p, value)), { lit: true })));
  return out;
}

const orderWhy = (question: Question): Moment[] => {
  const values = numbers(question.facts, 'values');
  return [moment(['Find the smallest number first.'], 'Find the smallest first.', scene(values.flatMap((value, i) => cardPieces('w', value, i)))), ...orderBig('w', values)];
};

function orderBigLesson(): Lesson {
  const values = [14, 8, 17, 11];
  const cards = scene(values.flatMap((value, i) => cardPieces('x', value, i)));
  const opening = orderBig('x', values);
  const withTwenty = [20, 13, 19, 16];
  const twentyCards = scene(withTwenty.flatMap((value, i) => cardPieces('y', value, i)));
  const closing = orderBig('y', withTwenty);
  const below = (f: Record<string, unknown>): number => numbers(f, 'values').filter((value) => value < 10).length;
  const teens = (f: Record<string, unknown>): number => numbers(f, 'values').filter((value) => value >= 10 && value < 20).length;
  const first = turnQuestion('M-K-B3', 3, (f) => below(f) === 1 && teens(f) === 3 && !numbers(f, 'values').includes(8));
  const second = turnQuestion('M-K-B3', 3, (f) => numbers(f, 'values').includes(20) && teens(f) >= 2 && below(f) <= 1 && numbers(f, 'values').join() !== numbers(first.facts, 'values').join());
  return {
    parts: [
      show(moment(['You know how to put numbers in order, smallest first.'], 'Smallest first.', cards)),
      show(moment(['Now there are four numbers, and some are bigger than ten.'], '4 numbers. Some are bigger than 10.', set(cards, [...cardIds('x', 14), ...cardIds('x', 17), ...cardIds('x', 11)], { lit: true }))),
      ...opening.map(show),
      show(moment(['Numbers below ten come first. Then the numbers that start with a one.'], 'Below 10 first. Then the ones that start with 1.', calm(last(opening)))),
      turn(first, orderWhy(first)),
      show(moment(['What about', { number: 20 }, '?'], 'What about 20?', set(twentyCards, cardIds('y', 20), { lit: true }))),
      ...closing.map(show),
      turn(second, orderWhy(second)),
      show(moment(['Below ten first. Then the numbers that start with a one. Twenty comes last.'], 'Below 10, then 10 to 19, then 20.', calm(last(closing)))),
    ],
  };
}

// ---- B.4 Are there enough? Typing how many more, and when none are needed ----

const enoughPair = (name: string): EnoughPair => {
  const pair = ENOUGH_PAIRS.find((each) => each.one === name);
  if (!pair) throw new Error(`No pair for ${name}`);
  return pair;
};

// The animals in a row, and what each needs in a row under them, as the question draws them.
function enoughScene(p: string, pair: EnoughPair, need: number, have: number): Scene {
  return scene([
    ...Array.from({ length: need }, (_, i): Piece => ({ id: `${p}a${i}`, look: art(pair.emoji), x: 1.3 + i * 1.5, y: 0.8 })),
    ...Array.from({ length: have }, (_, j): Piece => ({ id: `${p}t${j}`, look: art(pair.wantEmoji), x: 1.3 + j * 1.5, y: 2.1 })),
  ]);
}

function enoughMoments(p: string, pair: EnoughPair, need: number, have: number): Moment[] {
  const start = enoughScene(p, pair, need, have);
  const both = Math.min(need, have);
  const paired = set(start, [...ids(`${p}a`, both), ...ids(`${p}t`, both)], { lit: true });
  const out = [
    moment([`Each ${pair.one} needs one ${pair.want}. Look under each ${pair.one}.`], `Each ${pair.one} needs one ${pair.want}.`, start),
    moment(both === 1 ? [`This ${pair.one} has a ${pair.want}.`] : ['These', { number: both }, `${pair.many} each have a ${pair.want}.`], `${both} ${many(both, pair)} ${both === 1 ? 'has' : 'have'} one.`, paired),
  ];
  if (have >= need) {
    if (have > need) out.push(moment([`There are even some ${pair.wants} left over.`], `${have - need} left over`, set(calm(start), ids(`${p}t`, have - need, need), { lit: true })));
    out.push(moment([`Every ${pair.one} has one. So we need`, { number: 0 }, `more ${pair.wants}.`], 'We need 0 more.', set(start, ids(`${p}a`, need), { lit: true })));
    return out;
  }
  const short = need - have;
  const without = ids(`${p}a`, short, have);
  const lit = set(calm(start), without, { lit: true });
  const counted = countAlong(lit, without);
  return [
    ...out,
    moment([`Count the ${pair.many} with none.`], `Count the ${pair.many} with none.`, lit),
    ...counted.moments,
    moment(['We need', { number: short }, `more ${short === 1 ? pair.want : pair.wants}.`], `We need ${short} more.`, set(counted.end, without, { lit: true })),
  ];
}

const enoughWhy = (question: Question): Moment[] => enoughMoments('w', enoughPair(str(question.facts, 'thing')), num(question.facts, 'need'), num(question.facts, 'have'));

function enoughTypedLesson(): Lesson {
  const bee = enoughPair('bee');
  const dog = enoughPair('dog');
  const bees = enoughMoments('x', bee, 3, 5);
  const zero = add(last(bees), [{ id: 'xzero', look: numeral(0), x: 4.4, y: 3.6, w: 1.2, h: 1.4, lit: true }]);
  const dogs = enoughMoments('y', dog, 5, 2);
  const first = turnQuestion('M-K-B4', 3, (f) => num(f, 'have') >= num(f, 'need') && f.thing !== 'bee' && f.thing !== 'dog' && num(f, 'need') >= 3);
  const second = turnQuestion('M-K-B4', 3, (f) => num(f, 'need') - num(f, 'have') >= 1 && num(f, 'need') - num(f, 'have') !== 3 && num(f, 'have') >= 2 && f.thing !== 'bee' && f.thing !== 'dog' && f.thing !== first.facts.thing);
  return {
    parts: [
      show(moment(['You know how to match one to one, and count the ones with none.'], 'Match one to one.', enoughScene('x', bee, 3, 5))),
      show(moment(['Now you type how many more we need. Sometimes the answer is a surprise.'], 'Type how many more we need.', set(enoughScene('x', bee, 3, 5), ids('xa', 3), { lit: true }))),
      ...bees.map(show),
      show(moment(['When every one has one, we need no more. The answer is zero.'], 'Every one has one: 0 more.', zero)),
      turn(first, enoughWhy(first)),
      show(moment(['When there are not enough, be careful what you count.'], 'Be careful what you count.', enoughScene('y', dog, 5, 2))),
      ...dogs.slice(1).map(show),
      show(moment(['We did not count the balls. We did not count all the dogs. We counted only the dogs with none.'], 'Count only the ones with none.', calm(last(dogs)))),
      turn(second, enoughWhy(second)),
      show(moment(['Match one to one, and count the ones with none. If every one has one, type zero.'], 'Count the ones with none. None? Type 0.', calm(zero))),
    ],
  };
}

// ---- D.1 Teen numbers: break the number into ten and some more ----

// The number on top, its ten in a ten frame, the rest beside the frame, and the sum written below.
function breakScene(p: string, ones: number): Scene {
  const n = 10 + ones;
  const cells = Array.from({ length: 10 }, (_, i): Piece => ({ id: `${p}c${i}`, look: { kind: 'cell' }, x: 0.5 + (i % 5), y: 1.7 + Math.floor(i / 5) }));
  return scene([
    { id: `${p}n1`, look: text('1'), x: 4.2, y: 0.2, w: 0.8, h: 1.3 },
    { id: `${p}n2`, look: text(String(ones)), x: 5, y: 0.2, w: 0.8, h: 1.3 },
    ...cells,
    ...group(`${p}t`, art(COUNTER), 10, 0.5, 1.7, 5),
    ...group(`${p}o`, art(COUNTER), ones, 6.5, 1.7, 3),
    { id: `${p}sum`, look: text(`${n} = 10 + ${ones}`), x: 0.5, y: 4.5, w: 5, h: 1.2, gone: true },
  ]);
}

function breakMoments(p: string, ones: number): Moment[] {
  const n = 10 + ones;
  const start = breakScene(p, ones);
  const tens = ids(`${p}t`, 10);
  const rest = ids(`${p}o`, ones);
  const counted = countAlong(start, rest);
  const summed = set(set(counted.end, [...tens, ...rest], { lit: true }), [`${p}sum`], { gone: false, lit: true });
  return [
    moment(['This is', { number: n }, '. Let us break it apart.'], `Break ${n} apart.`, set(start, [`${p}n1`, `${p}n2`], { lit: true })),
    moment(['Ten counters fill the ten frame.'], '10 fill the ten frame.', set(start, tens, { lit: true })),
    moment(['Count the ones that are left.'], 'Count the ones left.', set(start, rest, { lit: true })),
    ...counted.moments,
    moment([{ number: n }, 'is ten, and', { number: ones }, '.'], `${n} = 10 + ${ones}`, summed),
    moment(['Look at the number. The', { number: ones }, 'at the end tells us how many more than ten.'], `The ${ones} at the end: ${ones} more than 10`, set(calm(summed), [`${p}n2`, ...rest], { lit: true })),
  ];
}

const breakWhy = (question: Question): Moment[] => breakMoments('w', num(question.facts, 'ones'));

function teenBreakLesson(): Lesson {
  const fifteen = breakMoments('x', 5);
  const start = breakScene('x', 5);
  const front = set(calm(last(fifteen)), ['xn1', ...ids('xt', 10)], { lit: true });
  const eighteen = scene([
    { id: 'yn1', look: text('1'), x: 3.6, y: 0.8, w: 1.4, h: 2 },
    { id: 'yn2', look: text('8'), x: 5, y: 0.8, w: 1.4, h: 2 },
    { id: 'ysum', look: text('18 = 10 + 8'), x: 2.5, y: 3.6, w: 5, h: 1.3, gone: true },
  ]);
  const first = turnQuestion('M-K-D1', 3, (f) => num(f, 'ones') >= 2 && num(f, 'ones') <= 4);
  const second = turnQuestion('M-K-D1', 3, (f) => num(f, 'ones') >= 6 && num(f, 'ones') !== 8);
  return {
    parts: [
      show(moment(['You know that a teen number is ten and some more.'], 'A teen number is 10 and some more.', set(start, [...ids('xt', 10), ...ids('xo', 5)], { lit: true }))),
      show(moment(['Now we start with the number, and find the some more.'], 'Start with the number.', start)),
      ...fifteen.map(show),
      show(moment(['The one in front is the full ten. It is not the answer.'], 'The 1 in front is the ten.', front)),
      turn(first, breakWhy(first)),
      show(moment(['We do not even need counters. Look at', { number: 18 }, '.'], 'Look at 18.', eighteen)),
      show(moment(['The one in front is the ten.'], 'The 1 is the ten.', set(eighteen, ['yn1'], { lit: true }))),
      show(moment(['The', { number: 8 }, 'at the end is the some more. So', { number: 18 }, 'is ten, and', { number: 8 }, '.'], '18 = 10 + 8', set(set(eighteen, ['yn2'], { lit: true }), ['ysum'], { gone: false, lit: true }))),
      turn(second, breakWhy(second)),
      show(moment(['A teen number is ten, and the number at its end.'], 'Ten, and the number at the end.', calm(set(eighteen, ['ysum'], { gone: false })))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-K-A1': countBigLesson,
  'M-K-A2': tenFrameTypedLesson,
  'M-K-A3': tenFramesTypedLesson,
  'M-K-A4': nextBigLesson,
  'M-K-A5': beforeAfterBigLesson,
  'M-K-A6': missingBigLesson,
  'M-K-A7': missingTenLesson,
  'M-K-A8': countOneKindBigLesson,
  'M-K-A12': countBackBigLesson,
  'M-K-A13': tallyBigLesson,
  'M-K-B3': orderBigLesson,
  'M-K-B4': enoughTypedLesson,
  'M-K-D1': teenBreakLesson,
};
