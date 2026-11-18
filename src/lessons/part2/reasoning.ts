import { ANALOGY_PAIRS } from '../../content/data/analogies';
import type { AnalogyPair } from '../../content/data/analogies';
import { GROUP_WORDS } from '../../content/data/categories';
import { RIDDLES } from '../../content/data/riddles';
import type { Riddle } from '../../content/data/riddles';
import { VERBAL_RELATIONS, WORD_CLASSES } from '../../content/data/verbal';
import type { Question, Say, ShapeName, Visual } from '../../engine/types';
import { alter, art, moment, numeral, picture, pointAt, scene, set, text, turnQuestion } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Part 2 lessons (plan section 16): a second short lesson for a skill's harder levels, offered once the child is
// about half way up the skill. These are the Reasoning ones: each recalls the first lesson's idea in a line, then
// teaches what the harder levels add.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

// The words under the stage for a spoken line: numbers as numerals, words as they are.
function textOf(say: Say): string {
  return say
    .map((part) => (typeof part === 'string' ? part : 'number' in part ? String(part.number) : 'word' in part ? part.word : ''))
    .join(' ')
    .replace(/\s+([,.?!:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
// One spoken line that is also the words under the stage.
const told = (line: string, from: Scene): Moment => moment([line] satisfies Say, line, from);
const said = (say: Say, from: Scene): Moment => moment(say, textOf(say), from);
const n = (value: number): { number: number } => ({ number: value });
const w = (word: string): { word: string } => ({ word });
// Numbers said one after another, with a pause between them.
const listed = (values: readonly number[]): Say => values.flatMap((value, i): Say => (i === 0 ? [n(value)] : [',', n(value)]));
const named = (list: readonly string[]): Say => list.flatMap((word, i): Say => (i === 0 ? [w(word)] : i === list.length - 1 ? [', and', w(word)] : [',', w(word)]));

function at<T>(list: readonly T[], i: number): T {
  const value = list[i];
  if (value === undefined) throw new Error(`Nothing at place ${i}`);
  return value;
}

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

// The scene with every highlight off.
const rest = (from: Scene): Scene => alter(from, (piece) => ({ ...piece, lit: undefined }));
const light = (from: Scene, pieceIds: readonly string[]): Scene => set(rest(from), pieceIds, { lit: true });
const swap = (from: Scene, id: string, piece: Piece): Scene => alter(from, (each) => (each.id === id ? piece : each));
const count = (prefix: string, length: number): string[] => Array.from({ length }, (_, i) => `${prefix}${i}`);

function choice(question: Question): Extract<Question, { type: 'choice' }> {
  if (question.type !== 'choice') throw new Error(`${question.skillId} is not a choice question`);
  return question;
}
function rightOption(question: Question): Visual {
  const q = choice(question);
  return at(q.options, q.answerIndex);
}
function strings(facts: Record<string, unknown>, key: string): string[] {
  const value = facts[key];
  if (!Array.isArray(value)) throw new Error(`facts.${key} is not a list`);
  return value.map(String);
}
function numbersOf(facts: Record<string, unknown>, key: string): number[] {
  const value = facts[key];
  if (!Array.isArray(value) || !value.every((each) => typeof each === 'number')) throw new Error(`facts.${key} is not a list of numbers`);
  return value as number[];
}
function numberRows(facts: Record<string, unknown>, key: string): number[][] {
  const value = facts[key];
  if (!Array.isArray(value) || !value.every((row) => Array.isArray(row) && row.every((each) => typeof each === 'number'))) throw new Error(`facts.${key} is not rows of numbers`);
  return value as number[][];
}
function numberOf(facts: Record<string, unknown>, key: string): number {
  const value = facts[key];
  if (typeof value !== 'number') throw new Error(`facts.${key} is not a number`);
  return value;
}
// The right option as the facts write it, split at its bars: "circle|red|s".
function rightCode(question: Question): string[] {
  return at(strings(question.facts, 'options'), choice(question).answerIndex).split('|');
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
const shownItems = (question: Question): Visual[] => cellsOf(question).filter((item): item is Visual => item !== 'blank');

// ---- R-A1 Odd one out: four shapes ----

const ODD_BOX = 1.9;
const oddX = (i: number): number => 0.4 + i * 2.4;
const shapesScene = (p: string, options: readonly Visual[]): Scene => scene(options.map((option, i) => placed(`${p}o${i}`, option, oddX(i), 0.7, ODD_BOX)));
const allBut = (p: string, oddAt: number): string[] => [0, 1, 2, 3].filter((i) => i !== oddAt).map((i) => `${p}o${i}`);
const leftOut = (from: Scene, p: string, oddAt: number): Scene => set(light(from, [`${p}o${oddAt}`]), allBut(p, oddAt), { dim: true });

function oddShapeWhy(question: Question): Moment[] {
  const q = choice(question);
  const attrs = strings(q.facts, 'optionAttrs');
  const oddAt = q.answerIndex;
  const by = String(q.facts.by);
  const same = at(attrs, (oddAt + 1) % 4);
  const odd = at(attrs, oddAt);
  const start = shapesScene('w', q.options);
  const all = light(start, count('wo', 4));
  const three = light(start, allBut('w', oddAt));
  const out = leftOut(start, 'w', oddAt);
  if (q.level === 3) {
    const look = by === 'size' ? 'Three of these are just the same. Look at how big each one is.' : `Three of these are just the same. Look at the ${by} of each one.`;
    return [told(look, all), told(`These three are all ${by === 'shape' ? `${same}s` : same}.`, three), told(`This one is ${by === 'shape' ? a(odd) : odd}. It does not belong.`, out)];
  }
  const look = told('No two of these look the same. So check one thing at a time.', all);
  if (by === 'round') return [look, told('Look for corners. These three all have corners.', three), told('This one is round. It has no corners. It does not belong.', out)];
  if (by === 'colour') return [look, told(`Look at the colors. These three are all ${same}.`, three), told(`This one is ${odd}. It does not belong.`, out)];
  return [look, told(`Look at the shapes. These three are all ${same}s.`, three), told(`This one is ${a(odd)}. It does not belong.`, out)];
}

function oddShapeLesson(): Lesson {
  const hearts = shapesScene('x', [fig('heart', 'red', 'l'), fig('heart', 'red', 'l'), fig('heart', 'red', 's'), fig('heart', 'red', 'l')]);
  const mixed = shapesScene('y', [fig('square', 'blue', 'l'), fig('triangle', 'orange', 's'), fig('circle', 'green', 'l'), fig('star', 'purple', 's')]);
  const first = turnQuestion('R-A1', 3, (f) => f.by !== 'size');
  const second = turnQuestion('R-A1', 4, (f) => f.by !== 'round');
  return {
    parts: [
      show(told('You know how to find the picture that does not belong. Now let us do it with shapes.', hearts)),
      show(told('Three of these are just the same. One is different, in one small way.', light(hearts, count('xo', 4)))),
      show(told('Look at the color. They are all red. Look at the shape. They are all hearts.', rest(hearts))),
      show(told('Now look at the size. These three are big.', light(hearts, allBut('x', 2)))),
      show(told('This one is small. It does not belong.', leftOut(hearts, 'x', 2))),
      show(told('Check the color, the shape, and the size. One of them will be different.', light(hearts, ['xo2']))),
      turn(first, oddShapeWhy(first)),
      show(told('Here is a harder one. No two of these look the same.', mixed)),
      show(told('Every color is different. So the color does not help.', light(mixed, count('yo', 4)))),
      show(told('Two are big, and two are small. So the size does not help.', light(mixed, ['yo0', 'yo2']))),
      show(told('Now look for corners. The square, the triangle, and the star all have corners.', light(mixed, allBut('y', 2)))),
      show(told('The circle is round. It has no corners. It does not belong.', leftOut(mixed, 'y', 2))),
      show(told('Other times, three share a color, or three are the same shape. Check each thing in turn.', rest(mixed))),
      turn(second, oddShapeWhy(second)),
      show(told('Find the one thing that three of them share. The one left out does not belong.', light(mixed, allBut('y', 2)))),
    ],
  };
}

// ---- R-A2 Which belongs: three pictures, four choices ----

// Picture words that name more than one thing ("the pants are", not "the pants is").
const MANY = new Set(['pants', 'grapes', 'glasses', 'eyes', 'sunglasses']);
const isAre = (word: string): string => (MANY.has(word) ? 'are' : 'is');
// One member of a picture group: "The car is a vehicle."
const ONE_OF: Record<string, string> = { animals: 'an animal', food: 'food', vehicles: 'a vehicle', clothes: 'something to wear', plants: 'a plant', people: 'a person', things: 'a thing' };
const oneOf = (word: string, group: string): string => (MANY.has(word) ? group : (ONE_OF[group] ?? group));

function groupWord(word: string): { word: string; emoji: string; group: string } {
  const found = GROUP_WORDS.find((each) => each.word === word);
  if (!found) throw new Error(`No picture called ${word}`);
  return found;
}

const belongX = (i: number): number => 0.4 + i * 2.35;

// Three pictures that go together and an empty box beside them; the four choices wait on the table.
function belongScene(p: string, examples: readonly string[], choices: readonly string[]): Scene {
  return scene([
    ...examples.map((word, i): Piece => ({ id: `${p}e${i}`, look: art(groupWord(word).emoji), x: belongX(i), y: 0.1, w: 1.8, h: 1.8 })),
    { id: `${p}box`, look: { kind: 'box' }, x: belongX(examples.length), y: 0.1, w: 1.8, h: 1.8 },
    { id: `${p}g`, look: text('group'), x: 0.4, y: 2, w: 6.5, h: 0.7, gone: true },
    ...choices.map((word, i): Piece => ({ id: `${p}o${i}`, look: art(groupWord(word).emoji), x: 0.6 + i * 2.35, y: 3.7, w: 1.6, h: 1.6, gone: true })),
  ]);
}

function belongMoments(p: string, examples: readonly string[], group: string, choices: readonly string[], answer: string): Moment[] {
  const start = belongScene(p, examples, choices);
  const exampleIds = count(`${p}e`, examples.length);
  const look = light(start, exampleIds);
  const groupNamed = alter(look, (piece) => (piece.id === `${p}g` ? { ...piece, look: text(group), gone: false } : piece));
  const offered = set(rest(groupNamed), count(`${p}o`, choices.length), { gone: false });
  const moments: Moment[] = [
    said(['Look at the', ...examples.flatMap((word, i): Say => (i === 0 ? [w(word)] : i === examples.length - 1 ? [', and the', w(word)] : [', the', w(word)])), '.'], look),
    told(`They are all ${group}.`, groupNamed),
    told('Now check each picture below. Is it one of them?', offered),
  ];
  let now = offered;
  choices.forEach((word, i) => {
    if (word === answer) return;
    now = set(rest(now), [`${p}o${i}`], { lit: true, crossed: true });
    moments.push(said(['The', w(word), `${isAre(word)} ${oneOf(word, groupWord(word).group)}, not ${oneOf(word, group)}.`], now));
  });
  const right = choices.indexOf(answer);
  const home = alter(rest(now), (piece) => {
    if (piece.id === `${p}o${right}`) return { ...piece, x: belongX(examples.length), y: 0.1, w: 1.8, h: 1.8, lit: true };
    if (piece.id === `${p}box`) return { ...piece, gone: true };
    return piece;
  });
  moments.push(said(['The', w(answer), `${isAre(answer)} ${oneOf(answer, group)} too. So the`, w(answer), MANY.has(answer) ? 'belong with them.' : 'belongs with them.'], home));
  return moments;
}

function belongWhy(question: Question): Moment[] {
  const facts = question.facts;
  return belongMoments('w', strings(facts, 'examples'), String(facts.target), strings(facts, 'options'), String(facts.answer));
}

function whichBelongsLesson(): Lesson {
  const people = ['girl', 'man', 'baby'];
  const choices = ['monkey', 'bike', 'king', 'duck'];
  const start = belongScene('x', people, choices);
  const opening = belongMoments('x', people, 'people', choices, 'king');
  const plants = ['tree', 'flower', 'cactus'];
  const plantChoices = ['frog', 'hat', 'clover', 'rabbit'];
  const second0 = set(belongScene('y', plants, plantChoices), count('yo', 4), { gone: false });
  const frogOut = set(light(second0, ['yo0']), ['yo0'], { crossed: true });
  const cloverIn = alter(rest(frogOut), (piece) => (piece.id === 'yo2' ? { ...piece, x: belongX(3), y: 0.1, w: 1.8, h: 1.8, lit: true } : piece.id === 'ybox' ? { ...piece, gone: true } : piece));
  const first = turnQuestion('R-A2', 3, (f) => !['people', 'plants'].includes(String(f.target)));
  const second = turnQuestion('R-A2', 3, (f) => !['people', 'plants', String(first.facts.target)].includes(String(f.target)));
  return {
    parts: [
      show(told('You know how to find one more for a group. Now there are three pictures, and four to choose from.', start)),
      ...opening.map(show),
      show(told('Some wrong pictures are close to the group. So say the name of the group, and check each picture.', rest(at(opening, opening.length - 1).scene))),
      turn(first, belongWhy(first)),
      show(said(['Here is another. A', w('tree'), ', a', w('flower'), ', and a', w('cactus'), '. They are all plants.'], light(second0, count('ye', 3)))),
      show(said(['A', w('frog'), 'is alive, like a plant. But a frog is an animal, not a plant.'], frogOut)),
      show(said(['The', w('clover'), 'is a plant too. It belongs with them.'], cloverIn)),
      turn(second, belongWhy(second)),
      show(told('Name the group. Then pick the picture that is really in it.', rest(cloverIn))),
    ],
  };
}

// ---- R-A3 Figure analogies: three changes ----

// A figure as the facts write it at the top level: [shape, colour, size, how many].
const ATTRIBUTE4 = ['shape', 'color', 'size', 'number of shapes'] as const;
const BADGE4 = ['shape', 'color', 'size', 'how many'] as const;
const worded4 = (i: number, value: string): string => (i === 2 ? (SIZE_WORD[value] ?? value) : i === 3 ? (value === '1' ? 'one' : 'two') : value);
const figure4 = (code: readonly string[]): Visual => {
  const one = fig(at(code, 0) as ShapeName, at(code, 1), at(code, 2) as Size);
  return at(code, 3) === '1' ? one : { kind: 'row', children: [one, one] };
};
// "a small red circle", "two big blue stars".
const named4 = (code: readonly string[]): string => {
  const words = `${worded4(2, at(code, 2))} ${at(code, 1)} ${at(code, 0)}`;
  return at(code, 3) === '1' ? a(words) : `two ${words}s`;
};

const PAIR_X = [2.2, 5.2] as const;
const PAIR_Y = [0.1, 1.7] as const;
const PAIR_BOX = 1.4;

// Two pairs, one above the other, as the question's grid shows them: first → second, third → empty box.
function pairScene(p: string, from: Visual, to: Visual, base: Visual): Scene {
  return scene([
    placed(`${p}from`, from, PAIR_X[0], PAIR_Y[0], PAIR_BOX),
    { id: `${p}arrow0`, look: text('→'), x: 3.9, y: 0.3, w: 1, h: 1 },
    placed(`${p}to`, to, PAIR_X[1], PAIR_Y[0], PAIR_BOX),
    placed(`${p}base`, base, PAIR_X[0], PAIR_Y[1], PAIR_BOX),
    { id: `${p}arrow1`, look: text('→'), x: 3.9, y: 1.9, w: 1, h: 1 },
    { id: `${p}answer`, look: { kind: 'box' }, x: PAIR_X[1], y: PAIR_Y[1], w: PAIR_BOX, h: PAIR_BOX },
  ]);
}

function threeChangeMoments(p: string, start: Scene, from: readonly string[], to: readonly string[], base: readonly string[], answer: Visual, answerCode: readonly string[]): Moment[] {
  const moving = [0, 1, 2, 3].filter((i) => from[i] !== to[i]);
  const still = [0, 1, 2, 3].filter((i) => from[i] === to[i]);
  let now = light(start, [`${p}from`, `${p}to`]);
  const moments: Moment[] = [told('Look at the first pair.', now)];
  moving.forEach((i, k) => {
    now = set(now, [`${p}arrow0`], { badge: moving.slice(0, k + 1).map((each) => at(BADGE4, each)).join(' + ') });
    moments.push(told(`The ${at(ATTRIBUTE4, i)} changed, from ${worded4(i, at(from, i))}, to ${worded4(i, at(to, i))}.`, now));
  });
  still.forEach((i) => moments.push(told(`The ${at(ATTRIBUTE4, i)} did not change.`, light(now, [`${p}arrow0`]))));
  now = light(now, [`${p}base`]);
  moments.push(told(`The second pair starts with ${named4(base)}.`, now));
  const done = swap(rest(now), `${p}answer`, placed(`${p}answer`, answer, PAIR_X[1], PAIR_Y[1], PAIR_BOX, { lit: true }));
  moments.push(told(`Make all the same changes. It becomes ${named4(answerCode)}.`, set(done, [`${p}arrow1`], { badge: moving.map((each) => at(BADGE4, each)).join(' + ') })));
  return moments;
}

function threeChangeWhy(question: Question): Moment[] {
  const cells = cellsOf(question);
  const [from, to, base] = [strings(question.facts, 'from'), strings(question.facts, 'to'), strings(question.facts, 'base')];
  const visual = (i: number): Visual => {
    const cell = at(cells, i);
    if (cell === 'blank') throw new Error('The pair has a gap');
    return cell;
  };
  return threeChangeMoments('w', pairScene('w', visual(0), visual(1), visual(2)), from, to, base, rightOption(question), rightCode(question));
}

function figureAnalogyLesson(): Lesson {
  const [from, to, base, answer] = [['circle', 'red', 's', '1'], ['circle', 'blue', 'm', '2'], ['star', 'red', 's', '1'], ['star', 'blue', 'm', '2']];
  const start = pairScene('x', figure4(from), figure4(to), figure4(base));
  const worked = threeChangeMoments('x', start, from, to, base, figure4(answer), answer);
  const solved = at(worked, worked.length - 1).scene;
  const forgot: Piece = placed('xwrong', figure4(['star', 'red', 'm', '2']), 7.8, PAIR_Y[1], PAIR_BOX, { lit: true, crossed: true });
  const first = turnQuestion('R-A3', 3, (f) => at(strings(f, 'from'), 0) !== at(strings(f, 'to'), 0) && at(strings(f, 'from'), 3) !== at(strings(f, 'to'), 3));
  const second = turnQuestion('R-A3', 3, (f) => at(strings(f, 'from'), 3) === at(strings(f, 'to'), 3));
  return {
    parts: [
      show(told('You know how to find what changed in a pair. Now three things change at once.', start)),
      ...worked.map(show),
      show(told('Be careful. This one forgot to change the color. Every wrong answer forgets one change.', { ...rest(solved), pieces: [...rest(solved).pieces, forgot] })),
      turn(first, threeChangeWhy(first)),
      show(told('Check four things. The shape, the color, the size, and how many.', light(solved, ['xfrom', 'xto']))),
      show(told('Three of them change. Your answer must show all three.', light(solved, ['xanswer']))),
      turn(second, threeChangeWhy(second)),
      show(told('Find every change. Then make them all.', light(solved, ['xarrow0', 'xarrow1']))),
    ],
  };
}

// ---- Grids (figure matrices and pattern completion) ----

// A grid of pictures in the middle of the stage, 2 by 2 or 3 by 3. The empty box is a dashed box.
// Ids: prefix + c + index for what is in a cell, prefix + f + index for the frame around it.
const GRID_TOP = 0.1;
const gridCell = (size: number): number => (size === 2 ? 1.5 : 1);
const gridX = (size: number, i: number): number => 5 - (size * gridCell(size)) / 2 + (i % size) * gridCell(size);
const gridY = (size: number, i: number): number => GRID_TOP + Math.floor(i / size) * gridCell(size);
const gridInset = (size: number): number => (size === 2 ? 0.2 : 0.08);

function gridPiece(p: string, size: number, i: number, cell: Cell, fields: Partial<Piece> = {}): Piece {
  const inset = gridInset(size);
  const box = gridCell(size) - inset * 2;
  if (cell === 'blank') return { id: `${p}c${i}`, look: { kind: 'box' }, x: gridX(size, i) + inset, y: gridY(size, i) + inset, w: box, h: box, ...fields };
  return placed(`${p}c${i}`, cell, gridX(size, i) + inset, gridY(size, i) + inset, box, fields);
}

function gridScene(p: string, cells: readonly Cell[], framed: boolean): Scene {
  const size = cells.length > 4 ? 3 : 2;
  const frames: Piece[] = framed ? cells.map((_, i) => ({ id: `${p}f${i}`, look: { kind: 'cell' }, x: gridX(size, i), y: gridY(size, i), w: gridCell(size), h: gridCell(size) })) : [];
  return scene([...frames, ...cells.map((cell, i) => gridPiece(p, size, i, cell))]);
}

const rowIds = (p: string, size: number, r: number): string[] => Array.from({ length: size }, (_, c) => `${p}c${r * size + c}`);
const colIds = (p: string, size: number, c: number): string[] => Array.from({ length: size }, (_, r) => `${p}c${r * size + c}`);
const filled = (from: Scene, p: string, size: number, i: number, answer: Visual): Scene => swap(rest(from), `${p}c${i}`, gridPiece(p, size, i, answer, { lit: true }));
// The other cells of a row or column of a 3 by 3 grid of "shape|colour" codes.
const othersIn = (codes: readonly string[], places: readonly number[], blank: number): string[][] => places.filter((i) => i !== blank).map((i) => at(codes, i).split('|'));

// ---- R-A4 Figure matrices: arrows, then 3 by 3 ----

function matrixWhy(question: Question): Moment[] {
  const blank = numberOf(question.facts, 'blank');
  const cells = cellsOf(question);
  if (question.level === 3) {
    const [colour = '', quarter = '0'] = rightCode(question);
    const [r, c] = [Math.floor(blank / 2), blank % 2];
    const start = gridScene('w', cells, true);
    const points = at(POINTS, Number(quarter));
    return [
      told(`Look across the row with the empty box. This row is ${colour}.`, light(start, rowIds('w', 2, r))),
      told(`Now look down the column. The arrow in it points ${points}.`, light(start, colIds('w', 2, c))),
      told(`So the box needs ${a(`${colour} arrow`)}, pointing ${points}.`, filled(start, 'w', 2, blank, rightOption(question))),
    ];
  }
  const codes = strings(question.facts, 'cells');
  const [r, c] = [Math.floor(blank / 3), blank % 3];
  const [form = '', colour = ''] = rightCode(question);
  const inRow = othersIn(codes, [0, 1, 2].map((i) => r * 3 + i), blank);
  const start = gridScene('w', cells, true);
  return [
    told(`Look across the row with the empty box. This row is all ${colour}.`, light(start, rowIds('w', 3, r))),
    told(`This row has ${a(at(at(inRow, 0), 0))}, and ${a(at(at(inRow, 1), 0))}. The ${form} is missing.`, light(start, inRow.map((_, k) => at(rowIds('w', 3, r).filter((id) => id !== `wc${blank}`), k)))),
    told(`Look down the column. It has no ${form} yet.`, light(start, colIds('w', 3, c))),
    told(`So the box needs ${a(`${colour} ${form}`)}.`, filled(start, 'w', 3, blank, rightOption(question))),
  ];
}

function figureMatrixLesson(): Lesson {
  const arrow = (color: string, quarter: number): Visual => fig('arrow', color, 'm', quarter * 90);
  const arrows = gridScene('x', [arrow('red', 0), arrow('red', 1), arrow('blue', 0), 'blank'], true);
  const arrowsDone = filled(arrows, 'x', 2, 3, arrow('blue', 1));
  const wrongWay: Piece = placed('xwrong', arrow('blue', 2), 8, 1.7, 1.3, { lit: true, crossed: true });
  const forms: ShapeName[] = ['circle', 'square', 'star'];
  const colours = ['red', 'green', 'blue'];
  const big: Cell[] = Array.from({ length: 9 }, (_, i): Cell => (i === 8 ? 'blank' : fig(at(forms, ((i % 3) + Math.floor(i / 3)) % 3), at(colours, Math.floor(i / 3)))));
  const grid = gridScene('y', big, true);
  const gridDone = filled(grid, 'y', 3, 8, fig('square', 'blue'));
  const first = turnQuestion('R-A4', 3, (f) => f.blank !== 3);
  const second = turnQuestion('R-A4', 4, (f) => f.blank !== 8);
  return {
    parts: [
      show(told('You know how to look across the row, and then down the column. Now the shapes are arrows.', arrows)),
      show(told('Look across. The top row is red. The bottom row is blue. So the box needs blue.', light(arrows, rowIds('x', 2, 1)))),
      show(told('Now look down. In this column, the arrow points to the right.', light(arrows, colIds('x', 2, 1)))),
      show(told('So the box needs a blue arrow, pointing to the right.', arrowsDone)),
      show(told('Be careful. A wrong answer can be the right color, but point a new way. Check which way it points.', { ...rest(arrowsDone), pieces: [...rest(arrowsDone).pieces, wrongWay] })),
      turn(first, matrixWhy(first)),
      show(told('Now a bigger grid. Look across. Each row has one color.', light(grid, rowIds('y', 3, 0)))),
      show(told('And each row has a circle, a square, and a star. Every shape, one time.', light(grid, rowIds('y', 3, 1)))),
      show(told('It is the same going down. Every shape, one time.', light(grid, colIds('y', 3, 0)))),
      show(told('The row with the box is blue. It has a star, and a circle. The square is missing.', light(grid, rowIds('y', 3, 2)))),
      show(told('So the box needs a blue square.', gridDone)),
      turn(second, matrixWhy(second)),
      show(told('Across, then down. In the big grid, look for the shape that is missing.', light(gridDone, [...rowIds('y', 3, 2), ...colIds('y', 3, 2)]))),
    ],
  };
}

// ---- R-A5 Turning shapes: half turns, then a turn and a colour ----

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
const stepDone = (from: Scene, p: string, place: number, answer: Visual): Scene => swap(rest(from), `${p}s${place}`, placed(`${p}s${place}`, answer, STEP_X(place), STEP_Y, STEP_BOX, { lit: true }));

function turningWhy(question: Question): Moment[] {
  const items = shownItems(question);
  const answer = shapeOf(rightOption(question));
  const last = answer.shape === 'arrow' ? `Now it points ${at(POINTS, (answer.rotation / 90) % 4)}.` : 'This is how it looks after the turn.';
  const start = stepScene('w', items);
  const one = stepLit(start, 'w', 0);
  const two = stepLit(one, 'w', 1);
  const three = stepLit(two, 'w', 2);
  const done = stepDone(three, 'w', items.length, answer);
  if (question.level === 4) {
    const [c0 = '', c1 = ''] = strings(question.facts, 'colors');
    return [
      told('Look at the turn first. It makes a quarter turn each step.', three),
      told(`Now look at the color. It goes ${c0}, ${c1}, ${c0}. So next is ${c1}.`, light(three, count('ws', 3))),
      told(`A quarter turn more, and ${c1}. ${last}`, done),
    ];
  }
  return [
    told('Look at the first two. The shape turned a half turn. That is two quarter turns in one go.', one),
    told('Then it turned a half turn again.', two),
    told('So turn the last one a half turn more.', three),
    told(last, done),
  ];
}

function turningShapesLesson(): Lesson {
  const arrow = (color: string, quarter: number): Visual => fig('arrow', color, 'm', quarter * 90);
  const start = stepScene('x', [arrow('green', 0), arrow('green', 2), arrow('green', 0)]);
  const one = stepLit(start, 'x', 0);
  const two = stepLit(one, 'x', 1);
  const three = stepLit(two, 'x', 2);
  const done = stepDone(three, 'x', 3, arrow('green', 2));
  const both = stepScene('y', [arrow('purple', 0), arrow('orange', 1), arrow('purple', 2)]);
  const bothTurns = set(rest(both), count('yt', 3), { gone: false, lit: true });
  const bothDone = stepDone(bothTurns, 'y', 3, arrow('orange', 3));
  const first = turnQuestion('R-A5', 3, (f) => f.startTurn === 1 || f.startTurn === 3);
  const second = turnQuestion('R-A5', 4, (f) => !strings(f, 'colors').some((color) => ['purple', 'orange'].includes(color)));
  return {
    parts: [
      show(told('You know the quarter turn. Now the shape turns further each step.', start)),
      show(told('First it points up. Next it points down. It went right past pointing to the side.', one)),
      show(told('That is two quarter turns in one go. We call it a half turn.', set(one, ['xt0'], { badge: 'half turn', lit: true }))),
      show(told('Then a half turn again. It points up.', two)),
      show(told('One more half turn. Now it points down.', done)),
      show(told('So first see how far it turns each step. A quarter turn, or a half turn?', light(done, count('xt', 3)))),
      turn(first, turningWhy(first)),
      show(told('Now two things change at once. The shape turns, and its color changes.', both)),
      show(told('First the turn. It is a quarter turn each step. So next, it points to the left.', bothTurns)),
      show(told('Now the color. Purple, orange, purple. So next is orange.', light(bothTurns, count('ys', 3)))),
      show(told('Put them together. An orange arrow, pointing to the left.', bothDone)),
      turn(second, turningWhy(second)),
      show(told('Check the turn. Then check the color.', light(bothDone, count('yt', 3)))),
    ],
  };
}

// ---- R-A6 Mirror images: a tipped shape, then two pieces ----

const mirrorLine = (p: string, x: number): Piece => ({ id: `${p}mirror`, look: text('│'), x, y: 0.2, w: 0.8, h: 2.8, badge: 'mirror' });
// The mirror picture of a shape: flipped, and its turn runs the other way.
function mirrored(visual: Visual): Visual {
  const shown = shapeOf(visual);
  const rotation = ((4 - shown.rotation / 90) % 4) * 90;
  return shown.flip ? { kind: 'shape', shape: shown.shape, color: shown.color, size: shown.size, rotation } : { kind: 'shape', shape: shown.shape, color: shown.color, size: shown.size, rotation, flip: true };
}

function mirrorWhy(question: Question): Moment[] {
  const stimulus = question.stimulus;
  if (!stimulus) throw new Error('A mirror question shows a picture');
  if (question.level === 4) {
    const colours = (question.facts.pieces as { color?: unknown }[]).map((piece) => String(piece.color));
    const [far = '', near = ''] = colours;
    const shown: Piece = { id: 'wshape', look: picture(stimulus), x: 0.6, y: 0.7, w: 3.4, h: 1.7 };
    const seen: Piece = { id: 'wseen', look: picture(rightOption(question)), x: 5.8, y: 0.7, w: 3.4, h: 1.7 };
    const start = scene([shown, mirrorLine('w', 4.6)]);
    const both = scene([shown, mirrorLine('w', 4.6), seen]);
    return [
      told(`The ${near} piece is next to the mirror. The ${far} piece is far from it.`, light(start, ['wshape'])),
      told(`In the mirror, the ${near} piece is still next to the mirror. So the two pieces swap places.`, light(both, ['wmirror'])),
      told('And each piece is flipped. This is the mirror picture.', light(both, ['wseen'])),
    ];
  }
  const start = scene([placed('wshape', stimulus, 1.4, 0.5, 2.2), mirrorLine('w', 4.6)]);
  const both = scene([...start.pieces, placed('wseen', rightOption(question), 6.4, 0.5, 2.2)]);
  return [
    told('Look at the shape. See what is at the top, and what is next to the mirror.', light(start, ['wshape'])),
    told('In the mirror, the top is still at the top. The part next to the mirror is still next to it.', light(both, ['wmirror'])),
    told('The other pictures are only turned. This one is flipped. It is the mirror picture.', light(both, ['wseen'])),
  ];
}

function mirrorImagesLesson(): Lesson {
  const tipped = fig('flag', 'red', 'm', 90);
  const copies = [180, 270, 0].map((rotation, i) => placed(`xp${i}`, fig('flag', 'red', 'm', rotation), 6.1 + i * 1.3, 1, 1.2));
  const start = scene([placed('xshape', tipped, 0.4, 0.6, 2), mirrorLine('x', 2.6)]);
  const seen = scene([...start.pieces, placed('xseen', mirrored(tipped), 3.6, 0.6, 2)]);
  const turned = scene([...seen.pieces, ...copies]);
  const crossed = set(light(turned, count('xp', 3)), count('xp', 3), { crossed: true });
  const flag = fig('flag', 'red');
  const bend = fig('lShape', 'blue');
  const pair = scene([placed('yfar', flag, 0.8, 0.8, 1.6), placed('ynear', bend, 2.6, 0.8, 1.6), mirrorLine('y', 4.6)]);
  const nearSeen = scene([...pair.pieces, placed('ynearSeen', mirrored(bend), 5.8, 0.8, 1.6)]);
  const farSeen = scene([...nearSeen.pieces, placed('yfarSeen', mirrored(flag), 7.6, 0.8, 1.6)]);
  const first = turnQuestion('R-A6', 3, (f) => f.startTurn !== 0 && f.color !== 'red');
  const second = turnQuestion('R-A6', 4, (f) => !(f.pieces as { color?: unknown }[]).some((piece) => piece.color === 'red' || piece.color === 'blue'));
  return {
    parts: [
      show(told('You know that a mirror swaps the sides, and the top stays on top. Now the shape is tipped over.', light(start, ['xshape']))),
      show(told('Here is its mirror picture. What was next to the mirror, is still next to the mirror.', light(seen, ['xseen']))),
      show(told('And what was at the top, is still at the top.', light(seen, ['xshape', 'xseen']))),
      show(told('These others are the same shape, only turned around. A turn is not a flip.', crossed)),
      show(told('So do not pick a shape that was only turned. Pick the one that is flipped.', set(light(crossed, ['xseen']), count('xp', 3), { dim: true }))),
      turn(first, mirrorWhy(first)),
      show(told('Now there are two pieces, side by side. A red one, and a blue one.', light(pair, ['yfar', 'ynear']))),
      show(told('The blue piece is next to the mirror. So in the mirror, it is next to the mirror too.', light(nearSeen, ['ynear', 'ynearSeen']))),
      show(told('The red piece is far from the mirror. In the mirror, it is far away too.', light(farSeen, ['yfar', 'yfarSeen']))),
      show(told('So the two pieces swap places. And each piece is flipped.', light(farSeen, ['ynearSeen', 'yfarSeen']))),
      turn(second, mirrorWhy(second)),
      show(told('Check two things. Did the pieces swap? Did each one flip?', light(farSeen, ['ymirror']))),
    ],
  };
}

// ---- R-A7 Three-rule patterns ----

// The pattern in a row across the top (up to seven shapes and a box). Under it, each rule on its own:
// the colours alone as blobs, the sizes alone as black squares, the shapes alone in black.
const BEAT_X = (i: number): number => 0.2 + i * 1.2;
const RULE_Y = [1.45, 2.1, 2.75] as const;

interface Rule {
  name: string; // 'colour'
  words: string[]; // one for each shape shown, then the next one
  pictures: Visual[];
}

function ruleScene(p: string, items: readonly Visual[], rules: readonly Rule[]): Scene {
  const top = items.map((item, i) => placed(`${p}s${i}`, item, BEAT_X(i), 0.2, 1.1));
  const box: Piece = { id: `${p}s${items.length}`, look: { kind: 'box' }, x: BEAT_X(items.length), y: 0.2, w: 1.1, h: 1.1 };
  const under = rules.flatMap((rule, k) => rule.pictures.map((each, i) => placed(`${p}r${k}n${i}`, each, BEAT_X(i) + 0.25, at(RULE_Y, k), 0.6, { gone: true })));
  return scene([...top, box, ...under]);
}

function ruleMoments(p: string, items: readonly Visual[], rules: readonly Rule[], answer: Visual, answerName: string): Moment[] {
  const shown = items.length;
  const moments: Moment[] = [];
  let now = ruleScene(p, items, rules);
  rules.forEach((rule, k) => {
    now = set(rest(now), count(`${p}r${k}n`, shown), { gone: false });
    moments.push(told(`${k === 0 ? 'Look' : 'Now look'} only at the ${rule.name}. It goes ${rule.words.slice(0, shown).join(', ')}.`, now));
    now = set(rest(now), [`${p}r${k}n${shown}`], { gone: false, lit: true });
    const next = at(rule.words, shown);
    moments.push(told(`So the next ${rule.name} is ${rule.name === 'shape' ? a(next) : next}.`, now));
  });
  const done = swap(set(rest(now), rules.map((_, k) => `${p}r${k}n${shown}`), { lit: true }), `${p}s${shown}`, placed(`${p}s${shown}`, answer, BEAT_X(shown), 0.2, 1.1, { lit: true }));
  moments.push(told(`Put all three together. Next is ${a(answerName)}.`, done));
  return moments;
}

// The three rules of a pattern, read from its steps: "red|l|circle" is colour, size and shape.
function rulesOf(unit: readonly string[], shown: number): Rule[] {
  const beats = Array.from({ length: shown + 1 }, (_, i) => at(unit, i % unit.length).split('|'));
  const part = (k: number): string[] => beats.map((beat) => at(beat, k));
  return [
    { name: 'colour', words: part(0), pictures: part(0).map((colour) => fig('oval', colour)) },
    { name: 'size', words: part(1).map((size) => SIZE_WORD[size] ?? size), pictures: part(1).map((size) => fig('square', 'black', size as Size)) },
    { name: 'shape', words: part(2), pictures: part(2).map((form) => fig(form as ShapeName, 'black')) },
  ];
}
const beatName = (code: readonly string[]): string => `${SIZE_WORD[at(code, 1)] ?? ''} ${at(code, 0)} ${at(code, 2)}`;

function patternWhy(question: Question): Moment[] {
  const rules = rulesOf(strings(question.facts, 'unit'), numberOf(question.facts, 'shown'));
  return ruleMoments('w', shownItems(question), rules, rightOption(question), beatName(rightCode(question)));
}

function threeRulePatternLesson(): Lesson {
  const colours = ['red', 'red', 'blue', 'blue'];
  const forms: ShapeName[] = ['circle', 'square', 'triangle'];
  const unit = Array.from({ length: 12 }, (_, i) => `${at(colours, i % 4)}|${i % 2 === 0 ? 'l' : 's'}|${at(forms, i % 3)}`);
  const draw = (code: string): Visual => {
    const [colour = '', size = 'l', form = 'circle'] = code.split('|');
    return fig(form as ShapeName, colour, size as Size);
  };
  const items = unit.slice(0, 6).map(draw);
  const rules = rulesOf(unit, 6);
  const start = ruleScene('x', items, rules);
  const worked = ruleMoments('x', items, rules, draw(at(unit, 6)), beatName(at(unit, 6).split('|')));
  const solved = at(worked, worked.length - 1).scene;
  const first = turnQuestion('R-A7', 3);
  const second = turnQuestion('R-A7', 3, (f) => JSON.stringify(f.unit) !== JSON.stringify(first.facts.unit) && f.shown !== first.facts.shown);
  return {
    parts: [
      show(told('You know how to follow two rules, one at a time. Now there are three rules at once.', start)),
      ...worked.map(show),
      show(told('Each wrong answer breaks just one rule. So check the color, the size, and the shape.', light(solved, ['xs6']))),
      turn(first, patternWhy(first)),
      show(told('Remember, each rule keeps its own beat. Follow each one by itself, right to the end of the row.', light(solved, count('xr2n', 7)))),
      turn(second, patternWhy(second)),
      show(told('Three rules? Still one at a time.', rest(solved))),
    ],
  };
}

// ---- R-A8 Number analogies: take away, times, and two steps ----

type NumRule = { kind: 'plus'; by: number } | { kind: 'minus'; by: number } | { kind: 'times'; by: number } | { kind: 'double' } | { kind: 'twoStep'; more: number };

function ruled(rule: NumRule, value: number): number {
  if (rule.kind === 'plus') return value + rule.by;
  if (rule.kind === 'minus') return value - rule.by;
  if (rule.kind === 'times') return value * rule.by;
  if (rule.kind === 'double') return value * 2;
  return value * 2 + rule.more;
}

// The rule that fits both example pairs.
function ruleOf(examples: readonly (readonly number[])[]): NumRule {
  const [a1, b1, a2, b2] = [at(at(examples, 0), 0), at(at(examples, 0), 1), at(at(examples, 1), 0), at(at(examples, 1), 1)];
  if (b1 - a1 === b2 - a2) return b1 > a1 ? { kind: 'plus', by: b1 - a1 } : { kind: 'minus', by: a1 - b1 };
  if (b1 === 2 * a1 && b2 === 2 * a2) return { kind: 'double' };
  if (b1 % a1 === 0 && b2 === a2 * (b1 / a1)) return { kind: 'times', by: b1 / a1 };
  return { kind: 'twoStep', more: b1 - 2 * a1 };
}

// The rule worked on one number, said aloud.
function stepSay(rule: NumRule, value: number): Say {
  const to = ruled(rule, value);
  if (rule.kind === 'plus') return [n(value), ', and', n(rule.by), 'more, make', n(to), '.'];
  if (rule.kind === 'minus') return [n(value), ', take away', n(rule.by), ', is', n(to), '.'];
  if (rule.kind === 'times') return [n(rule.by), 'lots of', n(value), 'make', n(to), '.'];
  if (rule.kind === 'double') return ['Double', n(value), 'is', n(to), '.'];
  return rule.more > 0 ? ['Double', n(value), 'is', n(value * 2), ', and', n(rule.more), 'more, is', n(to), '.'] : ['Double', n(value), 'is', n(value * 2), ', take away', n(-rule.more), ', is', n(to), '.'];
}
function ruleSay(rule: NumRule): Say {
  if (rule.kind === 'plus') return ['The rule is, add', n(rule.by), '.'];
  if (rule.kind === 'minus') return ['The rule is, take away', n(rule.by), '.'];
  if (rule.kind === 'times') return ['The rule is,', n(rule.by), 'times the number.'];
  if (rule.kind === 'double') return ['The rule is, double the number.'];
  return rule.more > 0 ? ['The rule is, double, then add', n(rule.more), '.'] : ['The rule is, double, then take away', n(-rule.more), '.'];
}
function ruleBadge(rule: NumRule): string {
  if (rule.kind === 'plus') return `+${rule.by}`;
  if (rule.kind === 'minus') return `−${rule.by}`;
  if (rule.kind === 'times') return `×${rule.by}`;
  if (rule.kind === 'double') return 'double';
  return rule.more > 0 ? `double +${rule.more}` : `double −${-rule.more}`;
}

// Three pairs across the top; the last one ends in a box. Ids: f (first number), a (arrow), t (second number).
function numberPairScene(p: string, examples: readonly (readonly number[])[], base: number): Scene {
  const pairs: [number, number | null][] = [...examples.map((pair): [number, number | null] => [at(pair, 0), at(pair, 1)]), [base, null]];
  return scene(
    pairs.flatMap(([from, to], i): Piece[] => {
      const x = 0.2 + i * 3.3;
      return [
        { id: `${p}f${i}`, look: numeral(from), x, y: 0.9, w: 1.1, h: 1.1 },
        { id: `${p}a${i}`, look: text('→'), x: x + 1.1, y: 0.9, w: 0.8, h: 1.1 },
        { id: `${p}t${i}`, look: to === null ? { kind: 'box' } : numeral(to), x: x + 1.9, y: 0.9, w: 1.1, h: 1.1 },
      ];
    }),
  );
}
const pairLit = (from: Scene, p: string, i: number, badge?: string): Scene => (badge ? set(light(from, [`${p}f${i}`, `${p}t${i}`]), [`${p}a${i}`], { badge }) : light(from, [`${p}f${i}`, `${p}t${i}`]));
const pairSolved = (from: Scene, p: string, answer: number, badge: string): Scene => alter(pairLit(from, p, 2, badge), (piece) => (piece.id === `${p}t2` ? { ...piece, look: numeral(answer) } : piece));

function numberRuleMoments(p: string, examples: readonly (readonly number[])[], base: number): Moment[] {
  const rule = ruleOf(examples);
  const badge = ruleBadge(rule);
  const [a1, b1, a2] = [at(at(examples, 0), 0), at(at(examples, 0), 1), at(at(examples, 1), 0)];
  const start = numberPairScene(p, examples, base);
  const one = pairLit(start, p, 0);
  const oneRuled = pairLit(start, p, 0, badge);
  const two = pairLit(oneRuled, p, 1, badge);
  const answer = ruled(rule, base);
  return [
    said(['Look at the first pair.', n(a1), 'becomes', n(b1), '.'], one),
    said(stepSay(rule, a1), oneRuled),
    said(['Check the next pair.', ...stepSay(rule, a2), 'It works!'], two),
    said(ruleSay(rule), light(two, [`${p}a0`, `${p}a1`])),
    said(['Now use the rule on', n(base), '.'], pairLit(two, p, 2)),
    said([...stepSay(rule, base), 'The answer is', n(answer), '.'], pairSolved(two, p, answer, badge)),
  ];
}

function numberRuleWhy(question: Question): Moment[] {
  return numberRuleMoments('w', numberRows(question.facts, 'examples'), numberOf(question.facts, 'base'));
}

function numberAnalogyLesson(): Lesson {
  const less = numberPairScene('x', [[9, 6], [5, 2]], 7);
  const lessOne = pairLit(less, 'x', 0, '−3');
  const lessTwo = pairLit(lessOne, 'x', 1, '−3');
  const times = numberPairScene('y', [[2, 6], [3, 9]], 5);
  const timesTwo = pairLit(pairLit(times, 'y', 0, '×3'), 'y', 1, '×3');
  const steps = numberPairScene('z', [[3, 7], [5, 11]], 4);
  const stepsOne = pairLit(steps, 'z', 0, 'double +1');
  const stepsTwo = pairLit(stepsOne, 'z', 1, 'double +1');
  const downBy = (f: Record<string, unknown>): number => at(at(numberRows(f, 'examples'), 0), 0) - at(at(numberRows(f, 'examples'), 0), 1);
  const first = turnQuestion('R-A8', 3, (f) => downBy(f) > 0 && downBy(f) !== 3);
  const second = turnQuestion('R-A8', 4, (f) => {
    const rule = ruleOf(numberRows(f, 'examples'));
    return rule.kind === 'twoStep' && rule.more !== 1 && rule.more > 0;
  });
  return {
    parts: [
      show(told('You know how to find the rule for a pair of numbers. Now there are new rules, and you type the answer.', less)),
      show(said(['Look at the first pair.', n(9), 'becomes', n(6), '. The number got smaller.'], pairLit(less, 'x', 0))),
      show(said([n(9), ', take away', n(3), ', is', n(6), '.'], lessOne)),
      show(said(['Check the next pair.', n(5), ', take away', n(3), ', is', n(2), '. It works!'], lessTwo)),
      show(said(['The rule is, take away', n(3), '. So', n(7), ', take away', n(3), ', is', n(4), '.'], pairSolved(lessTwo, 'x', 4, '−3'))),
      turn(first, numberRuleWhy(first)),
      show(told('Some rules make the number much bigger.', times)),
      show(said(['Is it, add', n(4), '?', n(2), ', and', n(4), 'more, make', n(6), '. But', n(3), ', and', n(4), 'more, make', n(7), ', not', n(9), '.'], pairLit(pairLit(times, 'y', 0, '+4 ?'), 'y', 1))),
      show(said([n(3), 'lots of', n(2), 'make', n(6), '. And', n(3), 'lots of', n(3), 'make', n(9), '.'], timesTwo)),
      show(said(['The rule is,', n(3), 'times the number. So', n(3), 'lots of', n(5), 'make', n(15), '.'], pairSolved(timesTwo, 'y', 15, '×3'))),
      show(said(['Some rules have two steps. Double', n(3), 'is', n(6), ', and', n(1), 'more, is', n(7), '.'], stepsOne)),
      show(said(['Double', n(5), 'is', n(10), ', and', n(1), 'more, is', n(11), '. The rule is, double, then add', n(1), '.'], stepsTwo)),
      show(said(['So double', n(4), 'is', n(8), ', and', n(1), 'more, is', n(9), '.'], pairSolved(stepsTwo, 'z', 9, 'double +1'))),
      turn(second, numberRuleWhy(second)),
      show(told('Try a rule on the first pair. Then check it on the next pair.', light(stepsTwo, ['za0', 'za1']))),
    ],
  };
}

// ---- R-A10 Number series: jumps that take turns, jumps that grow, and doubling ----

const seriesX = (i: number): number => 0.2 + i * 1.63;

// The numbers in a row and a box for the next, with a label under each gap (hidden until it is found).
function seriesScene(p: string, values: readonly number[], labels: readonly string[]): Scene {
  const cells: Piece[] = values.map((value, i) => ({ id: `${p}v${i}`, look: numeral(value), x: seriesX(i), y: 0.6, w: 1.3, h: 1.2 }));
  const box: Piece = { id: `${p}v${values.length}`, look: { kind: 'box' }, x: seriesX(values.length), y: 0.6, w: 1.3, h: 1.2 };
  const jumps: Piece[] = labels.map((label, i) => ({ id: `${p}j${i}`, look: text(label), x: seriesX(i) + 0.9, y: 2, w: 1.1, h: 0.7, gone: true }));
  return scene([...cells, box, ...jumps]);
}
const jumpsShown = (from: Scene, p: string, upTo: number, lit: readonly number[]): Scene => set(set(rest(from), count(`${p}j`, upTo), { gone: false }), lit.map((i) => `${p}j${i}`), { gone: false, lit: true });
const seriesSolved = (from: Scene, p: string, place: number, answer: number): Scene => alter(rest(from), (piece) => (piece.id === `${p}v${place}` ? { ...piece, look: numeral(answer), lit: true } : piece));

function seriesWhy(question: Question): Moment[] {
  const facts = question.facts;
  const start = numberOf(facts, 'start');
  const steps = numbersOf(facts, 'steps');
  const shown = numberOf(facts, 'blankIndex');
  const all = count('wj', shown).map((_, i) => i);
  if (facts.rule === 'times') {
    const factor = at(steps, 0);
    const values = Array.from({ length: shown }, (_, i) => start * factor ** i);
    const last = at(values, shown - 1);
    const board = seriesScene('w', values, values.map(() => `×${factor}`));
    const grows = (from: number): Say => (factor === 2 ? ['Double', n(from), 'is', n(from * 2), '.'] : [n(factor), 'times', n(from), 'is', n(from * factor), '.']);
    return [
      said(['Read the numbers:', ...listed(values), '.'], light(board, count('wv', shown))),
      said(['See how each number grows.', ...grows(at(values, 0)), ...grows(at(values, 1))], jumpsShown(board, 'w', 2, [0, 1])),
      said(factor === 2 ? ['Each number is double the one before.'] : ['Each number is', n(factor), 'times the one before.'], jumpsShown(board, 'w', shown, all)),
      said(['So', ...grows(last), 'The next number is', n(last * factor), '.'], seriesSolved(jumpsShown(board, 'w', shown, []), 'w', shown, last * factor)),
    ];
  }
  const grow = facts.rule === 'grow' ? numberOf(facts, 'grow') : 0;
  const jumps = Array.from({ length: shown }, (_, i) => (facts.rule === 'grow' ? at(steps, 0) + grow * i : at(steps, i % steps.length)));
  const values = jumps.slice(0, shown - 1).reduce((out, jump) => [...out, at(out, out.length - 1) + jump], [start]);
  const last = at(values, shown - 1);
  const next = at(jumps, shown - 1);
  const board = seriesScene('w', values, jumps.map((jump) => `+${jump}`));
  const pattern: Say = facts.rule === 'grow' ? ['Each jump is', n(grow), 'bigger than the one before.'] : ['The jumps take turns:', n(at(steps, 0)), ', then', n(at(steps, 1)), '.'];
  return [
    said(['Read the numbers:', ...listed(values), '.'], light(board, count('wv', shown))),
    said(['Find every jump. The jumps are', ...listed(jumps.slice(0, shown - 1)), '.'], jumpsShown(board, 'w', shown - 1, all.slice(0, shown - 1))),
    said([...pattern, 'So the next jump is', n(next), '.'], jumpsShown(board, 'w', shown, [shown - 1])),
    said([n(last), ', and', n(next), 'more, make', n(last + next), '. The next number is', n(last + next), '.'], seriesSolved(jumpsShown(board, 'w', shown, []), 'w', shown, last + next)),
  ];
}

function numberSeriesLesson(): Lesson {
  const turns = seriesScene('x', [2, 3, 5, 6, 8], ['+1', '+2', '+1', '+2', '+1']);
  const growing = seriesScene('y', [1, 2, 4, 7, 11], ['+1', '+2', '+3', '+4', '+5']);
  const doubles = seriesScene('z', [3, 6, 12, 24], ['×2', '×2', '×2', '×2']);
  const first = turnQuestion('R-A10', 3, (f) => JSON.stringify(f.steps) !== JSON.stringify([1, 2]) && f.start !== 2);
  const second = turnQuestion('R-A10', 4, (f) => f.rule === 'grow' && f.grow === 2);
  return {
    parts: [
      show(told('You know how to find the jump, and jump again. Now the jumps are not all the same.', turns)),
      show(said(['From', n(2), 'to', n(3), 'is a jump of', n(1), '. From', n(3), 'to', n(5), 'is a jump of', n(2), '.'], jumpsShown(turns, 'x', 2, [0, 1]))),
      show(said(['Then a jump of', n(1), ', and a jump of', n(2), 'again.'], jumpsShown(turns, 'x', 4, [2, 3]))),
      show(said(['The jumps take turns:', n(1), ', then', n(2), '. So the next jump is', n(1), '.'], jumpsShown(turns, 'x', 5, [4]))),
      show(said([n(8), ', and', n(1), 'more, make', n(9), '.'], seriesSolved(jumpsShown(turns, 'x', 5, []), 'x', 5, 9))),
      show(told('So find every jump. Then look for the pattern in the jumps.', jumpsShown(turns, 'x', 5, [0, 1, 2, 3, 4]))),
      turn(first, seriesWhy(first)),
      show(said(['Here, the jumps keep growing. The jumps are', ...listed([1, 2, 3, 4]), '.'], jumpsShown(growing, 'y', 4, [0, 1, 2, 3]))),
      show(said(['So the next jump is', n(5), '.', n(11), ', and', n(5), 'more, make', n(16), '.'], seriesSolved(jumpsShown(growing, 'y', 5, [4]), 'y', 5, 16))),
      show(said(['And here, each number is double the one before. Double', n(3), 'is', n(6), '. Double', n(6), 'is', n(12), '.'], jumpsShown(doubles, 'z', 2, [0, 1]))),
      show(said(['So double', n(24), 'is', n(48), '.'], seriesSolved(jumpsShown(doubles, 'z', 4, [3]), 'z', 4, 48))),
      turn(second, seriesWhy(second)),
      show(told('Find the jumps. Then find the pattern in the jumps.', jumpsShown(growing, 'y', 5, [0, 1, 2, 3, 4]))),
    ],
  };
}

// ---- R-A11 Number puzzles: typed answers, then boxes that hold the same number ----

type Pan = (number | 'blank')[];

// The question's own scale, with a line of working under it.
function balance(p: string, left: Pan, right: readonly number[], working: string, lit: 'scale' | 'work' | 'both' = 'work'): Scene {
  return scene([
    { id: `${p}scale`, look: picture({ kind: 'scale', left, right: [...right] }), x: 2, y: 0.1, w: 6, h: 2.9, lit: lit !== 'work' ? true : undefined },
    { id: `${p}work`, look: text(working), x: 1, y: 3.6, w: 8, h: 0.9, lit: lit !== 'scale' ? true : undefined },
  ]);
}

function rightSideSay(right: readonly number[]): Say {
  const total = right.reduce((sum, each) => sum + each, 0);
  return right.length === 1 ? ['One side is', n(total), '.'] : ['One side has', n(at(right, 0)), 'and', n(at(right, 1)), '. Together they make', n(total), '.'];
}
const rightSideText = (right: readonly number[]): string => (right.length === 1 ? `${at(right, 0)}` : `${at(right, 0)} + ${at(right, 1)} = ${at(right, 0) + at(right, 1)}`);
const same = (value: number, copies: number): Say => Array.from({ length: copies }, (_, i): Say => (i === 0 ? [n(value)] : [', and', n(value)])).flat();

function balanceWhy(question: Question): Moment[] {
  const facts = question.facts;
  const right = numbersOf(facts, 'right');
  const total = right.reduce((sum, each) => sum + each, 0);
  if (question.level === 4) {
    const left = (facts.left as unknown[]).map((each): number | 'blank' => (typeof each === 'number' ? each : 'blank'));
    const known = left.reduce<number>((sum, each) => (each === 'blank' ? sum : sum + each), 0);
    const copies = left.filter((each) => each === 'blank').length;
    const remaining = total - known;
    const each = remaining / copies;
    const moments: Moment[] = [said(rightSideSay(right), balance('w', left, right, rightSideText(right)))];
    if (known > 0) moments.push(said(['The other side already has', n(known), '. Take it away.', n(total), ', take away', n(known), ', leaves', n(remaining), '.'], balance('w', left, right, `${total} − ${known} = ${remaining}`)));
    moments.push(said([n(copies), 'boxes, with the same number in each, make', n(remaining), '.'], balance('w', left, right, `${Array.from({ length: copies }, () => '?').join(' + ')} = ${remaining}`, 'both')));
    moments.push(said([...same(each, copies), ', make', n(remaining), '. So each box is', n(each), '.'], balance('w', left.map((value) => (value === 'blank' ? each : value)), right, `${Array.from({ length: copies }, () => each).join(' + ')} = ${remaining}`, 'both')));
    return moments;
  }
  const [known, missing] = [numberOf(facts, 'a'), numberOf(facts, 'b')];
  return [
    said(rightSideSay(right), balance('w', [known, 'blank'], right, rightSideText(right))),
    said(['The other side has', n(known), ', and a box. It must make', n(total), 'too.'], balance('w', [known, 'blank'], right, `${known} + ? = ${total}`, 'both')),
    said([n(total), ', take away', n(known), ', is', n(missing), '. So the box is', n(missing), '.'], balance('w', [known, missing], right, `${total} − ${known} = ${missing}`, 'both')),
  ];
}

function numberPuzzleLesson(): Lesson {
  const first = turnQuestion('R-A11', 3, (f) => numbersOf(f, 'right').length === 2 && f.a !== 5 && f.total !== 11 && numberOf(f, 'b') >= 3 && numberOf(f, 'total') >= 8);
  const second = turnQuestion('R-A11', 4, (f) => {
    const left = f.left as unknown[];
    const known = left[0];
    // One number and two boxes, and the boxes do not hold that same number again.
    return typeof known === 'number' && left.length === 3 && known !== 2 && (numbersOf(f, 'right').reduce((sum, each) => sum + each, 0) - known) / 2 !== known;
  });
  return {
    parts: [
      show(told('You know how to make a scale balance. Now you type the number yourself.', balance('x', [5, 'blank'], [4, 7], '5 + ? = 4 + 7', 'scale'))),
      show(said(['One side has', n(4), 'and', n(7), '. Together they make', n(11), '.'], balance('x', [5, 'blank'], [4, 7], '4 + 7 = 11'))),
      show(said(['The other side has', n(5), ', and a box. It must make', n(11), 'too.'], balance('x', [5, 'blank'], [4, 7], '5 + ? = 11', 'both'))),
      show(said([n(11), ', take away', n(5), ', is', n(6), '. So the box is', n(6), '.'], balance('x', [5, 6], [4, 7], '11 − 5 = 6', 'both'))),
      show(told('Find what one side makes. Then take away the number you already have.', balance('x', [5, 6], [4, 7], '5 + 6 = 4 + 7', 'scale'))),
      turn(first, balanceWhy(first)),
      show(said(['Now there are two empty boxes. Both boxes hold the same number. Together they must make', n(10), '.'], balance('y', ['blank', 'blank'], [10], '? + ? = 10', 'scale'))),
      show(said(['Try', n(4), '.', n(4), ', and', n(4), ', make', n(8), '. That is too small.'], balance('y', ['blank', 'blank'], [10], '4 + 4 = 8'))),
      show(said(['Try', n(5), '.', n(5), ', and', n(5), ', make', n(10), '. Yes! Each box is', n(5), '.'], balance('y', [5, 5], [10], '5 + 5 = 10', 'both'))),
      show(said(['Here, one side already has', n(2), '. Take it away first.', n(14), ', take away', n(2), ', leaves', n(12), '.'], balance('z', [2, 'blank', 'blank', 'blank'], [14], '14 − 2 = 12'))),
      show(said(['Three boxes make', n(12), '.', n(4), ', and', n(4), ', and', n(4), ', make', n(12), '. So each box is', n(4), '.'], balance('z', [2, 4, 4, 4], [14], '4 + 4 + 4 = 12', 'both'))),
      turn(second, balanceWhy(second)),
      show(told('Take away what you know. Then find the number that fills every box.', balance('z', [2, 4, 4, 4], [14], '2 + 4 + 4 + 4 = 14', 'scale'))),
    ],
  };
}

// ---- R-A12 Paper folding: two holes, then three ----

type Fold = 'vertical' | 'horizontal';
interface Hole {
  col: number;
  row: number;
}

// The folded paper on the left, the open paper beside it, and room for a wrong answer on the right.
const PAPER_Y = 0.3;
const PAPER_BOX = 2.6;
const FOLDED_X = 0.3;
const OPEN_X = 3.7;
const WRONG_X = 7;
const paper = (fold: Fold, state: 'folded' | 'unfolded', holes: Hole[]): Visual => ({ kind: 'foldPunch', fold, state, holes });
const twin = (fold: Fold, hole: Hole): Hole => (fold === 'vertical' ? { col: 3 - hole.col, row: hole.row } : { col: hole.col, row: 3 - hole.row });
const paperPiece = (id: string, visual: Visual, x: number, fields: Partial<Piece> = {}): Piece => ({ id, look: picture(visual), x, y: PAPER_Y, w: PAPER_BOX, h: PAPER_BOX, ...fields });
const opens = (p: string): Piece => ({ id: `${p}opens`, look: text('→'), x: 2.95, y: 1.2, w: 0.7, h: 0.8 });

// A spot on a paper for the hand to point at. The paper is drawn 104 wide, with 24 for each of its four squares
// and an edge of 4. A hole's middle is its column and row plus a half.
function spot(left: number, col: number, row: number): Piece {
  const along = (squares: number): number => ((squares * 24 + 4) / 104) * PAPER_BOX;
  return { id: 'spot', look: { kind: 'hand' }, x: left + along(col) - 0.2, y: PAPER_Y + along(row) - 0.2, w: 0.4, h: 0.4 };
}
const holeSpot = (left: number, hole: Hole): Piece => spot(left, hole.col + 0.5, hole.row + 0.5);
// The fold of a folded paper runs through the middle of its place.
const foldSpot = (): Piece => spot(FOLDED_X, 2, 2);
// True when the hole is next to the fold, false when it is at the outer edge.
const nearFold = (fold: Fold, hole: Hole): boolean => (fold === 'vertical' ? hole.col : hole.row) === 1;
const farOrNear = (fold: Fold, hole: Hole): string => (nearFold(fold, hole) ? 'right next to the fold' : 'far from the fold');
// The open paper with the first `done` holes and their twins.
const partlyOpen = (fold: Fold, holes: readonly Hole[], done: number): Visual => paper(fold, 'unfolded', [...holes.slice(0, done), ...holes.slice(0, done).map((hole) => twin(fold, hole))]);

function foldingWhy(question: Question): Moment[] {
  const stimulus = question.stimulus;
  if (stimulus?.kind !== 'foldPunch') throw new Error('A folding question shows a folded paper');
  const { fold, holes } = stimulus;
  const folded = paperPiece('wpaper', stimulus, FOLDED_X);
  const moments: Moment[] = [told('The paper is folded. The thick dark edge is the fold.', pointAt(scene([{ ...folded, lit: true }]), foldSpot()))];
  holes.forEach((hole, i) => {
    const which = i === 0 ? 'This hole' : i === holes.length - 1 ? 'The last hole' : 'The next hole';
    const stage = scene([folded, opens('w'), paperPiece('wopen', partlyOpen(fold, holes, i + 1), OPEN_X)]);
    moments.push(told(`${which} is ${farOrNear(fold, hole)}. So its twin is ${farOrNear(fold, hole)} too, on the other side.`, pointAt(stage, holeSpot(FOLDED_X, hole))));
  });
  moments.push(said(['So', n(holes.length), 'holes become', n(holes.length * 2), '. The open paper looks like this.'], scene([folded, opens('w'), paperPiece('wopen', rightOption(question), OPEN_X, { lit: true })])));
  return moments;
}

function paperFoldingLesson(): Lesson {
  const two: Hole[] = [{ col: 0, row: 0 }, { col: 1, row: 2 }];
  const folded = paperPiece('xpaper', paper('vertical', 'folded', two), FOLDED_X);
  const open = (done: number, fields: Partial<Piece> = {}): Piece => paperPiece('xopen', partlyOpen('vertical', two, done), OPEN_X, fields);
  const slid = paperPiece('xwrong', paper('vertical', 'unfolded', [...two, ...two.map((hole) => ({ col: hole.col + 2, row: hole.row }))]), WRONG_X, { lit: true, crossed: true });
  const three: Hole[] = [{ col: 0, row: 0 }, { col: 2, row: 1 }, { col: 3, row: 0 }];
  const across = paperPiece('ypaper', paper('horizontal', 'folded', three), FOLDED_X);
  const acrossOpen = (fields: Partial<Piece> = {}): Piece => paperPiece('yopen', partlyOpen('horizontal', three, 3), OPEN_X, fields);
  const first = turnQuestion('R-A12', 3, (f) => f.fold === 'horizontal');
  // Holes both next to the fold and far from it.
  const second = turnQuestion('R-A12', 4, (f) => f.fold === 'vertical' && new Set((f.holes as Hole[]).map((hole) => hole.col)).size === 2);
  return {
    parts: [
      show(told('You know that every hole gets a twin across the fold. Now the paper has two holes.', scene([{ ...folded, lit: true }]))),
      show(told('Take one hole at a time. This hole is far from the fold.', pointAt(scene([folded]), holeSpot(FOLDED_X, at(two, 0))))),
      show(told('So its twin is far from the fold too, on the other side.', pointAt(scene([folded, opens('x'), open(1)]), holeSpot(OPEN_X, twin('vertical', at(two, 0)))))),
      show(told('The next hole is right next to the fold. Its twin is right next to the fold too.', pointAt(scene([folded, opens('x'), open(2)]), holeSpot(OPEN_X, twin('vertical', at(two, 1)))))),
      show(said(['Two holes, and two twins. That makes', n(4), 'holes.'], scene([folded, opens('x'), open(2, { lit: true })]))),
      show(told('Be careful. A twin does not slide straight across. It flips over the fold, like in a mirror.', scene([folded, opens('x'), open(2), slid]))),
      turn(first, foldingWhy(first)),
      show(told('Now three holes, and the paper is folded the other way. Find the fold first.', pointAt(scene([across]), foldSpot()))),
      show(told('Give each hole a twin, one at a time. Each twin is just as far from the fold.', scene([across, opens('y'), acrossOpen()]))),
      show(said(['Three holes, and three twins. Count them. There must be', n(6), '.'], scene([across, opens('y'), acrossOpen({ lit: true })]))),
      turn(second, foldingWhy(second)),
      show(told('One hole at a time. Each twin flips across the fold.', scene([{ ...across, lit: true }, opens('y'), acrossOpen({ lit: true })]))),
    ],
  };
}

// ---- R-A13 Pattern completion: a shape and a colour ----

const PLURAL: Record<string, string> = { circle: 'circles', square: 'squares', triangle: 'triangles', star: 'stars', heart: 'hearts' };

function completionWhy(question: Question): Moment[] {
  const blank = numberOf(question.facts, 'blank');
  const [r, c] = [Math.floor(blank / 3), blank % 3];
  const [form = '', colour = ''] = rightCode(question);
  const start = gridScene('w', cellsOf(question), false);
  const done = filled(start, 'w', 3, blank, rightOption(question));
  if (question.level === 3) {
    return [
      told(`Look across the row with the gap. It is a row of ${PLURAL[form] ?? `${form}s`}.`, light(start, rowIds('w', 3, r))),
      told(`Now look down. This column is all ${colour}.`, light(start, colIds('w', 3, c))),
      told(`So the missing piece is ${a(`${colour} ${form}`)}.`, done),
    ];
  }
  const inRow = othersIn(strings(question.facts, 'cells'), [0, 1, 2].map((i) => r * 3 + i), blank);
  const beside = rowIds('w', 3, r).filter((id) => id !== `wc${blank}`);
  return [
    told(`Look across the middle row. It has ${a(at(at(inRow, 0), 0))}, and ${a(at(at(inRow, 1), 0))}. So the ${form} is missing.`, light(start, rowIds('w', 3, r))),
    told(`Now its colors. It has ${at(at(inRow, 0), 1)}, and ${at(at(inRow, 1), 1)}. So ${colour} is missing.`, light(start, beside)),
    told(`The gap needs ${a(`${colour} ${form}`)}. Check going down. It fits there too.`, set(done, colIds('w', 3, c), { lit: true })),
  ];
}

function patternCompletionLesson(): Lesson {
  const rowForms: ShapeName[] = ['circle', 'square', 'heart'];
  const colColours = ['red', 'blue', 'yellow'];
  const plain = gridScene('x', Array.from({ length: 9 }, (_, i): Cell => (i === 5 ? 'blank' : fig(at(rowForms, Math.floor(i / 3)), at(colColours, i % 3)))), false);
  const plainDone = filled(plain, 'x', 3, 5, fig('square', 'yellow'));
  const forms: ShapeName[] = ['circle', 'square', 'star'];
  const colours = ['red', 'blue', 'green'];
  const slanted = gridScene('y', Array.from({ length: 9 }, (_, i): Cell => {
    const [r, c] = [Math.floor(i / 3), i % 3];
    return i === 4 ? 'blank' : fig(at(forms, (r + c) % 3), at(colours, (r + 2 * c) % 3));
  }), false);
  const slantedDone = filled(slanted, 'y', 3, 4, fig('star', 'red'));
  const first = turnQuestion('R-A13', 3, (f) => f.blank !== 5 && at(strings(f, 'rowAttrs'), Math.floor(numberOf(f, 'blank') / 3)) !== 'square' && at(strings(f, 'colAttrs'), numberOf(f, 'blank') % 3) !== 'yellow');
  const second = turnQuestion('R-A13', 4, (f) => !at(strings(f, 'options'), 0).startsWith('star') || !strings(f, 'options').includes('star|red'));
  return {
    parts: [
      show(told('You know how to follow the colors into the gap. Now each piece has a shape, and a color.', light(plain, ['xc5']))),
      show(told('Look across. The top row is all circles. The row with the gap is all squares.', light(plain, rowIds('x', 3, 1)))),
      show(told('So the missing piece is a square.', light(plain, ['xc3', 'xc4']))),
      show(told('Now look down. This column is all yellow.', light(plain, colIds('x', 3, 2)))),
      show(told('A square, and yellow. The missing piece is a yellow square.', plainDone)),
      turn(first, completionWhy(first)),
      show(told('This one is trickier. No row is all one shape, and no row is all one color.', slanted)),
      show(told('But every row has a circle, a square, and a star. And every row has red, blue, and green.', light(slanted, rowIds('y', 3, 0)))),
      show(told('Look at the middle row. It has a square, and a circle. So the star is missing.', light(slanted, rowIds('y', 3, 1)))),
      show(told('Its colors are blue, and green. So red is missing.', light(slanted, ['yc3', 'yc5']))),
      show(told('The gap needs a red star. Check going down. It fits there too.', set(slantedDone, colIds('y', 3, 1), { lit: true }))),
      turn(second, completionWhy(second)),
      show(told('Find the shape that is missing. Then find the color that is missing.', light(slantedDone, ['yc4']))),
    ],
  };
}

// ---- R-A9 Picture analogies, turned around ----

function pairByFirst(word: string): AnalogyPair {
  const found = ANALOGY_PAIRS.find((pair) => pair.first.word === word);
  if (!found) throw new Error(`No pair starts with ${word}`);
  return found;
}
function pairBySecond(word: string): AnalogyPair {
  const found = ANALOGY_PAIRS.find((pair) => pair.second.word === word);
  if (!found) throw new Error(`No pair ends with ${word}`);
  return found;
}
const goesWith = (word: string): string => (MANY.has(word) ? 'go with' : 'goes with');

// The first pair's link, asked from its second picture: "Who lives in the web?"
function backAsk(target: AnalogyPair): Say {
  const thing = w(target.second.word);
  switch (target.relation) {
    case 'wornOn':
      return ['What goes on the', thing, '?'];
    case 'makes':
      return ['Who makes the', thing, '?'];
    case 'usedWith':
      return ['What is used with the', thing, '?'];
    case 'livesIn':
      return ['Who lives in the', thing, '?'];
    case 'weather':
      return ['When do we use the', thing, '?'];
  }
}

// The example pair on top, turned around; the second pair with a box under it; the four choices down the right side.
function backScene(p: string, example: AnalogyPair, target: AnalogyPair, choices: readonly string[]): Scene {
  return scene([
    { id: `${p}a`, look: art(example.second.emoji), x: 0.4, y: 0.2, w: 1.7, h: 1.7 },
    { id: `${p}to1`, look: text('→'), x: 2.3, y: 0.55, w: 1, h: 1 },
    { id: `${p}b`, look: art(example.first.emoji), x: 3.5, y: 0.2, w: 1.7, h: 1.7 },
    { id: `${p}c`, look: art(target.second.emoji), x: 0.4, y: 2.5, w: 1.7, h: 1.7 },
    { id: `${p}to2`, look: text('→'), x: 2.3, y: 2.85, w: 1, h: 1 },
    { id: `${p}box`, look: { kind: 'box' }, x: 3.5, y: 2.5, w: 1.7, h: 1.7 },
    ...choices.map((word, i): Piece => ({ id: `${p}o${i}`, look: art(pairByFirst(word).first.emoji), x: 7.6, y: 0.1 + i * 1.45, w: 1.3, h: 1.3, gone: true })),
  ]);
}

function backMoments(p: string, example: AnalogyPair, target: AnalogyPair, choices: readonly string[]): Moment[] {
  const answer = target.first.word;
  const start = backScene(p, example, target, choices);
  const top = light(start, [`${p}a`, `${p}b`]);
  const asked = set(light(start, [`${p}c`, `${p}box`]), count(`${p}o`, choices.length), { gone: false });
  const moments: Moment[] = [
    said(['The', w(example.second.word), `${goesWith(example.second.word)} the`, w(example.first.word), '.'], top),
    said(['Why?', example.why], light(start, [`${p}a`, `${p}b`, `${p}to1`])),
    said(['The', w(target.second.word), `${goesWith(target.second.word)} what?`, ...backAsk(target)], asked),
  ];
  let now = asked;
  choices.forEach((word, i) => {
    if (word === answer) return;
    now = set(rest(now), [`${p}o${i}`], { lit: true, crossed: true });
    const pair = pairByFirst(word);
    moments.push(said(pair.relation === target.relation ? ['The', w(word), '? No.', pair.why] : ['The', w(word), '? No.'], now));
  });
  const home = alter(rest(now), (piece) => {
    if (piece.id === `${p}o${choices.indexOf(answer)}`) return { ...piece, x: 3.5, y: 2.5, w: 1.7, h: 1.7, lit: true };
    if (piece.id === `${p}box`) return { ...piece, gone: true };
    return piece;
  });
  moments.push(said(['The', w(answer), '? Yes!', target.why], home));
  moments.push(said(['So the', w(target.second.word), `${goesWith(target.second.word)} the`, w(answer), '.'], set(home, [`${p}c`], { lit: true })));
  return moments;
}

function backWhy(question: Question): Moment[] {
  const facts = question.facts;
  return backMoments('w', pairByFirst(at(strings(facts, 'example'), 1)), pairBySecond(String(facts.target)), strings(facts, 'options'));
}

function pictureAnalogyLesson(): Lesson {
  const fish = pairByFirst('fish');
  const spider = pairByFirst('spider');
  const choices = ['bird', 'sock', 'spider', 'fish'];
  const start = backScene('x', fish, spider, choices);
  const worked = backMoments('x', fish, spider, choices);
  const solved = at(worked, worked.length - 1).scene;
  const relationOf = (f: Record<string, unknown>): string => pairBySecond(String(f.target)).relation;
  const first = turnQuestion('R-A9', 3, (f) => relationOf(f) !== 'livesIn');
  const second = turnQuestion('R-A9', 3, (f) => !['livesIn', relationOf(first.facts)].includes(relationOf(f)));
  return {
    parts: [
      show(told('You know how two pairs of pictures go together the same way. Now the pairs are turned around.', start)),
      ...worked.map(show),
      show(told('One wrong picture is already in the first pair. Do not pick it just because you saw it.', light(solved, ['xb', 'xo3']))),
      turn(first, backWhy(first)),
      show(told('Say how the top pair goes together. Then ask the same thing about the picture below.', light(solved, ['xa', 'xb', 'xc']))),
      turn(second, backWhy(second)),
      show(told('Find the link in the first pair. It works both ways round.', light(solved, ['xto1', 'xto2']))),
    ],
  };
}

// ---- R-A14 Picture riddles: four pictures ----

function riddleFor(word: string): Riddle {
  const found = RIDDLES.find((each) => each.word === word);
  if (!found) throw new Error(`No riddle for ${word}`);
  return found;
}

const riddleScene = (p: string, choices: readonly string[]): Scene => scene(choices.map((word, i): Piece => ({ id: `${p}o${i}`, look: art(riddleFor(word).emoji), x: 0.3 + i * 2.4, y: 1, w: 1.9, h: 1.9 })));

function riddleMoments(p: string, riddle: Riddle, choices: readonly string[], checkEach: boolean): Moment[] {
  const start = riddleScene(p, choices);
  const moments: Moment[] = [told(riddle.riddle, light(start, count(`${p}o`, choices.length)))];
  let now = start;
  choices.forEach((word, i) => {
    if (word === riddle.word || !checkEach) return;
    now = set(rest(now), [`${p}o${i}`], { lit: true, crossed: true });
    moments.push(said(['Is it the', w(word), '? No.'], now));
  });
  const right = choices.indexOf(riddle.word);
  const found = set(light(now, [`${p}o${right}`]), choices.map((_, i) => `${p}o${i}`).filter((_, i) => i !== right), { dim: true });
  moments.push(said(['The', w(riddle.word), `is the one that ${riddle.fact}.`], found));
  return moments;
}

function riddleWhy(question: Question): Moment[] {
  const choices = strings(question.facts, 'options');
  return riddleMoments('w', riddleFor(at(choices, choice(question).answerIndex)), choices, true);
}

function riddleLesson(): Lesson {
  const dry = ['shoe', 'fish', 'umbrella', 'bed'];
  const cold = ['clock', 'snow', 'cow', 'book'];
  const worked = riddleMoments('x', riddleFor('umbrella'), dry, true);
  const quick = riddleMoments('y', riddleFor('snow'), cold, false);
  const fresh = (f: Record<string, unknown>): boolean => !['umbrella', 'snow'].some((word) => strings(f, 'options').includes(word));
  const first = turnQuestion('R-A14', 3, fresh);
  const second = turnQuestion('R-A14', 3, (f) => fresh(f) && f.target !== first.facts.target);
  return {
    parts: [
      show(told('You know how to listen to a clue, and find its picture. Now there are four pictures.', riddleScene('x', dry))),
      ...worked.map(show),
      show(told('With more pictures, do not stop at the first one you like. Check every picture against the clue.', rest(at(worked, worked.length - 1).scene))),
      turn(first, riddleWhy(first)),
      show(told('Here is one more. Listen to the whole clue.', riddleScene('y', cold))),
      ...quick.map(show),
      turn(second, riddleWhy(second)),
      show(told('Hear the clue. Check all four. Keep the one that fits.', rest(at(quick, quick.length - 1).scene))),
    ],
  };
}

// ---- R-A15 Word analogies: a wrong word that almost fits ----

const OPTION_X = [0.2, 3.5, 6.8];

// The full pair on top, the pair with a box under it, and the three choices on the table.
function wordPairScene(p: string, first: string, second: string, base: string, choices: readonly string[]): Scene {
  return scene([
    { id: `${p}a`, look: text(first), x: 0.3, y: 0.3, w: 3, h: 1 },
    { id: `${p}to1`, look: text('→'), x: 3.6, y: 0.3, w: 1, h: 1 },
    { id: `${p}b`, look: text(second), x: 4.9, y: 0.3, w: 3, h: 1 },
    { id: `${p}c`, look: text(base), x: 0.3, y: 1.8, w: 3, h: 1 },
    { id: `${p}to2`, look: text('→'), x: 3.6, y: 1.8, w: 1, h: 1 },
    { id: `${p}box`, look: { kind: 'box' }, x: 5.8, y: 1.8, w: 1.1, h: 1 },
    ...choices.map((word, i): Piece => ({ id: `${p}o${i}`, look: text(word), x: at(OPTION_X, i), y: 3.8, w: 3, h: 0.9, gone: true })),
  ]);
}

// The words that link two words, if any relation holds them as a pair: "lives in", "gives us".
function linkOf(first: string, second: string): string | null {
  const found = Object.entries(VERBAL_RELATIONS).find(([, relation]) => relation.pairs.some(([one, two]) => one === first && two === second));
  return found ? (found[0] === 'colour' ? 'is' : found[1].says) : null;
}

// Words said with no "a" before them: describing words, colours and stuff that is not counted.
const BARE = new Set<string>([...(VERBAL_RELATIONS.opposite?.pairs ?? []).flat(), ...(VERBAL_RELATIONS.colour?.pairs ?? []).map(([, colour]) => colour), 'honey', 'milk', 'wool', 'wood', 'grass', 'snow', 'coal', 'paper', 'soup', 'hair']);
const WITH_THE = new Set(['sky', 'floor']);
const lead = (word: string): string => (BARE.has(word) ? '' : WITH_THE.has(word) ? 'the' : /^[aeiou]/.test(word) ? 'an' : 'a');
const withLead = (word: string, capital = false): Say => {
  const article = capital ? lead(word).replace(/^a/, 'A').replace(/^t/, 'T') : lead(word);
  return article ? [article, w(word)] : [w(word)];
};
// "A bird lives in a nest", to say.
const linked = (first: string, says: string, second: string): Say => [...withLead(first, true), says, ...withLead(second)];

function wordAnalogyMoments(p: string, first: string, second: string, base: string, choices: readonly string[], answer: string): Moment[] {
  const says = linkOf(first, second);
  if (!says) throw new Error(`No link for ${first} and ${second}`);
  const start = wordPairScene(p, first, second, base, choices);
  const top = light(start, [`${p}a`, `${p}b`]);
  const link = set(light(start, [`${p}a`, `${p}b`, `${p}to1`]), [`${p}to1`], { badge: says });
  const ask = set(set(light(link, [`${p}c`, `${p}box`]), [`${p}to2`], { badge: says }), count(`${p}o`, choices.length), { gone: false });
  const moments: Moment[] = [
    said([w(first), 'is to', w(second), '.'], top),
    said(['How do they go together?', ...linked(first, says, second), '.'], link),
    said([w(base), 'is to what? Use the same link.'], ask),
  ];
  let now = ask;
  choices.forEach((word, i) => {
    if (word === answer) return;
    now = set(rest(now), [`${p}o${i}`], { lit: true, crossed: true });
    const other = linkOf(base, word);
    moments.push(said(other ? [...linked(base, other, word), '. That is true. But it is not the same link.'] : [w(word), '? No. That does not fit.'], now));
  });
  const right = choices.indexOf(answer);
  const home = alter(rest(now), (piece) => {
    if (piece.id === `${p}o${right}`) return { ...piece, x: 4.9, y: 1.8, h: 1, lit: true };
    if (piece.id === `${p}box`) return { ...piece, gone: true };
    return piece;
  });
  moments.push(said([...linked(base, says, answer), '. Yes! That is the same link.'], home));
  moments.push(said(['So,', w(first), 'is to', w(second), ', as', w(base), 'is to', w(answer), '.'], light(home, [`${p}a`, `${p}b`, `${p}c`, `${p}o${right}`])));
  return moments;
}

function wordAnalogyWhy(question: Question): Moment[] {
  const facts = question.facts;
  const [first = '', second = ''] = strings(facts, 'from');
  const choices = strings(facts, 'options');
  return wordAnalogyMoments('w', first, second, String(facts.base), choices, at(choices, choice(question).answerIndex));
}

function wordAnalogyLesson(): Lesson {
  const keys = ['lock', 'nest', 'piano'];
  const start = wordPairScene('x', 'page', 'book', 'key', keys);
  const worked = wordAnalogyMoments('x', 'page', 'book', 'key', keys, 'piano');
  const sheep = set(wordPairScene('y', 'cow', 'milk', 'sheep', ['lamb', 'wool', 'sty']), count('yo', 3), { gone: false });
  const lambOut = set(light(sheep, ['yo0']), ['yo0'], { crossed: true });
  const woolIn = alter(rest(lambOut), (piece) => (piece.id === 'yo1' ? { ...piece, x: 4.9, y: 1.8, h: 1, lit: true } : piece.id === 'ybox' ? { ...piece, gone: true } : piece));
  // Each turn has a wrong word that goes with the last word in another way.
  const with3 = (f: Record<string, unknown>, base: string, near: string, right: string): boolean =>
    f.base === base && strings(f, 'options').includes(near) && strings(f, 'options').includes(right) && !['cow', 'sheep', 'page', 'key'].some((word) => strings(f, 'from').includes(word));
  const first = turnQuestion('R-A15', 3, (f) => with3(f, 'hen', 'chick', 'egg'));
  const second = turnQuestion('R-A15', 3, (f) => with3(f, 'horse', 'foal', 'stable'));
  return {
    parts: [
      show(told('You know how to find the link in a pair of words. Now, one wrong word almost fits.', start)),
      ...worked.map(show),
      show(told('A wrong word may go with the word in another way. So always use the link from the first pair.', light(at(worked, worked.length - 1).scene, ['xto1', 'xto2']))),
      turn(first, wordAnalogyWhy(first)),
      show(said(['Here is another.', w('cow'), 'is to', w('milk'), '. A cow gives us milk.'], set(light(sheep, ['ya', 'yb']), ['yto1'], { badge: 'gives us' }))),
      show(said(['A', w('sheep'), 'has a baby called a', w('lamb'), '. That is true. But it is not the same link.'], lambOut)),
      show(said(['A', w('sheep'), 'gives us', w('wool'), '. Yes! That is the same link.'], woolIn)),
      turn(second, wordAnalogyWhy(second)),
      show(told('Find the link in the first pair. Use that link, and no other.', light(woolIn, ['yto1', 'yto2']))),
    ],
  };
}

// ---- R-A16 Which word does not belong: four close words ----

const GROUP_NAMES: Record<string, string> = { fruit: 'fruits', vegetable: 'vegetables', farmAnimal: 'farm animals', wildAnimal: 'wild animals', land: 'things that go on land', water: 'things that go on water', clothes: 'clothes', furniture: 'furniture', colour: 'colours', shape: 'shapes', weather: 'kinds of weather' };
// What the odd word is instead: "But a boat goes on water."
const ODD_IS: Record<string, string> = { fruit: 'is a fruit', vegetable: 'is a vegetable', farmAnimal: 'is a farm animal', wildAnimal: 'is a wild animal', land: 'goes on land', water: 'goes on water', clothes: 'is something to wear', furniture: 'is furniture', colour: 'is a color', shape: 'is a shape', weather: 'is a kind of weather' };

function classOf(word: string): string {
  const found = Object.entries(WORD_CLASSES).find(([, members]) => members.includes(word));
  if (!found) throw new Error(`No group holds ${word}`);
  return found[0];
}
// The group three of the words share, and the word outside it.
function sorted(list: readonly string[]): { group: string; odd: string } {
  const odd = list.find((word) => list.filter((other) => classOf(other) === classOf(word)).length === 1);
  if (!odd) throw new Error('No word is alone');
  return { group: classOf(at(list.filter((word) => word !== odd), 0)), odd };
}

const wordX = (i: number): number => 0.15 + i * 2.45;

// Four words in a row, and the name of the group three of them share, hidden.
function wordsScene(p: string, list: readonly string[]): Scene {
  return scene([...list.map((word, i): Piece => ({ id: `${p}w${i}`, look: text(word), x: wordX(i), y: 0.9, w: 2.3, h: 0.9 })), { id: `${p}g`, look: text('group'), x: 1, y: 2.2, w: 8, h: 0.7, gone: true }]);
}
const labelled = (from: Scene, p: string, label: string): Scene => alter(from, (piece) => (piece.id === `${p}g` ? { ...piece, look: text(label), gone: false } : piece));

function oddWordMoments(p: string, list: readonly string[]): Moment[] {
  const { group, odd } = sorted(list);
  const start = wordsScene(p, list);
  const oddAt = list.indexOf(odd);
  const others = list.filter((word) => word !== odd);
  const otherIds = list.map((_, i) => `${p}w${i}`).filter((_, i) => i !== oddAt);
  const grouped = labelled(light(start, otherIds), p, GROUP_NAMES[group] ?? group);
  const article = classOf(odd) === 'colour' ? [] : [/^[aeiou]/.test(odd) ? 'an' : 'a'];
  return [
    said(['Read the words:', ...named(list), '.'], light(start, count(`${p}w`, list.length))),
    said([...named(others), `are all ${GROUP_NAMES[group] ?? group}.`], grouped),
    said(['But', ...article, w(odd), `${ODD_IS[classOf(odd)] ?? 'is not'}.`], light(grouped, [`${p}w${oddAt}`])),
    said(['So', w(odd), 'does not belong.'], set(light(grouped, [`${p}w${oddAt}`]), otherIds, { dim: true })),
  ];
}

function oddWordWhy(question: Question): Moment[] {
  return oddWordMoments('w', strings(question.facts, 'words'));
}

function oddWordLesson(): Lesson {
  const going = ['car', 'boat', 'bus', 'train'];
  const food = ['apple', 'plum', 'onion', 'pear'];
  const start = wordsScene('x', going);
  const [read, ...closer] = oddWordMoments('x', going);
  const foodStart = wordsScene('y', food);
  const used = ['land', 'water', 'fruit', 'vegetable'];
  const first = turnQuestion('R-A16', 3, (f) => !used.includes(sorted(strings(f, 'words')).group));
  const second = turnQuestion('R-A16', 3, (f) => ![...used, sorted(strings(first.facts, 'words')).group, classOf(sorted(strings(first.facts, 'words')).odd)].includes(sorted(strings(f, 'words')).group));
  return {
    parts: [
      show(told('You know how to find the word that does not belong. Now there are four words, and they are all close.', start)),
      ...(read ? [show(read)] : []),
      show(told('All of them take us places. So we must look closer.', labelled(rest(start), 'x', 'take us places'))),
      ...closer.map(show),
      show(told('When every word seems to fit, name the group more carefully.', rest(at(closer, closer.length - 1).scene))),
      turn(first, oddWordWhy(first)),
      show(said(['Here is another:', ...named(food), '. They are all food. So look closer.'], labelled(light(foodStart, count('yw', 4)), 'y', 'food'))),
      show(said([...named(['apple', 'plum', 'pear']), 'are all fruits. But an', w('onion'), 'is a vegetable.'], set(labelled(light(foodStart, ['yw2']), 'y', 'fruits'), ['yw0', 'yw1', 'yw3'], { dim: true }))),
      turn(second, oddWordWhy(second)),
      show(told('Name the group as exactly as you can. Then find the word outside it.', rest(foodStart))),
    ],
  };
}

// ---- R-A17 Number grids: the first two add up to the third ----

// A 3 by 3 grid of numbers. A cell of -1 is the box.
function numberGridScene(p: string, rows: readonly (readonly number[])[]): Scene {
  return scene(rows.flatMap((row, r) => row.map((value, c): Piece => ({ id: `${p}c${r}${c}`, look: value < 0 ? { kind: 'box' } : numeral(value), x: 2.6 + c * 1.7, y: 0.3 + r * 1.45, w: 1.3, h: 1.2 }))));
}
const gridRow = (p: string, r: number): string[] => [0, 1, 2].map((c) => `${p}c${r}${c}`);
const rowSum = (from: Scene, p: string, r: number, row: readonly number[]): Scene => set(light(from, gridRow(p, r)), [`${p}c${r}2`], { badge: `${at(row, 0)} + ${at(row, 1)}` });

// The bottom row, solved: the box becomes its number.
function bottomSolved(from: Scene, p: string, rows: readonly (readonly number[])[]): { scene: Scene; say: Say; answer: number } {
  const bottom = at(rows, 2);
  const blank = bottom.indexOf(-1);
  const first = at(bottom, 0);
  const answer = blank === 2 ? first + at(bottom, 1) : at(bottom, 2) - first;
  const total = blank === 2 ? answer : at(bottom, 2);
  const other = blank === 2 ? at(bottom, 1) : answer;
  const done = alter(light(from, gridRow(p, 2)), (piece) => (piece.id === `${p}c2${blank}` ? { ...piece, look: numeral(answer) } : piece.id === `${p}c22` ? { ...piece, badge: `${first} + ${other}` } : piece));
  const say: Say = blank === 2 ? [n(first), ', and', n(other), ', make', n(total), '. So the box is', n(answer), '.'] : [n(first), ', and what, make', n(total), '? Count on from', n(first), '.', n(first), ', and', n(answer), ', make', n(total), '. So the box is', n(answer), '.'];
  return { scene: done, say, answer };
}

function sumGridWhy(question: Question): Moment[] {
  const rows = numberRows(question.facts, 'rows');
  const start = numberGridScene('w', rows);
  const [top, middle] = [at(rows, 0), at(rows, 1)];
  const one = rowSum(start, 'w', 0, top);
  const two = rowSum(one, 'w', 1, middle);
  const solved = bottomSolved(two, 'w', rows);
  return [
    said(['Look at the top row.', n(at(top, 0)), ', and', n(at(top, 1)), ', make', n(at(top, 2)), '.'], one),
    said(['The middle row does the same.', n(at(middle, 0)), ', and', n(at(middle, 1)), ', make', n(at(middle, 2)), '.'], two),
    told('Now the bottom row. The first two numbers must add up to the third.', light(two, gridRow('w', 2))),
    said(solved.say, solved.scene),
  ];
}

function numberGridLesson(): Lesson {
  const sums = [[2, 3, 5], [6, 1, 7], [4, 5, -1]];
  const gap = [[1, 6, 7], [4, 4, 8], [3, -1, 8]];
  const start = numberGridScene('x', sums);
  const one = rowSum(start, 'x', 0, at(sums, 0));
  const two = rowSum(one, 'x', 1, at(sums, 1));
  const gapStart = numberGridScene('y', gap);
  const gapRows = rowSum(rowSum(gapStart, 'y', 0, at(gap, 0)), 'y', 1, at(gap, 1));
  const first = turnQuestion('R-A17', 3, (f) => at(at(numberRows(f, 'rows'), 2), 2) === -1 && at(at(numberRows(f, 'rows'), 2), 0) !== 4 && at(at(numberRows(f, 'rows'), 2), 0) + at(at(numberRows(f, 'rows'), 2), 1) !== 9);
  const second = turnQuestion('R-A17', 3, (f) => at(at(numberRows(f, 'rows'), 2), 1) === -1 && at(at(numberRows(f, 'rows'), 2), 0) !== 3 && at(at(numberRows(f, 'rows'), 2), 2) - at(at(numberRows(f, 'rows'), 2), 0) !== 5 && at(at(numberRows(f, 'rows'), 1), 0) !== 6);
  return {
    parts: [
      show(told('You know that every row of a number grid follows the same rule. Now the rule is not a jump.', start)),
      show(said(['From', n(2), 'to', n(3), 'is a jump of', n(1), '. From', n(3), 'to', n(5), 'is a jump of', n(2), '. The jumps are not the same.'], light(start, gridRow('x', 0)))),
      show(said(['So try adding.', n(2), ', and', n(3), ', make', n(5), '.'], one)),
      show(said(['Check the middle row.', n(6), ', and', n(1), ', make', n(7), '. It works!'], two)),
      show(said(['So in the bottom row,', n(4), ', and', n(5), ', make', n(9), '.'], bottomSolved(two, 'x', sums).scene)),
      show(told('When the jumps do not match, try adding the first two numbers.', rest(bottomSolved(two, 'x', sums).scene))),
      turn(first, sumGridWhy(first)),
      show(said(['Sometimes the box is in the middle.', n(3), ', and what, make', n(8), '?'], light(gapRows, gridRow('y', 2)))),
      show(said(['Count on from', n(3), 'to', n(8), '. That is', n(5), 'more. So the box is', n(5), '.'], bottomSolved(gapRows, 'y', gap).scene)),
      turn(second, sumGridWhy(second)),
      show(told('The first two numbers, added together, make the third.', rest(bottomSolved(gapRows, 'y', gap).scene))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'R-A1': oddShapeLesson,
  'R-A2': whichBelongsLesson,
  'R-A3': figureAnalogyLesson,
  'R-A4': figureMatrixLesson,
  'R-A5': turningShapesLesson,
  'R-A6': mirrorImagesLesson,
  'R-A7': threeRulePatternLesson,
  'R-A8': numberAnalogyLesson,
  'R-A9': pictureAnalogyLesson,
  'R-A10': numberSeriesLesson,
  'R-A11': numberPuzzleLesson,
  'R-A12': paperFoldingLesson,
  'R-A13': patternCompletionLesson,
  'R-A14': riddleLesson,
  'R-A15': wordAnalogyLesson,
  'R-A16': oddWordLesson,
  'R-A17': numberGridLesson,
};
