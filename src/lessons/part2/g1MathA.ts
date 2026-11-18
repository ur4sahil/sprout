import { numberWords } from '../../audio/say';
import { STORY_COUNTABLES } from '../../content/data/countables';
import type { Question, Say } from '../../engine/types';
import { alter, art, calm, countAlong, group, ids, moment, num, numeral, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, PieceLook, Scene } from '../types';

// Part 2 lessons (plan section 16) for Grade 1 Math, numbers and adding: a second short lesson for each skill's
// harder levels, offered once the child is about half way up the skill.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

const tensWord = (n: number): string => (n === 1 ? 'ten' : 'tens');
const onesWord = (n: number): string => (n === 1 ? 'one' : 'ones');
const isAre = (n: number): string => (n === 1 ? 'is' : 'are');
const last = (moments: Moment[], fallback: Scene): Scene => moments.at(-1)?.scene ?? fallback;
const pointTo = (from: Scene, id: string): Scene => {
  const target = from.pieces.find((each) => each.id === id);
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
function rods(prefix: string, count: number, x: number, y: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}r${i}`, look: { kind: 'rod' as const }, x: x + i * ROD_STEP, y, w: 0.55, h: 2.6 }));
}
function cubes(prefix: string, count: number, x: number, y: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}c${i}`, look: { kind: 'cube' as const }, x: x + Math.floor(i / 5) * 0.55, y: y + (i % 5) * 0.52, w: 0.5, h: 0.5 }));
}

// ---- M-1-A1 Count to 120: past 100, and the number before ----

type Way = 'after' | 'before';

// Three numbers in a row, with a box where the answer goes: last for "after", first for "before".
function sideScene(p: string, n: number, way: Way): Scene {
  const boxAt = way === 'after' ? 2 : 0;
  return scene([n - 1, n, n + 1].map((value, i): Piece => ({ id: `${p}${i}`, look: i === boxAt ? { kind: 'box' } : numeral(value), x: 0.6 + i * 3.2, y: 1.8, w: 2.4, h: 1.2 })));
}

function sideMoments(p: string, n: number, way: Way): Moment[] {
  const start = sideScene(p, n, way);
  if (way === 'after') {
    const one = pointTo(set(start, [`${p}0`], { lit: true }), `${p}0`);
    const two = pointTo(set(start, [`${p}0`, `${p}1`], { lit: true }), `${p}1`);
    const three = pointTo(become(two, `${p}2`, numeral(n + 1)), `${p}2`);
    return [
      moment(['What number comes after', { number: n }, '?'], `What comes after ${n}?`, set(start, [`${p}1`, `${p}2`], { lit: true })),
      moment([{ number: n - 1 }], String(n - 1), one),
      moment([{ number: n }], String(n), two),
      ...(n % 10 === 9 ? [moment(['The ones are at nine, so the next number starts a new ten.'], 'After 9 ones: a new ten.', set(withoutHand(two), [`${p}2`], { lit: true }))] : []),
      moment(['The next number is', { number: n + 1 }, '.'], `Next is ${n + 1}.`, three),
      moment([{ number: n + 1 }, 'comes after', { number: n }, '.'], `${n + 1} comes after ${n}.`, set(withoutHand(calm(three)), [`${p}1`, `${p}2`], { lit: true })),
    ];
  }
  const one = pointTo(set(start, [`${p}2`], { lit: true }), `${p}2`);
  const two = pointTo(set(start, [`${p}2`, `${p}1`], { lit: true }), `${p}1`);
  const three = pointTo(become(two, `${p}0`, numeral(n - 1)), `${p}0`);
  return [
    moment(['What number comes before', { number: n }, '?'], `What comes before ${n}?`, set(start, [`${p}0`, `${p}1`], { lit: true })),
    moment(['Before means one step back. So we count back.'], 'Before: one step back.', start),
    moment([{ number: n + 1 }], String(n + 1), one),
    moment([{ number: n }], String(n), two),
    ...(n % 10 === 0 ? [moment(['One step back from a ten, the ones turn to nine.'], 'Back from a ten: 9 ones.', set(withoutHand(two), [`${p}0`], { lit: true }))] : []),
    moment(['One step back is', { number: n - 1 }, '.'], `One back is ${n - 1}.`, three),
    moment([{ number: n - 1 }, 'comes before', { number: n }, '.'], `${n - 1} comes before ${n}.`, set(withoutHand(calm(three)), [`${p}0`, `${p}1`], { lit: true })),
  ];
}

function countTo120Part2(): Lesson {
  const hundred = sideMoments('x', 99, 'after');
  const before = sideMoments('z', 80, 'before');
  const on = scene(eqRow('h', [100, 101, 102, 103], 1.8, 1.2));
  const firstTurn = turnQuestion('M-1-A1', 3, (f) => num(f, 'n') >= 100 && num(f, 'n') % 10 !== 9);
  const secondTurn = turnQuestion('M-1-A1', 4, (f) => f.side === 'before' && num(f, 'n') % 10 === 0 && num(f, 'n') !== 80);
  const why = (q: Question): Moment[] => sideMoments('w', num(q.facts, 'n'), q.facts.side === 'before' ? 'before' : 'after');
  return {
    parts: [
      show(moment(['You know that after means the next number when we count.'], 'After = the next number.', sideScene('x', 99, 'after'))),
      show(moment(['Now let us count past one hundred.'], 'Counting past 100', set(sideScene('x', 99, 'after'), ['x1'], { lit: true }))),
      ...hundred.map(show),
      show(moment(['After', { number: 100 }, ', we keep counting the same way:', { number: 101 }, ',', { number: 102 }, ',', { number: 103 }, '.'], '100, 101, 102, 103', set(on, ids('h', 3, 1), { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['Now the other way. Before means the number just behind.'], 'Before = the number just behind.', sideScene('z', 80, 'before'))),
      ...before.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['After is one more. Before is one less. That is true past one hundred too.'], 'After: one more. Before: one less.', calm(last(hundred, on)))),
    ],
  };
}

// ---- M-1-A2 Skip counting: by twos, and a missing number anywhere ----

function gapScene(p: string, start: number, step: number, blank: number): Scene {
  return scene(Array.from({ length: 5 }, (_, i): Piece => ({ id: `${p}${i}`, look: i === blank ? { kind: 'box' } : numeral(start + i * step), x: 0.3 + i * 1.9, y: 1.9, w: 1.7, h: 1.1 })));
}

// Find the jump from two numbers side by side, then jump on (or back) to the box.
function gapMoments(p: string, start: number, step: number, blank: number): Moment[] {
  const v = (i: number): number => start + i * step;
  const answer = v(blank);
  const [i, j] = blank >= 2 ? [0, 1] : blank === 0 ? [1, 2] : [2, 3];
  const begin = gapScene(p, start, step, blank);
  const pair = pointTo(set(begin, [`${p}${i}`, `${p}${j}`], { lit: true }), `${p}${j}`);
  const jump = set(pair, [`${p}${j}`], { badge: `+${step}` });
  const from = blank === 0 ? 1 : blank - 1;
  const filled = set(set(become(withoutHand(calm(jump)), `${p}${blank}`, numeral(answer)), [`${p}${blank}`], { badge: blank === 0 ? `-${step}` : `+${step}` }), [`${p}${from}`], { lit: true });
  const moments: Moment[] = [
    moment([blank === 4 ? 'What comes next?' : 'One number is missing.'], blank === 4 ? 'What comes next?' : 'Which number is missing?', set(begin, [`${p}${blank}`], { lit: true })),
    moment(['First find the jump. Look at', { number: v(i) }, ', and', { number: v(j) }, '.'], `${v(i)}, ${v(j)}`, pair),
    moment(['From', { number: v(i) }, 'to', { number: v(j) }, 'is', { number: step }, 'more. So the jump is', { number: step }, '.'], `The jump is ${step}.`, jump),
    blank === 0
      ? moment(['The box comes first, so jump back from', { number: v(1) }, '.', { number: step }, 'less than', { number: v(1) }, 'is', { number: answer }, '.'], `${v(1)} - ${step} = ${answer}`, filled)
      : moment(['Now jump from', { number: v(from) }, '.', { number: v(from) }, ', and', { number: step }, 'more, is', { number: answer }, '.'], `${v(from)} + ${step} = ${answer}`, filled),
  ];
  if (blank > 0 && blank < 4) {
    moments.push(moment(['Check the next jump:', { number: answer }, ', then', { number: v(blank + 1) }, '. It works.'], `${answer}, ${v(blank + 1)}`, set(set(calm(filled), [`${p}${blank}`, `${p}${blank + 1}`], { lit: true }), [`${p}${blank + 1}`], { badge: `+${step}` })));
  } else {
    moments.push(moment([blank === 4 ? 'So next is' : 'So the missing number is', { number: answer }, '.'], blank === 4 ? `Next is ${answer}.` : `The missing number is ${answer}.`, set(calm(filled), [`${p}${blank}`], { lit: true })));
  }
  return moments;
}

function skipCountPart2(): Lesson {
  const twos = gapMoments('x', 12, 2, 4);
  const middle = gapMoments('y', 15, 5, 2);
  const front = gapMoments('z', 10, 10, 0);
  const firstTurn = turnQuestion('M-1-A2', 3, (f) => num(f, 'start') !== 12 && num(f, 'start') <= 30);
  const secondTurn = turnQuestion('M-1-A2', 4, (f) => num(f, 'blankIndex') === 0 && num(f, 'step') !== 10);
  const why = (q: Question): Moment[] => gapMoments('w', num(q.facts, 'start'), num(q.facts, 'step'), num(q.facts, 'blankIndex'));
  return {
    parts: [
      show(moment(['You know skip counting: the same jump each time.'], 'Skip counting: the same jump each time.', gapScene('x', 12, 2, 4))),
      show(moment(['Now the jumps are small. They are jumps of two.'], 'Jumps of 2', set(gapScene('x', 12, 2, 4), ids('x', 4), { lit: true }))),
      ...twos.map(show),
      show(moment(['Be careful. It is not', { number: 19 }, '. That would be a jump of only one.'], '18, 20. Not 19.', set(calm(last(twos, gapScene('x', 12, 2, 4))), ['x3', 'x4'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['The missing number can hide in the middle.'], 'A box in the middle', gapScene('y', 15, 5, 2))),
      ...middle.slice(1).map(show),
      show(moment(['The box can even come first. Then we jump back.'], 'A box at the start', set(gapScene('z', 10, 10, 0), ['z0'], { lit: true }))),
      ...front.slice(1, 4).map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Find the jump first. Then jump on, or jump back, to the box.'], 'Find the jump. Jump to the box.', calm(last(middle, gapScene('y', 15, 5, 2))))),
    ],
  };
}

// ---- M-1-A3 Tens and ones: write the number, and how many tens ----

// Rods and cubes for n, with two empty boxes under them for its digits.
function writeScene(p: string, n: number): Scene {
  const t = Math.floor(n / 10);
  return scene([
    ...rods(p, t, 0.5, 0.5),
    ...cubes(p, n % 10, 0.9 + t * ROD_STEP, 0.5),
    { id: `${p}dt`, look: { kind: 'box' }, x: 3.9, y: 4.1, w: 1, h: 1.3 },
    { id: `${p}do`, look: { kind: 'box' }, x: 5.1, y: 4.1, w: 1, h: 1.3 },
  ]);
}

function writeMoments(p: string, n: number): Moment[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const start = writeScene(p, n);
  const tens = become(set(start, ids(`${p}r`, t), { lit: true }), `${p}dt`, numeral(t));
  const ones = become(set(calm(tens), ids(`${p}c`, o), { lit: true }), `${p}do`, numeral(o));
  return [
    moment(['Let us write the number these blocks show.'], 'Write the number.', set(start, [`${p}dt`, `${p}do`], { lit: true })),
    moment(['Count the rods. There', isAre(t), { number: t }, `${tensWord(t)}. Write`, { number: t }, 'first.'], `${t} ${tensWord(t)}: write ${t}`, tens),
    o > 0
      ? moment(['Count the cubes. There', isAre(o), { number: o }, `${onesWord(o)}. Write`, { number: o }, 'next.'], `${o} ${onesWord(o)}: write ${o}`, ones)
      : moment(['There are no cubes. So we write a zero for the ones.'], '0 ones: write 0', ones),
    moment(['The number is', { number: n }, '.'], `The number is ${n}.`, set(calm(ones), [`${p}dt`, `${p}do`], { lit: true })),
  ];
}

// The number on top, and its tens and ones brought out as blocks under it.
function tensInScene(p: string, n: number): Scene {
  const t = Math.floor(n / 10);
  return scene([
    { id: `${p}dt`, look: numeral(t), x: 3.9, y: 0.2, w: 1, h: 1.3 },
    { id: `${p}do`, look: numeral(n % 10), x: 5.1, y: 0.2, w: 1, h: 1.3 },
    ...rods(p, t, 0.5, 2.3).map((rod) => ({ ...rod, gone: true })),
    ...cubes(p, n % 10, 0.9 + t * ROD_STEP, 2.3).map((cube) => ({ ...cube, gone: true })),
  ]);
}

function tensInMoments(p: string, n: number): Moment[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const start = tensInScene(p, n);
  const digit = pointTo(set(start, [`${p}dt`], { lit: true }), `${p}dt`);
  const shown = set(withoutHand(digit), ids(`${p}r`, t), { gone: false, lit: true });
  const ones = set(set(calm(shown), ids(`${p}r`, t), { gone: false }), [`${p}do`, ...ids(`${p}c`, o)], { gone: false, lit: true });
  return [
    moment(['How many tens are in', { number: n }, '?'], `How many tens are in ${n}?`, set(start, [`${p}dt`, `${p}do`], { lit: true })),
    moment(['The first digit tells the tens. It is', { number: t }, '.'], `First digit: ${t}`, digit),
    moment(['So', { number: n }, 'has', { number: t }, `${tensWord(t)}. Here they are.`], `${t} ${tensWord(t)}`, shown),
    o > 0 ? moment(['The second digit,', { number: o }, ', tells the ones. They are not tens.'], `${o} ${onesWord(o)}`, ones) : moment(['The zero says there are no ones.'], '0 ones', ones),
    moment(['There', isAre(t), { number: t }, `${tensWord(t)} in`, { number: n }, '.'], `${t} ${tensWord(t)} in ${n}`, set(calm(ones), [`${p}dt`, ...ids(`${p}r`, t)], { lit: true })),
  ];
}

function tensOnesPart2(): Lesson {
  const sixty = writeMoments('x', 60);
  const inside = tensInMoments('y', 47);
  const firstTurn = turnQuestion('M-1-A3', 3, (f) => num(f, 'ones') >= 1 && num(f, 'tens') >= 2 && num(f, 'tens') <= 5 && num(f, 'ones') !== num(f, 'tens'));
  const secondTurn = turnQuestion('M-1-A3', 4, (f) => num(f, 'ones') >= 1 && num(f, 'tens') !== 4 && num(f, 'ones') !== num(f, 'tens'));
  const numberOf = (q: Question): number => num(q.facts, 'tens') * 10 + num(q.facts, 'ones');
  return {
    parts: [
      show(moment(['You know that a rod is a ten, and a cube is a one.'], 'A rod is 10. A cube is 1.', set(writeScene('x', 60), ['xr0'], { lit: true }))),
      show(moment(['Now there are no numbers to pick from. You write the number yourself.'], 'You write the number.', set(writeScene('x', 60), ['xdt', 'xdo'], { lit: true }))),
      ...sixty.slice(1).map(show),
      show(moment(['The zero matters. Without it, this would say', { number: 6 }, ', not', { number: 60 }, '.'], '60 needs its 0.', set(calm(last(sixty, writeScene('x', 60))), ['xdo'], { lit: true }))),
      turn(firstTurn, writeMoments('w', numberOf(firstTurn))),
      show(moment(['Now the other way round. We start with a number, and look inside it.'], 'Look inside a number.', tensInScene('y', 47))),
      ...inside.map(show),
      show(moment(['Be careful. The question asks how many tens. So the answer is', { number: 4 }, ', not', { number: 40 }, '.'], '4 tens. The answer is 4.', set(calm(last(inside, tensInScene('y', 47))), ['ydt'], { lit: true }))),
      turn(secondTurn, tensInMoments('w', numberOf(secondTurn))),
      show(moment(['The first digit is the tens. The second digit is the ones.'], 'First digit: tens. Second digit: ones.', calm(last(inside, tensInScene('y', 47))))),
    ],
  };
}

// ---- M-1-A4 Compare two-digit numbers: pick the sign ----

function signScene(p: string, a: number, b: number): Scene {
  return scene([
    { id: `${p}a`, look: numeral(a), x: 1.2, y: 1.4, w: 2.4, h: 1.5 },
    { id: `${p}s`, look: { kind: 'box' }, x: 4.3, y: 1.5, w: 1.4, h: 1.3 },
    { id: `${p}b`, look: numeral(b), x: 6.4, y: 1.4, w: 2.4, h: 1.5 },
  ]);
}

function signMoments(p: string, a: number, b: number): Moment[] {
  const start = signScene(p, a, b);
  const ask = moment(['Which sign goes between', { number: a }, 'and', { number: b }, '?'], `${a} ? ${b}`, set(start, [`${p}s`], { lit: true }));
  if (a === b) {
    return [
      ask,
      moment(['Look closely. Both numbers are', { number: a }, '.'], `${a} and ${b}`, set(start, [`${p}a`, `${p}b`], { lit: true })),
      moment(['They are the same, so we use the equals sign.', { number: a }, 'is equal to', { number: b }, '.'], `${a} = ${b}`, become(start, `${p}s`, text('='))),
    ];
  }
  const [ta, tb] = [Math.floor(a / 10), Math.floor(b / 10)];
  const [big, small] = a > b ? [a, b] : [b, a];
  const bigId = a > b ? `${p}a` : `${p}b`;
  const sign = a > b ? '>' : '<';
  const look =
    ta !== tb
      ? moment(['Look at the tens.', { number: Math.max(ta, tb) }, `${tensWord(Math.max(ta, tb))} is more than`, { number: Math.min(ta, tb) }, `${tensWord(Math.min(ta, tb))}.`], `${Math.max(ta, tb)} tens > ${Math.min(ta, tb)} ${tensWord(Math.min(ta, tb))}`, alter(start, (each) => (each.id === `${p}a` ? { ...each, lit: true, badge: `${ta} ${tensWord(ta)}` } : each.id === `${p}b` ? { ...each, lit: true, badge: `${tb} ${tensWord(tb)}` } : each)))
      : moment(['The tens are the same, so look at the ones.', { number: big % 10 }, 'is more than', { number: small % 10 }, '.'], `Ones: ${big % 10} > ${small % 10}`, alter(start, (each) => (each.id === `${p}a` ? { ...each, lit: true, badge: `${a % 10} ${onesWord(a % 10)}` } : each.id === `${p}b` ? { ...each, lit: true, badge: `${b % 10} ${onesWord(b % 10)}` } : each)));
  const signed = become(set(start, [bigId], { lit: true }), `${p}s`, text(sign));
  return [
    ask,
    look,
    moment(['So', { number: big }, 'is the bigger number.'], `${big} is bigger.`, set(start, [bigId], { lit: true })),
    moment(['The open side of the sign faces the bigger number.'], `${a} ${sign} ${b}`, signed),
    moment([{ number: a }, a > b ? 'is greater than' : 'is less than', { number: b }, '.'], `${a} ${a > b ? 'is greater than' : 'is less than'} ${b}`, set(calm(signed), [`${p}a`, `${p}s`, `${p}b`], { lit: true })),
  ];
}

function comparePart2(): Lesson {
  const less = signMoments('x', 47, 62);
  const sameTens = signMoments('y', 85, 81);
  const equal = signMoments('z', 36, 36);
  const signs = scene([
    { id: 'g', look: text('>'), x: 1.2, y: 1.6, w: 1.6, h: 1.4, badge: 'greater than' },
    { id: 'l', look: text('<'), x: 4.2, y: 1.6, w: 1.6, h: 1.4, badge: 'less than' },
    { id: 'e', look: text('='), x: 7.2, y: 1.6, w: 1.6, h: 1.4, badge: 'equal to' },
  ]);
  const pair = (f: Record<string, unknown>): [number, number] => f.values as [number, number];
  const tens = (n: number): number => Math.floor(n / 10);
  const firstTurn = turnQuestion('M-1-A4', 3, (f) => pair(f)[0] > pair(f)[1] && tens(pair(f)[0]) !== tens(pair(f)[1]));
  const secondTurn = turnQuestion('M-1-A4', 3, (f) => pair(f)[0] < pair(f)[1] && tens(pair(f)[0]) === tens(pair(f)[1]) && tens(pair(f)[0]) !== 8);
  const why = (q: Question): Moment[] => signMoments('w', ...pair(q.facts));
  return {
    parts: [
      show(moment(['You know how to tell which of two numbers is greater.'], 'Which is greater?', signScene('x', 47, 62))),
      show(moment(['Now you pick the sign that goes between them.'], 'Pick the sign.', set(signScene('x', 47, 62), ['xs'], { lit: true }))),
      show(moment(['There are three signs: greater than, less than, and equal to.'], '>  <  =', set(signs, ['g', 'l', 'e'], { lit: true }))),
      ...less.map(show),
      show(moment(['We read it from left to right. The small, pointed side faces the smaller number.'], 'The point faces the smaller number.', set(calm(last(less, signScene('x', 47, 62))), ['xa', 'xs'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      ...sameTens.map(show),
      ...equal.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['The open side always faces the bigger number. Two numbers that are the same get the equals sign.'], 'Open side: the bigger number. Same: =', calm(last(sameTens, signScene('y', 85, 81))))),
    ],
  };
}

// ---- M-1-A5 Ten more, ten less: typed, either way ----

function tenScene(p: string, n: number, more: boolean): Scene {
  const t = Math.floor(n / 10);
  const count = more ? t + 1 : t;
  return scene([
    ...rods(p, count, 0.5, 0.5).map((rod, i) => (i >= t ? { ...rod, gone: true } : rod)),
    ...cubes(p, n % 10, 0.9 + count * ROD_STEP, 0.5),
    { id: `${p}dt`, look: numeral(t), x: 3.9, y: 4.1, w: 1, h: 1.3, gone: t === 0 },
    { id: `${p}do`, look: numeral(n % 10), x: 5.1, y: 4.1, w: 1, h: 1.3 },
  ]);
}

function tenMoments(p: string, n: number, more: boolean): Moment[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const answer = more ? n + 10 : n - 10;
  const newT = more ? t + 1 : t - 1;
  const way = more ? 'more' : 'less';
  const start = tenScene(p, n, more);
  const blocks = [...ids(`${p}r`, t), ...ids(`${p}c`, o)];
  const changed = more ? set(start, [`${p}r${t}`], { gone: false, lit: true }) : set(start, [`${p}r${t - 1}`], { crossed: true, lit: true });
  const after = more ? calm(changed) : set(calm(changed), [`${p}r${t - 1}`], { gone: true });
  const digit = newT === 0 ? set(after, [`${p}dt`], { gone: true }) : become(after, `${p}dt`, numeral(newT));
  const moments: Moment[] = [
    moment(['What is ten', way, 'than', { number: n }, '?'], `10 ${way} than ${n}?`, start),
    t === 0
      ? moment([{ number: n }, 'has no tens. It is only', { number: o }, `${onesWord(o)}.`], `${n}: 0 tens and ${o} ${onesWord(o)}`, set(start, blocks, { lit: true }))
      : o === 0
        ? moment([{ number: n }, 'is', { number: t }, `${tensWord(t)}, and no ones.`], `${n}: ${t} ${tensWord(t)}`, set(start, blocks, { lit: true }))
        : moment([{ number: n }, 'is', { number: t }, `${tensWord(t)}, and`, { number: o }, `${onesWord(o)}.`], `${n}: ${t} ${tensWord(t)} and ${o} ${onesWord(o)}`, set(start, blocks, { lit: true })),
    moment([more ? 'Ten more means one more ten.' : 'Ten less means one ten goes away.'], more ? 'One more ten.' : 'One ten goes away.', changed),
    newT === 0 ? moment(['Now there are no tens left.'], '0 tens', digit) : moment(['Now there', isAre(newT), { number: newT }, `${tensWord(newT)}.`], `${newT} ${tensWord(newT)}`, digit),
  ];
  if (o > 0) moments.push(moment(['The ones stay the same:', { number: o }, '.'], `Still ${o} ${onesWord(o)}`, set(calm(digit), [...ids(`${p}c`, o), `${p}do`], { lit: true })));
  moments.push(moment(['So ten', way, 'than', { number: n }, 'is', { number: answer }, '.'], `10 ${way} than ${n} is ${answer}.`, set(calm(digit), [`${p}dt`, `${p}do`], { lit: true })));
  return moments;
}

function tenMoreLessPart2(): Lesson {
  const small = tenMoments('x', 7, true);
  const teen = tenMoments('y', 14, false);
  const firstTurn = turnQuestion('M-1-A5', 3, (f) => f.oracle === 'add' && num(f, 'a') >= 21 && num(f, 'a') % 10 !== 0 && num(f, 'a') <= 79);
  const secondTurn = turnQuestion('M-1-A5', 3, (f) => f.oracle === 'subtract' && num(f, 'a') >= 21 && num(f, 'a') % 10 !== 0);
  const why = (q: Question): Moment[] => tenMoments('w', num(q.facts, 'a'), q.facts.oracle === 'add');
  return {
    parts: [
      show(moment(['You know that ten more adds a ten, and ten less takes a ten away.'], '10 more: add a ten. 10 less: take a ten.', tenScene('x', 7, true))),
      show(moment(['Now you type the answer. Listen first: is it more, or less?'], 'More, or less?', set(tenScene('x', 7, true), ['xdo'], { lit: true }))),
      ...small.map(show),
      show(moment(['Be careful. Ten more is not one more. One more than', { number: 7 }, 'is only', { number: 8 }, '.'], '10 more is not 1 more.', calm(last(small, tenScene('x', 7, true))))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['Now ten less, from a number with just one ten.'], '10 less', tenScene('y', 14, false))),
      ...teen.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['More means one more ten. Less means one ten fewer. The ones never change.'], 'Only the tens change.', calm(last(teen, tenScene('y', 14, false))))),
    ],
  };
}

// ---- M-1-A6 Hear and find numbers: teens, tens and past 100, all mixed ----

function hearScene(p: string, n: number, options: readonly number[]): Scene {
  const digits = String(n).length;
  const left = (10 - digits * 1.4) / 2;
  return scene([
    ...Array.from({ length: digits }, (_, i): Piece => ({ id: `${p}d${i}`, look: { kind: 'box' }, x: left + i * 1.4, y: 0.6, w: 1.2, h: 1.4 })),
    ...options.map((value, i): Piece => ({ id: `${p}o${i}`, look: numeral(value), x: 0.2 + i * 2.45, y: 3.9, w: 2.2, h: 1 })),
  ]);
}

function hearMoments(p: string, n: number, options: readonly number[]): Moment[] {
  const digits = String(n).split('').map(Number);
  const start = hearScene(p, n, options);
  let now = calm(start);
  const moments: Moment[] = [moment(['Listen:', { number: n }, '.'], 'Listen.', set(start, ids(`${p}d`, digits.length), { lit: true }))];
  const fill = (at: number[], say: Say, caption: string): void => {
    now = calm(now);
    for (const i of at) now = become(now, `${p}d${i}`, numeral(digits[i] as number));
    moments.push(moment(say, caption, now));
  };
  const hundred = digits.length === 3;
  const rest = n % 100;
  const t = Math.floor(rest / 10);
  const o = n % 10;
  const [ti, oi] = hundred ? [1, 2] : [0, 1];
  if (hundred) fill([0], ['One hundred comes first. We write a one.'], '100: write 1.');
  if (hundred && rest === 0) {
    fill([ti, oi], ['No tens and no ones, so we write two zeros.'], '0 tens, 0 ones');
  } else if (rest < 10) {
    fill([ti], ['There are no tens, so we write a zero.'], '0 tens');
    fill([oi], ['Then', { number: o }, 'ones. We write a', { number: o }, '.'], `${o} ones`);
  } else if (rest >= 13 && rest < 20) {
    fill([ti, oi], [hundred ? 'Then' : 'The word', { word: numberWords(rest) }, 'ends in teen. Teen means one ten. We write a one, then a', { number: o }, '.'], `${numberWords(rest)}: 1 ten, ${o} ones`);
  } else if (rest < 20) {
    fill([ti, oi], [{ number: rest }, 'is one ten, and', { number: o }, `${onesWord(o)}. We write a one, then a`, { number: o }, '.'], `${rest}: 1 ten, ${o} ${onesWord(o)}`);
  } else {
    fill([ti], [{ word: numberWords(t * 10) }, 'has no teen in it. It means', { number: t }, 'tens. We write a', { number: t }, '.'], `${numberWords(t * 10)}: ${t} tens`);
    if (o > 0) fill([oi], ['Then', { word: numberWords(o) }, '. We write a', { number: o }, '.'], `${numberWords(o)}: ${o}`);
    else fill([oi], ['Nothing comes after it, so there are no ones. We write a zero.'], '0 ones');
  }
  const right = options.indexOf(n);
  moments.push(moment(['Find the one that looks the same. That is', { number: n }, '.'], String(n), set(calm(now), [...(right >= 0 ? [`${p}o${right}`] : []), ...ids(`${p}d`, digits.length)], { lit: true })));
  return moments;
}

function hearNumberPart2(): Lesson {
  const pairScene = scene([
    { id: 'en', look: numeral(16), x: 1.2, y: 0.9, w: 2, h: 1.3 },
    { id: 'ew', look: text('sixteen'), x: 0.4, y: 2.5, w: 3.6, h: 0.9 },
    { id: 'yn', look: numeral(60), x: 6.8, y: 0.9, w: 2, h: 1.3 },
    { id: 'yw', look: text('sixty'), x: 6, y: 2.5, w: 3.6, h: 0.9 },
  ]);
  const teen = hearMoments('x', 17, [17, 27, 70, 71]);
  const past = hearMoments('y', 114, [14, 104, 114, 141]);
  const firstTurn = turnQuestion('M-1-A6', 3, (f) => num(f, 'target') >= 13 && num(f, 'target') <= 19 && num(f, 'target') !== 17 && num(f, 'target') !== 16);
  const secondTurn = turnQuestion('M-1-A6', 3, (f) => num(f, 'target') % 10 === 0 && num(f, 'target') >= 30 && num(f, 'target') <= 90 && num(f, 'target') !== 60);
  const why = (q: Question): Moment[] => hearMoments('w', num(q.facts, 'target'), q.facts.options as number[]);
  return {
    parts: [
      show(moment(['You know how to write a number you hear, one part at a time.'], 'Hear it, write it part by part.', hearScene('x', 17, [17, 27, 70, 71]))),
      show(moment(['Now listen to the end of the word. Some numbers sound almost the same.'], 'Listen to the end of the word.', pairScene)),
      show(moment([{ word: 'sixteen' }, 'ends in teen. It is one ten, and', { number: 6 }, 'ones.'], '16: sixteen', set(pairScene, ['en', 'ew'], { lit: true }))),
      show(moment([{ word: 'sixty' }, 'has no teen. It is', { number: 6 }, 'tens, and no ones.'], '60: sixty', set(pairScene, ['yn', 'yw'], { lit: true }))),
      ...teen.map(show),
      turn(firstTurn, why(firstTurn)),
      show(moment(['A teen can come after one hundred, too.'], 'A teen after 100', hearScene('y', 114, [14, 104, 114, 141]))),
      ...past.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Teen means one ten. Listen to the end of the word.'], 'Teen = one ten.', set(pairScene, ['en', 'ew'], { lit: true }))),
    ],
  };
}

// ---- M-1-A8 Put numbers in order: with numbers past 100 ----

const orderLeft = (count: number): number => (10 - count * 2.2 + 0.3) / 2;

function orderScene(p: string, values: readonly number[]): Scene {
  return scene(values.map((value, i): Piece => ({ id: `${p}${i}`, look: numeral(value), x: orderLeft(values.length) + i * 2.2, y: 0.6, w: 1.9, h: 1.2 })));
}

function orderMoments(p: string, values: readonly number[]): Moment[] {
  const start = orderScene(p, values);
  const left = orderLeft(values.length);
  const sorted = values.map((value, i) => ({ value, i })).sort((x, y) => x.value - y.value);
  const big = values.flatMap((value, i) => (value >= 100 ? [`${p}${i}`] : []));
  const moments: Moment[] = [moment(['First, look for numbers past one hundred. They have three digits.'], 'Three digits: past 100', set(start, big, { lit: true, badge: '100 +' }))];
  let now = calm(start);
  sorted.forEach(({ value, i }, k) => {
    now = alter(now, (each) => (each.id === `${p}${i}` ? { ...each, x: left + k * 2.2, y: 3.4, lit: true } : { ...each, lit: undefined }));
    const before = sorted[k - 1]?.value;
    const say: Say =
      before === undefined
        ? [{ number: value }, 'is the smallest. It goes first.']
        : value >= 100 && before < 100
          ? [{ number: value }, 'is past one hundred, so it comes after the two-digit numbers.']
          : value >= 100
            ? [{ number: value }, 'is past one hundred too, and it is bigger than', { number: before }, '. It goes after it.']
            : Math.floor(before / 10) === Math.floor(value / 10)
              ? [{ number: value }, 'has the same tens as', { number: before }, ', but more ones. It goes next.']
              : ['Next is', { number: value }, '. It has more tens.'];
    moments.push(moment(say, String(value), now));
  });
  const order: Say = sorted.flatMap(({ value }, k) => (k === 0 ? [{ number: value }] : [',', { number: value }]));
  moments.push(moment(['In order:', ...order, '.'], sorted.map(({ value }) => value).join(', '), set(calm(now), ids(p, values.length), { lit: true })));
  return moments;
}

function orderPart2(): Lesson {
  const mixed = [103, 87, 115, 80];
  const opening = orderMoments('x', mixed);
  const two = scene([
    { id: 'p0', look: numeral(112), x: 1.6, y: 1.6, w: 2.4, h: 1.3 },
    { id: 'p1', look: numeral(104), x: 6, y: 1.6, w: 2.4, h: 1.3 },
  ]);
  const past = (f: Record<string, unknown>): number => (f.values as number[]).filter((value) => value >= 100).length;
  const firstTurn = turnQuestion('M-1-A8', 3, (f) => past(f) === 1 && !(f.values as number[]).includes(103));
  const secondTurn = turnQuestion('M-1-A8', 3, (f) => past(f) === 2);
  const why = (q: Question): Moment[] => [moment(['Let us put them in order, smallest first.'], 'Smallest first.', orderScene('w', q.facts.values as number[])), ...orderMoments('w', q.facts.values as number[])];
  return {
    parts: [
      show(moment(['You know how to put numbers in order: tens first, then ones.'], 'Tens first, then ones.', orderScene('x', mixed))),
      show(moment(['Now some of the numbers are past one hundred.'], 'Past 100', set(orderScene('x', mixed), ['x0', 'x2'], { lit: true }))),
      show(moment(['A number with three digits is bigger than any number with two digits.'], '3 digits beat 2 digits.', set(orderScene('x', mixed), ['x0', 'x2'], { lit: true, badge: '3 digits' }))),
      ...opening.slice(1).map(show),
      show(moment(['Do not be tricked.', { number: 103 }, 'has small digits, but it has a whole hundred in it.'], '103 is more than 87.', set(calm(last(opening, orderScene('x', mixed))), ['x0'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['Two numbers past one hundred? Look at what comes after the hundred.'], 'Both past 100?', set(two, ['p0', 'p1'], { lit: true }))),
      show(moment(['After the hundred,', { number: 104 }, 'has', { number: 4 }, ', and', { number: 112 }, 'has', { number: 12 }, '. So', { number: 104 }, 'is smaller.'], '104 is less than 112.', alter(two, (each) => (each.id === 'p1' ? { ...each, lit: true, badge: '100 and 4' } : { ...each, badge: '100 and 12' })))),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Smallest first: the two-digit numbers, then the numbers past one hundred.'], '2 digits first, then 3 digits.', calm(last(opening, orderScene('x', mixed))))),
    ],
  };
}

// ---- M-1-A9 Hundred chart puzzles: past 100, and a box in the top row ----

function chartScene(p: string, topLeft: number, blank: number | null): Scene {
  const pieces: Piece[] = [];
  for (let i = 0; i < 9; i += 1) {
    const x = 2.3 + (i % 3) * 1.85;
    const y = 0.4 + Math.floor(i / 3) * 1.25;
    pieces.push({ id: `${p}k${i}`, look: { kind: 'cell' }, x, y, w: 1.75, h: 1.15 });
    pieces.push({ id: `${p}n${i}`, look: i === blank ? { kind: 'box' } : numeral(topLeft + Math.floor(i / 3) * 10 + (i % 3)), x: x + 0.1, y: y + 0.1, w: 1.55, h: 0.95 });
  }
  return scene(pieces);
}

// The number above the box and ten more; or, for a box in the top row, the number under it and ten less.
function chartMoments(p: string, topLeft: number, blank: number): Moment[] {
  const valueAt = (i: number): number => topLeft + Math.floor(i / 3) * 10 + (i % 3);
  const answer = valueAt(blank);
  const start = chartScene(p, topLeft, blank);
  const top = blank < 3;
  const helper = top ? blank + 3 : blank - 3;
  const helperValue = valueAt(helper);
  const look = pointTo(set(start, [`${p}n${helper}`], { lit: true }), `${p}n${helper}`);
  const filled = withoutHand(set(become(look, `${p}n${blank}`, numeral(answer)), [`${p}n${blank}`], { badge: top ? '-10' : '+10' }));
  const side = blank % 3 > 0 ? blank - 1 : blank + 1;
  return [
    moment(['Which number goes in the empty box?'], 'Which number goes in the box?', set(start, [`${p}n${blank}`], { lit: true })),
    moment(['Look at the number', top ? 'under the box.' : 'above the box.', 'It is', { number: helperValue }, '.'], `${helperValue} is ${top ? 'under' : 'above'} the box.`, look),
    top
      ? moment(['Going up is ten less. Ten less than', { number: helperValue }, 'is', { number: answer }, '.'], `${helperValue} - 10 = ${answer}`, filled)
      : moment(['Going down is ten more. Ten more than', { number: helperValue }, 'is', { number: answer }, '.'], `${helperValue} + 10 = ${answer}`, filled),
    blank % 3 > 0
      ? moment(['Check across:', { number: answer - 1 }, ', then', { number: answer }, '. One more. It fits.'], `${answer - 1}, ${answer}`, set(calm(filled), [`${p}n${side}`, `${p}n${blank}`], { lit: true }))
      : moment(['Check across:', { number: answer }, ', then', { number: answer + 1 }, '. One more. It fits.'], `${answer}, ${answer + 1}`, set(calm(filled), [`${p}n${side}`, `${p}n${blank}`], { lit: true })),
    moment(['So the box needs', { number: answer }, '.'], `The box needs ${answer}.`, set(calm(filled), [`${p}n${blank}`], { lit: true })),
  ];
}

function hundredChartPart2(): Lesson {
  const full = chartScene('x', 84, null);
  const past = chartMoments('y', 93, 7);
  const topRow = chartMoments('z', 56, 1);
  const firstTurn = turnQuestion('M-1-A9', 3, (f) => num(f, 'topLeft') >= 81 && num(f, 'blank') !== 7 && num(f, 'blank') >= 6 && Math.abs(num(f, 'topLeft') - 93) > 1);
  const secondTurn = turnQuestion('M-1-A9', 3, (f) => num(f, 'blank') < 3 && num(f, 'topLeft') !== 56 && num(f, 'topLeft') < 80);
  const why = (q: Question): Moment[] => chartMoments('w', num(q.facts, 'topLeft'), num(q.facts, 'blank'));
  return {
    parts: [
      show(moment(['You know the hundred chart. Across is one more, and down is ten more.'], 'Across +1. Down +10.', set(full, ['xn0', 'xn1', 'xn3'], { lit: true }))),
      show(moment(['The chart keeps going past one hundred.'], 'Past 100', set(full, ['xn6', 'xn7', 'xn8'], { lit: true }))),
      show(moment(['Under', { number: 94 }, 'comes', { number: 104 }, '. That is ten more, just the same.'], '94 + 10 = 104', set(set(full, ['xn3', 'xn6'], { lit: true }), ['xn6'], { badge: '+10' }))),
      ...past.map(show),
      turn(firstTurn, why(firstTurn)),
      show(moment(['What if the box is in the top row? Then nothing is above it. So we look under it.'], 'A box in the top row', set(chartScene('z', 56, 1), ['zn1', 'zn4'], { lit: true }))),
      ...topRow.slice(1).map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Down is ten more. Up is ten less. Across is one more.'], 'Down +10. Up -10. Across +1.', calm(last(past, full)))),
    ],
  };
}

// ---- M-1-A10 Number words: see the number, find its words ----

function wordScene(p: string, n: number, options: readonly string[]): Scene {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const w = 9.6 / options.length;
  return scene([
    { id: `${p}dt`, look: numeral(t), x: 3.9, y: 0.1, w: 1, h: 1.3 },
    { id: `${p}do`, look: numeral(o), x: 5.1, y: 0.1, w: 1, h: 1.3 },
    { id: `${p}wt`, look: text(numberWords(t * 10)), x: 1.4, y: 1.8, w: 3.2, h: 0.9, gone: true },
    { id: `${p}wo`, look: text(numberWords(o)), x: 5.4, y: 1.8, w: 3.2, h: 0.9, gone: true },
    ...options.map((word, i): Piece => ({ id: `${p}o${i}`, look: text(word), x: 0.2 + i * w, y: 4.2, w: w - 0.2, h: 0.9 })),
  ]);
}

function wordMoments(p: string, n: number, options: readonly string[]): Moment[] {
  const t = Math.floor(n / 10);
  const o = n % 10;
  const start = wordScene(p, n, options);
  const tens = set(start, [`${p}dt`, `${p}wt`], { lit: true, gone: false });
  const ones = o > 0 ? set(set(calm(tens), [`${p}wt`], { gone: false }), [`${p}do`, `${p}wo`], { lit: true, gone: false }) : set(calm(tens), [`${p}do`], { lit: true });
  const right = options.indexOf(numberWords(n));
  return [
    moment(['Which word names', { number: n }, '?'], `Which word names ${n}?`, set(start, [`${p}dt`, `${p}do`], { lit: true })),
    moment(['The first digit is', { number: t }, '. That means', { number: t }, 'tens. The tens word is', { word: numberWords(t * 10) }, '.'], `${t} tens: ${numberWords(t * 10)}`, tens),
    o > 0 ? moment(['The second digit is', { number: o }, '. The ones word is', { word: numberWords(o) }, '.'], `${o}: ${numberWords(o)}`, ones) : moment(['The second digit is zero. There are no ones, so there is no ones word.'], '0 ones: no ones word', ones),
    moment([o > 0 ? 'Put them together, tens word first:' : 'So the whole name is', { word: numberWords(n) }, '.'], `${n} is ${numberWords(n)}`, set(calm(ones), right >= 0 ? [`${p}o${right}`] : [], { lit: true })),
  ];
}

function numberWordsPart2(): Lesson {
  const options = ['forty-eight', 'fifty-eight', 'eighty-five'];
  const opening = wordMoments('x', 58, options);
  const zero = wordScene('y', 70, ['seven', 'seventeen', 'seventy']);
  const firstTurn = turnQuestion('M-1-A10', 3, (f) => num(f, 'n') % 10 !== 0 && num(f, 'n') !== 58 && num(f, 'n') !== 85);
  const secondTurn = turnQuestion('M-1-A10', 3, (f) => num(f, 'n') % 10 === 0 && num(f, 'n') !== 70);
  const why = (q: Question): Moment[] => wordMoments('w', num(q.facts, 'n'), q.facts.options as string[]);
  return {
    parts: [
      show(moment(['You know how to read a number word, and find its number.'], 'Word to number', wordScene('x', 58, options))),
      show(moment(['Now we go the other way. We see the number, and find its word.'], 'Number to word', set(wordScene('x', 58, options), ids('xo', 3), { lit: true }))),
      ...opening.map(show),
      show(moment(['Be careful.', { word: 'eighty-five' }, 'uses the same digits, the wrong way round. It names', { number: 85 }, '.'], 'eighty-five is 85, not 58.', set(calm(last(opening, wordScene('x', 58, options))), ['xo2'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['A number that ends in zero has only a tens word.'], 'Ends in 0: just a tens word', set(zero, ['ydt', 'ydo'], { lit: true }))),
      show(moment([{ number: 70 }, 'is', { number: 7 }, 'tens, and no ones. Its word is', { word: 'seventy' }, ', not', { word: 'seventeen' }, '.'], '70 is seventy.', set(zero, ['yo2'], { lit: true }))),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Say the tens word first, then the ones word.'], 'Tens word, then ones word.', calm(last(opening, wordScene('x', 58, options))))),
    ],
  };
}

// ---- M-1-B1 Add within 20: bigger sums, typed ----

const COUNTER = '🔴';

function countOnScene(p: string, a: number, b: number): Scene {
  const [bigger, smaller] = [Math.max(a, b), Math.min(a, b)];
  return scene([...eqRow(`${p}e`, [a, '+', b, '=', '?'], 0.2), { id: `${p}big`, look: numeral(bigger), x: 0.6, y: 2, w: 1.8, h: 1.6 }, ...group(`${p}d`, art(COUNTER), smaller, 3.2, 1.8, 5, 1)]);
}

function countOnMoments(p: string, a: number, b: number): Moment[] {
  const [bigger, smaller] = [Math.max(a, b), Math.min(a, b)];
  const start = countOnScene(p, a, b);
  const bigIndex = a >= b ? 0 : 2;
  const counted = countAlong(start, ids(`${p}d`, smaller), bigger);
  const done = set(become(counted.end, `${p}e4`, numeral(a + b)), [`${p}big`, ...ids(`${p}d`, smaller)], { lit: true });
  return [
    moment([{ number: a }, 'plus', { number: b }, '. Start with the bigger number,', { number: bigger }, '.'], `Start at ${bigger}.`, set(start, [`${p}big`, `${p}e${bigIndex}`], { lit: true })),
    moment(['Do not count', { number: bigger }, 'again. The first count is', { number: bigger + 1 }, '.'], `Count on ${smaller}: start with ${bigger + 1}.`, set(start, [`${p}e${2 - bigIndex}`, `${p}d0`], { lit: true })),
    ...counted.moments,
    moment([{ number: a }, ', plus', { number: b }, ', equals', { number: a + b }, '.'], `${a} + ${b} = ${a + b}`, done),
  ];
}

function addWithin20Part2(): Lesson {
  const opening = countOnMoments('x', 7, 6);
  const flipped = countOnMoments('y', 5, 8);
  const around = scene([...eqRow('t', [7, '+', 6, '=', 13], 1, 1.1), ...eqRow('u', [6, '+', 7, '=', 13], 2.6, 1.1)]);
  const firstTurn = turnQuestion('M-1-B1', 3, (f) => num(f, 'a') > num(f, 'b') && num(f, 'a') <= 9 && num(f, 'a') !== 7 && num(f, 'b') <= 5 && num(f, 'b') >= 3 && num(f, 'a') + num(f, 'b') >= 11);
  const secondTurn = turnQuestion('M-1-B1', 3, (f) => num(f, 'a') < num(f, 'b') && num(f, 'a') <= 5 && num(f, 'a') >= 3 && num(f, 'a') + num(f, 'b') >= 12 && num(f, 'b') === 9);
  const why = (q: Question): Moment[] => countOnMoments('w', num(q.facts, 'a'), num(q.facts, 'b'));
  return {
    parts: [
      show(moment(['You know how to add: start with the bigger number, and count on.'], 'Start big and count on.', countOnScene('x', 7, 6))),
      show(moment(['Now the sums are bigger, and you type the answer yourself.'], 'Bigger sums. You type the answer.', set(countOnScene('x', 7, 6), ['xe4'], { lit: true }))),
      ...opening.map(show),
      show(moment(['The answer has two digits. Type the one first, then the', { number: 3 }, '.'], 'Type 1, then 3.', set(calm(last(opening, countOnScene('x', 7, 6))), ['xe4'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['Here is a way to check. Turn the numbers around. The answer stays the same.'], '7 + 6 = 6 + 7', set(around, ['t4', 'u4'], { lit: true }))),
      show(moment(['If the bigger number comes second, start with it anyway.'], 'Start with the bigger one.', set(countOnScene('y', 5, 8), ['ye2'], { lit: true }))),
      ...flipped.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Start big. Count on. And do not count the start number again.'], 'Start big. Count on.', calm(last(flipped, countOnScene('y', 5, 8))))),
    ],
  };
}

// ---- M-1-B2 Subtract within 20: taking away a lot, typed ----

function takeScene(p: string, a: number, b: number): Scene {
  return scene([...eqRow(`${p}e`, [a, '-', b, '=', '?'], 0.2), ...group(`${p}d`, art(COUNTER), a, 1, 1.6, 10, 0.8)]);
}

// Taking away a lot: cross them all out at once, then count the ones that are left.
function countLeftMoments(p: string, a: number, b: number): Moment[] {
  const left = a - b;
  const start = takeScene(p, a, b);
  const crossed = set(start, ids(`${p}d`, b, left), { crossed: true, lit: true });
  const faded = set(calm(crossed), ids(`${p}d`, b, left), { dim: true });
  const counted = countAlong(faded, ids(`${p}d`, left));
  return [
    moment([{ number: a }, 'minus', { number: b }, '. Start with', { number: a }, '.'], `Start with ${a}.`, set(start, [...ids(`${p}d`, a), `${p}e0`], { lit: true })),
    moment(['Take away', { number: b }, '. That is a lot, so cross them out all at once.'], `Cross out ${b}.`, set(crossed, [`${p}e2`], { lit: true })),
    moment(['Now count the ones that are left.'], 'Count what is left.', set(faded, ids(`${p}d`, left), { lit: true })),
    ...counted.moments,
    moment([{ number: a }, ', minus', { number: b }, ', equals', { number: left }, '.'], `${a} - ${b} = ${left}`, become(counted.end, `${p}e4`, numeral(left))),
  ];
}

// Taking away a few: cross out from the end, counting back.
function countBackMoments(p: string, a: number, b: number): Moment[] {
  const left = a - b;
  const start = takeScene(p, a, b);
  let now = calm(start);
  const back: Moment[] = [];
  for (let k = 1; k <= b; k += 1) {
    const id = `${p}d${a - k}`;
    now = pointTo(alter(now, (each) => (each.id === id ? { ...each, crossed: true, lit: true, badge: String(a - k) } : each.badge ? { ...each, badge: undefined, lit: undefined } : each)), id);
    back.push(moment([{ number: a - k }], String(a - k), now));
  }
  const done = set(set(withoutHand(calm(now)), ids(`${p}d`, b, left), { dim: true }), ids(`${p}d`, left), { lit: true });
  return [
    moment([{ number: a }, 'minus', { number: b }, '. Start with', { number: a }, '.'], `Start with ${a}.`, set(start, [...ids(`${p}d`, a), `${p}e0`], { lit: true })),
    moment(['Take away only', { number: b }, '. Cross them out, and count back.'], `Take away ${b}. Count back.`, set(start, [`${p}e2`], { lit: true })),
    ...back,
    moment([{ number: a }, ', minus', { number: b }, ', equals', { number: left }, '.'], `${a} - ${b} = ${left}`, become(done, `${p}e4`, numeral(left))),
  ];
}

function subtractWithin20Part2(): Lesson {
  const lots = countLeftMoments('x', 13, 9);
  const few = countBackMoments('y', 17, 3);
  const firstTurn = turnQuestion('M-1-B2', 3, (f) => num(f, 'b') >= 6 && num(f, 'a') - num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') <= 5 && num(f, 'a') !== 13);
  const secondTurn = turnQuestion('M-1-B2', 3, (f) => num(f, 'b') <= 4 && num(f, 'a') >= 13 && num(f, 'a') !== 17);
  const why = (q: Question): Moment[] => (num(q.facts, 'b') > num(q.facts, 'a') - num(q.facts, 'b') ? countLeftMoments('w', num(q.facts, 'a'), num(q.facts, 'b')) : countBackMoments('w', num(q.facts, 'a'), num(q.facts, 'b')));
  return {
    parts: [
      show(moment(['You know how to take away: cross out, and count back.'], 'Cross out and count back.', takeScene('x', 13, 9))),
      show(moment(['But what if we take away a lot? Counting back', { number: 9 }, 'times is slow.'], '13 - 9: that is a lot to count back.', set(takeScene('x', 13, 9), ['xe2'], { lit: true }))),
      ...lots.map(show),
      show(moment(['Taking away a lot? Cross them out, then count what is left.'], 'A lot: count what is left.', calm(last(lots, takeScene('x', 13, 9))))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['Taking away just a few? Then counting back is still quick.'], 'A few: count back.', set(takeScene('y', 17, 3), ['ye2'], { lit: true }))),
      ...few.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Pick the shorter way. Then type how many are left.'], 'Pick the shorter way.', calm(last(few, takeScene('y', 17, 3))))),
    ],
  };
}

// ---- M-1-B4 Make ten to add: starting from seven ----

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
  return [
    moment([{ number: a }, 'plus', { number: b }, '. The first frame has', { number: a }, '.'], `${a} + ${b}`, set(start, ids(`${p}a`, a), { lit: true })),
    moment(['It has', { number: move }, 'empty squares. So it needs', { number: move }, 'more to make ten.'], `${a} needs ${move} more.`, set(start, ids(`${p}Ak`, move, a), { lit: true })),
    moment(['Move', { number: move }, 'over from the other frame.'], `Move ${move}.`, moved),
    moment(['Now the first frame is ten. The other frame has', { number: left }, 'left.'], `10 and ${left}`, set(set(calm(moved), [...ids(`${p}a`, a), ...moving], { lit: true }), ids(`${p}b`, left), { lit: true })),
    moment(['So it is the same as', { number: 10 }, 'plus', { number: left }, ', which is', { number: a + b }, '.'], `10 + ${left} = ${a + b}`, set(calm(moved), ids(`${p}s`, 5), { gone: false, lit: true })),
  ];
}

function makeTenPart2(): Lesson {
  const opening = makeTenMoments('x', 7, 5);
  const more = makeTenMoments('y', 7, 8);
  const firstTurn = turnQuestion('M-1-B4', 3, (f) => num(f, 'b') === 4 || num(f, 'b') === 6);
  const secondTurn = turnQuestion('M-1-B4', 3, (f) => num(f, 'b') === 7 || num(f, 'b') === 9);
  const why = (q: Question): Moment[] => makeTenMoments('w', num(q.facts, 'a'), num(q.facts, 'b'));
  return {
    parts: [
      show(moment(['You know how to make a ten: fill the first frame, then add what is left.'], 'Fill the ten first.', framesScene('x', 7, 5))),
      show(moment(['Now the first number is', { number: 7 }, '. It leaves more empty squares to fill.'], '7 leaves more room.', set(framesScene('x', 7, 5), ids('xa', 7), { lit: true }))),
      ...opening.slice(1).map(show),
      show(moment(['Be careful. It is not', { number: 10 }, 'plus', { number: 5 }, '. Three of the five moved over, so only', { number: 2 }, 'are left.'], '10 + 2, not 10 + 5', set(calm(last(opening, framesScene('x', 7, 5))), ['xs2'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['Let us do one more with seven.'], 'One more', framesScene('y', 7, 8))),
      ...more.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Seven takes three to make ten. Then add what is left.'], '7 + 3 = 10. Then add the rest.', calm(last(more, framesScene('y', 7, 8))))),
    ],
  };
}

// ---- M-1-B5 Missing number: to 20, a box anywhere, and minus ----

type Hide = 'second' | 'first' | 'minus';

// The number sentence on top, and the part of the number line that runs up to its biggest number.
function hopScene(p: string, hide: Hide, known: number, total: number): Scene {
  const parts: (number | string)[] = hide === 'second' ? [known, '+', '?', '=', total] : hide === 'first' ? ['?', '+', known, '=', total] : [total, '-', '?', '=', known];
  const lo = Math.max(0, total - 10);
  return scene([...eqRow(`${p}e`, parts, 0.3, 1.1, 11), ...Array.from({ length: 11 }, (_, i): Piece => ({ id: `${p}n${lo + i}`, look: numeral(lo + i), x: i, y: 3.4 }))], 11, 6);
}

// Start at the number we know, hop up to the biggest number, and count the hops.
function hopMoments(p: string, hide: Hide, known: number, total: number): Moment[] {
  const missing = total - known;
  const start = hopScene(p, hide, known, total);
  const [boxId, knownId, totalId] = hide === 'second' ? [`${p}e2`, `${p}e0`, `${p}e4`] : hide === 'first' ? [`${p}e0`, `${p}e2`, `${p}e4`] : [`${p}e2`, `${p}e4`, `${p}e0`];
  const ask: Say = hide === 'second' ? [{ number: known }, 'plus what number equals', { number: total }, '?'] : hide === 'first' ? ['What number plus', { number: known }, 'equals', { number: total }, '?'] : [{ number: total }, 'minus what number equals', { number: known }, '?'];
  const sentence = hide === 'second' ? `${known} + ? = ${total}` : hide === 'first' ? `? + ${known} = ${total}` : `${total} - ? = ${known}`;
  let now = pointTo(set(start, [`${p}n${known}`, knownId], { lit: true }), `${p}n${known}`);
  const moments: Moment[] = [
    moment(ask, sentence, set(start, [boxId], { lit: true })),
    moment([hide === 'minus' ? 'Start at the number that is left,' : 'Start at the part we know,', { number: known }, '.'], `Start at ${known}.`, now),
    moment(['Count up to', { number: total }, ', one hop at a time.'], `Count up to ${total}.`, set(now, [totalId, `${p}n${total}`], { lit: true })),
  ];
  for (let hop = 1; hop <= missing; hop += 1) {
    const at = known + hop;
    now = pointTo(alter(now, (each) => (each.id === `${p}n${at}` ? { ...each, lit: true, badge: String(hop) } : each)), `${p}n${at}`);
    moments.push(moment([{ number: at }], String(at), now));
  }
  const filled = become(withoutHand(now), boxId, numeral(missing));
  const check: Say = hide === 'second' ? ['Check:', { number: known }, ', plus', { number: missing }, ', equals', { number: total }, '.'] : hide === 'first' ? ['Check:', { number: missing }, ', plus', { number: known }, ', equals', { number: total }, '.'] : ['Check:', { number: total }, ', minus', { number: missing }, ', equals', { number: known }, '.'];
  moments.push(
    moment(['That was', { number: missing }, missing === 1 ? 'hop.' : 'hops.', 'So the missing number is', { number: missing }, '.'], `${missing} ${missing === 1 ? 'hop' : 'hops'}: the missing number is ${missing}.`, filled),
    moment(check, sentence.replace('?', String(missing)), set(calm(filled), [boxId, knownId, totalId], { lit: true })),
  );
  return moments;
}

function missingNumberPart2(): Lesson {
  const front = hopMoments('x', 'first', 9, 13);
  const minus = hopMoments('y', 'minus', 12, 15);
  const firstTurn = turnQuestion('M-1-B5', 2, (f) => num(f, 'b') >= 3 && num(f, 'b') <= 5 && num(f, 'a') !== 9);
  const secondTurn = turnQuestion('M-1-B5', 3, (f) => num(f, 'b') >= 3 && num(f, 'b') <= 5 && num(f, 'total') >= 12 && num(f, 'total') !== 15);
  const thirdTurn = turnQuestion('M-1-B5', 4, (f) => {
    const missing = f.blank === 'a' ? num(f, 'a') : num(f, 'b');
    return missing >= 3 && missing <= 5 && num(f, 'total') !== 13 && num(f, 'total') !== num(firstTurn.facts, 'total');
  });
  const why = (q: Question): Moment[] => {
    const f = q.facts;
    if (f.minus === true) return hopMoments('w', 'minus', num(f, 'a'), num(f, 'total'));
    return f.blank === 'a' ? hopMoments('w', 'first', num(f, 'b'), num(f, 'total')) : hopMoments('w', 'second', num(f, 'a'), num(f, 'total'));
  };
  return {
    parts: [
      show(moment(['You know how to find a hidden number: hop from the number you know.'], 'Hop from the number you know.', hopScene('x', 'first', 9, 13))),
      show(moment(['Now the numbers are bigger, and the box can come first.'], 'Bigger numbers. The box can be first.', set(hopScene('x', 'first', 9, 13), ['xe0'], { lit: true }))),
      ...front.map(show),
      turn(firstTurn, why(firstTurn)),
      show(moment(['Now a minus sentence. The box hides how many were taken away.'], 'A box in a minus sentence', set(hopScene('y', 'minus', 12, 15), ['ye2'], { lit: true }))),
      ...minus.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Sometimes you move a number into the gap. Find it the same way.'], 'Move a number into the gap.', calm(last(front, hopScene('x', 'first', 9, 13))))),
      turn(thirdTurn, why(thirdTurn)),
      show(moment(['Start at the number you know. Hop to the bigger number. Count the hops.'], 'Count the hops.', calm(last(minus, hopScene('y', 'minus', 12, 15))))),
    ],
  };
}

// ---- M-1-B6 True or false: a plus on one side, a minus on the other ----

type Side = (number | string)[];
const worth = (side: Side): number => side.reduce<number>((total, part, i) => (typeof part === 'number' ? total + (i > 0 && side[i - 1] === '-' ? -part : part) : total), 0);

function truthScene(p: string, left: Side, right: Side): Scene {
  const row = eqRow(p, [...left, '=', ...right], 1, 1.2);
  const middle = (from: number, to: number): number => {
    const one = row[from];
    const end = row[to];
    return one && end ? (one.x + end.x + (end.w ?? 1)) / 2 : 5;
  };
  return scene([
    ...row,
    { id: `${p}lv`, look: numeral(worth(left)), x: middle(0, left.length - 1) - 0.7, y: 2.7, w: 1.4, h: 1.1, gone: true },
    { id: `${p}rv`, look: numeral(worth(right)), x: middle(left.length + 1, row.length - 1) - 0.7, y: 2.7, w: 1.4, h: 1.1, gone: true },
  ]);
}

function sideSay(side: Side, value: number, which: string): Say {
  if (side.length === 1) return [`The ${which} side is just`, { number: value }, '.'];
  return side[1] === '-'
    ? [`On the ${which}, start with`, { number: side[0] as number }, ', and take away', { number: side[2] as number }, '. That leaves', { number: value }, '.']
    : [`On the ${which},`, { number: side[0] as number }, 'plus', { number: side[2] as number }, 'is', { number: value }, '.'];
}

function truthMoments(p: string, left: Side, right: Side): Moment[] {
  const [x, y] = [worth(left), worth(right)];
  const start = truthScene(p, left, right);
  const leftDone = set(start, [...ids(p, left.length), `${p}lv`], { lit: true, gone: false });
  const rightDone = set(set(calm(leftDone), [`${p}lv`], { gone: false }), [...ids(p, right.length, left.length + 1), `${p}rv`], { lit: true, gone: false });
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

function trueFalsePart2(): Lesson {
  const yes = truthMoments('x', [5, '+', 3], [12, '-', 4]);
  const no = truthMoments('y', [14, '-', 5], [6, '+', 4]);
  const sides = (f: Record<string, unknown>): [Side, Side] => [f.left as Side, f.right as Side];
  const isTrue = (f: Record<string, unknown>): boolean => worth(sides(f)[0]) === worth(sides(f)[1]);
  const firstTurn = turnQuestion('M-1-B6', 3, (f) => isTrue(f) && sides(f)[0][1] === '+' && worth(sides(f)[0]) !== 8 && worth(sides(f)[0]) >= 5 && (sides(f)[1][2] as number) <= 6);
  const secondTurn = turnQuestion('M-1-B6', 3, (f) => !isTrue(f) && sides(f)[0][1] === '-' && sides(f)[0][0] !== 14 && (sides(f)[0][2] as number) <= 6 && worth(sides(f)[0]) >= 5);
  const why = (q: Question): Moment[] => truthMoments('w', ...sides(q.facts));
  return {
    parts: [
      show(moment(['You know that both sides of the equals sign must be the same amount.'], '= means the same amount.', set(truthScene('x', [5, '+', 3], [12, '-', 4]), ['x3'], { lit: true }))),
      show(moment(['Now one side can have a minus. Minus means take away.'], 'One side has a minus.', set(truthScene('x', [5, '+', 3], [12, '-', 4]), ['x5'], { lit: true }))),
      ...yes.map(show),
      show(moment(['The two sides can look very different, and still be the same amount.'], '5 + 3 and 12 - 4 are both 8.', set(calm(last(yes, truthScene('x', [5, '+', 3], [12, '-', 4]))), ['xlv', 'xrv'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['The minus can be on the left side too.'], 'A minus on the left', set(truthScene('y', [14, '-', 5], [6, '+', 4]), ['y1'], { lit: true }))),
      ...no.map(show),
      show(moment(['They were close, but close is not the same.'], '9 is not 10.', set(calm(last(no, truthScene('y', [14, '-', 5], [6, '+', 4]))), ['ylv', 'yrv'], { lit: true }))),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Work out the plus side. Work out the minus side. The same amount means true.'], 'Same amount: true.', calm(last(yes, truthScene('x', [5, '+', 3], [12, '-', 4]))))),
    ],
  };
}

// ---- M-1-B7 Add three numbers: a ten that is split apart, or no ten at all ----

type Three = [number, number, number];

// The pair added first: a pair that makes ten, or else the first two.
function firstPair(nums: Three): { pair: [number, number]; at: [number, number]; z: number; zAt: number; ten: boolean } {
  const [a, b, c] = nums;
  const tries: { pair: [number, number]; at: [number, number]; z: number; zAt: number }[] = [
    { pair: [a, b], at: [0, 2], z: c, zAt: 4 },
    { pair: [a, c], at: [0, 4], z: b, zAt: 2 },
    { pair: [b, c], at: [2, 4], z: a, zAt: 0 },
  ];
  const ten = tries.find((each) => each.pair[0] + each.pair[1] === 10);
  return ten ? { ...ten, ten: true } : { pair: [a, b], at: [0, 2], z: c, zAt: 4, ten: false };
}

function threeScene(p: string, nums: Three): Scene {
  const { pair, z } = firstPair(nums);
  const sum = nums[0] + nums[1] + nums[2];
  return scene([...eqRow(p, [nums[0], '+', nums[1], '+', nums[2], '=', '?'], 0.6, 1.1), ...eqRow(`${p}s`, [pair[0] + pair[1], '+', z, '=', sum], 2.8, 1.1).map((each) => ({ ...each, gone: true }))]);
}

function threeMoments(p: string, nums: Three): Moment[] {
  const { pair, at, z, zAt, ten } = firstPair(nums);
  const pairSum = pair[0] + pair[1];
  const sum = nums[0] + nums[1] + nums[2];
  const start = threeScene(p, nums);
  const picked = [`${p}${at[0]}`, `${p}${at[1]}`];
  const paired = set(set(start, picked, { lit: true }), [`${p}s0`], { gone: false, lit: true });
  const third = set(set(calm(paired), picked, { dim: true }), [`${p}${zAt}`, `${p}s1`, `${p}s2`], { lit: true, gone: false });
  const done = become(set(calm(third), [`${p}s3`, `${p}s4`], { gone: false, lit: true }), `${p}6`, numeral(sum));
  return [
    moment([ten ? 'Look for two numbers that make ten. They may not be side by side.' : 'No two numbers make ten here. So add the first two.'], ten ? 'Find a pair that makes 10.' : 'No ten: add the first two.', set(start, picked, { lit: true })),
    moment([{ number: pair[0] }, 'plus', { number: pair[1] }, 'is', { number: pairSum }, '.'], `${pair[0]} + ${pair[1]} = ${pairSum}`, paired),
    moment(['Then add the other number,', { number: z }, '.'], `Then add ${z}.`, third),
    moment([{ number: pairSum }, ', plus', { number: z }, ', equals', { number: sum }, '.'], `${pairSum} + ${z} = ${sum}`, done),
  ];
}

function addThreePart2(): Lesson {
  const apart = threeMoments('x', [4, 5, 6]);
  const none = threeMoments('y', [5, 3, 6]);
  const numsOf = (f: Record<string, unknown>): Three => [num(f, 'a'), num(f, 'b'), num(f, 'c')];
  const firstTurn = turnQuestion('M-1-B7', 3, (f) => {
    const [a, b, c] = numsOf(f);
    return a + c === 10 && a + b !== 10 && b + c !== 10 && a !== 4 && a !== 6 && a !== 5;
  });
  const secondTurn = turnQuestion('M-1-B7', 3, (f) => {
    const [a, b, c] = numsOf(f);
    return a + b !== 10 && a + c !== 10 && b + c !== 10 && a + b + c >= 11 && a + b !== 8;
  });
  const why = (q: Question): Moment[] => threeMoments('w', numsOf(q.facts));
  return {
    parts: [
      show(moment(['You know how to add three numbers: add two first, then the third.'], 'Add two, then the third.', threeScene('x', [4, 5, 6]))),
      show(moment(['Now you type the answer. And the best pair may be hiding.'], 'The best pair may hide.', set(threeScene('x', [4, 5, 6]), ['x6'], { lit: true }))),
      ...apart.map(show),
      show(moment(['We can add in any order. The answer stays the same.'], 'Any order works.', set(calm(last(apart, threeScene('x', [4, 5, 6]))), ['x0', 'x4'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['What if no pair makes ten?'], 'No pair makes 10?', threeScene('y', [5, 3, 6]))),
      ...none.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Look for a ten first. If there is none, add two numbers, then the third.'], 'Look for 10. If none, add two, then the third.', calm(last(apart, threeScene('x', [4, 5, 6]))))),
    ],
  };
}

// ---- M-1-B8 Add two-digit and one-digit: with the digits, typed ----

// The sum written in columns: tens over tens, ones over ones, answer boxes below, and room for the new ten on top.
function columnScene(p: string, a: number, b: number): Scene {
  const ones = (a % 10) + b;
  return scene([
    { id: `${p}new`, look: numeral(1), x: 4.2, y: 0.1, w: 0.6, h: 0.8, gone: true },
    { id: `${p}at`, look: numeral(Math.floor(a / 10)), x: 4, y: 1, w: 1, h: 1.2 },
    { id: `${p}ao`, look: numeral(a % 10), x: 5.1, y: 1, w: 1, h: 1.2 },
    { id: `${p}plus`, look: text('+'), x: 2.8, y: 2.3, w: 1, h: 1.2 },
    { id: `${p}b`, look: numeral(b), x: 5.1, y: 2.3, w: 1, h: 1.2 },
    { id: `${p}st`, look: { kind: 'box' }, x: 4, y: 3.9, w: 1, h: 1.2 },
    { id: `${p}so`, look: { kind: 'box' }, x: 5.1, y: 3.9, w: 1, h: 1.2 },
    { id: `${p}ones`, look: numeral(ones), x: 7.3, y: 1.7, w: 1.6, h: 1.2, gone: true },
  ]);
}

function columnMoments(p: string, a: number, b: number): Moment[] {
  const t = Math.floor(a / 10);
  const x = a % 10;
  const ones = x + b;
  const sum = a + b;
  const start = columnScene(p, a, b);
  const lined = alter(start, (each) => (each.id === `${p}at` ? { ...each, badge: 'tens' } : each.id === `${p}ao` ? { ...each, badge: 'ones', lit: true } : each.id === `${p}b` ? { ...each, lit: true } : each));
  const added = set(set(calm(start), [`${p}ao`, `${p}b`], { lit: true }), [`${p}ones`], { gone: false, lit: true, badge: `${x} + ${b}` });
  const moments: Moment[] = [
    moment([{ number: a }, 'plus', { number: b }, '. The', { number: b }, 'is ones, so it sits under the ones.'], `${a} + ${b}`, lined),
    moment(['Add the ones first.', { number: x }, 'plus', { number: b }, 'is', { number: ones }, '.'], `${x} + ${b} = ${ones}`, added),
  ];
  if (ones < 10) {
    const onesDone = become(set(calm(added), [`${p}ones`], { gone: false }), `${p}so`, numeral(ones));
    const tensDone = become(set(calm(onesDone), [`${p}at`], { lit: true }), `${p}st`, numeral(t));
    moments.push(
      moment(['That is less than ten. Write', { number: ones }, 'in the ones place.'], `${ones} ones`, onesDone),
      moment(['There is no new ten, so the tens stay at', { number: t }, '.'], `${t} ${tensWord(t)}`, tensDone),
      moment(['So', { number: a }, ', plus', { number: b }, ', equals', { number: sum }, '.'], `${a} + ${b} = ${sum}`, set(calm(tensDone), [`${p}st`, `${p}so`], { lit: true })),
    );
    return moments;
  }
  const onesDone = become(set(calm(added), [`${p}ones`], { gone: false }), `${p}so`, numeral(ones - 10));
  const moved = set(calm(onesDone), [`${p}new`], { gone: false, lit: true, badge: 'new ten' });
  const tensDone = become(set(calm(moved), [`${p}new`, `${p}at`], { lit: true, gone: false }), `${p}st`, numeral(t + 1));
  moments.push(
    moment([{ number: ones }, 'is one ten, and', { number: ones - 10 }, `${onesWord(ones - 10)}. Write the`, { number: ones - 10 }, 'in the ones place.'], `${ones} = 1 ten and ${ones - 10} ${onesWord(ones - 10)}`, onesDone),
    moment(['Put the new ten on top of the tens.'], 'The new ten joins the tens.', moved),
    moment([{ number: t }, `${tensWord(t)}, and one more ten, make`, { number: t + 1 }, 'tens.'], `${t} + 1 = ${t + 1} tens`, tensDone),
    moment(['So', { number: a }, ', plus', { number: b }, ', equals', { number: sum }, '.'], `${a} + ${b} = ${sum}`, set(calm(tensDone), [`${p}st`, `${p}so`], { lit: true })),
  );
  return moments;
}

function twoDigitPlusOnePart2(): Lesson {
  const carry = columnMoments('x', 57, 6);
  const plain = columnMoments('y', 82, 5);
  const regroup = (f: Record<string, unknown>): boolean => (num(f, 'a') % 10) + num(f, 'b') >= 10;
  const firstTurn = turnQuestion('M-1-B8', 3, (f) => regroup(f) && Math.floor(num(f, 'a') / 10) !== 5 && num(f, 'a') !== 36);
  const secondTurn = turnQuestion('M-1-B8', 3, (f) => !regroup(f) && num(f, 'b') >= 3 && Math.floor(num(f, 'a') / 10) !== 8 && num(f, 'a') !== 23);
  const why = (q: Question): Moment[] => columnMoments('w', num(q.facts, 'a'), num(q.facts, 'b'));
  return {
    parts: [
      show(moment(['You know how to add ones to a bigger number with blocks.'], 'Adding ones to a bigger number', columnScene('x', 57, 6))),
      show(moment(['Now we use just the digits, and you type the answer.'], 'Just the digits', set(columnScene('x', 57, 6), ['xst', 'xso'], { lit: true }))),
      ...carry.map(show),
      show(moment(['Do not forget the new ten. The answer is', { number: 63 }, ', not', { number: 53 }, '.'], '63, not 53', set(calm(last(carry, columnScene('x', 57, 6))), ['xnew', 'xst'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['Sometimes the ones do not reach ten.'], 'Fewer than 10 ones', columnScene('y', 82, 5))),
      ...plain.slice(1).map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Add the ones first. Ten or more ones? Then there is one more ten.'], '10 or more ones: one more ten.', calm(last(carry, columnScene('x', 57, 6))))),
    ],
  };
}

// ---- M-1-B9 Add tens to a number that has ones ----

function tensOnScene(p: string, a: number, b: number): Scene {
  const [ta, tb] = [Math.floor(a / 10), b / 10];
  return scene([
    ...rods(p, ta + tb, 0.4, 0.5).map((rod, i) => (i >= ta ? { ...rod, gone: true } : rod)),
    ...cubes(p, a % 10, 0.8 + (ta + tb) * ROD_STEP, 0.5),
    ...eqRow(`${p}e`, [a, '+', b, '=', '?'], 4.2, 1.1),
  ]);
}

function tensOnMoments(p: string, a: number, b: number): Moment[] {
  const [ta, tb, o] = [Math.floor(a / 10), b / 10, a % 10];
  const start = tensOnScene(p, a, b);
  const added = set(start, ids(`${p}r`, tb, ta), { gone: false, lit: true });
  const allTens = set(calm(added), ids(`${p}r`, ta + tb), { lit: true });
  const ones = set(calm(added), ids(`${p}c`, o), { lit: true });
  return [
    moment([{ number: a }, 'is', { number: ta }, `${tensWord(ta)}, and`, { number: o }, `${onesWord(o)}.`], `${a} = ${ta} ${tensWord(ta)} and ${o} ${onesWord(o)}`, set(start, [...ids(`${p}r`, ta), ...ids(`${p}c`, o), `${p}e0`], { lit: true })),
    moment(['Add', { number: b }, '. That is', { number: tb }, `more ${tensWord(tb)}.`], `+ ${tb} ${tensWord(tb)}`, set(added, [`${p}e2`], { lit: true })),
    moment([{ number: ta }, `${tensWord(ta)}, plus`, { number: tb }, `${tensWord(tb)}, is`, { number: ta + tb }, 'tens.'], `${ta} + ${tb} = ${ta + tb} tens`, allTens),
    moment(['The ones do not change. There', isAre(o), 'still', { number: o }, '.'], `Still ${o} ${onesWord(o)}`, ones),
    moment([{ number: ta + tb }, 'tens, and', { number: o }, `${onesWord(o)}, make`, { number: a + b }, '.'], `${a} + ${b} = ${a + b}`, become(set(calm(added), [...ids(`${p}r`, ta + tb), ...ids(`${p}c`, o)], { lit: true }), `${p}e4`, numeral(a + b))),
  ];
}

function addSubtractTensPart2(): Lesson {
  const opening = tensOnMoments('x', 34, 20);
  const bigger = tensOnMoments('y', 17, 60);
  const firstTurn = turnQuestion('M-1-B9', 3, (f) => num(f, 'a') !== 34 && num(f, 'b') <= 30 && num(f, 'a') >= 21 && num(f, 'a') % 10 >= 2 && num(f, 'a') % 10 !== num(f, 'b') / 10);
  const secondTurn = turnQuestion('M-1-B9', 3, (f) => num(f, 'b') >= 40 && num(f, 'a') !== 17 && num(f, 'a') % 10 >= 2 && num(f, 'a') + num(f, 'b') !== num(firstTurn.facts, 'a') + num(firstTurn.facts, 'b'));
  const why = (q: Question): Moment[] => tensOnMoments('w', num(q.facts, 'a'), num(q.facts, 'b'));
  return {
    parts: [
      show(moment(['You know how to add tens to tens: count the tens.'], 'Tens add like ones.', tensOnScene('x', 34, 20))),
      show(moment(['Now the first number has some ones, too.'], 'A number with ones', set(tensOnScene('x', 34, 20), ids('xc', 4), { lit: true }))),
      ...opening.map(show),
      show(moment(['Be careful. The', { number: 2 }, 'in', { number: 20 }, 'means two tens. We add it to the tens, not to the ones.'], '34 + 20 is 54, not 36.', set(calm(last(opening, tensOnScene('x', 34, 20))), ['xe2'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['Let us add even more tens.'], 'More tens', tensOnScene('y', 17, 60))),
      ...bigger.map(show),
      turn(secondTurn, why(secondTurn)),
      show(moment(['Add the tens to the tens. The ones stay the same.'], 'Only the tens change.', calm(last(bigger, tensOnScene('y', 17, 60))))),
    ],
  };
}

// ---- M-1-B10 Word problems: how many more? ----

function thingOf(name: string): { emoji: string; one: string; many: string } {
  return STORY_COUNTABLES.find((each) => each.one === name) ?? { emoji: '⭐', one: 'star', many: 'stars' };
}

// Two rows lined up, one under the other, each in lines of ten. The number sentence waits underneath.
function moreScene(p: string, a: number, b: number, emoji: string): Scene {
  return scene([
    ...group(`${p}a`, art(emoji), a, 1, 0.4, 10, 0.8),
    ...group(`${p}b`, art(emoji), b, 1, 2.4, 10, 0.8),
    ...eqRow(`${p}e`, [a, '-', b, '=', a - b], 4.6, 1.1).map((each) => ({ ...each, gone: true })),
  ]);
}

function moreMoments(p: string, a: number, b: number, emoji: string, top: string, bottom: string, many: string): Moment[] {
  const start = moreScene(p, a, b, emoji);
  const extra = ids(`${p}a`, a - b, b);
  const partners = [...ids(`${p}a`, b), ...ids(`${p}b`, b)];
  const counted = countAlong(set(start, partners, { dim: true }), extra);
  return [
    moment([top, { number: a }, `${many}.`, bottom, { number: b }, '.'], `${a} and ${b}`, start),
    moment(['Line them up. These', { number: b }, 'on top each have a partner below.'], 'Match them up.', set(start, partners, { lit: true })),
    moment(['These have no partner. They are the extra ones. Count them.'], 'Count the extra ones.', set(set(start, partners, { dim: true }), extra, { lit: true })),
    ...counted.moments,
    moment(['There', isAre(a - b), { number: a - b }, 'more.'], `${a - b} more`, set(counted.end, extra, { lit: true })),
    moment(['How many more means we take away.', { number: a }, ', minus', { number: b }, ', equals', { number: a - b }, '.'], `${a} - ${b} = ${a - b}`, set(calm(counted.end), ids(`${p}e`, 5), { gone: false, lit: true })),
  ];
}

function wordProblemsPart2(): Lesson {
  const opening = moreMoments('x', 11, 7, '🎈', 'The top row has', 'The bottom row has', 'balloons');
  const sum = scene([...moreScene('y', 14, 9, '⭐').pieces.map((each) => (each.id.startsWith('ye') ? { ...each, gone: false } : each))]);
  const gap = (f: Record<string, unknown>): number => num(f, 'a') - num(f, 'b');
  const firstTurn = turnQuestion('M-1-B10', 3, (f) => num(f, 'a') <= 10 && gap(f) >= 2 && gap(f) <= 4);
  const secondTurn = turnQuestion('M-1-B10', 3, (f) => num(f, 'a') >= 12 && num(f, 'a') <= 16 && gap(f) >= 3 && gap(f) <= 5 && num(f, 'a') !== 14);
  const why = (q: Question): Moment[] => {
    const f = q.facts;
    const thing = thingOf(str(f, 'thing'));
    return [
      moment(['Let us line up the story.'], 'Line them up.', moreScene('w', num(f, 'a'), num(f, 'b'), thing.emoji)),
      ...moreMoments('w', num(f, 'a'), num(f, 'b'), thing.emoji, `${str(f, 'name')} has`, `${str(f, 'name2')} has`, thing.many),
    ];
  };
  return {
    parts: [
      show(moment(['You know two kinds of stories: getting more, and going away.'], 'More stories. Going-away stories.', moreScene('x', 11, 7, '🎈'))),
      show(moment(['This kind of story has two groups. It asks how many more one group has.'], 'How many more?', set(moreScene('x', 11, 7, '🎈'), ids('xa', 11), { lit: true }))),
      ...opening.map(show),
      show(moment(['Be careful. Here the word more does not mean add. We only want the extra ones.'], 'More does not mean add here.', set(calm(last(opening, moreScene('x', 11, 7, '🎈'))), ['xe1'], { lit: true }))),
      turn(firstTurn, why(firstTurn)),
      show(moment(['With bigger numbers, you can skip the counting. Take the small number from the big one.'], 'Big number minus small number', set(sum, ['ye0', 'ye1', 'ye2'], { lit: true }))),
      show(moment([{ number: 14 }, 'and', { number: 9 }, '. The extra ones are', { number: 14 }, ', minus', { number: 9 }, '. That is', { number: 5 }, '.'], '14 - 9 = 5', set(set(sum, ids('ya', 5, 9), { lit: true }), ['ye4'], { lit: true }))),
      turn(secondTurn, why(secondTurn)),
      show(moment(['How many more? Line them up and count the extra ones, or take the small number from the big one.'], 'How many more: big minus small.', calm(last(opening, moreScene('x', 11, 7, '🎈'))))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-1-A1': countTo120Part2,
  'M-1-A2': skipCountPart2,
  'M-1-A3': tensOnesPart2,
  'M-1-A4': comparePart2,
  'M-1-A5': tenMoreLessPart2,
  'M-1-A6': hearNumberPart2,
  'M-1-A8': orderPart2,
  'M-1-A9': hundredChartPart2,
  'M-1-A10': numberWordsPart2,
  'M-1-B1': addWithin20Part2,
  'M-1-B2': subtractWithin20Part2,
  'M-1-B4': makeTenPart2,
  'M-1-B5': missingNumberPart2,
  'M-1-B6': trueFalsePart2,
  'M-1-B7': addThreePart2,
  'M-1-B8': twoDigitPlusOnePart2,
  'M-1-B9': addSubtractTensPart2,
  'M-1-B10': wordProblemsPart2,
};
