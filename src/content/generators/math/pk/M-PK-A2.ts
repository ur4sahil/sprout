import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { countAloud, listText, numeral } from '../../../generator';

// Math pre-K A.2, Count to 5. Family: Count objects.
// Levels: 1 to 5 objects in a row / as dots on a die / scattered.

const MAX = 5;
const SCATTER_SLOTS = Array.from({ length: 20 }, (_, i) => i);

function group(thing: Countable, n: number, level: Level, rng: Rng): Visual {
  if (level === 1) return { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: 'row' };
  if (level === 2) return { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: 'dice' };
  const slots = rng.sample(SCATTER_SLOTS, n).sort((a, b) => a - b);
  return { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: 'scatter', slots };
}

// Three numerals next to each other that include n, shown smallest first.
// Wrong answers are one or two away, inside 1 to 5.
function optionsFor(n: number, rng: Rng): number[] {
  const starts = [n - 2, n - 1, n].filter((start) => start >= 1 && start + 2 <= MAX);
  const start = rng.pick(starts);
  return [start, start + 1, start + 2];
}

function thingsWord(thing: Countable, n: number): string {
  return n === 1 ? thing.one : thing.many;
}

function explain(thing: Countable, n: number): { speak: Say; steps: string[]; visual: Visual } {
  const there = n === 1 ? 'There is' : 'There are';
  return {
    speak: ["Let's count.", ...countAloud(n), `${there}`, { number: n }, `${thingsWord(thing, n)}.`],
    steps: [`Let's count: ${listText(Array.from({ length: n }, (_, i) => i + 1))}.`, `${there} ${n} ${thingsWord(thing, n)}.`],
    visual: { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: 'row', numbered: true },
  };
}

function build(thing: Countable, n: number, level: Level, rng: Rng): QuestionDraft {
  const stimulus = group(thing, n, level, rng);
  const values = optionsFor(n, rng);
  const facts: QuestionDraft['facts'] = { n, thing: thing.one, options: values };
  if (stimulus.kind === 'emojiGroup' && stimulus.slots) facts.slots = stimulus.slots;
  const prompt = `How many ${thing.many} are there?`;
  return {
    type: 'choice',
    mode: 'look',
    facts,
    prompt: { text: prompt, speak: [prompt] },
    stimulus,
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(n),
    explanation: explain(thing, n),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  const n = rng.int(1, MAX);
  return build(thing, n, level, rng);
}

function lesson(): LessonStep[] {
  const apple = COUNTABLES[0] as Countable;
  const star = COUNTABLES[1] as Countable;
  return [
    {
      beat: 'see',
      text: 'Counting tells us how many.',
      speak: ['Counting tells us how many. Here are', { number: 3 }, 'apples.'],
      visual: { kind: 'emojiGroup', emoji: apple.emoji, count: 3, layout: 'row' },
    },
    {
      beat: 'watch',
      text: "Let's count: 1, 2, 3, 4. There are 4 apples.",
      speak: explain(apple, 4).speak,
      visual: { kind: 'emojiGroup', emoji: apple.emoji, count: 4, layout: 'row', numbered: true },
    },
    {
      beat: 'try',
      text: 'How many stars are there?',
      speak: ['How many stars are there?'],
      visual: { kind: 'emojiGroup', emoji: star.emoji, count: 5, layout: 'row' },
      reveal: {
        text: "Let's count: 1, 2, 3, 4, 5. There are 5 stars.",
        speak: explain(star, 5).speak,
        visual: { kind: 'emojiGroup', emoji: star.emoji, count: 5, layout: 'row', numbered: true },
      },
    },
    {
      beat: 'remember',
      text: 'Touch each one once and say one number.',
      speak: ['Touch each one once and say one number.'],
      visual: { kind: 'emojiGroup', emoji: apple.emoji, count: 5, layout: 'row', numbered: true },
    },
  ];
}

const EXAMPLE_SEED = 7;

export const generator: SkillGenerator = {
  skillId: 'M-PK-A2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'count',
};
