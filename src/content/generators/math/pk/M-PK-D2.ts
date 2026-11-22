import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import { COLOR_NAMES } from '../../../data/colors';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { a, shape, twoClearColors } from './parts';

// Math pre-K D.2, What comes next: AB patterns. Family: Patterns.
// Levels: AB by colour / by shape / by picture.
// The two options are the two parts of the pattern, so no option could be argued as a different pattern.

const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];

interface Part {
  name: string; // what it is called aloud: "red", "circle", "apple"
  picture: Visual;
  thing?: true; // a shape or a picture, said with "a": "a circle"; a colour is said on its own: "red"
}

// "a circle", "an apple", "red".
const called = (part: Part): string => (part.thing ? a(part.name) : part.name);

export const PATTERN_HINT: Hint = { text: 'Say the pattern out loud. What comes after the last one?' };

function explain(unit: Part[], shown: number): { speak: Say; steps: string[]; visual: Visual; hint: Hint } {
  const [first, second] = unit as [Part, Part];
  const last = unit[(shown - 1) % 2] as Part;
  const answer = unit[shown % 2] as Part;
  const steps = [`The pattern is ${first.name}, ${second.name}, and it repeats.`, `After ${called(last)} comes ${called(answer)}.`];
  return {
    speak: [steps.join(' ')],
    steps,
    visual: { kind: 'sequence', items: [...Array.from({ length: shown }, (_, i) => (unit[i % 2] as Part).picture), answer.picture] },
    hint: PATTERN_HINT,
  };
}

function build(by: string, unit: Part[], shown: number, order: number[]): QuestionDraft {
  const names = unit.map((part) => part.name);
  const offered = order.map((i) => unit[i] as Part);
  const answer = unit[shown % 2] as Part;
  const prompt = 'What comes next?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { unit: names, shown, by, options: offered.map((part) => part.name) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'sequence', items: [...Array.from({ length: shown }, (_, i) => (unit[i % 2] as Part).picture), 'blank'] },
    options: offered.map((part) => part.picture),
    answerIndex: offered.indexOf(answer),
    explanation: explain(unit, shown),
  };
}

function unitFor(level: Level, rng: Rng): { by: string; unit: Part[] } {
  if (level === 1) {
    const form = rng.pick(SHAPES);
    const colors = twoClearColors(rng);
    return { by: 'colour', unit: colors.map((color) => ({ name: color, picture: shape(form, color) })) };
  }
  if (level === 2) {
    const color = rng.pick(COLOR_NAMES);
    const forms = rng.sample(SHAPES, 2);
    return { by: 'shape', unit: forms.map((form) => ({ name: form, picture: shape(form, color), thing: true })) };
  }
  const things = rng.sample(COUNTABLES, 2);
  return { by: 'picture', unit: things.map((thing) => ({ name: thing.one, picture: { kind: 'emojiGroup', emoji: thing.emoji, count: 1, layout: 'row' }, thing: true })) };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const { by, unit } = unitFor(level, rng);
  // Four, five or six shown: the pattern has repeated at least twice before the child is asked.
  return build(by, unit, rng.int(4, 6), rng.shuffle([0, 1]));
}

function lesson(): LessonStep[] {
  const red: Part = { name: 'red', picture: shape('circle', 'red') };
  const blue: Part = { name: 'blue', picture: shape('circle', 'blue') };
  const row = (shown: number, end: Visual | 'blank'): Visual => ({ kind: 'sequence', items: [...Array.from({ length: shown }, (_, i) => ([red, blue][i % 2] as Part).picture), end] });
  return [
    { beat: 'see', text: 'A pattern repeats: red, blue, red, blue.', speak: ['A pattern repeats: red, blue, red, blue.'], visual: row(3, blue.picture) },
    { beat: 'watch', text: explain([red, blue], 4).steps.join(' '), speak: explain([red, blue], 4).speak, visual: explain([red, blue], 4).visual },
    {
      beat: 'try',
      text: 'What comes next?',
      speak: ['What comes next?'],
      visual: row(5, 'blank'),
      reveal: { text: explain([red, blue], 5).steps.join(' '), speak: explain([red, blue], 5).speak, visual: explain([red, blue], 5).visual },
    },
    { beat: 'remember', text: 'Find the part that repeats.', speak: ['Find the part that repeats.'], visual: row(1, blue.picture) },
  ];
}

const EXAMPLE_SEED = 17;

export const generator: SkillGenerator = {
  skillId: 'M-PK-D2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['colors', 'countables'],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'pattern',
};
