import type { Question, Say, ShapeName, Visual } from '../../engine/types';
import { add, alter, moment, picture, pointAt, scene, set, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Reasoning lessons that teach (plan section 16) whose scenes use the questions' own pictures (the `picture` piece):
// figure analogies, figure matrices, turning shapes, mirror images, two-rule patterns, paper folding and
// pattern completion.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });
// One spoken line that is also the words under the stage.
const told = (line: string, from: Scene): Moment => moment([line] satisfies Say, line, from);

type Size = 's' | 'm' | 'l';
type Cell = Visual | 'blank';
type ShapePicture = Extract<Visual, { kind: 'shape' }>;

const fig = (form: ShapeName, color: string, size: Size = 'm', rotation = 0): Visual => ({ kind: 'shape', shape: form, color, size, rotation });
const a = (word: string): string => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);
const SIZE_WORD: Record<string, string> = { s: 'small', m: 'big', l: 'big' };
// Where an arrow points after each quarter turn.
const POINTS = ['up', 'to the right', 'down', 'to the left'];

// A piece fills its place whatever the picture's own size, so a small shape is given a smaller place.
const SCALE: Record<Size, number> = { s: 0.55, m: 1, l: 1 };

// A picture in the middle of a square place whose corner is (x, y) and whose side is `box`.
function placed(id: string, visual: Visual, x: number, y: number, box: number, fields: Partial<Piece> = {}): Piece {
  const side = box * (visual.kind === 'shape' ? SCALE[visual.size] : 1);
  const pad = (box - side) / 2;
  return { id, look: picture(visual), x: x + pad, y: y + pad, w: side, h: side, ...fields };
}

// The scene with every highlight off. Badges stay (calm takes them off too).
const rest = (from: Scene): Scene => alter(from, (piece) => ({ ...piece, lit: undefined }));
const light = (from: Scene, pieceIds: readonly string[]): Scene => set(rest(from), pieceIds, { lit: true });
// The piece with this id swapped for another (the empty box for its answer).
const swap = (from: Scene, id: string, piece: Piece): Scene => alter(from, (each) => (each.id === id ? piece : each));

function choice(question: Question): Extract<Question, { type: 'choice' }> {
  if (question.type !== 'choice') throw new Error(`${question.skillId} is not a choice question`);
  return question;
}
function rightOption(question: Question): Visual {
  const q = choice(question);
  const option = q.options[q.answerIndex];
  if (!option) throw new Error(`${question.skillId} has no right option`);
  return option;
}
// The right option as the facts write it: "circle|red|s".
function rightCode(question: Question): string[] {
  const options = question.facts.options;
  const value = Array.isArray(options) ? options[choice(question).answerIndex] : undefined;
  if (typeof value !== 'string') throw new Error(`${question.skillId} has no option codes`);
  return value.split('|');
}
function strings(facts: Record<string, unknown>, key: string): string[] {
  const value = facts[key];
  if (!Array.isArray(value)) throw new Error(`facts.${key} is not a list`);
  return value.map(String);
}
function numberOf(facts: Record<string, unknown>, key: string): number {
  const value = facts[key];
  if (typeof value !== 'number') throw new Error(`facts.${key} is not a number`);
  return value;
}
function shapeOf(visual: Cell | undefined): ShapePicture {
  if (!visual || visual === 'blank' || visual.kind !== 'shape') throw new Error('Not a shape');
  return visual;
}
function cellsOf(question: Question): Cell[] {
  const stimulus = question.stimulus;
  if (stimulus?.kind === 'matrix') return stimulus.cells;
  if (stimulus?.kind === 'sequence') return stimulus.items;
  throw new Error(`${question.skillId} has no grid or row`);
}

// ---- Grids (figure matrices and pattern completion) ----

// A grid of pictures in the middle of the stage, 2 by 2 or 3 by 3. The empty box is a dashed box.
// Ids: prefix + c + index for what is in a cell, prefix + f + index for the frame around it.
const GRID_TOP = 0.1;
const gridCell = (n: number): number => (n === 2 ? 1.5 : 1);
const gridX = (n: number, i: number): number => 5 - (n * gridCell(n)) / 2 + (i % n) * gridCell(n);
const gridY = (n: number, i: number): number => GRID_TOP + Math.floor(i / n) * gridCell(n);
const gridInset = (n: number): number => (n === 2 ? 0.2 : 0);

function gridPiece(p: string, n: number, i: number, cell: Cell, fields: Partial<Piece> = {}): Piece {
  const inset = gridInset(n);
  const box = gridCell(n) - inset * 2;
  if (cell === 'blank') return { id: `${p}c${i}`, look: { kind: 'box' }, x: gridX(n, i) + inset, y: gridY(n, i) + inset, w: box, h: box, ...fields };
  return placed(`${p}c${i}`, cell, gridX(n, i) + inset, gridY(n, i) + inset, box, fields);
}

function gridScene(p: string, cells: readonly Cell[], framed: boolean): Scene {
  const n = cells.length > 4 ? 3 : 2;
  const frames: Piece[] = framed ? cells.map((_, i) => ({ id: `${p}f${i}`, look: { kind: 'cell' }, x: gridX(n, i), y: gridY(n, i), w: gridCell(n), h: gridCell(n) })) : [];
  return scene([...frames, ...cells.map((cell, i) => gridPiece(p, n, i, cell))]);
}

const rowIds = (p: string, n: number, r: number): string[] => Array.from({ length: n }, (_, c) => `${p}c${r * n + c}`);
const colIds = (p: string, n: number, c: number): string[] => Array.from({ length: n }, (_, r) => `${p}c${r * n + c}`);
const filled = (from: Scene, p: string, n: number, i: number, answer: Visual): Scene => swap(rest(from), `${p}c${i}`, gridPiece(p, n, i, answer, { lit: true }));

// ---- R-A3 Figure analogies ----

// Two pairs, one above the other, as the question's grid shows them: first → second, third → empty box.
const PAIR_X = [2.6, 5.6] as const;
const PAIR_Y = [0.1, 1.7] as const;
const PAIR_BOX = 1.4;

function pairScene(p: string, from: Visual, to: Visual, base: Visual): Scene {
  return scene([
    placed(`${p}from`, from, PAIR_X[0], PAIR_Y[0], PAIR_BOX),
    { id: `${p}arrow0`, look: text('→'), x: 4.3, y: 0.3, w: 1, h: 1 },
    placed(`${p}to`, to, PAIR_X[1], PAIR_Y[0], PAIR_BOX),
    placed(`${p}base`, base, PAIR_X[0], PAIR_Y[1], PAIR_BOX),
    { id: `${p}arrow1`, look: text('→'), x: 4.3, y: 1.9, w: 1, h: 1 },
    { id: `${p}answer`, look: { kind: 'box' }, x: PAIR_X[1], y: PAIR_Y[1], w: PAIR_BOX, h: PAIR_BOX },
  ]);
}

interface Change {
  what: string; // 'size'
  was: string; // 'big'
  now: string; // 'small'
}

// A figure as the facts write it: [shape, colour, size].
const ATTRIBUTE = ['shape', 'color', 'size'] as const;
const figureWord = (i: number, value: string): string => (i === 2 ? (SIZE_WORD[value] ?? value) : value);
const figureName = (figure: readonly string[]): string => `${figureWord(2, figure[2] ?? '')} ${figure[1] ?? ''} ${figure[0] ?? ''}`;

function pairMoments(p: string, start: Scene, changes: readonly Change[], baseName: string, answer: Visual, answerName: string): Moment[] {
  const pair = light(start, [`${p}from`, `${p}to`]);
  const moments: Moment[] = [told('Look at the first pair.', pair)];
  let now = pair;
  changes.forEach((change, i) => {
    now = set(now, [`${p}arrow0`], { badge: changes.slice(0, i + 1).map((each) => each.what).join(' + ') });
    moments.push(told(`The ${change.what} changed, from ${change.was}, to ${change.now}.`, now));
  });
  now = light(now, [`${p}base`]);
  moments.push(told(`The second pair starts with ${a(baseName)}.`, now));
  const done = swap(rest(now), `${p}answer`, placed(`${p}answer`, answer, PAIR_X[1], PAIR_Y[1], PAIR_BOX, { lit: true }));
  const both = changes.length > 1 ? 'Make the same changes.' : 'Make the same change, and nothing else.';
  moments.push(told(`${both} It becomes ${a(answerName)}.`, set(done, [`${p}arrow1`], { badge: changes.map((each) => each.what).join(' + ') })));
  return moments;
}

function analogyWhy(question: Question): Moment[] {
  const [from, to, base] = [strings(question.facts, 'from'), strings(question.facts, 'to'), strings(question.facts, 'base')];
  const cells = cellsOf(question);
  const changes = [0, 1, 2].filter((i) => from[i] !== to[i]).map((i): Change => ({ what: ATTRIBUTE[i] ?? '', was: figureWord(i, from[i] ?? ''), now: figureWord(i, to[i] ?? '') }));
  const start = pairScene('w', shapeOf(cells[0]), shapeOf(cells[1]), shapeOf(cells[2]));
  return pairMoments('w', start, changes, figureName(base), rightOption(question), figureName(rightCode(question)));
}

export function figureAnalogyLesson(): Lesson {
  const one = pairScene('x', fig('circle', 'red', 'l'), fig('circle', 'red', 's'), fig('square', 'blue', 'l'));
  const oneMoments = pairMoments('x', one, [{ what: 'size', was: 'big', now: 'small' }], 'big blue square', fig('square', 'blue', 's'), 'small blue square');
  const two = pairScene('y', fig('star', 'green', 'l'), fig('star', 'orange', 's'), fig('heart', 'green', 'l'));
  const twoMoments = pairMoments(
    'y',
    two,
    [
      { what: 'colour', was: 'green', now: 'orange' },
      { what: 'size', was: 'big', now: 'small' },
    ],
    'big green heart',
    fig('heart', 'orange', 's'),
    'small orange heart',
  );
  const first = turnQuestion('R-A3', 1, (f) => strings(f, 'from')[2] !== strings(f, 'to')[2]);
  const second = turnQuestion('R-A3', 2, (f) => strings(f, 'from')[0] === strings(f, 'to')[0]);
  return {
    parts: [
      show(told('The first pair changes in a secret way. Let us find the change, and do it again.', one)),
      ...oneMoments.map(show),
      show(told('Find what changed in the first pair. Then do the same to the second pair.', light(oneMoments.at(-1)?.scene ?? one, ['xarrow0', 'xarrow1']))),
      turn(first, analogyWhy(first)),
      show(told('Sometimes two things change at once.', two)),
      ...twoMoments.map(show),
      turn(second, analogyWhy(second)),
      show(told('Find every change. Then do them all again.', light(twoMoments.at(-1)?.scene ?? two, ['yarrow0', 'yarrow1']))),
    ],
  };
}

// ---- R-A4 Figure matrices ----

const PLURAL: Record<string, string> = { circle: 'circles', square: 'squares', triangle: 'triangles', star: 'stars', heart: 'hearts' };

// Across the row of the empty box, down its column, then the answer in the box.
function matrixMoments(p: string, cells: readonly Cell[], blank: number, answer: Visual, lines: readonly [string, string, string]): Moment[] {
  const start = gridScene(p, cells, true);
  const [r, c] = [Math.floor(blank / 2), blank % 2];
  return [told(lines[0], light(start, rowIds(p, 2, r))), told(lines[1], light(start, colIds(p, 2, c))), told(lines[2], filled(start, p, 2, blank, answer))];
}

function matrixWhy(question: Question): Moment[] {
  const facts = question.facts;
  const blank = numberOf(facts, 'blank');
  const [rowAttr, colAttr] = rightCode(question);
  const count = rowAttr === '1' ? 'one' : 'two';
  const form = String(facts.shape ?? 'shape');
  const lines: [string, string, string] =
    question.level === 2
      ? [
          `Look across the row with the empty box. Each box in this row has ${count}.`,
          `Now look down the column. This column is all ${SIZE_WORD[colAttr ?? ''] ?? ''}.`,
          `So the box needs ${count} ${SIZE_WORD[colAttr ?? ''] ?? ''} ${rowAttr === '1' ? form : (PLURAL[form] ?? `${form}s`)}.`,
        ]
      : question.level === 3
      ? [
          `Look across the row with the empty box. This row is ${rowAttr}.`,
          `Now look down the column. This column points ${POINTS[Number(colAttr)] ?? ''}.`,
          `So the box needs ${a(`${rowAttr} arrow`)}, pointing ${POINTS[Number(colAttr)] ?? ''}.`,
        ]
      : [
          `Look across the row with the empty box. It is a row of ${PLURAL[rowAttr ?? ''] ?? 'shapes'}.`,
          `Now look down the column. This column is ${colAttr}.`,
          `So the box needs ${a(`${colAttr} ${rowAttr}`)}.`,
        ];
  return matrixMoments('w', cellsOf(question), blank, rightOption(question), lines);
}

export function figureMatrixLesson(): Lesson {
  const cells: Cell[] = [fig('circle', 'red'), fig('circle', 'blue'), fig('square', 'red'), 'blank'];
  const one = gridScene('x', cells, true);
  const solved = filled(one, 'x', 2, 3, fig('square', 'blue'));
  // The next kind the questions ask: rows share how many, columns share the size.
  const stars = (count: number, size: Size): Visual => ({ kind: 'row', children: Array.from({ length: count }, () => fig('star', 'green', size)) });
  const counted: Cell[] = [stars(1, 'm'), stars(1, 's'), stars(2, 'm'), 'blank'];
  const two = gridScene('y', counted, true);
  const solvedTwo = filled(two, 'y', 2, 3, stars(2, 's'));
  const first = turnQuestion('R-A4', 1);
  const second = turnQuestion('R-A4', 2, (f) => f.shape !== 'star');
  return {
    parts: [
      show(told('This grid has an empty box. Let us find what goes in it.', light(one, ['xc3']))),
      show(told('Rows go across. The top row is all circles.', light(one, rowIds('x', 2, 0)))),
      show(told('The bottom row has a square. So the box needs a square.', light(one, rowIds('x', 2, 1)))),
      show(told('Columns go down. This column is all red.', light(one, colIds('x', 2, 0)))),
      show(told('This column has a blue one. So the box needs blue.', light(one, colIds('x', 2, 1)))),
      show(told('A square, and blue. A blue square goes in the box.', solved)),
      show(told('Look across the row. Then look down the column.', light(solved, [...rowIds('x', 2, 1), ...colIds('x', 2, 1)]))),
      turn(first, matrixWhy(first)),
      show(told('Here, every shape is a green star. Look at how many, and how big.', two)),
      show(told('Look across. The top row has one star in each box.', light(two, rowIds('y', 2, 0)))),
      show(told('The bottom row has two stars. So the box needs two.', light(two, rowIds('y', 2, 1)))),
      show(told('Look down. This column is all big.', light(two, colIds('y', 2, 0)))),
      show(told('This column has a small one. So the box needs small stars.', light(two, colIds('y', 2, 1)))),
      show(told('Two, and small. Two small stars go in the box.', solvedTwo)),
      turn(second, matrixWhy(second)),
      show(told('Across, then down. The answer must fit both.', light(solvedTwo, [...rowIds('y', 2, 1), ...colIds('y', 2, 1)]))),
    ],
  };
}

// ---- R-A5 Turning shapes ----

// Three shapes in a row and an empty box, with a turn sign between each two.
const STEP_X = (i: number): number => 0.8 + i * 2.2;
const STEP_Y = 0.7;
const STEP_BOX = 1.6;

function stepScene(p: string, items: readonly Visual[]): Scene {
  const shapes = items.map((item, i) => placed(`${p}s${i}`, item, STEP_X(i), STEP_Y, STEP_BOX));
  const box: Piece = { id: `${p}s${items.length}`, look: { kind: 'box' }, x: STEP_X(items.length), y: STEP_Y, w: STEP_BOX, h: STEP_BOX };
  const signs: Piece[] = items.map((_, i) => ({ id: `${p}t${i}`, look: text('↻'), x: STEP_X(i) + STEP_BOX, y: STEP_Y + 0.5, w: 0.6, h: 0.6, gone: true }));
  return scene([...shapes, box, ...signs]);
}

// Step `i`: the shapes on both sides of turn sign `i` light up, and the sign shows.
const stepLit = (from: Scene, p: string, i: number): Scene => set(light(from, [`${p}s${i}`, `${p}s${i + 1}`]), [`${p}t${i}`], { gone: false });
const stepDone = (from: Scene, p: string, at: number, answer: Visual): Scene => swap(rest(from), `${p}s${at}`, placed(`${p}s${at}`, answer, STEP_X(at), STEP_Y, STEP_BOX, { lit: true }));

function stepMoments(p: string, items: readonly Visual[], answer: Visual, far: 'quarter' | 'half', last: string): Moment[] {
  const start = stepScene(p, items);
  const one = stepLit(start, p, 0);
  const two = stepLit(one, p, 1);
  const three = stepLit(two, p, 2);
  return [
    told(`Look at the first two. The shape turned a ${far} turn.`, one),
    told(`Then it turned a ${far} turn again.`, two),
    told(`So turn the last one a ${far} turn more.`, three),
    told(last, stepDone(three, p, items.length, answer)),
  ];
}

function turningWhy(question: Question): Moment[] {
  const items = cellsOf(question).filter((item): item is Visual => item !== 'blank');
  const answer = shapeOf(rightOption(question));
  const far = question.facts.step === 2 ? 'half' : 'quarter';
  const last = answer.shape === 'arrow' ? `Now it points ${POINTS[(answer.rotation / 90) % 4] ?? ''}.` : 'This is how it looks after the turn.';
  return stepMoments('w', items, answer, far, last);
}

export function turningShapesLesson(): Lesson {
  const arrow = (quarter: number): Visual => fig('arrow', 'blue', 'm', quarter * 90);
  const start = stepScene('x', [arrow(0), arrow(1), arrow(2)]);
  const one = stepLit(start, 'x', 0);
  const two = stepLit(one, 'x', 1);
  const three = stepLit(two, 'x', 2);
  const done = stepDone(three, 'x', 3, arrow(3));
  const bend = (quarter: number): Visual => fig('lShape', 'green', 'm', quarter * 90);
  const bends = stepMoments('y', [bend(0), bend(1), bend(2)], bend(3), 'quarter', 'This is how it looks after the turn.');
  const first = turnQuestion('R-A5', 1, (f) => f.startTurn !== 0);
  const second = turnQuestion('R-A5', 2, (f) => f.startTurn !== 0);
  return {
    parts: [
      show(told('This arrow turns a little each step. Let us see how it turns.', start)),
      show(told('First, it points up.', light(start, ['xs0']))),
      show(told('Next, it points to the right. It turned one step, the way the hands of a clock go. We call that a quarter turn.', one)),
      show(told('Then it points down. It turned a quarter turn again.', two)),
      show(told('Every step is the same turn. So turn it once more.', three)),
      show(told('Now it points to the left.', done)),
      show(told('See how far it turns each step. Then turn the last one the same way.', light(done, ['xt0', 'xt1', 'xt2']))),
      turn(first, turningWhy(first)),
      show(told('This shape turns the same way, a quarter turn each step.', stepScene('y', [bend(0), bend(1), bend(2)]))),
      ...bends.map(show),
      turn(second, turningWhy(second)),
      show(told('Follow the turn, one step more.', light(bends.at(-1)?.scene ?? start, ['yt0', 'yt1', 'yt2']))),
    ],
  };
}

// ---- R-A6 Mirror images ----

// The shape on the left, a mirror down the middle, and the mirror picture on the right.
const MIRROR_Y = 0.5;
const MIRROR_BOX = 2.2;
const SEEN_X = 6.4;
const mirrorLine = (p: string): Piece => ({ id: `${p}mirror`, look: text('│'), x: 4.6, y: 0.2, w: 0.8, h: 2.8, badge: 'mirror' });

function mirrorScene(p: string, shown: Visual): Scene {
  return scene([placed(`${p}shape`, shown, 1.4, MIRROR_Y, MIRROR_BOX), mirrorLine(p)]);
}
const seen = (p: string, image: Visual, fields: Partial<Piece> = {}): Piece => placed(`${p}seen`, image, SEEN_X, MIRROR_Y, MIRROR_BOX, fields);
const flipped = (form: ShapeName, color: string, rotation = 0): Visual => ({ kind: 'shape', shape: form, color, size: 'm', rotation, flip: true });

function mirrorWhy(question: Question): Moment[] {
  const stimulus = question.stimulus;
  if (!stimulus) throw new Error('A mirror question shows a shape');
  const start = mirrorScene('w', stimulus);
  // The side of the shape that faces the mirror.
  const side: Piece = { id: 'side', look: { kind: 'hand' }, x: 1.4 + MIRROR_BOX - 0.5, y: MIRROR_Y + 0.6, w: 0.5, h: 0.6 };
  const looked = pointAt(light(start, ['wshape']), side);
  const flippedOver = add(withoutHand(rest(looked)), [seen('w', rightOption(question))]);
  return [
    told('Look at the side next to the mirror. A part sticks out toward the mirror.', looked),
    told('In the mirror, it flipped. That part now sticks out the other way, and the top is still at the top.', flippedOver),
    told('This is the mirror picture.', light(flippedOver, ['wseen'])),
  ];
}

export function mirrorImagesLesson(): Lesson {
  const arrow = mirrorScene('x', fig('arrow', 'purple', 'm', 90));
  const arrowSeen = add(rest(arrow), [seen('x', fig('arrow', 'purple', 'm', 270), { lit: true })]);
  // Three flags to choose from, as the questions offer: the same again, upside down, and the mirror picture.
  const flag = fig('flag', 'blue');
  const picks = [flag, fig('flag', 'blue', 'm', 180), flipped('flag', 'blue')];
  const flags = scene([placed('yshape', flag, 1.4, MIRROR_Y, MIRROR_BOX), mirrorLine('y'), ...picks.map((pick, i) => placed(`yp${i}`, pick, 5.7 + i * 1.45, 0.95, 1.3))]);
  const same = set(light(flags, ['yp0']), ['yp0'], { crossed: true });
  const upsideDown = set(light(same, ['yp1']), ['yp1'], { crossed: true });
  const right = set(light(upsideDown, ['yp2']), ['yp0', 'yp1'], { dim: true });
  // The next shape, in front of the mirror, with the hand on the side that faces it. Its mirror picture is left for the child.
  const bentShape = mirrorScene('z', fig('lShape', 'green'));
  const bentSide: Piece = { id: 'zside', look: { kind: 'hand' }, x: 1.4 + MIRROR_BOX - 0.5, y: MIRROR_Y + 0.6, w: 0.5, h: 0.6 };
  const first = turnQuestion('R-A6', 1, (f) => f.color !== 'blue');
  const second = turnQuestion('R-A6', 2);
  return {
    parts: [
      show(told('A mirror shows a picture flipped. Let us see how.', light(arrow, ['xmirror']))),
      show(told('This arrow points at the mirror.', light(arrow, ['xshape']))),
      show(told('The mirror picture points the other way. It flipped.', arrowSeen)),
      show(told('A mirror swaps the two sides. The top stays at the top.', light(arrowSeen, ['xshape', 'xseen']))),
      show(told('Be careful. Here are three flags. Only one is the mirror picture.', light(flags, ['yp0', 'yp1', 'yp2']))),
      show(told('This one is just the same. It did not flip.', same)),
      show(told('This one is upside down. It turned. It did not flip.', upsideDown)),
      show(told('This one waves the other way, and its top is still at the top. It is the mirror picture.', right)),
      turn(first, mirrorWhy(first)),
      show(told('Now a new shape. Find the part that sticks out toward the mirror.', pointAt(light(bentShape, ['zshape']), bentSide))),
      show(told('In the mirror, that part will stick out the other way.', light(withoutHand(pointAt(bentShape, bentSide)), ['zmirror']))),
      turn(second, mirrorWhy(second)),
      show(told('In a mirror, the sides swap. The top stays on top.', light(right, ['yshape', 'yp2']))),
    ],
  };
}

// ---- R-A7 Two-rule patterns ----

// The pattern in a row across the top (up to seven shapes and a box). Under it, each rule on its own:
// the colours alone as blobs, then the sizes or the shapes alone in black.
const BEAT_X = (i: number): number => 0.2 + i * 1.2;

interface Rule {
  name: string; // 'colour'
  words: string[]; // one for each shape shown, then the next one
  pictures: Visual[];
}

const blob = (color: string): Visual => fig('oval', color);

function ruleScene(p: string, items: readonly Visual[], rules: readonly [Rule, Rule]): Scene {
  const top = items.map((item, i) => placed(`${p}s${i}`, item, BEAT_X(i), 0.2, 1.1));
  const box: Piece = { id: `${p}s${items.length}`, look: { kind: 'box' }, x: BEAT_X(items.length), y: 0.2, w: 1.1, h: 1.1 };
  const under = rules.flatMap((rule, k) => rule.pictures.map((each, i) => placed(`${p}r${k}n${i}`, each, BEAT_X(i) + (k === 0 ? 0.25 : 0.2), k === 0 ? 1.55 : 2.3, k === 0 ? 0.6 : 0.7, { gone: true })));
  return scene([...top, box, ...under]);
}

function ruleMoments(p: string, items: readonly Visual[], rules: readonly [Rule, Rule], answer: Visual, answerName: string): Moment[] {
  const n = items.length;
  const moments: Moment[] = [];
  let now = ruleScene(p, items, rules);
  rules.forEach((rule, k) => {
    const row = Array.from({ length: n }, (_, i) => `${p}r${k}n${i}`);
    now = set(rest(now), row, { gone: false });
    moments.push(told(`${k === 0 ? 'Look' : 'Now look'} only at the ${rule.name}. It goes ${rule.words.slice(0, n).join(', ')}.`, now));
    now = set(rest(now), [`${p}r${k}n${n}`], { gone: false, lit: true });
    const next = rule.words[n] ?? '';
    moments.push(told(`So the next ${rule.name} is ${rule.name === 'shape' ? a(next) : next}.`, now));
  });
  const done = swap(set(rest(now), [`${p}r0n${n}`, `${p}r1n${n}`], { lit: true }), `${p}s${n}`, placed(`${p}s${n}`, answer, BEAT_X(n), 0.2, 1.1, { lit: true }));
  moments.push(told(`Put them together. Next is ${a(answerName)}.`, done));
  return moments;
}

// The two rules of a pattern, read from its repeating unit: "red|l" (colour and size) or "red|circle" (colour and shape).
function rulesOf(unit: readonly string[], shown: number, form: ShapeName, bySize: boolean): [Rule, Rule] {
  const beats = Array.from({ length: shown + 1 }, (_, i) => (unit[i % unit.length] ?? '').split('|'));
  const colours = beats.map((beat) => beat[0] ?? '');
  const others = beats.map((beat) => beat[1] ?? '');
  return [
    { name: 'colour', words: colours, pictures: colours.map(blob) },
    bySize
      ? { name: 'size', words: others.map((size) => SIZE_WORD[size] ?? size), pictures: others.map((size) => fig(form, 'black', size as Size)) }
      : { name: 'shape', words: others, pictures: others.map((each) => fig(each as ShapeName, 'black')) },
  ];
}

function patternWhy(question: Question): Moment[] {
  const items = cellsOf(question).filter((item): item is Visual => item !== 'blank');
  const bySize = question.level === 1;
  const rules = rulesOf(strings(question.facts, 'unit'), numberOf(question.facts, 'shown'), shapeOf(items[0]).shape, bySize);
  const [colour, other] = rightCode(question);
  const form = shapeOf(rightOption(question)).shape;
  const name = bySize ? `${SIZE_WORD[other ?? ''] ?? ''} ${colour} ${form}` : `${colour} ${form}`;
  return ruleMoments('w', items, rules, rightOption(question), name);
}

export function twoRulePatternLesson(): Lesson {
  const sizeUnit = ['red|l', 'red|s', 'blue|l', 'blue|s'];
  const sized = Array.from({ length: 6 }, (_, i) => fig('circle', i % 4 < 2 ? 'red' : 'blue', i % 2 === 0 ? 'l' : 's'));
  const sizeRules = rulesOf(sizeUnit, 6, 'circle', true);
  const one = ruleMoments('x', sized, sizeRules, fig('circle', 'blue', 'l'), 'big blue circle');
  const shapeUnit = ['green|square', 'yellow|square', 'green|triangle', 'yellow|triangle'];
  const formed = Array.from({ length: 5 }, (_, i) => fig(i % 4 < 2 ? 'square' : 'triangle', i % 2 === 0 ? 'green' : 'yellow'));
  const shapeRules = rulesOf(shapeUnit, 5, 'square', false);
  const two = ruleMoments('y', formed, shapeRules, fig('square', 'yellow'), 'yellow square');
  const first = turnQuestion('R-A7', 1);
  const second = turnQuestion('R-A7', 2);
  return {
    parts: [
      show(told('This pattern follows two rules at once. Let us find them, one at a time.', ruleScene('x', sized, sizeRules))),
      ...one.map(show),
      show(told('Follow one rule at a time. Then put the two answers together.', rest(one.at(-1)?.scene ?? scene([])))),
      turn(first, patternWhy(first)),
      show(told('Here, the two rules are color and shape.', ruleScene('y', formed, shapeRules))),
      ...two.map(show),
      turn(second, patternWhy(second)),
      show(told('Two rules? Take them one at a time.', rest(two.at(-1)?.scene ?? scene([])))),
    ],
  };
}

// ---- R-A12 Paper folding ----

type Fold = 'vertical' | 'horizontal';
interface Hole {
  col: number;
  row: number;
}

// The folded paper on the left and the open paper on the right, the same size, so the holes line up.
const PAPER_Y = 0.3;
const PAPER_BOX = 2.8;
const FOLDED_X = 1.2;
const OPEN_X = 5.8;
const paper = (fold: Fold, state: 'folded' | 'unfolded', holes: Hole[]): Visual => ({ kind: 'foldPunch', fold, state, holes });
const twin = (fold: Fold, hole: Hole): Hole => (fold === 'vertical' ? { col: 3 - hole.col, row: hole.row } : { col: hole.col, row: 3 - hole.row });
const foldedPiece = (p: string, visual: Visual, fields: Partial<Piece> = {}): Piece => ({ id: `${p}paper`, look: picture(visual), x: FOLDED_X, y: PAPER_Y, w: PAPER_BOX, h: PAPER_BOX, ...fields });
const openPiece = (p: string, visual: Visual, fields: Partial<Piece> = {}): Piece => ({ id: `${p}open`, look: picture(visual), x: OPEN_X, y: PAPER_Y, w: PAPER_BOX, h: PAPER_BOX, ...fields });
const opens = (p: string): Piece => ({ id: `${p}opens`, look: text('→'), x: 4.4, y: 1.2, w: 1, h: 1 });

// A spot on a paper for the hand to point at. The paper is drawn 104 wide, with 24 for each of its four squares
// and an edge of 4. `at` is in squares from the paper's corner: a hole's middle is its column and row plus a half.
function spot(left: number, col: number, row: number): Piece {
  const along = (n: number): number => ((n * 24 + 4) / 104) * PAPER_BOX;
  return { id: 'spot', look: { kind: 'hand' }, x: left + along(col) - 0.2, y: PAPER_Y + along(row) - 0.2, w: 0.4, h: 0.4 };
}
const holeSpot = (left: number, hole: Hole): Piece => spot(left, hole.col + 0.5, hole.row + 0.5);
// The fold of a folded paper runs through the middle of its place.
const foldSpot = (): Piece => spot(FOLDED_X, 2, 2);

function holesOf(facts: Record<string, unknown>): Hole[] {
  const value = facts.holes;
  if (!Array.isArray(value)) throw new Error('facts.holes is not a list');
  return value.map((hole: { col?: unknown; row?: unknown }) => ({ col: Number(hole.col), row: Number(hole.row) }));
}
// 1 when the hole is next to the fold, 0 when it is at the outer edge.
const nearFold = (fold: Fold, hole: Hole): boolean => (fold === 'vertical' ? hole.col : hole.row) === 1;

function foldingWhy(question: Question): Moment[] {
  const stimulus = question.stimulus;
  if (stimulus?.kind !== 'foldPunch') throw new Error('A folding question shows a folded paper');
  const hole = stimulus.holes[0];
  if (!hole) throw new Error('The paper has no hole');
  const near = nearFold(stimulus.fold, hole);
  const start = scene([foldedPiece('w', stimulus, { lit: true })]);
  const atHole = pointAt(rest(start), holeSpot(FOLDED_X, hole));
  const opened = add(withoutHand(atHole), [opens('w'), openPiece('w', rightOption(question))]);
  return [
    told('The paper is folded. The thick dark edge is the fold.', pointAt(start, foldSpot())),
    told(near ? 'The hole is right next to the fold.' : 'The hole is far from the fold, at the outer edge.', atHole),
    told(`Open it. The twin hole is ${near ? 'right next to the fold' : 'far from the fold'} too, on the other side.`, opened),
    told('So the open paper looks like this.', light(opened, ['wopen'])),
  ];
}

export function paperFoldingLesson(): Lesson {
  const corner: Hole = { col: 0, row: 0 };
  const flat = scene([foldedPiece('x', paper('vertical', 'unfolded', []), { lit: true })]);
  const folded = scene([foldedPiece('x', paper('vertical', 'folded', []), { lit: true })]);
  const punchedPaper = scene([foldedPiece('x', paper('vertical', 'folded', [corner]))]);
  const punched = pointAt(punchedPaper, holeSpot(FOLDED_X, corner));
  const open = add(punchedPaper, [opens('x'), openPiece('x', paper('vertical', 'unfolded', [corner, twin('vertical', corner)]))]);
  const middle: Hole = { col: 2, row: 1 };
  const acrossPaper = scene([foldedPiece('y', paper('horizontal', 'folded', [middle]))]);
  const acrossOpen = add(acrossPaper, [opens('y'), openPiece('y', paper('horizontal', 'unfolded', [middle, twin('horizontal', middle)]))]);
  const first = turnQuestion('R-A12', 1, (f) => f.fold === 'vertical' && holesOf(f)[0]?.row === 3);
  const second = turnQuestion('R-A12', 2, (f) => f.fold === 'horizontal' && holesOf(f)[0]?.col !== 2);
  return {
    parts: [
      show(told('Let us fold a paper, punch a hole, and open it again.', flat)),
      show(told('Fold the paper in half. Now it has two layers.', folded)),
      show(told('See the thick dark edge? That is the fold.', pointAt(rest(folded), foldSpot()))),
      show(told('Punch a hole. It goes through both layers.', punched)),
      show(told('Now open the paper. Look, two holes!', open)),
      show(told('This hole is where we punched.', pointAt(open, holeSpot(OPEN_X, corner)))),
      show(told('Its twin is across the fold, just as far from the fold.', pointAt(open, holeSpot(OPEN_X, twin('vertical', corner))))),
      show(told('The fold is like a mirror. Every hole gets a twin on the other side.', light(withoutHand(pointAt(open, holeSpot(OPEN_X, corner))), ['xopen']))),
      turn(first, foldingWhy(first)),
      show(told('This paper is folded the other way. Find the thick dark edge. That is the fold.', pointAt(acrossPaper, foldSpot()))),
      show(told('The hole is right next to the fold.', pointAt(acrossPaper, holeSpot(FOLDED_X, middle)))),
      show(told('Open it. The twin is right next to the fold too.', acrossOpen)),
      show(told('So the two holes sit close together.', light(acrossOpen, ['yopen']))),
      turn(second, foldingWhy(second)),
      show(told('Find the fold. Then give each hole a twin across it.', light(acrossOpen, ['ypaper', 'yopen']))),
    ],
  };
}

// ---- R-A13 Pattern completion ----

const tile = (color: string): Visual => fig('square', color);
// The pieces that touch the middle of a 3 by 3 picture.
const AROUND_MIDDLE = [1, 3, 5, 7];

function completionWhy(question: Question): Moment[] {
  const facts = question.facts;
  const cells = cellsOf(question);
  const blank = numberOf(facts, 'blank');
  const start = gridScene('w', cells, false);
  const done = filled(start, 'w', 3, blank, rightOption(question));
  if (question.level === 2) {
    const [one, two] = strings(facts, 'colors');
    return [
      told(`The two colors take turns. The pieces that touch the gap are all ${two}.`, light(start, AROUND_MIDDLE.map((i) => `wc${i}`))),
      told(`So the gap is the other color, ${one}.`, done),
    ];
  }
  const rows = strings(facts, 'rowAttrs');
  const across = rows[0] !== 'square';
  const [r, c] = [Math.floor(blank / 3), blank % 3];
  const color = across ? rows[r] : strings(facts, 'colAttrs')[c];
  return [
    told(`Look at the stripe with the gap. It goes ${across ? 'across' : 'down'}. Its other pieces are ${color}.`, light(start, across ? rowIds('w', 3, r) : colIds('w', 3, c))),
    told(`So the missing piece is ${color}.`, done),
  ];
}

export function patternCompletionLesson(): Lesson {
  const stripes: Cell[] = Array.from({ length: 9 }, (_, i): Cell => (i === 8 ? 'blank' : tile(Math.floor(i / 3) === 1 ? 'blue' : 'yellow')));
  const one = gridScene('x', stripes, false);
  const solved = filled(one, 'x', 3, 8, tile('yellow'));
  const checks: Cell[] = Array.from({ length: 9 }, (_, i): Cell => (i === 4 ? 'blank' : tile((Math.floor(i / 3) + (i % 3)) % 2 === 0 ? 'green' : 'orange')));
  const two = gridScene('y', checks, false);
  const solvedTwo = filled(two, 'y', 3, 4, tile('green'));
  // Stripes that run down, as many of the questions have them.
  const down = gridScene('v', Array.from({ length: 9 }, (_, i): Cell => tile(i % 3 === 1 ? 'orange' : 'green')), false);
  const first = turnQuestion('R-A13', 1, (f) => f.blank !== 8);
  const second = turnQuestion('R-A13', 2);
  return {
    parts: [
      show(told('A piece of this picture is missing. Let us find the piece that fits.', light(one, ['xc8']))),
      show(told('Look across the top. It is a yellow stripe.', light(one, rowIds('x', 3, 0)))),
      show(told('The middle is a blue stripe.', light(one, rowIds('x', 3, 1)))),
      show(told('The bottom stripe starts with yellow, and yellow.', light(one, rowIds('x', 3, 2)))),
      show(told('So the missing piece is yellow. It finishes the stripe.', solved)),
      show(told('See how the colors go. Then follow them into the gap.', light(solved, rowIds('x', 3, 2)))),
      show(told('Stripes can go down, too. Find which way the same color runs.', light(down, colIds('v', 3, 0)))),
      turn(first, completionWhy(first)),
      show(told('This picture is like a checkerboard. The two colors take turns.', two)),
      show(told('Look at the pieces that touch the gap. They are all orange.', light(two, AROUND_MIDDLE.map((i) => `yc${i}`)))),
      show(told('Next to orange comes green. So the gap is green.', solvedTwo)),
      turn(second, completionWhy(second)),
      show(told('Follow the colors into the gap.', light(solvedTwo, AROUND_MIDDLE.map((i) => `yc${i}`)))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'R-A3': figureAnalogyLesson,
  'R-A4': figureMatrixLesson,
  'R-A5': turningShapesLesson,
  'R-A6': mirrorImagesLesson,
  'R-A7': twoRulePatternLesson,
  'R-A12': paperFoldingLesson,
  'R-A13': patternCompletionLesson,
};
