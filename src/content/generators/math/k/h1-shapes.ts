import type { Rng } from '../../../../engine/rng';
import type { Hint, Level, QuestionDraft, Say, ShapeName, SolidName, Visual } from '../../../../engine/types';
import type { Shaped } from '../../../data/h1-things';
import { FLAT_THINGS, SOLID_THINGS } from '../../../data/h1-things';
import type { SkillGenerator } from '../../../generator';
import { shape } from '../pk/parts';
import { YES_NO, a, h1Skill, lessonOf, picture, shuffled, yesNoOptions } from './h1-parts';

// An explanation with the hint and spoken steps the generator gives (h1-parts' type has neither).
type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint; stepsSay?: (Say | null)[] };

// Math kindergarten, plan section 15 wave H1: E.6 shapes all around us, E.7 roll and stack.

const isSolid = (name: string): name is SolidName => ['cube', 'sphere', 'cone', 'cylinder'].includes(name);
const drawn = (name: Shaped['shape'] | SolidName, speak = true): Visual => {
  const visual: Visual = isSolid(name) ? { kind: 'solid', solid: name } : shape(name as ShapeName, 'blue', 'm');
  return speak ? { ...visual, speak: [name] } : visual;
};

// ---- E.6 Shapes all around us ----
// Levels: which thing is shaped like a circle, triangle or rectangle / what shape is this thing /
// which thing is shaped like a sphere, cylinder or cube. Oracle: h1ObjectShape.

function shapedExplanation(thing: Shaped, hint: string): Explanation {
  const line = `${a(thing.name).replace(/^a/, 'A')} is shaped like ${a(thing.shape)}.`;
  return { speak: [line], steps: [line], visual: { kind: 'row', children: [picture(thing.emoji), drawn(thing.shape, false)] }, hint: { text: hint } };
}

// One thing for each shape, so only one is right.
function oneOfEach(things: readonly Shaped[], rng: Rng): Shaped[] {
  const shapes = [...new Set(things.map((thing) => thing.shape))];
  return shapes.map((each) => rng.pick(things.filter((thing) => thing.shape === each)));
}

function shapesAround(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    const thing = rng.pick(FLAT_THINGS);
    const forms = rng.shuffle(['circle', 'triangle', 'rectangle'] as const);
    const prompt = `What shape is the ${thing.name}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'shape', object: thing.name, options: [...forms] },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: picture(thing.emoji, thing.name),
      options: forms.map((form) => drawn(form)),
      answerIndex: forms.indexOf(thing.shape as (typeof forms)[number]),
      explanation: shapedExplanation(thing, `Look at the outline of the ${thing.name}.`),
    };
  }
  const pool = level === 1 ? FLAT_THINGS : SOLID_THINGS;
  const picked = oneOfEach(pool, rng);
  const target = rng.pick(picked);
  const { items, answerIndex } = shuffled(target, picked.filter((thing) => thing !== target), rng);
  const prompt = `Which one is shaped like ${a(target.shape)}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'object', target: target.shape, things: picked.map((thing) => thing.name), options: items.map((thing) => thing.name) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: drawn(target.shape),
    options: items.map((thing) => picture(thing.emoji, thing.name)),
    answerIndex,
    explanation: shapedExplanation(target, 'Look at the outline of each thing.'),
  };
}

export const shapesAroundGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-E6',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1ObjectShape',
  exampleSeed: 851,
  lists: ['h1-things'],
  pool: { 2: 6 },
  generate: shapesAround,
  lesson: (make) => lessonOf('Things all around us have shapes. A clock is round like a circle.', { kind: 'row', children: [picture('🕐'), drawn('circle', false)] }, make(1, 851), make(3, 852), 'Look at the outline of a thing to find its shape.'),
});

// ---- E.7 Roll and stack ----
// Levels: can it roll / can it stack / which one can roll and stack, only stack, or only roll.
// Oracle: h1Solids.

const ROLLS: Record<SolidName, boolean> = { sphere: true, cylinder: true, cone: true, cube: false };
const STACKS: Record<SolidName, boolean> = { sphere: false, cylinder: true, cone: false, cube: true };
const SOLIDS: SolidName[] = ['cube', 'sphere', 'cone', 'cylinder'];

// Stacking is said as what it means, so a cone, whose flat base can sit on a block, is never a second right answer:
// can another shape sit on top of it? (the wording audit, Nov 21, 2026)
const ROLL_LINE: Record<SolidName, string> = {
  sphere: 'It is round all over, so it can roll.',
  cylinder: 'It has a curved side, so it can roll.',
  cone: 'It has a curved side, so it can roll.',
  cube: 'It has only flat faces, so it cannot roll.',
};
const STACK_LINE: Record<SolidName, string> = {
  sphere: 'It has no flat top, so another shape would roll off it.',
  cylinder: 'It has a flat top, so another shape can sit on it.',
  cone: 'Its top is a point, so another shape cannot sit on it.',
  cube: 'It has a flat top, so another shape can sit on it.',
};

function moveExplanation(solid: SolidName): Explanation {
  const steps = [`This is a ${solid}.`, ROLL_LINE[solid], STACK_LINE[solid]];
  return { speak: [steps.join(' ')], steps, visual: drawn(solid, false), hint: { text: 'Look for flat parts and curved parts.' } };
}

function rollAndStack(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const want = rng.pick(['both', 'stackOnly', 'rollOnly'] as const);
    const right: SolidName = want === 'both' ? 'cylinder' : want === 'stackOnly' ? 'cube' : rng.pick(['sphere', 'cone'] as const);
    // Never offer the other "roll only" shape beside the right one.
    const others = SOLIDS.filter((solid) => solid !== right && !(want === 'rollOnly' && (solid === 'sphere' || solid === 'cone')));
    const { items, answerIndex } = shuffled(right, rng.sample(others, 2), rng);
    const prompt = want === 'both' ? 'Which shape can roll, and can hold another shape on top?' : want === 'stackOnly' ? 'Which shape can hold another shape on top, but cannot roll?' : 'Which shape can roll, but cannot hold another shape on top?';
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'which', want, options: items },
      prompt: { text: prompt, speak: [prompt] },
      options: items.map((solid) => drawn(solid)),
      answerIndex,
      explanation: moveExplanation(right),
    };
  }
  const solid = rng.pick(SOLIDS);
  const ask = level === 1 ? 'roll' : 'stack';
  const yes = level === 1 ? ROLLS[solid] : STACKS[solid];
  const prompt = level === 1 ? 'Can this shape roll?' : 'Can this shape hold another shape on top?';
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { ask, solid, options: YES_NO },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: drawn(solid),
    options: yesNoOptions(),
    answerIndex: yes ? 0 : 1,
    explanation: moveExplanation(solid),
  };
}

export const rollAndStackGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-E7',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1Solids',
  exampleSeed: 853,
  pool: { 1: 4, 2: 4, 3: 3 },
  generate: rollAndStack,
  lesson: (make) => lessonOf('A curved side lets a shape roll. Flat faces let shapes stack.', { kind: 'row', children: [drawn('sphere', false), drawn('cube', false)] }, make(1, 853), make(2, 854), 'Curved sides roll. Flat faces stack.'),
});
