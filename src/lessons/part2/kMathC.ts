import { COUNTABLES } from '../../content/data/countables';
import { HOLD_THINGS, SOLID_THINGS, WEIGHT_THINGS } from '../../content/data/h1-things';
import type { Shaped, Tiered } from '../../content/data/h1-things';
import { figureFor } from '../../engine/figures';
import type { Question, Say, SayPart, ShapeName, SolidName, Visual } from '../../engine/types';
import { add, alter, art, calm, countAlong, moment, numeral, picture, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, PieceLook, Scene } from '../types';

// Part 2 lessons (plan section 16): a second short lesson for a skill's harder levels, offered once the child is
// about half way up the skill. Kindergarten Math: shapes, measuring, sorting and patterns, each at its top level.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

type Choice = Extract<Question, { type: 'choice' }>;

function asChoice(question: Question): Choice {
  if (question.type !== 'choice') throw new Error(`${question.skillId} is not a choice`);
  return question;
}

function at<T>(list: readonly T[], i: number): T {
  const value = list[i];
  if (value === undefined) throw new Error(`Nothing at place ${i}`);
  return value;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((each): each is string => typeof each === 'string')) throw new Error('Not a list of words');
  return value;
}

const flat = (shape: ShapeName, color: string, size: 's' | 'm' | 'l' = 'm', rotation = 0): Visual => ({ kind: 'shape', shape, color, size, rotation });
const solid = (name: SolidName): Visual => ({ kind: 'solid', solid: name });
const an = (word: string): string => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);
const cap = (words: string): string => words.charAt(0).toUpperCase() + words.slice(1);

function pieceOf(from: Scene, id: string): Piece {
  const piece = from.pieces.find((each) => each.id === id);
  if (!piece) throw new Error(`No piece ${id}`);
  return piece;
}

// Lights these pieces and fades every other one back.
const only = (from: Scene, keep: readonly string[]): Scene => {
  const pick = new Set(keep);
  return alter(from, (piece) => (pick.has(piece.id) ? { ...piece, lit: true, dim: undefined } : { ...piece, lit: undefined, dim: true }));
};

// Lights these pieces and lets the others rest (no fading).
const light = (from: Scene, ids: readonly string[]): Scene => set(calm(from), ids, { lit: true });

const changeLook = (from: Scene, id: string, look: PieceLook): Scene => alter(from, (piece) => (piece.id === id ? { ...piece, look } : piece));

// The question's own options, side by side.
function optionRow(question: Choice, prefix: string): Scene {
  const xs = question.options.length === 2 ? [2.5, 5.5] : [1, 4, 7];
  return scene(question.options.map((option, i): Piece => ({ id: `${prefix}${i}`, look: picture(option), x: xs[i] ?? 4, y: 1.5, w: 2, h: 2 })));
}

// ---- M-K-E1 Name flat shapes, part 2: the shapes are turned ----

const FLAT_FACT: Record<string, { say: Say; text: string }> = {
  square: { say: ['A square has', { number: 4 }, 'sides, all the same length.'], text: 'A square has 4 sides, all the same length.' },
  triangle: { say: ['A triangle has', { number: 3 }, 'sides.'], text: 'A triangle has 3 sides.' },
  rectangle: { say: ['A rectangle has', { number: 2 }, 'long sides, and', { number: 2 }, 'short sides.'], text: 'A rectangle has 2 long sides and 2 short sides.' },
  hexagon: { say: ['A hexagon has', { number: 6 }, 'sides.'], text: 'A hexagon has 6 sides.' },
  oval: { say: ['An oval is like a stretched circle.'], text: 'An oval is like a stretched circle.' },
};

// Hear the name, remember what that shape is like, turn the shape straight in your mind, and find it.
function turnedWhy(question: Question): Moment[] {
  const q = asChoice(question);
  const target = str(q.facts, 'target');
  const fact = FLAT_FACT[target];
  if (!fact) throw new Error(`No fact for ${target}`);
  const start = optionRow(q, 'w');
  const rightId = `w${q.answerIndex}`;
  const right = at(q.options, q.answerIndex);
  const straight: Visual = right.kind === 'shape' ? { ...right, rotation: 0 } : right;
  const pointed = pointAt(set(start, [rightId], { lit: true }), pieceOf(start, rightId));
  const turnedBack = only(changeLook(withoutHand(pointed), rightId, picture(straight)), [rightId]);
  return [
    moment([`We are looking for the ${target}. The shapes are all turned.`], `Find the ${target}.`, start),
    moment(fact.say, fact.text, pointed),
    moment(['Turn this one straight in your mind. Now it is easy to see.'], 'Turn it straight.', turnedBack),
    moment([`So this one is the ${target}. It was only turned.`], `This is the ${target}.`, only(start, [rightId])),
  ];
}

function turnedShapesLesson(): Lesson {
  const straight = scene([
    { id: 'asquare', look: picture(flat('square', 'blue')), x: 4, y: 1.2, w: 2, h: 2 },
    { id: 'anote', look: text('4 sides'), x: 3.25, y: 3.5, w: 3.5, h: 0.8, gone: true },
  ]);
  const named = set(straight, ['asquare'], { lit: true });
  const turned = changeLook(named, 'asquare', picture(flat('square', 'blue', 'm', 30)));
  const counted = set(turned, ['anote'], { gone: false, lit: true });
  const still = changeLook(counted, 'anote', text('still a square'));

  // The two shapes with four sides, both turned.
  const pair = scene([
    { id: 'brectangle', look: picture(flat('rectangle', 'green', 'm', 30)), x: 1.5, y: 1.2, w: 2, h: 2 },
    { id: 'bsquare', look: picture(flat('square', 'green', 'm', 15)), x: 6.5, y: 1.2, w: 2, h: 2 },
    { id: 'brectangleword', look: text('long and short'), x: 0.75, y: 3.5, w: 3.5, h: 0.8, gone: true },
    { id: 'bsquareword', look: text('all the same'), x: 5.75, y: 3.5, w: 3.5, h: 0.8, gone: true },
  ]);
  const rectangle = set(pair, ['brectangle', 'brectangleword'], { lit: true, gone: false });
  const square = set(calm(rectangle), ['bsquare', 'bsquareword'], { lit: true, gone: false });

  const first = turnQuestion('M-K-E1', 3, (f) => f.target === 'triangle');
  const second = turnQuestion('M-K-E1', 3, (f) => f.target === 'rectangle' && strings(f.options).includes('square'));
  return {
    parts: [
      show(moment(['You know the names of flat shapes. Now the shapes may be turned.'], 'Turned shapes', straight)),
      show(moment(['This is a square. It has', { number: 4 }, 'sides, all the same length.'], 'A square has 4 sides, all the same length.', named)),
      show(moment(['Watch. We turn the square a little.'], 'Turn it a little.', turned)),
      show(moment(['It looks different, but nothing has changed. It still has', { number: 4 }, 'sides, all the same length.'], 'Still 4 sides, all the same length.', counted)),
      show(moment(['So it is still a square. A turned shape keeps its name.'], 'A turned shape keeps its name.', still)),
      turn(first, turnedWhy(first)),
      show(moment(['Be careful with these two. Both have', { number: 4 }, 'sides.'], 'Both have 4 sides.', pair)),
      show(moment(['The rectangle has', { number: 2 }, 'long sides, and', { number: 2 }, 'short sides.'], 'A rectangle: 2 long sides, 2 short sides.', rectangle)),
      show(moment(['The sides of the square are all the same length.'], 'A square: all sides the same.', square)),
      turn(second, turnedWhy(second)),
      show(moment(['Turn the shape straight in your mind. Then look at its sides.'], 'Turn it straight. Look at the sides.', light(square, ['brectangle', 'bsquare']))),
    ],
  };
}

// ---- M-K-E2 Name solid shapes, part 2: flat or solid ----

// Each option is named flat or solid, the ones that are not wanted first, then the one that is.
function flatSolidWhy(question: Question): Moment[] {
  const q = asChoice(question);
  const target = str(q.facts, 'target');
  const names = strings(q.facts.names);
  const kinds = strings(q.facts.optionAttrs);
  const start = add(
    optionRow(q, 'w'),
    kinds.map((kind, i): Piece => ({ id: `wword${i}`, look: text(kind), x: 0.75 + i * 3, y: 3.7, w: 2.5, h: 0.8, gone: true })),
  );
  const order = [...kinds.map((_, i) => i).filter((i) => i !== q.answerIndex), q.answerIndex];
  let now = start;
  const named: Moment[] = order.map((i) => {
    const name = at(names, i);
    const kind = at(kinds, i);
    now = set(calm(now), [`w${i}`, `wword${i}`], { lit: true, gone: false });
    const line = kind === 'flat' ? `${cap(an(name))} is flat, like a drawing on paper.` : `${cap(an(name))} is solid. You could hold it in your hands.`;
    return moment([line], `${cap(an(name))} is ${kind}.`, now);
  });
  const rightName = at(names, q.answerIndex);
  return [
    moment([`We want the ${target} shape. Look at each one.`], `Find the ${target} shape.`, start),
    ...named,
    moment([`So the ${rightName} is the ${target} shape.`], `The ${rightName} is the ${target} shape.`, only(now, [`w${q.answerIndex}`, `wword${q.answerIndex}`])),
  ];
}

function flatOrSolidLesson(): Lesson {
  const start = scene([
    { id: 'asquare', look: picture(flat('square', 'blue')), x: 1.5, y: 1.3, w: 2, h: 2 },
    { id: 'acube', look: picture(solid('cube')), x: 6.5, y: 1.3, w: 2, h: 2 },
    { id: 'aflat', look: text('flat'), x: 1.25, y: 3.6, w: 2.5, h: 0.8, gone: true },
    { id: 'asolid', look: text('solid'), x: 6.25, y: 3.6, w: 2.5, h: 0.8, gone: true },
  ]);
  const square = set(start, ['asquare', 'aflat'], { lit: true, gone: false });
  const cube = set(calm(square), ['acube', 'asolid'], { lit: true, gone: false });
  const thick = pointAt(cube, pieceOf(cube, 'acube'));
  const both = light(withoutHand(thick), ['asquare', 'acube', 'aflat', 'asolid']);
  const words = light(both, ['aflat', 'asolid']);

  const first = turnQuestion('M-K-E2', 3, (f) => f.target === 'solid' && !strings(f.names).includes('cube') && !strings(f.names).includes('square'));
  const second = turnQuestion('M-K-E2', 3, (f) => f.target === 'flat' && !strings(f.names).includes('square') && !strings(f.names).some((name) => strings(first.facts.names).includes(name) && name !== 'cube'));
  return {
    parts: [
      show(moment(['You know the names of the solid shapes. Now let us tell flat shapes and solid shapes apart.'], 'Flat or solid?', start)),
      show(moment(['This is a square. It is flat, like a drawing on paper.'], 'A square is flat.', square)),
      show(moment(['This is a cube. It is solid, like a box. You could hold it in your hands.'], 'A cube is solid.', cube)),
      show(moment(['Look closely at the cube. You can see its top, and its sides. It is thick.'], 'A solid shape is thick.', thick)),
      show(moment(['A flat shape is like a drawing. A solid shape is thick, and you could hold it.'], 'Flat: like a drawing. Solid: you could hold it.', both)),
      turn(first, flatSolidWhy(first)),
      show(moment(['Sometimes we look for the flat one. Listen for the word: flat, or solid.'], 'Listen: flat, or solid?', words)),
      turn(second, flatSolidWhy(second)),
      show(moment(['Ask yourself: could I hold it in my hands? Then it is solid.'], 'Could I hold it? Then it is solid.', light(both, ['acube', 'asolid']))),
    ],
  };
}

// ---- M-K-E4 Position words, part 2: pick the picture that fits the words ----

type Where = 'above' | 'below' | 'beside';
const THING_NAME: Record<string, string> = { '🐱': 'cat', '🐶': 'dog', '⚽': 'ball', '🐦': 'bird' };
const WHERE_WORDS: Record<Where, string> = { above: 'above', below: 'below', beside: 'next to' };
const WHERE_MEANS: Record<Where, string> = { above: 'higher up than the box', below: 'lower down than the box', beside: 'right at the side of the box' };

// One thing and the box, as the questions draw them: places on a grid 5 wide and 4 high.
const placed = (emoji: string, thing: number, box: number): Visual => ({ kind: 'emojiGroup', emoji, count: 1, emoji2: '📦', count2: 1, layout: 'scatter', slots: [thing, box] });

function asWhere(word: string): Where {
  if (word !== 'above' && word !== 'below' && word !== 'beside') throw new Error(`No position word ${word}`);
  return word;
}

// Three pictures, each in its own frame, with its position word under it (hidden until it is checked).
// Each picture is checked in turn, the ones that do not fit first.
function pickPictureMoments(prefix: string, name: string, want: Where, kinds: Where[], pictures: Visual[], answerIndex: number): Moment[] {
  const xs = [0.1, 3.4, 6.7];
  const start = scene(
    pictures.flatMap((each, i): Piece[] => [
      { id: `${prefix}frame${i}`, look: { kind: 'box' }, x: xs[i] ?? 0, y: 0.5, w: 3.2, h: 2.6 },
      { id: `${prefix}${i}`, look: picture(each), x: xs[i] ?? 0, y: 0.5, w: 3.2, h: 2.6 },
      { id: `${prefix}word${i}`, look: text(WHERE_WORDS[at(kinds, i)]), x: xs[i] ?? 0, y: 3.4, w: 3.2, h: 0.8, gone: true },
    ]),
  );
  const order = [...kinds.map((_, i) => i).filter((i) => i !== answerIndex), answerIndex];
  let now = start;
  const checked: Moment[] = order.map((i, step) => {
    const kind = at(kinds, i);
    now = alter(now, (piece) => {
      if (piece.id === `${prefix}${i}` || piece.id === `${prefix}word${i}`) return { ...piece, lit: true, gone: false };
      if (piece.id.startsWith(`${prefix}frame`)) return piece;
      return { ...piece, lit: undefined, dim: piece.gone ? undefined : true };
    });
    const where = `Here, the ${name} is ${WHERE_MEANS[kind]}. That is ${WHERE_WORDS[kind]} the box.`;
    const line = i === answerIndex ? `${where} This is the one.` : step === 0 ? `Find the box first. ${where}` : where;
    return moment([line], `${WHERE_WORDS[kind]} the box`, now);
  });
  return [moment([`We want the ${name} ${WHERE_WORDS[want]} the box. Check each picture.`], `the ${name} ${WHERE_WORDS[want]} the box`, start), ...checked];
}

function pickPictureWhy(question: Question): Moment[] {
  const q = asChoice(question);
  const firstOption = at(q.options, 0);
  const name = firstOption.kind === 'emojiGroup' ? (THING_NAME[firstOption.emoji] ?? 'ball') : 'ball';
  return pickPictureMoments('w', name, asWhere(str(q.facts, 'want')), strings(q.facts.options).map(asWhere), q.options, q.answerIndex);
}

function pickPictureLesson(): Lesson {
  const worked = pickPictureMoments('a', 'dog', 'above', ['beside', 'below', 'above'], [placed('🐶', 8, 7), placed('🐶', 12, 7), placed('🐶', 2, 7)], 2);
  const opening = at(worked, 0).scene;
  const end = at(worked, worked.length - 1).scene;
  const all = alter(end, (piece) => (piece.id.startsWith('aframe') ? piece : { ...piece, lit: piece.id.startsWith('aword') ? true : undefined, dim: undefined }));

  const first = turnQuestion('M-K-E4', 3, (f) => f.want === 'below');
  const second = turnQuestion('M-K-E4', 3, (f) => f.want === 'beside');
  return {
    parts: [
      show(moment(['You know the words above, below, and next to. Now you will pick the picture that fits the words.'], 'Pick the picture that fits.', opening)),
      ...worked.map(show),
      show(moment(['Do not stop at the first picture. Check every one, and find the box first.'], 'Check every picture.', all)),
      turn(first, pickPictureWhy(first)),
      show(moment(['Listen carefully for the position word. It tells you which picture to pick.'], 'Listen for the position word.', all)),
      turn(second, pickPictureWhy(second)),
      show(moment(['Hear the words, find the box, and check each picture.'], 'Hear the words. Find the box. Check each one.', calm(all))),
    ],
  };
}

// ---- M-K-E5 Shapes made from shapes, part 2: which pieces make the shape ----

const MADE: readonly { piece: string; count: number; makes: string }[] = [
  { piece: 'square', count: 2, makes: 'rectangle' },
  { piece: 'triangle', count: 2, makes: 'square' },
  { piece: 'trapezoid', count: 2, makes: 'hexagon' },
  { piece: 'triangle', count: 6, makes: 'hexagon' },
  { piece: 'square', count: 4, makes: 'square' },
];

// A set of pieces as the questions draw it: pulled a little apart.
function pieceSet(piece: string, count: number, makes: string): Visual {
  const figure = figureFor(makes, piece, count);
  if (!figure) throw new Error(`No figure for ${count} ${piece}s making a ${makes}`);
  return { kind: 'figure', figure, show: 'pieces' };
}

// What a set of pieces makes when it is pushed together.
function madeBy(visual: Visual): string {
  const found = MADE.find((each) => visual.kind === 'figure' && figureFor(each.makes, each.piece, each.count) === visual.figure);
  if (!found) throw new Error('Pieces the lesson does not know');
  return found.makes;
}

const pushed = (visual: Visual): Visual => (visual.kind === 'figure' ? { ...visual, show: 'cut' } : visual);

// The shape wanted on top, the sets of pieces under it. Each set is pushed together in turn, the ones that make
// something else first; the last moment shows the right set as the question drew it.
function piecesMoments(prefix: string, makes: string, options: Visual[], answerIndex: number): Moment[] {
  const xs = options.length === 2 ? [2, 5.6] : [0.5, 3.8, 7.1];
  const start = scene([
    { id: `${prefix}target`, look: picture(flat(makes as ShapeName, 'orange', 'l')), x: 4.05, y: 0, w: 1.9, h: 1.9, lit: true },
    ...options.map((option, i): Piece => ({ id: `${prefix}${i}`, look: picture(option), x: xs[i] ?? 0, y: 2.3, w: 2.4, h: 2.4 })),
  ]);
  const wrong = options.map((_, i) => i).filter((i) => i !== answerIndex);
  let now = start;
  const tried: Moment[] = wrong.map((i, step) => {
    const option = at(options, i);
    now = alter(now, (piece) => {
      if (piece.id === `${prefix}${i}`) return { ...piece, look: picture(pushed(option)), lit: true };
      if (piece.id === `${prefix}target`) return piece;
      return { ...piece, lit: undefined, dim: piece.dim };
    });
    const made = madeBy(option);
    const line = step === 0 ? `Push these pieces together. They make ${an(made)}, not ${an(makes)}.` : `Now these ones. They make ${an(made)}, not ${an(makes)}.`;
    const said = moment([line], `${cap(an(made))}, not ${an(makes)}.`, now);
    now = set(now, [`${prefix}${i}`], { lit: undefined, dim: true });
    return said;
  });
  const right = at(options, answerIndex);
  const joined = alter(now, (piece) => (piece.id === `${prefix}${answerIndex}` ? { ...piece, look: picture(pushed(right)), lit: true } : piece));
  const done = changeLook(joined, `${prefix}${answerIndex}`, picture(right));
  return [
    moment([`We want to make ${an(makes)}. Which pieces can do it?`], `Which pieces make ${an(makes)}?`, start),
    ...tried,
    moment([`And these ones fit together to make ${an(makes)}.`], `These make ${an(makes)}.`, joined),
    moment([`So these are the pieces that can make ${an(makes)}.`], `These pieces make ${an(makes)}.`, done),
  ];
}

function piecesWhy(question: Question): Moment[] {
  const q = asChoice(question);
  return piecesMoments('w', str(q.facts, 'makes'), q.options, q.answerIndex);
}

function choosePiecesLesson(): Lesson {
  const worked = piecesMoments('a', 'square', [pieceSet('square', 2, 'rectangle'), pieceSet('trapezoid', 2, 'hexagon'), pieceSet('triangle', 2, 'square')], 2);
  const opening = set(at(worked, 0).scene, ['atarget'], { lit: undefined });
  const end = at(worked, worked.length - 1).scene;

  // Four squares make a bigger square: more pieces, the same kind of shape.
  const four = pieceSet('square', 4, 'square');
  const fourApart = scene([{ id: 'bfour', look: picture(four), x: 3.5, y: 0.9, w: 3, h: 3 }]);
  const fourJoined = set(changeLook(fourApart, 'bfour', picture(pushed(four))), ['bfour'], { lit: true });

  const first = turnQuestion('M-K-E5', 3, (f) => f.makes === 'rectangle' && strings(f.options).includes('4 square'));
  const second = turnQuestion('M-K-E5', 3, (f) => f.makes === 'hexagon' && strings(f.options).includes('6 triangle') && !strings(f.options).includes('2 trapezoid'));
  return {
    parts: [
      show(moment(['You know that small shapes join to make a bigger shape. Now you will choose the pieces.'], 'Choose the pieces.', opening)),
      ...worked.map(show),
      show(moment(['Push the pieces together in your mind. Then look at the outside edge.'], 'Push together. Look at the edge.', calm(end))),
      show(moment(['Here are', { number: 4 }, 'squares.'], '4 squares', fourApart)),
      show(moment(['Push them together. They make a bigger square, not a rectangle.'], '4 squares make a bigger square.', fourJoined)),
      turn(first, piecesWhy(first)),
      show(moment(['Look at every set of pieces before you choose.'], 'Look at every set.', calm(fourJoined))),
      turn(second, piecesWhy(second)),
      show(moment(['Picture the pieces pushed together. The outside edge tells you the shape.'], 'The outside edge tells you the shape.', set(calm(end), ['atarget', 'a2'], { lit: true, dim: undefined }))),
    ],
  };
}

// ---- M-K-E6 Shapes all around us, part 2: things shaped like solid shapes ----

type SolidForm = 'sphere' | 'cylinder' | 'cube';
const SOLID_FACT: Record<SolidForm, string> = {
  sphere: 'A sphere is round all over.',
  cylinder: 'A cylinder has two round ends, and a curved side.',
  cube: 'A cube has flat, square faces.',
};
const THING_FACT: Record<SolidForm, string> = { sphere: 'is round all over', cylinder: 'has two round ends, and a curved side', cube: 'has flat, square faces' };

function solidThing(name: string): Shaped & { shape: SolidForm } {
  const found = SOLID_THINGS.find((each) => each.name === name);
  if (!found || (found.shape !== 'sphere' && found.shape !== 'cylinder' && found.shape !== 'cube')) throw new Error(`No solid thing called ${name}`);
  return { ...found, shape: found.shape };
}

function solidThingWhy(question: Question): Moment[] {
  const q = asChoice(question);
  const names = strings(q.facts.options);
  const right = solidThing(at(names, q.answerIndex));
  const xs = [1.1, 4.3, 7.5];
  const start = scene([
    { id: 'wtarget', look: picture(solid(right.shape)), x: 4.2, y: 0, w: 1.6, h: 1.6, lit: true },
    ...names.map((name, i): Piece => ({ id: `w${i}`, look: art(solidThing(name).emoji), x: xs[i] ?? 0, y: 2.3, w: 1.4, h: 1.4 })),
  ]);
  const rightId = `w${q.answerIndex}`;
  const pointed = pointAt(set(start, [rightId], { lit: true }), pieceOf(start, rightId));
  return [
    moment([`We want ${an(right.shape)}. ${SOLID_FACT[right.shape]}`], SOLID_FACT[right.shape], start),
    moment([`Look at each thing. The ${right.name} ${THING_FACT[right.shape]}.`], `The ${right.name} ${THING_FACT[right.shape]}.`, pointed),
    moment([`So the ${right.name} is shaped like ${an(right.shape)}.`], `The ${right.name} is ${an(right.shape)}.`, only(withoutHand(pointed), [rightId, 'wtarget'])),
  ];
}

function solidThingsLesson(): Lesson {
  const things = ['basketball', 'candle', 'present'].map(solidThing);
  const xs = [1.1, 4.3, 7.5];
  const start = scene(
    things.flatMap((thing, i): Piece[] => [
      { id: `athing${i}`, look: art(thing.emoji), x: xs[i] ?? 0, y: 0.4, w: 1.4, h: 1.4 },
      { id: `asolid${i}`, look: picture(solid(thing.shape)), x: xs[i] ?? 0, y: 2.4, w: 1.4, h: 1.4, gone: true },
    ]),
  );
  const pair = (from: Scene, i: number): Scene => set(calm(from), [`athing${i}`, `asolid${i}`], { lit: true, gone: false });
  const ball = pair(start, 0);
  const candle = pair(ball, 1);
  const present = pair(candle, 2);
  const solids = light(present, ['asolid0', 'asolid1', 'asolid2']);
  const thingsLit = light(present, ['athing0', 'athing1', 'athing2']);

  const first = turnQuestion('M-K-E6', 3, (f) => f.target === 'cylinder' && strings(f.options).includes('can'));
  const second = turnQuestion('M-K-E6', 3, (f) => f.target === 'sphere' && strings(f.options).includes('ball'));
  return {
    parts: [
      show(moment(['You know things shaped like circles, triangles, and rectangles. Now let us find the solid shapes in things.'], 'Solid shapes in things', start)),
      show(moment(['A basketball is round all over. It is shaped like a sphere.'], 'A basketball is a sphere.', ball)),
      show(moment(['A candle has two round ends, and a curved side. It is shaped like a cylinder.'], 'A candle is a cylinder.', candle)),
      show(moment(['A present has flat, square faces. It is shaped like a cube.'], 'A present is a cube.', present)),
      show(moment(['Round all over means a sphere. Two round ends mean a cylinder. Flat, square faces mean a cube.'], 'sphere, cylinder, cube', solids)),
      turn(first, solidThingWhy(first)),
      show(moment(['The colour and the size of a thing do not matter. Only its shape does.'], 'Only the shape matters.', thingsLit)),
      turn(second, solidThingWhy(second)),
      show(moment(['Look at the whole thing. Is it a sphere, a cylinder, or a cube?'], 'Sphere, cylinder, or cube?', calm(present))),
    ],
  };
}

// ---- M-K-E7 Roll and stack, part 2: two things asked at once ----

const ROLLS: Record<string, boolean> = { sphere: true, cylinder: true, cone: true, cube: false };
const STACKS: Record<string, boolean> = { sphere: false, cylinder: true, cone: false, cube: true };

function asSolid(name: string): SolidName {
  if (name !== 'cube' && name !== 'sphere' && name !== 'cone' && name !== 'cylinder') throw new Error(`No solid called ${name}`);
  return name;
}

// A chart: the solids along the top, a row for "roll" and a row for "stack", each mark hidden until it is filled in.
function chartScene(prefix: string, solids: string[]): Scene {
  const xs = solids.length === 4 ? [2.5, 4.4, 6.3, 8.2] : [3, 5.3, 7.6];
  return scene([
    { id: `${prefix}roll`, look: text('roll'), x: 0.2, y: 2.2, w: 2, h: 0.8 },
    { id: `${prefix}stack`, look: text('stack'), x: 0.2, y: 3.4, w: 2, h: 0.8 },
    ...solids.flatMap((name, i): Piece[] => [
      { id: `${prefix}s${i}`, look: picture(solid(asSolid(name))), x: xs[i] ?? 0, y: 0.3, w: 1.4, h: 1.4 },
      { id: `${prefix}r${i}`, look: text(ROLLS[name] ? 'yes' : 'no'), x: xs[i] ?? 0, y: 2.2, w: 1.4, h: 0.8, gone: true },
      { id: `${prefix}k${i}`, look: text(STACKS[name] ? 'yes' : 'no'), x: xs[i] ?? 0, y: 3.4, w: 1.4, h: 0.8, gone: true },
    ]),
  ]);
}

const marks = (prefix: string, kind: 'r' | 'k', count: number): string[] => Array.from({ length: count }, (_, i) => `${prefix}${kind}${i}`);
const fillRow = (from: Scene, prefix: string, kind: 'r' | 'k', count: number): Scene => set(calm(from), [...marks(prefix, kind, count), `${prefix}${kind === 'r' ? 'roll' : 'stack'}`], { gone: false, lit: true });
const column = (from: Scene, prefix: string, i: number): Scene => only(from, [`${prefix}s${i}`, `${prefix}r${i}`, `${prefix}k${i}`, `${prefix}roll`, `${prefix}stack`]);

function listOf(names: string[]): string {
  const each = names.map((name) => `the ${name}`);
  if (each.length <= 2) return each.join(' and ');
  return `${each.slice(0, -1).join(', ')}, and ${at(each, each.length - 1)}`;
}

// "The sphere and the cone can roll. The cube cannot."
function canLine(solids: string[], can: Record<string, boolean>, verb: string): string {
  const yes = solids.filter((name) => can[name]);
  const no = solids.filter((name) => !can[name]);
  return [yes.length > 0 ? `${cap(listOf(yes))} can ${verb}.` : '', no.length > 0 ? `${cap(listOf(no))} cannot.` : ''].filter(Boolean).join(' ');
}

function chartWhy(question: Question): Moment[] {
  const q = asChoice(question);
  const solids = strings(q.facts.options);
  const want = str(q.facts, 'want');
  const right = at(solids, q.answerIndex);
  const start = chartScene('w', solids);
  const rolled = fillRow(start, 'w', 'r', solids.length);
  const stacked = fillRow(rolled, 'w', 'k', solids.length);
  const last = want === 'both' ? `Now read down. The ${right} can roll, and it can stack.` : want === 'stackOnly' ? `Now read down. The ${right} can stack, but it cannot roll.` : `Now read down. The ${right} can roll, but it cannot stack.`;
  const short = want === 'both' ? 'roll yes, stack yes' : want === 'stackOnly' ? 'stack yes, roll no' : 'roll yes, stack no';
  return [
    moment(['Ask two things about each shape. Can it roll? Can it stack?'], 'Can it roll? Can it stack?', start),
    moment([`A curved side rolls. ${canLine(solids, ROLLS, 'roll')}`], 'Can it roll?', rolled),
    moment([`To stack, a shape needs a flat top and a flat bottom. ${canLine(solids, STACKS, 'stack')}`], 'Can it stack?', stacked),
    moment([last], `The ${right}: ${short}`, column(stacked, 'w', q.answerIndex)),
  ];
}

function rollAndStackLesson(): Lesson {
  const solids = ['cube', 'sphere', 'cone', 'cylinder'];
  const start = chartScene('a', solids);
  const askRoll = set(start, ['aroll'], { lit: true });
  const rolled = fillRow(start, 'a', 'r', 4);
  const askStack = set(calm(rolled), ['astack'], { lit: true });
  const stacked = fillRow(rolled, 'a', 'k', 4);
  const cylinder = column(stacked, 'a', 3);
  const words = alter(stacked, (piece) => ({ ...piece, dim: undefined, lit: piece.id === 'aroll' || piece.id === 'astack' ? true : undefined }));

  const first = turnQuestion('M-K-E7', 3, (f) => f.want === 'stackOnly');
  const second = turnQuestion('M-K-E7', 3, (f) => f.want === 'rollOnly' && strings(f.options).includes('cone'));
  return {
    parts: [
      show(moment(['You know which shapes roll, and which shapes stack. Now we ask both things at once.'], 'Roll and stack, together', start)),
      show(moment(['Let us fill in a chart. First: can it roll?'], 'Can it roll?', askRoll)),
      show(moment([`A curved side rolls. ${canLine(solids, ROLLS, 'roll')}`], 'A curved side rolls.', rolled)),
      show(moment(['Next: can it stack? It needs a flat top, and a flat bottom.'], 'Can it stack?', askStack)),
      show(moment([canLine(solids, STACKS, 'stack')], 'A flat top and bottom stack.', stacked)),
      show(moment(['Now read down. The cylinder says yes, and yes. It can roll, and it can stack.'], 'The cylinder: roll yes, stack yes', cylinder)),
      turn(first, chartWhy(first)),
      show(moment(['Listen for the word but. Then one answer is yes, and the other is no.'], '"but": one yes, one no', words)),
      turn(second, chartWhy(second)),
      show(moment(['Ask two things: can it roll, and can it stack?'], 'Can it roll? Can it stack?', calm(words))),
    ],
  };
}

// ---- M-K-F1 Compare length and height, part 2: the longest and the shortest of three ----

type Bar = Extract<Visual, { kind: 'bar' }>;

function asBar(visual: Visual | undefined): Bar {
  if (!visual || visual.kind !== 'bar') throw new Error('Not a bar');
  return visual;
}

// Three lying bars, as given (ends not lined up) or with their left ends on one line. A bar's piece keeps the
// bar's own proportions, so a longer bar is drawn longer.
function barScene(prefix: string, bars: Bar[], lined: boolean): Scene {
  const ys = [0.9, 2.2, 3.5];
  const looseX = [3.2, 0.6, 2.0];
  return scene(bars.map((bar, i): Piece => ({ id: `${prefix}${i}`, look: picture(bar), x: lined ? 1 : (looseX[i] ?? 1), y: ys[i] ?? 1, w: (22 * bar.length + 4) / 32, h: 0.75 })));
}

// The hand at the far end of a bar.
function pointAtEnd(from: Scene, id: string): Scene {
  const piece = pieceOf(from, id);
  return pointAt(from, { ...piece, x: piece.x + (piece.w ?? 1) - 0.8, w: 0.8 });
}

function threeBarsWhy(question: Question): Moment[] {
  const q = asChoice(question);
  const bars = q.options.map(asBar);
  const word = str(q.facts, 'word');
  const most = q.facts.ask === 'most';
  const rightId = `w${q.answerIndex}`;
  const lined = barScene('w', bars, true);
  return [
    moment([`Which one is ${word}? Let us find out.`], `Which one is ${word}?`, barScene('w', bars, false)),
    moment(['First, line up one end of every bar.'], 'Line up one end.', lined),
    moment([most ? 'Now look at the other ends. Find the bar that goes the furthest of all.' : 'Now look at the other ends. Find the bar that stops first of all.'], most ? 'Which goes the furthest?' : 'Which stops first?', pointAtEnd(set(lined, [rightId], { lit: true }), rightId)),
    moment([`${most ? 'This bar goes further than both of the others.' : 'This bar stops before both of the others.'} So this one is ${word}.`], `This one is ${word}.`, only(lined, [rightId])),
  ];
}

function threeBarsLesson(): Lesson {
  const bars: Bar[] = [3, 6, 1].map((length): Bar => ({ kind: 'bar', length, color: 'green', orientation: 'horizontal' }));
  const loose = barScene('a', bars, false);
  const lined = barScene('a', bars, true);
  const longest = pointAtEnd(set(lined, ['a1'], { lit: true }), 'a1');
  const shortest = pointAtEnd(light(lined, ['a2']), 'a2');
  const between = withoutHand(light(shortest, ['a0']));
  const ends = light(between, ['a1', 'a2']);

  const first = turnQuestion('M-K-F1', 3, (f) => f.word === 'the longest' && f.values !== undefined && JSON.stringify(f.values) !== JSON.stringify([3, 6, 1]) && at(f.values as number[], 0) !== Math.max(...(f.values as number[])));
  const second = turnQuestion('M-K-F1', 3, (f) => f.word === 'the shortest');
  return {
    parts: [
      show(moment(['You know how to tell which of two bars is longer. Now there are three bars.'], 'Three bars', loose)),
      show(moment(['Line up one end of every bar, just as before.'], 'Line up one end.', lined)),
      show(moment(['Look at the other ends. This bar goes the furthest of all. It is the longest.'], 'This one is the longest.', longest)),
      show(moment(['This bar stops first of all. It is the shortest.'], 'This one is the shortest.', shortest)),
      show(moment(['This bar is in between. It is not the longest, and it is not the shortest.'], 'In between', between)),
      show(moment(['The longest is longer than both of the others. The shortest is shorter than both of the others.'], 'Longest and shortest', ends)),
      turn(first, threeBarsWhy(first)),
      show(moment(['Now listen for the word. Is it the longest, or the shortest?'], 'The longest, or the shortest?', calm(ends))),
      turn(second, threeBarsWhy(second)),
      show(moment(['Line up one end. Then look at all the other ends.'], 'Line up one end. Look at the others.', ends)),
    ],
  };
}

// ---- M-K-F2 Sort and count, part 2: which group has more ----

interface Group {
  emoji: string;
  n: number;
}

function manyOf(one: string): string {
  const found = COUNTABLES.find((each) => each.one === one);
  if (!found) throw new Error(`Nothing to count called ${one}`);
  return found.many;
}

// Two groups, one above the other, each with its number at the side (hidden until it is counted).
function groupsScene(prefix: string, a: Group, b: Group): Scene {
  const row = (side: 'a' | 'b', group: Group, y: number): Piece[] => [
    ...Array.from({ length: group.n }, (_, i): Piece => ({ id: `${prefix}${side}${i}`, look: art(group.emoji), x: 0.8 + i, y, w: 0.9, h: 0.9 })),
    { id: `${prefix}n${side}`, look: numeral(group.n), x: 8.2, y, w: 1, h: 1, gone: true },
  ];
  return scene([...row('a', a, 0.6), ...row('b', b, 2.7)]);
}

const groupIds = (prefix: string, side: 'a' | 'b', n: number): string[] => Array.from({ length: n }, (_, i) => `${prefix}${side}${i}`);
const counting = (n: number): SayPart[] => Array.from({ length: n }, (_, i): SayPart => ({ number: i + 1 }));

function moreWhy(question: Question): Moment[] {
  const q = asChoice(question);
  const values = q.facts.values;
  if (!Array.isArray(values) || !values.every((each): each is number => typeof each === 'number')) throw new Error('facts.values is not a list of numbers');
  const names = strings(q.facts.things);
  const groups: Group[] = q.options.map((option, i) => ({ emoji: option.kind === 'emojiGroup' ? option.emoji : '⚫', n: at(values, i) }));
  const [a, b] = [at(groups, 0), at(groups, 1)];
  const start = groupsScene('w', a, b);
  const countA = set(set(start, groupIds('w', 'a', a.n), { lit: true }), ['wna'], { gone: false, lit: true });
  const countB = set(set(calm(countA), groupIds('w', 'b', b.n), { lit: true }), ['wnb'], { gone: false, lit: true });
  const numbers = light(countB, ['wna', 'wnb']);
  const counted = (group: Group, name: string): Say => (group.n === 1 ? ['There is just', { number: 1 }, `${name}.`] : [`Count the ${manyOf(name)}.`, ...counting(group.n), '.']);
  const big = Math.max(a.n, b.n);
  const small = Math.min(a.n, b.n);
  // The groups as the question draws them, the one with more lit.
  const done = scene(
    q.options.flatMap((option, i): Piece[] => [
      { id: `wgroup${i}`, look: picture(option), x: 0.8, y: i === 0 ? 0.3 : 2.5, w: 5.5, h: 1.8, ...(i === q.answerIndex ? { lit: true } : { dim: true }) },
      { id: `wtotal${i}`, look: numeral(at(values, i)), x: 8.2, y: i === 0 ? 0.6 : 2.7, w: 1, h: 1, ...(i === q.answerIndex ? { lit: true } : {}) },
    ]),
  );
  return [
    moment(['Do not guess. Count each group.'], 'Count each group.', start),
    moment(counted(a, at(names, 0)), `${a.n}`, countA),
    moment(counted(b, at(names, 1)), `${b.n}`, countB),
    moment([{ number: big }, 'is more than', { number: small }, '.'], `${big} is more than ${small}.`, numbers),
    moment(['So the group of', { number: big }, 'has more.'], `The group of ${big} has more.`, done),
  ];
}

function whichHasMoreLesson(): Lesson {
  const start = groupsScene('a', { emoji: '🐟', n: 3 }, { emoji: '🚗', n: 4 });
  const fish = countAlong(start, groupIds('a', 'a', 3));
  const fishTotal = set(fish.end, ['ana'], { gone: false, lit: true });
  const cars = countAlong(fishTotal, groupIds('a', 'b', 4));
  const carsTotal = set(cars.end, ['anb'], { gone: false, lit: true });
  const more = light(carsTotal, [...groupIds('a', 'b', 4), 'anb']);
  const numbers = light(carsTotal, ['ana', 'anb']);

  const first = turnQuestion('M-K-F2', 3, (f) => Array.isArray(f.values) && Math.abs(Number(f.values[0]) - Number(f.values[1])) === 1 && Number(f.values[0]) + Number(f.values[1]) !== 7);
  const second = turnQuestion('M-K-F2', 3, (f) => Array.isArray(f.values) && Number(f.values[1]) - Number(f.values[0]) >= 3);
  return {
    parts: [
      show(moment(['You know how to sort things into groups. Now the groups are ready, and you say which group has more.'], 'Which group has more?', start)),
      show(moment(['Do not guess. Count the fish first.'], 'Count the fish.', set(start, groupIds('a', 'a', 3), { lit: true }))),
      ...fish.moments.map(show),
      show(moment(['There are', { number: 3 }, 'fish. Now count the cars.'], '3 fish', fishTotal)),
      ...cars.moments.map(show),
      show(moment(['There are', { number: 4 }, 'cars.'], '4 cars', carsTotal)),
      show(moment([{ number: 4 }, 'is more than', { number: 3 }, ', so the group of cars has more.'], '4 is more than 3.', more)),
      show(moment(['Count each group. The group with the bigger number has more.'], 'The bigger number has more.', numbers)),
      turn(first, moreWhy(first)),
      show(moment(['Two groups can look almost the same. Counting tells you for sure.'], 'Counting tells you for sure.', calm(numbers))),
      turn(second, moreWhy(second)),
      show(moment(['Count both groups. Then pick the one with the bigger number.'], 'Count both. Pick the bigger number.', numbers)),
    ],
  };
}

// ---- M-K-F3 What can be measured, part 2: choose the tool ----

interface Job {
  tool: string; // as the options name it
  id: 'ruler' | 'scale' | 'cup';
  thing: string;
  ask: string;
  act: string;
  to: { x: number; y: number };
}
const JOBS: Record<string, Job> = {
  'how long': { tool: 'a ruler', id: 'ruler', thing: '✏️', ask: 'We want to know how long the pencil is.', act: 'Lay the pencil along the ruler, and see where it ends.', to: { x: 1.1, y: 1.1 } },
  'how heavy': { tool: 'a scale', id: 'scale', thing: '🍎', ask: 'We want to know how heavy the apple is.', act: 'Put the apple on the scale, and see how heavy it is.', to: { x: 4.4, y: 0.8 } },
  'how much it holds': { tool: 'a measuring cup', id: 'cup', thing: '🍲', ask: 'We want to know how much the pot holds.', act: 'Pour the water from the pot into the measuring cup, and see how much there is.', to: { x: 6.2, y: 1.3 } },
};

function jobFor(want: string): Job {
  const job = JOBS[want];
  if (!job) throw new Error(`No tool to find ${want}`);
  return job;
}

// The three tools on the table, and the thing we want to measure above them (hidden until it is named).
function toolScene(prefix: string, job: Job): Scene {
  return scene([
    { id: `${prefix}ruler`, look: art('📏'), x: 0.6, y: 1.8, w: 2.2, h: 1.2 },
    { id: `${prefix}scale`, look: art('⚖️'), x: 4.2, y: 1.6, w: 1.4, h: 1.4 },
    { id: `${prefix}cup`, look: art('🥛'), x: 7.6, y: 1.8, w: 1.2, h: 1.2 },
    { id: `${prefix}thing`, look: art(job.thing), x: 4.4, y: 0.1, w: 1.2, h: 1.2, gone: true },
    { id: `${prefix}word`, look: text(job.tool), x: 2.5, y: 3.8, w: 5, h: 0.8, gone: true },
  ]);
}

const toolIds = (prefix: string): string[] => [`${prefix}ruler`, `${prefix}scale`, `${prefix}cup`];

// Say what we want to know, remember what each tool tells, use the one that fits.
function toolMoments(prefix: string, want: string): Moment[] {
  const job = jobFor(want);
  const start = toolScene(prefix, job);
  const asked = set(start, [`${prefix}thing`], { gone: false, lit: true });
  const tools = light(asked, toolIds(prefix));
  const used = only(set(tools, [`${prefix}thing`], { x: job.to.x, y: job.to.y }), [`${prefix}${job.id}`, `${prefix}thing`]);
  const named = set(used, [`${prefix}word`], { gone: false, lit: true, dim: undefined });
  return [
    moment([job.ask], `Find ${want}.`, asked),
    moment(['A ruler tells how long. A scale tells how heavy. A measuring cup tells how much it holds.'], 'long, heavy, holds', tools),
    moment([job.act], want, used),
    moment([`So to find ${want}, we use ${job.tool}.`], `${cap(want)}: use ${job.tool}.`, named),
  ];
}

function chooseToolLesson(): Lesson {
  const worked = toolMoments('a', 'how long');
  const opening = toolScene('a', jobFor('how long'));
  const end = at(worked, worked.length - 1).scene;
  const all = alter(end, (piece) => (piece.id === 'aword' || piece.id === 'athing' ? { ...piece, gone: true } : { ...piece, dim: undefined, lit: true }));

  const first = turnQuestion('M-K-F3', 3, (f) => f.want === 'how heavy');
  const second = turnQuestion('M-K-F3', 3, (f) => f.want === 'how much it holds');
  return {
    parts: [
      show(moment(['You know what a ruler, a scale, and a measuring cup tell us. Now you will choose the tool for the job.'], 'Choose the tool.', opening)),
      ...worked.map(show),
      show(moment(['First ask: what do I want to know? Then pick the tool that tells it.'], 'What do I want to know?', all)),
      turn(first, toolMoments('w', str(first.facts, 'want'))),
      show(moment(['Each of these jobs has its own tool. Think about what the tool tells.'], 'Each job has its own tool.', calm(all))),
      turn(second, toolMoments('w', str(second.facts, 'want'))),
      show(moment(['How long, a ruler. How heavy, a scale. How much it holds, a measuring cup.'], 'ruler, scale, measuring cup', all)),
    ],
  };
}

// ---- M-K-F4 Heavier and lighter, M-K-F5 Holds more and holds less, part 2: three things ----

type Measure = 'weight' | 'holds';
const MEASURE: Record<Measure, { things: readonly Tiered[]; think: string; order: string; least: string; most: string; lowIs: string; highIs: string }> = {
  weight: { things: WEIGHT_THINGS, think: 'Think about lifting each one', order: 'Put them in order, from the lightest to the heaviest.', least: 'is the lightest', most: 'is the heaviest', lowIs: 'is the easiest to lift', highIs: 'is the hardest to lift' },
  holds: { things: HOLD_THINGS, think: 'Think about the room inside each one', order: 'Put them in order, from the least room inside to the most room inside.', least: 'holds the least', most: 'holds the most', lowIs: 'has the least room inside', highIs: 'has the most room inside' },
};
const LABEL: Record<Measure, { least: string; most: string }> = { weight: { least: 'lightest', most: 'heaviest' }, holds: { least: 'holds the least', most: 'holds the most' } };

function tieredNamed(kind: Measure, name: string): Tiered {
  const found = MEASURE[kind].things.find((each) => each.name === name);
  if (!found) throw new Error(`No thing called ${name}`);
  return found;
}

// Three things in a row as given, then moved into order from the least to the most, with a word under each end.
function rankMoments(kind: Measure, prefix: string, names: string[], ask: 'most' | 'least'): { moments: Moment[]; sorted: Scene } {
  const words = MEASURE[kind];
  const things = names.map((name) => tieredNamed(kind, name));
  const xs = [1.2, 4.2, 7.2];
  const rank = (thing: Tiered): number => things.filter((each) => each.tier < thing.tier).length;
  const idOf = (thing: Tiered): string => `${prefix}${things.indexOf(thing)}`;
  const start = scene([
    ...things.map((thing, i): Piece => ({ id: `${prefix}${i}`, look: art(thing.emoji), x: xs[i] ?? 0, y: 1.3, w: 1.6, h: 1.6 })),
    { id: `${prefix}least`, look: text(LABEL[kind].least), x: 0.2, y: 3.6, w: 3.6, h: 0.8, gone: true },
    { id: `${prefix}most`, look: text(LABEL[kind].most), x: 6.2, y: 3.6, w: 3.6, h: 0.8, gone: true },
  ]);
  const sorted = alter(start, (piece) => {
    const thing = things.find((each) => idOf(each) === piece.id);
    return thing ? { ...piece, x: xs[rank(thing)] ?? piece.x } : piece;
  });
  const low = at(things.filter((thing) => rank(thing) === 0), 0);
  const high = at(things.filter((thing) => rank(thing) === things.length - 1), 0);
  const ends = set(sorted, [idOf(low), idOf(high), `${prefix}least`, `${prefix}most`], { lit: true, gone: false });
  const picked = ask === 'most' ? high : low;
  return {
    moments: [
      moment([`${words.think}: ${listOf(names)}.`], `${words.think}.`, start),
      moment([words.order], kind === 'weight' ? 'From lightest to heaviest' : 'From least room to most room', sorted),
      moment([`The ${low.name} ${words.lowIs}. The ${high.name} ${words.highIs}.`], `${low.name}, then ${high.name}`, ends),
      moment([`So the ${picked.name} ${ask === 'most' ? words.most : words.least}.`], `The ${picked.name} ${ask === 'most' ? words.most : words.least}.`, only(ends, [idOf(picked), `${prefix}${ask === 'most' ? 'most' : 'least'}`])),
    ],
    sorted: ends,
  };
}

function rankWhy(kind: Measure, question: Question): Moment[] {
  const ask = question.facts.ask === 'most' ? 'most' : 'least';
  return rankMoments(kind, 'w', strings(question.facts.options), ask).moments;
}

function heaviestLesson(): Lesson {
  const worked = rankMoments('weight', 'a', ['bike', 'truck', 'pencil'], 'most');
  const opening = at(worked.moments, 0).scene;
  const lightest = only(worked.sorted, ['a2', 'aleast']);
  const between = only(worked.sorted, ['a0']);
  const ends = calm(worked.sorted);
  const shown = ['bike', 'truck', 'pencil'];
  const fresh = (f: Record<string, unknown>, used: string[]): boolean => !strings(f.options).some((name) => used.includes(name));

  const first = turnQuestion('M-K-F4', 3, (f) => f.ask === 'most' && fresh(f, shown));
  const second = turnQuestion('M-K-F4', 3, (f) => f.ask === 'least' && fresh(f, [...shown, ...strings(first.facts.options)]));
  return {
    parts: [
      show(moment(['You know how to tell which of two things is heavier. Now there are three things.'], 'Three things', opening)),
      ...worked.moments.map(show),
      show(moment(['And the pencil is the lightest.'], 'The pencil is the lightest.', lightest)),
      show(moment(['The bike is in between. It is not the heaviest, and it is not the lightest.'], 'The bike is in between.', between)),
      turn(first, rankWhy('weight', first)),
      show(moment(['Now listen for the word. Is it the heaviest, or the lightest?'], 'The heaviest, or the lightest?', ends)),
      turn(second, rankWhy('weight', second)),
      show(moment(['Put the three in order in your mind. Then pick the end you need.'], 'Put them in order. Pick an end.', light(ends, ['aleast', 'amost']))),
    ],
  };
}

function holdsMostLesson(): Lesson {
  const worked = rankMoments('holds', 'a', ['cup', 'bathtub', 'spoon'], 'most');
  const opening = at(worked.moments, 0).scene;
  const least = only(worked.sorted, ['a2', 'aleast']);
  const between = only(worked.sorted, ['a0']);
  const ends = calm(worked.sorted);

  // Only five things hold water in the questions, so the turns ask about the pot and then the glass or cup.
  const first = turnQuestion('M-K-F5', 3, (f) => f.ask === 'most' && !strings(f.options).includes('bathtub'));
  const second = turnQuestion('M-K-F5', 3, (f) => f.ask === 'least' && !strings(f.options).includes('spoon') && !strings(f.options).some((name) => name !== 'pot' && strings(first.facts.options).includes(name)));
  return {
    parts: [
      show(moment(['You know how to tell which of two things holds more. Now there are three things.'], 'Three things', opening)),
      ...worked.moments.map(show),
      show(moment(['And the spoon holds the least.'], 'The spoon holds the least.', least)),
      show(moment(['The cup is in between. It does not hold the most, and it does not hold the least.'], 'The cup is in between.', between)),
      turn(first, rankWhy('holds', first)),
      show(moment(['Now listen for the words. Is it the most, or the least?'], 'The most, or the least?', ends)),
      turn(second, rankWhy('holds', second)),
      show(moment(['Think of the room inside each one. Then pick the end you need.'], 'Think of the room inside.', light(ends, ['aleast', 'amost']))),
    ],
  };
}

// ---- M-K-F6 How were they sorted?, part 2: the other things are mixed in both groups ----

type Rule = 'colour' | 'shape' | 'size';
type Item = [string, string, string]; // shape, colour, size
const RULES: Rule[] = ['colour', 'shape', 'size'];
const RULE_AT: Record<Rule, number> = { shape: 0, colour: 1, size: 2 };
const ITEM_SIZE: Record<string, number> = { s: 0.7, m: 1, l: 1.3 };
const PLURAL: Record<string, string> = { circle: 'circles', square: 'squares', triangle: 'triangles', star: 'stars', heart: 'hearts' };
const SIZE_WORD: Record<string, string> = { s: 'small', m: 'middle sized', l: 'big' };

function asGroups(value: unknown): Item[][] {
  if (!Array.isArray(value)) throw new Error('facts.groups is not a list');
  return value.map((group) => {
    if (!Array.isArray(group)) throw new Error('A group is not a list');
    return group.map((item): Item => {
      const [form, color, size] = strings(item);
      return [form ?? '', color ?? '', size ?? ''];
    });
  });
}

// The rule the groups were sorted by: the one thing the same inside each group and different between them.
function ruleOf(groups: Item[][]): Rule | null {
  const found = RULES.filter((rule) => {
    const firsts = groups.map((group) => at(group, 0)[RULE_AT[rule]]);
    return groups.every((group) => group.every((item) => item[RULE_AT[rule]] === at(group, 0)[RULE_AT[rule]])) && new Set(firsts).size === groups.length;
  });
  return found.length === 1 ? at(found, 0) : null;
}

// How a value is said: "red", "stars", "big".
function valueWord(rule: Rule, value: string): string {
  return rule === 'colour' ? value : rule === 'shape' ? (PLURAL[value] ?? `${value}s`) : (SIZE_WORD[value] ?? value);
}

// Two groups of four, each in a 2 by 2 grid, drawn as the questions draw them, with a word under each group
// (hidden until the group is named).
function groupedScene(groups: Item[][], prefix: string): Scene {
  const pieces: Piece[] = [];
  groups.forEach((group, g) => {
    group.forEach((item, i) => {
      const size = ITEM_SIZE[item[2]] ?? 1;
      const cx = (g === 0 ? 1.7 : 6.9) + (i % 2) * 1.5;
      const cy = 1.1 + Math.floor(i / 2) * 1.5;
      pieces.push({ id: `${prefix}${g}i${i}`, look: picture(flat(item[0] as ShapeName, item[1], item[2] === 's' ? 's' : item[2] === 'l' ? 'l' : 'm')), x: cx - size / 2, y: cy - size / 2, w: size, h: size });
    });
    pieces.push({ id: `${prefix}${g}word`, look: text(''), x: g === 0 ? 1.0 : 6.2, y: 4.2, w: 2.9, h: 0.8, gone: true });
  });
  return scene(pieces);
}

const itemIds = (prefix: string, g: number): string[] => [0, 1, 2, 3].map((i) => `${prefix}${g}i${i}`);

// Check colour, then shape, then size: the two that are mixed inside the first group are ruled out, each with
// two pieces that differ lit; the one that is the same all through each group is the answer.
function checkRulesMoments(groups: Item[][], prefix: string): Moment[] {
  const rule = ruleOf(groups);
  if (!rule) throw new Error('The groups fit no single rule');
  const start = groupedScene(groups, prefix);
  const firstGroup = at(groups, 0);
  const ruledOut: Moment[] = RULES.filter((each) => each !== rule).map((each) => {
    const index = RULE_AT[each];
    const one = at(firstGroup, 0)[index] ?? '';
    const otherAt = firstGroup.findIndex((item) => item[index] !== one);
    const other = at(firstGroup, Math.max(otherAt, 0))[index] ?? '';
    const mixed = each === 'shape' ? `${valueWord(each, one)} and ${valueWord(each, other)}` : `${valueWord(each, one)} ones and ${valueWord(each, other)} ones`;
    return moment([`Look at ${each}. This group has ${mixed}. So they were not sorted that way.`], `${mixed}: not ${each}`, light(start, [`${prefix}0i0`, `${prefix}0i${Math.max(otherAt, 0)}`]));
  });
  const index = RULE_AT[rule];
  const left = valueWord(rule, at(firstGroup, 0)[index] ?? '');
  const right = valueWord(rule, at(at(groups, 1), 0)[index] ?? '');
  const named = alter(light(start, [...itemIds(prefix, 0), ...itemIds(prefix, 1)]), (piece) =>
    piece.id === `${prefix}0word` ? { ...piece, look: text(`all ${left}`), gone: false } : piece.id === `${prefix}1word` ? { ...piece, look: text(`all ${right}`), gone: false } : piece,
  );
  return [
    moment(['Check one thing at a time: colour, then shape, then size.'], 'colour, shape, size', start),
    ...ruledOut,
    moment([`Now look at ${rule}. This group is all ${left}. That group is all ${right}.`], `all ${left}, all ${right}`, named),
    moment([`So they were sorted by ${rule}.`], `sorted by ${rule}`, set(named, [`${prefix}0word`, `${prefix}1word`], { lit: true })),
  ];
}

function mixedSortLesson(): Lesson {
  const byShape: Item[][] = [
    [['star', 'red', 'l'], ['star', 'blue', 's'], ['star', 'blue', 'l'], ['star', 'red', 's']],
    [['circle', 'blue', 's'], ['circle', 'red', 'l'], ['circle', 'red', 's'], ['circle', 'blue', 'l']],
  ];
  const worked = checkRulesMoments(byShape, 'a');
  const opening = at(worked, 0).scene;
  const end = at(worked, worked.length - 1).scene;
  const ruleIs = (rule: Rule) => (f: Record<string, unknown>): boolean => ruleOf(asGroups(f.groups)) === rule;

  const first = turnQuestion('M-K-F6', 3, ruleIs('size'));
  const second = turnQuestion('M-K-F6', 3, ruleIs('colour'));
  return {
    parts: [
      show(moment(['You know to look for what is the same inside each group. Now the groups are more mixed up.'], 'More mixed up', opening)),
      ...worked.map(show),
      show(moment(['Only one thing is the same all through each group. That is how they were sorted.'], 'One thing is the same all through.', calm(end))),
      turn(first, checkRulesMoments(asGroups(first.facts.groups), 'w')),
      show(moment(['Do not stop at the first thing you see. Check all three.'], 'Check all three.', light(end, ['a0word', 'a1word']))),
      turn(second, checkRulesMoments(asGroups(second.facts.groups), 'w')),
      show(moment(['Colour, shape, size. Find the one that is the same all through each group.'], 'colour, shape, size', calm(end))),
    ],
  };
}

// ---- M-K-G1 Patterns, part 2: the hole is in the middle ----

const PLACE = ['first', 'second', 'third'];

// A row of eight with an empty box at the hole. Say the part, say it along the row to the hole, see which place
// in the part the hole is, and put in the one that belongs there.
function holeMoments(prefix: string, looks: (PieceLook | null)[], names: string[], answer: { look: PieceLook; name: string }): Moment[] {
  const holeAt = looks.findIndex((look) => look === null);
  if (holeAt < 3) throw new Error('The hole comes after the first part');
  const x0 = (10 - looks.length) / 2;
  const idAt = (i: number): string => (i === holeAt ? `${prefix}box` : `${prefix}${i}`);
  const start = scene(looks.map((look, i): Piece => ({ id: idAt(i), look: look ?? { kind: 'box' }, x: x0 + i, y: 2, w: 0.9, h: 0.9 })));
  const run = (from: number, to: number): string[] => Array.from({ length: Math.min(to, looks.length) - from }, (_, i) => idAt(from + i));
  const said = (from: number, to: number): string => names.slice(from, to).map((name, i) => (from + i === holeAt ? 'the hole' : name)).join(', ');
  const place = PLACE[holeAt % 3] ?? 'first';
  const along: Moment[] =
    holeAt < 6
      ? [moment([`Say it again along the row: ${said(3, 6)}.`], said(3, 6), light(start, run(3, 6)))]
      : [moment([`It comes again: ${said(3, 6)}.`], `Again: ${said(3, 6)}`, light(start, run(3, 6))), moment([`Then it starts once more: ${said(6, 8)}.`], `Once more: ${said(6, 8)}`, light(start, run(6, 8)))];
  const box = pieceOf(start, `${prefix}box`);
  const done = add(set(calm(start), [`${prefix}box`], { gone: true }), [{ id: `${prefix}answer`, look: answer.look, x: box.x, y: box.y, w: 0.9, h: 0.9, lit: true }]);
  return [
    moment([`The part that repeats is: ${said(0, 3)}.`], said(0, 3), light(start, run(0, 3))),
    ...along,
    moment([`The hole is the ${place} one of its part. The ${place} one is always ${answer.name}.`], `The ${place} one is ${answer.name}.`, light(start, [`${prefix}box`, idAt(holeAt % 3)])),
    moment([`So the missing one is ${answer.name}.`], `The missing one is ${answer.name}.`, done),
  ];
}

function holeWhy(question: Question): Moment[] {
  const q = asChoice(question);
  const stimulus = q.stimulus;
  if (!stimulus || stimulus.kind !== 'sequence') throw new Error(`${q.skillId} has no pattern row`);
  const unit = strings(q.facts.unit);
  const looks = stimulus.items.map((item) => (item === 'blank' ? null : picture(item)));
  const names = looks.map((_, i) => at(unit, i % unit.length));
  const holeAt = looks.findIndex((look) => look === null);
  const name = at(names, holeAt);
  const answer = { look: picture(at(q.options, q.answerIndex)), name: q.facts.by === 'shape' ? an(name) : name };
  const moments = holeMoments('w', looks, names, answer);
  return [moment(['The hole is in the middle. Find the part that repeats, at the start of the row.'], 'Find the part that repeats.', calm(at(moments, 0).scene)), ...moments];
}

function middleHoleLesson(): Lesson {
  const part = ['triangle', 'star', 'circle'];
  const names = Array.from({ length: 8 }, (_, i) => at(part, i % 3));
  const tile = (name: string): PieceLook => picture(flat(name as ShapeName, 'green', 's'));
  const worked = holeMoments('a', names.map((name, i) => (i === 4 ? null : tile(name))), names, { look: tile('star'), name: 'a star' });
  const opening = calm(at(worked, 0).scene);
  const end = at(worked, worked.length - 1).scene;
  const all = alter(end, (piece) => (piece.gone ? piece : { ...piece, lit: true }));

  const first = turnQuestion('M-K-G1', 3, (f) => f.by === 'shape' && f.shown === 5 && !strings(f.unit).includes('star'));
  const second = turnQuestion('M-K-G1', 3, (f) => f.by === 'colour' && f.shown !== 4 && f.shown !== 5);
  return {
    parts: [
      show(moment(['You know how to find what comes next in a pattern. Now the hole is in the middle of the row.'], 'A hole in the middle', opening)),
      ...worked.map(show),
      show(moment(['Check it. Triangle, star, circle now fits all along the row.'], 'It fits all along the row.', all)),
      show(moment(['Find the part at the start. Then see which place in its part the hole is.'], 'Which place is the hole?', light(end, ['a0', 'a1', 'a2']))),
      turn(first, holeWhy(first)),
      show(moment(['The hole can be the first, the second, or the third one of its part.'], 'first, second, or third', light(end, ['a3', 'aanswer', 'a5']))),
      turn(second, holeWhy(second)),
      show(moment(['Say the part again and again. The hole takes the one that belongs in its place.'], 'Say the part again and again.', all)),
    ],
  };
}

// ---- M-K-G2 Same pattern, new pictures, part 2: longer parts ----

// A letter for each picture, by the order the pictures first appear: circle circle star star is A A B B.
function lettersOf(keys: string[]): string[] {
  const seen: string[] = [];
  return keys.map((key) => {
    if (!seen.includes(key)) seen.push(key);
    return 'ABC'.charAt(seen.indexOf(key));
  });
}

const sayLetters = (letters: string[]): SayPart[] => letters.map((letter) => ({ letter: letter.toLowerCase() }));

interface PatternRow {
  looks: PieceLook[];
  part: string[]; // the letters of the part that repeats
}

// A sequence picture as a row: each of its pictures becomes its own piece. Every row shows its part twice.
function rowOf(visual: Visual | undefined): PatternRow {
  if (!visual || visual.kind !== 'sequence') throw new Error('Not a row of pictures');
  const items = visual.items.filter((item): item is Visual => item !== 'blank');
  const looks = items.map((item) => (item.kind === 'emojiGroup' && item.count === 1 ? art(item.emoji) : picture(item)));
  const letters = lettersOf(items.map((item) => (item.kind === 'emojiGroup' ? item.emoji : item.kind === 'shape' ? item.shape : JSON.stringify(item))));
  return { looks, part: letters.slice(0, letters.length / 2) };
}

const ROW_Y = [0.2, 1.7, 3.0, 4.3];

// The shapes on top and the rows of pictures under them, each with its letters (hidden at first) at the side.
function rowsScene(prefix: string, rows: PatternRow[]): Scene {
  return scene(
    rows.flatMap((row, r): Piece[] => [
      ...row.looks.map((look, i): Piece => ({ id: `${prefix}${r}p${i}`, look, x: 0.3 + i * 0.8, y: ROW_Y[r] ?? 0, w: 0.8, h: 0.8 })),
      { id: `${prefix}${r}letters`, look: text(row.part.join(' ')), x: 7.2, y: (ROW_Y[r] ?? 0) + 0.05, w: 2.6, h: 0.7, gone: true },
    ]),
  );
}

// Letters for the shapes on top, then for each row: the rows that do not match first, then the one that does.
function sameRowMoments(prefix: string, target: PatternRow, options: PatternRow[], answerIndex: number, shapesSay: Say): Moment[] {
  const rows = [target, ...options];
  const start = rowsScene(prefix, rows);
  const ids = (r: number): string[] => at(rows, r).looks.map((_, i) => `${prefix}${r}p${i}`);
  const withLetters = (from: Scene, r: number): Scene => set(set(calm(from), ids(r), { lit: true }), [`${prefix}${r}letters`], { gone: false, lit: true });
  const named = withLetters(start, 0);
  let now = named;
  const checked: Moment[] = options
    .map((_, i) => i)
    .filter((i) => i !== answerIndex)
    .map((i) => {
      now = withLetters(now, i + 1);
      const part = at(options, i).part;
      return moment(['This row goes', ...sayLetters(part), '. That is not the same.'], `${part.join(' ')} is not the same.`, now);
    });
  const right = answerIndex + 1;
  const found = alter(withLetters(now, right), (piece) => (piece.id.startsWith(`${prefix}${right}`) || piece.id.startsWith(`${prefix}0`) ? { ...piece, dim: undefined } : { ...piece, dim: true }));
  return [
    moment(shapesSay, 'Look at the shapes on top.', set(start, ids(0), { lit: true })),
    moment(['Give each shape a letter. The first shape is', { letter: 'a' }, '. They go', ...sayLetters(target.part), ', over and over.'], `The shapes go ${target.part.join(' ')}.`, named),
    ...checked,
    moment(['This row goes', ...sayLetters(target.part), 'too. It is the same pattern.'], `${target.part.join(' ')} too. The same pattern.`, found),
  ];
}

function sameRowWhy(question: Question): Moment[] {
  const q = asChoice(question);
  return sameRowMoments('w', rowOf(q.stimulus), q.options.map(rowOf), q.answerIndex, ['The shapes on top go:', { word: str(q.facts, 'target') }, '.']);
}

function longerPatternLesson(): Lesson {
  const shapes = (names: ShapeName[]): Visual => ({ kind: 'sequence', items: names.map((name) => flat(name, 'blue', 's')) });
  const things = (emoji: string[]): Visual => ({ kind: 'sequence', items: emoji.map((each): Visual => ({ kind: 'emojiGroup', emoji: each, count: 1, layout: 'row' })) });
  const target = rowOf(shapes(['square', 'square', 'triangle', 'triangle', 'square', 'square', 'triangle', 'triangle']));
  const options = [rowOf(things(['🐸', '🐸', '🐝', '🐸', '🐸', '🐝'])), rowOf(things(['🐸', '🐸', '🐝', '🐝', '🐸', '🐸', '🐝', '🐝']))];
  const worked = sameRowMoments('a', target, options, 1, ['The shapes on top go: square, square, triangle, triangle. Then the same again.']);
  const opening = calm(at(worked, 0).scene);
  const end = at(worked, worked.length - 1).scene;
  const letters = alter(end, (piece) => ({ ...piece, dim: undefined, lit: piece.id === 'a1letters' || piece.id === 'a2letters' ? true : undefined }));

  // Three different pictures need a third letter.
  const three = rowOf(shapes(['circle', 'star', 'triangle', 'circle', 'star', 'triangle']));
  const threeRow = rowsScene('b', [three]);
  const threeNamed = set(set(threeRow, three.looks.map((_, i) => `b0p${i}`), { lit: true }), ['b0letters'], { gone: false, lit: true });

  const words = (f: Record<string, unknown>): string[] => (typeof f.target === 'string' ? f.target.split(' ') : []);
  const first = turnQuestion('M-K-G2', 3, (f) => words(f).length === 8 && !words(f).includes('square'));
  const second = turnQuestion('M-K-G2', 3, (f) => new Set(words(f)).size === 3);
  return {
    parts: [
      show(moment(['You know how to give letters to a pattern. Now the part that repeats is longer.'], 'A longer part', opening)),
      ...worked.map(show),
      show(moment(['Both frog rows start the same way. So look at the whole part, not just the start.'], 'Look at the whole part.', letters)),
      turn(first, sameRowWhy(first)),
      show(moment(['Some patterns have three different pictures. Then we need a third letter:', { letter: 'a' }, { letter: 'b' }, { letter: 'c' }, '.'], 'Three pictures: A B C', threeNamed)),
      turn(second, sameRowWhy(second)),
      show(moment(['Give every picture a letter. The same letters, in the same order, mean the same pattern.'], 'Same letters, same order, same pattern.', calm(threeNamed))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-K-E1': turnedShapesLesson,
  'M-K-E2': flatOrSolidLesson,
  'M-K-E4': pickPictureLesson,
  'M-K-E5': choosePiecesLesson,
  'M-K-E6': solidThingsLesson,
  'M-K-E7': rollAndStackLesson,
  'M-K-F1': threeBarsLesson,
  'M-K-F2': whichHasMoreLesson,
  'M-K-F3': chooseToolLesson,
  'M-K-F4': heaviestLesson,
  'M-K-F5': holdsMostLesson,
  'M-K-F6': mixedSortLesson,
  'M-K-G1': middleHoleLesson,
  'M-K-G2': longerPatternLesson,
};
