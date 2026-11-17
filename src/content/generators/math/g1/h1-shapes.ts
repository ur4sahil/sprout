import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, ShapeName, SolidName, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { shape } from '../pk/parts';
import type { Explanation } from '../k/h1-parts';
import { h1Skill, lessonOf, picture, shuffled, spoken } from '../k/h1-parts';

// Math grade 1, plan section 15 wave H1: D.4 faces of solid shapes, D.5 halves are bigger than fourths.

// ---- D.4 Faces of solid shapes ----
// Levels: what shape is a flat face / which solid has no faces, square faces, one face or two faces /
// how many flat faces, typed. Oracle: h1Solids.

const SOLIDS: SolidName[] = ['cube', 'sphere', 'cone', 'cylinder'];
const FACES: Record<SolidName, number> = { cube: 6, sphere: 0, cone: 1, cylinder: 2 };
const FACE: Record<SolidName, ShapeName | null> = { cube: 'square', sphere: null, cone: 'circle', cylinder: 'circle' };
const solid = (name: SolidName, speak = true): Visual => (speak ? { kind: 'solid', solid: name, speak: [name] } : { kind: 'solid', solid: name });

function faceExplanation(name: SolidName): Explanation {
  const face = FACE[name];
  const line = face === null ? 'A sphere is round all over. It has no flat faces.' : `A ${name} has ${FACES[name]} flat ${FACES[name] === 1 ? 'face' : 'faces'}. ${FACES[name] === 1 ? 'It is a' : 'Each is a'} ${face}.`;
  return { speak: spoken(line), steps: [line], visual: face === null ? solid(name, false) : { kind: 'row', children: [solid(name, false), shape(face, 'blue', 'm')] } };
}

const WANTS = {
  none: { solid: 'sphere', prompt: 'Which shape has no flat faces?' },
  square: { solid: 'cube', prompt: 'Which shape has square faces?' },
  one: { solid: 'cone', prompt: 'Which shape has just one flat face?' },
  two: { solid: 'cylinder', prompt: 'Which shape has two flat faces?' },
} as const;

function faces(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    const want = rng.pick(Object.keys(WANTS) as (keyof typeof WANTS)[]);
    const right = WANTS[want].solid as SolidName;
    const { items, answerIndex } = shuffled(right, SOLIDS.filter((each) => each !== right), rng);
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'which', want, options: items },
      prompt: { text: WANTS[want].prompt, speak: [WANTS[want].prompt] },
      options: items.map((each) => solid(each)),
      answerIndex,
      explanation: faceExplanation(right),
    };
  }
  if (level === 3) {
    const name = rng.pick(SOLIDS);
    const prompt = `How many flat faces does a ${name} have?`;
    return { type: 'numberPad', mode: 'look', facts: { ask: 'faces', solid: name }, prompt: { text: prompt, speak: [prompt] }, stimulus: solid(name), answer: FACES[name], maxDigits: 1, explanation: faceExplanation(name) };
  }
  const name = rng.pick(['cube', 'cone', 'cylinder'] as SolidName[]);
  const forms = rng.shuffle(['circle', 'square', 'triangle'] as ShapeName[]);
  const prompt = `What shape is a flat face of a ${name}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { ask: 'faceShape', solid: name, options: forms },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: solid(name),
    options: forms.map((form): Visual => ({ ...shape(form, 'blue', 'm'), speak: [form] }) as Visual),
    answerIndex: forms.indexOf(FACE[name] as ShapeName),
    explanation: faceExplanation(name),
  };
}

export const facesGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-D4',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'h1Solids',
  exampleSeed: 951,
  pool: { 1: 3, 2: 4, 3: 4 },
  generate: faces,
  lesson: (make) => lessonOf('A face is a flat side of a solid shape. A cube has 6 square faces.', { kind: 'row', children: [solid('cube', false), shape('square', 'blue', 'm')] }, make(1, 951), make(2, 952), 'Flat sides are faces. Curved sides are not.'),
});

// ---- D.5 Halves are bigger than fourths ----
// Two shapes the same size, one cut in halves and one in fourths, one part shaded. Levels: which part is
// bigger / bigger or smaller / in words: one half or one fourth of the same pie. Oracle: h1ShareSize.

const FOODS = [
  { emoji: '🍕', name: 'pizza' },
  { emoji: '🥧', name: 'pie' },
  { emoji: '🍰', name: 'cake' },
  { emoji: '🍪', name: 'cookie' },
] as const;

const cut = (form: 'circle' | 'rectangle', parts: number): Visual => ({ kind: 'fraction', shape: form, parts, shaded: 1, equal: true });

function shareExplanation(form: 'circle' | 'rectangle'): Explanation {
  const lines = ['Halves are 2 equal parts. Fourths are 4 equal parts.', 'Cut into more parts, each part is smaller.', 'One half is bigger than one fourth.'];
  return { speak: lines.flatMap(spoken), steps: lines, visual: { kind: 'row', children: [cut(form, 2), cut(form, 4)] } };
}

function shareSize(level: Level, rng: Rng): QuestionDraft {
  const ask = level === 1 ? 'bigger' : rng.pick(['bigger', 'smaller'] as const);
  if (level === 3) {
    const food = rng.pick(FOODS);
    const prompt = `Which is ${ask}: one half or one fourth of the same ${food.name}?`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { parts: [2, 4], ask, food: food.name, options: ['one half', 'one fourth'] },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: picture(food.emoji, food.name),
      options: ['one half', 'one fourth'].map((words): Visual => ({ kind: 'text', value: words, size: 'l', speak: [words] })),
      answerIndex: ask === 'bigger' ? 0 : 1,
      explanation: shareExplanation('circle'),
    };
  }
  const form = rng.pick(['circle', 'rectangle'] as const);
  const parts = rng.shuffle([2, 4]);
  const prompt = `The two shapes are the same size. Which shaded part is ${ask}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { parts, ask, shape: form, options: parts },
    prompt: { text: prompt, speak: [prompt] },
    options: parts.map((count) => cut(form, count)),
    answerIndex: parts.indexOf(ask === 'bigger' ? 2 : 4),
    explanation: shareExplanation(form),
  };
}

export const shareSizeGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-D5',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1ShareSize',
  exampleSeed: 953,
  pool: { 1: 4 },
  generate: shareSize,
  lesson: (make) => lessonOf('Share a pizza with 2 people and each gets a half. Share it with 4 and each gets a fourth.', { kind: 'row', children: [cut('circle', 2), cut('circle', 4)] }, make(1, 953), make(2, 954), 'More parts means smaller parts.'),
});
