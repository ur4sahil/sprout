import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { apple, star, tidyGroup } from '../pk/parts';

// Math K B.1 and B.2. Families: More or fewer, and Compare numbers. Oracle: compare.

type Ask = 'most' | 'least';

// Two different whole numbers from lo to hi.
function twoNumbers(lo: number, hi: number, rng: Rng): [number, number] {
  const a = rng.int(lo, hi);
  for (;;) {
    const b = rng.int(lo, hi);
    if (b !== a) return [a, b];
  }
}

// ---- B.1 More, fewer or equal ----
// Levels: two groups to 5 / to 10 / includes equal groups.

const yesNo = (): Visual[] => [
  { kind: 'text', value: 'Yes', size: 'l', speak: ['Yes'] },
  { kind: 'text', value: 'No', size: 'l', speak: ['No'] },
];
const side = (thing: Countable, values: number[]): Visual => ({ kind: 'row', children: values.map((n) => tidyGroup(thing, n)) });

function groupsExplanation(thing: Countable, values: [number, number], ask: Ask | 'equal'): { speak: Say; steps: string[]; visual: Visual } {
  const [left, right] = values;
  const counts: Say = ['This group has', { number: left }, '. This group has', { number: right }, '.'];
  const lines = [`This group has ${left}.`, `This group has ${right}.`];
  if (ask === 'equal') {
    const same = left === right;
    return {
      speak: [...counts, same ? 'They are the same. The groups are equal.' : 'They are not the same. The groups are not equal.'],
      steps: [...lines, same ? 'They are the same. The groups are equal.' : 'They are not the same. The groups are not equal.'],
      visual: side(thing, values),
    };
  }
  const answer = ask === 'most' ? Math.max(left, right) : Math.min(left, right);
  const other = left + right - answer;
  const than = ask === 'most' ? 'is more than' : 'is fewer than';
  return { speak: [...counts, { number: answer }, than, { number: other }, '.'], steps: [...lines, `${answer} ${than} ${other}.`], visual: tidyGroup(thing, answer) };
}

function moreOrFewer(thing: Countable, values: [number, number], ask: Ask): QuestionDraft {
  const wanted = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const prompt = ask === 'most' ? 'Which group has more?' : 'Which group has fewer?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, thing: thing.one, options: values },
    prompt: { text: prompt, speak: [prompt] },
    options: values.map((n) => tidyGroup(thing, n)),
    answerIndex: values.indexOf(wanted),
    explanation: groupsExplanation(thing, values, ask),
  };
}

function equalOrNot(thing: Countable, values: [number, number]): QuestionDraft {
  const equal = values[0] === values[1];
  const prompt = 'Are the groups equal?';
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { values, ask: 'equal', thing: thing.one, options: [true, false] },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: side(thing, values),
    options: yesNo(),
    answerIndex: equal ? 0 : 1,
    explanation: groupsExplanation(thing, values, 'equal'),
  };
}

function moreFewerEqual(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  const ask = rng.pick<Ask>(['most', 'least']);
  if (level === 1) return moreOrFewer(thing, twoNumbers(1, 5, rng), ask);
  if (level === 2) return moreOrFewer(thing, twoNumbers(1, 10, rng), ask);
  // Half ask whether the groups are equal, and half of those are. The rest ask more or fewer, one apart.
  if (rng.int(0, 1) === 0) {
    const n = rng.int(1, 10);
    const other = rng.int(0, 1) === 0 ? n : n === 10 ? 9 : n === 1 ? 2 : n + rng.pick([-1, 1]);
    return equalOrNot(thing, [n, other]);
  }
  const n = rng.int(1, 9);
  return moreOrFewer(thing, rng.shuffle([n, n + 1]) as [number, number], ask);
}

export const moreFewerEqualGenerator: SkillGenerator = {
  skillId: 'M-K-B1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: moreFewerEqual,
  exampleSeed: 31,
  example: () => moreFewerEqual(1, makeRng(31)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Groups can have more, fewer, or the same.', speak: ['Groups can have more, fewer, or the same.'], visual: side(apple, [3, 5]) },
    { beat: 'watch', text: groupsExplanation(apple, [3, 5], 'most').steps.join(' '), speak: groupsExplanation(apple, [3, 5], 'most').speak, visual: side(apple, [3, 5]) },
    {
      beat: 'try',
      text: 'Are the groups equal?',
      speak: ['Are the groups equal?'],
      visual: side(star, [4, 4]),
      reveal: { text: groupsExplanation(star, [4, 4], 'equal').steps.join(' '), speak: groupsExplanation(star, [4, 4], 'equal').speak, visual: side(star, [4, 4]) },
    },
    { beat: 'remember', text: 'Equal groups have the same count.', speak: ['Equal groups have the same count.'], visual: side(star, [4, 4]) },
  ],
  oracle: 'compare',
};

// ---- B.2 Compare numbers ----
// Levels: which is greater, to 5 / to 10 / greater or less, to 20.

function numbersExplanation(values: [number, number], ask: Ask): { speak: Say; steps: string[]; visual: Visual } {
  const answer = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const other = values[0] + values[1] - answer;
  const where = ask === 'most' ? 'comes after' : 'comes before';
  const word = ask === 'most' ? 'greater' : 'less';
  return {
    speak: [{ number: answer }, where, { number: other }, 'when we count.', { number: answer }, `is ${word}.`],
    steps: [`${answer} ${where} ${other} when we count.`, `${answer} is ${word}.`],
    visual: { kind: 'numberLine', min: Math.max(0, Math.min(...values) - 1), max: Math.max(...values) + 1, step: 1, marked: [answer] },
  };
}

function compareNumbers(level: Level, rng: Rng): QuestionDraft {
  const values = twoNumbers(1, level === 1 ? 5 : level === 2 ? 10 : 20, rng);
  const ask: Ask = level === 3 ? rng.pick<Ask>(['most', 'least']) : 'most';
  const wanted = ask === 'most' ? Math.max(...values) : Math.min(...values);
  const prompt = ask === 'most' ? 'Which number is greater?' : 'Which number is less?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, options: values },
    prompt: { text: prompt, speak: [prompt] },
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(wanted),
    explanation: numbersExplanation(values, ask),
  };
}

export const compareNumbersGenerator: SkillGenerator = {
  skillId: 'M-K-B2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: compareNumbers,
  exampleSeed: 32,
  example: () => compareNumbers(1, makeRng(32)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Numbers get bigger as we count.', speak: ['Numbers get bigger as we count.'], visual: { kind: 'numberLine', min: 1, max: 10, step: 1 } },
    { beat: 'watch', text: numbersExplanation([3, 5], 'most').steps.join(' '), speak: numbersExplanation([3, 5], 'most').speak, visual: numbersExplanation([3, 5], 'most').visual },
    {
      beat: 'try',
      text: 'Which number is greater?',
      speak: ['Which number is greater?'],
      visual: { kind: 'row', children: [numeral(8), numeral(6)] },
      reveal: { text: numbersExplanation([8, 6], 'most').steps.join(' '), speak: numbersExplanation([8, 6], 'most').speak, visual: numbersExplanation([8, 6], 'most').visual },
    },
    { beat: 'remember', text: 'Later numbers are bigger.', speak: ['Later numbers are bigger.'], visual: { kind: 'numberLine', min: 1, max: 10, step: 1 } },
  ],
  oracle: 'compare',
};
