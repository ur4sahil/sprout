import { numberWords } from '../../audio/say';
import { STORY_COUNTABLES } from '../../content/data/countables';
import { spoken } from '../../content/generators/math/k/h1-parts';
import type { Question, Say, Visual } from '../../engine/types';
import { alter, art, calm, countAlong, group, ids, moment, num, numeral, picture, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, PieceLook, Scene } from '../types';

// Grade 1 Math lessons that teach (plan section 16): numbers to 120, place value, adding and subtracting.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

const tensWord = (n: number): string => (n === 1 ? 'ten' : 'tens');
const onesWord = (n: number): string => (n === 1 ? 'one' : 'ones');
const isAre = (n: number): string => (n === 1 ? 'is' : 'are');
const last = (moments: Moment[], fallback: Scene): Scene => moments.at(-1)?.scene ?? fallback;
const piece = (from: Scene, id: string): Piece | undefined => from.pieces.find((each) => each.id === id);
// Points the hand at a piece, if it is on the stage.
const pointTo = (from: Scene, id: string): Scene => {
  const target = piece(from, id);
  return target ? pointAt(from, target) : from;
};
// Changes one piece's look, and lights it.
const become = (from: Scene, id: string, look: PieceLook): Scene => alter(from, (each) => (each.id === id ? { ...each, look, lit: true, gone: false } : each));

// ---- Shared pieces ----

// A row of numerals and signs (a '?' is an empty box), centred across the stage. Ids are prefix0, prefix1, ...
function eqRow(prefix: string, parts: readonly (number | string)[], y: number, h = 1, cols = 10): Piece[] {
  const width = (part: number | string): number => (typeof part === 'number' ? (String(part).length === 1 ? 0.9 : String(part).length === 2 ? 1.4 : 1.9) : part === '?' ? 1.1 : 0.8) * h;
  const total = parts.reduce<number>((sum, part) => sum + width(part) + 0.1 * h, 0);
  let x = Math.max(0, (cols - total) / 2);
  return parts.map((part, i) => {
    const w = width(part);
    const look: PieceLook = typeof part === 'number' ? numeral(part) : part === '?' ? { kind: 'box' } : text(part);
    const made: Piece = { id: `${prefix}${i}`, look, x, y, w, h };
    x += w + 0.1 * h;
    return made;
  });
}

// Base-ten blocks: rods standing side by side, and cubes in columns of five beside them.
const ROD_STEP = 0.7;
const CUBE = 0.5;
function rods(prefix: string, count: number, x: number, y: number, step = ROD_STEP, w = 0.55): Piece[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}r${i}`, look: { kind: 'rod' as const }, x: x + i * step, y, w, h: 2.6 }));
}
const cubeAt = (x: number, y: number, k: number): { x: number; y: number } => ({ x: x + Math.floor(k / 5) * 0.55, y: y + (k % 5) * 0.52 });
function cubes(prefix: string, count: number, x: number, y: number, from = 0): Piece[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}c${from + i}`, look: { kind: 'cube' as const }, ...cubeAt(x, y, from + i), w: CUBE, h: CUBE }));
}

// Crossing out from the end, one at a time, saying how many are left.
function countBack(start: Scene, pieceIds: readonly string[], take: number): { moments: Moment[]; end: Scene } {
  let now = calm(start);
  const moments: Moment[] = [];
  for (let k = 1; k <= take; k += 1) {
    const id = pieceIds[pieceIds.length - k] as string;
    const leftNow = pieceIds.length - k;
    now = alter(now, (each) => (each.id === id ? { ...each, crossed: true, lit: true, badge: String(leftNow) } : each.badge ? { ...each, badge: undefined, lit: undefined } : each));
    now = pointTo(now, id);
    moments.push(moment([{ number: leftNow }], String(leftNow), now));
  }
  return { moments, end: withoutHand(calm(now)) };
}

// ---- M-1-A1 Count to 120 ----

function afterMoments(p: string, n: number): Moment[] {
  const start = scene([
    { id: `${p}a`, look: numeral(n - 1), x: 1.4, y: 1.8, w: 2, h: 1.2 },
    { id: `${p}b`, look: numeral(n), x: 4, y: 1.8, w: 2, h: 1.2 },
    { id: `${p}c`, look: { kind: 'box' }, x: 6.6, y: 1.8, w: 2, h: 1.2 },
  ]);
  const one = pointTo(set(start, [`${p}a`], { lit: true, badge: '1' }), `${p}a`);
  const two = pointTo(set(start, [`${p}a`, `${p}b`], { lit: true }), `${p}b`);
  const three = pointTo(become(two, `${p}c`, numeral(n + 1)), `${p}c`);
  return [
    moment(['What number comes after', { number: n }, '?'], `What comes after ${n}?`, set(start, [`${p}b`, `${p}c`], { lit: true })),
    moment(['Let us count up to it, and say one more.'], 'Count up, then one more.', start),
    moment([{ number: n - 1 }], String(n - 1), calm(one)),
    moment([{ number: n }], String(n), two),
    moment(['The next number is', { number: n + 1 }, '.'], `Next is ${n + 1}.`, three),
    moment([{ number: n + 1 }, 'comes after', { number: n }, '.'], `${n + 1} comes after ${n}.`, set(withoutHand(calm(three)), [`${p}b`, `${p}c`], { lit: true })),
  ];
}

export function countTo120Lesson(): Lesson {
  const opening = afterMoments('x', 47);
  const crossing = afterMoments('y', 39);
  const first = turnQuestion('M-1-A1', 1, (f) => num(f, 'n') % 10 >= 1 && num(f, 'n') % 10 <= 7 && num(f, 'n') !== 47);
  const second = turnQuestion('M-1-A1', 2, (f) => num(f, 'n') % 10 === 9 && num(f, 'n') < 99);
  const hundred = scene(eqRow('h', [99, 100, 101, 102], 1.8, 1.2));
  return {
    parts: [
      show(moment(['When we count, each number is one more than the one before.'], 'Each number is one more.', calm(opening[0]?.scene ?? hundred))),
      ...opening.map(show),
      show(moment(['After means the next number when we count.'], 'After = the next number.', calm(last(opening, hundred)))),
      turn(first, afterMoments('w', num(first.facts, 'n'))),
      show(moment(['When the ones get to nine, the next number starts a new ten.'], 'After 9 ones comes a new ten.', calm(crossing[0]?.scene ?? hundred))),
      ...crossing.slice(2).map(show),
      show(moment(['After', { number: 99 }, 'comes', { number: 100 }, '. Then', { number: 101 }, ', and', { number: 102 }, '.'], '99, 100, 101, 102', set(hundred, ids('h', 4), { lit: true }))),
      turn(second, afterMoments('w', num(second.facts, 'n'))),
      show(moment(['Before means the number just behind. Before', { number: 60 }, 'comes', { number: 59 }, '.'], 'Before 60 comes 59.', set(scene(eqRow('b', [59, 60], 1.8, 1.2)), ['b0'], { lit: true, badge: 'before' }))),
      show(moment(['After is one more. Before is one less.'], 'After: one more. Before: one less.', calm(last(opening, hundred)))),
    ],
  };
}

// ---- M-1-A2 Skip count by 2s, 5s, 10s ----

const STEP_WORD: Record<number, string> = { 2: 'twos', 5: 'fives', 10: 'tens' };

function skipMoments(p: string, start: number, step: number): Moment[] {
  const values = Array.from({ length: 5 }, (_, i) => start + i * step);
  const tiles: Piece[] = values.map((value, i) => ({ id: `${p}${i}`, look: i === 4 ? { kind: 'box' } : numeral(value), x: 0.3 + i * 1.9, y: 1.9, w: 1.7, h: 1.1 }));
  let now = scene(tiles);
  const moments: Moment[] = [moment(['We are counting by', `${STEP_WORD[step] ?? 'jumps'}.`], `Count by ${step}s.`, now)];
  values.slice(0, 4).forEach((value, i) => {
    now = pointTo(set(alter(now, (each) => ({ ...each, badge: undefined })), [`${p}${i}`], { lit: true, badge: i > 0 ? `+${step}` : undefined }), `${p}${i}`);
    moments.push(moment([{ number: value }], String(value), now));
  });
  const jumps = withoutHand(calm(set(now, ids(p, 4), { lit: true })));
  const answer = values[4] as number;
  moments.push(
    moment(['Each jump adds', { number: step }, '.'], `+${step} each time`, set(jumps, ids(p, 3, 1), { badge: `+${step}` })),
    moment(['So next is', { number: answer }, '.'], `Next is ${answer}.`, set(become(calm(jumps), `${p}4`, numeral(answer)), [`${p}4`], { badge: `+${step}` })),
  );
  return moments;
}

export function skipCountLesson(): Lesson {
  const tens = skipMoments('x', 10, 10);
  const fives = skipMoments('y', 5, 5);
  const twos = skipMoments('z', 2, 2);
  // 5, 10, a box, 20, 25: the box is one jump on from the number before it.
  const middle = scene([5, 10, 15, 20, 25].map((value, i): Piece => ({ id: `m${i}`, look: i === 2 ? { kind: 'box' } : numeral(value), x: 0.3 + i * 1.9, y: 1.9, w: 1.7, h: 1.1, lit: i === 1 || i === 2 ? true : undefined, badge: i === 2 ? '+5' : undefined })));
  const first = turnQuestion('M-1-A2', 1, (f) => num(f, 'start') !== 10 && num(f, 'start') <= 50);
  const second = turnQuestion('M-1-A2', 2, (f) => num(f, 'start') !== 5 && num(f, 'start') <= 30);
  const why = (q: Question): Moment[] => skipMoments('w', num(q.facts, 'start'), num(q.facts, 'step'));
  return {
    parts: [
      show(moment(['Skip counting means jumping by the same number each time.'], 'Skip counting: the same jump each time.', calm(tens[0]?.scene ?? scene([])))),
      ...tens.map(show),
      turn(first, why(first)),
      show(moment(['Jumps can be other sizes too.'], 'Other jumps', calm(fives[0]?.scene ?? scene([])))),
      ...fives.map(show),
      turn(second, why(second)),
      show(moment(['Now twos. They go fast.'], 'Count by 2s.', calm(twos[0]?.scene ?? scene([])))),
      ...twos.map(show),
      show(moment(['If the box is in the middle, jump from the number before it.'], 'A box in the middle? Jump from the number before.', middle)),
      show(moment(['Find the jump, then add it one more time.'], 'Find the jump. Add it once more.', calm(last(twos, scene([]))))),
    ],
  };
}

// ---- M-1-A3 Tens and ones ----

// Rods and cubes for n, with its two digits under them (hidden until named).
function blocksScene(p: string, n: number): Scene {
  const t = Math.floor(n / 10);
  const o = n % 10;
  return scene([
    ...rods(p, t, 0.5, 0.5),
    ...cubes(p, o, 0.9 + t * ROD_STEP, 0.5),
    { id: `${p}dt`, look: numeral(t), x: 3.9, y: 4.1, w: 1, h: 1.3, gone: true },
    { id: `${p}do`, look: numeral(o), x: 5.1, y: 4.1, w: 1, h: 1.3, gone: true },
  ]);
}

function blockMoments(p: string, n: number): Moment[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  let now = blocksScene(p, n);
  const moments: Moment[] = [moment(['Let us count the tens first. Each rod is ten.'], 'Count the tens first.', set(now, ids(`${p}r`, t), { lit: true }))];
  for (let i = 0; i < t; i += 1) {
    now = pointTo(set(alter(now, (each) => ({ ...each, badge: undefined })), [`${p}r${i}`], { lit: true, badge: String((i + 1) * 10) }), `${p}r${i}`);
    moments.push(moment([{ number: (i + 1) * 10 }], String((i + 1) * 10), now));
  }
  now = set(withoutHand(now), [`${p}dt`], { gone: false, lit: true });
  moments.push(moment([{ number: t }, `${tensWord(t)} is`, { number: t * 10 }, '.'], `${t} ${tensWord(t)} = ${t * 10}`, now));
  if (o > 0) {
    const counted = countAlong(calm(now), ids(`${p}c`, o), t * 10);
    moments.push(moment(['Now count on the ones.'], 'Count on the ones.', set(calm(now), ids(`${p}c`, o), { lit: true })), ...counted.moments);
    now = counted.end;
  }
  const all = set(calm(now), [...ids(`${p}r`, t), ...ids(`${p}c`, o), `${p}dt`, `${p}do`], { lit: true, gone: false });
  moments.push(
    o > 0
      ? moment([{ number: t }, `${tensWord(t)}, and`, { number: o }, `${onesWord(o)}, make`, { number: n }, '.'], `${t} ${tensWord(t)} and ${o} ${onesWord(o)} make ${n}`, all)
      : moment([{ number: t }, `${tensWord(t)} and no ones make`, { number: n }, '.'], `${t} ${tensWord(t)} and 0 ones make ${n}`, all),
  );
  return moments;
}

export function tensOnesLesson(): Lesson {
  const opening = blockMoments('x', 23);
  const start = blocksScene('x', 23);
  const done = calm(last(opening, start));
  const first = turnQuestion('M-1-A3', 1, (f) => num(f, 'ones') >= 2 && num(f, 'tens') * 10 + num(f, 'ones') !== 23);
  const second = turnQuestion('M-1-A3', 2, (f) => num(f, 'ones') >= 1 && num(f, 'tens') >= 4 && num(f, 'tens') <= 7);
  const why = (q: Question): Moment[] => {
    const n = num(q.facts, 'tens') * 10 + num(q.facts, 'ones');
    return [moment(['What number do these blocks show?'], 'What number is this?', blocksScene('w', n)), ...blockMoments('w', n)];
  };
  return {
    parts: [
      show(moment(['A long rod is one ten. A small cube is one.'], 'A rod is 10. A cube is 1.', set(start, ['xr0', 'xc0'], { lit: true }))),
      show(moment(['What number do these blocks show?'], 'What number is this?', start)),
      ...opening.map(show),
      show(moment(['The first digit tells how many tens.'], 'First digit: tens', set(done, ['xr0', 'xr1', 'xdt'], { lit: true }))),
      show(moment(['The second digit tells how many ones.'], 'Second digit: ones', set(done, ['xc0', 'xc1', 'xc2', 'xdo'], { lit: true }))),
      turn(first, why(first)),
      turn(second, why(second)),
      show(moment(['Count the tens first, then count on the ones.'], 'Tens first, then ones.', done)),
    ],
  };
}

// ---- M-1-A4 Compare two-digit numbers ----

// Two numbers, each as a tens digit and a ones digit, with their tens as thin rods underneath.
function compareScene(p: string, a: number, b: number): Scene {
  const digits = (side: string, n: number, x: number): Piece[] => [
    { id: `${p}${side}t`, look: numeral(Math.floor(n / 10)), x, y: 1.2, w: 1, h: 1.5 },
    { id: `${p}${side}o`, look: numeral(n % 10), x: x + 1.05, y: 1.2, w: 1, h: 1.5 },
  ];
  return scene([
    ...digits('a', a, 1.4),
    ...digits('b', b, 6.4),
    { id: `${p}sign`, look: text(a > b ? '>' : '<'), x: 4.4, y: 1.2, w: 1.2, h: 1.5, gone: true },
    ...rods(`${p}a`, Math.floor(a / 10), 0.3, 3.2, 0.5, 0.4),
    ...rods(`${p}b`, Math.floor(b / 10), 5.4, 3.2, 0.5, 0.4),
  ]);
}

function compareMoments(p: string, a: number, b: number, ask: string): Moment[] {
  const start = compareScene(p, a, b);
  const [ta, tb] = [Math.floor(a / 10), Math.floor(b / 10)];
  const [big, small] = a > b ? [a, b] : [b, a];
  const bigSide = a > b ? 'a' : 'b';
  const tensLit = set(start, [`${p}at`, `${p}bt`, ...ids(`${p}ar`, ta), ...ids(`${p}br`, tb)], { lit: true });
  const moments: Moment[] = [
    moment([ask === 'most' ? 'Which number is greater?' : 'Which number is less?'], ask === 'most' ? 'Which is greater?' : 'Which is less?', start),
    moment(['Look at the tens first.'], 'Tens first.', tensLit),
  ];
  if (ta !== tb) {
    const [bt, st] = [Math.max(ta, tb), Math.min(ta, tb)];
    moments.push(moment([{ number: bt }, `${tensWord(bt)} is more than`, { number: st }, `${tensWord(st)}.`], `${bt} tens > ${st} tens`, set(calm(start), [`${p}${bigSide}t`, ...ids(`${p}${bigSide}r`, bt)], { lit: true })));
  } else {
    const [bo, so] = [Math.max(a % 10, b % 10), Math.min(a % 10, b % 10)];
    moments.push(
      moment(['The tens are the same. So look at the ones.'], 'Same tens. Look at the ones.', set(calm(start), [`${p}ao`, `${p}bo`], { lit: true })),
      moment([{ number: bo }, `${onesWord(bo)} is more than`, { number: so }, `${onesWord(so)}.`], `${bo} > ${so}`, set(calm(start), [`${p}${bigSide}o`], { lit: true })),
    );
  }
  const signed = set(calm(start), [`${p}sign`], { gone: false, lit: true });
  moments.push(
    ask === 'most'
      ? moment([{ number: big }, 'is greater than', { number: small }, '.'], `${big} is greater than ${small}`, set(signed, [`${p}${bigSide}t`, `${p}${bigSide}o`], { lit: true }))
      : moment([{ number: small }, 'is less than', { number: big }, '.'], `${small} is less than ${big}`, set(signed, a > b ? [`${p}bt`, `${p}bo`] : [`${p}at`, `${p}ao`], { lit: true })),
  );
  return moments;
}

export function compareLesson(): Lesson {
  const opening = compareMoments('x', 52, 38, 'most');
  const same = compareMoments('y', 64, 67, 'least');
  const first = turnQuestion('M-1-A4', 1, (f) => f.ask === 'most');
  const second = turnQuestion('M-1-A4', 2, (f) => f.ask === 'least');
  const why = (q: Question): Moment[] => {
    const [a, b] = q.facts.values as [number, number];
    return compareMoments('w', a, b, str(q.facts, 'ask'));
  };
  return {
    parts: [
      show(moment(['To compare two numbers, we look at the tens first.'], 'Compare the tens first.', compareScene('x', 52, 38))),
      ...opening.map(show),
      show(moment(['More tens means a greater number.'], 'More tens, greater number.', calm(last(opening, compareScene('x', 52, 38))))),
      show(moment(['We write it with this sign. Its open side faces the bigger number.'], '52 > 38: greater than', set(calm(last(opening, compareScene('x', 52, 38))), ['xsign'], { lit: true }))),
      turn(first, why(first)),
      show(moment(['When the tens are the same, the ones decide.'], 'Same tens? The ones decide.', compareScene('y', 64, 67))),
      ...same.map(show),
      show(moment(['This sign means less than. The open side still faces the bigger number.'], '64 < 67: less than', set(calm(last(same, compareScene('y', 64, 67))), ['ysign'], { lit: true }))),
      turn(second, why(second)),
      show(moment(['Same tens, and same ones? Then the numbers are equal.'], '45 = 45: equal', set(scene(eqRow('q', [45, '=', 45], 1.2, 1.5)), ['q1'], { lit: true }))),
      show(moment(['Tens first. If the tens are the same, look at the ones.'], 'Tens first, then ones.', calm(last(same, compareScene('y', 64, 67))))),
    ],
  };
}

// ---- M-1-A5 Ten more, ten less ----

function tenScene(p: string, n: number, more: boolean): Scene {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const shown = rods(p, more ? t + 1 : t, 0.5, 0.5).map((rod, i) => (i >= t ? { ...rod, gone: true } : rod));
  return scene([
    ...shown,
    ...cubes(p, o, 0.9 + (more ? t + 1 : t) * ROD_STEP, 0.5),
    { id: `${p}dt`, look: numeral(t), x: 3.9, y: 4.1, w: 1, h: 1.3, gone: t === 0 },
    { id: `${p}do`, look: numeral(o), x: 5.1, y: 4.1, w: 1, h: 1.3 },
  ]);
}

function tenMoments(p: string, n: number, more: boolean): Moment[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const answer = more ? n + 10 : n - 10;
  const newT = more ? t + 1 : t - 1;
  const way = more ? 'more' : 'less';
  const start = tenScene(p, n, more);
  const changed = more ? set(start, [`${p}r${t}`], { gone: false, lit: true }) : set(start, [`${p}r${t - 1}`], { crossed: true, lit: true });
  const after = more ? calm(changed) : set(calm(changed), [`${p}r${t - 1}`], { gone: true });
  const digit = newT === 0 ? set(after, [`${p}dt`], { gone: true }) : become(after, `${p}dt`, numeral(newT));
  return [
    moment(['What is ten', way, 'than', { number: n }, '?'], `10 ${way} than ${n}?`, start),
    o > 0
      ? moment([{ number: n }, 'is', { number: t }, `${tensWord(t)}, and`, { number: o }, `${onesWord(o)}.`], `${n} is ${t} ${tensWord(t)} and ${o} ${onesWord(o)}`, set(start, [...ids(`${p}r`, t), ...ids(`${p}c`, o)], { lit: true }))
      : moment([{ number: n }, 'is', { number: t }, `${tensWord(t)}.`], `${n} is ${t} ${tensWord(t)}`, set(start, ids(`${p}r`, t), { lit: true })),
    moment([more ? 'Ten more means one more ten.' : 'Ten less means one ten goes away.'], more ? 'One more ten.' : 'One ten goes away.', changed),
    moment(['Now there', isAre(newT), { number: newT }, `${tensWord(newT)}.`], `${newT} ${tensWord(newT)}`, digit),
    moment(['The ones stay the same.'], 'The ones stay the same.', set(calm(digit), [...ids(`${p}c`, o), `${p}do`], { lit: true })),
    moment(['So ten', way, 'than', { number: n }, 'is', { number: answer }, '.'], `10 ${way} than ${n} is ${answer}.`, set(calm(digit), [`${p}dt`, `${p}do`], { lit: true })),
  ];
}

export function tenMoreLessLesson(): Lesson {
  const opening = tenMoments('x', 36, true);
  const less = tenMoments('y', 52, false);
  const first = turnQuestion('M-1-A5', 1, (f) => num(f, 'a') % 10 !== 0 && num(f, 'a') >= 11 && num(f, 'a') <= 79 && num(f, 'a') !== 36);
  const second = turnQuestion('M-1-A5', 2, (f) => num(f, 'a') % 10 !== 0 && num(f, 'a') >= 21 && num(f, 'a') !== 52);
  return {
    parts: [
      show(moment(['Ten more, or ten less, changes only the tens.'], '10 more or 10 less: only the tens change.', tenScene('x', 36, true))),
      ...opening.map(show),
      turn(first, tenMoments('w', num(first.facts, 'a'), true)),
      show(moment(['Now let us take a ten away.'], 'Take a ten away.', tenScene('y', 52, false))),
      ...less.map(show),
      turn(second, tenMoments('w', num(second.facts, 'a'), false)),
      show(moment(['Ten more adds a ten. Ten less takes a ten away.'], '10 more: add a ten. 10 less: take a ten.', calm(last(less, tenScene('y', 52, false))))),
    ],
  };
}

// ---- M-1-A8 Put numbers to 120 in order ----

function orderScene(p: string, values: readonly number[]): Scene {
  const left = (10 - values.length * 2.2 + 0.3) / 2;
  return scene(values.map((value, i) => ({ id: `${p}${i}`, look: numeral(value), x: left + i * 2.2, y: 0.6, w: 1.9, h: 1.2 })));
}

function orderMoments(p: string, values: readonly number[]): Moment[] {
  const start = orderScene(p, values);
  const left = (10 - values.length * 2.2 + 0.3) / 2;
  const sorted = values.map((value, i) => ({ value, i })).sort((x, y) => x.value - y.value);
  const tens = (n: number): number => Math.floor(n / 10);
  let now = alter(start, (each) => {
    const value = values[Number(each.id.slice(p.length))] as number;
    return { ...each, lit: true, badge: `${tens(value)} ${tensWord(tens(value))}` };
  });
  const moments: Moment[] = [moment(['Smallest first. Look at the tens of each number.'], 'Look at the tens.', now)];
  now = calm(now);
  sorted.forEach(({ value, i }, k) => {
    now = alter(now, (each) => (each.id === `${p}${i}` ? { ...each, x: left + k * 2.2, y: 3.4, lit: true } : { ...each, lit: undefined }));
    const before = sorted[k - 1]?.value;
    const say: Say =
      k === 0
        ? [{ number: value }, 'has the fewest tens. It goes first.']
        : before !== undefined && tens(before) === tens(value)
          ? [{ number: value }, 'has the same tens as', { number: before }, ', but more ones. It goes next.']
          : k === sorted.length - 1
            ? [{ number: value }, 'has the most tens. It goes last.']
            : ['Next is', { number: value }, '.'];
    moments.push(moment(say, String(value), now));
  });
  const order: Say = sorted.flatMap(({ value }, k) => (k === 0 ? [{ number: value }] : [',', { number: value }]));
  moments.push(moment(['In order:', ...order, '.'], sorted.map(({ value }) => value).join(', '), set(calm(now), ids(p, values.length), { lit: true })));
  return moments;
}

export function orderLesson(): Lesson {
  const opening = orderMoments('x', [41, 23, 35]);
  const same = orderMoments('y', [64, 27, 61, 45]);
  const first = turnQuestion('M-1-A8', 1);
  const second = turnQuestion('M-1-A8', 2, (f) => Math.max(...(f.values as number[])) <= 99);
  const why = (q: Question): Moment[] => [moment(['Let us put them in order.'], 'Put them in order.', orderScene('w', q.facts.values as number[])), ...orderMoments('w', q.facts.values as number[])];
  return {
    parts: [
      show(moment(['To put numbers in order, we compare their tens.'], 'Compare the tens.', orderScene('x', [41, 23, 35]))),
      ...opening.map(show),
      turn(first, why(first)),
      show(moment(['If two numbers have the same tens, look at the ones.'], 'Same tens? Look at the ones.', orderScene('y', [64, 27, 61, 45]))),
      ...same.map(show),
      turn(second, why(second)),
      show(moment(['A number past one hundred is bigger than any two-digit number.'], 'Past 100: bigger than any two-digit number.', set(orderScene('z', [87, 99, 104]), ['z2'], { lit: true }))),
      show(moment(['Fewest tens first. Same tens? Fewer ones first.'], 'Tens first, then ones.', calm(last(same, orderScene('y', [64, 27, 61, 45]))))),
    ],
  };
}

// ---- M-1-A6 Hear and find numbers to 120 ----

// Empty boxes for the digits, filled as the number is heard, and the numerals to choose from below.
function hearScene(p: string, n: number, options: readonly number[]): Scene {
  const digits = String(n).length;
  const left = (10 - digits * 1.4) / 2;
  return scene([
    ...Array.from({ length: digits }, (_, i) => ({ id: `${p}d${i}`, look: { kind: 'box' as const }, x: left + i * 1.4, y: 0.6, w: 1.2, h: 1.4 })),
    ...options.map((value, i) => ({ id: `${p}o${i}`, look: numeral(value), x: 0.2 + i * 2.45, y: 3.9, w: 2.2, h: 1 })),
  ]);
}

function hearMoments(p: string, n: number, options: readonly number[]): Moment[] {
  const digits = String(n).split('').map(Number);
  const start = hearScene(p, n, options);
  let now = calm(start);
  const moments: Moment[] = [moment(['Listen:', { number: n }, '. Let us write it, one part at a time.'], 'Listen, then write it.', set(start, ids(`${p}d`, digits.length), { lit: true }))];
  const fill = (at: number[], say: Say, caption: string): void => {
    now = calm(now);
    for (const i of at) now = become(now, `${p}d${i}`, numeral(digits[i] as number));
    moments.push(moment(say, caption, now));
  };
  const hundred = digits.length === 3;
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const rest = n % 100;
  const [ti, oi] = hundred ? [1, 2] : [0, 1];
  if (hundred) fill([0], ['One hundred means we write a one first.'], '100: write 1.');
  if (hundred && rest === 0) {
    fill([1, 2], ['No tens and no ones, so we write two zeros.'], '0 tens, 0 ones');
  } else if (hundred && rest < 10) {
    fill([ti], ['There are no tens, so we write a zero.'], '0 tens');
    fill([oi], ['Then', { number: o }, 'ones. We write a', { number: o }, '.'], `${o} ones`);
  } else if (rest < 20) {
    fill([ti, oi], [{ number: rest }, 'is one ten and', { number: o }, `${onesWord(o)}. We write a one, then a`, { number: o }, '.'], `${rest}: 1 ten, ${o} ${onesWord(o)}`);
  } else {
    fill([ti], [{ word: numberWords(t * 10) }, 'means', { number: t }, `${tensWord(t)}. We write a`, { number: t }, '.'], `${numberWords(t * 10)}: ${t}`);
    if (o > 0) fill([oi], ['Then', { word: numberWords(o) }, '. We write a', { number: o }, '.'], `${numberWords(o)}: ${o}`);
    else fill([oi], ['There are no ones, so we write a zero.'], '0 ones');
  }
  const right = options.indexOf(n);
  moments.push(moment(['Find the one that looks the same. That is', { number: n }, '.'], `${n}`, right >= 0 ? set(calm(now), [`${p}o${right}`, ...ids(`${p}d`, digits.length)], { lit: true }) : set(calm(now), ids(`${p}d`, digits.length), { lit: true })));
  return moments;
}

export function hearNumberLesson(): Lesson {
  const twoDigit = hearMoments('x', 47, [37, 46, 47, 74]);
  const hundred = hearMoments('y', 107, [17, 107, 170, 1007]);
  const first = turnQuestion('M-1-A6', 1, (f) => num(f, 'target') !== 47 && num(f, 'target') % 10 !== 0);
  const second = turnQuestion('M-1-A6', 2, (f) => num(f, 'target') !== 107 && num(f, 'target') % 100 >= 1);
  const why = (q: Question): Moment[] => hearMoments('w', num(q.facts, 'target'), q.facts.options as number[]);
  return {
    parts: [
      show(moment(['When we hear a number, we write it one part at a time.'], 'Hear it, write it part by part.', hearScene('x', 47, [37, 46, 47, 74]))),
      ...twoDigit.map(show),
      turn(first, why(first)),
      show(moment(['Numbers past one hundred start with a one, for the hundred.'], 'Past 100: start with 1.', hearScene('y', 107, [17, 107, 170, 1007]))),
      ...hundred.map(show),
      show(moment(['Be careful. Seventeen, and one hundred seventy, use the same digits. But they are not one hundred seven.'], '17 and 170 are not 107.', set(calm(last(hundred, hearScene('y', 107, [17, 107, 170, 1007]))), ['yo0', 'yo2'], { lit: true }))),
      turn(second, why(second)),
      show(moment(['Listen for the hundred, then the tens, then the ones.'], 'Hundred, tens, ones.', calm(last(hundred, hearScene('y', 107, [17, 107, 170, 1007]))))),
    ],
  };
}

// ---- M-1-A7 Show tens and ones ----

function tradeScene(p: string, n: number): Scene {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const slot = 0.5 + (t - 1) * ROD_STEP;
  const broken = Array.from({ length: 10 }, (_, k) => ({ id: `${p}b${k}`, look: { kind: 'cube' as const }, ...cubeAt(slot, 0.5, k), w: CUBE, h: CUBE, gone: true }));
  return scene([...rods(p, t, 0.5, 0.5), ...cubes(p, o, 1.1 + t * ROD_STEP, 0.5), ...broken, { id: `${p}n`, look: numeral(n), x: 4.1, y: 4.1, w: 1.8, h: 1.3 }]);
}

function tradeMoments(p: string, n: number): Moment[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const start = tradeScene(p, n);
  const broken = set(set(start, [`${p}r${t - 1}`], { gone: true }), ids(`${p}b`, 10), { gone: false, lit: true });
  const named: Say = o > 0 ? [{ number: n }, 'is', { number: t }, `${tensWord(t)}, and`, { number: o }, `${onesWord(o)}.`] : [{ number: n }, 'is', { number: t }, `${tensWord(t)}.`];
  return [
    moment(named, `${n} = ${t} ${tensWord(t)} and ${o} ${onesWord(o)}`, set(start, [...ids(`${p}r`, t), ...ids(`${p}c`, o)], { lit: true })),
    moment(['Ten ones make one ten. So we can trade a ten for ten ones.'], '1 ten = 10 ones', set(start, [`${p}r${t - 1}`], { lit: true })),
    moment(['Let us break one ten into ten ones.'], 'Break a ten into 10 ones.', broken),
    // Said with the same parts as the answer option, so the words match it exactly.
    moment(['Now there', isAre(t - 1), ...spoken(`${t - 1} ${tensWord(t - 1)} and ${o + 10} ones`), '.'], `${t - 1} ${tensWord(t - 1)} and ${o + 10} ones`, set(calm(broken), [...ids(`${p}r`, t - 1), ...ids(`${p}c`, o), ...ids(`${p}b`, 10)], { lit: true })),
    moment(['That is still', { number: n }, '. We did not add any, or take any away.'], `Still ${n}.`, set(calm(broken), [`${p}n`], { lit: true })),
  ];
}

// The number's two digits on top; its rods come for the first digit and its cubes for the second.
// `match`, when given, is the picture of the right blocks, shown at the end.
function buildMoments(p: string, n: number, match?: PieceLook): Moment[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const start = scene([
    { id: `${p}dt`, look: numeral(t), x: 1.6, y: 0.2, w: 1, h: 1.3 },
    { id: `${p}do`, look: numeral(o), x: 2.7, y: 0.2, w: 1, h: 1.3 },
    ...rods(p, t, 0.4, 1.9).map((rod) => ({ ...rod, gone: true })),
    ...cubes(p, o, 0.8 + t * ROD_STEP, 1.9).map((cube) => ({ ...cube, gone: true })),
    ...(match ? [{ id: `${p}match`, look: match, x: 6, y: 1.6, w: 3.8, h: 3.2, gone: true }] : []),
  ]);
  const tens = set(start, [`${p}dt`, ...ids(`${p}r`, t)], { gone: false, lit: true });
  const ones = set(calm(tens), [`${p}do`, ...ids(`${p}c`, o)], { gone: false, lit: true });
  const moments: Moment[] = [
    moment(['Which blocks show', { number: n }, '?'], `Which blocks show ${n}?`, set(start, [`${p}dt`, `${p}do`], { lit: true })),
    moment(['The first digit is', { number: t }, '. So we need', { number: t }, t === 1 ? 'rod.' : 'rods.'], `${t} ${tensWord(t)}: ${t} ${t === 1 ? 'rod' : 'rods'}`, tens),
    moment(['The second digit is', { number: o }, '. So we need', { number: o }, o === 1 ? 'cube.' : 'cubes.'], `${o} ${onesWord(o)}: ${o} ${o === 1 ? 'cube' : 'cubes'}`, ones),
  ];
  if (match) moments.push(moment(['These blocks match.', { number: t }, `${tensWord(t)}, and`, { number: o }, `${onesWord(o)}, show`, { number: n }, '.'], `${t} ${tensWord(t)} and ${o} ${onesWord(o)} show ${n}`, set(calm(ones), [`${p}match`], { gone: false, lit: true })));
  return moments;
}

export function showTensOnesLesson(): Lesson {
  const opening = tradeMoments('x', 46);
  const start = tradeScene('x', 46);
  const built = buildMoments('v', 34);
  const first = turnQuestion('M-1-A7', 1, (f) => num(f, 'n') >= 21 && num(f, 'n') % 10 >= 2 && num(f, 'n') % 10 !== Math.floor(num(f, 'n') / 10) && num(f, 'n') !== 34);
  const second = turnQuestion('M-1-A7', 3, (f) => num(f, 'n') >= 21 && num(f, 'n') <= 59 && num(f, 'n') % 10 !== 0 && num(f, 'n') !== 46);
  const blocksWhy = (q: Question): Moment[] => {
    if (q.type !== 'choice') throw new Error('M-1-A7 is a choice question');
    return buildMoments('w', num(q.facts, 'n'), picture(q.options[q.answerIndex] as Visual));
  };
  const why = (q: Question): Moment[] => [
    moment(['Which is another way to make', { number: num(q.facts, 'n') }, '?'], `Another way to make ${num(q.facts, 'n')}?`, tradeScene('w', num(q.facts, 'n'))),
    ...tradeMoments('w', num(q.facts, 'n')),
  ];
  return {
    parts: [
      show(moment(['A number tells us which blocks to use. A rod is a ten, and a cube is a one.'], 'Rods are tens. Cubes are ones.', calm(built[0]?.scene ?? start))),
      ...built.map(show),
      show(moment(['Not four rods and three cubes. That would be', { number: 43 }, '.'], 'Not 4 rods and 3 cubes: that is 43.', calm(last(built, start)))),
      turn(first, blocksWhy(first)),
      show(moment(['We can show a number in more than one way. A rod is ten cubes stuck together.'], 'More than one way to show a number.', set(start, ['xr0'], { lit: true }))),
      ...opening.map(show),
      show(moment(['Trading a ten for ten ones does not change the number. Look for one less ten, and ten more ones.'], '1 less ten, 10 more ones.', calm(last(opening, start)))),
      turn(second, why(second)),
      show(moment(['Ten ones make a ten, and a ten makes ten ones.'], '10 ones = 1 ten', set(calm(last(opening, start)), ids('xb', 10), { lit: true }))),
    ],
  };
}

// ---- M-1-A9 Hundred chart puzzles ----

function chartScene(p: string, topLeft: number, blank: number | null): Scene {
  const pieces: Piece[] = [];
  for (let i = 0; i < 9; i += 1) {
    const x = 2.3 + (i % 3) * 1.85;
    const y = 0.4 + Math.floor(i / 3) * 1.25;
    const value = topLeft + Math.floor(i / 3) * 10 + (i % 3);
    pieces.push({ id: `${p}k${i}`, look: { kind: 'cell' }, x, y, w: 1.75, h: 1.15 });
    pieces.push({ id: `${p}n${i}`, look: i === blank ? { kind: 'box' } : numeral(value), x: x + 0.1, y: y + 0.1, w: 1.55, h: 0.95 });
  }
  return scene(pieces);
}

function chartMoments(p: string, topLeft: number, blank: number): Moment[] {
  const valueAt = (i: number): number => topLeft + Math.floor(i / 3) * 10 + (i % 3);
  const answer = valueAt(blank);
  const start = chartScene(p, topLeft, blank);
  const row = Math.floor(blank / 3);
  const col = blank % 3;
  // Above the box: ten more going down. Else the one before it: one more going across. Else the one after it.
  const helper = row > 0 ? blank - 3 : col > 0 ? blank - 1 : blank + 1;
  const helperValue = valueAt(helper);
  const look = pointTo(set(start, [`${p}n${helper}`], { lit: true }), `${p}n${helper}`);
  const where = row > 0 ? 'above the box' : col > 0 ? 'just before the box' : 'just after the box';
  const rule: Say = row > 0 ? ['Going down is ten more. Ten more than', { number: helperValue }, 'is', { number: answer }, '.'] : col > 0 ? ['Going across is one more. One more than', { number: helperValue }, 'is', { number: answer }, '.'] : ['Going back is one less. One less than', { number: helperValue }, 'is', { number: answer }, '.'];
  const badge = row > 0 ? '+10' : col > 0 ? '+1' : '-1';
  const filled = withoutHand(set(become(look, `${p}n${blank}`, numeral(answer)), [`${p}n${blank}`], { badge }));
  return [
    moment(['Which number goes in the empty box?'], 'Which number goes in the box?', set(start, [`${p}n${blank}`], { lit: true })),
    moment(['Look at the number', `${where}. It is`, { number: helperValue }, '.'], `${helperValue} is ${where}.`, look),
    moment(rule, `${helperValue} ${badge === '+10' ? '+ 10' : badge === '+1' ? '+ 1' : '- 1'} = ${answer}`, filled),
    moment(['So the box needs', { number: answer }, '.'], `The box needs ${answer}.`, set(calm(filled), [`${p}n${blank}`], { lit: true })),
  ];
}

export function hundredChartLesson(): Lesson {
  const full = chartScene('x', 34, null);
  const puzzle = chartMoments('x', 34, 5);
  const first = turnQuestion('M-1-A9', 1, (f) => num(f, 'topLeft') !== 34);
  const second = turnQuestion('M-1-A9', 2, (f) => [1, 7, 8].includes(num(f, 'blank')));
  const why = (q: Question): Moment[] => chartMoments('w', num(q.facts, 'topLeft'), num(q.facts, 'blank'));
  return {
    parts: [
      show(moment(['A hundred chart has rows of ten numbers. Here is a small part of one.'], 'Part of a hundred chart', full)),
      show(moment(['Going across, each number is one more.'], 'Across: +1', set(set(full, ['xn0', 'xn1', 'xn2'], { lit: true }), ['xn1', 'xn2'], { badge: '+1' }))),
      show(moment(['Going down, each number is ten more.'], 'Down: +10', set(set(full, ['xn0', 'xn3', 'xn6'], { lit: true }), ['xn3', 'xn6'], { badge: '+10' }))),
      ...puzzle.map(show),
      show(moment(['Check across too:', { number: 45 }, ', then', { number: 46 }, '. It works!'], '45, 46', set(calm(last(puzzle, full)), ['xn4', 'xn5'], { lit: true }))),
      turn(first, why(first)),
      show(moment(['The box can be anywhere. Use a number above it, or beside it.'], 'Use a number above or beside the box.', calm(last(puzzle, full)))),
      turn(second, why(second)),
      show(moment(['Across is one more. Down is ten more.'], 'Across +1. Down +10.', calm(last(puzzle, full)))),
    ],
  };
}

// ---- M-1-A10 Number words to 100 ----

function wordScene(p: string, n: number): Scene {
  const t = Math.floor(n / 10);
  const o = n % 10;
  return scene([
    { id: `${p}dt`, look: numeral(t), x: 3.9, y: 0.3, w: 1, h: 1.5 },
    { id: `${p}do`, look: numeral(o), x: 5.1, y: 0.3, w: 1, h: 1.5 },
    { id: `${p}wt`, look: text(numberWords(t * 10)), x: 1.2, y: 2.3, w: 3.4, h: 0.9, gone: true },
    { id: `${p}wo`, look: text(numberWords(o)), x: 5.4, y: 2.3, w: 3.4, h: 0.9, gone: true },
    { id: `${p}all`, look: text(numberWords(n)), x: 1.5, y: 4, w: 7, h: 1.1, gone: true },
  ]);
}

function wordMoments(p: string, n: number): Moment[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const start = wordScene(p, n);
  const tens = set(start, [`${p}dt`, `${p}wt`], { lit: true, gone: false });
  const ones = set(set(calm(tens), [`${p}wt`], { gone: false }), [`${p}do`, `${p}wo`], { lit: true, gone: false });
  return [
    moment(['The first digit is', { number: t }, '. It means', { number: t }, 'tens, and we say', { word: numberWords(t * 10) }, '.'], `${t} tens: ${numberWords(t * 10)}`, tens),
    moment(['The second digit is', { number: o }, '. We say', { word: numberWords(o) }, '.'], `${o}: ${numberWords(o)}`, ones),
    moment(['Put them together:', { word: numberWords(n) }, '.'], `${n} is ${numberWords(n)}`, set(calm(ones), [`${p}all`], { lit: true, gone: false })),
  ];
}

export function numberWordsLesson(): Lesson {
  const opening = wordMoments('x', 47);
  const tensRow = scene([20, 30, 40, 50, 60].flatMap((value, i) => [
    { id: `tn${i}`, look: numeral(value), x: 0.3 + i * 1.9, y: 1, w: 1.5, h: 1.1 },
    { id: `tw${i}`, look: text(numberWords(value)), x: 0.15 + i * 1.95, y: 2.4, w: 1.8, h: 0.7 },
  ]));
  const first = turnQuestion('M-1-A10', 1, (f) => num(f, 'n') !== 14);
  const second = turnQuestion('M-1-A10', 2, (f) => num(f, 'n') % 10 !== 0 && num(f, 'n') !== 47);
  // A teen word beside the tens word that sounds like it: fourteen is 14, forty is 40.
  const teens = scene([
    { id: 'en', look: numeral(14), x: 1.2, y: 0.8, w: 2, h: 1.3 },
    { id: 'ew', look: text('fourteen'), x: 0.4, y: 2.4, w: 3.6, h: 0.9 },
    { id: 'yn', look: numeral(40), x: 6.8, y: 0.8, w: 2, h: 1.3 },
    { id: 'yw', look: text('forty'), x: 6, y: 2.4, w: 3.6, h: 0.9 },
  ]);
  // Reading a word to find its number: the word on top, then the number it says.
  const why = (q: Question): Moment[] => {
    const n = num(q.facts, 'n');
    const t = Math.floor(n / 10);
    const o = n % 10;
    const start = scene([
      { id: 'ww', look: text(numberWords(n)), x: 1.5, y: 0.5, w: 7, h: 1.1 },
      { id: 'wn', look: numeral(n), x: 4, y: 2.4, w: 2, h: 1.4, gone: true },
    ]);
    const done = set(start, ['wn'], { gone: false, lit: true });
    if (n < 20) {
      return [
        moment([{ word: numberWords(n) }, 'ends in teen. So it is one ten, and', { number: o }, 'more.'], `${numberWords(n)}: 1 ten and ${o}`, set(start, ['ww'], { lit: true })),
        moment(['One ten and', { number: o }, 'is', { number: n }, '.'], `${numberWords(n)} is ${n}`, done),
      ];
    }
    return [
      moment(['Read the word in parts.', { word: numberWords(t * 10) }, 'means', { number: t }, 'tens.'], `${numberWords(t * 10)}: ${t} tens`, set(start, ['ww'], { lit: true })),
      moment(['Then', { word: numberWords(o) }, '. That is', { number: o }, `${onesWord(o)}.`], `${numberWords(o)}: ${o} ${onesWord(o)}`, set(start, ['ww'], { lit: true, badge: `${t} tens, ${o} ${onesWord(o)}` })),
      moment(['So the word says', { number: n }, '.'], `${numberWords(n)} is ${n}`, done),
    ];
  };
  return {
    parts: [
      show(moment(['Every number has a name we can read and write.'], 'Numbers have names.', wordScene('x', 47))),
      show(moment(['Tens words sound alike: twenty, thirty, forty, fifty, sixty.'], 'Tens words', set(tensRow, ids('tw', 5), { lit: true }))),
      show(moment(['Here is', { number: 47 }, '. We read it in two parts.'], '47 has two parts.', set(wordScene('x', 47), ['xdt', 'xdo'], { lit: true }))),
      ...opening.map(show),
      show(moment(['Say the tens word, then the ones word, with a little line between.'], 'Tens word - ones word', calm(last(opening, wordScene('x', 47))))),
      show(moment(['Teen words end in teen. Fourteen is one ten and four.'], '14: fourteen', set(teens, ['en', 'ew'], { lit: true }))),
      show(moment(['Forty sounds close, but it ends another way. Forty is four tens.'], '40: forty', set(teens, ['yn', 'yw'], { lit: true }))),
      turn(first, why(first)),
      show(moment(['To read a longer word, find the tens word first.'], 'Find the tens word first.', calm(last(opening, wordScene('x', 47))))),
      turn(second, why(second)),
      show(moment(['Read the tens first, then the ones.'], 'Tens first, then ones.', calm(last(opening, wordScene('x', 47))))),
    ],
  };
}

// ---- M-1-B1 Add within 20 ----

const COUNTER = '🔴';

function countOnScene(p: string, a: number, b: number): Scene {
  const [bigger, smaller] = [Math.max(a, b), Math.min(a, b)];
  return scene([
    ...eqRow(`${p}e`, [a, '+', b, '=', '?'], 0.2),
    { id: `${p}big`, look: numeral(bigger), x: 0.6, y: 2, w: 1.8, h: 1.6 },
    ...group(`${p}d`, art(COUNTER), smaller, 3.2, 1.8, 5, 1),
  ]);
}

function countOnMoments(p: string, a: number, b: number): Moment[] {
  const [bigger, smaller] = [Math.max(a, b), Math.min(a, b)];
  const start = countOnScene(p, a, b);
  const bigIndex = a >= b ? 0 : 2;
  const counted = countAlong(start, ids(`${p}d`, smaller), bigger);
  const done = set(become(counted.end, `${p}e4`, numeral(a + b)), [`${p}big`, ...ids(`${p}d`, smaller)], { lit: true });
  return [
    moment([{ number: a }, 'plus', { number: b }, '. Start with the bigger number,', { number: bigger }, '.'], `Start at ${bigger}.`, set(start, [`${p}big`, `${p}e${bigIndex}`], { lit: true })),
    moment(['Now count on', { number: smaller }, 'more.'], `Count on ${smaller}.`, set(start, [`${p}e${2 - bigIndex}`, ...ids(`${p}d`, smaller)], { lit: true })),
    ...counted.moments,
    moment([{ number: a }, ', plus', { number: b }, ', equals', { number: a + b }, '.'], `${a} + ${b} = ${a + b}`, done),
  ];
}

export function addWithin20Lesson(): Lesson {
  const opening = countOnMoments('x', 8, 3);
  const flipped = countOnMoments('y', 4, 9);
  const first = turnQuestion('M-1-B1', 1, (f) => num(f, 'a') > num(f, 'b') && num(f, 'b') <= 4 && num(f, 'a') !== 8);
  const second = turnQuestion('M-1-B1', 2, (f) => num(f, 'a') < num(f, 'b') && num(f, 'a') <= 5);
  const why = (q: Question): Moment[] => countOnMoments('w', num(q.facts, 'a'), num(q.facts, 'b'));
  return {
    parts: [
      show(moment(['To add, start with the bigger number, and count on.'], 'Start big and count on.', countOnScene('x', 8, 3))),
      ...opening.map(show),
      show(moment(['Starting with the bigger number means less counting.'], 'Less counting!', calm(last(opening, countOnScene('x', 8, 3))))),
      turn(first, why(first)),
      show(moment(['If the bigger number comes second, start with it anyway.'], 'Start with the bigger one.', countOnScene('y', 4, 9))),
      ...flipped.map(show),
      turn(second, why(second)),
      show(moment(['Start with the bigger number, then count on the rest.'], 'Start big, then count on.', calm(last(flipped, countOnScene('y', 4, 9))))),
    ],
  };
}

// ---- M-1-B2 Subtract within 20 ----

function takeScene(p: string, a: number, b: number, emoji = COUNTER): Scene {
  return scene([...eqRow(`${p}e`, [a, '-', b, '=', '?'], 0.2), ...group(`${p}d`, art(emoji), a, 1, 1.6, 10, 0.8)]);
}

function takeMoments(p: string, a: number, b: number): Moment[] {
  const left = a - b;
  const start = takeScene(p, a, b);
  const back = countBack(start, ids(`${p}d`, a), b);
  const leftOver = set(set(back.end, ids(`${p}d`, b, left), { dim: true }), ids(`${p}d`, left), { lit: true });
  return [
    moment([{ number: a }, 'minus', { number: b }, '. Start with', { number: a }, '.'], `Start with ${a}.`, set(start, [...ids(`${p}d`, a), `${p}e0`], { lit: true })),
    moment(['Take away', { number: b }, '. Cross them out, and count back.'], `Take away ${b}. Count back.`, set(start, [`${p}e2`], { lit: true })),
    ...back.moments,
    moment(['There', isAre(left), { number: left }, 'left.'], `${left} left`, leftOver),
    moment([{ number: a }, ', minus', { number: b }, ', equals', { number: left }, '.'], `${a} - ${b} = ${left}`, become(leftOver, `${p}e4`, numeral(left))),
  ];
}

export function subtractWithin20Lesson(): Lesson {
  const opening = takeMoments('x', 11, 3);
  const first = turnQuestion('M-1-B2', 1, (f) => num(f, 'b') <= 4 && num(f, 'a') !== 11);
  const second = turnQuestion('M-1-B2', 2, (f) => num(f, 'b') <= 6);
  const why = (q: Question): Moment[] => takeMoments('w', num(q.facts, 'a'), num(q.facts, 'b'));
  return {
    parts: [
      show(moment(['Minus means take away. Then we find how many are left.'], 'Minus means take away.', takeScene('x', 11, 3))),
      ...opening.map(show),
      show(moment(['When we take away a few, counting back is quick.'], 'Count back to take away.', calm(last(opening, takeScene('x', 11, 3))))),
      turn(first, why(first)),
      show(moment(['Bigger numbers work the same way. Cross out, and count back.'], 'Cross out and count back.', takeScene('y', 15, 4))),
      turn(second, why(second)),
      show(moment(['Start with the first number, and count back the ones taken away.'], 'Start big, count back.', calm(last(opening, takeScene('x', 11, 3))))),
    ],
  };
}

// ---- M-1-B3 Doubles and near doubles ----

function doubleScene(p: string, a: number, b = a): Scene {
  return scene([
    ...group(`${p}r`, art('🔴'), a, 0.5, 1.1, 10, 0.9),
    ...group(`${p}b`, art('🔵'), b, 0.5, 2.1, 10, 0.9),
    ...eqRow(`${p}e`, [a, '+', b, '=', '?'], 4.2),
  ]);
}

function doubleMoments(p: string, a: number): Moment[] {
  const start = doubleScene(p, a);
  let now = calm(start);
  const pairs: Moment[] = [];
  for (let i = 0; i < a; i += 1) {
    now = pointTo(alter(now, (each) => (each.id === `${p}r${i}` || each.id === `${p}b${i}` ? { ...each, lit: true, badge: each.id === `${p}r${i}` ? String(2 * (i + 1)) : undefined } : { ...each, badge: undefined })), `${p}b${i}`);
    pairs.push(moment([{ number: 2 * (i + 1) }], String(2 * (i + 1)), now));
  }
  const done = become(withoutHand(calm(now)), `${p}e4`, numeral(2 * a));
  return [
    moment(['Here', isAre(a), { number: a }, a === 1 ? 'red dot.' : 'red dots.'], `${a} red`, set(start, ids(`${p}r`, a), { lit: true })),
    moment(['And here', isAre(a), { number: a }, a === 1 ? 'blue dot, the same number.' : 'blue dots, the same number.'], `${a} blue`, set(start, ids(`${p}b`, a), { lit: true })),
    moment(['Each red dot has a blue partner. Count them by twos.'], 'Count by 2s.', set(start, [`${p}r0`, `${p}b0`], { lit: true })),
    ...pairs,
    moment(['Double', { number: a }, 'is', { number: 2 * a }, '.'], `${a} + ${a} = ${2 * a}`, set(done, [...ids(`${p}r`, a), ...ids(`${p}b`, a)], { lit: true })),
  ];
}

// A near double: one group has one extra. Double the smaller number, then add the extra one.
function nearMoments(p: string, a: number, b: number): Moment[] {
  const small = Math.min(a, b);
  const start = doubleScene(p, a, b);
  const extra = a > b ? `${p}r${a - 1}` : `${p}b${b - 1}`;
  const pairs = set(start, [...ids(`${p}r`, small), ...ids(`${p}b`, small)], { lit: true });
  return [
    moment([{ number: a }, 'plus', { number: b }, 'is almost a double. One group has one extra dot.'], `${a} + ${b}: almost a double`, set(start, [extra], { lit: true })),
    moment(['Double', { number: small }, 'is', { number: 2 * small }, '.'], `${small} + ${small} = ${2 * small}`, set(pairs, [`${p}r${small - 1}`], { badge: String(2 * small) })),
    moment(['One more makes', { number: a + b }, '. So', { number: a }, ', plus', { number: b }, ', is', { number: a + b }, '.'], `${a} + ${b} = ${a + b}`, become(set(calm(pairs), [extra], { lit: true, badge: '+1' }), `${p}e4`, numeral(a + b))),
  ];
}

export function doublesLesson(): Lesson {
  const opening = doubleMoments('x', 4);
  const near = nearMoments('y', 6, 7);
  const first = turnQuestion('M-1-B3', 1, (f) => num(f, 'a') >= 3 && num(f, 'a') !== 4);
  const second = turnQuestion('M-1-B3', 3, (f) => Math.min(num(f, 'a'), num(f, 'b')) <= 8 && Math.min(num(f, 'a'), num(f, 'b')) >= 3 && Math.min(num(f, 'a'), num(f, 'b')) !== 6);
  const why = (q: Question): Moment[] => (num(q.facts, 'a') === num(q.facts, 'b') ? doubleMoments('w', num(q.facts, 'a')) : nearMoments('w', num(q.facts, 'a'), num(q.facts, 'b')));
  return {
    parts: [
      show(moment(['A double is a number added to itself.'], 'A double: the same number twice.', doubleScene('x', 4))),
      ...opening.map(show),
      show(moment(['When both numbers are the same, it is a double.'], 'Both the same: a double.', calm(last(opening, doubleScene('x', 4))))),
      turn(first, why(first)),
      show(moment(['Some sums are one away from a double.'], 'Near doubles', doubleScene('y', 6, 7))),
      ...near.map(show),
      turn(second, why(second)),
      show(moment(['Know your doubles. For a near double, add one more.'], 'Double it, then one more.', calm(last(near, doubleScene('y', 6, 7))))),
    ],
  };
}

// ---- M-1-B4 Make ten to add ----

const frameCell = (left: number, i: number): { x: number; y: number } => ({ x: left + (i % 5) * 0.9, y: 1.3 + Math.floor(i / 5) * 0.9 });

function framesScene(p: string, a: number, b: number): Scene {
  const cellsOf = (side: string, left: number): Piece[] => Array.from({ length: 10 }, (_, i) => ({ id: `${p}${side}k${i}`, look: { kind: 'cell' as const }, ...frameCell(left, i), w: 0.9, h: 0.9 }));
  const dotsOf = (side: string, left: number, count: number, emoji: string): Piece[] =>
    Array.from({ length: count }, (_, i) => {
      const at = frameCell(left, i);
      return { id: `${p}${side}${i}`, look: art(emoji), x: at.x + 0.1, y: at.y + 0.1, w: 0.7, h: 0.7 };
    });
  return scene([
    ...eqRow(`${p}e`, [a, '+', b], 0.1, 1),
    ...cellsOf('A', 0.2),
    ...cellsOf('B', 5.3),
    ...dotsOf('a', 0.2, a, '🔴'),
    ...dotsOf('b', 5.3, b, '🔵'),
    ...eqRow(`${p}s`, [10, '+', a + b - 10, '=', a + b], 3.6, 1.1).map((each) => ({ ...each, gone: true })),
  ]);
}

function makeTenMoments(p: string, a: number, b: number): Moment[] {
  const move = 10 - a;
  const left = b - move;
  const start = framesScene(p, a, b);
  const moving = ids(`${p}b`, move, left);
  const moved = alter(calm(start), (each) => {
    const index = moving.indexOf(each.id);
    if (index < 0) return each;
    const at = frameCell(0.2, a + index);
    return { ...each, x: at.x + 0.1, y: at.y + 0.1, lit: true };
  });
  const ten = set(calm(moved), [...ids(`${p}a`, a), ...moving], { lit: true });
  return [
    moment([{ number: a }, 'plus', { number: b }, '. The first frame has', { number: a }, '.'], `${a} + ${b}`, set(start, ids(`${p}a`, a), { lit: true })),
    moment(['It needs', { number: move }, 'more to make ten.'], `${move} more makes 10.`, set(start, ids(`${p}Ak`, move, a), { lit: true })),
    moment(['Move', { number: move }, 'from the', { number: b }, 'to fill the frame.'], `Move ${move}.`, moved),
    moment(['Now it is ten, and', { number: left }, '.'], `10 and ${left}`, set(ten, ids(`${p}b`, left), { lit: true })),
    moment(['So it is the same as', { number: 10 }, 'plus', { number: left }, ', which is', { number: a + b }, '.'], `10 + ${left} = ${a + b}`, set(calm(moved), ids(`${p}s`, 5), { gone: false, lit: true })),
  ];
}

export function makeTenLesson(): Lesson {
  const opening = makeTenMoments('x', 9, 4);
  const eight = makeTenMoments('y', 8, 5);
  const first = turnQuestion('M-1-B4', 1, (f) => num(f, 'b') !== 4);
  const second = turnQuestion('M-1-B4', 2, (f) => num(f, 'b') !== 5);
  const why = (q: Question): Moment[] => makeTenMoments('w', num(q.facts, 'a'), num(q.facts, 'b'));
  return {
    parts: [
      show(moment(['Adding is easy when we make a ten first.'], 'Make a ten first.', framesScene('x', 9, 4))),
      ...opening.map(show),
      show(moment(['Ten and some more is easy to add.'], '10 and some more is easy.', calm(last(opening, framesScene('x', 9, 4))))),
      turn(first, why(first)),
      show(moment(['With eight, we move two to make ten.'], '8 needs 2 more.', framesScene('y', 8, 5))),
      ...eight.map(show),
      turn(second, why(second)),
      show(moment(['Fill the ten first, then add what is left.'], 'Fill the ten, then add the rest.', calm(last(eight, framesScene('y', 8, 5))))),
    ],
  };
}

// ---- M-1-B6 True or false equations ----

type Side = (number | string)[];
const worth = (side: Side): number => side.reduce<number>((total, part, i) => (typeof part === 'number' ? total + (i > 0 && side[i - 1] === '-' ? -part : part) : total), 0);

function sideSay(side: Side, value: number, which: string): Say {
  if (side.length === 1) return [`The ${which} side is just`, { number: value }, '.'];
  return [`On the ${which},`, { number: side[0] as number }, side[1] === '-' ? 'minus' : 'plus', { number: side[2] as number }, 'is', { number: value }, '.'];
}

function truthScene(p: string, left: Side, right: Side): Scene {
  const row = eqRow(p, [...left, '=', ...right], 1, 1.2);
  const middle = (from: number, to: number): number => {
    const first = row[from] as Piece;
    const end = row[to] as Piece;
    return (first.x + end.x + (end.w ?? 1)) / 2;
  };
  const lx = middle(0, left.length - 1);
  const rx = middle(left.length + 1, row.length - 1);
  return scene([
    ...row,
    { id: `${p}lv`, look: numeral(worth(left)), x: lx - 0.7, y: 2.7, w: 1.4, h: 1.1, gone: true },
    { id: `${p}rv`, look: numeral(worth(right)), x: rx - 0.7, y: 2.7, w: 1.4, h: 1.1, gone: true },
  ]);
}

function truthMoments(p: string, left: Side, right: Side): Moment[] {
  const [x, y] = [worth(left), worth(right)];
  const start = truthScene(p, left, right);
  const leftIds = ids(p, left.length);
  const rightIds = ids(p, right.length, left.length + 1);
  const leftDone = set(start, [...leftIds, `${p}lv`], { lit: true, gone: false });
  const rightDone = set(set(calm(leftDone), [`${p}lv`], { gone: false }), [...rightIds, `${p}rv`], { lit: true, gone: false });
  const both = set(calm(rightDone), [`${p}lv`, `${p}rv`, `${p}${left.length}`], { lit: true });
  return [
    moment(['Is this true? Let us work out each side.'], 'Work out each side.', set(start, [`${p}${left.length}`], { lit: true })),
    moment(sideSay(left, x, 'left'), `Left side: ${x}`, leftDone),
    moment(sideSay(right, y, 'right'), `Right side: ${y}`, rightDone),
    x === y
      ? moment(['Both sides are', { number: x }, '. They are the same, so the answer is True.'], `${x} and ${y}: True`, both)
      : moment([{ number: x }, 'and', { number: y }, 'are not the same, so the answer is False.'], `${x} and ${y}: False`, alter(both, (each) => (each.id === `${p}${left.length}` ? { ...each, crossed: true } : each))),
  ];
}

export function trueFalseLesson(): Lesson {
  const opening = truthMoments('x', [4, '+', 1], [5]);
  const sums = truthMoments('y', [3, '+', 2], [2, '+', 4]);
  const sides = (q: Question): [Side, Side] => [q.facts.left as Side, q.facts.right as Side];
  const isTrue = (f: Record<string, unknown>): boolean => worth(f.left as Side) === worth(f.right as Side);
  const first = turnQuestion('M-1-B6', 1, (f) => isTrue(f));
  const second = turnQuestion('M-1-B6', 2, (f) => !isTrue(f));
  const why = (q: Question): Moment[] => truthMoments('w', ...sides(q));
  return {
    parts: [
      show(moment(['The equals sign means both sides have the same amount.'], '= means the same amount.', set(truthScene('x', [4, '+', 1], [5]), ['x3'], { lit: true }))),
      ...opening.map(show),
      turn(first, why(first)),
      show(moment(['Both sides can have a sum. Work out each one, then compare.'], 'Work out both sides.', truthScene('y', [3, '+', 2], [2, '+', 4]))),
      ...sums.map(show),
      turn(second, why(second)),
      show(moment(['The same amount on both sides is true. Not the same is false.'], 'Same: true. Not the same: false.', calm(last(opening, truthScene('x', [4, '+', 1], [5]))))),
    ],
  };
}

// ---- M-1-B7 Add three numbers ----

function threeScene(p: string, nums: [number, number, number], first: [number, number], z: number): Scene {
  const [a, b, c] = nums;
  const sum = a + b + c;
  return scene([...eqRow(p, [a, '+', b, '+', c, '=', '?'], 0.6, 1.1), ...eqRow(`${p}s`, [first[0] + first[1], '+', z, '=', sum], 2.8, 1.1).map((each) => ({ ...each, gone: true }))]);
}

// The pair added first: a pair that makes ten, or else the first two.
function firstPair(nums: [number, number, number]): { pair: [number, number]; at: [number, number]; z: number; zAt: number; ten: boolean } {
  const [a, b, c] = nums;
  const tries: { pair: [number, number]; at: [number, number]; z: number; zAt: number }[] = [
    { pair: [a, b], at: [0, 2], z: c, zAt: 4 },
    { pair: [a, c], at: [0, 4], z: b, zAt: 2 },
    { pair: [b, c], at: [2, 4], z: a, zAt: 0 },
  ];
  const ten = tries.find((each) => each.pair[0] + each.pair[1] === 10);
  return ten ? { ...ten, ten: true } : { ...(tries[0] as (typeof tries)[number]), ten: false };
}

function threeMoments(p: string, nums: [number, number, number]): Moment[] {
  const { pair, at, z, zAt, ten } = firstPair(nums);
  const pairSum = pair[0] + pair[1];
  const sum = nums[0] + nums[1] + nums[2];
  const start = threeScene(p, nums, pair, z);
  const paired = set(set(start, [`${p}${at[0]}`, `${p}${at[1]}`], { lit: true }), [`${p}s0`], { gone: false, lit: true });
  const third = set(set(calm(paired), [`${p}${at[0]}`, `${p}${at[1]}`], { dim: true }), [`${p}${zAt}`, `${p}s1`, `${p}s2`], { lit: true, gone: false });
  const done = become(set(calm(third), [`${p}s3`, `${p}s4`], { gone: false, lit: true }), `${p}6`, numeral(sum));
  return [
    moment([ten ? 'Look for two numbers that make ten.' : 'Add two of the numbers first.'], ten ? 'Find a pair that makes 10.' : 'Add two numbers first.', set(start, [`${p}${at[0]}`, `${p}${at[1]}`], { lit: true })),
    moment([{ number: pair[0] }, 'plus', { number: pair[1] }, 'is', { number: pairSum }, '.'], `${pair[0]} + ${pair[1]} = ${pairSum}`, paired),
    moment(['Then add the other number,', { number: z }, '.'], `Then add ${z}.`, third),
    moment([{ number: pairSum }, ', plus', { number: z }, ', equals', { number: sum }, '.'], `${pairSum} + ${z} = ${sum}`, done),
  ];
}

export function addThreeLesson(): Lesson {
  const opening = threeMoments('x', [2, 3, 4]);
  const tens = threeMoments('y', [7, 5, 3]);
  const nums = (q: Question): [number, number, number] => [num(q.facts, 'a'), num(q.facts, 'b'), num(q.facts, 'c')];
  const first = turnQuestion('M-1-B7', 1, (f) => num(f, 'a') + num(f, 'b') + num(f, 'c') >= 7);
  const second = turnQuestion('M-1-B7', 2, (f) => num(f, 'a') + num(f, 'b') !== 10);
  const why = (q: Question): Moment[] => threeMoments('w', nums(q));
  return {
    parts: [
      show(moment(['To add three numbers, add two of them first. Then add the third.'], 'Add two, then the third.', threeScene('x', [2, 3, 4], [2, 3], 4))),
      ...opening.map(show),
      turn(first, why(first)),
      show(moment(['Here is a trick. Look for two numbers that make ten.'], 'Look for a pair that makes 10.', threeScene('y', [7, 5, 3], [7, 3], 5))),
      ...tens.map(show),
      show(moment(['Ten plus a number is easy to add.'], '10 + a number is easy.', calm(last(tens, threeScene('y', [7, 5, 3], [7, 3], 5))))),
      turn(second, why(second)),
      show(moment(['Add two numbers first, and look for a ten.'], 'Two first. Look for 10.', calm(last(tens, threeScene('y', [7, 5, 3], [7, 3], 5))))),
    ],
  };
}

// ---- M-1-B8 Add two-digit and one-digit ----

function plusOneScene(p: string, a: number, b: number): Scene {
  const t = Math.floor(a / 10);
  const x = a % 10;
  const onesX = 0.9 + (t + 1) * ROD_STEP;
  return scene([
    ...rods(p, t + 1, 0.5, 0.5).map((rod, i) => (i === t ? { ...rod, gone: true } : rod)),
    ...cubes(p, x, onesX, 0.5),
    ...cubes(p, b, onesX, 0.5, x).map((cube) => ({ ...cube, gone: true })),
    ...eqRow(`${p}e`, [a, '+', b, '=', '?'], 4.2, 1.1),
  ]);
}

function plusOneMoments(p: string, a: number, b: number): Moment[] {
  const t = Math.floor(a / 10);
  const x = a % 10;
  const ones = x + b;
  const sum = a + b;
  const onesX = 0.9 + (t + 1) * ROD_STEP;
  const start = plusOneScene(p, a, b);
  const added = set(start, ids(`${p}c`, b, x), { gone: false, lit: true });
  const allOnes = set(calm(added), ids(`${p}c`, ones), { lit: true });
  const moments: Moment[] = [
    moment([{ number: a }, 'is', { number: t }, `${tensWord(t)}, and`, { number: x }, `${onesWord(x)}.`], `${a} = ${t} ${tensWord(t)} and ${x} ${onesWord(x)}`, set(start, [...ids(`${p}r`, t), ...ids(`${p}c`, x), `${p}e0`], { lit: true })),
    moment(['Add', { number: b }, 'more ones.'], `Add ${b} ones.`, set(added, [`${p}e2`], { lit: true })),
    moment(['Add the ones first.', { number: x }, 'plus', { number: b }, 'is', { number: ones }, '.'], `${x} + ${b} = ${ones}`, allOnes),
  ];
  if (ones < 10) {
    moments.push(
      moment(['The tens stay the same.'], 'The tens stay the same.', set(calm(allOnes), ids(`${p}r`, t), { lit: true })),
      moment([{ number: t }, `${tensWord(t)}, and`, { number: ones }, `${onesWord(ones)}, make`, { number: sum }, '.'], `${a} + ${b} = ${sum}`, become(set(calm(allOnes), [...ids(`${p}r`, t), ...ids(`${p}c`, ones)], { lit: true }), `${p}e4`, numeral(sum))),
    );
    return moments;
  }
  // Ten of the ones stack up in the next rod's place, then become a rod; the rest slide back.
  const slot = 0.5 + t * ROD_STEP;
  const stacked = alter(calm(allOnes), (each) => {
    const k = ids(`${p}c`, 10).indexOf(each.id);
    return k < 0 ? each : { ...each, x: slot + 0.075, y: 0.5 + k * 0.26, w: 0.4, h: 0.26, lit: true };
  });
  const rodMade = alter(set(stacked, ids(`${p}c`, 10), { gone: true, lit: undefined }), (each) => {
    if (each.id === `${p}r${t}`) return { ...each, gone: false, lit: true };
    const k = ids(`${p}c`, ones - 10, 10).indexOf(each.id);
    return k < 0 ? each : { ...each, ...cubeAt(onesX, 0.5, k), lit: true };
  });
  moments.push(
    moment(['Ten ones make a new ten.'], '10 ones make a ten.', stacked),
    moment(['Now there', isAre(t + 1), { number: t + 1 }, `${tensWord(t + 1)}, and`, { number: ones - 10 }, `${onesWord(ones - 10)}.`], `${t + 1} tens and ${ones - 10} ${onesWord(ones - 10)}`, set(rodMade, ids(`${p}r`, t + 1), { lit: true })),
    moment(['So', { number: a }, ', plus', { number: b }, ', equals', { number: sum }, '.'], `${a} + ${b} = ${sum}`, become(calm(rodMade), `${p}e4`, numeral(sum))),
  );
  return moments;
}

export function twoDigitPlusOneLesson(): Lesson {
  const opening = plusOneMoments('x', 23, 4);
  const carry = plusOneMoments('y', 36, 7);
  const first = turnQuestion('M-1-B8', 1, (f) => num(f, 'a') <= 59 && num(f, 'a') !== 23);
  const second = turnQuestion('M-1-B8', 2, (f) => num(f, 'a') <= 69 && num(f, 'a') !== 36);
  const why = (q: Question): Moment[] => plusOneMoments('w', num(q.facts, 'a'), num(q.facts, 'b'));
  return {
    parts: [
      show(moment(['To add a small number to a big one, add the ones first.'], 'Add the ones first.', plusOneScene('x', 23, 4))),
      ...opening.map(show),
      turn(first, why(first)),
      show(moment(['Sometimes the ones make a new ten.'], 'The ones can make a ten.', plusOneScene('y', 36, 7))),
      ...carry.map(show),
      turn(second, why(second)),
      show(moment(['Ones with ones. Ten ones make one more ten.'], 'Ones with ones. 10 ones make a ten.', calm(last(carry, plusOneScene('y', 36, 7))))),
    ],
  };
}

// ---- M-1-B9 Add and subtract tens ----

function tensScene(p: string, a: number, b: number, plus: boolean): Scene {
  const [ta, tb] = [Math.floor(a / 10), b / 10];
  const all = rods(p, plus ? ta + tb : ta, 0.4, 0.5, 1).map((rod, i) => (i >= ta ? { ...rod, gone: true } : rod));
  return scene([...all, ...eqRow(`${p}e`, [a, plus ? '+' : '-', b, '=', '?'], 4.2, 1.1)]);
}

function tensMoments(p: string, a: number, b: number, plus: boolean): Moment[] {
  const [ta, tb] = [Math.floor(a / 10), b / 10];
  const tens = plus ? ta + tb : ta - tb;
  const answer = plus ? a + b : a - b;
  const start = tensScene(p, a, b, plus);
  const changed = plus ? set(start, ids(`${p}r`, tb, ta), { gone: false, lit: true }) : set(start, ids(`${p}r`, tb, ta - tb), { crossed: true, lit: true });
  const kept = plus ? calm(changed) : set(calm(changed), ids(`${p}r`, tb, ta - tb), { dim: true });
  let now = kept;
  const counted: Moment[] = [];
  for (let i = 0; i < tens; i += 1) {
    now = pointTo(set(alter(now, (each) => ({ ...each, badge: undefined })), [`${p}r${i}`], { lit: true, badge: String((i + 1) * 10) }), `${p}r${i}`);
    counted.push(moment([{ number: (i + 1) * 10 }], String((i + 1) * 10), now));
  }
  const done = become(withoutHand(calm(set(now, ids(`${p}r`, tens), { lit: true }))), `${p}e4`, numeral(answer));
  return [
    moment([{ number: a }, 'is', { number: ta }, `${tensWord(ta)}.`], `${a} = ${ta} ${tensWord(ta)}`, set(start, [...ids(`${p}r`, ta), `${p}e0`], { lit: true })),
    moment([plus ? 'Add' : 'Take away', { number: b }, '. That is', { number: tb }, `${tensWord(tb)}.`], `${plus ? '+' : '-'} ${tb} ${tensWord(tb)}`, set(changed, [`${p}e2`], { lit: true })),
    moment([plus ? 'Now count all the tens, by tens.' : 'Count the tens that are left, by tens.'], 'Count by tens.', kept),
    ...counted,
    moment([{ number: ta }, plus ? `${tensWord(ta)} plus` : `${tensWord(ta)} minus`, { number: tb }, `${tensWord(tb)} is`, { number: tens }, `${tensWord(tens)}, which is`, { number: answer }, '.'], `${a} ${plus ? '+' : '-'} ${b} = ${answer}`, done),
  ];
}

export function addSubtractTensLesson(): Lesson {
  const opening = tensMoments('x', 30, 20, true);
  const minus = tensMoments('y', 70, 40, false);
  const first = turnQuestion('M-1-B9', 1, (f) => num(f, 'a') !== 30 && num(f, 'a') + num(f, 'b') <= 70);
  const second = turnQuestion('M-1-B9', 2, (f) => num(f, 'a') !== 70);
  return {
    parts: [
      show(moment(['Adding tens is just like adding ones. We count tens.'], 'Tens add like ones.', tensScene('x', 30, 20, true))),
      ...opening.map(show),
      turn(first, tensMoments('w', num(first.facts, 'a'), num(first.facts, 'b'), true)),
      show(moment(['Taking away tens works the same way.'], 'Take away tens the same way.', tensScene('y', 70, 40, false))),
      ...minus.map(show),
      turn(second, tensMoments('w', num(second.facts, 'a'), num(second.facts, 'b'), false)),
      show(moment([{ number: 34 }, 'plus', { number: 20 }, '. Add two tens, and the ones stay the same.', { number: 54 }, '.'], '34 + 20 = 54', set(scene(eqRow('m', [34, '+', 20, '=', 54], 1.8, 1.2)), ['m4'], { lit: true }))),
      show(moment(['Three and two make five, so three tens and two tens make five tens.'], '3 + 2 = 5, so 30 + 20 = 50', calm(last(opening, tensScene('x', 30, 20, true))))),
    ],
  };
}

// ---- M-1-B10 Word problems within 20 ----

function thingOf(name: string): { emoji: string; one: string; many: string } {
  const found = STORY_COUNTABLES.find((each) => each.one === name);
  if (!found) throw new Error(`No story countable called ${name}`);
  return found;
}

function storyScene(p: string, a: number, b: number, plus: boolean, emoji: string): Scene {
  const things = plus ? [...group(`${p}d`, art(emoji), a, 1, 1.1, 10, 0.8), ...group(`${p}d`, art(emoji), b, 1, 2.2, 10, 0.8).map((each, i) => ({ ...each, id: `${p}d${a + i}`, gone: true }))] : group(`${p}d`, art(emoji), a, 1, 1.4, 10, 0.8);
  return scene([...things, ...eqRow(`${p}e`, [a, plus ? '+' : '-', b, '=', '?'], 4.3, 1.1).map((each) => ({ ...each, gone: true }))]);
}

function storyMoments(p: string, a: number, b: number, plus: boolean, kind: string, thingName: string): Moment[] {
  const thing = thingOf(thingName);
  const start = storyScene(p, a, b, plus, thing.emoji);
  const shown = set(start, ids(`${p}d`, a), { lit: true });
  const opening = moment(['First there', isAre(a), { number: a }, `${a === 1 ? thing.one : thing.many}.`], `${a} ${a === 1 ? thing.one : thing.many}`, shown);
  if (plus) {
    const more = set(calm(start), ids(`${p}d`, b, a), { gone: false, lit: true });
    const sentence = set(calm(more), ids(`${p}e`, 5), { gone: false });
    const counted = countAlong(sentence, ids(`${p}d`, b, a), a);
    return [
      opening,
      moment(['Then', { number: b }, kind === 'table' ? 'more are in the box.' : 'more come.'], `${b} more`, more),
      moment(['Getting more means we add.'], `${a} + ${b}`, set(sentence, [`${p}e1`], { lit: true })),
      moment(['Start at', { number: a }, ', and count on', { number: b }, '.'], `Start at ${a}.`, set(sentence, ids(`${p}d`, a), { lit: true })),
      ...counted.moments,
      moment([{ number: a }, ', plus', { number: b }, ', equals', { number: a + b }, '.'], `${a} + ${b} = ${a + b}`, become(counted.end, `${p}e4`, numeral(a + b))),
    ];
  }
  const sentence = set(calm(start), ids(`${p}e`, 5), { gone: false });
  const back = countBack(sentence, ids(`${p}d`, a), b);
  const left = a - b;
  return [
    opening,
    moment(['Then', { number: b }, kind === 'givesAway' ? 'are given away.' : 'are taken.'], `${b} go away.`, set(calm(start), ids(`${p}d`, b, left), { lit: true })),
    moment(['Going away means we take away.'], `${a} - ${b}`, set(sentence, [`${p}e1`], { lit: true })),
    moment(['Cross them out, and count back.'], 'Cross out and count back.', sentence),
    ...back.moments,
    moment([{ number: a }, ', minus', { number: b }, ', equals', { number: left }, '.'], `${a} - ${b} = ${left}`, become(set(back.end, ids(`${p}d`, left), { lit: true }), `${p}e4`, numeral(left))),
  ];
}

// A compare story: two rows lined up, and the extra ones in the longer row counted.
function compareStoryMoments(p: string, a: number, b: number, emoji: string): Moment[] {
  const start = scene([
    ...group(`${p}a`, art(emoji), a, 0.5, 1, 10, 0.9),
    ...group(`${p}b`, art(emoji), b, 0.5, 2.4, 10, 0.9),
    ...eqRow(`${p}e`, [a, '-', b, '=', a - b], 4.3, 1.1).map((each) => ({ ...each, gone: true })),
  ]);
  const extra = ids(`${p}a`, a - b, b);
  const counted = countAlong(set(start, [...ids(`${p}a`, b), ...ids(`${p}b`, b)], { dim: true }), extra);
  return [
    moment(['Some stories ask, how many more? One row has', { number: a }, '. The other has', { number: b }, '.'], `${a} and ${b}: how many more?`, start),
    moment(['Line them up, and count the extra ones.'], 'Count the extra ones.', set(start, extra, { lit: true })),
    ...counted.moments,
    moment(['There are', { number: a - b }, 'more. That is', { number: a }, ', minus', { number: b }, '.'], `${a} - ${b} = ${a - b}`, set(withoutHand(counted.end), ids(`${p}e`, 5), { gone: false, lit: true })),
  ];
}

export function wordProblemsLesson(): Lesson {
  const opening = storyMoments('x', 8, 5, true, 'gets', 'apple');
  const away = storyMoments('y', 12, 4, false, 'givesAway', 'cookie');
  const compare = compareStoryMoments('z', 9, 6, '⭐');
  const first = turnQuestion('M-1-B10', 1, (f) => num(f, 'b') <= 6);
  const second = turnQuestion('M-1-B10', 2, (f) => num(f, 'b') <= 5);
  const why = (q: Question, plus: boolean): Moment[] => [
    moment(['Let us act out the story.'], 'Act it out.', storyScene('w', num(q.facts, 'a'), num(q.facts, 'b'), plus, thingOf(str(q.facts, 'thing')).emoji)),
    ...storyMoments('w', num(q.facts, 'a'), num(q.facts, 'b'), plus, str(q.facts, 'story'), str(q.facts, 'thing')),
  ];
  return {
    parts: [
      show(moment(['A story problem tells us whether to add or take away.'], 'Add or take away?', storyScene('x', 8, 5, true, '🍎'))),
      ...opening.map(show),
      turn(first, why(first, true)),
      show(moment(['In some stories, things go away.'], 'Some things go away.', storyScene('y', 12, 4, false, '🍪'))),
      ...away.map(show),
      turn(second, why(second, false)),
      ...compare.map(show),
      show(moment(['Getting more: add. Going away: take away. How many more: take away too.'], 'More: +. Away: -. How many more: -.', calm(last(compare, storyScene('y', 12, 4, false, '🍪'))))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-1-A1': countTo120Lesson,
  'M-1-A2': skipCountLesson,
  'M-1-A3': tensOnesLesson,
  'M-1-A4': compareLesson,
  'M-1-A5': tenMoreLessLesson,
  'M-1-A6': hearNumberLesson,
  'M-1-A7': showTensOnesLesson,
  'M-1-A8': orderLesson,
  'M-1-A9': hundredChartLesson,
  'M-1-A10': numberWordsLesson,
  'M-1-B1': addWithin20Lesson,
  'M-1-B2': subtractWithin20Lesson,
  'M-1-B3': doublesLesson,
  'M-1-B4': makeTenLesson,
  'M-1-B6': trueFalseLesson,
  'M-1-B7': addThreeLesson,
  'M-1-B8': twoDigitPlusOneLesson,
  'M-1-B9': addSubtractTensLesson,
  'M-1-B10': wordProblemsLesson,
};
