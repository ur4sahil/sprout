import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { listText, numeral } from '../../../generator';

// Math K C.4, Add to 10. Family: Add.
// Levels: sums to 7 / sums to 10 / typed / missing sum on the left, typed.

const SUM_RANGE: Record<number, [number, number]> = {
  1: [2, 7],
  2: [6, 10],
  3: [2, 10],
  4: [2, 10],
};

function equation(a: number, b: number, level: Level): Visual {
  return level === 4
    ? { kind: 'equation', parts: ['blank', '=', a, '+', b] }
    : { kind: 'equation', parts: [a, '+', b, '=', 'blank'] };
}

// Counting on, said the way the child starts: at the bigger number, and why (the wording audit, Nov 21, 2026).
// `boxFirst`: the question was written with the box on the left (level 4), so the last step is too: 7 = 1 + 6.
export function explain(a: number, b: number, boxFirst = false): { speak: Say; steps: string[]; visual: Visual; hint: Hint } {
  const bigger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const sum = a + b;
  const counted = Array.from({ length: smaller }, (_, i) => bigger + i + 1);
  const start: Say = a === b ? ['Start at', { number: bigger }, '.'] : ['Start at the bigger number,', { number: bigger }, '.'];
  return {
    speak: [...start, 'Count on', { number: smaller }, 'more.', { number: sum }, '.'],
    steps: [a === b ? `Start at ${bigger}.` : `Start at the bigger number, ${bigger}.`, `Count on ${smaller} more: ${listText(counted)}.`, boxFirst ? `${sum} = ${a} + ${b}` : `${a} + ${b} = ${sum}`],
    visual: { kind: 'equation', parts: boxFirst ? [sum, '=', a, '+', b] : [a, '+', b, '=', sum] },
    hint: { text: a === b ? 'Start at one of the numbers. Then count on.' : 'Start at the bigger number. Then count on.' },
  };
}

// The sum asked the natural way (the owner's choice, Nov 22, 2026): "What is 1 plus 6?". With the box on the
// left the question reads the same way round as the sum: "What number equals 1 plus 6?".
export function plusPrompt(a: number, b: number, boxFirst = false): { text: string; speak: Say } {
  return boxFirst
    ? { text: `What number equals ${a} plus ${b}?`, speak: ['What number equals', { number: a }, 'plus', { number: b }, '?'] }
    : { text: `What is ${a} plus ${b}?`, speak: ['What is', { number: a }, 'plus', { number: b }, '?'] };
}

// Three numerals, smallest first. Wrong answers are the usual slips: one off,
// the take-away answer, or an addend said again. The right answer's place is
// chosen first, so it does not always end up the largest.
function optionsFor(a: number, b: number, rng: Rng): number[] {
  const sum = a + b;
  const below = [...new Set([sum - 1, a, b, Math.abs(a - b)])].filter((value) => value >= 1 && value < sum);
  const places = rng.shuffle([0, 1, 2]);
  for (const place of places) {
    if (place === 0) return [sum, sum + 1, sum + 2];
    if (place === 1 && below.length >= 1) {
      const low = below.includes(sum - 1) ? sum - 1 : rng.pick(below);
      return [low, sum, sum + 1];
    }
    if (place === 2 && below.length >= 2) {
      const lows = rng.sample(below, 2).sort((x, y) => x - y);
      return [...lows, sum];
    }
  }
  return [sum, sum + 1, sum + 2];
}

function build(a: number, b: number, level: Level, rng: Rng): QuestionDraft {
  const sum = a + b;
  const prompt = plusPrompt(a, b, level === 4);
  const stimulus = equation(a, b, level);
  if (level <= 2) {
    const values = optionsFor(a, b, rng);
    return {
      type: 'choice',
      mode: 'look',
      facts: { a, b, options: values },
      prompt,
      stimulus,
      options: values.map((value) => numeral(value)),
      answerIndex: values.indexOf(sum),
      explanation: explain(a, b),
    };
  }
  return {
    type: 'numberPad',
    mode: 'look',
    facts: { a, b },
    prompt,
    stimulus,
    answer: sum,
    maxDigits: 2,
    explanation: explain(a, b, level === 4),
  };
}

function generate(level: Level, rng: Rng): QuestionDraft {
  const [low, high] = SUM_RANGE[level] ?? (SUM_RANGE[4] as [number, number]);
  const sum = rng.int(low, high);
  const a = rng.int(1, sum - 1);
  return build(a, sum - a, level, rng);
}

function lesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'Adding puts groups together. 2 and 3 make 5.',
      speak: ['Adding puts groups together.', { number: 2 }, 'and', { number: 3 }, 'make', { number: 5 }, '.'],
      visual: { kind: 'emojiGroup', emoji: '🍎', count: 2, layout: 'row', emoji2: '🍌', count2: 3 },
    },
    {
      beat: 'watch',
      text: `4 plus 2. ${explain(4, 2).steps.slice(0, 2).join(' ')}`,
      speak: [{ number: 4 }, 'plus', { number: 2 }, '.', ...explain(4, 2).speak],
      visual: { kind: 'equation', parts: [4, '+', 2, '=', 6] },
    },
    {
      beat: 'try',
      text: plusPrompt(3, 5).text,
      speak: plusPrompt(3, 5).speak,
      visual: { kind: 'equation', parts: [3, '+', 5, '=', 'blank'] },
      reveal: {
        text: explain(3, 5).steps.slice(0, 2).join(' '),
        speak: explain(3, 5).speak,
        visual: { kind: 'equation', parts: [3, '+', 5, '=', 8] },
      },
    },
    {
      beat: 'remember',
      text: 'Start with the bigger number.',
      speak: ['Start with the bigger number.'],
      visual: { kind: 'numberLine', min: 0, max: 10, step: 1 },
    },
  ];
}

const EXAMPLE_SEED = 7;

export const generator: SkillGenerator = {
  skillId: 'M-K-C4',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate,
  exampleSeed: EXAMPLE_SEED,
  example: () => generate(1, makeRng(EXAMPLE_SEED)),
  lesson,
  oracle: 'add',
};
