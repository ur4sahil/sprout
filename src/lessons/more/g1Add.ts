import { COUNTABLES } from '../../content/data/countables';
import { PART_STORIES, THREE_STORIES } from '../../content/data/h1-stories';
import type { Question, Say } from '../../engine/types';
import { add, alter, art, calm, countAlong, group, ids, moment, num, numeral, picture, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Grade 1 Math lessons, adding and subtracting and measuring (plan section 16):
// B.11 to B.19, C.3 and C.5. Written in the rich look's style.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

const RED = '🔴';
const BLUE = '🔵';
const YELLOW = '🟡';
const WHITE = '⚪';

type Part = number | string;

// A number sentence as a row of pieces: numbers as numerals, 'blank' as an empty box, anything else as a sign.
function sentence(prefix: string, parts: readonly Part[], x: number, y: number, size = 1): Piece[] {
  return parts.map((part, i) => ({
    id: `${prefix}${i}`,
    look: typeof part === 'number' ? numeral(part) : part === 'blank' ? { kind: 'box' as const } : text(part === '-' ? '−' : part),
    x: x + i * size,
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

// The right option of a choice question: what it says and what it shows.
function rightOption(q: Question): { say: Say; shown: string } {
  if (q.type !== 'choice') throw new Error(`${q.skillId}: a turn must be a choice`);
  const option = q.options[q.answerIndex];
  if (!option || option.kind !== 'text' || !option.speak) throw new Error(`${q.skillId}: the right option is not text`);
  return { say: option.speak, shown: option.value };
}

function countable(name: string): { emoji: string; one: string; many: string } {
  const found = COUNTABLES.find((each) => each.one === name);
  if (!found) throw new Error(`No countable called ${name}`);
  return found;
}

// ---- M-1-B11 Order does not matter ----

// Red and blue counters with a plus between them. Swapped, the blue ones are on the left.
function pairScene(p: string, a: number, b: number, swapped: boolean): Scene {
  const size = 0.8;
  const place = (x0: number) => (i: number) => ({ x: x0 + (i % 5) * size, y: 2.2 + Math.floor(i / 5) * size });
  const left = 0.4;
  const right = 5.6;
  const red = Array.from({ length: a }, (_, i): Piece => ({ id: `${p}a${i}`, look: art(RED), ...place(swapped ? right : left)(i), w: size, h: size }));
  const blue = Array.from({ length: b }, (_, i): Piece => ({ id: `${p}b${i}`, look: art(BLUE), ...place(swapped ? left : right)(i), w: size, h: size }));
  return scene([...red, { id: `${p}plus`, look: text('+'), x: 4.5, y: 2.3 }, ...blue]);
}

function swapMoments(p: string, a: number, b: number): { moments: Moment[]; end: Scene } {
  const total = a + b;
  const first = add(pairScene(p, a, b, false), sentence(`${p}e`, [a, '+', b, '=', b, '+', 'blank'], 1.5, 0.4));
  const swapped = alter(first, (piece) => {
    const moved = pairScene(p, a, b, true).pieces.find((each) => each.id === piece.id);
    return moved ? { ...piece, x: moved.x, y: moved.y } : piece;
  });
  const end = fillBox(calm(swapped), `${p}e6`, a);
  return {
    moments: [
      moment([{ number: a }, 'red, plus', { number: b }, 'blue, make', { number: total }, '.'], `${a} + ${b} = ${total}`, set(first, [...ids(`${p}a`, a), ...ids(`${p}b`, b), `${p}e0`, `${p}e1`, `${p}e2`], { lit: true })),
      moment(['Now swap the two groups.'], 'Swap them.', calm(swapped)),
      moment(['The blue come first now:', { number: b }, ', plus', { number: a }, '. Still', { number: total }, '.'], `${b} + ${a} = ${total}`, set(calm(swapped), [...ids(`${p}a`, a), ...ids(`${p}b`, b), `${p}e4`, `${p}e5`, `${p}e6`], { lit: true })),
      moment([{ number: a }, ', plus', { number: b }, ', equals', { number: b }, ', plus', { number: a }, '.'], `${a} + ${b} = ${b} + ${a}`, end),
    ],
    end,
  };
}

function turnaroundWhy(q: Question): Moment[] {
  const a = num(q.facts, 'a');
  const b = num(q.facts, 'b');
  const swap = swapMoments('w', a, b);
  const ending: Moment = q.facts.ask === 'same'
    ? moment(['So the one that is the same is', ...rightOption(q).say, '.'], `${a} + ${b} is the same as ${b} + ${a}.`, swap.end)
    : moment(['So the missing number is', { number: a }, '.'], `The missing number is ${a}.`, swap.end);
  return [...swap.moments, ending];
}

function turnaroundLesson(): Lesson {
  const start = pairScene('x', 3, 5, false);
  const counted = countAlong(start, [...ids('xa', 3), ...ids('xb', 5)]);
  const swap = swapMoments('x', 3, 5);
  const swapped = swap.moments[1]?.scene ?? start;
  const recount = countAlong(swapped, [...ids('xb', 5), ...ids('xa', 3)]);
  const first = turnQuestion('M-1-B11', 1, (f) => num(f, 'a') + num(f, 'b') <= 8 && num(f, 'a') >= 2);
  const second = turnQuestion('M-1-B11', 2, (f) => num(f, 'a') + num(f, 'b') <= 12);
  return {
    parts: [
      show(moment(['Today we learn that we can add in any order.'], 'We can add in any order.', start)),
      show(moment(['Here are three red counters, and five blue ones.'], '3 red and 5 blue', set(start, [...ids('xa', 3), ...ids('xb', 5)], { lit: true }))),
      show(moment(['Let us count them all.'], 'Count them all.', calm(start))),
      ...counted.moments.map(show),
      show(swap.moments[0] as Moment),
      show(swap.moments[1] as Moment),
      show(moment(['Count them again, blue first.'], 'Count again, blue first.', calm(swapped))),
      ...recount.moments.map(show),
      show(swap.moments[2] as Moment),
      show(swap.moments[3] as Moment),
      show(moment(['Adding in any order gives the same total.'], 'Any order, same total.', swap.end)),
      turn(first, turnaroundWhy(first)),
      show(moment(['Now find the sum that is the same.'], 'Find the same sum.', calm(swap.end))),
      turn(second, turnaroundWhy(second)),
      show(moment(['Swap the numbers, and the total stays the same.'], 'Swap them: same total.', calm(swap.end))),
    ],
  };
}

// ---- M-1-B12 Subtract by thinking of adding ----

// `part` red counters and `whole − part` white ones, with the minus sentence on top and the adding one below.
function thinkAddMoments(p: string, whole: number, part: number): { moments: Moment[]; end: Scene } {
  const rest = whole - part;
  const dots = Array.from({ length: whole }, (_, i): Piece => ({ id: i < part ? `${p}r${i}` : `${p}w${i - part}`, look: art(i < part ? RED : WHITE), x: 2.5 + (i % 5), y: 1.8 + Math.floor(i / 5) }));
  const minus = sentence(`${p}m`, [whole, '-', part, '=', 'blank'], 2.5, 0.4);
  const plus = hidden(sentence(`${p}q`, [part, '+', 'blank', '=', whole], 2.5, 4.4));
  const start = scene([...minus, ...dots, ...plus]);
  const think = set(showing(start, ids(`${p}q`, 5)), [...ids(`${p}q`, 5), ...ids(`${p}r`, part)], { lit: true });
  const counted = countAlong(set(calm(think), ids(`${p}r`, part), { lit: true }), ids(`${p}w`, rest), part);
  const plusDone = fillBox(counted.end, `${p}q2`, rest);
  const end = fillBox(calm(plusDone), `${p}m4`, rest);
  return {
    moments: [
      moment([{ number: whole }, 'minus', { number: part }, '. What is left?'], `${whole} − ${part} = ?`, set(start, ids(`${p}m`, 5), { lit: true })),
      moment(['Think:', { number: part }, ', plus what, makes', { number: whole }, '?'], `${part} + ? = ${whole}`, think),
      moment(['Start at', { number: part }, ', and count on to', { number: whole }, '.'], `Start at ${part}. Count on to ${whole}.`, set(calm(think), ids(`${p}r`, part), { lit: true })),
      ...counted.moments,
      moment(['We counted on', { number: rest }, '. So', { number: part }, ', plus', { number: rest }, ', is', { number: whole }, '.'], `${part} + ${rest} = ${whole}`, plusDone),
      moment(['That means', { number: whole }, ', minus', { number: part }, ', is', { number: rest }, '.'], `${whole} − ${part} = ${rest}`, end),
    ],
    end,
  };
}

const thinkAddWhy = (q: Question): Moment[] => thinkAddMoments('w', num(q.facts, 'a'), num(q.facts, 'b')).moments;

function thinkAddLesson(): Lesson {
  const opening = thinkAddMoments('x', 9, 4);
  const first = turnQuestion('M-1-B12', 1, (f) => num(f, 'a') <= 8 && num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') <= 4);
  const second = turnQuestion('M-1-B12', 1, (f) => num(f, 'a') >= 9 && num(f, 'a') <= 10 && num(f, 'b') >= 3 && num(f, 'a') - num(f, 'b') >= 3);
  const startScene = opening.moments[0]?.scene ?? opening.end;
  return {
    parts: [
      show(moment(['We can solve a take away, by thinking of adding.'], 'Minus? Think plus.', calm(startScene))),
      ...opening.moments.map(show),
      show(moment(['The part we count on is the answer to the take away.'], 'The part we count on is the answer.', calm(opening.end))),
      turn(first, thinkAddWhy(first)),
      turn(second, thinkAddWhy(second)),
      show(moment(['To take away, think: what do I add to get back to the whole?'], 'Think: what do I add?', calm(opening.end))),
    ],
  };
}

// ---- Number lines: M-1-B13 count on, M-1-B18 count back ----

function hopMoments(p: string, start: number, steps: number, dir: 1 | -1): { moments: Moment[]; end: Scene } {
  const lo = dir > 0 ? Math.max(0, start - 2) : Math.max(0, start - 7);
  const line = Array.from({ length: 10 }, (_, i): Piece => ({ id: `${p}n${lo + i}`, look: numeral(lo + i), x: i, y: 3.6 }));
  const land = start + dir * steps;
  const eq = sentence(`${p}e`, [start, dir > 0 ? '+' : '-', steps, '=', 'blank'], 2.5, 0.6);
  const base = scene([...eq, ...line]);
  const startPiece = line.find((piece) => piece.id === `${p}n${start}`) as Piece;
  let now = pointAt(set(base, [`${p}n${start}`, `${p}e0`], { lit: true }), startPiece);
  const word = dir > 0 ? 'plus' : 'minus';
  const moments: Moment[] = [
    moment([{ number: start }, word, { number: steps }, '. Where do we land?'], `${start} ${dir > 0 ? '+' : '−'} ${steps} = ?`, set(base, ids(`${p}e`, 5), { lit: true })),
    moment(['Put your finger on', { number: start }, '. We do not count it.'], `Start at ${start}. Do not count it.`, now),
    moment([dir > 0 ? 'Now count on' : 'Now count back', { number: steps }, ', one hop for each.'], `${dir > 0 ? 'Count on' : 'Count back'} ${steps}.`, set(now, [`${p}e2`], { lit: true })),
  ];
  for (let hop = 1; hop <= steps; hop += 1) {
    const at = start + dir * hop;
    const piece = line.find((each) => each.id === `${p}n${at}`) as Piece;
    now = pointAt(alter(set(now, [`${p}e2`], { lit: undefined }), (each) => (each.id === `${p}n${at}` ? { ...each, lit: true, badge: String(hop) } : each)), piece);
    moments.push(moment([{ number: at }], String(at), now));
  }
  const end = fillBox(calm(withoutHand(now)), `${p}e4`, land);
  moments.push(
    moment(['We land on', { number: land }, '.'], `We land on ${land}.`, set(withoutHand(now), [`${p}n${land}`], { lit: true })),
    moment(['So', { number: start }, ',', word, { number: steps }, ', is', { number: land }, '.'], `${start} ${dir > 0 ? '+' : '−'} ${steps} = ${land}`, end),
  );
  return { moments, end };
}

const hopWhy = (q: Question, dir: 1 | -1): Moment[] => hopMoments('w', num(q.facts, 'a'), num(q.facts, 'b'), dir).moments;

function countOnLesson(): Lesson {
  const opening = hopMoments('x', 8, 3, 1);
  const startScene = calm(withoutHand(opening.moments[0]?.scene ?? opening.end));
  const first = turnQuestion('M-1-B13', 1, (f) => num(f, 'b') === 2);
  const second = turnQuestion('M-1-B13', 2, (f) => num(f, 'b') === 3 && num(f, 'a') >= 11);
  return {
    parts: [
      show(moment(['To add a small number, start at the big number, and count on.'], 'Start big. Count on.', startScene)),
      ...opening.moments.map(show),
      show(moment(['The start is where we stand. We count only the hops.'], 'Count the hops, not the start.', calm(opening.end))),
      turn(first, hopWhy(first, 1)),
      show(moment(['It works with bigger numbers too.'], 'Bigger numbers work the same way.', calm(opening.end))),
      turn(second, hopWhy(second, 1)),
      show(moment(['Start at the big number, and count on one number for each.'], 'Start big, count on.', calm(opening.end))),
    ],
  };
}

function countBackLesson(): Lesson {
  const opening = hopMoments('x', 9, 3, -1);
  const startScene = calm(withoutHand(opening.moments[0]?.scene ?? opening.end));
  const first = turnQuestion('M-1-B18', 1, (f) => num(f, 'b') === 2);
  const second = turnQuestion('M-1-B18', 2, (f) => num(f, 'b') === 3 && num(f, 'a') >= 12);
  return {
    parts: [
      show(moment(['To take away a small number, start at the big number, and count back.'], 'Start big. Count back.', startScene)),
      ...opening.moments.map(show),
      show(moment(['The start is where we stand. We count only the hops back.'], 'Count the hops, not the start.', calm(opening.end))),
      turn(first, hopWhy(first, -1)),
      show(moment(['It works with bigger numbers too.'], 'Bigger numbers work the same way.', calm(opening.end))),
      turn(second, hopWhy(second, -1)),
      show(moment(['Start at the big number, and count back one number for each.'], 'Start big, count back.', calm(opening.end))),
    ],
  };
}

// ---- M-1-B14 Fact families ----

const shownExpr = (expr: string): string => expr.replace(/ - /g, ' − ');
function sayExpr(expr: string): Say {
  return expr.split(' ').map((token) => (/^\d+$/.test(token) ? { number: Number(token) } : token === '+' ? 'plus' : token === '=' ? 'equals' : 'minus'));
}
const familyOf = (a: number, b: number): string[] => [`${a} + ${b} = ${a + b}`, `${b} + ${a} = ${a + b}`, `${a + b} - ${a} = ${b}`, `${a + b} - ${b} = ${a}`];

// The three numbers on top, red and blue counters (when they fit), and the four facts as cards, hidden at first.
function familyScene(p: string, a: number, b: number, counters: boolean): Scene {
  const c = a + b;
  const numbers = sentence(`${p}k`, [a, ',', b, ',', c], 3, 0.3, 0.9);
  const dots = counters ? Array.from({ length: c }, (_, i): Piece => ({ id: i < a ? `${p}r${i}` : `${p}b${i - a}`, look: art(i < a ? RED : BLUE), x: 0.5 + i * 0.9, y: 2.1, w: 0.9, h: 0.9 })) : [];
  const spots = [
    [0.4, 3.9],
    [5.2, 3.9],
    [0.4, 4.9],
    [5.2, 4.9],
  ] as const;
  const cards = familyOf(a, b).map((fact, i): Piece => ({ id: `${p}f${i}`, look: text(shownExpr(fact)), x: spots[i]?.[0] ?? 0, y: spots[i]?.[1] ?? 0, w: 4.4, h: 0.9, gone: true }));
  return scene([...numbers, ...dots, ...cards]);
}

function familyLesson(): Lesson {
  const [a, b, c] = [3, 5, 8];
  const base = familyScene('x', a, b, true);
  const red = ids('xr', a);
  const blue = ids('xb', b);
  const card = (n: number): string => `xf${n}`;
  const s1 = set(showing(base, [card(0)]), [card(0), ...red, ...blue], { lit: true });
  const s2 = set(calm(showing(s1, [card(1)])), [card(1), ...blue, ...red], { lit: true });
  const s3 = set(set(calm(showing(s2, [card(2)])), red, { crossed: true }), [card(2), ...blue], { lit: true });
  const s4 = set(set(set(calm(showing(s3, [card(3)])), red, { crossed: false, lit: true }), blue, { crossed: true }), [card(3)], { lit: true });
  const all = set(set(calm(s4), blue, { crossed: false }), ids('xf', 4), { lit: true });
  const first = turnQuestion('M-1-B14', 1, (f) => Array.isArray(f.numbers) && (f.numbers[2] as number) <= 10);
  const second = turnQuestion('M-1-B14', 2, (f) => Array.isArray(f.numbers) && (f.numbers[2] as number) <= 14);
  return {
    parts: [
      show(moment(['Three numbers that go together make a fact family.'], 'A fact family: 3, 5, 8', set(base, ids('xk', 5), { lit: true }))),
      show(moment(['Here are three red, and five blue. That is eight in all.'], '3 red and 5 blue: 8 in all', set(calm(base), [...red, ...blue], { lit: true }))),
      show(moment([{ number: a }, ', plus', { number: b }, ', is', { number: c }, '.'], '3 + 5 = 8', s1)),
      show(moment(['Turn it around:', { number: b }, ', plus', { number: a }, ', is', { number: c }, '.'], '5 + 3 = 8', s2)),
      show(moment(['Take away the red ones.', { number: c }, ', minus', { number: a }, ', is', { number: b }, '.'], '8 − 3 = 5', s3)),
      show(moment(['Take away the blue ones.', { number: c }, ', minus', { number: b }, ', is', { number: a }, '.'], '8 − 5 = 3', s4)),
      show(moment(['That is the whole family: four facts, all with the same three numbers.'], 'Four facts, the same three numbers.', all)),
      show(moment(['The biggest number is the whole. It comes last when we add, and first when we take away.'], 'The whole: last in adding, first in taking away.', set(calm(all), ['xk4', ...ids('xf', 4)], { lit: true }))),
      turn(first, familyWhy(first)),
      show(moment(['A fact with a different number, or a wrong total, is not in the family.'], 'A different number? Not in the family.', calm(all))),
      turn(second, familyWhy(second)),
      show(moment(['Two parts and a whole make two adding facts, and two take away facts.'], 'Two adding facts, two take away facts.', all)),
    ],
  };
}

function familyWhy(q: Question): Moment[] {
  const numbers = q.facts.numbers as number[];
  const [a = 0, b = 0, c = 0] = numbers;
  const base = familyScene('w', a, b, false);
  const facts = familyOf(a, b);
  const right = rightOption(q);
  const moments: Moment[] = [moment(['The family of', { number: a }, ',', { number: b }, ', and', { number: c }, '.'], `The family of ${a}, ${b} and ${c}`, set(base, ids('wk', 5), { lit: true }))];
  let now = calm(base);
  facts.forEach((fact, i) => {
    now = set(calm(showing(now, [`wf${i}`])), [`wf${i}`], { lit: true });
    moments.push(moment(sayExpr(fact), shownExpr(fact), now));
  });
  const all = calm(now);
  if (q.facts.ask === 'in') {
    const at = facts.findIndex((fact) => shownExpr(fact) === right.shown);
    moments.push(moment(['So the fact in the family is', ...right.say, '.'], `${right.shown} is in the family.`, at >= 0 ? set(all, [`wf${at}`], { lit: true }) : all));
  } else {
    const odd = add(all, [{ id: 'wodd', look: text(right.shown), x: 2.8, y: 2.1, w: 4.4, h: 0.9, crossed: true, lit: true }]);
    moments.push(moment(['This one is not one of the four. So the answer is', ...right.say, '.'], `${right.shown} is not in the family.`, odd));
  }
  return moments;
}

// ---- M-1-B15 Stories with three numbers ----

// Three groups in a row with plus signs, sized to fit; then the first two join, then the third.
function threeMoments(p: string, counts: readonly [number, number, number], emojis: readonly [string, string, string], things: string): { moments: Moment[]; end: Scene } {
  const size = 0.8;
  const [a, b, c] = counts;
  const pieces: Piece[] = [];
  let x = 0.2;
  counts.forEach((count, g) => {
    for (let i = 0; i < count; i += 1) {
      pieces.push({ id: `${p}g${g}_${i}`, look: art(emojis[g] as string), x, y: 2.2, w: size, h: size });
      x += size;
    }
    if (g < 2) {
      pieces.push({ id: `${p}plus${g}`, look: text('+'), x, y: 2.2, w: size, h: size });
      x += size;
    }
  });
  const groupIds = (g: number): string[] => Array.from({ length: counts[g] as number }, (_, i) => `${p}g${g}_${i}`);
  const eq = sentence(`${p}e`, [a, '+', b, '+', c, '=', 'blank'], 1.5, 0.4);
  const apart = scene([...pieces, ...eq]);
  // Joined: groups with index below `upTo` close up from the left, with no plus between them.
  const join = (from: Scene, upTo: number): Scene => {
    let at = 0.6;
    const placed = new Map<string, number>();
    for (let g = 0; g < upTo; g += 1) {
      for (const id of groupIds(g)) {
        placed.set(id, at);
        at += 0.9;
      }
    }
    return alter(from, (piece) => {
      const nx = placed.get(piece.id);
      if (nx !== undefined) return { ...piece, x: nx, w: 0.9, h: 0.9 };
      if (piece.id === `${p}plus0` || (upTo === 3 && piece.id === `${p}plus1`)) return { ...piece, gone: true };
      return piece;
    });
  };
  const two = join(calm(apart), 2);
  const firstSum = a + b;
  const counted = countAlong(two, [...groupIds(0), ...groupIds(1)]);
  const three = join(set(calm(counted.end), [...groupIds(0), ...groupIds(1)], { lit: true }), 3);
  const on = countAlong(set(three, [...groupIds(0), ...groupIds(1)], { lit: true }), groupIds(2), firstSum);
  const total = firstSum + c;
  const end = fillBox(calm(set(on.end, [...groupIds(0), ...groupIds(1), ...groupIds(2)], { lit: true })), `${p}e6`, total);
  return {
    moments: [
      moment(['Here are', { number: a }, ', then', { number: b }, ', then', { number: c }, '.'], `${a}, ${b} and ${c}`, set(apart, ids(`${p}e`, 5), { lit: true })),
      moment(['Add the first two numbers. Push them together.'], `First add ${a} + ${b}.`, set(two, [`${p}e0`, `${p}e1`, `${p}e2`], { lit: true })),
      moment([{ number: a }, ', plus', { number: b }, ', is', { number: firstSum }, '.'], `${a} + ${b} = ${firstSum}`, set(withoutHand(counted.end), [...groupIds(0), ...groupIds(1)], { lit: true })),
      moment(['Now add the third number. Count on from', { number: firstSum }, '.'], `Now add ${c}. Count on from ${firstSum}.`, set(three, [`${p}e4`], { lit: true })),
      ...on.moments,
      moment([{ number: firstSum }, ', plus', { number: c }, ', is', { number: total }, `. There are`, { number: total }, `${things} in all.`], `${firstSum} + ${c} = ${total}`, end),
    ],
    end,
  };
}

function threeWhy(q: Question): Moment[] {
  const story = THREE_STORIES.find((each) => each.id === str(q.facts, 'story'));
  if (!story) throw new Error('No three-number story');
  return threeMoments('w', [num(q.facts, 'a'), num(q.facts, 'b'), num(q.facts, 'c')], story.emoji, story.things).moments;
}

function threeLesson(): Lesson {
  const opening = threeMoments('x', [3, 4, 2], ['🐝', '🐞', '🦋'], 'bugs');
  const startScene = calm(opening.moments[0]?.scene ?? opening.end);
  const first = turnQuestion('M-1-B15', 1);
  const second = turnQuestion('M-1-B15', 1, (f) => f.story !== first.facts.story);
  return {
    parts: [
      show(moment(['Some stories have three numbers to add.'], 'Three numbers to add', startScene)),
      show(moment(['In a garden there are three bees, four ladybugs, and two butterflies. How many bugs in all?'], '3 bees, 4 ladybugs, 2 butterflies', set(startScene, ids('xg0_', 3).concat(ids('xg1_', 4), ids('xg2_', 2)), { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['Add two numbers first, then add the third to that.'], 'Two first, then the third.', calm(opening.end))),
      turn(first, threeWhy(first)),
      turn(second, threeWhy(second)),
      show(moment(['Three numbers? Add two, then add the third.'], 'Add two, then add the third.', calm(opening.end))),
    ],
  };
}

// ---- M-1-B16 Stories with a missing part ----

// Some came: `known` things, and spaces up to `total` that fill as we count up.
function cameMoments(p: string, known: number, total: number, emoji: string, things: string, came_ = 'came'): { moments: Moment[]; end: Scene } {
  const came = total - known;
  const have = group(`${p}h`, art(emoji), known, 0.5, 2.2, 10, 0.9);
  const spaces = Array.from({ length: came }, (_, i): Piece => ({ id: `${p}c${i}`, look: { kind: 'box' }, x: 0.5 + (known + i) * 0.9, y: 2.2, w: 0.9, h: 0.9 }));
  const eq = sentence(`${p}e`, [known, '+', 'blank', '=', total], 2.5, 0.4);
  const start = scene([...have, ...hidden(spaces), ...eq]);
  const withSpaces = showing(start, ids(`${p}c`, came));
  const counted = countAlong(set(withSpaces, ids(`${p}h`, known), { lit: true }), ids(`${p}c`, came), known);
  // Each space becomes a thing as it is counted.
  const filling = counted.moments.map((each, i) => ({ ...each, scene: alter(each.scene, (piece) => (ids(`${p}c`, i + 1).includes(piece.id) ? { ...piece, look: art(emoji) } : piece)) }));
  const full = alter(counted.end, (piece) => (piece.id.startsWith(`${p}c`) ? { ...piece, look: art(emoji) } : piece));
  const end = fillBox(calm(set(full, ids(`${p}c`, came), { lit: true })), `${p}e2`, came);
  return {
    moments: [
      moment(['We start with', { number: known }, `${things}, and end with`, { number: total }, '.'], `${known} + ? = ${total}`, set(start, ids(`${p}e`, 5), { lit: true })),
      moment(['Count up from', { number: known }, 'to', { number: total }, '.'], `Count up from ${known} to ${total}.`, set(withSpaces, ids(`${p}h`, known), { lit: true })),
      ...filling,
      moment(came_ ? ['We counted up', { number: came }, '. So', { number: came }, `${things} ${came_}.`] : ['We counted up', { number: came }, '. So the hidden number is', { number: came }, '.'], came_ ? `${came} ${came_}.` : `${came} more ${things}`, end),
    ],
    end,
  };
}

// Some went: `total` things; the ones still here stay lit, the others are crossed and counted.
function wentMoments(p: string, total: number, left: number, emoji: string, things: string, went_ = 'went'): { moments: Moment[]; end: Scene } {
  const went = total - left;
  const all = group(`${p}t`, art(emoji), total, 0.5, 2.2, 10, 0.9);
  const eq = sentence(`${p}e`, [total, '-', left, '=', 'blank'], 2.5, 0.4);
  const start = scene([...all, ...eq]);
  const stay = ids(`${p}t`, left);
  const gone = ids(`${p}t`, went, left);
  const marked = set(set(start, stay, { lit: true }), gone, { crossed: true });
  const counted = countAlong(set(calm(marked), gone, { crossed: true }), gone);
  const end = fillBox(calm(counted.end), `${p}e4`, went);
  return {
    moments: [
      moment(['There were', { number: total }, `${things}. Now`, { number: left }, 'are left.'], `${total} at first, ${left} left`, set(start, ids(`${p}t`, total), { lit: true })),
      moment(['These', { number: left }, 'stayed. The rest went away.'], `${left} stayed.`, marked),
      moment(['Count the ones that went.'], 'Count the ones that went.', calm(marked)),
      ...counted.moments,
      moment([{ number: total }, ', minus', { number: left }, ', is', { number: went }, ...(went_ ? ['. So', { number: went }, `${things} ${went_}.`] : ['. So the hidden number is', { number: went }, '.'])], `${total} − ${left} = ${went}`, end),
    ],
    end,
  };
}

function partWhy(q: Question): Moment[] {
  const story = PART_STORIES.find((each) => each.id === str(q.facts, 'story'));
  if (!story) throw new Error('No missing-part story');
  if (story.kind === 'taken') return wentMoments('w', num(q.facts, 'a'), num(q.facts, 'b'), story.emoji, story.things, '').moments;
  return cameMoments('w', num(q.facts, 'a'), num(q.facts, 'total'), story.emoji, story.things, '').moments;
}

function partLesson(): Lesson {
  const came = cameMoments('x', 4, 9, '🐦', 'birds');
  const went = wentMoments('y', 8, 5, '🐸', 'frogs');
  const cameStart = calm(came.moments[0]?.scene ?? came.end);
  const wentStart = calm(went.moments[0]?.scene ?? went.end);
  const first = turnQuestion('M-1-B16', 1, (f) => num(f, 'total') <= 9 && num(f, 'b') >= 2 && num(f, 'b') <= 5);
  const second = turnQuestion('M-1-B16', 2, (f) => num(f, 'a') <= 10 && num(f, 'a') - num(f, 'b') >= 2 && num(f, 'a') - num(f, 'b') <= 5);
  return {
    parts: [
      show(moment(['Some stories hide a number in the middle. Let us find it.'], 'Find the hidden number.', cameStart)),
      show(moment(['Four birds sit in a tree. Some more come. Now there are nine. How many came?'], '4 birds, some more come, now 9', set(cameStart, ids('xh', 4), { lit: true }))),
      ...came.moments.map(show),
      turn(first, partWhy(first)),
      show(moment(['Sometimes things go away instead.'], 'Some go away.', wentStart)),
      show(moment(['Eight frogs sit on a log. Some jump off. Now five are left. How many jumped?'], '8 frogs, some jump, 5 left', set(wentStart, ids('yt', 8), { lit: true }))),
      ...went.moments.map(show),
      turn(second, partWhy(second)),
      show(moment(['Find what is missing: count up for more, or take away for less. If the start is hidden, put the two parts together.'], 'Count up, or take away.', calm(went.end))),
    ],
  };
}

// ---- M-1-B17 Make both sides equal ----

type Side = Part[];

// The sentence on top; under each side, its counters. The side with the box gets white counters that appear as we count up.
function balanceMoments(p: string, left: Side, right: Side): { moments: Moment[]; end: Scene } {
  const boxOnLeft = left.includes('blank');
  const knownSide = boxOnLeft ? right : left;
  const otherSide = boxOnLeft ? left : right;
  const [k1, , k2] = knownSide as [number, string, number];
  const value = k1 + k2;
  const have = otherSide.find((part) => typeof part === 'number') as number;
  const missing = value - have;
  const size = 0.8;
  const spot = (x0: number, i: number): { x: number; y: number; w: number; h: number } => ({ x: x0 + (i % 5) * size, y: 2.1 + Math.floor(i / 5) * size, w: size, h: size });
  const knownX = boxOnLeft ? 5.6 : 0.4;
  const otherX = boxOnLeft ? 0.4 : 5.6;
  const known = Array.from({ length: value }, (_, i): Piece => ({ id: `${p}k${i}`, look: art(i < k1 ? RED : BLUE), ...spot(knownX, i) }));
  const other = Array.from({ length: value }, (_, i): Piece => ({ id: `${p}o${i}`, look: art(i < have ? YELLOW : WHITE), ...spot(otherX, i), gone: i >= have }));
  const words = sentence(`${p}e`, [...left, '=', ...right], 1.5, 0.3);
  const start = scene([...words, { id: `${p}eq`, look: text('='), x: 4.5, y: 2.3 }, ...known, ...other]);
  const boxId = `${p}e${[...left, '=', ...right].indexOf('blank')}`;
  const knownWords = ids(`${p}e`, 3, boxOnLeft ? 4 : 0);
  const otherWords = ids(`${p}e`, 3, boxOnLeft ? 0 : 4);
  const added = ids(`${p}o`, missing, have);
  const counted = countAlong(set(showing(start, added), ids(`${p}o`, have), { lit: true }), added, have);
  const appearing = counted.moments.map((each, i) => ({ ...each, scene: set(each.scene, ids(`${p}o`, missing - i - 1, have + i + 1), { gone: true }) }));
  const end = fillBox(calm(set(counted.end, [...ids(`${p}k`, value), ...ids(`${p}o`, value)], { lit: true })), boxId, missing);
  return {
    moments: [
      moment(['Work out the side we know first.', { number: k1 }, ', plus', { number: k2 }, ', is', { number: value }, '.'], `${k1} + ${k2} = ${value}`, set(start, [...knownWords, ...ids(`${p}k`, value)], { lit: true })),
      moment(['The other side has', { number: have }, ', and a box. It must make', { number: value }, 'too.'], `${have} + ? must make ${value}.`, set(start, [...otherWords, ...ids(`${p}o`, have)], { lit: true })),
      moment(['Count up from', { number: have }, 'to', { number: value }, '.'], `Count up from ${have} to ${value}.`, set(calm(start), ids(`${p}o`, have), { lit: true })),
      ...appearing,
      moment(['We added', { number: missing }, '. Both sides make', { number: value }, '. The missing number is', { number: missing }, '.'], `The missing number is ${missing}.`, end),
    ],
    end,
  };
}

const balanceWhy = (q: Question): Moment[] => balanceMoments('w', q.facts.left as Side, q.facts.right as Side).moments;

function balanceLesson(): Lesson {
  const opening = balanceMoments('x', [4, '+', 4], [6, '+', 'blank']);
  const startScene = calm(opening.moments[0]?.scene ?? opening.end);
  const plusOnly = (f: Record<string, unknown>): boolean => (f.left as Side)[1] === '+' && (f.right as Side)[1] === '+';
  const value = (f: Record<string, unknown>): number => {
    const known = (f.left as Side).includes('blank') ? (f.right as Side) : (f.left as Side);
    return (known[0] as number) + (known[2] as number);
  };
  const first = turnQuestion('M-1-B17', 1, (f) => plusOnly(f) && value(f) <= 9);
  const second = turnQuestion('M-1-B17', 2, (f) => plusOnly(f) && value(f) <= 10 && (f.left as Side).includes('blank'));
  return {
    parts: [
      show(moment(['The equal sign means, both sides make the same number.'], '= means the same as.', set(startScene, ['xe3', 'xeq'], { lit: true }))),
      show(moment(['Four plus four, equals six plus what?'], '4 + 4 = 6 + ?', set(startScene, ids('xe', 7), { lit: true }))),
      ...opening.moments.map(show),
      show(moment(['Four plus four is eight, and six plus two is eight. The sides match.'], '4 + 4 = 6 + 2', calm(opening.end))),
      turn(first, balanceWhy(first)),
      show(moment(['The box can be on either side. Start with the side you know.'], 'Start with the side you know.', calm(opening.end))),
      turn(second, balanceWhy(second)),
      show(moment(['Work out the side you know, then make the other side match.'], 'Make both sides match.', calm(opening.end))),
    ],
  };
}

// ---- M-1-B19 Go down to ten to subtract ----

function downMoments(p: string, a: number, b: number): { moments: Moment[]; end: Scene } {
  const ones = a - 10;
  const rest = b - ones;
  const size = 0.9;
  const frame = (x0: number, prefix: string): Piece[] => Array.from({ length: 10 }, (_, i) => ({ id: `${prefix}${i}`, look: { kind: 'cell' as const }, x: x0 + (i % 5) * size, y: 1.6 + Math.floor(i / 5) * size, w: size, h: size }));
  const tens = group(`${p}t`, art(RED), 10, 0.3, 1.6, 5, size);
  const extra = group(`${p}u`, art(RED), ones, 5.2, 1.6, 5, size);
  const eq = sentence(`${p}e`, [a, '-', b, '=', 'blank'], 2.5, 0.2, 0.9);
  const card: Piece = { id: `${p}card`, look: text(`10 − ${rest} = ${10 - rest}`), x: 2.8, y: 4.3, w: 4.4, h: 0.9, gone: true };
  const start = scene([...frame(0.3, `${p}a`), ...frame(5.2, `${p}b`), ...tens, ...extra, ...eq, card]);
  const extraIds = ids(`${p}u`, ones);
  const taken = ids(`${p}t`, rest, 10 - rest);
  const toTen = set(calm(start), extraIds, { crossed: true, lit: true });
  const more = set(set(calm(toTen), extraIds, { crossed: true }), taken, { crossed: true, lit: true });
  const shown = set(calm(showing(more, [`${p}card`])), [`${p}card`], { lit: true });
  const end = fillBox(calm(shown), `${p}e4`, a - b);
  return {
    moments: [
      moment([{ number: a }, 'minus', { number: b }, '.', { number: a }, 'is ten, and', { number: ones }, 'more.'], `${a} = 10 and ${ones}`, set(start, [...ids(`${p}t`, 10), ...extraIds], { lit: true })),
      moment(['First take away', { number: ones }, ', to get down to ten.'], `${a} − ${ones} = 10`, toTen),
      moment([{ number: b }, 'is', { number: ones }, ', and', { number: rest }, '. So take away', { number: rest }, 'more, from the ten.'], `Take away ${rest} more.`, more),
      moment(['That is the same as ten minus', { number: rest }, ', which is', { number: 10 - rest }, '.'], `10 − ${rest} = ${10 - rest}`, shown),
      moment(['So', { number: a }, ', minus', { number: b }, ', is', { number: a - b }, '.'], `${a} − ${b} = ${a - b}`, end),
    ],
    end,
  };
}

function downWhy(q: Question): Moment[] {
  const a = num(q.facts, 'a');
  const b = num(q.facts, 'b');
  const shown = downMoments('w', a, b);
  const right = rightOption(q);
  return [...shown.moments.slice(0, 4), moment(['So the one that is the same is', ...right.say, '.'], `${a} − ${b} is the same as ${right.shown}.`, shown.moments[3]?.scene ?? shown.end)];
}

function downLesson(): Lesson {
  const opening = downMoments('x', 13, 5);
  const startScene = calm(opening.moments[0]?.scene ?? opening.end);
  const first = turnQuestion('M-1-B19', 1, (f) => num(f, 'a') - 10 >= 2);
  const second = turnQuestion('M-1-B19', 2, (f) => num(f, 'a') >= 15 && num(f, 'b') - (num(f, 'a') - 10) >= 2);
  return {
    parts: [
      show(moment(['To take away past ten, we stop at ten on the way.'], 'Stop at 10 on the way.', startScene)),
      ...opening.moments.map(show),
      show(moment(['Taking away from ten is easy. We know the pairs that make ten.'], 'Taking away from 10 is easy.', calm(opening.end))),
      turn(first, downWhy(first)),
      turn(second, downWhy(second)),
      show(moment(['Go down to ten first, then take away the rest.'], 'Down to 10, then the rest.', calm(opening.end))),
    ],
  };
}

// ---- M-1-C3 Picture graphs ----

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

const rowIds = (p: string, r: number, n: number): string[] => Array.from({ length: n }, (_, i) => `${p}r${r}_${i}`);

function graphMoments(p: string, things: readonly string[], values: readonly number[], index: number): Moment[] {
  const base = graphScene(p, things, values);
  const name = countable(things[index] as string).many;
  const value = values[index] as number;
  const found = set(base, [`${p}l${index}`], { lit: true });
  const counted = countAlong(found, rowIds(p, index, value));
  return [
    moment([`How many chose ${name}? Find the ${name} row.`], `Find the ${name} row.`, found),
    moment(['Count the pictures in that row.'], 'Count its pictures.', set(found, rowIds(p, index, value), { dim: false })),
    ...counted.moments.map((each) => ({ ...each, scene: set(each.scene, [`${p}l${index}`], { lit: true }) })),
    moment([{ number: value }, `chose ${name}.`], `${value} chose ${name}.`, set(withoutHand(counted.end), [`${p}l${index}`, ...rowIds(p, index, value)], { lit: true })),
  ];
}

// Which row has the most, or the fewest: look for the longest or the shortest row.
function mostMoments(p: string, things: readonly string[], values: readonly number[], ask: 'most' | 'least'): Moment[] {
  const base = graphScene(p, things, values);
  const want = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const index = values.indexOf(want);
  const name = countable(things[index] as string).many;
  const row = [`${p}l${index}`, ...rowIds(p, index, want)];
  return [
    moment([ask === 'most' ? 'Which one has the most? Look for the longest row.' : 'Which one has the fewest? Look for the shortest row.'], ask === 'most' ? 'Find the longest row.' : 'Find the shortest row.', base),
    moment([`The ${name} row is the ${ask === 'most' ? 'longest' : 'shortest'}. It has`, { number: want }, '.'], `${name}: ${want}`, set(base, row, { lit: true })),
    moment([`So ${name} have the ${ask === 'most' ? 'most' : 'fewest'}.`], `${name.charAt(0).toUpperCase()}${name.slice(1)} have the ${ask === 'most' ? 'most' : 'fewest'}.`, set(base, row, { lit: true, badge: undefined })),
  ];
}

const graphWhy = (q: Question): Moment[] =>
  q.facts.ask === 'most' || q.facts.ask === 'least' ? mostMoments('w', q.facts.things as string[], q.facts.values as number[], q.facts.ask) : graphMoments('w', q.facts.things as string[], q.facts.values as number[], num(q.facts, 'index'));

function graphLesson(): Lesson {
  const things = ['apple', 'ball', 'flower'];
  const values = [4, 2, 5];
  const base = graphScene('x', things, values);
  const opening = graphMoments('x', things, values, 0);
  const first = turnQuestion('M-1-C3', 1, (f) => (f.values as number[])[num(f, 'index')] as number >= 3);
  const second = turnQuestion('M-1-C3', 2, (f) => new Set(f.values as number[]).size === 3 && Math.max(...(f.values as number[])) <= 6);
  const extra = set(set(calm(base), [...rowIds('x', 0, 2), ...rowIds('x', 1, 2)], { dim: true }), ['xr0_2', 'xr0_3'], { lit: true });
  return {
    parts: [
      show(moment(['A picture graph shows how many. Each picture stands for one.'], 'Each picture stands for 1.', base)),
      show(moment(['Each row is for one thing. Its name is at the start.'], 'One row for each thing.', set(base, ['xl0', 'xl1', 'xl2'], { lit: true }))),
      ...opening.map(show),
      show(moment(['The longest row has the most. Flowers have the most.'], 'The longest row has the most.', set(calm(base), ['xl2', ...rowIds('x', 2, 5)], { lit: true }))),
      show(moment(['The shortest row has the fewest. Balls have the fewest.'], 'The shortest row has the fewest.', set(calm(base), ['xl1', ...rowIds('x', 1, 2)], { lit: true }))),
      turn(first, graphWhy(first)),
      turn(second, graphWhy(second)),
      show(moment(['How many more apples than balls? Line the rows up, and count the extra apples. Two more.'], '4 apples, 2 balls: 2 more apples', extra)),
      show(moment(['Find the row, then count its pictures.'], 'Find the row. Count it.', calm(base))),
    ],
  };
}

// ---- M-1-C5 Measure with paper clips ----

const CLIP = '📎';
const OBJECTS: Record<string, string> = { pencil: '✏️', crayon: '🖍️', spoon: '🥄' };

// The thing on the left; clips in a loose pile, then lined up beside it end to end, then counted.
function clipMoments(p: string, name: string, n: number, gapFirst: boolean): Moment[] {
  const emoji = OBJECTS[name] ?? '✏️';
  const thing: Piece = { id: `${p}obj`, look: art(emoji), x: 0.3, y: 2.2 };
  const pile = Array.from({ length: n }, (_, i): Piece => ({ id: `${p}c${i}`, look: art(CLIP), x: 6 + (i % 3) * 1.1 + (i % 2) * 0.3, y: 0.3 + Math.floor(i / 3) * 0.6, w: 0.8, h: 0.8 }));
  const start = scene([thing, ...pile]);
  const lined = alter(start, (piece) => (piece.id.startsWith(`${p}c`) ? { ...piece, x: 1.3 + Number(piece.id.slice(p.length + 1)) * 0.9, y: 2.3 } : piece));
  const gappy = alter(lined, (piece) => (piece.id.startsWith(`${p}c`) && Number(piece.id.slice(p.length + 1)) >= 1 ? { ...piece, x: piece.x + 0.8 } : piece));
  const counted = countAlong(lined, ids(`${p}c`, n));
  const moments: Moment[] = [moment([`How many paper clips long is the ${name}?`], `How long is the ${name}?`, set(start, [`${p}obj`], { lit: true }))];
  if (gapFirst) moments.push(moment(['If we leave a gap, the count is wrong.'], 'A gap makes it wrong.', set(gappy, [`${p}c0`, `${p}c1`], { crossed: true })));
  moments.push(
    moment(['Line the clips up from the end, with no gaps.'], 'From the end, no gaps.', lined),
    moment(['Now count the clips, one by one.'], 'Count the clips.', set(lined, [`${p}c0`], { lit: true })),
    ...counted.moments,
    moment([`The ${name} is`, { number: n }, 'paper clips long.'], `${n} paper clips long`, set(counted.end, [`${p}obj`, ...ids(`${p}c`, n)], { lit: true })),
  );
  return moments;
}

// Three rows of clips, as the question draws them: the right one starts at the end and has no gaps.
function linedWhy(q: Question): Moment[] {
  if (q.type !== 'choice') throw new Error('M-1-C5 level 2 is a choice question');
  const rows = q.options.map((option, i): Piece => ({ id: `wo${i}`, look: picture(option), x: 1.5, y: 0.3 + i * 1.8, w: 7, h: 1.5 }));
  const base = scene(rows);
  const others = rows.filter((_, i) => i !== q.answerIndex).map((row) => row.id);
  return [
    moment(['The clips must start at the end, and touch, with no gaps.'], 'From the end, no gaps.', base),
    moment(['This row starts at the end, and has no gaps. It is lined up the right way.'], 'Lined up the right way', set(set(base, others, { dim: true }), [`wo${q.answerIndex}`], { lit: true })),
  ];
}

function clipWhy(q: Question): Moment[] {
  if (q.facts.ask === 'lined') return linedWhy(q);
  const name = /long is the (\w+)\?/.exec(q.prompt.text)?.[1] ?? 'pencil';
  return clipMoments('w', name, num(q.facts, 'n'), false);
}

function clipLesson(): Lesson {
  const opening = clipMoments('x', 'pencil', 5, true);
  const startScene = calm(opening[0]?.scene ?? scene([]));
  const first = turnQuestion('M-1-C5', 1, (f) => num(f, 'n') >= 3 && num(f, 'n') <= 5);
  const second = turnQuestion('M-1-C5', 2);
  const last = opening.at(-1)?.scene ?? startScene;
  return {
    parts: [
      show(moment(['We can measure how long something is with paper clips.'], 'Measure with paper clips.', startScene)),
      ...opening.map(show),
      show(moment(['All the clips are the same size, so each one counts as one.'], 'Each clip counts as 1.', calm(last))),
      turn(first, clipWhy(first)),
      show(moment(['Now look for the row that is lined up the right way.'], 'Which row is lined up the right way?', calm(last))),
      turn(second, clipWhy(second)),
      show(moment(['How much longer is one thing than another? Take the small number away from the big number.'], 'How much longer? Big number take away small number.', calm(last))),
      show(moment(['Start at the end, leave no gaps, and count the clips.'], 'Start at the end. No gaps. Count.', calm(last))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-1-B11': turnaroundLesson,
  'M-1-B12': thinkAddLesson,
  'M-1-B13': countOnLesson,
  'M-1-B14': familyLesson,
  'M-1-B15': threeLesson,
  'M-1-B16': partLesson,
  'M-1-B17': balanceLesson,
  'M-1-B18': countBackLesson,
  'M-1-B19': downLesson,
  'M-1-C3': graphLesson,
  'M-1-C5': clipLesson,
};
