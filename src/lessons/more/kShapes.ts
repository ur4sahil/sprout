import { figureFor } from '../../engine/figures';
import type { Question, Visual } from '../../engine/types';
import { alter, art, calm, countAlong, moment, num, numeral, picture, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import { FLAT_THINGS, HOLD_THINGS, WEIGHT_THINGS } from '../../content/data/h1-things';
import type { Tiered } from '../../content/data/h1-things';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Kindergarten Math lessons for shapes, measuring and sorting (plan section 16).

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

// The right option's words, from the question's facts.
function answerOf(question: Question): string {
  const options = question.facts.options;
  if (question.type !== 'choice' || !Array.isArray(options)) throw new Error(`${question.skillId} has no text options`);
  const right: unknown = options[question.answerIndex];
  if (typeof right !== 'string') throw new Error(`${question.skillId}: the right option is not a word`);
  return right;
}

// Shows each label in turn, lit, with the hand on it, saying one number for each.
function countLabels(start: Scene, labelIds: readonly string[]): { moments: Moment[]; end: Scene } {
  let now = start;
  const moments: Moment[] = [];
  labelIds.forEach((id, i) => {
    now = set(now, [id], { gone: false, lit: true });
    const piece = now.pieces.find((each) => each.id === id);
    if (piece) now = pointAt(now, piece);
    moments.push(moment([{ number: i + 1 }], String(i + 1), now));
  });
  return { moments, end: withoutHand(now) };
}

// ---- M-K-E3 Sides and corners ----

type Flat = 'square' | 'triangle' | 'rectangle';
const SIDE_COUNT: Record<Flat, number> = { square: 4, triangle: 3, rectangle: 4 };
const SQUARES: Record<string, string> = { red: '🟥', blue: '🟦', green: '🟩', yellow: '🟨', orange: '🟧', purple: '🟪', brown: '🟫', black: '⬛' };
// A rectangle is drawn as the questions draw it: wide, in the middle of its frame.
const flatLook = (name: Flat, color: string): Piece['look'] =>
  name === 'rectangle' ? picture({ kind: 'shape', shape: 'rectangle', color, size: 'l', rotation: 0 }) : art(name === 'triangle' ? '🔺' : (SQUARES[color] ?? '🟦'));

// Where the side and corner numbers sit around a shape drawn 3 squares wide at (3.5, 0.6), going round from the top.
const SIDE_SPOTS: Record<Flat, [number, number][]> = {
  square: [[4.6, 0.1], [6.2, 1.7], [4.6, 3.3], [3.0, 1.7]],
  triangle: [[3.5, 1.4], [5.7, 1.4], [4.6, 3.3]],
  rectangle: [[4.6, 0.6], [6.4, 1.7], [4.6, 2.85], [2.8, 1.7]],
};
const CORNER_SPOTS: Record<Flat, [number, number][]> = {
  square: [[3.0, 0.1], [6.2, 0.1], [6.2, 3.3], [3.0, 3.3]],
  triangle: [[4.6, 0.1], [6.0, 2.9], [3.2, 2.9]],
  rectangle: [[2.9, 0.7], [6.3, 0.7], [6.3, 2.7], [2.9, 2.7]],
};

function flatScene(name: Flat, color: string, prefix: string): Scene {
  const label = (kind: 's' | 'c', [x, y]: [number, number], i: number): Piece => ({ id: `${prefix}${kind}${i}`, look: numeral(i + 1), x, y, w: 0.8, h: 0.8, gone: true });
  return scene([
    { id: `${prefix}shape`, look: flatLook(name, color), x: 3.5, y: 0.6, w: 3, h: 3 },
    ...SIDE_SPOTS[name].map((spot, i) => label('s', spot, i)),
    ...CORNER_SPOTS[name].map((spot, i) => label('c', spot, i)),
  ]);
}

const sideIds = (name: Flat, prefix: string): string[] => SIDE_SPOTS[name].map((_, i) => `${prefix}s${i}`);
const cornerIds = (name: Flat, prefix: string): string[] => CORNER_SPOTS[name].map((_, i) => `${prefix}c${i}`);

function sideMoments(name: Flat, color: string, prefix: string): { moments: Moment[]; end: Scene } {
  const start = flatScene(name, color, prefix);
  const n = SIDE_COUNT[name];
  const counted = countLabels(start, sideIds(name, prefix));
  const all = set(counted.end, sideIds(name, prefix), { lit: true });
  return {
    moments: [
      moment([`Let us count the sides of this ${name}. Start at one side, and go around.`], `Count the sides of the ${name}.`, set(start, [`${prefix}shape`], { lit: true })),
      ...counted.moments,
      moment([`We are back at the start. The ${name} has`, { number: n }, 'sides.'], `A ${name} has ${n} sides.`, all),
    ],
    end: all,
  };
}

function cornerMoments(name: Flat, color: string, prefix: string): Moment[] {
  const start = flatScene(name, color, prefix);
  const counted = countLabels(start, cornerIds(name, prefix));
  return [
    moment([`Let us count the corners of this ${name}. A corner is where two sides meet.`], `Count the corners of the ${name}.`, set(start, [`${prefix}shape`], { lit: true })),
    ...counted.moments,
    moment([`We are back at the start. The ${name} has`, { number: CORNER_SPOTS[name].length }, 'corners.'], `A ${name} has ${CORNER_SPOTS[name].length} corners.`, set(counted.end, cornerIds(name, prefix), { lit: true })),
  ];
}

function sidesWhy(question: Question): Moment[] {
  const name = str(question.facts, 'shape');
  if (name !== 'square' && name !== 'triangle' && name !== 'rectangle') throw new Error(`No drawing for a ${name}`);
  const color = str(question.facts, 'color');
  return question.facts.ask === 'corners' ? cornerMoments(name, color, 'w') : sideMoments(name, color, 'w').moments;
}

export function sidesLesson(): Lesson {
  const start = flatScene('square', 'blue', 'x');
  const sides = sideIds('square', 'x');
  const counted = countLabels(set(start, ['xshape'], { lit: true }), sides);
  const fourSides = set(counted.end, sides, { lit: true });
  const noSides = set(calm(fourSides), sides, { gone: true });
  const corners = countLabels(noSides, cornerIds('square', 'x'));
  const fourCorners = set(corners.end, cornerIds('square', 'x'), { lit: true });
  const topSide = start.pieces.find((piece) => piece.id === 'xs0');
  const firstCorner = start.pieces.find((piece) => piece.id === 'xc0');
  const first = turnQuestion('M-K-E3', 1, (f) => f.ask === 'sides' && f.shape === 'triangle');
  // The second turn counts corners, on a shape the lesson has not counted yet.
  const second = turnQuestion('M-K-E3', 3, (f) => f.ask === 'corners' && f.shape === 'rectangle');
  return {
    parts: [
      show(moment(['Shapes have sides. Let us learn to count them.'], 'Let us count the sides.', start)),
      show(moment(['A side is one straight edge of the shape.'], 'A side is a straight edge.', topSide ? pointAt(start, topSide) : start)),
      show(moment(['Start at the top, and go all the way around.'], 'Start at the top. Go around.', set(start, ['xshape'], { lit: true }))),
      ...counted.moments.map(show),
      show(moment(['We are back at the start. A square has', { number: 4 }, 'sides.'], 'A square has 4 sides.', fourSides)),
      show(moment(['A corner is where two sides meet.'], 'A corner is where two sides meet.', firstCorner ? pointAt(noSides, firstCorner) : noSides)),
      ...corners.moments.map(show),
      show(moment(['A square has', { number: 4 }, 'corners, too.'], 'A square has 4 corners.', fourCorners)),
      turn(first, sidesWhy(first)),
      show(moment(['Count each side just once, and stop when you are back at the start.'], 'Count each side once.', calm(fourSides))),
      show(moment(['Corners work the same way. Go around, and count each corner just once.'], 'Count each corner once.', calm(fourCorners))),
      turn(second, sidesWhy(second)),
      show(moment(['Go around the shape, and count each side, or each corner, once.'], 'Go around. Count each one once.', calm(fourCorners))),
    ],
  };
}

// ---- M-K-E4 Position words ----

const THING_ART: Record<string, string> = { '🐱': 'cat', '🐶': 'dog', '⚽': 'ball', '🐦': 'bird' };
type Where = 'above' | 'below' | 'beside';
const SPOT: Record<Where | 'away', { x: number; y: number }> = { away: { x: 1.2, y: 2.1 }, above: { x: 4.5, y: 0.7 }, below: { x: 4.5, y: 3.5 }, beside: { x: 5.9, y: 2.1 } };
const WORDS: Record<Where, string> = { above: 'above the box', below: 'below the box', beside: 'next to the box' };
const MEANS: Record<Where, string> = { above: 'higher up than the box', below: 'lower down than the box', beside: 'right at the side of the box' };
const ARROW: Record<Where, { look: string; x: number; y: number }> = { above: { look: '↑', x: 3.3, y: 0.7 }, below: { look: '↓', x: 3.3, y: 3.5 }, beside: { look: '→', x: 5.9, y: 1.0 } };

function positionScene(emoji: string, where: Where | 'away', prefix: string): Scene {
  return scene([
    { id: `${prefix}box`, look: art('📦'), x: 4.4, y: 2.0, w: 1.2, h: 1.2 },
    { id: `${prefix}thing`, look: art(emoji), x: SPOT[where].x, y: SPOT[where].y },
    { id: `${prefix}arrow`, look: text('↑'), x: 3.3, y: 0.7, gone: true },
  ]);
}

const moveTo = (from: Scene, prefix: string, where: Where): Scene =>
  alter(from, (piece) => {
    if (piece.id === `${prefix}thing`) return { ...piece, x: SPOT[where].x, y: SPOT[where].y, lit: true };
    if (piece.id === `${prefix}arrow`) return { ...piece, look: text(ARROW[where].look), x: ARROW[where].x, y: ARROW[where].y, gone: true };
    return { ...piece, lit: undefined };
  });

function positionWhy(question: Question): Moment[] {
  const stimulus = question.stimulus;
  const emoji = stimulus && stimulus.kind === 'emojiGroup' ? stimulus.emoji : '⚽';
  const name = THING_ART[emoji] ?? 'ball';
  const answer = answerOf(question);
  const where: Where = answer.startsWith('above') ? 'above' : answer.startsWith('below') ? 'below' : 'beside';
  const placed = calm(positionScene(emoji, where, 'w'));
  return [
    moment(['Find the box first.'], 'Find the box.', set(placed, ['wbox'], { lit: true })),
    moment([`Now find the ${name}.`], `Find the ${name}.`, set(placed, ['wthing'], { lit: true })),
    moment([`The ${name} is ${MEANS[where]}.`], MEANS[where], set(placed, ['wthing', 'warrow'], { lit: true, gone: false })),
    moment([`So the ${name} is ${WORDS[where]}.`], `The ${name} is ${WORDS[where]}.`, set(placed, ['wthing', 'wbox'], { lit: true })),
  ];
}

export function positionLesson(): Lesson {
  const start = positionScene('🐱', 'away', 'x');
  const above = moveTo(start, 'x', 'above');
  const below = moveTo(above, 'x', 'below');
  const beside = moveTo(below, 'x', 'beside');
  const first = turnQuestion('M-K-E4', 1, (f) => f.ask === 'where');
  // The second turn asks about "next to": the thing sits one place to the right of the box.
  const isBeside = (f: Record<string, unknown>): boolean => {
    const slot = Array.isArray(f.slots) ? (f.slots[0] as unknown) : null;
    return Array.isArray(slot) && slot[0] === Number(slot[1]) + 1;
  };
  const later = turnQuestion('M-K-E4', 2, (f) => f.ask === 'where' && isBeside(f));
  return {
    parts: [
      show(moment(['Position words tell us where a thing is.'], 'Where is it?', start)),
      show(moment(['Here is a box. We always look at the box first.'], 'Look at the box first.', set(start, ['xbox'], { lit: true }))),
      show(moment(['The cat jumps up. Now the cat is above the box.'], 'above the box', above)),
      show(moment(['Above means higher up than the box.'], 'Above: higher up', set(above, ['xarrow'], { gone: false, lit: true }))),
      show(moment(['Now the cat is below the box.'], 'below the box', below)),
      show(moment(['Below means lower down than the box.'], 'Below: lower down', set(below, ['xarrow'], { gone: false, lit: true }))),
      show(moment(['Now the cat is next to the box.'], 'next to the box', beside)),
      show(moment(['Next to means right at the side of the box.'], 'Next to: at the side', set(beside, ['xarrow', 'xbox'], { gone: false, lit: true }))),
      turn(first, positionWhy(first)),
      show(moment(['Look at the box first. Is the thing higher, lower, or at the side?'], 'Higher, lower, or at the side?', calm(beside))),
      turn(later, positionWhy(later)),
      show(moment(['Above is higher up, below is lower down, and next to is at the side.'], 'above, below, next to', set(calm(beside), ['xthing', 'xbox'], { lit: true }))),
    ],
  };
}

// ---- M-K-E7 Roll and stack ----

type Solid = 'sphere' | 'cube' | 'cylinder';
const SOLID_ART: Record<Solid, string> = { sphere: '⚽', cube: '🧊', cylinder: '🥫' };
const LIKE: Record<Solid, string> = { sphere: 'a sphere, like a ball', cube: 'a cube, like a block of ice', cylinder: 'a cylinder, like a can' };
const ROLLS: Record<Solid, boolean> = { sphere: true, cube: false, cylinder: true };
const STACKS: Record<Solid, boolean> = { sphere: false, cube: true, cylinder: true };

function solidScene(solid: Solid, prefix: string): Scene {
  return scene([
    { id: `${prefix}a`, look: art(SOLID_ART[solid]), x: 3, y: 1.9, w: 1.1, h: 1.1 },
    { id: `${prefix}b`, look: art(SOLID_ART[solid]), x: 3, y: 0, w: 1.1, h: 1.1, gone: true },
  ]);
}

function rollWhy(question: Question): Moment[] {
  const solid = str(question.facts, 'solid') as Solid;
  const start = solidScene(solid, 'w');
  const ask = str(question.facts, 'ask');
  const lit = set(start, ['wa'], { lit: true });
  if (ask === 'roll') {
    const rolls = ROLLS[solid];
    return [
      moment([`This is ${LIKE[solid]}.`], `This is a ${solid}.`, lit),
      moment([rolls ? 'It has a curved side. Give it a push, and it rolls away.' : 'It has only flat faces. Give it a push, and it just slides.'], rolls ? 'A curved side rolls.' : 'Flat faces slide.', set(lit, ['wa'], { x: rolls ? 7.5 : 3.6 })),
      moment([rolls ? 'It can roll, so the answer is Yes.' : 'It cannot roll, so the answer is No.'], rolls ? 'Yes, it can roll.' : 'No, it cannot roll.', set(lit, ['wa'], { x: rolls ? 7.5 : 3.6, lit: false })),
    ];
  }
  const stacks = STACKS[solid];
  const onTop = set(lit, ['wb'], { gone: false, y: 0.8 });
  const fallen = set(onTop, ['wb'], { x: 4.6, y: 1.9 });
  return [
    moment([`This is ${LIKE[solid]}.`], `This is a ${solid}.`, lit),
    moment(['Put another one on top.'], 'Put one on top.', onTop),
    moment([stacks ? 'It stays there, because its top and bottom are flat. So the answer is Yes.' : 'It rolls right off. It cannot stack, so the answer is No.'], stacks ? 'Yes, it can stack.' : 'No, it cannot stack.', stacks ? set(onTop, ['wa', 'wb'], { lit: true }) : fallen),
  ];
}

export function rollStackLesson(): Lesson {
  const start = scene([
    { id: 'cube', look: art('🧊'), x: 1.2, y: 1.9, w: 1.1, h: 1.1 },
    { id: 'cube2', look: art('🧊'), x: 1.8, y: 0, w: 1.1, h: 1.1, gone: true },
    { id: 'ball', look: art('⚽'), x: 4.2, y: 1.9, w: 1.1, h: 1.1 },
    { id: 'ball2', look: art('⚽'), x: 8.4, y: 0, w: 1.1, h: 1.1, gone: true },
    { id: 'can', look: art('🥫'), x: 5.8, y: 1.9, w: 1.1, h: 1.1, gone: true },
    { id: 'can2', look: art('🥫'), x: 5.8, y: 0, w: 1.1, h: 1.1, gone: true },
    { id: 'cone', look: picture({ kind: 'solid', solid: 'cone' }), x: 3.2, y: 1.9, w: 1.1, h: 1.1, gone: true },
    { id: 'cone2', look: picture({ kind: 'solid', solid: 'cone' }), x: 3.2, y: 0.8, w: 1.1, h: 1.1, gone: true },
  ]);
  const ballLit = set(start, ['ball'], { lit: true });
  const rolled = set(ballLit, ['ball'], { x: 8.4 });
  const cubeLit = set(calm(rolled), ['cube'], { lit: true });
  const slid = set(cubeLit, ['cube'], { x: 1.8 });
  const stacked = set(slid, ['cube2'], { gone: false, y: 0.8, lit: true });
  const ballOnBall = set(calm(stacked), ['ball2'], { gone: false, y: 0.8, lit: true });
  const ballFell = set(ballOnBall, ['ball2'], { x: 7.1, y: 1.9 });
  const can = set(calm(ballFell), ['can'], { gone: false, lit: true });
  const cans = set(can, ['can2'], { gone: false, y: 0.8, lit: true });
  const cone = set(calm(cans), ['cone'], { gone: false, lit: true });
  const coneRolled = set(cone, ['cone'], { x: 4.2 });
  const coneOnCone = set(calm(coneRolled), ['cone2'], { gone: false, x: 4.2, lit: true });
  const coneFell = set(coneOnCone, ['cone2'], { x: 3.0, y: 1.9 });
  const solids = (f: Record<string, unknown>): boolean => f.solid === 'sphere' || f.solid === 'cube' || f.solid === 'cylinder';
  const first = turnQuestion('M-K-E7', 1, (f) => solids(f) && f.solid !== 'sphere');
  const second = turnQuestion('M-K-E7', 2, (f) => solids(f) && f.solid !== first.facts.solid);
  return {
    parts: [
      show(moment(['Some solid shapes can roll. Some can stack.'], 'Roll or stack?', start)),
      show(moment(['This ball is a sphere. It is curved all over.'], 'A sphere is curved all over.', ballLit)),
      show(moment(['Give it a push, and it rolls away.'], 'A sphere rolls.', rolled)),
      show(moment(['This cube has flat faces.'], 'A cube has flat faces.', cubeLit)),
      show(moment(['Push it, and it just slides. A cube cannot roll.'], 'A cube slides. It cannot roll.', slid)),
      show(moment(['But flat faces are good for stacking. One cube sits on top of another.'], 'Cubes stack.', stacked)),
      show(moment(['Now put a ball on top of a ball.'], 'A ball on a ball?', ballOnBall)),
      show(moment(['It rolls right off. A sphere cannot stack.'], 'A sphere cannot stack.', ballFell)),
      show(moment(['A can is a cylinder. It has a curved side, and two flat ends.'], 'A cylinder: a curved side and flat ends.', can)),
      show(moment(['On its side it rolls, and standing up it stacks.'], 'A cylinder can roll and stack.', cans)),
      show(moment(['This is a cone.'], 'A cone', cone)),
      show(moment(['It has a curved side, so it rolls.'], 'A cone rolls.', coneRolled)),
      show(moment(['But a cone has a point on top. Nothing can sit on a point.'], 'A point on top.', coneOnCone)),
      show(moment(['It slips off. A cone cannot stack.'], 'A cone cannot stack.', coneFell)),
      show(moment(['Curved sides roll. A flat top and a flat bottom stack.'], 'Curved sides roll. A flat top and bottom stack.', calm(coneFell))),
      turn(first, rollWhy(first)),
      turn(second, rollWhy(second)),
      show(moment(['Look for a curved side to roll, and a flat top and bottom to stack.'], 'Curved: roll. Flat top and bottom: stack.', set(calm(coneFell), ['ball', 'cube2'], { lit: true }))),
    ],
  };
}

// ---- M-K-F3 What can be measured ----

type ToolName = 'a ruler' | 'a scale' | 'a measuring cup';
const TOOL: Record<ToolName, { id: string; tells: string; act: string; short: string }> = {
  'a ruler': { id: 'ruler', tells: 'how long', act: 'Lay the pencil along the ruler, and see where it ends.', short: 'long' },
  'a scale': { id: 'scale', tells: 'how heavy', act: 'Put the apple on the scale, and see how heavy it is.', short: 'heavy' },
  'a measuring cup': { id: 'cup', tells: 'how much it holds', act: 'Pour in the water, and see how much fits.', short: 'holds' },
};
const TOOL_NAMES = Object.keys(TOOL) as ToolName[];

function toolScene(prefix: string): Scene {
  return scene([
    { id: `${prefix}ruler`, look: art('📏'), x: 0.6, y: 1.8, w: 2.2, h: 1.2 },
    { id: `${prefix}scale`, look: art('⚖️'), x: 4.2, y: 1.6, w: 1.4, h: 1.4 },
    { id: `${prefix}cup`, look: art('🥛'), x: 7.6, y: 1.8, w: 1.2, h: 1.2 },
    { id: `${prefix}pencil`, look: art('✏️'), x: 0.9, y: 0.2, w: 1.2, h: 1.2, gone: true },
    { id: `${prefix}apple`, look: art('🍎'), x: 5.9, y: 0.4, w: 0.9, h: 0.9, gone: true },
    { id: `${prefix}drop0`, look: art('💧'), x: 7.6, y: 0.2, w: 0.6, h: 0.6, gone: true },
    { id: `${prefix}drop1`, look: art('💧'), x: 8.2, y: 0.4, w: 0.6, h: 0.6, gone: true },
    ...TOOL_NAMES.map((name, i): Piece => ({ id: `${prefix}${TOOL[name].id}word`, look: text(TOOL[name].short), x: [0.4, 3.8, 7.1][i] ?? 0, y: 3.7, w: 2.2, h: 0.8, gone: true })),
  ]);
}

// The tool lights, its thing appears beside it, then goes onto it (or into it).
function actOut(from: Scene, name: ToolName, prefix: string): { show: Scene; used: Scene } {
  const id = TOOL[name].id;
  const lit = set(calm(from), [`${prefix}${id}`], { lit: true });
  if (id === 'ruler') {
    const shown = set(lit, [`${prefix}pencil`], { gone: false });
    return { show: shown, used: set(shown, [`${prefix}pencil`], { x: 1.1, y: 1.1, lit: true }) };
  }
  if (id === 'scale') {
    const shown = set(lit, [`${prefix}apple`], { gone: false });
    return { show: shown, used: set(shown, [`${prefix}apple`], { x: 4.45, y: 1.0, lit: true }) };
  }
  const shown = set(lit, [`${prefix}drop0`, `${prefix}drop1`], { gone: false });
  return { show: shown, used: set(shown, [`${prefix}drop0`, `${prefix}drop1`], { x: 7.9, y: 2.1, gone: true }) };
}

function toolWhy(question: Question): Moment[] {
  const name = str(question.facts, 'tool') as ToolName;
  const tool = TOOL[name];
  const used = actOut(toolScene('w'), name, 'w');
  const Name = name.replace(/^a/, 'A');
  return [
    moment([`Here is ${name}.`], `${Name}`, used.show),
    moment([tool.act], tool.tells, used.used),
    moment([`So ${name} tells ${tool.tells}.`], `${Name} tells ${tool.tells}.`, set(used.used, [`w${tool.id}word`], { gone: false, lit: true })),
  ];
}

export function measureToolLesson(): Lesson {
  const start = toolScene('x');
  const ruler = actOut(start, 'a ruler', 'x');
  const scale = actOut(ruler.used, 'a scale', 'x');
  const cup = actOut(scale.used, 'a measuring cup', 'x');
  const words = set(calm(cup.used), ['xrulerword', 'xscaleword', 'xcupword'], { gone: false, lit: true });
  const first = turnQuestion('M-K-F3', 1, (f) => f.ask === 'tells' && f.tool === 'a scale');
  const second = turnQuestion('M-K-F3', 2, (f) => f.ask === 'tells' && f.tool === 'a measuring cup');
  return {
    parts: [
      show(moment(['We use tools to measure things. Each tool tells us something different.'], 'Tools help us measure.', start)),
      show(moment(['A ruler tells how long something is.'], 'A ruler tells how long.', ruler.show)),
      show(moment([TOOL['a ruler'].act], 'How long is the pencil?', ruler.used)),
      show(moment(['A scale tells how heavy something is.'], 'A scale tells how heavy.', scale.show)),
      show(moment([TOOL['a scale'].act], 'How heavy is the apple?', scale.used)),
      show(moment(['A measuring cup tells how much it holds.'], 'A cup tells how much it holds.', cup.show)),
      show(moment([TOOL['a measuring cup'].act], 'How much does it hold?', cup.used)),
      show(moment(['A ruler, how long. A scale, how heavy. A cup, how much it holds.'], 'long, heavy, holds', words)),
      turn(first, toolWhy(first)),
      turn(second, toolWhy(second)),
      show(moment(['Think about what each tool tells you.'], 'What does the tool tell you?', calm(words))),
    ],
  };
}

// ---- M-K-F6 How were they sorted? ----

type Form = 'circle' | 'square' | 'heart';
type Item = [string, string, string]; // shape, colour, size
const FORM_ART: Record<Form, Record<string, string>> = {
  circle: { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡', orange: '🟠', purple: '🟣', brown: '🟤', black: '⚫' },
  square: SQUARES,
  heart: { red: '❤️', blue: '💙', green: '💚', yellow: '💛', orange: '🧡', purple: '💜', brown: '🤎', black: '🖤' },
};
const SIZE: Record<string, number> = { s: 0.65, m: 0.95, l: 1.25 };

function itemArt([form, color]: Item): string {
  const found = (FORM_ART[form as Form] as Record<string, string> | undefined)?.[color];
  if (!found) throw new Error(`No picture for a ${color} ${form}`);
  return found;
}

// Each item can be drawn, and the two groups' colours are easy to tell apart in the pictures.
function drawable(facts: Record<string, unknown>): boolean {
  const groups = facts.groups as Item[][];
  const items = groups.flat();
  const colors = new Set(items.map((item) => item[1]));
  return items.every((item) => (FORM_ART[item[0] as Form] as Record<string, string> | undefined)?.[item[1]] !== undefined) && !(colors.has('yellow') && colors.has('orange'));
}

// Two groups of four, each in a 2 by 2 grid, with a label under each that appears when it is named.
function groupPieces(groups: Item[][], prefix: string): Piece[] {
  const pieces: Piece[] = [];
  groups.forEach((group, g) => {
    group.forEach((item, i) => {
      const size = SIZE[item[2]] ?? 1;
      const cx = (g === 0 ? 1.7 : 6.9) + (i % 2) * 1.4;
      const cy = 1.3 + Math.floor(i / 2) * 1.5;
      pieces.push({ id: `${prefix}${g}i${i}`, look: art(itemArt(item)), x: cx - size / 2, y: cy - size / 2, w: size, h: size });
    });
    pieces.push({ id: `${prefix}${g}label`, look: text(''), x: g === 0 ? 1.0 : 6.2, y: 4.2, w: 2.8, h: 0.8, gone: true });
  });
  return pieces;
}

const groupIds = (prefix: string, g: number): string[] => [0, 1, 2, 3].map((i) => `${prefix}${g}i${i}`);
const PLURAL: Record<string, string> = { circle: 'circles', square: 'squares', heart: 'hearts' };
const SIZE_WORD: Record<string, string> = { s: 'small', m: 'middle sized', l: 'big' };

// What every item in a group shares, under the rule.
function shared(group: Item[], rule: string): string {
  const first = group[0] as Item;
  if (rule === 'colour') return first[1];
  if (rule === 'shape') return PLURAL[first[0]] ?? first[0];
  return SIZE_WORD[first[2]] ?? first[2];
}

function label(from: Scene, id: string, words: string): Scene {
  return alter(from, (piece) => (piece.id === id ? { ...piece, look: text(words), gone: false } : piece));
}

function sortedMoments(groups: Item[][], rule: string, prefix: string): { moments: Moment[]; end: Scene } {
  const start = scene(groupPieces(groups, prefix));
  const left = shared(groups[0] ?? [], rule);
  const right = shared(groups[1] ?? [], rule);
  const one = label(set(start, groupIds(prefix, 0), { lit: true }), `${prefix}0label`, `all ${left}`);
  const two = label(set(calm(one), groupIds(prefix, 1), { lit: true }), `${prefix}1label`, `all ${right}`);
  const both = set(two, [...groupIds(prefix, 0), ...groupIds(prefix, 1)], { lit: true });
  return {
    moments: [
      moment(['Look inside this group. What is the same in all of them?'], 'What is the same?', set(start, groupIds(prefix, 0), { lit: true })),
      moment([`They are all ${left}.`], `all ${left}`, one),
      moment([`And these are all ${right}.`], `all ${right}`, two),
      moment([`So they were sorted by ${rule === 'colour' ? 'color' : rule}.`], `sorted by ${rule === 'colour' ? 'color' : rule}`, both),
    ],
    end: both,
  };
}

function sortWhy(question: Question): Moment[] {
  const answer = answerOf(question);
  return sortedMoments(question.facts.groups as Item[][], answer.replace(/^by /, ''), 'w').moments;
}

export function sortRuleLesson(): Lesson {
  const byColour: Item[][] = [
    [['circle', 'red', 's'], ['square', 'red', 'l'], ['heart', 'red', 'm'], ['circle', 'red', 'l']],
    [['square', 'blue', 'm'], ['heart', 'blue', 's'], ['circle', 'blue', 'l'], ['square', 'blue', 's']],
  ];
  const bySize: Item[][] = [
    [['circle', 'blue', 's'], ['square', 'red', 's'], ['heart', 'blue', 's'], ['square', 'blue', 's']],
    [['heart', 'red', 'l'], ['circle', 'red', 'l'], ['square', 'blue', 'l'], ['circle', 'blue', 'l']],
  ];
  const start = scene(groupPieces(byColour, 'x'));
  const notShape = set(start, ['x0i0', 'x0i1'], { lit: true });
  const colour = sortedMoments(byColour, 'colour', 'x');
  const sizeStart = scene(groupPieces(bySize, 'x'));
  const size = sortedMoments(bySize, 'size', 'x');
  const first = turnQuestion('M-K-F6', 1, (f) => drawable(f) && f.options !== undefined && sortRuleOf(f) === 'shape');
  const second = turnQuestion('M-K-F6', 2, (f) => drawable(f) && sortRuleOf(f) === 'size');
  return {
    parts: [
      show(moment(['Someone sorted these shapes into two groups. How did they sort them?'], 'How were they sorted?', start)),
      show(moment(['In this group, the shapes are not all the same.'], 'Not the same shape.', notShape)),
      ...colour.moments.slice(1).map(show),
      show(moment(['Shapes can be sorted by color, by shape, or by size.'], 'by color, by shape, or by size', calm(colour.end))),
      turn(first, sortWhy(first)),
      show(moment(['Here is another sorting. Look at how big they are.'], 'Look at how big they are.', sizeStart)),
      ...size.moments.slice(1).map(show),
      turn(second, sortWhy(second)),
      show(moment(['Find what is the same inside each group.'], 'What is the same in each group?', calm(size.end))),
    ],
  };
}

// The rule a question's groups were sorted by: the one thing the same inside each group and different between them.
function sortRuleOf(facts: Record<string, unknown>): string | null {
  const groups = facts.groups as Item[][];
  const rules = ['shape', 'colour', 'size'].filter((_, at) => {
    const firsts = groups.map((group) => (group[0] as Item)[at]);
    return groups.every((group) => group.every((item) => item[at] === (group[0] as Item)[at])) && new Set(firsts).size === groups.length;
  });
  return rules.length === 1 ? (rules[0] ?? null) : null;
}

// ---- M-K-E5 Shapes made from shapes ----
// Squares are drawn as square tiles (the `cube` look); triangles and trapezoids are drawn as the questions draw them.

interface Tile {
  apart: [number, number];
  together: [number, number];
}
const TILE = 1.2;

function tileScene(tiles: Tile[], edge: { x: number; y: number; w: number; h: number }, prefix: string): Scene {
  return scene([
    ...tiles.map((tile, i): Piece => ({ id: `${prefix}t${i}`, look: { kind: 'cube' }, x: tile.apart[0], y: tile.apart[1], w: TILE, h: TILE })),
    { id: `${prefix}edge`, look: { kind: 'box' }, ...edge, gone: true },
  ]);
}

function joinTiles(tiles: Tile[], edge: { x: number; y: number; w: number; h: number }, prefix: string): { apart: Scene; together: Scene; outlined: Scene } {
  const apart = tileScene(tiles, edge, prefix);
  const together = alter(apart, (piece) => {
    const i = piece.id.startsWith(`${prefix}t`) ? Number(piece.id.slice(prefix.length + 1)) : -1;
    const tile = tiles[i];
    return tile ? { ...piece, x: tile.together[0], y: tile.together[1] } : piece;
  });
  return { apart, together, outlined: set(together, [`${prefix}edge`], { gone: false, lit: true }) };
}

const TWO: Tile[] = [
  { apart: [2.6, 1.4], together: [3.8, 1.4] },
  { apart: [6.2, 1.4], together: [5.0, 1.4] },
];
const TWO_EDGE = { x: 3.7, y: 1.3, w: 2.6, h: 1.4 };
// The question's own pieces, drawn as it draws them: pulled apart, pushed together with the joins showing, and whole.
function figureMoments(prefix: string, piece: string, count: number, makes: string, intro: { say: string; text: string }): Moment[] {
  const id = figureFor(makes, piece, count);
  if (!id) throw new Error(`No figure for ${count} ${piece}s making a ${makes}`);
  const at = (show: 'pieces' | 'cut' | 'whole', lit: boolean): Scene => {
    const look: Visual = { kind: 'figure', figure: id, show };
    return scene([{ id: `${prefix}figure`, look: picture(look), x: 3.5, y: 0.8, w: 3, h: 3, ...(lit ? { lit: true } : {}) }]);
  };
  return [
    moment([intro.say], intro.text, at('pieces', false)),
    moment(['Push them together, so they touch.'], 'Push them together.', at('cut', false)),
    moment([`Now look at the outside edge. They make a ${makes}.`], `They make a ${makes}.`, at('whole', true)),
  ];
}

const PIECE_INTRO: Record<string, { say: string; text: string }> = {
  'triangle 2': { say: 'Here are two triangles.', text: '2 triangles' },
  'triangle 6': { say: 'Here are six triangles.', text: '6 triangles' },
  'trapezoid 2': { say: 'Here are two trapezoids. A trapezoid has four sides, a short one on top and a long one below.', text: '2 trapezoids' },
};

function composeWhy(question: Question): Moment[] {
  const count = num(question.facts, 'count');
  const piece = str(question.facts, 'piece');
  const answer = answerOf(question);
  if (piece !== 'square') {
    const intro = PIECE_INTRO[`${piece} ${count}`];
    if (!intro) throw new Error(`No words for ${count} ${piece}s`);
    return figureMoments('w', piece, count, answer, intro);
  }
  if (count !== 2) throw new Error('The lesson joins two squares');
  const join = joinTiles(TWO, TWO_EDGE, 'w');
  return [
    moment(['Here are two squares.'], '2 squares', join.apart),
    moment(['Push them together, so they touch.'], 'Push them together.', join.together),
    moment(['Look at the outside edge. It has two long sides and two short sides.'], '2 long sides, 2 short sides', join.outlined),
    moment([`So they make a ${answer}.`], `They make a ${answer}.`, set(join.outlined, ids4('wt', count), { lit: true })),
  ];
}

const ids4 = (prefix: string, count: number): string[] => Array.from({ length: count }, (_, i) => `${prefix}${i}`);

export function composeLesson(): Lesson {
  const three: Tile[] = [
    { apart: [1.4, 1.4], together: [3.2, 1.4] },
    { apart: [4.4, 1.4], together: [4.4, 1.4] },
    { apart: [7.4, 1.4], together: [5.6, 1.4] },
  ];
  const join = joinTiles(three, { x: 3.1, y: 1.3, w: 3.8, h: 1.4 }, 'x');
  const first = turnQuestion('M-K-E5', 1, (f) => f.ask === 'makes' && f.piece === 'square' && f.count === 2);
  // Other pieces join too: two triangles are shown, then the child joins two trapezoids.
  const triangles = figureMoments('y', 'triangle', 2, 'square', { say: 'Other shapes can join too. Here are two triangles.', text: '2 triangles' });
  const second = turnQuestion('M-K-E5', 2, (f) => f.ask === 'makes' && f.piece === 'trapezoid');
  return {
    parts: [
      show(moment(['Small shapes can join together to make bigger shapes.'], 'Small shapes make bigger shapes.', join.apart)),
      show(moment(['Here are three squares.'], '3 squares', set(join.apart, ids4('xt', 3), { lit: true }))),
      show(moment(['Let us slide them together, side by side.'], 'Slide them together.', join.together)),
      show(moment(['Now look only at the outside edge.'], 'Look at the outside edge.', join.outlined)),
      show(moment(['It has two long sides and two short sides. It is a rectangle.'], '3 squares make a rectangle.', set(join.outlined, ids4('xt', 3), { lit: true }))),
      show(moment(['The new shape is made of the small ones, all touching.'], 'The small shapes touch.', calm(join.outlined))),
      turn(first, composeWhy(first)),
      ...triangles.map(show),
      turn(second, composeWhy(second)),
      show(moment(['Push the pieces together, and look at the outside edge.'], 'Push together. Look at the edge.', calm(join.outlined))),
    ],
  };
}

// ---- M-K-E6 Shapes all around us ----

type FlatForm = 'circle' | 'triangle' | 'rectangle';
const FORM_LINE: Record<FlatForm, string> = { circle: 'It is round, with no corners.', triangle: 'It has three sides and three corners.', rectangle: 'It has two long sides and two short sides.' };

function formPiece(form: FlatForm, id: string, cx: number, y: number): Piece {
  if (form === 'rectangle') return { id, look: { kind: 'box' }, x: cx - 0.45, y, w: 0.9, h: 1.4, gone: true };
  return { id, look: art(form === 'circle' ? '🔵' : '🔺'), x: cx - 0.6, y: y + 0.1, w: 1.2, h: 1.2, gone: true };
}

function thingNamed(name: string): { emoji: string; name: string; shape: string } {
  const found = FLAT_THINGS.find((each) => each.name === name);
  if (!found) throw new Error(`No flat thing called ${name}`);
  return found;
}

// Things in a row on the shelf, each with its shape under it (hidden until it is named).
function shapedScene(names: string[], prefix: string): Scene {
  const xs = names.length === 1 ? [5] : names.length === 2 ? [3, 7] : [1.8, 5, 8.2];
  return scene(
    names.flatMap((name, i) => {
      const thing = thingNamed(name);
      const cx = xs[i] ?? 5;
      return [{ id: `${prefix}th${i}`, look: art(thing.emoji), x: cx - 0.7, y: 0.5, w: 1.4, h: 1.4 }, formPiece(thing.shape as FlatForm, `${prefix}sh${i}`, cx, 2.4)];
    }),
  );
}

function shapedWhy(question: Question): Moment[] {
  if (question.facts.ask === 'shape') {
    const thing = thingNamed(str(question.facts, 'object'));
    const start = shapedScene([thing.name], 'w');
    return [
      moment([`Look at the outside edge of the ${thing.name}.`], `Look at the ${thing.name}.`, set(start, ['wth0'], { lit: true })),
      moment([FORM_LINE[thing.shape as FlatForm]], FORM_LINE[thing.shape as FlatForm], set(start, ['wsh0'], { gone: false })),
      moment([`So the ${thing.name} is shaped like a ${thing.shape}.`], `The ${thing.name} is a ${thing.shape}.`, set(start, ['wth0', 'wsh0'], { gone: false, lit: true })),
    ];
  }
  const names = question.facts.options as string[];
  const right = answerOf(question);
  const at = names.indexOf(right);
  const start = shapedScene(names, 'w');
  const shapes = set(start, names.map((_, i) => `wsh${i}`), { gone: false });
  return [
    moment([`Which one is a ${str(question.facts, 'target')}? Look at each outside edge.`], 'Look at each edge.', shapes),
    moment([`The ${right} is shaped like a ${str(question.facts, 'target')}.`], `The ${right} is a ${str(question.facts, 'target')}.`, set(shapes, [`wth${at}`, `wsh${at}`], { lit: true })),
  ];
}

export function shapesAroundLesson(): Lesson {
  const start = shapedScene(['clock', 'pizza slice', 'door'], 'x');
  const clock = set(start, ['xth0', 'xsh0'], { gone: false, lit: true });
  const pizza = set(calm(clock), ['xth1', 'xsh1'], { gone: false, lit: true });
  const door = set(calm(pizza), ['xth2', 'xsh2'], { gone: false, lit: true });
  // The top level asks about solid shapes: a ball, a can and a box, named one at a time.
  const solids = scene([
    { id: 'zball', look: art('⚽'), x: 1.1, y: 1.6, w: 1.4, h: 1.4 },
    { id: 'zcan', look: art('🥫'), x: 4.3, y: 1.6, w: 1.4, h: 1.4 },
    { id: 'zbox', look: art('📦'), x: 7.5, y: 1.6, w: 1.4, h: 1.4 },
  ]);
  const first = turnQuestion('M-K-E6', 1, (f) => f.ask === 'object' && Array.isArray(f.options) && !(f.options as string[]).includes('clock'));
  const second = turnQuestion('M-K-E6', 2, (f) => f.ask === 'shape' && f.object !== 'clock' && f.object !== 'door' && f.object !== 'pizza slice');
  return {
    parts: [
      show(moment(['Things all around us have shapes.'], 'Things have shapes.', start)),
      show(moment(['To find a shape, look at the outside edge of a thing.'], 'Look at the outside edge.', set(start, ['xth0', 'xth1', 'xth2'], { lit: true }))),
      show(moment(['A clock is round, like a circle.'], 'A clock is a circle.', clock)),
      show(moment(['A pizza slice has three sides, like a triangle.'], 'A pizza slice is a triangle.', pizza)),
      show(moment(['A door has two long sides and two short sides, like a rectangle.'], 'A door is a rectangle.', door)),
      turn(first, shapedWhy(first)),
      show(moment(['Round means circle. Three sides means triangle. Long and short sides mean rectangle.'], 'circle, triangle, rectangle', set(calm(door), ['xsh0', 'xsh1', 'xsh2'], { lit: true }))),
      turn(second, shapedWhy(second)),
      show(moment(['Some things are solid shapes. A ball is a sphere.'], 'A ball is a sphere.', set(solids, ['zball'], { lit: true }))),
      show(moment(['A can is a cylinder.'], 'A can is a cylinder.', set(solids, ['zcan'], { lit: true }))),
      show(moment(['A box is a cube.'], 'A box is a cube.', set(solids, ['zbox'], { lit: true }))),
      show(moment(['Look at the outside edge, and you will find the shape.'], 'Look at the outside edge.', calm(door))),
    ],
  };
}

// ---- M-K-F2 Sort and count ----

interface Drawn {
  form: string;
  color: string;
}
// For a shape sort the colour does not matter, so each shape has one picture.
const ONE_LOOK: Record<string, string> = { circle: '🔵', square: '🟦', heart: '❤️', star: '⭐', triangle: '🔺' };

// A sort question's items as pictures: by colour, the shape in that colour (a circle when there is no such picture).
function itemsOf(question: Question): string[] {
  if (question.type !== 'sort') throw new Error('Not a sort question');
  const byColour = question.facts.by === 'colour';
  return question.items.map((item) => {
    if (item.kind !== 'shape') throw new Error('A sort item that is not a shape');
    if (!byColour) return ONE_LOOK[item.shape] ?? '🔵';
    return (FORM_ART[item.shape as Form] as Record<string, string> | undefined)?.[item.color] ?? FORM_ART.circle[item.color] ?? '🔵';
  });
}

const drawnArt = (each: Drawn): string => (FORM_ART[each.form as Form] as Record<string, string> | undefined)?.[each.color] ?? '🔵';

// The items in a row on top; each bin's label on the table; each item then moves to its bin's side.
function sortScene(items: string[], labels: string[], prefix: string): Scene {
  return scene([
    ...items.map((emoji, i): Piece => ({ id: `${prefix}i${i}`, look: art(emoji), x: 1.2 + i * 1.3, y: 0.4, w: 1, h: 1 })),
    ...labels.map((words, b): Piece => ({ id: `${prefix}b${b}`, look: text(words), x: b === 0 ? 0.8 : 5.6, y: 3.6, w: 3.6, h: 0.9, gone: true })),
  ]);
}

function moveToBin(from: Scene, prefix: string, bins: number[], bin: number): Scene {
  let j = 0;
  return alter(from, (piece) => {
    if (!piece.id.startsWith(`${prefix}i`)) return { ...piece, lit: piece.id === `${prefix}b${bin}` ? true : undefined };
    const i = Number(piece.id.slice(prefix.length + 1));
    if (bins[i] !== bin) return { ...piece, lit: undefined };
    const placed = { ...piece, x: (bin === 0 ? 0.5 : 5.3) + j * 0.9, y: 2.1, w: 0.85, h: 0.85, lit: true };
    j += 1;
    return placed;
  });
}

function sortCountWhy(question: Question): Moment[] {
  if (question.type !== 'sort') throw new Error('Not a sort question');
  const words = question.bins.map((bin) => bin.label.toLowerCase());
  const byColour = question.facts.by === 'colour';
  const start = sortScene(itemsOf(question), question.bins.map((bin) => bin.label), 'w');
  const labelled = set(start, ['wb0', 'wb1'], { gone: false });
  const one = moveToBin(labelled, 'w', question.answerBin, 0);
  const two = moveToBin(one, 'w', question.answerBin, 1);
  const line = (w: string): string => (byColour ? `The ${w} ones go in the ${w} group.` : `The ${w} go in the ${w} group.`);
  return [
    moment([byColour ? 'Look at the color of each one.' : 'Look at the shape of each one.'], byColour ? 'Look at each color.' : 'Look at each shape.', labelled),
    moment([line(words[0] ?? '')], line(words[0] ?? ''), one),
    moment([line(words[1] ?? '')], line(words[1] ?? ''), two),
  ];
}

export function sortCountLesson(): Lesson {
  const items: Drawn[] = [
    { form: 'circle', color: 'red' },
    { form: 'square', color: 'blue' },
    { form: 'heart', color: 'red' },
    { form: 'circle', color: 'blue' },
    { form: 'square', color: 'red' },
  ];
  const bins = [0, 1, 0, 1, 0];
  const start = sortScene(items.map(drawnArt), ['Red', 'Blue'], 'x');
  const labelled = set(start, ['xb0', 'xb1'], { gone: false });
  const reds = moveToBin(labelled, 'x', bins, 0);
  const blues = moveToBin(reds, 'x', bins, 1);
  const countReds = countAlong(calm(blues), ['xi0', 'xi2', 'xi4']);
  const countBlues = countAlong(calm(countReds.end), ['xi1', 'xi3']);
  const first = turnQuestion('M-K-F2', 1, (f) => f.by === 'colour' && (f.binAttrs as string[]).every((color) => FORM_ART.circle[color] !== undefined));
  const second = turnQuestion('M-K-F2', 2, (f) => f.by === 'shape');
  return {
    parts: [
      show(moment(['We can sort things into groups, and then count each group.'], 'Sort, then count.', start)),
      show(moment(['Let us sort these by color.'], 'Sort by color.', labelled)),
      show(moment(['The red ones go in the red group.'], 'Red ones here.', reds)),
      show(moment(['The blue ones go in the blue group.'], 'Blue ones here.', blues)),
      show(moment(['Now count each group.'], 'Count each group.', calm(blues))),
      ...countReds.moments.map(show),
      show(moment(['There are', { number: 3 }, 'red ones.'], '3 red', set(countReds.end, ['xb0'], { lit: true }))),
      ...countBlues.moments.map(show),
      show(moment(['There are', { number: 2 }, 'blue ones.'], '2 blue', set(countBlues.end, ['xb1'], { lit: true }))),
      show(moment([{ number: 3 }, 'is more than', { number: 2 }, ', so the red group has more.'], '3 is more than 2.', set(calm(countBlues.end), ['xi0', 'xi2', 'xi4', 'xb0'], { lit: true }))),
      turn(first, sortCountWhy(first)),
      show(moment(['We can sort by shape, too. Look at the shape of each one.'], 'Sort by shape.', calm(start))),
      turn(second, sortCountWhy(second)),
      show(moment(['Put the ones that match together, then count each group.'], 'Sort, then count.', calm(countBlues.end))),
    ],
  };
}

// ---- M-K-F4 Heavier and lighter, M-K-F5 Holds more and holds less ----

function tiered(list: readonly Tiered[], name: string): Tiered {
  const found = list.find((each) => each.name === name);
  if (!found) throw new Error(`No thing called ${name}`);
  return found;
}

// Two things side by side, the bigger or heavier one named first in the facts' options order.
function pairScene(a: Tiered, b: Tiered, prefix: string): Scene {
  return scene([
    { id: `${prefix}a`, look: art(a.emoji), x: 1.8, y: 1.3, w: 1.6, h: 1.6 },
    { id: `${prefix}b`, look: art(b.emoji), x: 6.6, y: 1.3, w: 1.6, h: 1.6 },
    { id: `${prefix}pivot`, look: art('🔺'), x: 4.5, y: 2.4, w: 1, h: 1, gone: true },
    { id: `${prefix}la`, look: text(''), x: 1.1, y: 3.9, w: 3, h: 0.8, gone: true },
    { id: `${prefix}lb`, look: text(''), x: 5.9, y: 3.9, w: 3, h: 0.8, gone: true },
  ]);
}

// The seesaw: the heavier side goes down, the lighter side goes up.
function tip(from: Scene, prefix: string, aHeavier: boolean): Scene {
  return alter(from, (piece) => {
    if (piece.id === `${prefix}pivot`) return { ...piece, gone: false };
    if (piece.id === `${prefix}a`) return { ...piece, y: aHeavier ? 2.0 : 0.4 };
    if (piece.id === `${prefix}b`) return { ...piece, y: aHeavier ? 0.4 : 2.0 };
    return piece;
  });
}

function weightWhy(question: Question): Moment[] {
  const [a, b] = (question.facts.options as string[]).map((name) => tiered(WEIGHT_THINGS, name)) as [Tiered, Tiered];
  const heavy = a.tier > b.tier ? a : b;
  const light = heavy === a ? b : a;
  const start = pairScene(a, b, 'w');
  const tipped = tip(start, 'w', heavy === a);
  const ask = str(question.facts, 'ask');
  return [
    moment([`Which is harder to lift, the ${a.name} or the ${b.name}?`], 'Which is harder to lift?', start),
    moment(['Put them on a seesaw. The heavier one goes down.'], 'The heavier one goes down.', tipped),
    moment([ask === 'most' ? `So the ${heavy.name} is heavier.` : `So the ${light.name} is lighter.`], ask === 'most' ? `The ${heavy.name} is heavier.` : `The ${light.name} is lighter.`, set(tipped, [heavy === a ? (ask === 'most' ? 'wa' : 'wb') : ask === 'most' ? 'wb' : 'wa'], { lit: true })),
  ];
}

export function heavierLesson(): Lesson {
  const elephant = tiered(WEIGHT_THINGS, 'elephant');
  const leaf = tiered(WEIGHT_THINGS, 'leaf');
  const start = pairScene(elephant, leaf, 'x');
  const tipped = tip(start, 'x', true);
  const named = alter(tipped, (piece) => (piece.id === 'xla' ? { ...piece, look: text('heavier'), gone: false } : piece.id === 'xlb' ? { ...piece, look: text('lighter'), gone: false } : piece));
  const avoid = (f: Record<string, unknown>): boolean => !(f.options as string[]).includes('elephant') && !(f.options as string[]).includes('leaf');
  const first = turnQuestion('M-K-F4', 1, avoid);
  const second = turnQuestion('M-K-F4', 2, (f) => avoid(f) && JSON.stringify(f.things) !== JSON.stringify(first.facts.things));
  return {
    parts: [
      show(moment(['Some things are heavy, and some things are light.'], 'Heavy and light', start)),
      show(moment(['An elephant is very heavy. It is hard to lift.'], 'An elephant is heavy.', set(start, ['xa'], { lit: true }))),
      show(moment(['A leaf is light. It is easy to lift.'], 'A leaf is light.', set(start, ['xb'], { lit: true }))),
      show(moment(['Put them on a seesaw. The heavier one goes down.'], 'The heavier one goes down.', tipped)),
      show(moment(['The elephant is heavier. The leaf is lighter.'], 'heavier, lighter', set(named, ['xla', 'xlb'], { lit: true }))),
      turn(first, weightWhy(first)),
      show(moment(['The lighter one is the one that is easier to lift.'], 'Lighter is easier to lift.', set(calm(named), ['xb', 'xlb'], { lit: true }))),
      turn(second, weightWhy(second)),
      show(moment(['Think: which one would be harder to lift?'], 'Which is harder to lift?', calm(named))),
    ],
  };
}

// Water drops above each thing; they pour in.
function holdScene(a: Tiered, b: Tiered, aDrops: number, bDrops: number, prefix: string): Scene {
  const drops = (side: 'a' | 'b', n: number, cx: number): Piece[] =>
    Array.from({ length: n }, (_, i) => ({ id: `${prefix}${side}d${i}`, look: art('💧'), x: cx - (n * 0.6) / 2 + i * 0.6, y: 0.2, w: 0.6, h: 0.6, gone: true }));
  return scene([
    { id: `${prefix}a`, look: art(a.emoji), x: 1.6, y: 1.6, w: 1.8, h: 1.8 },
    { id: `${prefix}b`, look: art(b.emoji), x: 6.6, y: 1.6, w: 1.8, h: 1.8 },
    ...drops('a', aDrops, 2.5),
    ...drops('b', bDrops, 7.5),
  ]);
}

function pour(from: Scene, prefix: string, side: 'a' | 'b', n: number): { above: Scene; poured: Scene } {
  const dropIds = Array.from({ length: n }, (_, i) => `${prefix}${side}d${i}`);
  const above = set(calm(from), dropIds, { gone: false });
  const poured = alter(above, (piece) => (dropIds.includes(piece.id) ? { ...piece, y: 2.2, gone: true } : piece.id === `${prefix}${side}` ? { ...piece, lit: true } : piece));
  return { above, poured };
}

function holdWhy(question: Question): Moment[] {
  const [a, b] = (question.facts.options as string[]).map((name) => tiered(HOLD_THINGS, name)) as [Tiered, Tiered];
  const aBig = a.tier > b.tier;
  const big = aBig ? a : b;
  const small = aBig ? b : a;
  const start = holdScene(a, b, aBig ? 5 : 1, aBig ? 1 : 5, 'w');
  const smallPour = pour(start, 'w', aBig ? 'b' : 'a', 1);
  const bigPour = pour(smallPour.poured, 'w', aBig ? 'a' : 'b', 5);
  const ask = str(question.facts, 'ask');
  return [
    moment([`Pour water into the ${small.name}. It fills up fast.`], `The ${small.name} fills fast.`, smallPour.poured),
    moment([`Pour water into the ${big.name}. It takes much more.`], `The ${big.name} takes more.`, bigPour.poured),
    moment([ask === 'most' ? `So the ${big.name} holds more.` : `So the ${small.name} holds less.`], ask === 'most' ? `The ${big.name} holds more.` : `The ${small.name} holds less.`, set(bigPour.poured, [ask === 'most' ? (aBig ? 'wa' : 'wb') : aBig ? 'wb' : 'wa'], { lit: true })),
  ];
}

export function holdsLesson(): Lesson {
  const tub = tiered(HOLD_THINGS, 'bathtub');
  const spoon = tiered(HOLD_THINGS, 'spoon');
  const start = holdScene(tub, spoon, 6, 1, 'x');
  const spoonPour = pour(start, 'x', 'b', 1);
  const tubPour = pour(spoonPour.poured, 'x', 'a', 6);
  const avoid = (f: Record<string, unknown>): boolean => !((f.options as string[]).includes('bathtub') && (f.options as string[]).includes('spoon'));
  const first = turnQuestion('M-K-F5', 1, avoid);
  const second = turnQuestion('M-K-F5', 2, (f) => avoid(f) && JSON.stringify(f.things) !== JSON.stringify(first.facts.things));
  return {
    parts: [
      show(moment(['Some things hold a lot of water. Some hold only a little.'], 'Holds more, holds less', start)),
      show(moment(['Let us pour water into the spoon.'], 'Pour into the spoon.', spoonPour.above)),
      show(moment(['Just one drop, and the spoon is full.'], 'The spoon is full.', spoonPour.poured)),
      show(moment(['Now pour water into the bathtub.'], 'Pour into the bathtub.', tubPour.above)),
      show(moment(['In go all the drops, and there is still lots of room.'], 'Still lots of room.', tubPour.poured)),
      show(moment(['The bathtub holds more. The spoon holds less.'], 'The bathtub holds more.', set(tubPour.poured, ['xa'], { lit: true }))),
      turn(first, holdWhy(first)),
      show(moment(['The bigger the inside, the more it holds.'], 'Bigger inside holds more.', calm(tubPour.poured))),
      turn(second, holdWhy(second)),
      show(moment(['Think: which one has more room inside?'], 'Which has more room inside?', calm(start))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'M-K-E5': composeLesson,
  'M-K-E6': shapesAroundLesson,
  'M-K-F2': sortCountLesson,
  'M-K-F4': heavierLesson,
  'M-K-F5': holdsLesson,
  'M-K-E3': sidesLesson,
  'M-K-E4': positionLesson,
  'M-K-E7': rollStackLesson,
  'M-K-F3': measureToolLesson,
  'M-K-F6': sortRuleLesson,
};
