import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, SolidName, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { skill } from '../pk/h2-lesson';

// Math grade 2, wave H2 (plan section 15): D.4 faces, edges and corners of solid shapes.
// Levels: how many flat faces / which solid has that many flat faces / corners and edges. Oracle: h2Solid.
// Only the facts every school agrees on are asked: a cone's point and a cylinder's rims are never counted.

const SOLIDS: SolidName[] = ['cube', 'sphere', 'cylinder', 'cone'];
const FACES: Record<SolidName, number> = { cube: 6, cylinder: 2, cone: 1, sphere: 0 };
const ABOUT: Record<SolidName, string> = {
  cube: 'A cube has 6 flat square faces, 12 edges and 8 corners.',
  sphere: 'A sphere is round all over. It has no flat faces, no edges and no corners.',
  cylinder: 'A cylinder has 2 flat round faces, one at each end, and no corners.',
  cone: 'A cone has 1 flat round face, its base, and a point at the top.',
};
const ABOUT_SAID: Record<SolidName, string> = {
  cube: 'A cube has six flat square faces, twelve edges and eight corners.',
  sphere: ABOUT.sphere,
  cylinder: 'A cylinder has two flat round faces, one at each end, and no corners.',
  cone: 'A cone has one flat round face, its base, and a point at the top.',
};
// How to count, never how many.
const HINT: Record<'faces' | 'corners' | 'edges', string> = { faces: 'Count only the flat faces. A curved side is not flat.', corners: 'Touch each corner once as you count.', edges: 'Touch each edge once as you count.' };
const solid = (name: SolidName, speak = true): Visual => (speak ? { kind: 'solid', solid: name, speak: [name] } : { kind: 'solid', solid: name });
// The corners and edges that are agreed: a cube's, and none on a sphere or a cylinder.
const ASKS: { solid: SolidName; ask: 'corners' | 'edges'; answer: number }[] = [
  { solid: 'cube', ask: 'corners', answer: 8 },
  { solid: 'cube', ask: 'edges', answer: 12 },
  { solid: 'sphere', ask: 'corners', answer: 0 },
  { solid: 'sphere', ask: 'edges', answer: 0 },
  { solid: 'cylinder', ask: 'corners', answer: 0 },
];

function solidParts(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    const offered = rng.shuffle(rng.sample(SOLIDS, 3));
    const target = rng.pick(offered);
    const want = FACES[target];
    const text = `Which shape has ${want === 0 ? 'no' : want} flat ${want === 1 ? 'face' : 'faces'}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { solid: target, ask: 'which', want, set: [...offered].sort(), options: offered },
      prompt: { text, speak: want === 0 ? [text] : ['Which shape has', { number: want }, `flat ${want === 1 ? 'face' : 'faces'}?`] },
      options: offered.map((name) => solid(name)),
      answerIndex: offered.indexOf(target),
      explanation: { speak: [ABOUT_SAID[target]], steps: [ABOUT[target]], visual: solid(target), hint: { text: 'Look at each shape. Which faces are flat?' } },
    };
  }
  const { solid: name, ask, answer } = level === 1 ? (() => {
    const each = rng.pick(SOLIDS);
    return { solid: each, ask: 'faces' as const, answer: FACES[each] };
  })() : rng.pick(ASKS);
  const noun = ask === 'faces' ? 'flat faces' : ask === 'corners' ? 'corners (vertices)' : 'edges';
  const text = `How many ${noun} does this shape have?`;
  // Shuffled: an answer of 0 would always sit first in counting order.
  const values = rng.shuffle(numeralChoices(answer, [answer + 2, answer - 2, answer + 4, answer - 4], 0, 14, rng));
  return {
    type: 'choice',
    mode: 'look',
    facts: { solid: name, ask, options: values },
    prompt: { text, speak: [`How many ${ask === 'faces' ? 'flat faces' : ask} does this shape have?`] },
    stimulus: solid(name, false),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(answer),
    explanation: { speak: [ABOUT_SAID[name]], steps: [ABOUT[name]], visual: solid(name), hint: { text: HINT[ask] } },
  };
}

export const solidPartsGenerator: SkillGenerator = skill({
  skillId: 'M-2-D4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 4, 3: 5 },
  generate: solidParts,
  exampleSeed: 981,
  lesson: { see: 'A solid shape has flat faces, edges where two faces meet, and corners where edges meet.', remember: 'Touch each face once as you count.', tryLevel: 2 },
  oracle: 'h2Solid',
});
