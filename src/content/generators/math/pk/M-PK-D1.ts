import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { SkillGenerator } from '../../../generator';
import { a, shape, twoClearColors } from './parts';

// Math pre-K D.1, Which one is different. Family: Different one.
// Levels: two alike and one different by colour / by shape / by size.

const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];
const SIZE_WORD = { s: 'small', l: 'big' } as const;

// The steps say what two of them share and what the odd one is, never "these two": after a miss only the child's
// pick and the right answer are on screen (the wording audit, Nov 21, 2026).
function explain(same: string, different: string, odd: Visual): { speak: Say; steps: string[]; visual: Visual; hint: Hint } {
  const steps = [`Two of them are ${same}.`, `One is ${different}. It is different.`];
  return { speak: [steps.join(' ')], steps, visual: odd, hint: { text: 'Look for the one that does not match the others.' } };
}

// `attrs` has the odd one's attribute at `oddAt` and the shared attribute everywhere else.
function build(by: string, attrs: string[], oddAt: number, options: Visual[], same: string, different: string, extra: QuestionDraft['facts']): QuestionDraft {
  const prompt = 'Which one is different?';
  return {
    type: 'choice',
    mode: 'look',
    twins: true,
    facts: { optionAttrs: attrs, by, options: attrs, ...extra },
    prompt: { text: prompt, speak: [prompt] },
    options,
    answerIndex: oddAt,
    explanation: explain(same, different, options[oddAt] as Visual),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const oddAt = rng.int(0, 2);
  const place = <T,>(same: T, odd: T): T[] => [0, 1, 2].map((i) => (i === oddAt ? odd : same));
  if (level === 1) {
    const form = rng.pick(SHAPES);
    const [same, odd] = twoClearColors(rng);
    const attrs = place(same, odd);
    return build('colour', attrs, oddAt, attrs.map((color) => shape(form, color)), same, odd, { shape: form });
  }
  if (level === 2) {
    const color = rng.pick(COLOR_NAMES);
    const [same, odd] = rng.sample(SHAPES, 2) as [ShapeName, ShapeName];
    const attrs = place(same, odd);
    return build('shape', attrs, oddAt, attrs.map((form) => shape(form, color)), `${same}s`, a(odd), { color });
  }
  const form = rng.pick(SHAPES);
  const color = rng.pick(COLOR_NAMES);
  const [same, odd] = rng.shuffle(['s', 'l'] as const) as ['s' | 'l', 's' | 'l'];
  const attrs = place(same, odd);
  return build('size', attrs.map((size) => SIZE_WORD[size]), oddAt, attrs.map((size) => shape(form, color, size)), SIZE_WORD[same], SIZE_WORD[odd], { shape: form, color });
}

function lesson(): LessonStep[] {
  const three = (colors: ColorName[]): Visual => ({ kind: 'row', children: colors.map((color) => shape('circle', color)) });
  return [
    { beat: 'see', text: 'Some things match. One of these does not.', speak: ['Some things match. One of these does not.'], visual: three(['red', 'red', 'blue']) },
    {
      beat: 'watch',
      text: explain('red', 'blue', shape('circle', 'blue')).steps.join(' '),
      speak: explain('red', 'blue', shape('circle', 'blue')).speak,
      visual: three(['red', 'red', 'blue']),
    },
    {
      beat: 'try',
      text: 'Which one is different?',
      speak: ['Which one is different?'],
      visual: three(['green', 'yellow', 'green']),
      reveal: { text: explain('green', 'yellow', shape('circle', 'yellow')).steps.join(' '), speak: explain('green', 'yellow', shape('circle', 'yellow')).speak, visual: shape('circle', 'yellow') },
    },
    { beat: 'remember', text: 'Look for what does not match.', speak: ['Look for what does not match.'], visual: three(['green', 'yellow', 'green']) },
  ];
}

const EXAMPLE_SEED = 16;

export const generator: SkillGenerator = {
  skillId: 'M-PK-D1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors'],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'oddOne',
};
