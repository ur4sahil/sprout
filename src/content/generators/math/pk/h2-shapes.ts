import type { Rng } from '../../../../engine/rng';
import type { Hint, Level, QuestionDraft, ShapeName, SolidName, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import { COLOURED, SHAPED, SOLID_THINGS } from '../../../data/h2-world';
import type { Thing } from '../../../data/h2-world';
import type { SkillGenerator } from '../../../generator';
import { skill } from './h2-lesson';
import { a, cap, shape } from './parts';

// Math pre-K, wave H2 (plan section 15): C.5 shapes around us, C.6 same shape, C.7 colours around us,
// C.8 ball, box or can, C.9 order by size.

const picture = (thing: Thing): Visual => ({ kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row', speak: [thing.name] });
// Names that mean more than one thing. A cactus is one thing, though it ends in s.
const PLURAL_NAMES = new Set(['cherries', 'grapes']);
const plural = (name: string): boolean => PLURAL_NAMES.has(name);
const the = (name: string): string => `the ${name}`;

// One thing for each of the offered properties, in a shuffled order. `pick` gives the things that have a property.
function oneEach<T extends Thing>(props: readonly string[], pick: (prop: string) => readonly T[], rng: Rng): T[] {
  return rng.shuffle(props.map((prop) => rng.pick(pick(prop))));
}

// ---- C.5 Shapes around us ----
// Levels: which thing is shaped like a circle or a triangle / which thing has the shape shown / what shape a thing is.
// A square and a rectangle never sit in one question: a square is a rectangle too. Oracle: h2World.

type Flat = (typeof SHAPED)[number]['shape'];
// What a thing is called in a shapes question: the 🍕 is a slice, which is a triangle; a whole pizza is round.
// The facts keep the list's name, which the answer check reads.
const SHAPE_NAMES: Record<string, string> = { pizza: 'pizza slice' };
const shapedThing = (thing: Thing): Thing => ({ ...thing, name: SHAPE_NAMES[thing.name] ?? thing.name });
const SHAPE_HINT = 'Look at the outside edge of each thing.';
function threeShapes(target: Flat, rng: Rng): Flat[] {
  const others = (['circle', 'triangle', 'square', 'rectangle'] as Flat[]).filter((each) => each !== target);
  for (;;) {
    const set = [target, ...rng.sample(others, 2)];
    if (!(set.includes('square') && set.includes('rectangle'))) return set;
  }
}

function shapesAround(level: Level, rng: Rng): QuestionDraft {
  const target: Flat = level === 1 ? rng.pick(['circle', 'triangle'] as Flat[]) : rng.pick(['circle', 'triangle', 'square', 'rectangle'] as Flat[]);
  const outline = (form: Flat): Visual => ({ ...shape(form as ShapeName, 'blue'), speak: [form] });
  if (level === 3) {
    const thing = rng.pick(SHAPED.filter((each) => each.shape === target));
    const called = shapedThing(thing);
    const forms = rng.shuffle(threeShapes(target, rng));
    const prompt = `What shape is ${the(called.name)}?`;
    const line = `${cap(the(called.name))} is shaped like ${a(target)}.`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'shape', thing: thing.name, set: [...forms].sort(), options: forms },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: picture(called),
      options: forms.map(outline),
      answerIndex: forms.indexOf(target),
      explanation: { speak: [line], steps: [line], visual: { kind: 'row', children: [picture(called), outline(target)] }, hint: { text: `Look at the outside edge of ${the(called.name)}.` } },
    };
  }
  const things = oneEach(threeShapes(target, rng), (form) => SHAPED.filter((each) => each.shape === form), rng);
  const answer = things.find((each) => each.shape === target) as (typeof things)[number];
  const prompt = level === 1 ? `Which one is shaped like ${a(target)}?` : 'Which one has this shape?';
  const line = `${cap(the(shapedThing(answer).name))} is shaped like ${a(target)}.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'shape', want: target, set: things.map((each) => each.name).sort(), options: things.map((each) => each.name) },
    prompt: { text: prompt, speak: [prompt] },
    ...(level === 2 ? { stimulus: outline(target) } : {}),
    options: things.map((each) => picture(shapedThing(each))),
    answerIndex: things.indexOf(answer),
    explanation: { speak: [line], steps: [line], visual: { kind: 'row', children: [picture(shapedThing(answer)), outline(target)] }, hint: { text: SHAPE_HINT } },
  };
}

export const shapesAroundGenerator: SkillGenerator = skill({
  skillId: 'M-PK-C5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h2-world'],
  generate: shapesAround,
  exampleSeed: 921,
  lesson: { see: 'Shapes are all around us. A cookie is shaped like a circle.', remember: 'Look at the outside edge of a thing to find its shape.', tryLevel: 2 },
  oracle: 'h2World',
});

// ---- C.6 Same shape ----
// Levels: circle, square, triangle in new colours / adds rectangle, star, heart, in new sizes / turned. Oracle: attribute.

function sameShape(level: Level, rng: Rng): QuestionDraft {
  const pool: ShapeName[] = level === 1 ? ['circle', 'square', 'triangle'] : level === 2 ? ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart'] : ['triangle', 'rectangle', 'star', 'heart'];
  let forms: ShapeName[];
  do forms = rng.sample(pool, 3);
  while (forms.includes('square') && forms.includes('rectangle'));
  const target = forms[0] as ShapeName;
  const offered = rng.shuffle(forms);
  // The options share one colour, and the shape to match is in another (plan section 5, distractor rules).
  const colors = rng.sample(COLOR_NAMES, 2) as ColorName[];
  const size = (): 's' | 'm' | 'l' => (level === 1 ? 'm' : rng.pick(['s', 'm', 'l'] as const));
  const turn = (): number => (level === 3 ? rng.pick([90, 180, 270]) : 0);
  const options = offered.map((form) => shape(form, colors[1] as ColorName, size(), turn()));
  const prompt = 'Which one is the same shape as this one?';
  const why = level === 3 ? `It is turned, but it is still ${a(target)}.` : 'The color and size do not matter.';
  const steps = [`The shape at the top is ${a(target)}.`, `Find the other ${target}. ${why}`];
  return {
    type: 'choice',
    mode: 'look',
    facts: { target, optionAttrs: offered, options: offered },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: shape(target, colors[0] as ColorName),
    options,
    answerIndex: offered.indexOf(target),
    explanation: { speak: [steps.join(' ')], steps, visual: options[offered.indexOf(target)] as Visual, hint: { text: 'Look at the sides and corners, not the color.' } },
  };
}

export const sameShapeGenerator: SkillGenerator = skill({
  skillId: 'M-PK-C6',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: sameShape,
  exampleSeed: 922,
  lesson: { see: 'Two shapes can be the same shape in different colors.', remember: 'Look at the sides and corners, not the color.', tryLevel: 2 },
  oracle: 'attribute',
});

// ---- C.7 Colors around us ----
// Levels: which thing is red, yellow or purple / any of five colours / what colour a thing is. Oracle: h2World.
// Three colours in a question are always easy to tell apart (no red with green, no orange with red or yellow).

type Hue = (typeof COLOURED)[number]['colour'];
const TRIPLES: Hue[][] = [
  ['red', 'yellow', 'purple'],
  ['yellow', 'green', 'purple'],
  ['green', 'orange', 'purple'],
];

function coloursAround(level: Level, rng: Rng): QuestionDraft {
  const hues = rng.pick(level === 1 ? TRIPLES.slice(0, 2) : TRIPLES);
  const target = rng.pick(hues);
  const swatch = (hue: Hue): Visual => ({ kind: 'shape', shape: 'circle', color: hue, size: 'm', rotation: 0, speak: [hue] });
  if (level === 3) {
    const thing = rng.pick(COLOURED.filter((each) => each.colour === target));
    const offered = rng.shuffle(hues);
    const prompt = `What color ${plural(thing.name) ? 'are' : 'is'} ${the(thing.name)}?`;
    const said = `${cap(the(thing.name))} ${plural(thing.name) ? 'are' : 'is'} ${target}.`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'colour', thing: thing.name, set: [...hues].sort(), options: offered },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: picture(thing),
      options: offered.map(swatch),
      answerIndex: offered.indexOf(target),
      explanation: { speak: [said], steps: [said], visual: { kind: 'row', children: [picture(thing), swatch(target)] }, hint: { text: `Find the circle that is the same color as ${the(thing.name)}.` } },
    };
  }
  const things = oneEach(hues, (hue) => COLOURED.filter((each) => each.colour === hue), rng);
  const answer = things.find((each) => each.colour === target) as (typeof things)[number];
  const prompt = `Which one is ${target}?`;
  const said = `${cap(the(answer.name))} ${plural(answer.name) ? 'are' : 'is'} ${target}.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'colour', want: target, set: things.map((each) => each.name).sort(), options: things.map((each) => each.name) },
    prompt: { text: prompt, speak: [prompt] },
    options: things.map(picture),
    answerIndex: things.indexOf(answer),
    explanation: { speak: [said], steps: [said], visual: { kind: 'row', children: [picture(answer), swatch(target)] }, hint: { text: 'Look at each picture and say its color.' } },
  };
}

export const coloursAroundGenerator: SkillGenerator = skill({
  skillId: 'M-PK-C7',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h2-world'],
  generate: coloursAround,
  exampleSeed: 923,
  lesson: { see: 'Many things have their own color. A banana is yellow.', remember: 'Colors have names. Say the color you see.', tryLevel: 2 },
  oracle: 'h2World',
});

// ---- C.8 Ball, box or can ----
// Levels: which thing has the solid shape shown / which thing is shaped like a ball, a box or a can / which solid a thing is.
// Oracle: h2World.

type Round = (typeof SOLID_THINGS)[number]['solid'];
const LIKE: Record<Round, string> = { sphere: 'a ball', cube: 'a box', cylinder: 'a can' };
const SOLIDS: Round[] = ['sphere', 'cube', 'cylinder'];
const SOLID_HINT: Hint = { text: 'A ball rolls. A box has flat sides. A can has round ends.' };

function ballBoxCan(level: Level, rng: Rng): QuestionDraft {
  const target = rng.pick(SOLIDS);
  const solid = (name: Round): Visual => ({ kind: 'solid', solid: name as SolidName, speak: [`${name}, like ${LIKE[name]}`] });
  if (level === 3) {
    const thing = rng.pick(SOLID_THINGS.filter((each) => each.solid === target));
    const offered = rng.shuffle(SOLIDS);
    const prompt = `What shape is ${the(thing.name)}?`;
    const said = `${cap(the(thing.name))} is a ${target}, shaped like ${LIKE[target]}.`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'solid', thing: thing.name, options: offered },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: picture(thing),
      options: offered.map(solid),
      answerIndex: offered.indexOf(target),
      explanation: { speak: [said], steps: [said], visual: { kind: 'row', children: [picture(thing), solid(target)] }, hint: SOLID_HINT },
    };
  }
  const things = oneEach(SOLIDS, (name) => SOLID_THINGS.filter((each) => each.solid === name), rng);
  const answer = things.find((each) => each.solid === target) as (typeof things)[number];
  const prompt = level === 1 ? 'Which one has this shape?' : `Which one is shaped like ${LIKE[target]}?`;
  const said = `${cap(the(answer.name))} is a ${target}, shaped like ${LIKE[target]}.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'solid', want: target, set: things.map((each) => each.name).sort(), options: things.map((each) => each.name) },
    prompt: { text: prompt, speak: [prompt] },
    ...(level === 1 ? { stimulus: solid(target) } : {}),
    options: things.map(picture),
    answerIndex: things.indexOf(answer),
    explanation: { speak: [said], steps: [said], visual: { kind: 'row', children: [picture(answer), solid(target)] }, hint: SOLID_HINT },
  };
}

export const ballBoxCanGenerator: SkillGenerator = skill({
  skillId: 'M-PK-C8',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h2-world'],
  pool: { 3: 7 },
  generate: ballBoxCan,
  exampleSeed: 924,
  lesson: { see: 'Some things are round like a ball, some are like a box, and some are like a can.', remember: 'A ball rolls. A box has flat sides. A can has round ends.', tryLevel: 2 },
  oracle: 'h2World',
});

// ---- C.9 Order by size ----
// Levels: three sizes, smallest first / biggest first / three bars, shortest or tallest first. Oracle: h2OrderBy.

const FORMS: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];

function orderSize(level: Level, rng: Rng): QuestionDraft {
  const color = rng.pick(COLOR_NAMES);
  const dir = level === 1 ? 'up' : level === 2 ? 'down' : rng.pick(['up', 'down'] as const);
  let values: number[];
  do values = level === 3 ? rng.sample([1, 3, 5, 7], 3) : rng.shuffle([1, 2, 3]);
  while (values.every((value, i) => i === 0 || (dir === 'up' ? value > (values[i - 1] as number) : value < (values[i - 1] as number))));
  const form = rng.pick(FORMS);
  const item = (value: number): Visual => (level === 3 ? { kind: 'bar', length: value, color, orientation: 'vertical' } : shape(form, color, (['s', 'm', 'l'] as const)[value - 1]));
  const words = level === 3 ? (dir === 'up' ? ['shortest', 'tallest'] : ['tallest', 'shortest']) : dir === 'up' ? ['smallest', 'biggest'] : ['biggest', 'smallest'];
  // An order is answered by tapping, first to last. The prompt says so.
  const prompt = `Tap them from ${words[0]} to ${words[1]}.`;
  const sorted = [...values].sort((x, y) => (dir === 'up' ? x - y : y - x));
  const said = `First the ${words[0]}, then the middle one, then the ${words[1]}.`;
  return {
    type: 'order',
    mode: 'look',
    facts: { values, dir, ...(level === 3 ? {} : { shape: form }), color },
    prompt: { text: prompt, speak: [prompt] },
    items: values.map(item),
    answerOrder: sorted.map((value) => values.indexOf(value)),
    explanation: { speak: [said], steps: [said], visual: { kind: 'row', children: sorted.map(item) }, hint: { text: `Find the ${words[0]} one first. Then the next one.` } },
  };
}

export const orderSizeGenerator: SkillGenerator = skill({
  skillId: 'M-PK-C9',
  maxLevel: 3,
  itemTypes: ['order'],
  lists: ['colors'],
  generate: orderSize,
  exampleSeed: 925,
  lesson: { see: 'We can put things in order by size.', remember: 'Find the smallest one first, then the next one.' },
  oracle: 'h2OrderBy',
});
