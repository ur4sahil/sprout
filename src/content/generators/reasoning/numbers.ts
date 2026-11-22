import type { Rng } from '../../../engine/rng';
import { makeRng } from '../../../engine/rng';
import type { Explanation, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../engine/types';
import type { SkillGenerator } from '../../generator';
import { numeral } from '../../generator';
import { row } from '../ela/pk/parts';
import { numeralChoices } from '../math/k/numerals';
import type { Line } from './parts';
import { explained, line } from './parts';

// Reasoning A.8, A.10 and A.11: number analogies, number series and number puzzles.
// The same change is worded the same way in all three: a number "goes up by", "goes down by" or "doubles".

// ---- A.8 Number analogies ----
// Levels: two example pairs, then a third to finish: plus n / double / typed /
// typed, with times 3, 4 or 5 (from a number up to 5), or two steps: double, then add or take away a little.
// One pair is never enough: "2 and 4" fits both plus 2 and double.
// The prompt says what the arrows mean: "Each number changes the same way. What does 4 change to?"

type Rule = { kind: 'plus' | 'minus'; n: number } | { kind: 'double' };

const applied = (rule: Rule, value: number): number => (rule.kind === 'double' ? value * 2 : rule.kind === 'plus' ? value + rule.n : value - rule.n);
const pairPicture = (from: number, to: number | 'blank'): Visual => ({ kind: 'equation', parts: [from, '→', to] });

function pairsPrompt(base: number): { text: string; speak: Say } {
  return line('Each number changes the same way. What does', base, 'change to?');
}

// An example pair the hint may name: neither of its numbers is the answer, so the hint never gives it away.
function hintPair(examples: readonly (readonly [number, number])[], answer: number): readonly [number, number] {
  return examples.find(([from, to]) => from !== answer && to !== answer && from > 1) ?? examples.find(([from, to]) => from !== answer && to !== answer) ?? (examples[0] as readonly [number, number]);
}

function ruleExplanation(rule: Rule, base: number, hint: string): Explanation {
  const answer = applied(rule, base);
  const lines: Line[] =
    rule.kind === 'double'
      ? [line('Each number doubles.'), line(base, 'doubles to', answer, '.')]
      : rule.kind === 'plus'
        ? [line('Each number goes up by', rule.n, '.'), line(base, 'goes up to', answer, '.')]
        : [line('Each number goes down by', rule.n, '.'), line(base, 'goes down to', answer, '.')];
  return explained(lines, pairPicture(base, answer), hint);
}

function numberAnalogy(level: Level, rng: Rng): QuestionDraft {
  const kind = level === 1 ? 'plus' : level === 2 ? 'double' : rng.pick(['plus', 'minus', 'double'] as const);
  const rule: Rule = kind === 'double' ? { kind } : { kind, n: rng.int(1, 5) };
  // Three different starting numbers. With "take away", each is big enough to take from.
  const lowest = rule.kind === 'minus' ? rule.n + 1 : 1;
  const starts = rng.sample(Array.from({ length: 9 }, (_, i) => lowest + i), 3) as [number, number, number];
  const [first, second, base] = starts;
  const examples = [first, second].map((from): [number, number] => [from, applied(rule, from)]);
  const answer = applied(rule, base);
  const [from, to] = hintPair(examples, answer);
  const stimulus = row(pairPicture(first, applied(rule, first)), pairPicture(second, applied(rule, second)), pairPicture(base, 'blank'));
  const common = { mode: 'look' as const, prompt: pairsPrompt(base), stimulus, explanation: ruleExplanation(rule, base, `How does ${from} change into ${to}?`) };
  if (level === 3) return { ...common, type: 'numberPad', facts: { examples, base }, answer, maxDigits: 2 };
  // The slips: the other rule, or the number the last example ended on.
  const other = rule.kind === 'double' ? base + (second as number) : base * 2;
  const values = numeralChoices(answer, [other, applied(rule, second)], 0, 40, rng);
  return { ...common, type: 'choice', facts: { examples, base, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

type HardRule = { kind: 'times'; n: number } | { kind: 'twoStep'; m: number };

const hardApplied = (rule: HardRule, value: number): number => (rule.kind === 'times' ? value * rule.n : value * 2 + rule.m);

function hardExplanation(rule: HardRule, base: number, hint: string): Explanation {
  const answer = hardApplied(rule, base);
  if (rule.kind === 'times') {
    return explained([line('Each number becomes', rule.n, 'times as big.'), line(base, 'times', rule.n, 'is', answer, '.')], pairPicture(base, answer), hint);
  }
  const m = Math.abs(rule.m);
  return explained(
    [line('Each number doubles, then goes', rule.m > 0 ? 'up' : 'down', 'by', m, '.'), line(base, 'doubles to', base * 2, '.'), line(base * 2, rule.m > 0 ? 'plus' : 'minus', m, 'is', answer, '.')],
    pairPicture(base, answer),
    hint,
  );
}

function hardAnalogy(rng: Rng): QuestionDraft {
  const rule: HardRule = rng.bool() ? { kind: 'times', n: rng.int(3, 5) } : { kind: 'twoStep', m: rng.pick([-3, -2, -1, 1, 2, 3]) };
  // Three different starting numbers. With "take away", each is bigger than what is taken away, so every
  // number grows and none stays the same (3 doubled, take away 3, is 3 again). Times starts from a number up to 5,
  // so the biggest is 5 times 5.
  const lowest = rule.kind === 'twoStep' && rule.m < 0 ? 1 - rule.m : 1;
  const count = rule.kind === 'times' ? 5 : 9;
  const [first, second, base] = rng.sample(Array.from({ length: count }, (_, i) => lowest + i), 3) as [number, number, number];
  const examples = [first, second].map((from): [number, number] => [from, hardApplied(rule, from)]);
  const answer = hardApplied(rule, base);
  // The hint points at the first move and leaves the rule to find: "How many 2s make 8?", "Double 4. Is that more or less than 5?"
  const [from, to] = hintPair(examples, answer);
  const hint = rule.kind === 'times' ? `How many ${from}s make ${to}?` : `Double ${from}. Is that more or less than ${to}?`;
  return {
    type: 'numberPad',
    mode: 'look',
    facts: { examples, base },
    prompt: pairsPrompt(base),
    stimulus: row(pairPicture(first, hardApplied(rule, first)), pairPicture(second, hardApplied(rule, second)), pairPicture(base, 'blank')),
    answer,
    maxDigits: 2,
    explanation: hardExplanation(rule, base, hint),
  };
}

const analogyOf = (level: Level, rng: Rng): QuestionDraft => (level === 4 ? hardAnalogy(rng) : numberAnalogy(level, rng));

function analogyLesson(): LessonStep[] {
  const plus: Rule = { kind: 'plus', n: 3 };
  const double: Rule = { kind: 'double' };
  const watch = ruleExplanation(plus, 6, 'How does 2 change into 5?');
  const reveal = ruleExplanation(double, 4, 'How does 3 change into 6?');
  return [
    { beat: 'see', text: 'A pair of numbers can follow a rule. 2 changes to 5: it goes up by 3.', speak: ['A pair of numbers can follow a rule.', { number: 2 }, 'changes to', { number: 5 }, ': it goes up by', { number: 3 }, '.'], visual: pairPicture(2, 5) },
    { beat: 'watch', text: watch.steps.join(' '), speak: watch.speak, visual: row(pairPicture(2, 5), pairPicture(4, 7), pairPicture(6, 9)) },
    {
      beat: 'try',
      text: pairsPrompt(4).text,
      speak: pairsPrompt(4).speak,
      visual: row(pairPicture(1, 2), pairPicture(3, 6), pairPicture(4, 'blank')),
      reveal: { text: reveal.steps.join(' '), speak: reveal.speak, visual: pairPicture(4, 8) },
    },
    { beat: 'remember', text: 'Find the rule that fits every pair.', speak: ['Find the rule that fits every pair.'], visual: row(pairPicture(2, 5), pairPicture(4, 7)) },
  ];
}

export const numberAnalogiesGenerator: SkillGenerator = {
  skillId: 'R-A8',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: analogyOf,
  exampleSeed: 88,
  example: () => analogyOf(1, makeRng(88)),
  lesson: analogyLesson,
  oracle: 'numberRule',
};

// ---- A.10 Number series ----
// Levels: plus 1 or plus 2 / plus 5, plus 10 or minus 1 / steps that alternate, typed /
// typed, with jumps that grow by the same amount each time, or each number 2 or 3 times the one before.
// Times 3 starts at 1, so the last number to work out is 27 times 3; four numbers are shown, because three
// (1, 3, 9) also fit jumps that grow.

const NEXT = 'What comes next?';

function seriesValues(start: number, steps: number[], length: number): number[] {
  const out = [start];
  for (let i = 0; i < length - 1; i += 1) out.push((out[i] as number) + (steps[i % steps.length] as number));
  return out;
}

const seriesRow = (values: number[], last: number | 'blank'): Visual => ({ kind: 'sequence', items: [...values.map((value) => numeral(value, 'l')), last === 'blank' ? 'blank' : numeral(last, 'l')] });

function seriesExplanation(start: number, steps: number[], shown: number, hint: string): Explanation {
  const values = seriesValues(start, steps, shown + 1);
  const answer = values[shown] as number;
  const way = (step: number): Say => [step > 0 ? 'up by' : 'down by', { number: Math.abs(step) }];
  const wayText = (step: number): string => `${step > 0 ? 'up' : 'down'} by ${Math.abs(step)}`;
  const [one, two] = steps as [number, number | undefined];
  const speak: Say = two === undefined ? ['The numbers go', ...way(one), '. Next is', { number: answer }, '.'] : ['The numbers go', ...way(one), ', then', ...way(two), ', again and again. Next is', { number: answer }, '.'];
  const line1 = two === undefined ? `The numbers go ${wayText(one)}.` : `The numbers go ${wayText(one)}, then ${wayText(two)}, again and again.`;
  return { speak, steps: [line1, `Next is ${answer}.`], visual: seriesRow(values.slice(0, shown), answer), hint: { text: hint } };
}

function numberSeries(level: Level, rng: Rng): QuestionDraft {
  let start: number;
  let steps: number[];
  let shown = 4;
  if (level === 1) {
    steps = [rng.int(1, 2)];
    start = rng.int(1, 10);
  } else if (level === 2) {
    const step = rng.pick([5, 10, -1]);
    steps = [step];
    // Counting by fives or tens starts on a five or a ten. Counting back starts high enough to stay above zero.
    start = step === -1 ? rng.int(6, 20) : step * rng.int(1, 5);
  } else {
    steps = rng.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3]]);
    start = rng.int(1, 9);
    shown = 5;
  }
  const values = seriesValues(start, steps, shown + 1);
  const answer = values[shown] as number;
  const hint = level === 3 ? 'Find each jump. Do the jumps take turns?' : 'How much does it go up or down each time?';
  const common = { mode: 'look' as const, prompt: { text: NEXT, speak: [NEXT] as Say }, stimulus: seriesRow(values.slice(0, shown), 'blank'), explanation: seriesExplanation(start, steps, shown, hint) };
  if (level === 3) return { ...common, type: 'numberPad', facts: { start, steps, blankIndex: shown }, answer, maxDigits: 3 };
  // The slips: one step too few or too many, or counting on by one.
  const last = values[shown - 1] as number;
  const options = numeralChoices(answer, [last, answer + (steps[0] as number), last + 1], 0, 200, rng);
  return { ...common, type: 'choice', facts: { start, steps, blankIndex: shown, options }, options: options.map((value) => numeral(value)), answerIndex: options.indexOf(answer) };
}

const GROWING_HINT = 'Find the jump from each number to the next.';
// Each number 2 or 3 times the one before: [factor, start].
const TIMES: readonly (readonly [number, number])[] = [[2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [3, 1]];

function growingSeries(rng: Rng): QuestionDraft {
  if (rng.bool()) {
    // The jumps grow: up by 2, then 3, then 4.
    const start = rng.int(1, 9);
    const first = rng.int(1, 3);
    const grow = rng.int(1, 2);
    const shown = 5;
    const jumps = Array.from({ length: shown }, (_, i) => first + grow * i);
    const values = jumps.reduce((out, jump) => [...out, (out.at(-1) as number) + jump], [start]);
    const answer = values[shown] as number;
    const seen = jumps.slice(0, shown - 1);
    const next = jumps[shown - 1] as number;
    const speak: Say = ['The jumps go', ...seen.flatMap((jump, i): Say => (i === 0 ? [{ number: jump }] : [',', { number: jump }])), '.', 'The next jump is', { number: next }, ', so next is', { number: answer }, '.'];
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { start, steps: [first], grow, rule: 'grow', blankIndex: shown },
      prompt: { text: NEXT, speak: [NEXT] },
      stimulus: seriesRow(values.slice(0, shown), 'blank'),
      answer,
      maxDigits: 3,
      explanation: { speak, steps: [`The jumps go ${seen.join(', ')}.`, `The next jump is ${next}, so next is ${answer}.`], visual: seriesRow(values.slice(0, shown), answer), hint: { text: GROWING_HINT } },
    };
  }
  const [factor, start] = rng.pick(TIMES) as readonly [number, number];
  const shown = 4;
  const values = Array.from({ length: shown + 1 }, (_, i) => start * factor ** i);
  const answer = values[shown] as number;
  const rule = factor === 2 ? 'Each number is double the one before.' : 'Each number is 3 times the one before.';
  const ruleSay: Say = factor === 2 ? [rule] : ['Each number is', { number: 3 }, 'times the one before.'];
  return {
    type: 'numberPad',
    mode: 'look',
    facts: { start, steps: [factor], rule: 'times', blankIndex: shown },
    prompt: { text: NEXT, speak: [NEXT] },
    stimulus: seriesRow(values.slice(0, shown), 'blank'),
    answer,
    maxDigits: 3,
    explanation: { speak: [...ruleSay, 'Next is', { number: answer }, '.'], steps: [rule, `Next is ${answer}.`], visual: seriesRow(values.slice(0, shown), answer), hint: { text: GROWING_HINT } },
  };
}

const seriesOf = (level: Level, rng: Rng): QuestionDraft => (level === 4 ? growingSeries(rng) : numberSeries(level, rng));

function seriesLesson(): LessonStep[] {
  const hint = 'How much does it go up or down each time?';
  return [
    { beat: 'see', text: 'Numbers in a row can jump by the same amount each time.', speak: ['Numbers in a row can jump by the same amount each time.'], visual: seriesRow([2, 4, 6], 8) },
    { beat: 'watch', text: seriesExplanation(2, [2], 4, hint).steps.join(' '), speak: seriesExplanation(2, [2], 4, hint).speak, visual: seriesExplanation(2, [2], 4, hint).visual ?? seriesRow([2, 4, 6, 8], 10) },
    {
      beat: 'try',
      text: NEXT,
      speak: [NEXT],
      visual: seriesRow([5, 10, 15, 20], 'blank'),
      reveal: { text: seriesExplanation(5, [5], 4, hint).steps.join(' '), speak: seriesExplanation(5, [5], 4, hint).speak, visual: seriesRow([5, 10, 15, 20], 25) },
    },
    { beat: 'remember', text: 'Find the jump.', speak: ['Find the jump.'], visual: seriesRow([2, 4, 6], 8) },
  ];
}

export const numberSeriesGenerator: SkillGenerator = {
  skillId: 'R-A10',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: seriesOf,
  exampleSeed: 90,
  example: () => seriesOf(1, makeRng(90)),
  lesson: seriesLesson,
  oracle: 'series',
};

// ---- A.11 Number puzzles ----
// Levels: balance scale, 3 and blank balance 5 / both pans hold sums / typed /
// typed, with two or three empty boxes that hold the same number (oracle: balance).
// The empty box is always on the left, so the steps name the right side and add up both sides.

const SAME = 'Which number makes both sides the same?';
const SAME_TYPED = 'What number makes both sides the same?';

// "The right side is 8." or "On the right, 5 and 4 make 9."
const rightSide = (right: readonly number[], total: number): Line => (right.length === 1 ? line('The right side is', total, '.') : line('On the right,', right[0] as number, 'and', right[1] as number, 'make', total, '.'));

function scaleExplanation(a: number, right: number[]): Explanation {
  const total = right.reduce((sum, value) => sum + value, 0);
  const b = total - a;
  return explained([rightSide(right, total), line(a, 'and', b, 'make', total, ', so the box is', b, '.')], { kind: 'scale', left: [a, b], right }, 'How much is on the right side?');
}

function numberPuzzle(level: Level, rng: Rng): QuestionDraft {
  // Level 1: one block on the right. Level 2: two. Level 3: either, typed.
  const sums = level === 2 || (level === 3 && rng.bool());
  const total = sums ? rng.int(4, 12) : rng.int(3, 10);
  const a = rng.int(1, total - 1);
  const b = total - a;
  let right = [total];
  if (sums) {
    // The right side is a different split of the same total, so the answer cannot be read straight off it.
    const first = rng.pick(Array.from({ length: total - 1 }, (_, i) => i + 1).filter((value) => value !== a && value !== b));
    right = [first, total - first];
  }
  const facts = { a, b, total, blank: 'b', right };
  const prompt = level === 3 ? SAME_TYPED : SAME;
  const common = { mode: 'look' as const, prompt: { text: prompt, speak: [prompt] as Say }, stimulus: { kind: 'scale', left: [a, 'blank'], right } as Visual, explanation: scaleExplanation(a, right) };
  if (level === 3) return { ...common, type: 'numberPad', facts, answer: b, maxDigits: 2 };
  // The slips: adding the two sides, or a number already on the scale.
  const values = numeralChoices(b, [a, total, total + a], 0, 24, rng, [1, 1, 2]);
  return { ...common, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(b) };
}

const SAME_BOXES = 'Each empty box holds the same number. What number is it?';

function sameBoxes(rng: Rng): QuestionDraft {
  const copies = rng.int(2, 3);
  const x = rng.int(2, 9);
  const known = rng.bool() ? rng.int(1, 9) : 0;
  const total = known + copies * x;
  let right = [total];
  if (rng.bool()) {
    // Two blocks on the right, neither of them the answer.
    const first = rng.pick(Array.from({ length: total - 1 }, (_, i) => i + 1).filter((value) => value !== x && total - value !== x));
    right = [first, total - first];
  }
  const left: (number | 'blank')[] = [...(known > 0 ? [known] : []), ...Array.from({ length: copies }, () => 'blank' as const)];
  const rest = total - known;
  const lines: Line[] = [
    rightSide(right, total),
    ...(known > 0 ? [line('Take away the', known, 'on the left. That leaves', rest, '.')] : []),
    line(copies, 'boxes make', rest, ', so each box is', x, '.'),
  ];
  return {
    type: 'numberPad',
    mode: 'look',
    facts: { oracle: 'balance', left, right },
    prompt: { text: SAME_BOXES, speak: [SAME_BOXES] },
    stimulus: { kind: 'scale', left, right },
    answer: x,
    maxDigits: 1,
    explanation: explained(lines, { kind: 'scale', left: left.map((value) => (value === 'blank' ? x : value)), right }, 'How much must the empty boxes make together?'),
  };
}

const puzzleOf = (level: Level, rng: Rng): QuestionDraft => (level === 4 ? sameBoxes(rng) : numberPuzzle(level, rng));

function puzzleLesson(): LessonStep[] {
  return [
    { beat: 'see', text: 'A scale is level when both sides are the same amount.', speak: ['A scale is level when both sides are the same amount.'], visual: { kind: 'scale', left: [2, 3], right: [5] } },
    { beat: 'watch', text: scaleExplanation(3, [5]).steps.join(' '), speak: scaleExplanation(3, [5]).speak, visual: { kind: 'scale', left: [3, 'blank'], right: [5] } },
    {
      beat: 'try',
      text: SAME,
      speak: [SAME],
      visual: { kind: 'scale', left: [4, 'blank'], right: [6] },
      reveal: { text: scaleExplanation(4, [6]).steps.join(' '), speak: scaleExplanation(4, [6]).speak, visual: { kind: 'scale', left: [4, 2], right: [6] } },
    },
    { beat: 'remember', text: 'Both sides must be the same.', speak: ['Both sides must be the same.'], visual: { kind: 'scale', left: [2, 3], right: [5] } },
  ];
}

export const numberPuzzlesGenerator: SkillGenerator = {
  skillId: 'R-A11',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: puzzleOf,
  exampleSeed: 91,
  example: () => puzzleOf(1, makeRng(91)),
  lesson: puzzleLesson,
  oracle: 'missing',
};
