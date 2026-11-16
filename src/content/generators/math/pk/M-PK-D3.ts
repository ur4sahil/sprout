import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, SortBin, Visual } from '../../../../engine/types';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { SkillGenerator } from '../../../generator';
import { cap, shape, twoClearColors } from './parts';

// Math pre-K D.3, Sort into two groups. Family: Sorting.
// Levels: 4 items by colour / 4 items by shape / 6 items by size.

const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];

function explain(groups: [string, string], sample: Visual): { speak: Say; steps: string[]; visual: Visual } {
  return {
    speak: [`These ones are ${groups[0]}. These ones are ${groups[1]}.`],
    steps: [`These ones are ${groups[0]}.`, `These ones are ${groups[1]}.`],
    visual: sample,
  };
}

function build(by: string, items: Visual[], attrs: string[], binAttrs: [string, string], bins: SortBin[], groups: [string, string]): QuestionDraft {
  const prompt = 'Put each one in its group.';
  return {
    type: 'sort',
    mode: 'look',
    facts: { itemAttrs: attrs, binAttrs, by },
    prompt: { text: prompt, speak: [prompt] },
    items,
    bins,
    answerBin: attrs.map((attr) => binAttrs.indexOf(attr)),
    explanation: explain(groups, { kind: 'row', children: items.filter((_, i) => attrs[i] === binAttrs[0]) }),
  };
}

// Which group each item belongs to: both groups get at least one, in a shuffled order.
function sides(count: number, rng: Rng): number[] {
  const first = rng.int(1, count - 1);
  return rng.shuffle(Array.from({ length: count }, (_, i) => (i < first ? 0 : 1)));
}

function bin(label: string, icon: Visual): SortBin {
  return { label: cap(label), speak: [label], icon };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const colors = twoClearColors(rng);
    const attrs = sides(4, rng).map((side) => colors[side] as ColorName);
    const items = attrs.map((color) => shape(rng.pick(SHAPES), color));
    return build('colour', items, attrs, colors, colors.map((color) => bin(color, { kind: 'bar', length: 2, color, orientation: 'horizontal' })), colors);
  }
  if (level === 2) {
    const forms = rng.sample(SHAPES, 2) as [ShapeName, ShapeName];
    const attrs = sides(4, rng).map((side) => forms[side] as ShapeName);
    const items = attrs.map((form) => shape(form, rng.pick(COLOR_NAMES)));
    return build('shape', items, attrs, forms, forms.map((form) => bin(`${form}s`, shape(form, 'black', 's'))), [`${forms[0]}s`, `${forms[1]}s`]);
  }
  const form = rng.pick(SHAPES);
  const color = rng.pick(COLOR_NAMES);
  const words: [string, string] = ['big', 'small'];
  const attrs = sides(6, rng).map((side) => words[side] as string);
  const items = attrs.map((word) => shape(form, color, word === 'big' ? 'l' : 's'));
  return build('size', items, attrs, words, [bin('big', shape(form, 'black', 'l')), bin('small', shape(form, 'black', 's'))], words);
}

function lesson(): LessonStep[] {
  const mixed: Visual = { kind: 'row', children: [shape('circle', 'red'), shape('square', 'blue'), shape('star', 'red'), shape('heart', 'blue')] };
  const reds: Visual = { kind: 'row', children: [shape('circle', 'red'), shape('star', 'red')] };
  const blues: Visual = { kind: 'row', children: [shape('square', 'blue'), shape('heart', 'blue')] };
  return [
    { beat: 'see', text: 'Sorting puts things that are alike together.', speak: ['Sorting puts things that are alike together.'], visual: mixed },
    { beat: 'watch', text: 'These ones are red. These ones are blue.', speak: explain(['red', 'blue'], reds).speak, visual: reds },
    {
      beat: 'try',
      text: 'Which group does the blue square go in?',
      speak: ['Which group does the blue square go in?'],
      visual: shape('square', 'blue'),
      reveal: { text: 'It goes with the blue ones.', speak: ['It goes with the blue ones.'], visual: blues },
    },
    { beat: 'remember', text: 'Things in a group share something.', speak: ['Things in a group share something.'], visual: reds },
  ];
}

const EXAMPLE_SEED = 18;

export const generator: SkillGenerator = {
  skillId: 'M-PK-D3',
  maxLevel: 3,
  itemTypes: ['sort'],
  lists: ['colors'],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'sortBy',
};
