import type { Question, Say, SayPart, ShapeName, SolidName, Visual } from '../../engine/types';
import { add, alter, art, calm, moment, numeral, picture, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, PieceLook, Scene } from '../types';

// Lessons that teach (plan section 16) whose scenes use the questions' own pictures (the `picture` piece):
// Kindergarten Math flat shapes, solid shapes, longer and shorter, and patterns.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

const flat = (shape: ShapeName, color: string, size: 's' | 'm' | 'l' = 'm'): Visual => ({ kind: 'shape', shape, color, size, rotation: 0 });
const solid = (name: SolidName): Visual => ({ kind: 'solid', solid: name });
const an = (word: string): string => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);

// One thing to know about each shape, as it is said and as it is written.
const FACT: Record<string, { say: Say; text: string }> = {
  circle: { say: ['A circle is round, with no corners.'], text: 'A circle is round, with no corners.' },
  square: { say: ['A square has', { number: 4 }, 'sides, all the same length.'], text: 'A square has 4 sides, all the same length.' },
  triangle: { say: ['A triangle has', { number: 3 }, 'sides.'], text: 'A triangle has 3 sides.' },
  rectangle: { say: ['A rectangle has', { number: 2 }, 'long sides, and', { number: 2 }, 'short sides.'], text: 'A rectangle has 2 long sides and 2 short sides.' },
  hexagon: { say: ['A hexagon has', { number: 6 }, 'sides.'], text: 'A hexagon has 6 sides.' },
  oval: { say: ['An oval is like a stretched circle.'], text: 'An oval is like a stretched circle.' },
  diamond: { say: ['A diamond is a square, standing on a corner.'], text: 'A diamond is a square standing on a corner.' },
  cube: { say: ['A cube has', { number: 6 }, 'flat faces. Each one is a square.'], text: 'A cube has 6 flat faces. Each one is a square.' },
  sphere: { say: ['A sphere is round all over, like a ball.'], text: 'A sphere is round all over, like a ball.' },
  cone: { say: ['A cone has a point, and a round base.'], text: 'A cone has a point and a round base.' },
  cylinder: { say: ['A cylinder has', { number: 2 }, 'round ends.'], text: 'A cylinder has 2 round ends.' },
};

function factOf(name: string): { say: Say; text: string } {
  const fact = FACT[name];
  if (!fact) throw new Error(`No fact for ${name}`);
  return fact;
}

function pieceOf(from: Scene, id: string): Piece {
  const piece = from.pieces.find((each) => each.id === id);
  if (!piece) throw new Error(`No piece ${id}`);
  return piece;
}

// Lights one piece, brings it forward, and lets the others rest.
const pickOut = (from: Scene, id: string): Scene => alter(from, (piece) => (piece.id === id ? { ...piece, lit: true, dim: undefined } : { ...piece, lit: undefined }));

// Lights these pieces and fades every other one back.
const only = (from: Scene, keep: readonly string[]): Scene => {
  const pick = new Set(keep);
  return alter(from, (piece) => (pick.has(piece.id) ? { ...piece, lit: true, dim: undefined } : { ...piece, lit: undefined, dim: true }));
};

// ---- Find the named one (M-K-E1 and M-K-E2) ----

// The question's own options, side by side.
function optionScene(question: Question, prefix: string): Scene {
  if (question.type !== 'choice') throw new Error(`${question.skillId} is not a choice`);
  const xs = question.options.length === 2 ? [2.5, 5.5] : [1, 4, 7];
  return scene(question.options.map((option, i) => ({ id: `${prefix}${i}`, look: picture(option), x: xs[i] ?? 4, y: 1.5, w: 2, h: 2 })));
}

// Hear the name, remember what that shape is like, find the one that fits.
function findWhy(question: Question): Moment[] {
  if (question.type !== 'choice') throw new Error(`${question.skillId} is not a choice`);
  const target = str(question.facts, 'target');
  const fact = factOf(target);
  const start = optionScene(question, 'w');
  const rightId = `w${question.answerIndex}`;
  const pointed = pointAt(start, pieceOf(start, rightId));
  return [
    moment([`We are looking for the ${target}.`], `Find the ${target}.`, start),
    moment(fact.say, fact.text, pointed),
    moment([`So this one is the ${target}.`], `This is the ${target}.`, only(withoutHand(pointed), [rightId])),
  ];
}

// ---- M-K-E1 Name flat shapes ----

function flatScene(prefix: string, names: ShapeName[], color: string): Scene {
  return scene(names.map((name, i) => ({ id: `${prefix}${name}`, look: picture(flat(name, color)), x: 1 + i * 3, y: 1.5, w: 2, h: 2, dim: true })));
}

const meet = (from: Scene, prefix: string, name: string): Moment => moment([`This is ${an(name)}.`, ...factOf(name).say], factOf(name).text, pickOut(from, `${prefix}${name}`));

function flatShapesLesson(): Lesson {
  const start = flatScene('a', ['circle', 'square', 'triangle'], 'blue');
  const circle = meet(start, 'a', 'circle');
  const square = meet(circle.scene, 'a', 'square');
  const triangle = pickOut(square.scene, 'atriangle');
  // The triangle sits at x 7 to 9: a number beside each of its three sides.
  const spots: [number, number][] = [[6.3, 2.0], [8.9, 2.0], [7.6, 3.6]];
  const labelled = add(triangle, spots.map(([x, y], i) => ({ id: `aside${i}`, look: numeral(i + 1), x, y, w: 0.8, h: 0.8, gone: true })));
  let now = labelled;
  const counted: Moment[] = spots.map((_, i) => {
    now = alter(now, (piece) => (piece.id === `aside${i}` ? { ...piece, gone: false, lit: true } : piece.id.startsWith('aside') ? { ...piece, lit: undefined } : piece));
    return moment([{ number: i + 1 }], String(i + 1), now);
  });
  const allSides = set(now, ['aside0', 'aside1', 'aside2'], { lit: true });

  const more = flatScene('b', ['hexagon', 'oval', 'diamond'], 'green');
  const hexagon = meet(more, 'b', 'hexagon');
  const oval = meet(hexagon.scene, 'b', 'oval');
  const diamond = meet(oval.scene, 'b', 'diamond');

  const first = turnQuestion('M-K-E1', 1, (f) => f.target === 'triangle');
  const second = turnQuestion('M-K-E1', 2, (f) => f.target === 'hexagon' || f.target === 'oval');
  return {
    parts: [
      show(moment(['Flat shapes have names. Let us learn them.'], 'Flat shapes have names.', start)),
      show(circle),
      show(square),
      show(moment(['This is a triangle. Let us count its sides.'], 'A triangle. Count its sides.', labelled)),
      ...counted.map(show),
      show(moment(factOf('triangle').say, factOf('triangle').text, allSides)),
      turn(first, findWhy(first)),
      show(moment(['Here are some more shapes.'], 'More shapes.', more)),
      show(hexagon),
      show(oval),
      show(diamond),
      turn(second, findWhy(second)),
      show(moment(['Hear the name. Then look for the shape that fits.'], 'Hear the name. Find the shape that fits.', set(diamond.scene, ['bhexagon', 'boval', 'bdiamond'], { lit: true, dim: undefined }))),
    ],
  };
}

// ---- M-K-E2 Name solid shapes ----

const SOLID_NAMES: SolidName[] = ['cube', 'sphere', 'cone', 'cylinder'];
// Something a child knows with the same shape.
const LIKE: Record<SolidName, string> = { cube: '🎲', sphere: '⚽', cone: '🍦', cylinder: '🥫' };

function solidShapesLesson(): Lesson {
  const start = scene(
    SOLID_NAMES.flatMap((name, i): Piece[] => [
      { id: `s${name}`, look: picture(solid(name)), x: 0.6 + i * 2.4, y: 0.5, w: 1.6, h: 1.6, dim: true },
      { id: `t${name}`, look: art(LIKE[name]), x: 0.8 + i * 2.4, y: 2.7, w: 1.2, h: 1.2, gone: true },
    ]),
  );
  const meetSolid = (from: Scene, name: SolidName): Scene => pickOut(from, `s${name}`);
  const withThing = (from: Scene, name: SolidName): Scene => set(calm(from), [`t${name}`], { gone: false, lit: true });

  const cube = meetSolid(start, 'cube');
  const dice = withThing(cube, 'cube');
  const sphere = meetSolid(dice, 'sphere');
  const ball = withThing(sphere, 'sphere');
  const cone = meetSolid(ball, 'cone');
  const iceCream = withThing(cone, 'cone');
  const cylinder = meetSolid(iceCream, 'cylinder');
  const can = withThing(cylinder, 'cylinder');
  const all = set(calm(can), SOLID_NAMES.map((name) => `s${name}`), { lit: true });

  const first = turnQuestion('M-K-E2', 1, (f) => f.target === 'sphere');
  const second = turnQuestion('M-K-E2', 2, (f) => f.target === 'cone' || f.target === 'cylinder');
  return {
    parts: [
      show(moment(['Some shapes are solid. Let us learn their names.'], 'Solid shapes have names.', start)),
      show(moment(['This is a cube.', ...factOf('cube').say], factOf('cube').text, cube)),
      show(moment(['A dice is a cube.'], 'A dice is a cube.', dice)),
      show(moment(['This is a sphere.', ...factOf('sphere').say], factOf('sphere').text, sphere)),
      show(moment(['A football is a sphere.'], 'A football is a sphere.', ball)),
      turn(first, findWhy(first)),
      show(moment(['This is a cone.', ...factOf('cone').say], factOf('cone').text, cone)),
      show(moment(['An ice cream cone has the same shape.'], 'An ice cream cone is a cone.', iceCream)),
      show(moment(['This is a cylinder.', ...factOf('cylinder').say], factOf('cylinder').text, cylinder)),
      show(moment(['A can of soup is a cylinder.'], 'A can is a cylinder.', can)),
      turn(second, findWhy(second)),
      show(moment(['Solid shapes are not flat. You can hold them in your hand.'], 'Cube, sphere, cone, cylinder.', all)),
    ],
  };
}

// ---- M-K-F1 Compare length and height ----

type Bar = Extract<Visual, { kind: 'bar' }>;

function asBar(visual: Visual | undefined): Bar {
  if (!visual || visual.kind !== 'bar') throw new Error('Not a bar');
  return visual;
}

// A bar's piece keeps the bar's own proportions, so a longer bar is drawn longer on the stage.
function barSize(bar: Bar): { w: number; h: number } {
  return bar.orientation === 'horizontal' ? { w: (22 * bar.length + 4) / 32, h: 0.75 } : { w: 0.5, h: (22 * bar.length + 4) / 48 };
}

// The bars as given (ends not lined up), or with one end of each on the same line.
function barScene(prefix: string, bars: Bar[], lined: boolean): Scene {
  const flatWay = bars[0]?.orientation === 'horizontal';
  const rowsY = bars.length === 2 ? [1.5, 3.0] : [0.9, 2.2, 3.5];
  const looseX = [3.2, 0.6, 2.0];
  const colsX = bars.length === 2 ? [3.5, 6.0] : [2.5, 4.75, 7.0];
  const looseFloor = [4.4, 5.4, 4.9];
  return scene(
    bars.map((bar, i): Piece => {
      const { w, h } = barSize(bar);
      if (flatWay) return { id: `${prefix}${i}`, look: picture(bar), x: lined ? 1 : (looseX[i] ?? 1), y: rowsY[i] ?? 1, w, h };
      const floor = lined ? 4.4 : (looseFloor[i] ?? 4.4);
      return { id: `${prefix}${i}`, look: picture(bar), x: colsX[i] ?? 4, y: floor - h, w, h };
    }),
  );
}

// The hand at the end that tells: the far end of a lying bar, the top of a standing one.
function pointAtEnd(from: Scene, id: string): Scene {
  const piece = pieceOf(from, id);
  const w = piece.w ?? 1;
  const h = piece.h ?? 1;
  const spot: Piece = w > h ? { ...piece, x: piece.x + w - 0.8, w: 0.8 } : { ...piece, x: piece.x + w, y: Math.max(0, piece.y - 0.4), w: 0.8, h: 0.5 };
  return pointAt(from, spot);
}

function lengthWhy(question: Question): Moment[] {
  if (question.type !== 'choice') throw new Error(`${question.skillId} is not a choice`);
  const bars = question.options.map(asBar);
  const word = str(question.facts, 'word');
  const most = question.facts.ask === 'most';
  const flatWay = bars[0]?.orientation === 'horizontal';
  const rightId = `w${question.answerIndex}`;
  const loose = barScene('w', bars, false);
  const lined = barScene('w', bars, true);
  const reason = flatWay ? (most ? 'This bar goes further.' : 'This bar stops first.') : most ? 'This bar reaches higher.' : 'This bar stops lower down.';
  return [
    moment([`Which one is ${word}? Let us find out.`], `Which one is ${word}?`, loose),
    moment([flatWay ? 'First, line up one end of each bar.' : 'First, stand the bars on the same line.'], flatWay ? 'Line up one end.' : 'Stand them on the same line.', lined),
    moment([flatWay ? 'Now look at the other end.' : 'Now look at the tops.'], flatWay ? 'Look at the other end.' : 'Look at the tops.', pointAtEnd(lined, rightId)),
    moment([`${reason} So this one is ${word}.`], `This one is ${word}.`, only(lined, [rightId])),
  ];
}

function compareLengthLesson(): Lesson {
  const lying: Bar[] = [
    { kind: 'bar', length: 6, color: 'blue', orientation: 'horizontal' },
    { kind: 'bar', length: 3, color: 'blue', orientation: 'horizontal' },
  ];
  const standing: Bar[] = [
    { kind: 'bar', length: 2, color: 'green', orientation: 'vertical' },
    { kind: 'bar', length: 5, color: 'green', orientation: 'vertical' },
  ];
  const loose = barScene('a', lying, false);
  const lined = barScene('a', lying, true);
  const looseUp = barScene('b', standing, false);
  const linedUp = barScene('b', standing, true);

  const first = turnQuestion('M-K-F1', 1);
  const second = turnQuestion('M-K-F1', 2, (f) => f.word === 'taller');
  return {
    parts: [
      show(moment(['Let us learn to tell which one is longer.'], 'Which one is longer?', loose)),
      show(moment(['First, line up one end of each bar.'], 'Line up one end.', lined)),
      show(moment(['Now look at the other end.'], 'Look at the other end.', pointAtEnd(lined, 'a0'))),
      show(moment(['This bar goes further. It is longer.'], 'This one is longer.', set(lined, ['a0'], { lit: true }))),
      show(moment(['This bar stops first. It is shorter.'], 'This one is shorter.', set(lined, ['a1'], { lit: true }))),
      turn(first, lengthWhy(first)),
      show(moment(['Some things stand up. Which one is taller?'], 'Which one is taller?', looseUp)),
      show(moment(['Stand them on the same line.'], 'Stand them on the same line.', linedUp)),
      show(moment(['Now look at the tops. This one reaches higher. It is taller.'], 'This one is taller.', set(linedUp, ['b1'], { lit: true }))),
      show(moment(['This one stops lower down. It is shorter.'], 'This one is shorter.', set(linedUp, ['b0'], { lit: true }))),
      turn(second, lengthWhy(second)),
      show(moment(['Line up one end. Then look at the other end.'], 'Line up one end. Look at the other.', only(linedUp, ['b0', 'b1']))),
    ],
  };
}

// ---- M-K-G1 Patterns: what comes next ----

// A row of pictures with an empty box at the end.
function patternScene(prefix: string, looks: PieceLook[]): Scene {
  const total = looks.length + 1;
  const x0 = (10 - total) / 2;
  return scene([...looks.map((look, i): Piece => ({ id: `${prefix}${i}`, look, x: x0 + i, y: 2, w: 0.9, h: 0.9 })), { id: `${prefix}box`, look: { kind: 'box' }, x: x0 + looks.length, y: 2, w: 0.9, h: 0.9 }]);
}

// Say the part, say it again, start it once more, and so find the next one. `names` has one name for each picture
// shown; `part` is how many pictures repeat.
function patternMoments(prefix: string, looks: PieceLook[], names: string[], part: number, answer: { look: PieceLook; name: string }): Moment[] {
  const start = patternScene(prefix, looks);
  const run = (from: number, to: number): string[] => Array.from({ length: Math.max(0, to - from) }, (_, i) => `${prefix}${from + i}`);
  const said = (from: number, to: number): string => names.slice(from, to).join(', ');
  const rest = looks.length - 2 * part;
  const box = pieceOf(start, `${prefix}box`);
  const done = add(
    alter(calm(start), (piece) => (piece.id === `${prefix}box` ? { ...piece, gone: true } : piece)),
    [{ id: `${prefix}answer`, look: answer.look, x: box.x, y: box.y, w: 0.9, h: 0.9, lit: true }],
  );
  return [
    moment([`The pattern starts: ${said(0, part)}.`], `${said(0, part)}`, set(start, run(0, part), { lit: true })),
    moment([`Then it comes again: ${said(part, 2 * part)}.`], `Again: ${said(part, 2 * part)}`, set(start, run(part, 2 * part), { lit: true })),
    rest > 0
      ? moment([`Now it starts once more: ${said(2 * part, looks.length)}.`], `Once more: ${said(2 * part, looks.length)} ...`, set(start, run(2 * part, looks.length), { lit: true }))
      : moment(['Now the part starts once more.'], 'It starts once more.', set(start, [`${prefix}box`], { lit: true })),
    moment([`So the next one is ${answer.name}.`], `Next comes ${answer.name}.`, done),
  ];
}

function patternWhy(question: Question): Moment[] {
  const stimulus = question.stimulus;
  if (question.type !== 'choice' || !stimulus || stimulus.kind !== 'sequence') throw new Error(`${question.skillId} has no pattern row`);
  const unit = question.facts.unit;
  if (!Array.isArray(unit) || !unit.every((name): name is string => typeof name === 'string')) throw new Error('facts.unit is not a list of names');
  const shown = stimulus.items.filter((item): item is Visual => item !== 'blank');
  if (stimulus.items.at(-1) !== 'blank' || shown.length !== stimulus.items.length - 1) throw new Error('The lesson teaches what comes next');
  const looks = shown.map((item) => picture(item));
  const names = shown.map((_, i) => unit[i % unit.length] ?? '');
  const right = question.options[question.answerIndex];
  if (!right) throw new Error('No right option');
  const answer = { look: picture(right), name: unit[shown.length % unit.length] ?? '' };
  return [moment(['Find the part that repeats.'], 'Find the part that repeats.', patternScene('w', looks)), ...patternMoments('w', looks, names, unit.length, answer)];
}

function patternsLesson(): Lesson {
  const dot = (color: string): PieceLook => picture(flat('circle', color, 's'));
  const twoColours = ['red', 'blue', 'blue', 'red', 'blue', 'blue', 'red'];
  const threeColours = ['red', 'blue', 'yellow', 'red', 'blue', 'yellow', 'red', 'blue'];
  const one = patternMoments('a', twoColours.map(dot), twoColours, 3, { look: dot('blue'), name: 'blue' });
  const two = patternMoments('b', threeColours.map(dot), threeColours, 3, { look: dot('yellow'), name: 'yellow' });
  const lastOne = one.at(-1);
  const lastTwo = two.at(-1);
  if (!lastOne || !lastTwo) throw new Error('A pattern has moments');

  const first = turnQuestion('M-K-G1', 1);
  const second = turnQuestion('M-K-G1', 2);
  return {
    parts: [
      show(moment(['A pattern has a part that repeats. Let us find what comes next.'], 'What comes next?', patternScene('a', twoColours.map(dot)))),
      ...one.map(show),
      show(moment(['The part that repeats tells us what comes next.'], 'The part that repeats tells us.', alter(lastOne.scene, (piece) => (piece.gone ? piece : { ...piece, lit: true })))),
      turn(first, patternWhy(first)),
      show(moment(['This pattern has three colours in its part.'], 'Three colours in the part.', patternScene('b', threeColours.map(dot)))),
      ...two.map(show),
      turn(second, patternWhy(second)),
      show(moment(['Find the part that repeats. Say it again, to see what comes next.'], 'Find the part that repeats.', alter(lastTwo.scene, (piece) => (piece.gone ? piece : { ...piece, lit: true })))),
    ],
  };
}

// ---- M-K-G2 Same pattern, new pictures ----

// A letter for each picture, by the order the pictures first appear: circle square circle square is A B A B.
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

// A sequence picture as a row: each of its pictures becomes its own piece, so the row fits any screen.
function rowOf(visual: Visual | undefined): PatternRow {
  if (!visual || visual.kind !== 'sequence') throw new Error('Not a row of pictures');
  const items = visual.items.filter((item): item is Visual => item !== 'blank');
  const looks = items.map((item) => (item.kind === 'emojiGroup' && item.count === 1 ? art(item.emoji) : picture(item)));
  const letters = lettersOf(items.map((item) => (item.kind === 'emojiGroup' ? item.emoji : item.kind === 'shape' ? item.shape : JSON.stringify(item))));
  return { looks, part: letters.slice(0, letters.length / 2) };
}

const ROW_Y = [0.2, 1.7, 3.0, 4.3];
const rowIds = (prefix: string, row: PatternRow): string[] => row.looks.map((_, i) => `${prefix}${i}`);

// The shapes on top and the rows of pictures under them, each with its letters (hidden at first) at the side.
function rowsScene(rows: PatternRow[]): Scene {
  return scene(
    rows.flatMap((row, r): Piece[] => [
      ...row.looks.map((look, i): Piece => ({ id: `r${r}p${i}`, look, x: 0.3 + i * 0.8, y: ROW_Y[r] ?? 0, w: 0.8, h: 0.8 })),
      { id: `r${r}letters`, look: text(row.part.join(' ')), x: 7.2, y: (ROW_Y[r] ?? 0) + 0.05, w: 2.6, h: 0.7, gone: true },
    ]),
  );
}

function samePatternWhy(question: Question): Moment[] {
  if (question.type !== 'choice') throw new Error(`${question.skillId} is not a choice`);
  const target = rowOf(question.stimulus);
  const options = question.options.map(rowOf);
  const rows = [target, ...options];
  const start = rowsScene(rows);
  const ids = (r: number): string[] => rowIds(`r${r}p`, rows[r] as PatternRow);
  const withLetters = (from: Scene, r: number): Scene => set(set(calm(from), ids(r), { lit: true }), [`r${r}letters`], { gone: false, lit: true });
  const named = withLetters(start, 0);
  let now = named;
  // The rows that do not match first, then the one that does.
  const wrong = options.map((_, i) => i).filter((i) => i !== question.answerIndex);
  const checked: Moment[] = wrong.map((i) => {
    now = withLetters(now, i + 1);
    const part = options[i]?.part ?? [];
    return moment(['This row goes', ...sayLetters(part), '. That is not the same.'], `${part.join(' ')} is not the same.`, now);
  });
  const right = question.answerIndex + 1;
  const found = alter(withLetters(now, right), (piece) => (piece.id.startsWith(`r${right}`) || piece.id.startsWith('r0') ? { ...piece, dim: undefined } : { ...piece, dim: true }));
  return [
    moment(['The shapes on top go:', { word: str(question.facts, 'target') }, '.'], 'Look at the shapes on top.', set(start, ids(0), { lit: true })),
    moment(['Give each shape a letter. The first shape is', { letter: 'a' }, '. They go', ...sayLetters(target.part), ', over and over.'], `The shapes go ${target.part.join(' ')}.`, named),
    ...checked,
    moment(['This row goes', ...sayLetters(target.part), 'too. It is the same pattern.'], `${target.part.join(' ')} too. The same pattern.`, found),
  ];
}

// Two rows, one of shapes and one of pictures, with a letter under each one.
function pairScene(prefix: string, shapes: ShapeName[], things: string[]): Scene {
  const x0 = (10 - shapes.length) / 2;
  const shapeLetters = lettersOf(shapes);
  const thingLetters = lettersOf(things);
  return scene([
    ...shapes.map((name, i): Piece => ({ id: `${prefix}s${i}`, look: picture(flat(name, 'blue', 's')), x: x0 + i, y: 0.3, w: 0.9, h: 0.9 })),
    ...shapeLetters.map((letter, i): Piece => ({ id: `${prefix}sl${i}`, look: text(letter), x: x0 + i, y: 1.3, w: 0.9, h: 0.7, gone: true })),
    ...things.map((emoji, i): Piece => ({ id: `${prefix}t${i}`, look: art(emoji), x: x0 + i, y: 3.0, w: 0.9, h: 0.9, gone: true })),
    ...thingLetters.map((letter, i): Piece => ({ id: `${prefix}tl${i}`, look: text(letter), x: x0 + i, y: 4.0, w: 0.9, h: 0.7, gone: true })),
  ]);
}

function samePatternLesson(): Lesson {
  const n = (prefix: string, count: number): string[] => Array.from({ length: count }, (_, i) => `${prefix}${i}`);
  const start = pairScene('a', ['circle', 'square', 'circle', 'square'], ['🍎', '🍌', '🍎', '🍌']);
  const shapesLit = set(start, n('as', 4), { lit: true });
  const shapeLetters = set(calm(shapesLit), n('asl', 4), { gone: false, lit: true });
  const things = set(calm(shapeLetters), n('at', 4), { gone: false, lit: true });
  const thingLetters = set(calm(things), n('atl', 4), { gone: false, lit: true });
  const both = set(thingLetters, n('asl', 4), { lit: true });

  const next = pairScene('b', ['star', 'star', 'triangle', 'star', 'star', 'triangle'], ['🐶', '🐶', '🐱', '🐶', '🐶', '🐱']);
  const nextShapes = set(next, n('bsl', 6), { gone: false, lit: true });
  const nextThings = set(set(calm(nextShapes), n('bt', 6), { gone: false }), n('btl', 6), { gone: false, lit: true });

  const first = turnQuestion('M-K-G2', 1, (f) => typeof f.target === 'string' && f.target.split(' ').length === 4);
  const second = turnQuestion('M-K-G2', 2);
  return {
    parts: [
      show(moment(['The same pattern can be made with new pictures. Let us see how.'], 'The same pattern, new pictures.', start)),
      show(moment(['Look at the shapes: circle, square, circle, square.'], 'circle, square, circle, square', shapesLit)),
      show(moment(['Let us give each shape a letter. Circle is', { letter: 'a' }, '. Square is', { letter: 'b' }, '.'], 'Circle is A. Square is B.', shapeLetters)),
      show(moment(['Now look at these pictures: apple, banana, apple, banana.'], 'apple, banana, apple, banana', things)),
      show(moment(['Apple comes first, so apple is', { letter: 'a' }, '. Banana is', { letter: 'b' }, '.'], 'Apple is A. Banana is B.', thingLetters)),
      show(moment(['Both rows go', ...sayLetters(['a', 'b', 'a', 'b']), '. It is the same pattern.'], 'A B A B. The same pattern.', both)),
      turn(first, samePatternWhy(first)),
      show(moment(['Here is another one. Star, star, triangle, goes', ...sayLetters(['a', 'a', 'b']), '.'], 'star, star, triangle is A A B', nextShapes)),
      show(moment(['Dog, dog, cat, goes', ...sayLetters(['a', 'a', 'b']), 'too. So it is the same pattern.'], 'dog, dog, cat is A A B too', nextThings)),
      turn(second, samePatternWhy(second)),
      show(moment(['Give the pictures letters. The same letters mean the same pattern.'], 'Same letters, same pattern.', set(nextThings, n('bsl', 6), { lit: true }))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-K-E1': flatShapesLesson,
  'M-K-E2': solidShapesLesson,
  'M-K-F1': compareLengthLesson,
  'M-K-G1': patternsLesson,
  'M-K-G2': samePatternLesson,
};
