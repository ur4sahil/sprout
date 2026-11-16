import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import { COLOR_NAMES } from '../../../data/colors';
import type { SkillGenerator } from '../../../generator';
import { shape } from './parts';

// Math pre-K C.3, Big and small. Family: Big and small.
// Levels: big or small, 2 options / biggest or smallest of 3 / tall, short or long, with bars.

type Ask = 'most' | 'least';
const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];
const SIZE = ['s', 'm', 'l'] as const; // sizes 1, 2 and 3

function explain(word: string, picture: Visual): { speak: Say; steps: string[]; visual: Visual } {
  return { speak: [`This one is ${word}.`], steps: [`This one is ${word}.`], visual: picture };
}

function build(word: string, ask: Ask, values: number[], options: Visual[], extra: QuestionDraft['facts']): QuestionDraft {
  const wanted = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const answerIndex = values.indexOf(wanted);
  const prompt = `Which one is ${word}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, word, options: values, ...extra },
    prompt: { text: prompt, speak: [prompt] },
    options,
    answerIndex,
    explanation: explain(word, options[answerIndex] as Visual),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const color = rng.pick(COLOR_NAMES);
  if (level === 1) {
    const form = rng.pick(SHAPES);
    const values = rng.shuffle([1, 3]);
    const ask = rng.pick<Ask>(['most', 'least']);
    return build(ask === 'most' ? 'big' : 'small', ask, values, values.map((v) => shape(form, color, SIZE[v - 1])), { shape: form, color });
  }
  if (level === 2) {
    const form = rng.pick(SHAPES);
    const values = rng.shuffle([1, 2, 3]);
    const ask = rng.pick<Ask>(['most', 'least']);
    return build(ask === 'most' ? 'the biggest' : 'the smallest', ask, values, values.map((v) => shape(form, color, SIZE[v - 1])), { shape: form, color });
  }
  // Two bars whose lengths are far apart. Standing up they are tall and short. Lying down, long and short.
  const word = rng.pick(['tall', 'short', 'long']);
  const orientation = word === 'tall' ? 'vertical' : word === 'long' ? 'horizontal' : rng.pick(['vertical', 'horizontal'] as const);
  const small = rng.int(1, 3);
  const values = rng.shuffle([small, small + rng.int(3, 5)]);
  const bars = values.map((length): Visual => ({ kind: 'bar', length, color, orientation }));
  return build(word, word === 'short' ? 'least' : 'most', values, bars, { color, orientation });
}

function lesson(): LessonStep[] {
  const pair: Visual = { kind: 'row', children: [shape('circle', 'green', 'l'), shape('circle', 'green', 's')] };
  return [
    { beat: 'see', text: 'Things can be big or small.', speak: ['Things can be big or small.'], visual: pair },
    { beat: 'watch', text: 'Which one is big? This one is big.', speak: ['Which one is big?', ...explain('big', pair).speak], visual: shape('circle', 'green', 'l') },
    {
      beat: 'try',
      text: 'Which one is small?',
      speak: ['Which one is small?'],
      visual: { kind: 'row', children: [shape('star', 'orange', 's'), shape('star', 'orange', 'l')] },
      reveal: { text: 'This one is small.', speak: explain('small', pair).speak, visual: shape('star', 'orange', 's') },
    },
    { beat: 'remember', text: 'Look at them side by side.', speak: ['Look at them side by side.'], visual: pair },
  ];
}

const EXAMPLE_SEED = 15;

export const generator: SkillGenerator = {
  skillId: 'M-PK-C3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'compare',
};
