import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, SolidName, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { a, nearbyNumbers, shape } from '../pk/parts';

// Math K E.1 to E.3. Families: Find the shape, Solid shapes, Sides and corners.

const FACT: Record<string, { say: string; text: string }> = {
  circle: { say: 'A circle is round with no corners.', text: 'A circle is round with no corners.' },
  square: { say: 'A square has four equal sides.', text: 'A square has 4 equal sides.' },
  triangle: { say: 'A triangle has three sides.', text: 'A triangle has 3 sides.' },
  rectangle: { say: 'A rectangle has two long sides and two short sides.', text: 'A rectangle has 2 long sides and 2 short sides.' },
  hexagon: { say: 'A hexagon has six sides.', text: 'A hexagon has 6 sides.' },
  oval: { say: 'An oval is a stretched circle.', text: 'An oval is a stretched circle.' },
  diamond: { say: 'A diamond has four sides, with a point at the top and at the bottom.', text: 'A diamond has 4 sides, with a point at the top and at the bottom.' },
  cube: { say: 'A cube has six square faces.', text: 'A cube has 6 square faces.' },
  sphere: { say: 'A sphere is round like a ball.', text: 'A sphere is round like a ball.' },
  cone: { say: 'A cone has a point and a round base.', text: 'A cone has a point and a round base.' },
  cylinder: { say: 'A cylinder has two round ends.', text: 'A cylinder has 2 round ends.' },
};

function nameExplanation(name: string, picture: Visual): { speak: Say; steps: string[]; visual: Visual } {
  const fact = FACT[name] as { say: string; text: string };
  return { speak: [`This is ${a(name)}.`, fact.say], steps: [`This is ${a(name)}.`, fact.text], visual: picture };
}

// ---- E.1 Name flat shapes ----
// A listening skill: hear the name, tap the shape. The screen never shows the name.
// Levels: circle, square, triangle / adds hexagon, oval, diamond / turned shapes.
const BASIC: ShapeName[] = ['circle', 'square', 'triangle'];
const MORE: ShapeName[] = [...BASIC, 'hexagon', 'oval', 'diamond'];
// Turned: no diamond, because a turned diamond and a turned square are the same picture. No circle: a turn does not show.
const TURNED: ShapeName[] = ['square', 'triangle', 'rectangle', 'hexagon', 'oval'];
const TURNS = [15, 30, 330, 345];

function nameFlat(level: Level, rng: Rng): QuestionDraft {
  const names = rng.sample(level === 1 ? BASIC : level === 2 ? MORE : TURNED, 3);
  const color = rng.pick(COLOR_NAMES);
  const target = rng.pick(names);
  const turns = level === 3 ? names.map(() => rng.pick(TURNS)) : names.map(() => 0);
  const facts: QuestionDraft['facts'] = { target, optionAttrs: names, color, options: names };
  if (level === 3) facts.turns = turns;
  return {
    type: 'choice',
    mode: 'listen',
    facts,
    prompt: { text: 'Find the shape.', speak: [`Find the ${target}.`] },
    options: names.map((name, i) => shape(name, color, 'm', turns[i])),
    answerIndex: names.indexOf(target),
    explanation: nameExplanation(target, shape(target, color)),
  };
}

export const nameFlatGenerator: SkillGenerator = {
  skillId: 'M-K-E1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate: nameFlat,
  exampleSeed: 41,
  example: () => nameFlat(1, makeRng(41)),
  lesson: (): LessonStep[] => {
    const row = (names: ShapeName[]): Visual => ({ kind: 'row', children: names.map((name) => shape(name, 'green')) });
    return [
      { beat: 'see', text: 'Flat shapes have names. This is a hexagon.', speak: ['Flat shapes have names. This is a hexagon.'], visual: shape('hexagon', 'green') },
      { beat: 'watch', text: 'Find the oval. This is an oval. An oval is a stretched circle.', speak: ['Find the oval.', ...nameExplanation('oval', shape('oval', 'green')).speak], visual: row(['circle', 'oval']) },
      {
        beat: 'try',
        text: 'Find the triangle.',
        speak: ['Find the triangle.'],
        visual: row(['square', 'triangle', 'hexagon']),
        reveal: { text: 'This is a triangle. A triangle has 3 sides.', speak: nameExplanation('triangle', shape('triangle', 'green')).speak, visual: shape('triangle', 'green') },
      },
      { beat: 'remember', text: 'Count the sides and corners.', speak: ['Count the sides and corners.'], visual: row(['triangle', 'square', 'hexagon']) },
    ];
  },
  oracle: 'attribute',
};

// ---- E.2 Name solid shapes ----
// Levels: cube and sphere / adds cone and cylinder / flat or solid.
const SOLIDS: SolidName[] = ['cube', 'sphere', 'cone', 'cylinder'];
const FLAT_FOR_SOLID: ShapeName[] = ['circle', 'square', 'triangle', 'rectangle'];
const solid = (name: SolidName): Visual => ({ kind: 'solid', solid: name });

function nameSolid(level: Level, rng: Rng): QuestionDraft {
  if (level < 3) {
    const names = level === 1 ? rng.shuffle(['cube', 'sphere'] as SolidName[]) : rng.sample(SOLIDS, 3);
    const target = rng.pick(names);
    const prompt = `Find the ${target}.`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { target, optionAttrs: names, options: names },
      prompt: { text: prompt, speak: [prompt] },
      options: names.map((name) => solid(name)),
      answerIndex: names.indexOf(target),
      explanation: nameExplanation(target, solid(target)),
    };
  }
  // Two of one kind and one of the other. The child finds the one that is solid, or the one that is flat.
  const target = rng.pick(['solid', 'flat'] as const);
  const color = rng.pick(COLOR_NAMES);
  const flats = rng.sample(FLAT_FOR_SOLID, 2);
  const solids = rng.sample(SOLIDS, 2);
  const pictures: { kind: 'solid' | 'flat'; name: string; picture: Visual }[] =
    target === 'solid'
      ? [{ kind: 'solid', name: solids[0] as string, picture: solid(solids[0] as SolidName) }, ...flats.map((name) => ({ kind: 'flat' as const, name, picture: shape(name, color) }))]
      : [{ kind: 'flat', name: flats[0] as string, picture: shape(flats[0] as ShapeName, color) }, ...solids.map((name) => ({ kind: 'solid' as const, name, picture: solid(name) }))];
  const shown = rng.shuffle(pictures);
  const answerIndex = shown.findIndex((item) => item.kind === target);
  const answer = shown[answerIndex] as (typeof shown)[number];
  const prompt = target === 'solid' ? 'Which one is a solid shape?' : 'Which one is a flat shape?';
  const line = target === 'solid' ? `${a(answer.name)} is a solid shape. It is not flat.` : `${a(answer.name)} is a flat shape.`;
  const said = line.charAt(0).toUpperCase() + line.slice(1);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target, optionAttrs: shown.map((item) => item.kind), names: shown.map((item) => item.name), color, options: shown.map((item) => item.kind) },
    prompt: { text: prompt, speak: [prompt] },
    options: shown.map((item) => item.picture),
    answerIndex,
    explanation: { speak: [said], steps: [said], visual: answer.picture },
  };
}

export const nameSolidGenerator: SkillGenerator = {
  skillId: 'M-K-E2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  pool: { 1: 4 }, // cube or sphere, in either order
  generate: nameSolid,
  exampleSeed: 42,
  example: () => nameSolid(1, makeRng(42)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Solid shapes are not flat. This is a cube.', speak: ['Solid shapes are not flat. This is a cube.'], visual: solid('cube') },
    { beat: 'watch', text: 'Find the sphere. This is a sphere. A sphere is round like a ball.', speak: ['Find the sphere.', ...nameExplanation('sphere', solid('sphere')).speak], visual: { kind: 'row', children: [solid('cube'), solid('sphere')] } },
    {
      beat: 'try',
      text: 'Find the cone.',
      speak: ['Find the cone.'],
      visual: { kind: 'row', children: [solid('cylinder'), solid('cone'), solid('cube')] },
      reveal: { text: 'This is a cone. A cone has a point and a round base.', speak: nameExplanation('cone', solid('cone')).speak, visual: solid('cone') },
    },
    { beat: 'remember', text: 'Solid shapes are not flat.', speak: ['Solid shapes are not flat.'], visual: { kind: 'row', children: [solid('cube'), solid('sphere'), solid('cone'), solid('cylinder')] } },
  ],
  oracle: 'attribute',
};

// ---- E.3 Sides and corners ----
// Levels: count the sides of a triangle or square / adds rectangle, hexagon / count corners, typed.
const SIDES: Partial<Record<ShapeName, number>> = { triangle: 3, square: 4, rectangle: 4, hexagon: 6 };

function sidesExplanation(name: ShapeName, color: ColorName, ask: 'sides' | 'corners'): { speak: Say; steps: string[]; visual: Visual } {
  const n = SIDES[name] as number;
  const one = ask === 'sides' ? 'side' : 'corner';
  return {
    speak: [`Count each ${one} once.`, { number: n }, '.'],
    steps: [`Count each ${one} once.`, `${a(name).charAt(0).toUpperCase()}${a(name).slice(1)} has ${n} ${ask}.`],
    visual: shape(name, color, 'l'),
  };
}

function sidesAndCorners(level: Level, rng: Rng): QuestionDraft {
  const name = rng.pick<ShapeName>(level === 1 ? ['triangle', 'square'] : ['triangle', 'square', 'rectangle', 'hexagon']);
  const color = rng.pick(COLOR_NAMES);
  const ask = level === 3 ? 'corners' : 'sides';
  const n = SIDES[name] as number;
  const prompt = `How many ${ask} does this shape have?`;
  const base = { mode: 'look' as const, prompt: { text: prompt, speak: [prompt] as Say }, stimulus: shape(name, color, 'l'), explanation: sidesExplanation(name, color, ask) };
  if (level === 3) return { ...base, type: 'numberPad', facts: { shape: name, ask, color }, answer: n, maxDigits: 1 };
  const values = nearbyNumbers(n, 2, 8, rng);
  return { ...base, type: 'choice', facts: { shape: name, ask, color, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(n) };
}

export const sidesAndCornersGenerator: SkillGenerator = {
  skillId: 'M-K-E3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['colors'],
  generate: sidesAndCorners,
  exampleSeed: 43,
  example: () => sidesAndCorners(1, makeRng(43)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Shapes have sides and corners.', speak: ['Shapes have sides and corners.'], visual: shape('square', 'blue', 'l') },
    { beat: 'watch', text: sidesExplanation('triangle', 'blue', 'sides').steps.join(' '), speak: sidesExplanation('triangle', 'blue', 'sides').speak, visual: shape('triangle', 'blue', 'l') },
    {
      beat: 'try',
      text: 'How many sides does this shape have?',
      speak: ['How many sides does this shape have?'],
      visual: shape('square', 'blue', 'l'),
      reveal: { text: sidesExplanation('square', 'blue', 'sides').steps.join(' '), speak: sidesExplanation('square', 'blue', 'sides').speak, visual: shape('square', 'blue', 'l') },
    },
    { beat: 'remember', text: 'Trace round the shape and count.', speak: ['Trace round the shape and count.'], visual: shape('hexagon', 'blue', 'l') },
  ],
  oracle: 'shapeFacts',
};
