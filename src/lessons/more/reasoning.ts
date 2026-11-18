import { ANALOGY_PAIRS } from '../../content/data/analogies';
import type { AnalogyPair } from '../../content/data/analogies';
import { GROUP_WORDS } from '../../content/data/categories';
import type { GroupWord } from '../../content/data/categories';
import { RIDDLES } from '../../content/data/riddles';
import type { Riddle } from '../../content/data/riddles';
import { VERBAL_RELATIONS, WORD_CLASSES } from '../../content/data/verbal';
import type { Question, Say } from '../../engine/types';
import { alter, art, calm, countAlong, ids, moment, num, numeral, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Reasoning lessons that teach (plan section 16): number analogies, number series, number puzzles,
// word analogies, which word does not belong and number grids.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

// The right option's value, as the question's facts list it.
function answerOf(question: Question): unknown {
  const options = question.facts.options;
  if (question.type !== 'choice' || !Array.isArray(options)) throw new Error(`${question.skillId} has no options`);
  return options[question.answerIndex];
}
function answerWord(question: Question): string {
  const value = answerOf(question);
  if (typeof value !== 'string') throw new Error('The answer is not a word');
  return value;
}
function numberRows(facts: Record<string, unknown>, key: string): number[][] {
  const value = facts[key];
  if (!Array.isArray(value) || !value.every((row) => Array.isArray(row) && row.every((each) => typeof each === 'number'))) throw new Error(`facts.${key} is not rows of numbers`);
  return value as number[][];
}
function numbers(facts: Record<string, unknown>, key: string): number[] {
  const value = facts[key];
  if (!Array.isArray(value) || !value.every((each) => typeof each === 'number')) throw new Error(`facts.${key} is not a list of numbers`);
  return value as number[];
}
function words(facts: Record<string, unknown>, key: string): string[] {
  const value = facts[key];
  if (!Array.isArray(value) || !value.every((each) => typeof each === 'string')) throw new Error(`facts.${key} is not a list of words`);
  return value as string[];
}

// Numbers said one after another, with a pause between them.
function listed(values: readonly number[]): Say {
  return values.flatMap((value, i): Say => (i === 0 ? [{ number: value }] : [',', { number: value }]));
}

const BLUE = '🔵';
const RED = '🔴';
const GREEN = '🟢';

// ---- R-A8 Number analogies ----

type PairRule = { kind: 'plus'; n: number } | { kind: 'double' };
const ruled = (rule: PairRule, value: number): number => (rule.kind === 'double' ? value * 2 : value + rule.n);
const added = (rule: PairRule, value: number): number => ruled(rule, value) - value;

// Three pairs across the top (the last one ends in a box), and counters on the table that show each change:
// blue for the number we start with, red for what the rule adds.
function pairScene(p: string, examples: readonly (readonly [number, number])[], base: number): Scene {
  const pairs: [number, number | null][] = [...examples.map(([from, to]): [number, number | null] => [from, to]), [base, null]];
  const top = pairs.flatMap(([from, to], i): Piece[] => {
    const x = 0.2 + i * 3.3;
    return [
      { id: `${p}f${i}`, look: numeral(from), x, y: 0.4, w: 1.1, h: 1.1 },
      { id: `${p}a${i}`, look: text('→'), x: x + 1.1, y: 0.4, w: 0.8, h: 1.1 },
      { id: `${p}t${i}`, look: to === null ? { kind: 'box' } : numeral(to), x: x + 1.9, y: 0.4, w: 1.1, h: 1.1 },
    ];
  });
  const counters = [...ids(`${p}b`, 10).map((id) => ({ id, look: art(BLUE), x: 0.5, y: 2.2, gone: true })), ...ids(`${p}r`, 10).map((id) => ({ id, look: art(RED), x: 0.5, y: 2.2, gone: true }))];
  return scene([...top, ...counters]);
}

// `blue` blue counters, then `red` red ones, in rows of ten on the table.
function showCounters(from: Scene, p: string, blue: number, red: number, redLit = false): Scene {
  return alter(from, (piece) => {
    const isBlue = piece.id.startsWith(`${p}b`);
    const isRed = piece.id.startsWith(`${p}r`);
    if (!isBlue && !isRed) return piece;
    const i = Number(piece.id.slice(p.length + 1));
    const k = isBlue ? i : blue + i;
    const shown = isBlue ? i < blue : i < red;
    return { ...piece, x: 0.5 + (k % 10) * 0.9, y: 2.2 + Math.floor(k / 10), w: 0.85, h: 0.85, gone: !shown, lit: isRed && shown && redLit ? true : undefined };
  });
}

const changeSay = (rule: PairRule, from: number): Say => [{ number: from }, ', and', { number: added(rule, from) }, 'more, make', { number: ruled(rule, from) }, '.'];
const badgeOf = (rule: PairRule): string => (rule.kind === 'double' ? 'double' : `+${rule.n}`);

function pairMoments(p: string, examples: readonly (readonly [number, number])[], base: number, rule: PairRule): Moment[] {
  const [one, two] = examples as [readonly [number, number], readonly [number, number]];
  const start = pairScene(p, examples, base);
  const answer = ruled(rule, base);
  const first = showCounters(set(start, [`${p}f0`, `${p}t0`], { lit: true }), p, one[0], 0);
  const firstChange = set(showCounters(calm(first), p, one[0], added(rule, one[0]), true), [`${p}a0`], { badge: badgeOf(rule) });
  const second = set(showCounters(calm(firstChange), p, two[0], added(rule, two[0]), true), [`${p}f1`, `${p}t1`], { lit: true });
  const secondBadged = alter(second, (piece) => (piece.id === `${p}a1` ? { ...piece, badge: badgeOf(rule) } : piece));
  const last = set(showCounters(calm(secondBadged), p, base, 0), [`${p}f2`, `${p}t2`], { lit: true });
  const solved = alter(showCounters(calm(last), p, base, added(rule, base), true), (piece) => {
    if (piece.id === `${p}t2`) return { ...piece, look: numeral(answer), lit: true };
    if (piece.id === `${p}a2`) return { ...piece, badge: badgeOf(rule) };
    return piece;
  });
  const ruleSay: Say = rule.kind === 'double' ? ['The rule is, double the number.'] : ['The rule is, add', { number: rule.n }, '.'];
  return [
    moment(['Look at the first pair.', { number: one[0] }, 'becomes', { number: one[1] }, '.'], `${one[0]} → ${one[1]}`, first),
    moment(changeSay(rule, one[0]), `${one[0]} + ${added(rule, one[0])} = ${one[1]}`, firstChange),
    moment(ruleSay, rule.kind === 'double' ? 'Rule: double it.' : `Rule: add ${rule.n}.`, set(calm(firstChange), [`${p}a0`], { lit: true })),
    moment(['Check the next pair.', ...changeSay(rule, two[0]), 'It works!'], `${two[0]} + ${added(rule, two[0])} = ${two[1]}`, secondBadged),
    moment(['Now use the rule on', { number: base }, '.'], `Use the rule on ${base}.`, last),
    moment([...changeSay(rule, base), 'The answer is', { number: answer }, '.'], `${base} → ${answer}`, solved),
  ];
}

function pairWhy(question: Question): Moment[] {
  const examples = numberRows(question.facts, 'examples') as [number, number][];
  const base = num(question.facts, 'base');
  const [from, to] = examples[0] as [number, number];
  const rule: PairRule = question.level === 2 ? { kind: 'double' } : { kind: 'plus', n: to - from };
  return pairMoments('w', examples, base, rule);
}

export function numberAnalogyLesson(): Lesson {
  const plus = pairMoments('x', [[2, 5], [4, 7]], 6, { kind: 'plus', n: 3 });
  const double = pairMoments('y', [[3, 6], [5, 10]], 4, { kind: 'double' });
  const first = turnQuestion('R-A8', 1, (f) => {
    const [a = 0, b = 0] = numberRows(f, 'examples')[0] ?? [];
    return b - a <= 3 && num(f, 'base') + b - a <= 12;
  });
  const second = turnQuestion('R-A8', 2, (f) => num(f, 'base') <= 6);
  const plusStart = plus[0]?.scene ?? scene([]);
  const doubleStart = double[0]?.scene ?? scene([]);
  return {
    parts: [
      show(moment(['In each pair, the first number changes by the same secret rule.'], 'Each pair follows one rule.', calm(withoutHand(plusStart)))),
      ...plus.map(show),
      show(moment(['Find a rule that works for every pair. Then use it on the last number.'], 'Find the rule. Use it on the last number.', calm(plus.at(-1)?.scene ?? plusStart))),
      turn(first, pairWhy(first)),
      show(moment(['Some pairs double. Double means the same number again.'], 'Double: the same number again.', calm(doubleStart))),
      ...double.map(show),
      turn(second, pairWhy(second)),
      show(moment(['Find the rule, check it on every pair, and then use it.'], 'Find it, check it, use it.', calm(double.at(-1)?.scene ?? doubleStart))),
    ],
  };
}

// ---- R-A10 Number series ----

const seriesX = (i: number): number => 0.4 + i * 1.95;

// Four numbers in a row and a box for the next, with the jumps written under the gaps.
function seriesScene(p: string, values: readonly number[], step: number): Scene {
  const cells: Piece[] = values.map((value, i) => ({ id: `${p}v${i}`, look: numeral(value), x: seriesX(i), y: 0.6, w: 1.4, h: 1.2 }));
  const box: Piece = { id: `${p}v${values.length}`, look: { kind: 'box' }, x: seriesX(values.length), y: 0.6, w: 1.4, h: 1.2 };
  const jumps: Piece[] = values.map((_, i) => ({ id: `${p}j${i}`, look: text(step > 0 ? `+${step}` : `−${-step}`), x: seriesX(i) + 1.05, y: 2.1, w: 1.2, h: 0.8, gone: true }));
  return scene([...cells, box, ...jumps]);
}

const way = (step: number): Say => [step > 0 ? 'up' : 'down', { number: Math.abs(step) }];

function seriesMoments(p: string, values: readonly number[], step: number): Moment[] {
  const n = values.length;
  const answer = (values[n - 1] as number) + step;
  const start = seriesScene(p, values, step);
  const read = set(start, ids(`${p}v`, n), { lit: true });
  const moments: Moment[] = [moment(['Read the numbers:', ...listed(values), '.'], values.join(', '), read)];
  let now = calm(read);
  for (let i = 0; i < 2; i += 1) {
    const a = values[i] as number;
    const b = values[i + 1] as number;
    now = set(calm(now), [`${p}v${i}`, `${p}v${i + 1}`], { lit: true });
    now = set(now, [`${p}j${i}`], { gone: false, lit: true });
    moments.push(moment(['From', { number: a }, 'to', { number: b }, 'is a jump', ...way(step), '.'], `${a} to ${b}: ${step > 0 ? '+' : '−'}${Math.abs(step)}`, now));
  }
  now = set(calm(now), ids(`${p}j`, n - 1), { gone: false, lit: true });
  moments.push(moment(['Every jump goes', ...way(step), '.'], `Every jump: ${step > 0 ? '+' : '−'}${Math.abs(step)}`, now));
  const last = values[n - 1] as number;
  now = set(set(calm(now), [`${p}v${n - 1}`, `${p}v${n}`], { lit: true }), [`${p}j${n - 1}`], { gone: false, lit: true });
  moments.push(moment(['So from', { number: last }, ', jump', ...way(step), 'again.'], `${last} ${step > 0 ? '+' : '−'} ${Math.abs(step)}`, now));
  const solved = alter(calm(now), (piece) => (piece.id === `${p}v${n}` ? { ...piece, look: numeral(answer), lit: true } : piece));
  moments.push(moment(['The next number is', { number: answer }, '.'], `Next is ${answer}.`, solved));
  return moments;
}

function seriesWhy(question: Question): Moment[] {
  const start = num(question.facts, 'start');
  const step = numbers(question.facts, 'steps')[0] ?? 1;
  const shown = num(question.facts, 'blankIndex');
  return seriesMoments('w', Array.from({ length: shown }, (_, i) => start + i * step), step);
}

export function numberSeriesLesson(): Lesson {
  const up = seriesMoments('x', [2, 4, 6, 8], 2);
  const down = seriesMoments('y', [15, 14, 13, 12], -1);
  const first = turnQuestion('R-A10', 1, (f) => numbers(f, 'steps')[0] === 1);
  const second = turnQuestion('R-A10', 2, (f) => numbers(f, 'steps')[0] === -1);
  const upStart = seriesScene('x', [2, 4, 6, 8], 2);
  const downStart = seriesScene('y', [15, 14, 13, 12], -1);
  return {
    parts: [
      show(moment(['Numbers in a row can follow a pattern of jumps. Let us find the next one.'], 'Find the next number.', set(upStart, ['x4'], { lit: true }))),
      ...up.map(show),
      show(moment(['Find the jump between the numbers. Then make the same jump again.'], 'Find the jump. Jump again.', calm(up.at(-1)?.scene ?? upStart))),
      turn(first, seriesWhy(first)),
      show(moment(['Some rows go down. Each jump makes the number smaller.'], 'Some rows go down.', downStart)),
      ...down.map(show),
      turn(second, seriesWhy(second)),
      show(moment(['Look at the jumps, up or down, and keep the pattern going.'], 'Keep the pattern going.', calm(down.at(-1)?.scene ?? downStart))),
    ],
  };
}

// ---- R-A11 Number puzzles ----

// The left side (a number, a plus and a box), the scale in the middle, the right side, and counters under each.
function balanceScene(p: string, a: number, right: readonly number[]): Scene {
  const total = right.reduce((sum, each) => sum + each, 0);
  const b = total - a;
  const rightPieces: Piece[] =
    right.length === 1
      ? [{ id: `${p}R0`, look: numeral(right[0] as number), x: 7.3, y: 0.5, w: 1.2, h: 1.1 }]
      : [
          { id: `${p}R0`, look: numeral(right[0] as number), x: 6.2, y: 0.5, w: 1.2, h: 1.1 },
          { id: `${p}Rplus`, look: text('+'), x: 7.4, y: 0.5, w: 0.8, h: 1.1 },
          { id: `${p}R1`, look: numeral(right[1] as number), x: 8.2, y: 0.5, w: 1.2, h: 1.1 },
        ];
  const spot = (k: number, left: boolean): { x: number; y: number; w: number; h: number } => ({ x: (left ? 0.2 : 5.6) + (k % 6) * 0.7, y: 2.4 + Math.floor(k / 6) * 0.8, w: 0.65, h: 0.65 });
  return scene([
    { id: `${p}a`, look: numeral(a), x: 0.4, y: 0.5, w: 1.1, h: 1.1 },
    { id: `${p}plus`, look: text('+'), x: 1.5, y: 0.5, w: 0.8, h: 1.1 },
    { id: `${p}box`, look: { kind: 'box' }, x: 2.3, y: 0.5, w: 1.1, h: 1.1 },
    { id: `${p}scale`, look: art('⚖️'), x: 4.2, y: 0.3, w: 1.6, h: 1.6 },
    ...rightPieces,
    ...Array.from({ length: a }, (_, k): Piece => ({ id: `${p}l${k}`, look: art(BLUE), ...spot(k, true), gone: true })),
    ...Array.from({ length: b }, (_, k): Piece => ({ id: `${p}m${k}`, look: art(RED), ...spot(a + k, true), gone: true })),
    ...Array.from({ length: total }, (_, k): Piece => ({ id: `${p}r${k}`, look: art(GREEN), ...spot(k, false), gone: true })),
  ]);
}

function balanceMoments(p: string, a: number, right: readonly number[]): Moment[] {
  const total = right.reduce((sum, each) => sum + each, 0);
  const b = total - a;
  const start = balanceScene(p, a, right);
  const rightIds = right.length === 1 ? [`${p}R0`] : [`${p}R0`, `${p}R1`];
  const rightSide = set(set(start, ids(`${p}r`, total), { gone: false, lit: true }), rightIds, { lit: true });
  const rightSay: Say = right.length === 1 ? ['This side is', { number: total }, '.'] : ['This side has', { number: right[0] as number }, 'and', { number: right[1] as number }, '. Together they make', { number: total }, '.'];
  const leftSide = set(set(calm(rightSide), ids(`${p}l`, a), { gone: false, lit: true }), [`${p}a`, `${p}box`], { lit: true });
  const counted = countAlong(set(calm(leftSide), ids(`${p}l`, a), { lit: true }), ids(`${p}m`, b), a);
  // Each red counter appears as it is counted.
  const counting = counted.moments.map((each, i) => ({ ...each, scene: set(each.scene, ids(`${p}m`, i + 1), { gone: false }) }));
  const after = set(counted.end, ids(`${p}m`, b), { gone: false });
  const solved = alter(set(calm(after), [...ids(`${p}l`, a), ...ids(`${p}m`, b), ...ids(`${p}r`, total)], { lit: true }), (piece) => (piece.id === `${p}box` ? { ...piece, look: numeral(b), lit: true } : piece));
  return [
    moment(rightSay, `This side: ${total}`, rightSide),
    moment(['This side has', { number: a }, ', and a box.'], `${a} + ?`, leftSide),
    moment(['Count on from', { number: a }, 'until both sides match.'], `Count on from ${a}.`, set(calm(leftSide), [`${p}a`], { lit: true })),
    ...counting,
    moment(['We counted', { number: b }, 'more.'], `${b} more`, calm(withoutHand(after))),
    moment(['So the box is', { number: b }, '. Both sides make', { number: total }, '.'], `${a} + ${b} = ${total}`, solved),
  ];
}

function balanceWhy(question: Question): Moment[] {
  return balanceMoments('w', num(question.facts, 'a'), numbers(question.facts, 'right'));
}

export function numberPuzzleLesson(): Lesson {
  const one = balanceMoments('x', 3, [5]);
  const two = balanceMoments('y', 2, [4, 3]);
  const first = turnQuestion('R-A11', 1, (f) => num(f, 'total') <= 8 && num(f, 'b') >= 2 && num(f, 'b') <= 4 && num(f, 'a') !== 3);
  const second = turnQuestion('R-A11', 2, (f) => num(f, 'total') <= 10 && num(f, 'b') >= 2 && num(f, 'b') <= 5);
  const oneStart = balanceScene('x', 3, [5]);
  const twoStart = balanceScene('y', 2, [4, 3]);
  return {
    parts: [
      show(moment(['A scale balances when both sides are the same amount.'], 'Both sides the same.', set(oneStart, ['xscale'], { lit: true }))),
      ...one.map(show),
      show(moment(['The box holds just what is missing, so both sides match.'], 'The box holds what is missing.', calm(one.at(-1)?.scene ?? oneStart))),
      turn(first, balanceWhy(first)),
      show(moment(['Sometimes the other side has two numbers. Put them together first.'], 'Two numbers? Put them together first.', set(twoStart, ['yR0', 'yR1'], { lit: true }))),
      ...two.map(show),
      turn(second, balanceWhy(second)),
      show(moment(['Find how much the other side makes, then count on to fill the box.'], 'Find the total, then count on.', calm(two.at(-1)?.scene ?? twoStart))),
    ],
  };
}

// ---- R-A15 Word analogies ----

const OPTION_X = [0.2, 3.5, 6.8];

// The full pair on top, the pair with a box under it, and the three choices on the table.
function analogyScene(p: string, a: string, b: string, c: string, choices: readonly string[]): Scene {
  return scene([
    { id: `${p}a`, look: text(a), x: 0.3, y: 0.3, w: 3, h: 1 },
    { id: `${p}to1`, look: text('→'), x: 3.6, y: 0.3, w: 1, h: 1 },
    { id: `${p}b`, look: text(b), x: 4.9, y: 0.3, w: 3, h: 1 },
    { id: `${p}c`, look: text(c), x: 0.3, y: 1.8, w: 3, h: 1 },
    { id: `${p}to2`, look: text('→'), x: 3.6, y: 1.8, w: 1, h: 1 },
    { id: `${p}box`, look: { kind: 'box' }, x: 5.8, y: 1.8, w: 1.1, h: 1 },
    ...choices.map((word, i): Piece => ({ id: `${p}o${i}`, look: text(word), x: OPTION_X[i] ?? 0, y: 3.8, w: 3, h: 0.9, gone: true })),
  ]);
}

function relationOf(a: string, b: string, c: string, d: string): string {
  const has = (pairs: readonly (readonly [string, string])[], x: string, y: string): boolean => pairs.some(([one, two]) => one === x && two === y);
  const found = Object.values(VERBAL_RELATIONS).find((rel) => has(rel.pairs, a, b) && has(rel.pairs, c, d));
  if (!found) throw new Error(`No relation for ${a} ${b} ${c} ${d}`);
  return found.says;
}

function analogyMoments(p: string, a: string, b: string, c: string, choices: readonly string[], d: string): Moment[] {
  const says = relationOf(a, b, c, d);
  const start = analogyScene(p, a, b, c, choices);
  const top = set(start, [`${p}a`, `${p}b`], { lit: true });
  const link = set(set(calm(top), [`${p}a`, `${p}b`, `${p}to1`], { lit: true }), [`${p}to1`], { badge: says });
  const ask = set(set(calm(link), [`${p}c`, `${p}box`], { lit: true }), [`${p}to1`], { badge: says });
  const shown = set(ask, ids(`${p}o`, choices.length), { gone: false });
  const moments: Moment[] = [
    moment([{ word: a }, 'is to', { word: b }, '.'], `${a} → ${b}`, top),
    moment(['How do they go together?', { word: a }, says, { word: b }, '.'], `${a} ${says} ${b}.`, link),
    moment([{ word: c }, 'is to what?'], `${c} → ?`, ask),
    moment(['Try each word the same way.'], 'Try each word.', shown),
  ];
  let now = calm(shown);
  now = set(now, [`${p}to1`], { badge: says });
  choices.forEach((word, i) => {
    if (word === d) return;
    now = set(calm(now), [`${p}o${i}`], { lit: true, crossed: true });
    now = set(now, [`${p}to1`], { badge: says });
    moments.push(moment([{ word: c }, says, { word }, '? No.'], `${c} ${says} ${word}? No.`, now));
  });
  const right = choices.indexOf(d);
  const placed = alter(calm(now), (piece) => {
    if (piece.id === `${p}o${right}`) return { ...piece, x: 4.9, y: 1.8, h: 1, lit: true };
    if (piece.id === `${p}box`) return { ...piece, gone: true };
    if (piece.id === `${p}to1`) return { ...piece, badge: says };
    return piece;
  });
  moments.push(moment([{ word: c }, says, { word: d }, '. Yes!'], `${c} ${says} ${d}.`, placed));
  moments.push(moment(['So,', { word: a }, 'is to', { word: b }, ', as', { word: c }, 'is to', { word: d }, '.'], `${a} → ${b}, ${c} → ${d}`, set(calm(placed), [`${p}a`, `${p}b`, `${p}c`, `${p}o${right}`], { lit: true })));
  return moments;
}

function analogyWhy(question: Question): Moment[] {
  const [a = '', b = ''] = words(question.facts, 'from');
  return analogyMoments('w', a, b, str(question.facts, 'base'), words(question.facts, 'options'), answerWord(question));
}

export function wordAnalogyLesson(): Lesson {
  const opening = analogyMoments('x', 'bird', 'nest', 'bee', ['honey', 'hive', 'web'], 'hive');
  const first = turnQuestion('R-A15', 1, (f) => !['bird', 'bee'].some((word) => words(f, 'from').includes(word) || str(f, 'base') === word));
  const second = turnQuestion('R-A15', 2);
  const start = analogyScene('x', 'bird', 'nest', 'bee', ['honey', 'hive', 'web']);
  const baby = scene([
    { id: 'ya', look: text('cat'), x: 0.3, y: 0.3, w: 3, h: 1 },
    { id: 'yto1', look: text('→'), x: 3.6, y: 0.3, w: 1, h: 1 },
    { id: 'yb', look: text('kitten'), x: 4.9, y: 0.3, w: 3, h: 1 },
    { id: 'yc', look: text('cow'), x: 0.3, y: 1.8, w: 3, h: 1 },
    { id: 'yto2', look: text('→'), x: 3.6, y: 1.8, w: 1, h: 1 },
    { id: 'yd', look: text('milk'), x: 4.9, y: 1.8, w: 3, h: 1 },
  ]);
  return {
    parts: [
      show(moment(['In a word puzzle like this, two pairs of words go together the same way.'], 'Two pairs go together the same way.', start)),
      ...opening.map(show),
      show(moment(['Say how the top pair goes together. Then say the same thing about the bottom pair.'], 'Find the link. Use the same link.', calm(opening.at(-1)?.scene ?? start))),
      turn(first, analogyWhy(first)),
      show(moment(['Pairs can go together in many ways. A cat has a baby called a kitten.'], 'Cat has a baby called a kitten.', set(baby, ['ya', 'yb'], { lit: true }))),
      show(moment(['And a cow gives us milk.'], 'Cow gives us milk.', set(baby, ['yc', 'yd'], { lit: true }))),
      turn(second, analogyWhy(second)),
      show(moment(['Find the link in the first pair, and use the same link again.'], 'Same link, both pairs.', calm(baby))),
    ],
  };
}

// ---- R-A16 Which word does not belong ----

const GROUP_NAMES: Record<string, string> = { fruit: 'fruits', vegetable: 'vegetables', farmAnimal: 'farm animals', wildAnimal: 'wild animals', land: 'things that go on land', water: 'things that go on water', clothes: 'clothes', furniture: 'furniture', colour: 'colours', shape: 'shapes', weather: 'kinds of weather' };

function groupOf(same: readonly string[]): string {
  const found = Object.entries(WORD_CLASSES).find(([, members]) => same.every((each) => members.includes(each)));
  if (!found) throw new Error(`No group holds ${same.join(', ')}`);
  return GROUP_NAMES[found[0]] ?? found[0];
}

const WORD_X = [0.2, 3.45, 6.7];

// How a row of things is laid out: words with small pictures over them, or big pictures alone.
interface OddLayout {
  words: boolean;
  pictures: readonly string[];
}
const WORDS_ONLY: OddLayout = { words: true, pictures: [] };
const pictureX = (layout: OddLayout): number => (layout.words ? 0.9 : 0.6);
const pictureY = (layout: OddLayout): number => (layout.words ? 0.1 : 0.5);

// Three words (or pictures) in a row, and the group's name, hidden.
function oddScene(p: string, list: readonly string[], layout: OddLayout = WORDS_ONLY): Scene {
  const size = layout.words ? 1.3 : 1.9;
  const pieces: Piece[] = list.flatMap((word, i): Piece[] => {
    const x = WORD_X[i] ?? 0;
    const picture = layout.pictures[i];
    const drawn: Piece[] = picture ? [{ id: `${p}p${i}`, look: art(picture), x: x + pictureX(layout), y: pictureY(layout), w: size, h: size }] : [];
    return layout.words ? [...drawn, { id: `${p}w${i}`, look: text(word), x, y: 1.6, w: 3.1, h: 0.9 }] : drawn;
  });
  return scene([...pieces, { id: `${p}g`, look: text('group'), x: 0.2, y: 2.7, w: 6.3, h: 0.7, gone: true }]);
}

function oddMoments(p: string, list: readonly string[], odd: string, label: string, layout: OddLayout = WORDS_ONLY): Moment[] {
  const start = oddScene(p, list, layout);
  const main = layout.words ? 'w' : 'p';
  const oddAt = list.indexOf(odd);
  const same = list.filter((word) => word !== odd);
  const sameAt = list.map((_, i) => i).filter((i) => i !== oddAt);
  const read = set(start, ids(`${p}${main}`, list.length), { lit: true });
  // The two that go together slide side by side on the left, with their group's name under them.
  const sorted = alter(calm(read), (piece) => {
    const m = /^(.*)([wp])(\d+)$/.exec(piece.id);
    if (piece.id === `${p}g`) return { ...piece, look: text(label), gone: false, lit: true };
    if (!m || m[1] !== p) return piece;
    const i = Number(m[3]);
    const slot = i === oddAt ? 6.7 : 0.2 + sameAt.indexOf(i) * 3.2;
    return { ...piece, x: m[2] === 'p' ? slot + pictureX(layout) : slot, lit: i !== oddAt && m[2] === main ? true : undefined };
  });
  const oddOut = alter(sorted, (piece) => {
    const m = /^(.*)([wp])(\d+)$/.exec(piece.id);
    if (!m || m[1] !== p) return piece.id === `${p}g` ? { ...piece, lit: undefined, dim: true } : piece;
    const isOdd = Number(m[3]) === oddAt;
    return { ...piece, lit: isOdd && m[2] === main ? true : undefined, dim: isOdd ? undefined : true };
  });
  const named = list.flatMap((word, i): Say => (i === 0 ? [{ word }] : [',', { word }]));
  return [
    moment([layout.words ? 'Read the words:' : 'Look. We have', ...named, '.'], list.join(', '), read),
    moment([{ word: same[0] ?? '' }, 'and', { word: same[1] ?? '' }, `are both ${label}.`], `${same.join(' and ')}: ${label}`, sorted),
    moment(['But', { word: odd }, 'is not one of them.'], `${odd} is not.`, set(sorted, [`${p}${main}${oddAt}`], { lit: true })),
    moment(['So', { word: odd }, 'does not belong.'], `${odd} does not belong.`, oddOut),
  ];
}

function oddWhy(question: Question): Moment[] {
  const list = words(question.facts, 'words');
  const odd = answerWord(question);
  return oddMoments('w', list, odd, groupOf(list.filter((word) => word !== odd)));
}

export function oddWordLesson(): Lesson {
  const fruit = oddMoments('x', ['apple', 'car', 'pear'], 'car', 'fruits', { words: true, pictures: ['🍎', '🚗', '🍐'] });
  const animals = oddMoments('y', ['cow', 'lion', 'pig'], 'lion', 'farm animals', { words: true, pictures: ['🐄', '🦁', '🐖'] });
  const first = turnQuestion('R-A16', 1);
  const second = turnQuestion('R-A16', 2);
  const fruitStart = oddScene('x', ['apple', 'car', 'pear'], { words: true, pictures: ['🍎', '🚗', '🍐'] });
  const animalStart = oddScene('y', ['cow', 'lion', 'pig'], { words: true, pictures: ['🐄', '🦁', '🐖'] });
  return {
    parts: [
      show(moment(['One of these words does not belong with the others. Let us find it.'], 'Which word does not belong?', fruitStart)),
      ...fruit.map(show),
      show(moment(['Find the group most of the words share. The word left over does not belong.'], 'Find the group. Find the one left over.', calm(fruit.at(-1)?.scene ?? fruitStart))),
      turn(first, oddWhy(first)),
      show(moment(['Careful! Sometimes all the words are close. A lion is an animal too.'], 'Careful: the words can be close.', set(animalStart, ['yw1', 'yp1'], { lit: true }))),
      show(moment(['Look for the group that fits best.'], 'Find the group that fits best.', animalStart)),
      ...animals.map(show),
      turn(second, oddWhy(second)),
      show(moment(['Name the group, then find the word that is not in it.'], 'Name the group. Find the odd one.', calm(animals.at(-1)?.scene ?? animalStart))),
    ],
  };
}

// ---- R-A17 Number grids ----

// A 3 by 3 grid of numbers. A cell of -1 is the box.
function gridScene(p: string, rows: readonly (readonly number[])[]): Scene {
  return scene(
    rows.flatMap((row, r) =>
      row.map((value, c): Piece => ({ id: `${p}c${r}${c}`, look: value < 0 ? { kind: 'box' } : numeral(value), x: 2.6 + c * 1.7, y: 0.3 + r * 1.45, w: 1.3, h: 1.2 })),
    ),
  );
}

const rowIds = (p: string, r: number): string[] => [0, 1, 2].map((c) => `${p}c${r}${c}`);

function gridMoments(p: string, rows: readonly (readonly number[])[], step: number): Moment[] {
  const start = gridScene(p, rows);
  const blank = (rows[2] ?? []).indexOf(-1);
  const before = (rows[2]?.[blank - 1] ?? 0) as number;
  const answer = before + step;
  const jump = `+${step}`;
  const top = set(start, rowIds(p, 0), { lit: true });
  const topJumps = set(top, [`${p}c01`, `${p}c02`], { badge: jump });
  const middle = set(set(calm(topJumps), rowIds(p, 1), { lit: true }), [`${p}c11`, `${p}c12`], { badge: jump });
  const bottom = set(calm(middle), rowIds(p, 2), { lit: true });
  const solved = alter(calm(bottom), (piece) => (piece.id === `${p}c2${blank}` ? { ...piece, look: numeral(answer), lit: true, badge: jump } : piece));
  return [
    moment(['Look at the top row:', ...listed(rows[0] ?? []), '.'], (rows[0] ?? []).join(', '), top),
    moment(['Each number is', { number: step }, 'more than the one before.'], `Each one is ${jump}.`, topJumps),
    moment(['The middle row does the same:', ...listed(rows[1] ?? []), '.'], (rows[1] ?? []).join(', '), middle),
    moment(['Now the bottom row. Use the same rule.'], 'Same rule in the bottom row.', bottom),
    moment([{ number: before }, ', and', { number: step }, 'more, is', { number: answer }, '.'], `${before} + ${step} = ${answer}`, solved),
  ];
}

function gridWhy(question: Question): Moment[] {
  const rows = numberRows(question.facts, 'rows');
  const [a = 0, b = 0] = rows[0] ?? [];
  return gridMoments('w', rows, b - a);
}

export function numberGridLesson(): Lesson {
  const ones: number[][] = [[1, 2, 3], [4, 5, 6], [7, 8, -1]];
  const twos: number[][] = [[2, 4, 6], [5, 7, 9], [10, -1, 14]];
  const byOne = gridMoments('x', ones, 1);
  const byTwo = gridMoments('y', twos, 2);
  const first = turnQuestion('R-A17', 1);
  const second = turnQuestion('R-A17', 2, (f) => {
    const [a = 0, b = 0] = numberRows(f, 'rows')[0] ?? [];
    return b - a <= 5;
  });
  return {
    parts: [
      show(moment(['In a number grid, every row follows the same rule.'], 'Every row follows one rule.', gridScene('x', ones))),
      ...byOne.map(show),
      show(moment(['Find the rule in a full row. Then use it in the row with the box.'], 'Find the rule. Use it on the box.', calm(byOne.at(-1)?.scene ?? gridScene('x', ones)))),
      turn(first, gridWhy(first)),
      show(moment(['The jump can be bigger than one.'], 'Bigger jumps.', gridScene('y', twos))),
      ...byTwo.map(show),
      turn(second, gridWhy(second)),
      show(moment(['Find the jump in a full row, and make the same jump.'], 'Same jump in every row.', calm(byTwo.at(-1)?.scene ?? gridScene('y', twos)))),
    ],
  };
}

// ---- Picture puzzles: R-A1, R-A2, R-A9, R-A14 ----

function groupWord(word: string): GroupWord {
  const found = GROUP_WORDS.find((each) => each.word === word);
  if (!found) throw new Error(`No picture called ${word}`);
  return found;
}
function pairStarting(first: string): AnalogyPair {
  const found = ANALOGY_PAIRS.find((pair) => pair.first.word === first);
  if (!found) throw new Error(`No pair starts with ${first}`);
  return found;
}
function riddleFor(word: string): Riddle {
  const found = RIDDLES.find((each) => each.word === word);
  if (!found) throw new Error(`No riddle for ${word}`);
  return found;
}
function emojiOf(word: string): string {
  const found = GROUP_WORDS.find((each) => each.word === word) ?? RIDDLES.find((each) => each.word === word);
  if (found) return found.emoji;
  const pair = ANALOGY_PAIRS.find((each) => each.first.word === word || each.second.word === word);
  if (!pair) throw new Error(`No picture for ${word}`);
  return pair.first.word === word ? pair.first.emoji : pair.second.emoji;
}

// Try each choice in turn: the wrong ones are crossed out, the right one lights up and goes where it belongs.
function tryEach(p: string, from: Scene, choices: readonly string[], answer: string, wrongSay: (word: string) => Say, home: { x: number; y: number }, extra: (scene: Scene) => Scene = (each) => each): { moments: Moment[]; end: Scene } {
  let now = from;
  const moments: Moment[] = [];
  choices.forEach((word, i) => {
    if (word === answer) return;
    now = extra(set(calm(now), [`${p}o${i}`], { lit: true, crossed: true }));
    moments.push(moment(wrongSay(word), `${word}? No.`, now));
  });
  const right = choices.indexOf(answer);
  now = extra(alter(calm(now), (piece) => {
    if (piece.id === `${p}o${right}`) return { ...piece, ...home, lit: true };
    if (piece.id === `${p}box`) return { ...piece, gone: true };
    if (piece.id.startsWith(`${p}o`)) return { ...piece, dim: true };
    return piece;
  }));
  return { moments, end: now };
}

// ---- R-A1 Odd one out (pictures) ----

const pictureLayout = (list: readonly string[]): OddLayout => ({ words: false, pictures: list.map(emojiOf) });

function oddPictureWhy(question: Question): Moment[] {
  const list = words(question.facts, 'options');
  const [pairWord = ''] = words(question.facts, 'pair');
  return oddMoments('w', list, str(question.facts, 'odd'), groupWord(pairWord).group, pictureLayout(list));
}

export function oddPictureLesson(): Lesson {
  const far = ['cat', 'car', 'dog'];
  const close = ['boy', 'girl', 'duck'];
  const farMoments = oddMoments('x', far, 'car', 'animals', pictureLayout(far));
  const closeMoments = oddMoments('y', close, 'duck', 'people', pictureLayout(close));
  const first = turnQuestion('R-A1', 1, (f) => !words(f, 'options').includes('car'));
  const second = turnQuestion('R-A1', 2, (f) => str(f, 'odd') !== 'duck');
  const farStart = oddScene('x', far, pictureLayout(far));
  const closeStart = oddScene('y', close, pictureLayout(close));
  return {
    parts: [
      show(moment(['Some things belong together. One of these does not belong.'], 'Which one does not belong?', farStart)),
      ...farMoments.map(show),
      show(moment(['Find what the others share. The one left over does not belong.'], 'Find what the others share.', calm(farMoments.at(-1)?.scene ?? farStart))),
      turn(first, oddPictureWhy(first)),
      show(moment(['Sometimes the pictures are close, so we look harder.'], 'Look harder when they are close.', closeStart)),
      ...closeMoments.map(show),
      turn(second, oddPictureWhy(second)),
      show(moment(['Find the group, then pick the one that is not in it.'], 'Find the group. Pick the odd one.', calm(closeMoments.at(-1)?.scene ?? closeStart))),
    ],
  };
}

// ---- R-A2 Which belongs ----

const CHOICE_X = [1, 4.2, 7.4];

// Two pictures that go together and an empty box beside them; the choices wait on the table.
function belongsScene(p: string, examples: readonly string[], choices: readonly string[]): Scene {
  return scene([
    ...examples.map((word, i): Piece => ({ id: `${p}e${i}`, look: art(emojiOf(word)), x: 1 + i * 2.4, y: 0.2, w: 1.8, h: 1.8 })),
    { id: `${p}box`, look: { kind: 'box' }, x: 1 + examples.length * 2.4, y: 0.2, w: 1.8, h: 1.8 },
    { id: `${p}g`, look: text('group'), x: 0.8, y: 2.1, w: 4.6, h: 0.7, gone: true },
    ...choices.map((word, i): Piece => ({ id: `${p}o${i}`, look: art(emojiOf(word)), x: CHOICE_X[i] ?? 0, y: 3.6, w: 1.6, h: 1.6, gone: true })),
  ]);
}

function belongsMoments(p: string, examples: readonly string[], group: string, choices: readonly string[], answer: string): Moment[] {
  const [one = '', two = ''] = examples;
  const start = belongsScene(p, examples, choices);
  const look = set(start, [`${p}e0`, `${p}e1`], { lit: true });
  const named = alter(look, (piece) => (piece.id === `${p}g` ? { ...piece, look: text(group), gone: false } : piece));
  const offered = set(set(calm(named), ids(`${p}o`, choices.length), { gone: false }), [`${p}box`], { lit: true });
  const tried = tryEach(p, offered, choices, answer, (word) => [{ word }, '? No, it does not fit with them.'], { x: 1 + examples.length * 2.4, y: 0.2 });
  return [
    moment(['Here are', { word: one }, 'and', { word: two }, '.'], `${one} and ${two}`, look),
    moment([`They are both ${group}.`], `Both ${group}`, named),
    moment(['Which one belongs with them? Let us try each one.'], 'Try each one.', offered),
    ...tried.moments,
    moment([{ word: answer }, '? Yes! It fits with them.'], `${answer}: yes!`, tried.end),
    moment([{ word: answer }, `is one of the ${group} too.`], `${answer}: ${group}`, set(calm(tried.end), [`${p}e0`, `${p}e1`, `${p}o${choices.indexOf(answer)}`], { lit: true })),
  ];
}

function belongsWhy(question: Question): Moment[] {
  return belongsMoments('w', words(question.facts, 'examples'), str(question.facts, 'target'), words(question.facts, 'options'), str(question.facts, 'answer'));
}

export function whichBelongsLesson(): Lesson {
  const opening = belongsMoments('x', ['car', 'bus'], 'vehicles', ['apple', 'train', 'hat'], 'train');
  const first = turnQuestion('R-A2', 1, (f) => str(f, 'target') !== 'vehicles');
  const second = turnQuestion('R-A2', 2, (f) => str(f, 'target') !== str(first.facts, 'target'));
  const start = belongsScene('x', ['car', 'bus'], ['apple', 'train', 'hat']);
  return {
    parts: [
      show(moment(['Things in a group share something. Let us find one more for the group.'], 'Find one more for the group.', start)),
      ...opening.map(show),
      show(moment(['First say what the pictures share. Then find the one that shares it too.'], 'What do they share? Find one more.', calm(opening.at(-1)?.scene ?? start))),
      turn(first, belongsWhy(first)),
      show(moment(['Sometimes a wrong picture is close. Check the group carefully.'], 'Check the group carefully.', calm(start))),
      turn(second, belongsWhy(second)),
      show(moment(['Name the group, and pick the picture that is in it too.'], 'Name the group. Pick one more.', calm(opening.at(-1)?.scene ?? start))),
    ],
  };
}

// ---- R-A9 Picture analogies ----

// The example pair on top, the second pair with a box under it, and the choices down the right side.
function pictureAnalogyScene(p: string, example: AnalogyPair, target: AnalogyPair, choices: readonly string[]): Scene {
  return scene([
    { id: `${p}a`, look: art(example.first.emoji), x: 0.4, y: 0.2, w: 1.7, h: 1.7 },
    { id: `${p}to1`, look: text('→'), x: 2.3, y: 0.55, w: 1, h: 1 },
    { id: `${p}b`, look: art(example.second.emoji), x: 3.5, y: 0.2, w: 1.7, h: 1.7 },
    { id: `${p}c`, look: art(target.first.emoji), x: 0.4, y: 2.5, w: 1.7, h: 1.7 },
    { id: `${p}to2`, look: text('→'), x: 2.3, y: 2.85, w: 1, h: 1 },
    { id: `${p}box`, look: { kind: 'box' }, x: 3.5, y: 2.5, w: 1.7, h: 1.7 },
    ...choices.map((word, i): Piece => ({ id: `${p}o${i}`, look: art(emojiOf(word)), x: 7.4, y: 0.1 + i * 1.9, w: 1.7, h: 1.7, gone: true })),
  ]);
}

function pictureAnalogyMoments(p: string, example: AnalogyPair, target: AnalogyPair, choices: readonly string[]): Moment[] {
  const answer = target.second.word;
  const start = pictureAnalogyScene(p, example, target, choices);
  const top = set(start, [`${p}a`, `${p}b`], { lit: true });
  const why = set(top, [`${p}to1`], { lit: true });
  const ask = set(set(calm(why), [`${p}c`, `${p}box`], { lit: true }), ids(`${p}o`, choices.length), { gone: false });
  const tried = tryEach(p, ask, choices, answer, (word) => ['Does it go with', { word }, '? No.'], { x: 3.5, y: 2.5 });
  return [
    moment([{ word: example.first.word }, 'goes with', { word: example.second.word }, '.'], `${example.first.word} → ${example.second.word}`, top),
    moment(['Why?', example.why], example.why, why),
    moment([{ word: target.first.word }, 'goes with what? Let us try each picture.'], `${target.first.word} → ?`, ask),
    ...tried.moments,
    moment([target.why], target.why, tried.end),
    moment(['So', { word: target.first.word }, 'goes with', { word: answer }, '.'], `${target.first.word} → ${answer}`, set(calm(tried.end), [`${p}c`, `${p}o${choices.indexOf(answer)}`], { lit: true })),
  ];
}

function pictureAnalogyWhy(question: Question): Moment[] {
  const [exampleFirst = ''] = words(question.facts, 'example');
  return pictureAnalogyMoments('w', pairStarting(exampleFirst), pairStarting(str(question.facts, 'target')), words(question.facts, 'options'));
}

export function pictureAnalogyLesson(): Lesson {
  const sock = pairStarting('sock');
  const glove = pairStarting('glove');
  const bee = pairStarting('bee');
  const cow = pairStarting('cow');
  const opening = pictureAnalogyMoments('x', sock, glove, ['honey', 'hand', 'web']);
  const close = pictureAnalogyMoments('y', bee, cow, ['egg', 'honey', 'milk']);
  const first = turnQuestion('R-A9', 1, (f) => !['glove', 'cow'].includes(str(f, 'target')));
  const second = turnQuestion('R-A9', 2, (f) => !['glove', 'cow', str(first.facts, 'target')].includes(str(f, 'target')));
  const start = pictureAnalogyScene('x', sock, glove, ['honey', 'hand', 'web']);
  const closeStart = pictureAnalogyScene('y', bee, cow, ['egg', 'honey', 'milk']);
  return {
    parts: [
      show(moment(['Two pairs of pictures can go together the same way.'], 'Two pairs, the same way.', start)),
      ...opening.map(show),
      show(moment(['Find how the first two go together. Then do the same with the next one.'], 'Find the link. Do the same.', calm(opening.at(-1)?.scene ?? start))),
      turn(first, pictureAnalogyWhy(first)),
      show(moment(['Watch out! Some pictures almost fit.'], 'Some pictures almost fit.', closeStart)),
      ...close.map(show),
      turn(second, pictureAnalogyWhy(second)),
      show(moment(['Say how the first pair goes together, and say it again for the second pair.'], 'Same link, both pairs.', calm(close.at(-1)?.scene ?? closeStart))),
    ],
  };
}

// ---- R-A14 Picture riddles ----

function riddleScene(p: string, choices: readonly string[]): Scene {
  const gap = choices.length === 2 ? 3.4 : 3.2;
  const left = choices.length === 2 ? 2.2 : 0.8;
  return scene(choices.map((word, i): Piece => ({ id: `${p}o${i}`, look: art(emojiOf(word)), x: left + i * gap, y: 1, w: 1.9, h: 1.9 })));
}

function riddleMoments(p: string, riddle: Riddle, choices: readonly string[]): Moment[] {
  const start = riddleScene(p, choices);
  const heard = set(start, ids(`${p}o`, choices.length), { lit: true });
  const right = choices.indexOf(riddle.word);
  const tried = tryEach(p, calm(heard), choices, riddle.word, (word) => ['Is it the', { word }, '? No.'], { x: start.pieces[right]?.x ?? 0, y: 1 });
  return [
    moment([riddle.riddle], riddle.riddle, heard),
    ...tried.moments,
    moment(['The', { word: riddle.word }, `is the one that ${riddle.fact}.`], `The ${riddle.word} ${riddle.fact}.`, tried.end),
    moment(['So the answer is the', { word: riddle.word }, '.'], riddle.word, set(calm(tried.end), [`${p}o${right}`], { lit: true })),
  ];
}

function riddleWhy(question: Question): Moment[] {
  return riddleMoments('w', riddleFor(answerWord(question)), words(question.facts, 'options'));
}

export function riddleLesson(): Lesson {
  const fly = riddleMoments('x', riddleFor('bird'), ['shoe', 'bird', 'key']);
  const lock = riddleMoments('y', riddleFor('key'), ['clock', 'book', 'key']);
  const first = turnQuestion('R-A14', 1, (f) => !['bird', 'key'].some((word) => words(f, 'options').includes(word)));
  const second = turnQuestion('R-A14', 2, (f) => !['bird', 'key'].some((word) => words(f, 'options').includes(word)) && str(f, 'target') !== str(first.facts, 'target'));
  const start = riddleScene('x', ['shoe', 'bird', 'key']);
  const lockStart = riddleScene('y', ['clock', 'book', 'key']);
  return {
    parts: [
      show(moment(['A riddle gives a clue. The clue fits just one picture.'], 'The clue fits one picture.', start)),
      ...fly.map(show),
      show(moment(['Listen to the clue, then check each picture.'], 'Listen, then check each one.', calm(fly.at(-1)?.scene ?? start))),
      turn(first, riddleWhy(first)),
      show(moment(['Here is one more. Check every picture before you choose.'], 'Check every picture.', lockStart)),
      ...lock.map(show),
      turn(second, riddleWhy(second)),
      show(moment(['Hear the clue, try each picture, and keep the one that fits.'], 'Keep the one that fits.', calm(lock.at(-1)?.scene ?? lockStart))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'R-A1': oddPictureLesson,
  'R-A2': whichBelongsLesson,
  'R-A9': pictureAnalogyLesson,
  'R-A14': riddleLesson,
  'R-A8': numberAnalogyLesson,
  'R-A10': numberSeriesLesson,
  'R-A11': numberPuzzleLesson,
  'R-A15': wordAnalogyLesson,
  'R-A16': oddWordLesson,
  'R-A17': numberGridLesson,
};
