import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';

// Math K B.3, Put numbers in order. Family: Put numbers in order.
// Levels: 3 numbers to 5 / 3 numbers to 10 / 4 numbers to 20.

const SHAPE: Record<number, { count: number; max: number }> = {
  1: { count: 3, max: 5 },
  2: { count: 3, max: 10 },
  3: { count: 4, max: 20 },
};

function isSorted(values: number[]): boolean {
  return values.every((value, i) => i === 0 || (values[i - 1] as number) < value);
}

function row(values: number[]): Visual {
  return { kind: 'row', children: values.map((value) => numeral(value, 'l')) };
}

function explain(sorted: number[]): { speak: Say; steps: string[]; visual: Visual; hint: Hint } {
  const [first, ...rest] = sorted;
  const speak: Say = [{ number: first as number }, 'is the smallest.'];
  for (const value of rest) speak.push('Then', { number: value }, '.');
  return {
    speak,
    steps: [`${first} is the smallest.`, `Then ${rest.join('. Then ')}.`, `In order: ${listText(sorted)}.`],
    visual: row(sorted),
    // The steps list the answer, so they are never a nudge: the hint says how to start.
    hint: { text: 'Find the smallest number first. Then find the next one.' },
  };
}

// An order is answered by tapping, first to last. The prompt says so.
const PROMPT = 'Tap the numbers from smallest to biggest.';

function build(values: number[]): QuestionDraft {
  const sorted = values.slice().sort((a, b) => a - b);
  const prompt = PROMPT;
  return {
    type: 'order',
    mode: 'look',
    facts: { values },
    prompt: { text: prompt, speak: [prompt] },
    items: values.map((value) => numeral(value)),
    answerOrder: sorted.map((value) => values.indexOf(value)),
    explanation: explain(sorted),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const shape = SHAPE[level] ?? (SHAPE[3] as { count: number; max: number });
  const pool = Array.from({ length: shape.max }, (_, i) => i + 1);
  // Never hand over numbers that are already in order: there would be nothing to do.
  for (;;) {
    const values = rng.sample(pool, shape.count);
    if (!isSorted(values)) return build(values);
  }
}

function lesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'Numbers have an order. Smaller numbers come first.',
      speak: ['Numbers have an order. Smaller numbers come first.'],
      visual: { kind: 'numberLine', min: 1, max: 5, step: 1 },
    },
    {
      beat: 'watch',
      text: '1 is the smallest. Then 2. Then 4.',
      speak: explain([1, 2, 4]).speak,
      visual: row([1, 2, 4]),
    },
    {
      beat: 'try',
      text: 'Tap 5, 3 and 4 from smallest to biggest.',
      speak: ['Tap', { number: 5 }, ',', { number: 3 }, 'and', { number: 4 }, 'from smallest to biggest.'],
      visual: row([5, 3, 4]),
      reveal: {
        text: '3 is the smallest. Then 4. Then 5.',
        speak: explain([3, 4, 5]).speak,
        visual: row([3, 4, 5]),
      },
    },
    {
      beat: 'remember',
      text: 'Smaller numbers come first when we count.',
      speak: ['Smaller numbers come first when we count.'],
      visual: { kind: 'numberLine', min: 1, max: 10, step: 1 },
    },
  ];
}

const EXAMPLE_SEED = 7;

export const generator: SkillGenerator = {
  skillId: 'M-K-B3',
  maxLevel: 3,
  itemTypes: ['order'],
  lists: [],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'order',
};
