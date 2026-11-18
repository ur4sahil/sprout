import { GROUP_WORDS } from '../../content/data/categories';
import { DAYS, MONTHS, VOTES } from '../../content/data/h1-things';
import type { Question, Say } from '../../engine/types';
import { add, alter, art, calm, countAlong, ids, moment, num, numeral, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Lessons that teach (plan section 16), written in the rich look's style: Grade 1 time, data, length,
// shapes, fractions and patterns.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });
const round = (n: number): number => Math.round(n * 100) / 100;

// The pointing hand under a piece, kept on the stage even when the piece is near the bottom or the edge.
function point(from: Scene, id: string): Scene {
  const target = from.pieces.find((piece) => piece.id === id);
  if (!target) return from;
  return alter(pointAt(from, target), (piece) => (piece.id === 'hand' ? { ...piece, x: Math.max(0, Math.min(piece.x, from.cols - 0.8)), y: Math.min(piece.y, from.rows - 0.8) } : piece));
}

const last = (moments: Moment[], fallback: Scene): Scene => moments.at(-1)?.scene ?? fallback;

// ---- M-1-C7 Days of the week, M-1-C8 Months of the year ----

interface Ring {
  names: readonly string[];
  cols: number;
  rows: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  w: number;
  h: number;
}

const DAY_RING: Ring = { names: DAYS, cols: 10, rows: 6, cx: 5, cy: 3, rx: 3.4, ry: 2.2, w: 2.2, h: 0.55 };
const MONTH_RING: Ring = { names: MONTHS, cols: 12, rows: 7, cx: 6, cy: 3.5, rx: 4.4, ry: 2.8, w: 2.2, h: 0.5 };

// The names around a circle, like a clock, so the last one leads back to the first.
function ringScene(prefix: string, ring: Ring): Scene {
  const count = ring.names.length;
  const pieces: Piece[] = ring.names.map((name, i) => {
    const turnBy = (2 * Math.PI * i) / count;
    return { id: `${prefix}${i}`, look: text(name), x: round(ring.cx + ring.rx * Math.sin(turnBy) - ring.w / 2), y: round(ring.cy - ring.ry * Math.cos(turnBy) - ring.h / 2), w: ring.w, h: ring.h };
  });
  return scene(pieces, ring.cols, ring.rows);
}

// Find the name, take one step forward or back, and say what is there.
function stepMoments(prefix: string, ring: Ring, start: string, shift: 1 | -1): Moment[] {
  const list = ring.names;
  const at = list.indexOf(start);
  const to = (at + shift + list.length) % list.length;
  const answer = list[to] as string;
  const base = ringScene(prefix, ring);
  const found = point(set(base, [`${prefix}${at}`], { lit: true }), `${prefix}${at}`);
  const stepped = point(set(found, [`${prefix}${to}`], { lit: true, badge: shift > 0 ? 'next' : 'before' }), `${prefix}${to}`);
  return [
    moment([`Find ${start}.`], `Find ${start}.`, found),
    moment(shift > 0 ? ['After means the one that comes next. Take one step forward.'] : ['Before means the one just behind it. Take one step back.'], shift > 0 ? 'After: one step forward.' : 'Before: one step back.', set(found, [`${prefix}${at}`], { badge: 'start' })),
    moment(shift > 0 ? [`After ${start} comes ${answer}.`] : [`Before ${start} comes ${answer}.`], shift > 0 ? `After ${start} comes ${answer}.` : `Before ${start} comes ${answer}.`, stepped),
  ];
}

function calendarWhy(question: Question, prefix: string, ring: Ring, unit: string): Moment[] {
  const start = str(question.facts, 'start');
  const shift = num(question.facts, 'shift') > 0 ? 1 : -1;
  return [moment([`Here are the ${unit} in a circle.`], `The ${unit} in order.`, ringScene(prefix, ring)), ...stepMoments(prefix, ring, start, shift)];
}

function calendarLesson(skillId: string, ring: Ring, opening: Say, openText: string, unit: string, forward: string, back: string): Lesson {
  const base = ringScene('x', ring);
  const count = ring.names.length;
  const first = ring.names[0] as string;
  const final = ring.names[count - 1] as string;
  const chant = ring.names.map((name, i) => show(moment([`${name}.`], name, set(base, ids('x', i + 1), { lit: true }))));
  const wrapped = point(set(base, [`x${count - 1}`, 'x0'], { lit: true }), 'x0');
  const one = turnQuestion(skillId, 1, (f) => f.start !== forward && f.start !== final);
  const two = turnQuestion(skillId, 2, (f) => f.start !== back && f.start !== first);
  return {
    parts: [
      show(moment(opening, openText, base)),
      show(moment(['Let us say them in order.'], 'Say them in order.', set(base, ['x0'], { lit: true }))),
      ...chant,
      show(moment([`After ${final}, we start again with ${first}.`], `After ${final} comes ${first}.`, wrapped)),
      show(moment([`The ${unit} go round and round, like a circle.`], `The ${unit} go round.`, calm(base))),
      ...stepMoments('x', ring, forward, 1).map(show),
      turn(one, calendarWhy(one, 'w', ring, unit)),
      show(moment(['Now let us go back the other way.'], 'Go back the other way.', calm(base))),
      ...stepMoments('x', ring, back, -1).map(show),
      turn(two, calendarWhy(two, 'w', ring, unit)),
      show(moment(['After is one step forward. Before is one step back.'], 'After: forward. Before: back.', calm(base))),
    ],
  };
}

const daysLesson = (): Lesson => calendarLesson('M-1-C7', DAY_RING, ['A week has seven days. They always come in the same order.'], 'A week has 7 days.', 'days', 'Tuesday', 'Friday');
const monthsLesson = (): Lesson => calendarLesson('M-1-C8', MONTH_RING, ['A year has twelve months. They always come in the same order.'], 'A year has 12 months.', 'months', 'April', 'September');

// ---- M-1-C9 Tally charts ----

const ROW_Y = [0.4, 2.2, 4.0];
const MARK_H = 1.2;

// One tally mark is a stick. The fifth mark goes across the first four, to make a bundle of five.
function marks(prefix: string, value: number, y: number): Piece[] {
  return Array.from({ length: value }, (_, k): Piece => {
    const bundle = Math.floor(k / 5);
    const left = 2.2 + bundle * 2.6;
    if (k % 5 === 4) return { id: `${prefix}${k}`, look: text(' '), x: left - 0.15, y, w: 1.9, h: MARK_H, crossed: true };
    return { id: `${prefix}${k}`, look: text('|'), x: left + (k % 5) * 0.4, y, w: 0.4, h: MARK_H };
  });
}

function chartScene(prefix: string, vote: (typeof VOTES)[number], values: readonly number[]): Scene {
  const pieces = vote.rows.flatMap((row, r): Piece[] => [{ id: `${prefix}e${r}`, look: art(row.emoji), x: 0.4, y: ROW_Y[r] as number, w: MARK_H, h: MARK_H }, ...marks(`${prefix}r${r}m`, values[r] as number, ROW_Y[r] as number)]);
  return scene(pieces);
}

// Read one row: count the marks, the bundle as five, then on by ones.
function tallyRowMoments(prefix: string, vote: (typeof VOTES)[number], values: readonly number[], r: number): Moment[] {
  const value = values[r] as number;
  const row = vote.rows[r];
  const label = row?.label ?? '';
  const start = chartScene(prefix, vote, values);
  const markIds = ids(`${prefix}r${r}m`, value);
  const found = point(set(start, [`${prefix}e${r}`], { lit: true }), `${prefix}e${r}`);
  const out: Moment[] = [moment([`Find the ${label} row.`], `Find ${label}.`, found)];
  if (value >= 5) {
    const bundle = set(withoutHand(calm(found)), [`${prefix}e${r}`, ...markIds.slice(0, 5)], { lit: true });
    out.push(moment(['Here is a bundle. A bundle is five.'], 'A bundle is 5.', set(bundle, [`${prefix}r${r}m4`], { badge: '5' })));
    const counted = countAlong(set(bundle, markIds.slice(0, 5), { lit: true }), markIds.slice(5), 5);
    if (value > 5) out.push(moment(['Five, and count on.'], 'Start at 5 and count on.', bundle), ...counted.moments.map((each) => ({ ...each, scene: set(each.scene, markIds.slice(0, 5), { lit: true }) })));
  } else {
    out.push(...countAlong(withoutHand(found), markIds).moments);
  }
  out.push(moment(['So', { number: value }, `${vote.asked} ${label}.`], `${value} ${vote.asked} ${label}.`, set(withoutHand(calm(start)), [`${prefix}e${r}`, ...markIds], { lit: true })));
  return out;
}

function tallyWhy(question: Question): Moment[] {
  const vote = VOTES.find((each) => each.question === question.facts.vote) ?? (VOTES[0] as (typeof VOTES)[number]);
  const values = question.facts.values as number[];
  return tallyRowMoments('w', vote, values, num(question.facts, 'index'));
}

function tallyLesson(): Lesson {
  const pets = VOTES[0] as (typeof VOTES)[number];
  const values = [3, 6, 2];
  const chart = chartScene('x', pets, values);
  const valueOf = (f: Record<string, unknown>): number => (f.values as number[])[num(f, 'index')] as number;
  const one = turnQuestion('M-1-C9', 1, (f) => valueOf(f) >= 3 && valueOf(f) <= 4);
  const two = turnQuestion('M-1-C9', 1, (f) => valueOf(f) >= 7 && f.vote !== one.facts.vote);
  return {
    parts: [
      show(moment(['A tally chart counts with little marks. Each vote gets one mark.'], 'One mark for each vote.', chart)),
      show(moment(['Children voted for their favourite pet.'], 'Favourite pet', set(chart, ['xe0', 'xe1', 'xe2'], { lit: true }))),
      ...tallyRowMoments('x', pets, values, 0).map(show),
      show(moment(['When we get to five, the mark goes across the other four.'], 'The 5th mark goes across.', point(set(chart, ['xr1m4'], { lit: true }), 'xr1m4'))),
      ...tallyRowMoments('x', pets, values, 1).map(show),
      turn(one, tallyWhy(one)),
      show(moment(['Count a bundle as five, then count on.'], 'A bundle is 5. Count on.', set(chart, ids('xr1m', 5), { lit: true }))),
      turn(two, tallyWhy(two)),
      show(moment(['Find the row, and count the marks. A bundle is five.'], 'Find the row. Count the marks.', calm(chart))),
    ],
  };
}

// ---- M-1-C12 Taller than, shorter than ----

const SQUARE: Record<string, string> = { red: '🟥', blue: '🟦', yellow: '🟨', green: '🟩', orange: '🟧', purple: '🟪' };
const HEIGHT = [7, 5, 3]; // tallest, middle, shortest, as the questions draw them
const BLOCK = 0.62;
const BASE = 5.4;

function towerPieces(id: string, color: string, height: number, x: number, gone = false): Piece[] {
  return Array.from({ length: height }, (_, i) => ({ id: `${id}b${i}`, look: art(SQUARE[color] ?? '🟦'), x, y: round(BASE - (i + 1) * BLOCK), w: BLOCK, h: BLOCK, gone }));
}

const towerIds = (id: string, height: number): string[] => ids(`${id}b`, height);

// Clue one and clue two, then the three towers in one line, tallest first.
function towerMoments(prefix: string, pairs: [string, string][], ask: 'most' | 'least'): Moment[] {
  const bigs = pairs.map(([big]) => big);
  const smalls = pairs.map(([, small]) => small);
  const tall = bigs.find((color) => !smalls.includes(color)) as string;
  const short = smalls.find((color) => !bigs.includes(color)) as string;
  const middle = bigs.find((color) => smalls.includes(color)) as string;
  const height = (color: string): number => (color === tall ? HEIGHT[0] : color === middle ? HEIGHT[1] : HEIGHT[2]) as number;
  const [p1, p2] = pairs as [[string, string], [string, string]];
  // Each clue has its own two towers: c1a, c1b on the left, c2a, c2b on the right.
  const clueTowers = (gone: boolean): Piece[] => [
    ...towerPieces(`${prefix}c1a`, p1[0], height(p1[0]), 1.6),
    ...towerPieces(`${prefix}c1b`, p1[1], height(p1[1]), 2.6),
    ...towerPieces(`${prefix}c2a`, p2[0], height(p2[0]), 6.4, gone),
    ...towerPieces(`${prefix}c2b`, p2[1], height(p2[1]), 7.4, gone),
  ];
  const all = (id: string, color: string): string[] => towerIds(id, height(color));
  const clue1Ids = [...all(`${prefix}c1a`, p1[0]), ...all(`${prefix}c1b`, p1[1])];
  const clue2Ids = [...all(`${prefix}c2a`, p2[0]), ...all(`${prefix}c2b`, p2[1])];
  const first = set(scene(clueTowers(true)), clue1Ids, { lit: true });
  const second = set(set(scene(clueTowers(false)), clue1Ids, { dim: true }), clue2Ids, { lit: true });
  // Line up: tallest at 3, middle at 4.6, shortest at 6.2. The middle tower is in both clues, so its copies meet.
  const spot = (color: string): number => (color === tall ? 3 : color === middle ? 4.6 : 6.2);
  const towers: [string, string][] = [[`${prefix}c1a`, p1[0]], [`${prefix}c1b`, p1[1]], [`${prefix}c2a`, p2[0]], [`${prefix}c2b`, p2[1]]];
  const middleCopies = towers.filter(([, color]) => color === middle).map(([id]) => id);
  const lined = alter(scene(clueTowers(false)), (piece) => {
    const tower = towers.find(([id]) => piece.id.startsWith(`${id}b`));
    if (!tower) return piece;
    const moved = { ...piece, x: spot(tower[1]) };
    return tower[0] === middleCopies[1] ? { ...moved, gone: true } : moved;
  });
  const answer = ask === 'most' ? tall : short;
  const answerId = towers.find(([id, color]) => color === answer && id !== middleCopies[1])?.[0] as string;
  const picked = set(lined, all(answerId, answer), { lit: true });
  return [
    moment([`Clue one. The ${p1[0]} tower is taller than the ${p1[1]} tower.`], `${p1[0]} is taller than ${p1[1]}.`, first),
    moment([`Clue two. The ${p2[0]} tower is taller than the ${p2[1]} tower.`], `${p2[0]} is taller than ${p2[1]}.`, second),
    moment([`The ${middle} tower is in both clues. Let us line them all up.`], 'Line them up.', lined),
    moment([`${tall}, then ${middle}, then ${short}. Tallest to shortest.`], `${tall}, ${middle}, ${short}`, set(lined, [...all(answerId, answer)], { lit: false })),
    moment([`So the ${answer} tower is the ${ask === 'most' ? 'tallest' : 'shortest'}.`], `The ${answer} tower is the ${ask === 'most' ? 'tallest' : 'shortest'}.`, picked),
  ];
}

function towerWhy(question: Question): Moment[] {
  return towerMoments('w', question.facts.pairs as [string, string][], question.facts.ask === 'least' ? 'least' : 'most');
}

function tallerLesson(): Lesson {
  const drawable = (f: Record<string, unknown>): boolean => (f.options as string[]).every((color) => color in SQUARE);
  const one = turnQuestion('M-1-C12', 1, drawable);
  const two = turnQuestion('M-1-C12', 2, drawable);
  const worked = towerMoments('x', [['blue', 'green'], ['red', 'blue']], 'most');
  return {
    parts: [
      show(moment(['Two clues can tell us about three towers.'], 'Two clues, three towers.', worked[0]?.scene ?? scene([]))),
      ...worked.map(show),
      show(moment(['The tallest is first in the line. The shortest is last.'], 'Tallest first. Shortest last.', calm(last(worked, scene([]))))),
      turn(one, towerWhy(one)),
      show(moment(['To find the shortest, line them up the same way, and look at the end.'], 'The shortest is at the end.', calm(last(worked, scene([]))))),
      turn(two, towerWhy(two)),
      show(moment(['Line them up: tallest, middle, shortest.'], 'Tallest, middle, shortest.', calm(last(worked, scene([]))))),
    ],
  };
}

// ---- M-1-D1 Halves and fourths: are the parts equal? ----

// A rectangle cut into parts: each part is a cell, side by side, 5 squares wide in all.
const CUTS: Record<string, number[]> = { '2-true': [2.5, 2.5], '2-false': [3.6, 1.4], '4-true': [1.25, 1.25, 1.25, 1.25], '4-false': [2, 1.2, 0.6, 1.2] };

function cutScene(prefix: string, parts: number, equal: boolean): Scene {
  const widths = CUTS[`${parts}-${equal}`] ?? [2.5, 2.5];
  let x = 2.5;
  const pieces: Piece[] = widths.map((w, i) => {
    const piece: Piece = { id: `${prefix}p${i}`, look: { kind: 'cell' }, x: round(x), y: 1.2, w, h: 2.2 };
    x += w;
    return piece;
  });
  return scene(pieces);
}

function equalMoments(prefix: string, parts: number, equal: boolean): Moment[] {
  const cut = cutScene(prefix, parts, equal);
  const all = ids(`${prefix}p`, parts);
  const widths = CUTS[`${parts}-${equal}`] ?? [];
  const big = `${prefix}p${widths.indexOf(Math.max(...widths))}`;
  const small = `${prefix}p${widths.indexOf(Math.min(...widths))}`;
  return [
    moment(['This shape is cut into', { number: parts }, 'parts.'], `${parts} parts`, cut),
    moment(['Are the parts equal? Equal parts are all the same size.'], 'Equal parts are the same size.', set(cut, all, { lit: true })),
    equal
      ? moment(['Look at each part. They are all just as big.'], 'All the same size.', alter(cut, (piece) => ({ ...piece, lit: true, badge: 'same' })))
      : moment(['Look. This part is big, and this part is small.'], 'One big part, one small part.', set(set(point(cut, small), [big], { lit: true, badge: 'big' }), [small], { lit: true, badge: 'small' })),
    equal ? moment(['Yes. The parts are equal.'], 'Yes, equal parts.', set(cut, all, { lit: true })) : moment(['No. The parts are not the same size.'], 'No, not equal.', set(withoutHand(cut), [small], { crossed: true })),
  ];
}

function equalWhy(question: Question): Moment[] {
  return equalMoments('w', num(question.facts, 'parts'), question.facts.equal === true);
}

function halvesLesson(): Lesson {
  const fair = equalMoments('x', 2, true);
  const unfair = equalMoments('y', 2, false);
  const rect = (f: Record<string, unknown>): boolean => f.shape === 'rectangle';
  const one = turnQuestion('M-1-D1', 1, (f) => rect(f) && num(f, 'parts') === 4 && f.equal === true);
  const two = turnQuestion('M-1-D1', 1, (f) => rect(f) && num(f, 'parts') === 4 && f.equal === false);
  const fourths = cutScene('z', 4, true);
  return {
    parts: [
      show(moment(['Equal parts are the same size. Let us learn to spot them.'], 'Equal parts are the same size.', fair[0]?.scene ?? scene([]))),
      ...fair.map(show),
      show(moment(['Two equal parts are called halves. Each friend gets a fair share.'], 'Two equal parts are halves.', last(fair, scene([])))),
      ...unfair.map(show),
      show(moment(['Four equal parts are called fourths.'], 'Four equal parts are fourths.', set(fourths, ids('zp', 4), { lit: true }))),
      turn(one, equalWhy(one)),
      show(moment(['If one part is bigger than another, the parts are not equal.'], 'One bigger part: not equal.', calm(last(unfair, scene([]))))),
      turn(two, equalWhy(two)),
      show(moment(['Equal parts are all the same size.'], 'Equal parts: the same size.', calm(fourths))),
    ],
  };
}

// ---- M-1-D2 Closed or open ----

// A path of blocks around the edge of a square (4 by 4) or a rectangle (6 by 3), going round from the top left corner.
function outline(prefix: string, form: string): { pieces: Piece[]; corners: number[] } {
  const [across, down] = form === 'rectangle' ? [6, 3] : [4, 4];
  const size = 0.8;
  const left = (10 - across * size) / 2;
  const top = 0.9;
  const spots: [number, number][] = [];
  for (let i = 0; i < across; i += 1) spots.push([i, 0]);
  for (let j = 1; j < down; j += 1) spots.push([across - 1, j]);
  for (let i = across - 2; i >= 0; i -= 1) spots.push([i, down - 1]);
  for (let j = down - 2; j >= 1; j -= 1) spots.push([0, j]);
  const pieces = spots.map(([i, j], k): Piece => ({ id: `${prefix}b${k}`, look: { kind: 'cube' }, x: round(left + i * size), y: round(top + j * size), w: size, h: size }));
  return { pieces, corners: [0, across - 1, across + down - 2, 2 * across + down - 3] };
}

function closedMoments(prefix: string, form: string, open: boolean): Moment[] {
  const { pieces, corners } = outline(prefix, form);
  const gap = 1;
  const bugHome: Piece = { id: `${prefix}bug`, look: art('🐞'), x: 4.6, y: form === 'rectangle' ? 1.7 : 2.1, w: 0.8, h: 0.8 };
  const start = add(scene(pieces.map((piece, k) => (open && k === gap ? { ...piece, gone: true } : piece))), [bugHome]);
  const at = (k: number): string => `${prefix}b${k}`;
  const out: Moment[] = [moment([`Here is a ${form} made of blocks, with a bug inside.`], `A ${form} with a bug inside`, start)];
  if (open) {
    const gapPiece = pieces[gap] as Piece;
    out.push(
      moment(['Put your finger on the edge, and go all the way around.'], 'Trace around the edge.', point(set(start, [at(0)], { lit: true }), at(0))),
      moment(['Oh! Here is a gap. The path stops.'], 'A gap!', point(set(start, [at(0), at(2)], { lit: true }), at(0))),
      moment(['The bug can walk out through the gap.'], 'The bug gets out.', set(withoutHand(start), [`${prefix}bug`], { x: gapPiece.x, y: 0 })),
      moment(['Open. A shape with a gap is open.'], 'Open: it has a gap.', set(withoutHand(start), [`${prefix}bug`], { x: gapPiece.x, y: 0, lit: true })),
    );
    return out;
  }
  const words = ['Put your finger on the edge, and go all the way around.', 'Along the top.', 'Down the side.', 'Along the bottom.'];
  let now = start;
  corners.forEach((corner, i) => {
    now = point(set(now, ids(`${prefix}b`, corner + 1), { lit: true }), at(corner));
    out.push(moment([words[i] as string], words[i] as string, now));
  });
  const round_ = point(set(now, pieces.map((piece) => piece.id), { lit: true }), at(0));
  out.push(
    moment(['And back to the start. There is no gap.'], 'Back to the start. No gap.', round_),
    moment(['Closed. The bug cannot get out.'], 'Closed: no gap.', set(withoutHand(round_), [`${prefix}bug`], { lit: true })),
  );
  return out;
}

function closedWhy(question: Question): Moment[] {
  return closedMoments('w', str(question.facts, 'shape'), question.facts.open === true);
}

function closedLesson(): Lesson {
  const shut = closedMoments('x', 'square', false);
  const gap = closedMoments('y', 'square', true);
  const box = (f: Record<string, unknown>): boolean => f.shape === 'square' || f.shape === 'rectangle';
  const one = turnQuestion('M-1-D2', 3, (f) => box(f) && f.open !== true && f.shape === 'rectangle');
  const two = turnQuestion('M-1-D2', 3, (f) => box(f) && f.open === true && f.shape === 'rectangle');
  return {
    parts: [
      show(moment(['A shape can be closed or open. Let us see how to tell.'], 'Closed or open?', calm(shut[0]?.scene ?? scene([])))),
      ...shut.map(show),
      show(moment(['Now the same square has a gap.'], 'A square with a gap', calm(gap[0]?.scene ?? scene([])))),
      ...gap.slice(1).map(show),
      turn(one, closedWhy(one)),
      show(moment(['A closed shape goes all the way around. An open shape has a gap.'], 'Closed: all the way round. Open: a gap.', calm(last(gap, scene([]))))),
      turn(two, closedWhy(two)),
      show(moment(['No gap means closed. A gap means open.'], 'No gap: closed. Gap: open.', calm(last(shut, scene([]))))),
    ],
  };
}

// ---- M-1-D5 Halves are bigger than fourths ----

// Two bars the same size: the top one cut into halves, the bottom one into fourths.
function sharesScene(prefix: string): Scene {
  const halves = [0, 1].map((i): Piece => ({ id: `${prefix}h${i}`, look: { kind: 'cell' }, x: 3 + i * 2.5, y: 0.6, w: 2.5, h: 1.7 }));
  const fourths = [0, 1, 2, 3].map((i): Piece => ({ id: `${prefix}f${i}`, look: { kind: 'cell' }, x: 3 + i * 1.25, y: 3.2, w: 1.25, h: 1.7 }));
  const labels: Piece[] = [
    { id: `${prefix}lh`, look: text('½'), x: 0.8, y: 0.9, w: 1.4, h: 1.1, gone: true },
    { id: `${prefix}lf`, look: text('¼'), x: 0.8, y: 3.5, w: 1.4, h: 1.1, gone: true },
  ];
  return scene([...halves, ...fourths, ...labels]);
}

function shareMoments(prefix: string, food: string, ask: 'bigger' | 'smaller'): Moment[] {
  const start = sharesScene(prefix);
  const halved = set(set(start, ids(`${prefix}h`, 2), { lit: true }), [`${prefix}lh`], { gone: false });
  const quartered = set(set(calm(halved), ids(`${prefix}f`, 4), { lit: true }), [`${prefix}lf`], { gone: false });
  const compare = set(set(calm(quartered), [`${prefix}h1`, `${prefix}f1`, `${prefix}f2`, `${prefix}f3`], { dim: true }), [`${prefix}h0`, `${prefix}f0`], { lit: true });
  return [
    moment([`Think of two ${food}s, just the same size.`], `Two ${food}s, the same size`, start),
    moment(['Cut one into two equal parts. Each part is one half.'], '2 equal parts: halves', halved),
    moment(['Cut the other into four equal parts. Each part is one fourth.'], '4 equal parts: fourths', quartered),
    moment(['Now put one part of each side by side.'], 'Compare one part of each.', compare),
    ask === 'bigger'
      ? moment(['See? one half is bigger than one fourth.'], '½ is bigger than ¼.', set(compare, [`${prefix}h0`], { badge: 'bigger' }))
      : moment(['See? one fourth is smaller than one half.'], '¼ is smaller than ½.', set(compare, [`${prefix}f0`], { badge: 'smaller' })),
  ];
}

function shareWhy(question: Question): Moment[] {
  return shareMoments('w', str(question.facts, 'food'), question.facts.ask === 'smaller' ? 'smaller' : 'bigger');
}

function shareLesson(): Lesson {
  const worked = shareMoments('x', 'pizza', 'bigger');
  const one = turnQuestion('M-1-D5', 3, (f) => f.ask === 'bigger');
  const two = turnQuestion('M-1-D5', 3, (f) => f.ask === 'smaller' && f.food !== one.facts.food);
  return {
    parts: [
      show(moment(['When we cut something into more parts, each part gets smaller.'], 'More parts, smaller parts.', calm(worked[0]?.scene ?? scene([])))),
      ...worked.map(show),
      show(moment(['Two people share halves. Four people share fourths, so each part is smaller.'], 'More people, smaller parts.', calm(last(worked, scene([]))))),
      turn(one, shareWhy(one)),
      show(moment(['Which part is smaller? The one cut into more parts.'], 'More parts means smaller parts.', set(calm(last(worked, scene([]))), ids('xf', 4), { lit: true }))),
      turn(two, shareWhy(two)),
      show(moment(['More parts means smaller parts. A half is bigger than a fourth.'], '½ is bigger than ¼.', calm(last(worked, scene([]))))),
    ],
  };
}

// ---- M-1-E1 Number patterns ----

// Four numbers and a box for the next one, with the jump shown between each pair.
function patternScene(prefix: string, start: number, step: number): Scene {
  const numbers = [0, 1, 2, 3].map((i): Piece => ({ id: `${prefix}n${i}`, look: numeral(start + step * i), x: 0.3 + i * 2, y: 2.2, w: 1.5, h: 1.2 }));
  const jumps = [0, 1, 2, 3].map((i): Piece => ({ id: `${prefix}j${i}`, look: text(`+${step}`), x: 1.2 + i * 2, y: 0.9, w: 1.2, h: 0.8, gone: true }));
  return scene([...numbers, { id: `${prefix}box`, look: { kind: 'box' }, x: 8.3, y: 2.1, w: 1.4, h: 1.4 }, ...jumps]);
}

function patternMoments(prefix: string, start: number, step: number): Moment[] {
  const values = [0, 1, 2, 3].map((i) => start + step * i);
  const [a, b] = values as [number, number];
  const end = values[3] as number;
  const answer = end + step;
  const begin = patternScene(prefix, start, step);
  const firstJump = set(set(begin, [`${prefix}n0`, `${prefix}n1`], { lit: true }), [`${prefix}j0`], { gone: false, lit: true });
  const how: Say = step <= 2 ? ['Count up from', { number: a }, ':', ...Array.from({ length: step }, (_, i) => ({ number: a + i + 1 })), '. That is a jump of', { number: step }, '.'] : ['From', { number: a }, 'to', { number: b }, 'is a jump of', { number: step }, '.'];
  const allJumps = set(calm(firstJump), ids(`${prefix}j`, 3), { gone: false, lit: true });
  const lastJump = set(set(calm(allJumps), [`${prefix}n3`, `${prefix}box`], { lit: true }), [`${prefix}j3`], { gone: false, lit: true });
  const filled = alter(lastJump, (piece) => (piece.id === `${prefix}box` ? { ...piece, look: numeral(answer), lit: true } : piece));
  return [
    moment(['What comes next? Let us find the jump.'], 'Find the jump.', set(begin, [`${prefix}box`], { lit: true })),
    moment(how, `${a} to ${b} is +${step}.`, firstJump),
    moment(['Every jump is the same.'], `Every jump is +${step}.`, allJumps),
    moment(['Make the same jump once more, from', { number: end }, '.'], `${end} + ${step}`, lastJump),
    moment([{ number: end }, ', and', { number: step }, 'more, is', { number: answer }, '. Next is', { number: answer }, '.'], `${end} + ${step} = ${answer}`, filled),
  ];
}

function patternWhy(question: Question): Moment[] {
  return patternMoments('w', num(question.facts, 'start'), num(question.facts, 'step'));
}

function patternLesson(): Lesson {
  const worked = patternMoments('x', 3, 2);
  const fives = patternMoments('y', 4, 5);
  const one = turnQuestion('M-1-E1', 1, (f) => num(f, 'step') === 2 && num(f, 'start') <= 20 && num(f, 'start') !== 3);
  const two = turnQuestion('M-1-E1', 2, (f) => num(f, 'step') === 10 && num(f, 'start') <= 30);
  return {
    parts: [
      show(moment(['A number pattern makes the same jump each time.'], 'The same jump each time.', calm(worked[0]?.scene ?? scene([])))),
      ...worked.map(show),
      show(moment(['Find the jump, then make it once more.'], 'Find the jump. Do it again.', calm(last(worked, scene([]))))),
      turn(one, patternWhy(one)),
      show(moment(['Jumps can be bigger, like five or ten.'], 'Jumps can be 5 or 10.', calm(fives[0]?.scene ?? scene([])))),
      ...fives.slice(1).map(show),
      turn(two, patternWhy(two)),
      show(moment(['Look for the jump that stays the same.'], 'Look for the jump.', calm(last(fives, scene([]))))),
    ],
  };
}

// ---- M-1-C10 Sort into three groups ----

const GROUP_NAME: Record<string, string> = { animals: 'animals', vehicles: 'vehicles', clothes: 'clothes', food: 'food' };
const BIN_X = [0.3, 3.5, 6.7];

function emojiOf(word: string): string {
  return GROUP_WORDS.find((each) => each.word === word)?.emoji ?? '❓';
}

// The pictures in a row on top; three labelled groups on the table below.
function sortScene(prefix: string, words: readonly string[], groups: readonly string[]): Scene {
  const across = Math.min(1, 9.4 / words.length);
  const items = words.map((word, i): Piece => ({ id: `${prefix}i${i}`, look: art(emojiOf(word)), x: round(0.3 + i * across * 1.04), y: 0.6, w: across * 0.95, h: across * 0.95 }));
  const labels = groups.map((group, g): Piece => ({ id: `${prefix}g${g}`, look: text(GROUP_NAME[group] ?? group), x: BIN_X[g] as number, y: 2.6, w: 3, h: 0.6 }));
  return scene([...items, ...labels]);
}

// One moment for each picture: name it, say its kind, and slide it into that group.
function sortMoments(prefix: string, words: readonly string[], kinds: readonly string[], groups: readonly string[], tell: (word: string, group: string) => string): Moment[] {
  let now = sortScene(prefix, words, groups);
  const filled = groups.map(() => 0);
  return words.map((word, i) => {
    const g = groups.indexOf(kinds[i] as string);
    const k = filled[g] ?? 0;
    filled[g] = k + 1;
    now = alter(calm(now), (piece) => {
      if (piece.id === `${prefix}i${i}`) return { ...piece, x: round((BIN_X[g] as number) + 0.1 + (k % 3) * 0.95), y: round(3.5 + Math.floor(k / 3) * 0.95), w: 0.9, h: 0.9, lit: true };
      if (piece.id === `${prefix}g${g}`) return { ...piece, lit: true };
      return piece;
    });
    const label = GROUP_NAME[kinds[i] as string] ?? '';
    return moment([tell(word, label)], `${word}: ${label}`, now);
  });
}

function sortWhy(question: Question): Moment[] {
  const words = question.facts.items as string[];
  const kinds = question.facts.itemAttrs as string[];
  const groups = question.facts.binAttrs as string[];
  return [
    moment(['Take one picture at a time. Ask, what kind of thing is it?'], 'What kind of thing is it?', sortScene('w', words, groups)),
    ...sortMoments('w', words, kinds, groups, (word, label) => `The ${word} goes with the ${label}.`),
  ];
}

function sortLesson(): Lesson {
  const words = ['dog', 'car', 'shirt', 'cat', 'bus', 'sock'];
  const kinds = ['animals', 'vehicles', 'clothes', 'animals', 'vehicles', 'clothes'];
  const groups = ['animals', 'vehicles', 'clothes'];
  const start = sortScene('x', words, groups);
  const said: Record<string, string> = { animals: 'an animal', vehicles: 'a vehicle. It takes us places', clothes: 'clothes. We wear it' };
  const worked = sortMoments('x', words, kinds, groups, (word, label) => `A ${word} is ${said[label] ?? label}.`);
  const one = turnQuestion('M-1-C10', 1, (f) => !(f.binAttrs as string[]).includes('food'));
  const two = turnQuestion('M-1-C10', 2, (f) => (f.binAttrs as string[]).includes('food'));
  const done = last(worked, start);
  return {
    parts: [
      show(moment(['Sorting means putting things that belong together in one group.'], 'Things that belong together go in one group.', start)),
      show(moment(['Here are three groups: animals, vehicles, and clothes.'], 'Animals, vehicles, clothes', set(start, ids('xg', 3), { lit: true }))),
      show(moment(['Take one picture at a time, and ask: what kind of thing is it?'], 'What kind of thing is it?', point(start, 'xi0'))),
      ...worked.map(show),
      show(moment(['Now each group holds things of one kind.'], 'Each group holds one kind.', set(calm(done), ids('xi', 6), { lit: true }))),
      turn(one, sortWhy(one)),
      show(moment(['Food is things we eat, like an apple or bread.'], 'Food: things we eat.', calm(done))),
      turn(two, sortWhy(two)),
      show(moment(['One picture at a time. What kind is it? Put it in that group.'], 'One at a time. What kind is it?', calm(done))),
    ],
  };
}

// ---- M-1-D4 Faces of solid shapes ----

// Each solid as a thing a child knows, its name, and the print its flat face leaves in paint.
const SOLIDS = [
  { name: 'cube', emoji: '🧊', thing: 'an ice cube', faces: 6, face: 'square', print: '🟦' },
  { name: 'cylinder', emoji: '🥫', thing: 'a can', faces: 2, face: 'circle', print: '🔵' },
  { name: 'cone', emoji: '🍦', thing: 'an ice cream cone', faces: 1, face: 'circle', print: '🔵' },
  { name: 'sphere', emoji: '⚽', thing: 'a ball', faces: 0, face: '', print: '' },
] as const;

function solidsScene(prefix: string): Scene {
  return scene(
    SOLIDS.flatMap((solid, i): Piece[] => {
      const x = 0.4 + i * 2.4;
      const out: Piece[] = [
        { id: `${prefix}s${i}`, look: art(solid.emoji), x: x + 0.35, y: 0.5, w: 1.4, h: 1.4 },
        { id: `${prefix}n${i}`, look: text(solid.name), x, y: 2.1, w: 2.1, h: 0.6 },
      ];
      out.push(solid.print ? { id: `${prefix}p${i}`, look: art(solid.print), x: x + 0.55, y: 3.8, w: 1, h: 1, gone: true } : { id: `${prefix}p${i}`, look: text('none'), x: x + 0.2, y: 4, w: 1.7, h: 0.6, gone: true });
      return out;
    }),
  );
}

// Look at one solid, press its flat face in paint, and say what it prints.
function faceMoments(prefix: string, i: number, from = solidsScene(prefix)): Moment[] {
  const solid = SOLIDS[i] as (typeof SOLIDS)[number];
  const lit = point(set(calm(from), [`${prefix}s${i}`, `${prefix}n${i}`], { lit: true }), `${prefix}n${i}`);
  const printed = set(withoutHand(lit), [`${prefix}p${i}`], { gone: false, lit: true, badge: solid.faces > 0 ? String(solid.faces) : undefined });
  if (solid.faces === 0) {
    return [
      moment([`This is ${solid.thing}. It is a ${solid.name}.`], `${solid.thing}: a ${solid.name}`, lit),
      moment([`A ${solid.name} is round all over. It has no flat faces, so it rolls.`], `A ${solid.name} has no flat faces.`, printed),
    ];
  }
  const many = solid.faces === 1 ? 'one flat face' : `${['', 'one', 'two', 'three', 'four', 'five', 'six'][solid.faces] ?? ''} flat faces`;
  return [
    moment([`This is ${solid.thing}. It is a ${solid.name}.`], `${solid.thing}: a ${solid.name}`, lit),
    moment(['Press a flat side in paint, and stamp it on paper.'], 'Stamp a flat face.', set(lit, [`${prefix}p${i}`], { gone: false })),
    moment([`It prints a ${solid.face}. A ${solid.name} has ${many}, and each one is a ${solid.face}.`], `${solid.faces} flat ${solid.faces === 1 ? 'face' : 'faces'}: ${solid.face}`, printed),
  ];
}

const WANT_SOLID: Record<string, number> = { square: 0, two: 1, one: 2, none: 3 };

function facesWhy(question: Question): Moment[] {
  const index = question.facts.ask === 'faceShape' ? SOLIDS.findIndex((each) => each.name === question.facts.solid) : (WANT_SOLID[str(question.facts, 'want')] ?? 0);
  const solid = SOLIDS[index] as (typeof SOLIDS)[number];
  const all = alter(solidsScene('w'), (piece) => (piece.id.startsWith('wp') ? { ...piece, gone: false } : piece));
  const out: Moment[] = [moment(['Look at the flat faces each shape prints.'], 'What does each flat face print?', all), ...faceMoments('w', index, all)];
  if (question.facts.ask !== 'faceShape') out.push(moment([`So the answer is the ${solid.name}.`], `The ${solid.name}`, set(all, [`ws${index}`, `wn${index}`, `wp${index}`], { lit: true })));
  return out;
}

function facesLesson(): Lesson {
  const start = solidsScene('x');
  const cylinder = faceMoments('x', 1);
  const cube = faceMoments('x', 0, last(cylinder, start));
  const keep = (from: Scene, shown: number[]): Scene => set(from, shown.map((i) => `xp${i}`), { gone: false });
  const cone = faceMoments('x', 2, keep(last(cube, start), [0, 1]));
  const sphere = faceMoments('x', 3, keep(last(cone, start), [0, 1, 2]));
  const one = turnQuestion('M-1-D4', 1, (f) => f.solid === 'cylinder');
  const two = turnQuestion('M-1-D4', 2, (f) => f.want === 'none' || f.want === 'one');
  return {
    parts: [
      show(moment(['A face is a flat side of a solid shape. Let us find the faces.'], 'A face is a flat side.', start)),
      ...cylinder.map(show),
      ...cube.map((each) => show({ ...each, scene: keep(each.scene, [1]) })),
      show(moment(['The shape a face prints is the shape of that face.'], 'The print shows the face.', keep(calm(last(cube, start)), [0, 1]))),
      turn(one, facesWhy(one)),
      ...cone.map(show),
      ...sphere.map(show),
      turn(two, facesWhy(two)),
      show(moment(['Flat sides are faces. Round parts are not.'], 'Flat sides are faces.', calm(last(sphere, start)))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-1-C7': daysLesson,
  'M-1-C8': monthsLesson,
  'M-1-C9': tallyLesson,
  'M-1-C10': sortLesson,
  'M-1-C12': tallerLesson,
  'M-1-D1': halvesLesson,
  'M-1-D2': closedLesson,
  'M-1-D4': facesLesson,
  'M-1-D5': shareLesson,
  'M-1-E1': patternLesson,
};
