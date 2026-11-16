import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { SkillGenerator } from '../../../generator';
import { SHAPE_FACT, SHAPE_FACT_TEXT, a, shape } from './parts';

// Math pre-K C.1, Find the shape. Family: Find the shape.
// Levels: circle, square, triangle / adds rectangle, star, heart / mixed sizes and turns.
// Every option has the same colour, so only the shape tells them apart.

const FIRST: ShapeName[] = ['circle', 'square', 'triangle'];
const ALL: ShapeName[] = [...FIRST, 'rectangle', 'star', 'heart'];
const SIZES = ['s', 'm', 'l'] as const;
const TURNS = [0, 15, 30, 330, 345]; // small turns: a square never stands on its corner

function explain(target: ShapeName, color: ColorName): { speak: Say; steps: string[]; visual: Visual } {
  return {
    speak: [`This is ${a(target)}.`, SHAPE_FACT[target] ?? ''],
    steps: [`This is ${a(target)}.`, SHAPE_FACT_TEXT[target] ?? ''],
    visual: shape(target, color),
  };
}

function build(target: ShapeName, options: Visual[], names: ShapeName[], color: ColorName, extra: QuestionDraft['facts']): QuestionDraft {
  const prompt = `Find the ${target}.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { target, optionAttrs: names, color, options: names, ...extra },
    prompt: { text: prompt, speak: [prompt] },
    options,
    answerIndex: names.indexOf(target),
    explanation: explain(target, color),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const names = rng.sample(level === 1 ? FIRST : ALL, 3);
  const color = rng.pick(COLOR_NAMES);
  const target = rng.pick(names);
  if (level < 3) return build(target, names.map((name) => shape(name, color)), names, color, {});
  const sizes = names.map(() => rng.pick(SIZES));
  const turns = names.map(() => rng.pick(TURNS));
  return build(target, names.map((name, i) => shape(name, color, sizes[i], turns[i])), names, color, { sizes: [...sizes], turns });
}

function lesson(): LessonStep[] {
  const row = (names: ShapeName[]): Visual => ({ kind: 'row', children: names.map((name) => shape(name, 'blue')) });
  return [
    { beat: 'see', text: 'Shapes have names. This is a circle.', speak: ['Shapes have names. This is a circle.'], visual: shape('circle', 'blue') },
    {
      beat: 'watch',
      text: 'Find the triangle. This is a triangle. A triangle has 3 sides.',
      speak: ['Find the triangle.', ...explain('triangle', 'blue').speak],
      visual: row(['square', 'triangle']),
    },
    {
      beat: 'try',
      text: 'Find the square.',
      speak: ['Find the square.'],
      visual: row(['circle', 'square', 'triangle']),
      reveal: { text: 'This is a square. A square has 4 equal sides.', speak: explain('square', 'blue').speak, visual: shape('square', 'blue') },
    },
    { beat: 'remember', text: 'Count the sides and corners.', speak: ['Count the sides and corners.'], visual: row(['triangle', 'square']) },
  ];
}

const EXAMPLE_SEED = 12;

export const generator: SkillGenerator = {
  skillId: 'M-PK-C1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'attribute',
};
