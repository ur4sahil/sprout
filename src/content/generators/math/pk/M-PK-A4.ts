import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { countAloud, listText } from '../../../generator';
import { apple, star, thingsWord } from './parts';

// Math pre-K A.4, Tap that many. Family: Tap that many.
// Levels: tap 1 to 3 of 6 shown / 1 to 5 of 8 / 4 to 8 of 10.

const SHAPE: { from: number; to: number; shown: number }[] = [
  { from: 1, to: 3, shown: 6 },
  { from: 1, to: 5, shown: 8 },
  { from: 4, to: 8, shown: 10 },
];

function explain(thing: Countable, n: number): { speak: Say; steps: string[]; visual: Visual; hint: Hint } {
  return {
    speak: ['Count as you tap.', ...countAloud(n), 'Stop at', { number: n }, '.'],
    steps: [`Count as you tap: ${listText(Array.from({ length: n }, (_, i) => i + 1))}.`, `Stop at ${n}.`],
    visual: { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: n <= 5 ? 'row' : 'grid5', numbered: true },
    hint: { text: 'Count as you tap. Say a number for each tap. Stop at the number you heard.' },
  };
}

function build(thing: Countable, n: number, shown: number): QuestionDraft {
  return {
    type: 'tapCount',
    mode: 'look',
    facts: { n, thing: thing.one, shown },
    prompt: { text: `Tap ${n} ${thingsWord(thing, n)}.`, speak: ['Tap', { number: n }, `${thingsWord(thing, n)}.`] },
    emoji: thing.emoji,
    shown,
    answer: n,
    explanation: explain(thing, n),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const shape = SHAPE[level - 1] ?? (SHAPE[2] as (typeof SHAPE)[number]);
  return build(rng.pick(COUNTABLES), rng.int(shape.from, shape.to), shape.shown);
}

function lesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'A number tells us how many to tap.',
      speak: ['A number tells us how many to tap. Here are', { number: 6 }, 'apples.'],
      visual: { kind: 'emojiGroup', emoji: apple.emoji, count: 6, layout: 'grid5' },
    },
    {
      beat: 'watch',
      text: 'Tap 3 apples. Count as you tap: 1, 2, 3. Stop at 3.',
      speak: ['Tap', { number: 3 }, 'apples.', ...explain(apple, 3).speak],
      visual: explain(apple, 3).visual,
    },
    {
      beat: 'try',
      text: 'Tap 2 stars.',
      speak: ['Tap', { number: 2 }, 'stars.'],
      visual: { kind: 'emojiGroup', emoji: star.emoji, count: 6, layout: 'grid5' },
      reveal: { text: 'Count as you tap: 1, 2. Stop at 2.', speak: explain(star, 2).speak, visual: explain(star, 2).visual },
    },
    {
      beat: 'remember',
      text: 'Stop when you say the number.',
      speak: ['Stop when you say the number.'],
      visual: explain(apple, 3).visual,
    },
  ];
}

const EXAMPLE_SEED = 5;

export const generator: SkillGenerator = {
  skillId: 'M-PK-A4',
  maxLevel: 3,
  itemTypes: ['tapCount'],
  lists: ['countables'],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'count',
};
