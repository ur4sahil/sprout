import type { Countable } from '../../content/data/countables';
import { COUNTABLES } from '../../content/data/countables';
import { numberWord } from '../../content/data/h1-numberWords';
import type { EnoughPair } from '../../content/data/h1-things';
import { ENOUGH_PAIRS, LINE_ANIMALS } from '../../content/data/h1-things';
import { generateFrom, generatorFor } from '../../content/registry';
import type { Level, Question, Say } from '../../engine/types';
import { COLS, add, alter, art, calm, countAlong, group, ids, moment, num, numeral, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Kindergarten Math lessons for counting and comparing (plan section 16): A.2 to A.13 and B.1 to B.5.

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

// A question whose whole self (not only its facts) passes `test`: the first seed at that level.
function pick(skillId: string, level: Level, test: (question: Question) => boolean): Question {
  const generator = generatorFor(skillId);
  for (let seed = 1; seed <= 2000; seed += 1) {
    const question = generateFrom(generator, level, seed);
    if (test(question)) return question;
  }
  throw new Error(`No turn question for ${skillId} at level ${level}`);
}

function thing(name: string): Countable {
  const found = COUNTABLES.find((each) => each.one === name);
  if (!found) throw new Error(`No countable called ${name}`);
  return found;
}

const many = (n: number, of: { one: string; many: string }): string => (n === 1 ? of.one : of.many);
const isAre = (n: number): string => (n === 1 ? 'is' : 'are');
const numbers = (f: Record<string, unknown>, key: string): number[] => {
  const value = f[key];
  if (!Array.isArray(value) || !value.every((each) => typeof each === 'number')) throw new Error(`facts.${key} is not a list of numbers`);
  return value as number[];
};
const words = (f: Record<string, unknown>, key: string): string[] => {
  const value = f[key];
  if (!Array.isArray(value) || !value.every((each) => typeof each === 'string')) throw new Error(`facts.${key} is not a list of words`);
  return value as string[];
};

// "two, three, four", said with a little pause between the numbers.
const sayList = (values: readonly number[]): Say => values.flatMap((value, i): Say => (i === 0 ? [{ number: value }] : [',', { number: value }]));

const COUNTER = '🔴';

// ---- Ten frames (A.2, A.3) ----

function framePieces(p: string, x0: number, y0: number, filled: number): Piece[] {
  const cells: Piece[] = Array.from({ length: 10 }, (_, i) => ({ id: `${p}c${i}`, look: { kind: 'cell' }, x: x0 + (i % 5), y: y0 + Math.floor(i / 5) }));
  return [...cells, ...group(`${p}d`, art(COUNTER), filled, x0, y0, 5)];
}

// How many counters in one frame: count a few, or start at a full row of five and count on.
function frameCount(p: string, n: number): Moment[] {
  const start = scene(framePieces(p, 2.5, 2, n));
  const dots = ids(`${p}d`, n);
  if (n < 5) {
    const counted = countAlong(start, dots);
    return [
      moment(['Count the counters, one at a time.'], 'Count the counters.', start),
      ...counted.moments,
      moment(['There', isAre(n), { number: n }, n === 1 ? 'counter.' : 'counters.'], `${n} ${n === 1 ? 'counter' : 'counters'}`, set(counted.end, dots, { lit: true })),
    ];
  }
  const top = ids(`${p}d`, 5);
  const row = set(start, top, { lit: true });
  const out = [moment(['The top row is full. A full row is five.'], 'A full row is 5.', row)];
  if (n === 5) return [...out, moment(['So there are', { number: 5 }, 'counters.'], '5 counters', row)];
  if (n === 10) return [...out, moment(['The bottom row is full too. A full frame is ten.'], 'A full frame is 10.', set(start, dots, { lit: true }))];
  const counted = countAlong(row, ids(`${p}d`, n - 5, 5), 5);
  return [
    ...out,
    moment(['Start at five, and count on.'], 'Start at 5. Count on.', row),
    ...keepLit(counted.moments, top),
    moment([{ number: 5 }, ', and', { number: n - 5 }, 'more, make', { number: n }, '.'], `5 and ${n - 5} more make ${n}`, set(counted.end, dots, { lit: true })),
  ];
}

export function tenFrameLesson(): Lesson {
  const frame = scene(framePieces('x', 2.5, 2, 7).map((piece) => (piece.id.startsWith('xd') ? { ...piece, gone: true } : piece)));
  const fill = countAlong(frame, ids('xd', 5));
  const filling = fill.moments.map((each, i) => ({ ...each, scene: set(each.scene, ids('xd', i + 1), { gone: false }) }));
  const five = set(fill.end, ids('xd', 5), { gone: false });
  const twoMore = set(calm(five), ['xd5', 'xd6'], { gone: false, lit: true });
  const seven = frameCount('x', 7);
  const full = set(scene(framePieces('z', 2.5, 2, 10)), ids('zd', 10), { lit: true });
  const first = turnQuestion('M-K-A2', 1, (f) => num(f, 'n') >= 3 && num(f, 'n') <= 4);
  const second = turnQuestion('M-K-A2', 2, (f) => num(f, 'n') >= 8 && num(f, 'n') <= 9);
  return {
    parts: [
      show(moment(['A ten frame has two rows. Each row has five boxes.'], 'Two rows of 5 boxes.', set(frame, ids('xc', 5), { lit: true }))),
      show(moment(['Let us put in counters, top row first.'], 'Top row first.', frame)),
      ...filling.map(show),
      show(moment(['Here come two more, in the bottom row.'], '2 more in the bottom row', twoMore)),
      ...seven.map(show),
      show(moment(['A full row is always five, so we can start counting at five.'], 'A full row is always 5.', calm(last(seven)))),
      turn(first, frameCount('w', num(first.facts, 'n'))),
      show(moment(['When both rows are full, the frame holds ten.'], 'A full frame is 10.', full)),
      turn(second, frameCount('w', num(second.facts, 'n'))),
      show(moment(['A full row is five. A full frame is ten.'], 'A full row is 5. A full frame is 10.', calm(full))),
    ],
  };
}

const FRAMES_COLS = 11;

function twoFrames(p: string, n: number): Scene {
  return scene([...framePieces(`${p}a`, 0.25, 2, 10), ...framePieces(`${p}b`, 5.75, 2, n - 10)], FRAMES_COLS, 6);
}

// How many counters in two frames: the full frame is ten, then a full row makes fifteen, then count on.
function framesCount(p: string, n: number): Moment[] {
  const extra = n - 10;
  const ten = ids(`${p}ad`, 10);
  const more = ids(`${p}bd`, extra);
  const lit = set(twoFrames(p, n), ten, { lit: true });
  const out = [moment(['This frame is full. That is ten.'], 'A full frame is 10.', lit)];
  const done = (from: Scene): Moment => moment(['Ten, and', { number: extra }, 'more, make', { number: n }, '.'], `10 and ${extra} more make ${n}`, set(from, [...ten, ...more], { lit: true }));
  if (extra === 10) return [...out, moment(['The other frame is full too. Ten, and ten more, make twenty.'], '10 and 10 make 20', set(lit, more, { lit: true }))];
  if (extra >= 5) {
    const top = ids(`${p}bd`, 5);
    const row = set(lit, top, { lit: true });
    out.push(moment(['Here the top row is full. Ten, and five more, make fifteen.'], '10 and 5 make 15', row));
    if (extra === 5) return out;
    out.push(moment(['Start at fifteen, and count on.'], 'Start at 15. Count on.', row));
    const counted = countAlong(row, ids(`${p}bd`, extra - 5, 5), 15);
    return [...out, ...keepLit(counted.moments, [...ten, ...top]), done(counted.end)];
  }
  out.push(moment(['Start at ten, and count on.'], 'Start at 10. Count on.', lit));
  const counted = countAlong(lit, more, 10);
  return [...out, ...keepLit(counted.moments, ten), done(counted.end)];
}

export function tenFramesTo20Lesson(): Lesson {
  const empty = alter(twoFrames('x', 13), (piece) => (piece.id.startsWith('xad') || piece.id.startsWith('xbd') ? { ...piece, gone: true } : piece));
  const firstFull = alter(empty, (piece) => (piece.id.startsWith('xad') ? { ...piece, gone: false } : piece));
  const thirteen = framesCount('x', 13);
  const seventeen = framesCount('y', 17);
  const first = turnQuestion('M-K-A3', 1, (f) => num(f, 'n') >= 12 && num(f, 'n') <= 14);
  const second = turnQuestion('M-K-A3', 2, (f) => num(f, 'n') >= 16 && num(f, 'n') <= 19 && num(f, 'n') !== 17);
  return {
    parts: [
      show(moment(['Two ten frames can show numbers up to twenty.'], 'Two frames hold up to 20.', empty)),
      show(moment(['We fill the first frame, then the next one.'], 'Fill the first frame first.', firstFull)),
      ...thirteen.map(show),
      show(moment(['A full frame is ten, so we start counting at ten.'], 'Start at 10.', calm(last(thirteen)))),
      turn(first, framesCount('w', num(first.facts, 'n'))),
      show(moment(['Look for full rows too. They help us count fast.'], 'Look for full rows.', calm(twoFrames('y', 17)))),
      ...seventeen.map(show),
      turn(second, framesCount('w', num(second.facts, 'n'))),
      show(moment(['Start at ten for the full frame, then count on.'], 'Start at 10, then count on.', calm(last(seventeen)))),
    ],
  };
}

// ---- Rows of numbers (A.4, A.6, A.7, A.12) ----

function rowScene(p: string, values: readonly number[], blank: number, y = 2, w = 1.4): Scene {
  const gap = 0.7;
  const x0 = (COLS - (values.length * w + (values.length - 1) * gap)) / 2;
  return scene(values.map((value, i): Piece => ({ id: `${p}n${i}`, look: i === blank ? { kind: 'box' } : numeral(value), x: x0 + i * (w + gap), y, w, h: 1.2 })));
}

const rowValues = (f: Record<string, unknown>): number[] => Array.from({ length: num(f, 'length') }, (_, i) => num(f, 'start') + num(f, 'step') * i);

// Read along the row with the hand, fill the box from the number next to it, read the whole row, say the answer.
function rowMoments(p: string, values: readonly number[], blank: number, start: Scene, ending: 'next' | 'missing', onFill: (from: Scene) => Scene = (from) => from): Moment[] {
  const answer = values[blank] as number;
  const out: Moment[] = [];
  let now = calm(start);
  const read = (i: number): void => {
    now = point(set(now, [`${p}n${i}`], { lit: true }), `${p}n${i}`);
    out.push(moment([{ number: values[i] as number }], String(values[i]), now));
  };
  const ref = blank === 0 ? 1 : blank - 1;
  const known = values[ref] as number;
  if (blank === 0) {
    now = point(set(now, [`${p}n1`], { lit: true }), `${p}n1`);
    out.push(moment(['The box is first, so look at the number after it,', { number: known }, '.'], `Look at ${known}.`, now));
  } else {
    for (let i = 0; i < blank; i += 1) read(i);
  }
  const diff = answer - known;
  now = onFill(point(alter(now, (piece) => (piece.id === `${p}n${blank}` ? { ...piece, look: numeral(answer), lit: true } : piece)), `${p}n${blank}`));
  out.push(moment([Math.abs(diff) === 10 ? 'Ten' : 'One', diff > 0 ? 'more than' : 'less than', { number: known }, 'is', { number: answer }, '.'], `${known} ${diff > 0 ? '+' : '-'} ${Math.abs(diff)} = ${answer}`, now));
  for (let i = blank + 1; i < values.length; i += 1) read(i);
  const all = set(withoutHand(now), values.map((_, i) => `${p}n${i}`), { lit: true });
  out.push(moment([...sayList(values), '.'], values.join(', '), all));
  out.push(ending === 'next' ? moment(['Next is', { number: answer }, '.'], `Next is ${answer}.`, all) : moment(['The missing number is', { number: answer }, '.'], `The missing number is ${answer}.`, all));
  return out;
}

function rowWhy(question: Question): Moment[] {
  const values = rowValues(question.facts);
  const blank = num(question.facts, 'blankIndex');
  const start = rowScene('w', values, blank);
  const ending = question.prompt.text === 'What comes next?' ? 'next' : 'missing';
  return [moment(['Let us read the row, one number at a time.'], 'Read the row.', set(start, [`wn${blank}`], { lit: true })), ...rowMoments('w', values, blank, start, ending)];
}

// A tower of cubes standing on the table above each number of a row. The tower at `hidden` waits to appear.
function towers(p: string, row: Scene, values: readonly number[], size: number, hidden: number): Scene {
  const cubes: Piece[] = values.flatMap((value, i) => {
    const under = find(row, `${p}n${i}`);
    const middle = under.x + (under.w ?? 1) / 2;
    return Array.from({ length: value }, (_, k): Piece => ({ id: `${p}k${i}_${k}`, look: { kind: 'cube' }, x: middle - size / 2, y: 3 - (k + 1) * size, w: size, h: size, gone: i === hidden ? true : undefined }));
  });
  return add(row, cubes);
}
const towerIds = (p: string, i: number, value: number): string[] => Array.from({ length: value }, (_, k) => `${p}k${i}_${k}`);
const allTowers = (p: string, values: readonly number[]): string[] => values.flatMap((value, i) => towerIds(p, i, value));

export function whatComesNextLesson(): Lesson {
  const values = [2, 3, 4, 5];
  const base = towers('x', rowScene('x', values, 3, 3.4), values, 0.5, 3);
  const opening = rowMoments('x', values, 3, base, 'next', (from) => set(from, towerIds('x', 3, 5), { gone: false }));
  const big = [15, 16, 17, 18];
  const bigRow = rowScene('y', big, 3);
  const first = turnQuestion('M-K-A4', 1, (f) => num(f, 'start') >= 4);
  const second = turnQuestion('M-K-A4', 2, (f) => num(f, 'start') >= 11 && num(f, 'start') !== 15);
  return {
    parts: [
      show(moment(['When we count, each number is one more than the one before.'], 'Each number is 1 more.', base)),
      show(moment(['Let us read this row, and find what comes next.'], 'What comes next?', set(base, ['xn3'], { lit: true }))),
      ...opening.map(show),
      show(moment(['See? Each tower has one more cube than the one before.'], 'Each tower has 1 more cube.', set(calm(last(opening)), allTowers('x', values), { lit: true }))),
      turn(first, rowWhy(first)),
      show(moment(['Big numbers work the same way.'], 'Big numbers work the same way.', bigRow)),
      ...rowMoments('y', big, 3, bigRow, 'next').map(show),
      turn(second, rowWhy(second)),
      show(moment(['To find what comes next, say the numbers, then say one more.'], 'Say the numbers, then 1 more.', calm(bigRow))),
    ],
  };
}

export function missingNumberRowLesson(): Lesson {
  const values = [5, 6, 7, 8];
  const row = rowScene('x', values, 2);
  const opening = rowMoments('x', values, 2, row, 'missing');
  const front = [12, 13, 14, 15];
  const frontRow = rowScene('y', front, 0);
  const first = turnQuestion('M-K-A6', 2, (f) => (num(f, 'blankIndex') === 1 || num(f, 'blankIndex') === 2) && num(f, 'start') <= 14);
  const second = turnQuestion('M-K-A6', 2, (f) => num(f, 'blankIndex') === 0 && num(f, 'start') !== 12 && num(f, 'start') !== num(first.facts, 'start'));
  return {
    parts: [
      show(moment(['A number is hiding in this row. Let us find it.'], 'Find the missing number.', set(row, ['xn2'], { lit: true }))),
      ...opening.map(show),
      show(moment(['Count along the row, and say the number that fits in the box.'], 'Count along. Say the number that fits.', calm(last(opening)))),
      turn(first, rowWhy(first)),
      show(moment(['Sometimes the box comes first.'], 'The box can come first.', set(frontRow, ['yn0'], { lit: true }))),
      ...rowMoments('y', front, 0, frontRow, 'missing').map(show),
      turn(second, rowWhy(second)),
      show(moment(['Numbers in a row go up by one. Count along to find the missing one.'], 'Count along to find it.', calm(frontRow))),
    ],
  };
}

// A rod (a ten) for each ten, standing on the table above each number of the row.
function rods(p: string, row: Scene, values: readonly number[], hidden: number): Scene {
  const sticks: Piece[] = values.flatMap((value, i) => {
    const under = find(row, `${p}n${i}`);
    const count = value / 10;
    const left = under.x + (under.w ?? 1) / 2 - (count * 0.36) / 2;
    return Array.from({ length: count }, (_, k): Piece => ({ id: `${p}r${i}_${k}`, look: { kind: 'rod' }, x: left + k * 0.36, y: 0.5, w: 0.36, h: 2.4, gone: i === hidden ? true : undefined }));
  });
  return add(row, sticks);
}
const rodIds = (p: string, i: number, value: number): string[] => Array.from({ length: value / 10 }, (_, k) => `${p}r${i}_${k}`);

export function countByTensLesson(): Lesson {
  const values = [10, 20, 30, 40];
  const base = rods('x', rowScene('x', values, 3, 3.3), values, 3);
  const opening = rowMoments('x', values, 3, base, 'next', (from) => set(from, rodIds('x', 3, 40), { gone: false }));
  const tens = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);
  const chart = scene(tens.map((value, i): Piece => ({ id: `t${i}`, look: numeral(value), x: 0.5 + (i % 5) * 1.9, y: i < 5 ? 1 : 3.2, w: 1.4, h: 1.2 })));
  const firstHalf = set(chart, ids('t', 5), { lit: true });
  const secondHalf = set(firstHalf, ids('t', 5, 5), { lit: true });
  const first = turnQuestion('M-K-A7', 1, (f) => !(num(f, 'start') === 10 && num(f, 'length') === 4));
  const second = turnQuestion('M-K-A7', 2, (f) => num(f, 'start') >= 50);
  const allRods = values.flatMap((value, i) => rodIds('x', i, value));
  return {
    parts: [
      show(moment(['This rod has ten small squares. It is one ten.'], 'A rod is 10.', set(base, ['xr0_0'], { lit: true }))),
      show(moment(['When we count rods, we count by tens.'], 'Count by 10s.', set(base, ['xn3'], { lit: true }))),
      ...opening.map(show),
      show(moment(['Each time, there is one more ten.'], 'One more ten each time.', set(calm(last(opening)), allRods, { lit: true }))),
      turn(first, rowWhy(first)),
      show(moment(['We can count by tens all the way to one hundred.'], 'Count by 10s to 100.', chart)),
      show(moment([...sayList(tens.slice(0, 5)), '.'], '10, 20, 30, 40, 50', firstHalf)),
      show(moment([...sayList(tens.slice(5)), '.'], '60, 70, 80, 90, 100', secondHalf)),
      turn(second, rowWhy(second)),
      show(moment(['Counting by tens, add one more ten each time.'], 'Add 10 each time.', calm(secondHalf))),
    ],
  };
}

export function countBackLesson(): Lesson {
  const values = [7, 6, 5, 4];
  const base = towers('x', rowScene('x', values, 3, 3.4), values, 0.4, 3);
  const opening = rowMoments('x', values, 3, base, 'missing', (from) => set(from, towerIds('x', 3, 4), { gone: false }));
  const countdown = [5, 4, 3, 2, 1];
  const pad = scene([
    ...countdown.map((value, i): Piece => ({ id: `c${i}`, look: numeral(value), x: 0.6 + i * 1.4, y: 3.4, w: 1, h: 1.2 })),
    { id: 'rocket', look: art('🚀'), x: 7.9, y: 1.6, w: 1.4, h: 1.4 },
  ]);
  let now = pad;
  const counting: Moment[] = countdown.map((value, i) => {
    now = point(set(now, [`c${i}`], { lit: true }), `c${i}`);
    return moment([{ number: value }], String(value), now);
  });
  const blastOff = set(withoutHand(now), ['rocket'], { y: 0, lit: true });
  const first = turnQuestion('M-K-A12', 1, (f) => num(f, 'start') !== 7);
  const second = turnQuestion('M-K-A12', 2, (f) => (num(f, 'blankIndex') === 1 || num(f, 'blankIndex') === 2) && num(f, 'start') <= 15);
  return {
    parts: [
      show(moment(['Counting back means going down, one number at a time.'], 'Count back: go down by 1.', base)),
      show(moment(['Let us read this row, and find the missing number.'], 'Find the missing number.', set(base, ['xn3'], { lit: true }))),
      ...opening.map(show),
      show(moment(['Each tower has one cube fewer than the one before.'], 'Each tower has 1 fewer cube.', set(calm(last(opening)), allTowers('x', values), { lit: true }))),
      turn(first, rowWhy(first)),
      show(moment(['A rocket counts back before it takes off.'], 'A rocket counts back.', pad)),
      ...counting.map(show),
      show(moment(['Blast off!'], 'Blast off!', blastOff)),
      turn(second, rowWhy(second)),
      show(moment(['When we count back, each number is one less.'], 'Counting back, each number is 1 less.', calm(blastOff))),
    ],
  };
}

// ---- A.5 Before and after ----

function lineScene(p: string, from: number, y = 2): Scene {
  return scene(Array.from({ length: 10 }, (_, i): Piece => ({ id: `${p}n${from + i}`, look: numeral(from + i), x: i, y })));
}

function sideMoments(p: string, n: number, side: 'after' | 'before'): Moment[] {
  const target = side === 'after' ? n + 1 : n - 1;
  const found = point(set(lineScene(p, 1), [`${p}n${n}`], { lit: true }), `${p}n${n}`);
  const stepped = point(set(found, [`${p}n${target}`], { lit: true }), `${p}n${target}`);
  return [
    moment(['Find', { number: n }, 'on the number line.'], `Find ${n}.`, found),
    moment([side === 'after' ? 'Take one step forward, to' : 'Take one step back, to', { number: target }, '.'], side === 'after' ? `One step forward: ${target}` : `One step back: ${target}`, stepped),
    moment([{ number: target }, `comes ${side}`, { number: n }, '.'], `${target} comes ${side} ${n}.`, withoutHand(stepped)),
  ];
}

const sideWhy = (question: Question): Moment[] => sideMoments('w', num(question.facts, 'n'), str(question.facts, 'side') === 'before' ? 'before' : 'after');

export function beforeAfterLesson(): Lesson {
  const line = lineScene('x', 1);
  const after = sideMoments('x', 4, 'after');
  const before = sideMoments('x', 7, 'before');
  const first = turnQuestion('M-K-A5', 1, (f) => num(f, 'n') !== 4);
  const second = turnQuestion('M-K-A5', 2, (f) => num(f, 'n') !== 7);
  return {
    parts: [
      show(moment(['Every number has a number just before it, and a number just after it.'], 'Before and after', set(line, ['xn4', 'xn5', 'xn6'], { lit: true }))),
      show(moment(['After means the next number when we count.'], 'After: the next number.', line)),
      ...after.map(show),
      turn(first, sideWhy(first)),
      show(moment(['Before means the number just in front of it.'], 'Before: the number in front.', calm(last(after)))),
      ...before.map(show),
      turn(second, sideWhy(second)),
      show(moment(['After is one step forward. Before is one step back.'], 'After: 1 step forward. Before: 1 step back.', calm(last(before)))),
    ],
  };
}

// ---- A.8 Count one kind ----

function scatter(p: string, n: number, slots: readonly number[], a: string, b: string): Scene {
  return scene(slots.map((slot, i): Piece => ({ id: i < n ? `${p}a${i}` : `${p}b${i - n}`, look: art(i < n ? a : b), x: 2.5 + (slot % 5), y: 0.9 + Math.floor(slot / 5) * 1.1 })));
}

function oneKind(p: string, n: number, slots: readonly number[], of: Countable, other: Countable): Moment[] {
  const others = ids(`${p}b`, slots.length - n);
  const faded = set(scatter(p, n, slots, of.emoji, other.emoji), others, { dim: true });
  // Count in reading order: top row first, left to right.
  const order = Array.from({ length: n }, (_, i) => i).sort((x, y) => (slots[x] as number) - (slots[y] as number)).map((i) => `${p}a${i}`);
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

export function countOneKindLesson(): Lesson {
  const apple = thing('apple');
  const banana = thing('banana');
  const slots = [0, 7, 3, 12, 9, 15, 18];
  const mixed = scatter('x', 4, slots, apple.emoji, banana.emoji);
  const opening = oneKind('x', 4, slots, apple, banana);
  const star = thing('star');
  const frog = thing('frog');
  const more = [1, 3, 5, 8, 11, 14, 17, 0, 9, 12, 19];
  const first = turnQuestion('M-K-A8', 1, (f) => num(f, 'n') <= 5);
  const second = turnQuestion('M-K-A8', 2, (f) => num(f, 'n') <= 9 && str(f, 'thing') !== 'apple');
  return {
    parts: [
      show(moment(['Sometimes two kinds of things are mixed up.'], 'Two kinds, mixed up.', mixed)),
      show(moment(['The question asks about one kind. Let us find the apples.'], 'Find the apples.', set(mixed, ids('xa', 4), { lit: true }))),
      ...opening.map(show),
      show(moment(['We did not count the bananas at all.'], 'Skip the bananas.', calm(last(opening)))),
      turn(first, oneKindWhy(first)),
      show(moment(['With more things, go row by row from the top, so you miss none.'], 'Row by row, from the top.', scatter('y', 7, more, star.emoji, frog.emoji))),
      ...oneKind('y', 7, more, star, frog).map(show),
      turn(second, oneKindWhy(second)),
      show(moment(['Count one kind. Skip the others.'], 'Count one kind. Skip the others.', calm(mixed))),
    ],
  };
}

// ---- A.9 Find the number to 20 ----

// A two-digit number as two pieces, so each digit can light up on its own.
function digits(p: string, value: number, x: number, y: number): Piece[] {
  return [
    { id: `${p}t`, look: text(String(Math.floor(value / 10))), x, y, w: 0.8, h: 1.4 },
    { id: `${p}o`, look: text(String(value % 10)), x: x + 0.8, y, w: 0.8, h: 1.4 },
  ];
}

function findWhy(question: Question): Moment[] {
  const n = num(question.facts, 'target');
  const values = numbers(question.facts, 'options');
  const places = [1, 4.2, 7.4];
  const start = scene(values.flatMap((value, i) => digits(`w${i}`, value, places[i] ?? 1, 2)));
  const at = values.indexOf(n);
  const right = [`w${at}t`, `w${at}o`];
  const ones = n % 10;
  const hint: Say = n === 20 ? [{ number: 20 }, 'starts with a two, then a zero.'] : [{ number: n }, 'starts with a one, then', ones === 8 ? 'an' : 'a', { number: ones }, '.'];
  const others = values.flatMap((_, i) => (i === at ? [] : [`w${i}t`, `w${i}o`]));
  return [
    moment(['Listen:', { number: n }, '.'], `Find ${n}.`, start),
    moment(hint, `${n}: ${Math.floor(n / 10)} then ${ones}`, set(start, right, { lit: true })),
    // Said as the number itself, the way the answer button reads it.
    moment(['Here it is:', { number: n }, '.'], `${n}`, point(set(set(start, right, { lit: true }), others, { dim: true }), `w${at}o`)),
  ];
}

export function findTo20Lesson(): Lesson {
  const start = scene([...digits('a', 14, 2.2, 1.6), ...digits('b', 17, 6, 1.6).map((piece) => ({ ...piece, gone: true }))]);
  const fourteen = set(start, ['at', 'ao'], { lit: true });
  const ten = set(calm(start), ['at'], { lit: true });
  const four = set(calm(start), ['ao'], { lit: true });
  const seventeen = set(calm(start), ['bt', 'bo'], { gone: false, lit: true });
  const alike = scene([...digits('c', 12, 2.2, 1.6), ...digits('d', 21, 6, 1.6)]);
  const first = turnQuestion('M-K-A9', 1, (f) => num(f, 'target') !== 14 && num(f, 'target') !== 17);
  const second = turnQuestion('M-K-A9', 3, (f) => num(f, 'target') !== 12 && num(f, 'target') !== num(first.facts, 'target'));
  return {
    parts: [
      show(moment(['Numbers from', { number: 11 }, 'to', { number: 19 }, 'have two digits.'], '11 to 19 have two digits.', start)),
      show(moment(['This is', { number: 14 }, '.'], '14', fourteen)),
      show(moment(['The one in front means one ten.'], 'The 1 means one ten.', ten)),
      show(moment(['We hear', { number: 4 }, 'in', { number: 14 }, ', so a', { number: 4 }, 'comes next.'], 'We hear 4, so 4 comes next.', four)),
      show(moment(['In', { number: 17 }, ', we hear', { number: 7 }, '. So it is a one, then a', { number: 7 }, '.'], '17: a 1, then a 7', seventeen)),
      show(moment(['Listen to the end of the number. It tells you the second digit.'], 'The end of the number tells the second digit.', calm(seventeen))),
      turn(first, findWhy(first)),
      show(moment(['Be careful with numbers that look alike.'], 'Some numbers look alike.', alike)),
      show(moment([{ number: 12 }, 'starts with a one.'], '12 starts with 1.', set(alike, ['ct', 'co'], { lit: true }))),
      show(moment([{ number: 21 }, 'starts with a two. It is a different number.'], '21 starts with 2.', set(alike, ['dt', 'do'], { lit: true }))),
      turn(second, findWhy(second)),
      show(moment(['Listen to the number, then check both digits.'], 'Listen, then check both digits.', calm(alike))),
    ],
  };
}

// ---- A.10 Number words to ten ----

// Five rows: the word, its numeral and (from one to five) that many counters.
function chart(p: string, from: number, dots: boolean): Scene {
  return scene(
    Array.from({ length: 5 }, (_, i): Piece[] => {
      const value = from + i;
      const y = 0.5 + i * 1.05;
      const row: Piece[] = [
        { id: `${p}w${value}`, look: text(numberWord(value)), x: 0.6, y, w: 3, h: 0.95 },
        { id: `${p}n${value}`, look: numeral(value), x: 3.9, y, w: 1, h: 0.95 },
      ];
      if (dots) row.push(...Array.from({ length: value }, (_, k): Piece => ({ id: `${p}d${value}_${k}`, look: art(COUNTER), x: 5.3 + k * 0.85, y: y + 0.1, w: 0.75, h: 0.75 })));
      return row;
    }).flat(),
  );
}
const chartRow = (p: string, value: number, dots: boolean): string[] => [`${p}w${value}`, `${p}n${value}`, ...(dots ? Array.from({ length: value }, (_, k) => `${p}d${value}_${k}`) : [])];

function wordWhy(question: Question): Moment[] {
  const n = num(question.facts, 'n');
  if (question.facts.ask === 'numeral') {
    const start = chart('w', 1, true);
    const word = point(set(start, [`ww${n}`], { lit: true }), `ww${n}`);
    const lit = set(word, chartRow('w', n, true), { lit: true });
    return [
      moment(['Find the same word in our chart.'], `Find ${numberWord(n)}.`, word),
      moment(['Next to it is the number', { number: n }, ', with', { number: n }, n === 1 ? 'counter.' : 'counters.'], `${numberWord(n)} is ${n}`, point(lit, `wn${n}`)),
      // Said as the number itself, the way the answer button reads it.
      moment(['So the word says', { number: n }, '.'], `${numberWord(n)} = ${n}`, withoutHand(lit)),
    ];
  }
  const dots = n <= 5;
  const start = chart('w', dots ? 1 : 6, dots);
  const found = point(set(start, [`wn${n}`], { lit: true }), `wn${n}`);
  const named = point(set(found, [`ww${n}`], { lit: true }), `ww${n}`);
  return [
    moment(['Find', { number: n }, 'in our chart.'], `Find ${n}.`, found),
    moment(['The word next to it is its name.'], 'Its word is next to it.', named),
    moment(['So the word is', { number: n }, '.'], `${n} is ${numberWord(n)}.`, withoutHand(named)),
  ];
}

export function numberWordsLesson(): Lesson {
  const full = chart('x', 1, true);
  const hidden = alter(full, (piece) => ({ ...piece, gone: true }));
  let now = hidden;
  const reveal: Moment[] = [1, 2, 3, 4, 5].map((value) => {
    now = set(calm(now), chartRow('x', value, true), { gone: false, lit: true });
    return moment(['This word says', { number: value }, '.'], `${numberWord(value)} is ${value}`, now);
  });
  const shown = calm(now);
  const high = chart('y', 6, false);
  const first = turnQuestion('M-K-A10', 1, (f) => num(f, 'n') >= 2);
  const second = turnQuestion('M-K-A10', 3, (f) => num(f, 'n') >= 6);
  return {
    parts: [
      show(moment(['Every number has a word. Let us read them.'], 'Every number has a word.', hidden)),
      ...reveal.map(show),
      show(moment(['The words for', { number: 2 }, 'and', { number: 3 }, 'both start with', { letter: 't' }, '. Look at the whole word.'], 'two and three both start with t', set(shown, ['xw2', 'xw3'], { lit: true }))),
      show(moment(['The words for', { number: 4 }, 'and', { number: 5 }, 'both start with', { letter: 'f' }, '.'], 'four and five both start with f', set(shown, ['xw4', 'xw5'], { lit: true }))),
      turn(first, wordWhy(first)),
      show(moment(['Here are the words for', { number: 6 }, 'to', { number: 10 }, '.'], 'six to ten', high)),
      show(moment(['The words for', { number: 6 }, 'and', { number: 7 }, 'both start with', { letter: 's' }, '.'], 'six and seven both start with s', set(high, ['yw6', 'yw7'], { lit: true }))),
      turn(second, wordWhy(second)),
      show(moment(['Read the whole word, then find its number.'], 'Read the whole word.', calm(high))),
    ],
  };
}

// ---- A.11 First to fifth ----

const PLACES = ['first', 'second', 'third', 'fourth', 'fifth'];
const PLACE_MARKS = ['1st', '2nd', '3rd', '4th', '5th'];

function animalEmoji(name: string): string {
  const found = LINE_ANIMALS.find((each) => each.name === name);
  if (!found) throw new Error(`No animal called ${name}`);
  return found.emoji;
}

function line(p: string, names: readonly string[]): Scene {
  return scene([{ id: `${p}f`, look: art('🏁'), x: 0.5, y: 2 }, ...names.map((name, i): Piece => ({ id: `${p}a${i}`, look: art(animalEmoji(name)), x: 2 + i * 1.5, y: 2 }))]);
}

// Light each place from the flag, with its place word above it.
function placeAt(from: Scene, p: string, i: number): Scene {
  return point(set(from, [`${p}a${i}`], { lit: true, badge: PLACE_MARKS[i] }), `${p}a${i}`);
}

function placeWhy(question: Question): Moment[] {
  const names = words(question.facts, 'line');
  const target = str(question.facts, 'target');
  const place = names.indexOf(target);
  let now = set(line('w', names), ['wf'], { lit: true });
  const out = [moment(['Start at the flag.'], 'Start at the flag.', now)];
  for (let i = 0; i <= place; i += 1) {
    now = placeAt(now, 'w', i);
    out.push(moment([PLACES[i] as string], PLACES[i] as string, now));
  }
  out.push(moment([`So the ${target} is ${PLACES[place] as string}.`], `The ${target} is ${PLACES[place] as string}.`, withoutHand(now)));
  return out;
}

export function firstToFifthLesson(): Lesson {
  const names = ['dog', 'cat', 'rabbit', 'frog', 'duck'];
  const start = line('x', names);
  let now = set(start, ['xf'], { lit: true });
  const flag = now;
  const counted = names.map((name, i) => {
    now = placeAt(now, 'x', i);
    return moment([`The ${name} is ${PLACES[i] as string}.`], `${PLACE_MARKS[i] as string}: ${name}`, now);
  });
  const first = turnQuestion('M-K-A11', 3, (f) => words(f, 'line').indexOf(str(f, 'target')) <= 2 && words(f, 'line').indexOf(str(f, 'target')) >= 1);
  const second = turnQuestion('M-K-A11', 3, (f) => words(f, 'line').indexOf(str(f, 'target')) >= 3 && f.target !== first.facts.target);
  return {
    parts: [
      show(moment(['Words like first, second and third tell the order things are in.'], 'first, second, third', start)),
      show(moment(['This line starts at the flag.'], 'The line starts at the flag.', flag)),
      ...counted.map(show),
      show(moment(['The one next to the flag is always first.'], 'Next to the flag is first.', set(calm(withoutHand(now)), ['xf', 'xa0'], { lit: true }))),
      turn(first, placeWhy(first)),
      show(moment(['To find a place, start at the flag and count: first, second, third, and on.'], 'Start at the flag and count the places.', set(start, ['xf'], { lit: true }))),
      turn(second, placeWhy(second)),
      show(moment(['Start at the flag, and count the places in order.'], 'Start at the flag. Count in order.', calm(withoutHand(now)))),
    ],
  };
}

// ---- A.13 Tally marks ----

// Bundles of five: four lines, and the fifth one across them (drawn as a crossing over the bundle).
function tallyPieces(p: string, n: number, x0: number, y: number): Piece[] {
  return Array.from({ length: n }, (_, j): Piece => {
    const xb = x0 + Math.floor(j / 5) * 2.6;
    const k = j % 5;
    return k < 4 ? { id: `${p}m${j}`, look: text('|'), x: xb + k * 0.45, y, w: 0.45, h: 1.4 } : { id: `${p}m${j}`, look: text(''), x: xb - 0.2, y, w: 2.2, h: 1.4, crossed: true };
  });
}

function tallyCount(p: string, n: number): Moment[] {
  const start = scene(tallyPieces(p, n, 2.7, 2));
  const marks = ids(`${p}m`, n);
  const total = (from: Scene): Moment => moment(['There', isAre(n), { number: n }, n === 1 ? 'tally mark.' : 'tally marks.'], `${n} tally ${n === 1 ? 'mark' : 'marks'}`, set(from, marks, { lit: true }));
  if (n < 5) {
    const counted = countAlong(start, marks);
    return [moment(['Count each mark.'], 'Count each mark.', start), ...counted.moments, total(counted.end)];
  }
  const bundle = ids(`${p}m`, 5);
  const lit = set(start, bundle, { lit: true });
  const out = [moment(['A bundle is five marks: four lines, and one across.'], 'A bundle is 5.', lit)];
  if (n === 5) return [...out, total(lit)];
  const counted = countAlong(lit, ids(`${p}m`, n - 5, 5), 5);
  return [...out, moment(['Start at five, and count on.'], 'Start at 5. Count on.', lit), ...keepLit(counted.moments, bundle), total(counted.end)];
}

export function tallyLesson(): Lesson {
  const ball = thing('ball');
  const balls = group('xb', art(ball.emoji), 3, 3.5, 0.6, 3).map((piece) => ({ ...piece, x: 3.5 + (piece.x - 3.5) * 1.2 }));
  const marks = tallyPieces('xm', 3, 3.6, 2.4).map((piece) => ({ ...piece, gone: true }));
  const start = scene([...balls, ...marks]);
  const counted = countAlong(start, ids('xb', 3));
  const marking = counted.moments.map((each, i) => ({ ...each, scene: set(each.scene, ids('xmm', i + 1), { gone: false }) }));
  const matched = set(counted.end, [...ids('xb', 3), ...ids('xmm', 3)], { gone: false, lit: true });
  const four = alter(scene(tallyPieces('z', 7, 2.7, 2)), (piece) => (['zm4', 'zm5', 'zm6'].includes(piece.id) ? { ...piece, gone: true } : piece));
  const bundled = set(four, ['zm4'], { gone: false });
  const seven = tallyCount('z', 7);
  const first = turnQuestion('M-K-A13', 1, (f) => num(f, 'n') >= 3);
  const second = turnQuestion('M-K-A13', 2, (f) => num(f, 'n') >= 8);
  return {
    parts: [
      show(moment(['Tally marks help us keep count. We make one mark for each thing.'], 'One mark for each thing.', start)),
      ...marking.map(show),
      show(moment([{ number: 3 }, 'balls, and', { number: 3 }, 'marks.'], '3 balls, 3 marks', matched)),
      show(moment(['Here are four marks.'], '4 marks', four)),
      show(moment(['The fifth mark goes across the other four. Now it is a bundle.'], 'The 5th mark goes across.', bundled)),
      ...seven.map(show),
      show(moment(['Count a bundle as five, then count on by ones.'], 'A bundle is 5. Count on.', calm(last(seven)))),
      turn(first, tallyCount('w', num(first.facts, 'n'))),
      turn(second, tallyCount('w', num(second.facts, 'n'))),
      show(moment(['One mark for each thing, and every bundle is five.'], 'Every bundle is 5.', calm(last(seven)))),
    ],
  };
}

// ---- B.1 More, fewer or equal ----

// Two groups, first apart, then lined up one under the other so each one finds a partner.
function pairScenes(p: string, a: number, b: number, of: Countable): { apart: Scene; lined: Scene } {
  const size = 0.85;
  const apart = scene([...group(`${p}a`, art(of.emoji), a, 0.3, 1.3, 5, size), ...group(`${p}b`, art(of.emoji), b, 5.4, 1.3, 5, size)]);
  const lined = alter(apart, (piece) => {
    const index = Number(piece.id.slice(p.length + 1));
    return { ...piece, x: 0.5 + index * 0.9, y: piece.id.startsWith(`${p}a`) ? 1.2 : 2.4 };
  });
  return { apart, lined };
}

function pairUp(p: string, a: number, b: number, of: Countable): { moments: Moment[]; end: Scene } {
  const { apart, lined } = pairScenes(p, a, b, of);
  const both = Math.min(a, b);
  const paired = set(lined, [...ids(`${p}a`, both), ...ids(`${p}b`, both)], { lit: true });
  return {
    moments: [
      moment(['Here are two groups of', `${of.many}.`], `Two groups of ${of.many}`, apart),
      moment(['Line them up, one group above the other.'], 'Line them up.', lined),
      moment(['Each one on top gets a partner below.'], 'Find partners.', paired),
    ],
    end: paired,
  };
}

function leftOver(p: string, a: number, b: number, of: Countable, from: Scene): Moment[] {
  const both = Math.min(a, b);
  const extra = Math.abs(a - b);
  const extras = a > b ? ids(`${p}a`, extra, both) : ids(`${p}b`, extra, both);
  const lit = set(calm(from), extras, { lit: true });
  return [
    moment(extra === 1 ? [`One ${of.one} has no partner.`] : [{ number: extra }, `${of.many} have no partner.`], `${extra} left over`, lit),
    moment(['So the group of', { number: Math.max(a, b) }, 'has more. The group of', { number: both }, 'has fewer.'], `${Math.max(a, b)} is more. ${both} is fewer.`, lit),
  ];
}

function equalWhy(question: Question): Moment[] {
  const [a, b] = numbers(question.facts, 'values') as [number, number];
  const of = thing(str(question.facts, 'thing'));
  const paired = pairUp('w', a, b, of);
  const counts = moment(['This group has', { number: a }, '. This group has', { number: b }, '.'], `${a} and ${b}`, paired.end);
  if (a === b) return [...paired.moments, counts, moment(['Yes. Every one has a partner, so the groups are equal.'], 'Yes. The groups are equal.', set(paired.end, [...ids('wa', a), ...ids('wb', b)], { lit: true }))];
  return [...paired.moments, counts, leftOver('w', a, b, of, paired.end)[0] as Moment, moment(['No. The groups are not equal.'], 'No. They are not equal.', last(leftOver('w', a, b, of, paired.end)))];
}

export function moreFewerEqualLesson(): Lesson {
  const star = thing('star');
  const apple = thing('apple');
  const stars = pairUp('x', 3, 5, star);
  const apples = pairUp('y', 4, 4, apple);
  const equal = (f: Record<string, unknown>): boolean => f.ask === 'equal';
  const first = turnQuestion('M-K-B1', 3, (f) => equal(f) && numbers(f, 'values')[0] === numbers(f, 'values')[1] && (numbers(f, 'values')[0] ?? 0) >= 3);
  const second = turnQuestion('M-K-B1', 3, (f) => equal(f) && numbers(f, 'values')[0] !== numbers(f, 'values')[1] && (numbers(f, 'values')[0] ?? 0) >= 3 && f.thing !== first.facts.thing);
  return {
    parts: [
      show(moment(['One group can have more, fewer, or the same as another.'], 'More, fewer, or the same', pairScenes('x', 3, 5, star).apart)),
      ...stars.moments.slice(1).map(show),
      ...leftOver('x', 3, 5, star, stars.end).map(show),
      ...apples.moments.map(show),
      show(moment(['Every apple has a partner. The groups are equal.'], 'Every apple has a partner: equal.', set(apples.end, [...ids('ya', 4), ...ids('yb', 4)], { lit: true }))),
      turn(first, equalWhy(first)),
      show(moment(['Equal means the same number. Not equal means one group has more.'], 'Equal means the same number.', calm(apples.end))),
      turn(second, equalWhy(second)),
      show(moment(['Line them up. If every one has a partner, the groups are equal.'], 'Line them up and find partners.', calm(stars.end))),
    ],
  };
}

// ---- B.2 Compare numbers ----

function compareWhy(question: Question): Moment[] {
  const [a, b] = numbers(question.facts, 'values') as [number, number];
  const later = Math.max(a, b);
  const earlier = Math.min(a, b);
  const from = Math.max(1, later - 9);
  const start = set(lineScene('w', from), [`wn${a}`, `wn${b}`], { lit: true });
  const most = question.facts.ask === 'most';
  return [
    moment(['Find', { number: a }, 'and', { number: b }, 'on the number line.'], `Find ${a} and ${b}.`, start),
    moment([{ number: later }, 'comes after', { number: earlier }, 'when we count.'], `${later} comes after ${earlier}.`, point(start, `wn${later}`)),
    most ? moment(['So', { number: later }, 'is greater.'], `${later} is greater.`, point(start, `wn${later}`)) : moment(['So', { number: earlier }, 'is less.'], `${earlier} is less.`, point(start, `wn${earlier}`)),
  ];
}

export function compareNumbersLesson(): Lesson {
  const cards: Piece[] = [
    { id: 'x3', look: numeral(3), x: 2.4, y: 3.3, w: 1.2, h: 1.2 },
    { id: 'x5', look: numeral(5), x: 6.4, y: 3.3, w: 1.2, h: 1.2 },
  ];
  const cubes: Piece[] = [
    ...Array.from({ length: 3 }, (_, k): Piece => ({ id: `xa${k}`, look: { kind: 'cube' }, x: 2.75, y: 3 - (k + 1) * 0.5, w: 0.5, h: 0.5, gone: true })),
    ...Array.from({ length: 5 }, (_, k): Piece => ({ id: `xb${k}`, look: { kind: 'cube' }, x: 6.75, y: 3 - (k + 1) * 0.5, w: 0.5, h: 0.5, gone: true })),
  ];
  const numberLine = Array.from({ length: 10 }, (_, i): Piece => ({ id: `l${i + 1}`, look: numeral(i + 1), x: i, y: 4.7, h: 1, gone: true }));
  const start = scene([...cards, ...cubes, ...numberLine]);
  const built = set(start, [...ids('xa', 3), ...ids('xb', 5)], { gone: false });
  const taller = set(built, [...ids('xb', 5), 'x5'], { lit: true });
  const onLine = set(calm(set(built, ids('l', 10, 1), { gone: false })), ['l3', 'l5'], { lit: true });
  const first = turnQuestion('M-K-B2', 1, (f) => !(numbers(f, 'values').includes(3) && numbers(f, 'values').includes(5)));
  const second = turnQuestion('M-K-B2', 3, (f) => f.ask === 'least' && Math.min(...numbers(f, 'values')) >= 5 && Math.max(...numbers(f, 'values')) - Math.min(...numbers(f, 'values')) <= 9);
  return {
    parts: [
      show(moment(['Which number is greater,', { number: 3 }, 'or', { number: 5 }, '?'], 'Which is greater, 3 or 5?', start)),
      show(moment(['Let us build them with cubes.'], 'Build them with cubes.', built)),
      show(moment([{ number: 5 }, 'has more cubes, so', { number: 5 }, 'is greater.'], '5 is greater.', taller)),
      show(moment(['On the number line,', { number: 5 }, 'comes after', { number: 3 }, '.'], '5 comes after 3.', onLine)),
      show(moment(['The number that comes later when we count is greater.'], 'Later is greater.', onLine)),
      turn(first, compareWhy(first)),
      show(moment(['Less is the other way. The number that comes first is less.'], 'First is less.', set(calm(onLine), ['l3', 'x3'], { lit: true }))),
      turn(second, compareWhy(second)),
      show(moment(['Later numbers are greater. Earlier numbers are less.'], 'Later is greater. Earlier is less.', calm(onLine))),
    ],
  };
}

// ---- B.3 Put numbers in order ----

// Number cards drop onto their places above a number line, smallest first, then read left to right.
function orderMoments(p: string, values: readonly number[]): Moment[] {
  const cards = values.map((value, i): Piece => ({ id: `${p}c${value}`, look: numeral(value), x: 1 + i * 3, y: 0.6, w: 1.2, h: 1.2 }));
  const marks = Array.from({ length: 10 }, (_, i): Piece => ({ id: `${p}l${i + 1}`, look: numeral(i + 1), x: i, y: 4.7, h: 0.9, dim: true }));
  const sorted = values.slice().sort((x, y) => x - y);
  let now = scene([...cards, ...marks]);
  const out = [moment(['Count along the number line. The first one we meet is the smallest.'], 'Count along the line.', now)];
  sorted.forEach((value, i) => {
    now = alter(calm(now), (piece) => (piece.id === `${p}c${value}` ? { ...piece, x: value - 1 - 0.1, y: 3.3, lit: true } : piece.id === `${p}l${value}` ? { ...piece, dim: undefined, lit: true } : piece));
    out.push(moment([{ number: value }, i === 0 ? 'comes first.' : 'comes next.'], i === 0 ? `${value} is first.` : `Then ${value}`, now));
  });
  out.push(moment(['In order:', ...sayList(sorted), '.'], sorted.join(', '), set(now, sorted.map((value) => `${p}c${value}`), { lit: true })));
  return out;
}

const orderWhy = (question: Question): Moment[] => orderMoments('w', numbers(question.facts, 'values'));

export function orderNumbersLesson(): Lesson {
  const opening = orderMoments('x', [4, 2, 5]);
  const bigger = orderMoments('y', [9, 6, 8]);
  const first = turnQuestion('M-K-B3', 1);
  const second = turnQuestion('M-K-B3', 2, (f) => Math.max(...numbers(f, 'values')) >= 7);
  return {
    parts: [
      show(moment(['Numbers have an order. Smaller numbers come first when we count.'], 'Smaller numbers come first.', opening[0]?.scene ?? last(opening))),
      show(moment(['Let us put', { number: 4 }, ',', { number: 2 }, 'and', { number: 5 }, 'in order, smallest first.'], 'Put 4, 2, 5 in order.', opening[0]?.scene ?? last(opening))),
      ...opening.slice(1).map(show),
      show(moment(['The smallest is on the left. The biggest is on the right.'], 'Smallest on the left.', calm(last(opening)))),
      turn(first, orderWhy(first)),
      show(moment(['Bigger numbers work the same way.'], 'Bigger numbers too.', bigger[0]?.scene ?? last(bigger))),
      ...bigger.slice(1).map(show),
      turn(second, orderWhy(second)),
      show(moment(['Find the smallest first, then the next, and the next.'], 'Smallest first, then the next.', calm(last(bigger)))),
    ],
  };
}

// ---- B.4 Are there enough? ----

function enoughScene(p: string, pair: EnoughPair, need: number, have: number): Scene {
  return scene([
    ...Array.from({ length: need }, (_, i): Piece => ({ id: `${p}a${i}`, look: art(pair.emoji), x: 1.5 + i * 1.4, y: 1 })),
    ...Array.from({ length: have }, (_, j): Piece => ({ id: `${p}t${j}`, look: art(pair.wantEmoji), x: 1 + j * 1.1, y: 4.4 })),
  ]);
}

// Each thing moves under its own animal. Then: enough, or the ones with none.
function matchMoments(p: string, pair: EnoughPair, need: number, have: number, ask: 'enough' | 'more' | 'show'): Moment[] {
  let now = enoughScene(p, pair, need, have);
  const out = [moment([`Match each ${pair.one} with one ${pair.want}.`], `Match each ${pair.one} with one ${pair.want}.`, now)];
  for (let j = 0; j < have; j += 1) {
    now = alter(calm(now), (piece) => (piece.id === `${p}t${j}` ? { ...piece, x: 1.5 + j * 1.4, y: 2.1, lit: true } : piece.id === `${p}a${j}` ? { ...piece, lit: true } : piece));
    if (j < need) out.push(moment([{ number: j + 1 }], String(j + 1), now));
  }
  if (have >= need) {
    const every = set(now, [...ids(`${p}a`, need), ...ids(`${p}t`, need)], { lit: true });
    const line = `Every ${pair.one} gets one. There are enough.`;
    return [...out, moment([ask === 'enough' ? `Yes. ${line}` : line], 'There are enough.', every)];
  }
  const short = need - have;
  const without = ids(`${p}a`, short, have);
  const lit = set(calm(now), without, { lit: true });
  if (ask === 'more') {
    const counted = countAlong(lit, without);
    return [
      ...out,
      moment([`Count the ${pair.many} with none.`], `Count the ${pair.many} with none.`, lit),
      ...counted.moments,
      moment(['We need', { number: short }, `more ${short === 1 ? pair.want : pair.wants}.`], `We need ${short} more.`, set(counted.end, without, { lit: true })),
    ];
  }
  out.push(moment([short === 1 ? `This ${pair.one} has none.` : `These ${pair.many} have none.`], `${short} with none`, lit));
  return [...out, moment([`${ask === 'enough' ? 'No. ' : 'So '}there are not enough ${pair.wants}.`], 'Not enough', lit)];
}

function enoughWhy(question: Question): Moment[] {
  const pair = ENOUGH_PAIRS.find((each) => each.one === str(question.facts, 'thing'));
  if (!pair) throw new Error('No pair');
  return matchMoments('w', pair, num(question.facts, 'need'), num(question.facts, 'have'), question.facts.ask === 'enough' ? 'enough' : 'more');
}

export function enoughLesson(): Lesson {
  const rabbit = ENOUGH_PAIRS[0] as EnoughPair;
  const opening = matchMoments('x', rabbit, 4, 3, 'show');
  const first = turnQuestion('M-K-B4', 1, (f) => num(f, 'need') >= 3);
  const second = turnQuestion('M-K-B4', 2, (f) => num(f, 'need') - num(f, 'have') >= 2 && str(f, 'thing') !== str(first.facts, 'thing'));
  return {
    parts: [
      show(moment(['Is there a carrot for every rabbit? Let us find out.'], 'A carrot for every rabbit?', enoughScene('x', rabbit, 4, 3))),
      ...opening.slice(1).map(show),
      show(moment(['Match them one to one. If one is left with none, there are not enough.'], 'Match one to one.', last(opening))),
      turn(first, enoughWhy(first)),
      show(moment(['To find how many more we need, count the ones with none.'], 'Count the ones with none.', calm(last(opening)))),
      turn(second, enoughWhy(second)),
      show(moment(['Match one to one, then look for any with none.'], 'Match one to one.', calm(last(opening)))),
    ],
  };
}

// ---- B.5 Compare a group and a number ----

function groupMoments(p: string, count: number, shown: number, of: Countable, ask: 'most' | 'least'): Moment[] {
  const items = group(`${p}g`, art(of.emoji), count, 0.8, 1.2, 5, 0.9);
  const start = scene([
    ...items,
    { id: `${p}num`, look: numeral(shown), x: 7, y: 1.4, w: 1.5, h: 1.5 },
    { id: `${p}cnt`, look: numeral(count), x: 2.3, y: 3.5, w: 1.2, h: 1.2, gone: true },
  ]);
  const counted = countAlong(start, ids(`${p}g`, count));
  const named = set(counted.end, [`${p}cnt`], { gone: false, lit: true });
  const both = set(calm(named), [`${p}cnt`, `${p}num`], { lit: true });
  const bigger = Math.max(count, shown);
  const smaller = Math.min(count, shown);
  const answer = ask === 'most' ? bigger : smaller;
  const winner = answer === shown ? 'The number' : `The ${of.many}`;
  const pickId = answer === shown ? `${p}num` : `${p}cnt`;
  return [
    moment([`First, count the ${of.many}.`], `Count the ${of.many}.`, start),
    ...counted.moments,
    moment(['There', isAre(count), { number: count }, `${many(count, of)}.`], `${count} ${many(count, of)}`, named),
    moment(['Now compare', { number: count }, 'and', { number: shown }, '.'], `Compare ${count} and ${shown}.`, both),
    moment([{ number: bigger }, 'comes after', { number: smaller }, 'when we count.'], `${bigger} comes after ${smaller}.`, both),
    moment(['So', { number: answer }, ask === 'most' ? 'is more.' : 'is fewer.', `${winner} ${ask === 'most' ? 'shows more' : 'shows fewer'}.`], `${winner} ${ask === 'most' ? 'shows more' : 'shows fewer'}.`, set(calm(both), [pickId], { lit: true })),
  ];
}

function groupCount(question: Question): number {
  if (question.type !== 'choice') throw new Error('Not a choice');
  const picture = question.options.find((each) => each.kind === 'emojiGroup');
  if (!picture || picture.kind !== 'emojiGroup') throw new Error('No group');
  return picture.count;
}

function groupWhy(question: Question): Moment[] {
  const count = groupCount(question);
  const values = numbers(question.facts, 'values');
  const shown = values[0] === count ? (values[1] as number) : (values[0] as number);
  return groupMoments('w', count, shown, thing(str(question.facts, 'thing')), question.facts.ask === 'least' ? 'least' : 'most');
}

const numberWins = (question: Question): boolean => question.type === 'choice' && question.options[question.answerIndex]?.kind === 'text';

export function groupVsNumberLesson(): Lesson {
  const apple = thing('apple');
  const opening = groupMoments('x', 3, 5, apple, 'most');
  const first = pick('M-K-B5', 1, (q) => numberWins(q) && q.facts.ask === 'most' && str(q.facts, 'thing') !== 'apple' && groupCount(q) >= 2);
  const second = pick('M-K-B5', 3, (q) => numberWins(q) && q.facts.ask === 'least' && q.facts.thing !== first.facts.thing && groupCount(q) >= 4);
  return {
    parts: [
      show(moment(['Which shows more: the apples, or the number?'], 'Which shows more?', opening[0]?.scene ?? last(opening))),
      ...opening.map(show),
      show(moment(['Count the group first. Then compare the two numbers.'], 'Count the group, then compare.', calm(last(opening)))),
      turn(first, groupWhy(first)),
      show(moment(['If the question says fewer, pick the smaller number.'], 'Fewer: the smaller number.', set(calm(last(opening)), ['xcnt'], { lit: true }))),
      turn(second, groupWhy(second)),
      show(moment(['Count the group, then see which number comes later.'], 'Count, then compare.', calm(last(opening)))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-K-A2': tenFrameLesson,
  'M-K-A3': tenFramesTo20Lesson,
  'M-K-A4': whatComesNextLesson,
  'M-K-A5': beforeAfterLesson,
  'M-K-A6': missingNumberRowLesson,
  'M-K-A7': countByTensLesson,
  'M-K-A8': countOneKindLesson,
  'M-K-A9': findTo20Lesson,
  'M-K-A10': numberWordsLesson,
  'M-K-A11': firstToFifthLesson,
  'M-K-A12': countBackLesson,
  'M-K-A13': tallyLesson,
  'M-K-B1': moreFewerEqualLesson,
  'M-K-B2': compareNumbersLesson,
  'M-K-B3': orderNumbersLesson,
  'M-K-B4': enoughLesson,
  'M-K-B5': groupVsNumberLesson,
};
