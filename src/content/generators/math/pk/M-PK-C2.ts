import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import type { SkillGenerator } from '../../../generator';
import { shape } from './parts';

// Math pre-K C.2, Find the colour. Family: Find the colour.
// Levels: red, blue, yellow / adds green, orange, purple / adds pink, brown, black.
// Every option is the same shape, so only the colour tells them apart.

const FIRST: ColorName[] = ['red', 'blue', 'yellow'];
const SECOND: ColorName[] = [...FIRST, 'green', 'orange', 'purple'];
const THIRD: ColorName[] = [...SECOND, 'pink', 'brown', 'black'];
const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];

function explain(target: ColorName, form: ShapeName): { speak: Say; steps: string[]; visual: Visual } {
  return { speak: [`This one is ${target}.`], steps: [`This one is ${target}.`], visual: shape(form, target) };
}

function build(target: ColorName, colors: ColorName[], form: ShapeName): QuestionDraft {
  const prompt = `Find the ${target} one.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { target, optionAttrs: colors, shape: form, options: colors },
    prompt: { text: prompt, speak: [prompt] },
    options: colors.map((color) => shape(form, color)),
    answerIndex: colors.indexOf(target),
    explanation: explain(target, form),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const colors = rng.sample(level === 1 ? FIRST : level === 2 ? SECOND : THIRD, 3);
  return build(rng.pick(colors), colors, rng.pick(SHAPES));
}

function lesson(): LessonStep[] {
  const row = (colors: ColorName[]): Visual => ({ kind: 'row', children: colors.map((color) => shape('circle', color)) });
  return [
    { beat: 'see', text: 'Colours have names. This one is red.', speak: ['Colours have names. This one is red.'], visual: shape('circle', 'red') },
    { beat: 'watch', text: 'Find the blue one. This one is blue.', speak: ['Find the blue one.', ...explain('blue', 'circle').speak], visual: row(['red', 'blue']) },
    {
      beat: 'try',
      text: 'Find the yellow one.',
      speak: ['Find the yellow one.'],
      visual: row(['blue', 'yellow', 'red']),
      reveal: { text: 'This one is yellow.', speak: explain('yellow', 'circle').speak, visual: shape('circle', 'yellow') },
    },
    { beat: 'remember', text: 'Colours have names.', speak: ['Colours have names.'], visual: row(['red', 'blue', 'yellow']) },
  ];
}

const EXAMPLE_SEED = 14;

export const generator: SkillGenerator = {
  skillId: 'M-PK-C2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'attribute',
};
