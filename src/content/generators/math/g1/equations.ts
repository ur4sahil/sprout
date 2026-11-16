import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';

// Math grade 1 B.4, B.5 and B.6: make ten to add, missing numbers, and true or false equations.

type Explanation = { speak: Say; steps: string[]; visual: Visual };
const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });

// ---- B.4 Make ten to add ----
// Levels: two ten frames, 9 plus n / 8 plus n / 7 plus n, pick the matching ten-and-some. Oracle: makeTen.

const twoFrames = (a: number, b: number): Visual => ({ kind: 'row', children: [{ kind: 'tenFrame', filled: a, frames: 1 }, { kind: 'tenFrame', filled: b, frames: 1 }] });
const sumText = (x: number, y: number): Visual => ({ kind: 'text', value: `${x} + ${y}`, size: 'l', speak: [{ number: x }, 'plus', { number: y }] });

function makeTenExplanation(a: number, b: number): Explanation {
  const move = 10 - a;
  const left = b - move;
  // With a double there is no telling "the 8" from "the 8", so it says one and the other.
  const moved: Say = a === b ? ['Move', { number: move }, 'from one', { number: a }, 'to the other.'] : ['Move', { number: move }, 'from the', { number: b }, 'to the', { number: a }, '.'];
  const movedText = a === b ? `Move ${move} from one ${a} to the other.` : `Move ${move} from the ${b} to the ${a}.`;
  return {
    speak: [...moved, 'Now it is', { number: 10 }, 'and', { number: left }, '.', { number: 10 }, 'plus', { number: left }, 'is', { number: a + b }, '.'],
    steps: [movedText, `Now it is 10 and ${left}.`, `10 plus ${left} is ${a + b}.`],
    visual: twoFrames(10, left),
  };
}

function makeTenPrompt(a: number, b: number): { text: string; speak: Say } {
  return { text: `${a} plus ${b}. Make a ten first. Which one is the same?`, speak: [{ number: a }, 'plus', { number: b }, '. Make a ten first. Which one is the same?'] };
}

function makeTen(level: Level, rng: Rng): QuestionDraft {
  const a = level === 1 ? 9 : level === 2 ? 8 : 7;
  // The second number is big enough to fill the ten and leave some over.
  const b = rng.int(10 - a + 1, 9);
  const left = a + b - 10;
  // The slips: the ten made but nothing taken from the second number, or the second number made smaller with no ten made.
  const options = rng.shuffle([
    { code: `10 plus ${left}`, picture: sumText(10, left) },
    { code: `10 plus ${b}`, picture: sumText(10, b) },
    { code: `${a} plus ${left}`, picture: sumText(a, left) },
  ]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { a, b, options: options.map((option) => option.code) },
    prompt: makeTenPrompt(a, b),
    stimulus: twoFrames(a, b),
    options: options.map((option) => option.picture),
    answerIndex: options.findIndex((option) => option.code === `10 plus ${left}`),
    explanation: makeTenExplanation(a, b),
  };
}

export const makeTenToAddGenerator: SkillGenerator = {
  skillId: 'M-1-B4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  pool: { 2: 7, 3: 6 }, // 8 plus 3 to 9, and 7 plus 4 to 9
  generate: makeTen,
  exampleSeed: 114,
  example: () => makeTen(1, makeRng(114)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Adding is easier from ten. Fill one frame to make a ten first.', speak: ['Adding is easier from ten. Fill one frame to make a ten first.'], visual: twoFrames(9, 4) },
    { beat: 'watch', text: `9 plus 4. ${makeTenExplanation(9, 4).steps.join(' ')}`, speak: [{ number: 9 }, 'plus', { number: 4 }, '.', ...makeTenExplanation(9, 4).speak], visual: twoFrames(10, 3) },
    { beat: 'try', text: makeTenPrompt(8, 5).text, speak: makeTenPrompt(8, 5).speak, visual: twoFrames(8, 5), reveal: { text: makeTenExplanation(8, 5).steps.join(' '), speak: makeTenExplanation(8, 5).speak, visual: twoFrames(10, 3) } },
    { beat: 'remember', text: 'Fill the ten first.', speak: ['Fill the ten first.'], visual: twoFrames(10, 3) },
  ],
  oracle: 'makeTen',
};

// ---- B.5 Missing number in an equation ----
// Levels: 3 plus blank equals 7, to 10 / to 20 / subtraction blanks, typed. Family: Missing part. Oracle: missing.

function countUpExplanation(from: number, to: number, visual: Visual): Explanation {
  const more = to - from;
  return {
    speak: ['Start at', { number: from }, '. Count up to', { number: to }, '. That is', { number: more }, 'more.'],
    steps: [`Start at ${from}.`, `Count up to ${to}.`, `That is ${more} more.`],
    visual,
  };
}

function missingNumber(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    // "9 minus what equals 4?" The part taken away is what is counted up from 4 to 9.
    const whole = rng.int(6, 20);
    const left = rng.int(1, whole - 2);
    const taken = whole - left;
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { a: left, b: taken, total: whole, blank: 'b', minus: true },
      prompt: { text: `${whole} minus what equals ${left}?`, speak: [{ number: whole }, 'minus what equals', { number: left }, '?'] },
      stimulus: equation(whole, '-', 'blank', '=', left),
      answer: taken,
      maxDigits: 2,
      explanation: countUpExplanation(left, whole, equation(whole, '-', taken, '=', left)),
    };
  }
  const total = level === 1 ? rng.int(5, 10) : rng.int(11, 20);
  const a = rng.int(Math.max(1, total - 10), Math.min(total - 1, 10));
  const b = total - a;
  // The slips: one off, the two numbers added, or a number from the question said again.
  const values = numeralChoices(b, [a + total, a, total], 0, 30, rng);
  return {
    type: 'choice',
    mode: 'look',
    facts: { a, b, total, blank: 'b', options: values },
    prompt: { text: `${a} plus what equals ${total}?`, speak: [{ number: a }, 'plus what equals', { number: total }, '?'] },
    stimulus: equation(a, '+', 'blank', '=', total),
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(b),
    explanation: countUpExplanation(a, total, equation(a, '+', b, '=', total)),
  };
}

export const missingInEquationGenerator: SkillGenerator = {
  skillId: 'M-1-B5',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: missingNumber,
  exampleSeed: 115,
  example: () => missingNumber(1, makeRng(115)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'An empty box stands for a number we do not know yet.', speak: ['An empty box stands for a number we do not know yet.'], visual: equation(3, '+', 'blank', '=', 7) },
    { beat: 'watch', text: `3 plus what equals 7? ${countUpExplanation(3, 7, equation(3, '+', 4, '=', 7)).steps.join(' ')}`, speak: [{ number: 3 }, 'plus what equals', { number: 7 }, '?', ...countUpExplanation(3, 7, equation(3, '+', 4, '=', 7)).speak], visual: equation(3, '+', 4, '=', 7) },
    { beat: 'try', text: '6 plus what equals 9?', speak: [{ number: 6 }, 'plus what equals', { number: 9 }, '?'], visual: equation(6, '+', 'blank', '=', 9), reveal: { text: countUpExplanation(6, 9, equation(6, '+', 3, '=', 9)).steps.join(' '), speak: countUpExplanation(6, 9, equation(6, '+', 3, '=', 9)).speak, visual: equation(6, '+', 3, '=', 9) } },
    { beat: 'remember', text: 'Count up to find the missing part.', speak: ['Count up to find the missing part.'], visual: equation(3, '+', 4, '=', 7) },
  ],
  oracle: 'missing',
};

// ---- B.6 True or false equations ----
// Levels: 4 plus 1 equals 5 / 3 plus 2 equals 2 plus 3 / mixed operations to 20. Family: True or false. Oracle: truth.

type Side = (number | string)[];
const worth = (side: Side): number => side.reduce<number>((total, part, i) => (typeof part === 'number' ? total + (i > 0 && side[i - 1] === '-' ? -part : part) : total), 0);

const TRUE_FALSE = (): Visual[] => [
  { kind: 'text', value: 'True', size: 'l', speak: ['True'] },
  { kind: 'text', value: 'False', size: 'l', speak: ['False'] },
];
const IS_TRUE = 'Is this true?';

function truthExplanation(left: Side, right: Side): Explanation {
  const [x, y] = [worth(left), worth(right)];
  const same = x === y;
  return {
    speak: ['The left side is', { number: x }, '. The right side is', { number: y }, same ? '. They are the same.' : '. They are not the same.'],
    steps: [`The left side is ${x}.`, `The right side is ${y}.`, same ? 'They are the same.' : 'They are not the same.'],
    visual: equation(...left, same ? '=' : '≠', ...right),
  };
}

function truthQuestion(left: Side, right: Side): QuestionDraft {
  const same = worth(left) === worth(right);
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { left, right, options: [true, false] },
    prompt: { text: IS_TRUE, speak: [IS_TRUE] },
    stimulus: equation(...left, '=', ...right),
    options: TRUE_FALSE(),
    answerIndex: same ? 0 : 1,
    explanation: truthExplanation(left, right),
  };
}

// A number one or two away from `value`, from 1 to `hi`.
const near = (value: number, rng: Rng, hi: number, lo = 1): number => rng.pick([-2, -1, 1, 2].map((by) => value + by).filter((other) => other >= lo && other <= hi));

function trueOrFalse(level: Level, rng: Rng): QuestionDraft {
  // Half are true.
  const isTrue = rng.bool();
  if (level === 1) {
    const a = rng.int(1, 9);
    const b = rng.int(1, 10 - a);
    return truthQuestion([a, '+', b], [isTrue ? a + b : near(a + b, rng, 10)]);
  }
  if (level === 2) {
    // Both sides are sums. A true one is the same two numbers the other way round, or another pair with the same sum.
    const a = rng.int(1, 8);
    const b = rng.int(1, 9 - a) + (rng.bool() ? 0 : 1);
    const sum = a + b;
    if (isTrue) {
      const c = rng.bool() ? b : rng.int(1, sum - 1);
      return truthQuestion([a, '+', b], [c, '+', sum - c]);
    }
    // A false one: the right side adds up to one or two more or less.
    const other = near(sum, rng, 11, 2);
    const c = rng.int(Math.max(1, other - 10), Math.min(other - 1, 10));
    return truthQuestion([a, '+', b], [c, '+', other - c]);
  }
  // Mixed: a sum on one side and a difference on the other, to 20.
  const value = rng.int(3, 15);
  const a = rng.int(1, value - 1);
  const target = isTrue ? value : near(value, rng, 17);
  const take = rng.int(1, 20 - target);
  const plus: Side = [a, '+', value - a];
  const minus: Side = [target + take, '-', take];
  return rng.bool() ? truthQuestion(plus, minus) : truthQuestion(minus, plus);
}

export const trueOrFalseGenerator: SkillGenerator = {
  skillId: 'M-1-B6',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: trueOrFalse,
  exampleSeed: 116,
  example: () => trueOrFalse(1, makeRng(116)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'The equals sign means both sides are the same amount.', speak: ['The equals sign means both sides are the same amount.'], visual: equation(4, '+', 1, '=', 5) },
    { beat: 'watch', text: `4 plus 1 equals 5. ${truthExplanation([4, '+', 1], [5]).steps.join(' ')} It is true.`, speak: [{ number: 4 }, 'plus', { number: 1 }, 'equals', { number: 5 }, '.', ...truthExplanation([4, '+', 1], [5]).speak, 'It is true.'], visual: equation(4, '+', 1, '=', 5) },
    { beat: 'try', text: IS_TRUE, speak: [IS_TRUE], visual: equation(3, '+', 2, '=', 6), reveal: { text: `${truthExplanation([3, '+', 2], [6]).steps.join(' ')} It is false.`, speak: [...truthExplanation([3, '+', 2], [6]).speak, 'It is false.'], visual: truthExplanation([3, '+', 2], [6]).visual } },
    { beat: 'remember', text: 'Both sides must be the same amount.', speak: ['Both sides must be the same amount.'], visual: equation(3, '+', 2, '=', 2, '+', 3) },
  ],
  oracle: 'truth',
};
