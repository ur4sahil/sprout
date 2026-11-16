import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { apple, star, thingsWord, tidyGroup } from './parts';

// Math pre-K A.7, Match numbers to groups. Family: Match letters (its wording, with numbers).
// Levels: 3 pairs within 1 to 5 / within 1 to 10.

function pairLine(thing: Countable, n: number): string {
  return `${n} goes with ${n} ${thingsWord(thing, n)}.`;
}

function explain(thing: Countable, numbers: number[]): { speak: Say; steps: string[]; visual: Visual } {
  const speak: Say = ['Count each group.'];
  for (const n of numbers) speak.push({ number: n }, 'goes with', { number: n }, `${thingsWord(thing, n)}.`);
  const first = numbers[0] as number;
  return {
    speak,
    steps: ['Count each group.', ...numbers.map((n) => pairLine(thing, n))],
    visual: { kind: 'row', children: [numeral(first), tidyGroup(thing, first)] },
  };
}

// `numbers` is the left column, top to bottom. `groups` is the right column: the same counts in another order.
function build(thing: Countable, numbers: number[], groups: number[]): QuestionDraft {
  const prompt = 'Match each number to its group.';
  return {
    type: 'match',
    mode: 'look',
    facts: { leftValues: numbers, rightValues: groups, thing: thing.one },
    prompt: { text: prompt, speak: [prompt] },
    left: numbers.map((n) => numeral(n)),
    right: groups.map((n) => tidyGroup(thing, n)),
    answerPairs: numbers.map((n, l): [number, number] => [l, groups.indexOf(n)]),
    explanation: explain(thing, numbers),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const max = level === 1 ? 5 : 10;
  const numbers = rng.sample(Array.from({ length: max }, (_, i) => i + 1), 3).sort((x, y) => x - y);
  // The groups never sit in the same order as their numbers: there would be nothing to work out.
  for (;;) {
    const groups = rng.shuffle(numbers);
    if (groups.some((n, i) => n !== numbers[i])) return build(rng.pick(COUNTABLES), numbers, groups);
  }
}

function lesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'A number tells how many are in a group.',
      speak: ['A number tells how many are in a group. This is', { number: 3 }, 'and here are', { number: 3 }, 'apples.'],
      visual: { kind: 'row', children: [numeral(3), tidyGroup(apple, 3)] },
    },
    {
      beat: 'watch',
      text: 'Count each group. 2 goes with 2 apples. 4 goes with 4 apples.',
      speak: explain(apple, [2, 4]).speak,
      visual: { kind: 'row', children: [numeral(4), tidyGroup(apple, 4)] },
    },
    {
      beat: 'try',
      text: 'Which number goes with these stars?',
      speak: ['Which number goes with these stars?'],
      visual: tidyGroup(star, 5),
      reveal: { text: '5 goes with 5 stars.', speak: [{ number: 5 }, 'goes with', { number: 5 }, 'stars.'], visual: { kind: 'row', children: [numeral(5), tidyGroup(star, 5)] } },
    },
    {
      beat: 'remember',
      text: 'Count the group, then find its number.',
      speak: ['Count the group, then find its number.'],
      visual: { kind: 'row', children: [numeral(2), tidyGroup(apple, 2)] },
    },
  ];
}

const EXAMPLE_SEED = 6;

export const generator: SkillGenerator = {
  skillId: 'M-PK-A7',
  maxLevel: 2,
  itemTypes: ['match'],
  lists: ['countables'],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'matchEqual',
};
