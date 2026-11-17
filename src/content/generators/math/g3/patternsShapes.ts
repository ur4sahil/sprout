import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Blank, LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { shape } from '../pk/parts';
import { fractionSay, fractionText } from './fractions';
import { bigNumeral, written } from './numbers';

// Math grade 3 A.5 number patterns, C.7 times multiples of 10, G.1 quadrilaterals, G.2 equal-area parts.

type Explanation = { speak: Say; steps: string[]; visual: Visual };

// ---- A.5 Number patterns ----
// Levels: count on by 2, 5 or 10 / by 3, 4, 6 or 25, up or down / by 50 or 100 to 1,000, typed. Oracle: sequence.

function patternVisual(start: number, step: number, length: number, blankIndex: number, filled: boolean): Visual {
  return { kind: 'sequence', items: Array.from({ length }, (_, i): Visual | Blank => (i === blankIndex && !filled ? 'blank' : bigNumeral(start + step * i, 'l'))) };
}

function patternExplanation(start: number, step: number, length: number, blankIndex: number): Explanation {
  const value = start + step * blankIndex;
  const verb = step > 0 ? 'goes up' : 'goes down';
  const size = Math.abs(step);
  return {
    speak: ['Each number', verb, 'by', { number: size }, '. The missing number is', { number: value }, '.'],
    steps: [`Each number ${verb} by ${size}.`, `The missing number is ${written(value)}.`],
    visual: patternVisual(start, step, length, blankIndex, true),
  };
}

function numberPatterns(level: Level, rng: Rng): QuestionDraft {
  const length = 5;
  const size = level === 1 ? rng.pick([2, 5, 10]) : level === 2 ? rng.pick([3, 4, 6, 25]) : rng.pick([50, 100]);
  const down = level > 1 && rng.bool(0.4);
  const step = down ? -size : size;
  const span = size * (length - 1);
  const top = level === 3 ? 1000 : level === 2 ? 300 : 100;
  // Every number in the row is a multiple of the step, so the row is one a child counts by.
  const lowest = rng.int(0, Math.floor((top - span) / size)) * size;
  const start = down ? lowest + span : lowest;
  const blankIndex = rng.int(1, length - 1);
  const value = start + step * blankIndex;
  const facts = { start, step, length, blankIndex };
  const prompt = { text: 'What number is missing?', speak: ['What number is missing?'] as Say };
  const base = { mode: 'look' as const, prompt, stimulus: patternVisual(start, step, length, blankIndex, false), explanation: patternExplanation(start, step, length, blankIndex) };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer: value, maxDigits: 4 };
  // The slips: one step too far, one too few, or one more than the answer.
  const values = numeralChoices(value, [value + step, value - step, value + 1, value - 1], 0, 1000, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((each) => bigNumeral(each, 'l')), answerIndex: values.indexOf(value) };
}

export const patterns3Generator: SkillGenerator = {
  skillId: 'M-3-A5',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: numberPatterns,
  exampleSeed: 361,
  example: () => numberPatterns(1, makeRng(361)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'In a number pattern, each number changes by the same amount.', speak: ['In a number pattern, each number changes by the same amount.'], visual: patternVisual(20, 5, 5, 3, true) },
    { beat: 'watch', text: patternExplanation(20, 5, 5, 3).steps.join(' '), speak: patternExplanation(20, 5, 5, 3).speak, visual: patternExplanation(20, 5, 5, 3).visual },
    { beat: 'try', text: 'What number is missing?', speak: ['What number is missing?'], visual: patternVisual(400, -100, 5, 2, false), reveal: { text: patternExplanation(400, -100, 5, 2).steps.join(' '), speak: patternExplanation(400, -100, 5, 2).speak, visual: patternExplanation(400, -100, 5, 2).visual } },
    { beat: 'remember', text: 'Find how much each number changes, then keep going.', speak: ['Find how much each number changes, then keep going.'], visual: patternVisual(20, 5, 5, 3, true) },
  ],
  oracle: 'sequence',
};

// ---- C.7 Times multiples of 10 ----
// Levels: 3 × 20 with tens rods / 3 × 40 / typed, up to 9 × 90. Oracle: multiply.

function tensExplanation(a: number, tens: number): Explanation {
  const b = tens * 10;
  return {
    speak: [{ number: a }, 'times', { number: b }, 'is', { number: a }, 'times', { number: tens }, 'tens.', { number: a }, 'times', { number: tens }, 'is', { number: a * tens }, ', so it is', { number: a * tens }, 'tens, or', { number: a * b }, '.'],
    steps: [`${b} is ${tens} tens.`, `${a} × ${tens} = ${a * tens}, so ${a} × ${b} is ${a * tens} tens.`, `${a} × ${b} = ${written(a * b)}.`],
    visual: { kind: 'equation', parts: [a, '×', b, '=', a * b] },
  };
}

function timesTens(level: Level, rng: Rng): QuestionDraft {
  const a = rng.int(2, level === 1 ? 5 : 9);
  const tens = rng.int(level === 1 ? 1 : 2, level === 1 ? 4 : 9);
  const b = tens * 10;
  const answer = a * b;
  const facts = { rows: a, cols: b, ask: 'total' };
  const prompt = { text: `${a} × ${b} equals what?`, speak: [{ number: a }, 'times', { number: b }, 'equals what?'] as Say };
  const stimulus: Visual = level === 1 ? { kind: 'row', children: Array.from({ length: a }, (): Visual => ({ kind: 'baseTen', hundreds: 0, tens, ones: 0 })) } : { kind: 'equation', parts: [a, '×', b, '=', 'blank'] };
  const base = { mode: 'look' as const, prompt, stimulus, explanation: tensExplanation(a, tens) };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer, maxDigits: 3 };
  // The slips: forgetting the zero, or one ten too many or too few.
  const values = numeralChoices(answer, [a * tens, answer + 10, answer - 10, answer + a * 10, a + b], 1, 1000, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(answer) };
}

export const timesTensGenerator: SkillGenerator = {
  skillId: 'M-3-C7',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: timesTens,
  exampleSeed: 362,
  example: () => timesTens(1, makeRng(362)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: '30 is 3 tens. So 4 × 30 is 4 × 3 tens.', speak: ['Thirty is three tens. So four times thirty is four times three tens.'], visual: { kind: 'row', children: Array.from({ length: 4 }, (): Visual => ({ kind: 'baseTen', hundreds: 0, tens: 3, ones: 0 })) } },
    { beat: 'watch', text: tensExplanation(4, 3).steps.join(' '), speak: tensExplanation(4, 3).speak, visual: tensExplanation(4, 3).visual },
    { beat: 'try', text: '6 × 50 equals what?', speak: [{ number: 6 }, 'times', { number: 50 }, 'equals what?'], visual: { kind: 'equation', parts: [6, '×', 50, '=', 'blank'] }, reveal: { text: tensExplanation(6, 5).steps.join(' '), speak: tensExplanation(6, 5).speak, visual: tensExplanation(6, 5).visual } },
    { beat: 'remember', text: 'Multiply the tens, then write a zero.', speak: ['Multiply the tens, then write a zero.'], visual: tensExplanation(4, 3).visual },
  ],
  oracle: 'multiply',
};

// ---- G.1 Quadrilaterals ----
// Levels: which is a quadrilateral / which is not / name it from its sides and corners. Oracle: quadrilateral.

const FOUR: ShapeName[] = ['square', 'rectangle', 'diamond', 'trapezoid'];
const OTHER: ShapeName[] = ['triangle', 'pentagon', 'hexagon', 'circle'];
// Level 3 leaves out the diamond: the app draws it as a square on its corner, so its corners are square too.
const CLUED = ['square', 'rectangle', 'trapezoid'] as const;
type Clued = (typeof CLUED)[number];
const CLUES: Record<Clued, { text: string; speak: string; equalSides: boolean; squareCorners: boolean }> = {
  square: { text: '4 equal sides and 4 square corners', speak: 'four equal sides and four square corners', equalSides: true, squareCorners: true },
  rectangle: { text: '4 square corners, and 2 sides longer than the other 2', speak: 'four square corners, and two sides longer than the other two', equalSides: false, squareCorners: true },
  trapezoid: { text: 'only 2 sides that run side by side, and they are not the same length', speak: 'only two sides that run side by side, and they are not the same length', equalSides: false, squareCorners: false },
};

function quadrilaterals(level: Level, rng: Rng): QuestionDraft {
  const color = rng.pick(['blue', 'green', 'orange', 'purple'] as const);
  if (level === 3) {
    const right = rng.pick(CLUED);
    const choices = rng.shuffle([...CLUED]);
    const clue = CLUES[right];
    return {
      type: 'choice',
      mode: 'read',
      facts: { ask: 'clue', equalSides: clue.equalSides, squareCorners: clue.squareCorners, options: [...choices], read: clue.text },
      prompt: { text: `A shape has ${clue.text}. Which shape is it?`, speak: ['Read the clue. Which shape is it?'] },
      options: choices.map((each): Visual => ({ kind: 'text', value: each, size: 'l' })),
      answerIndex: choices.indexOf(right),
      explanation: { speak: [`A ${right} has ${clue.speak}.`], steps: [`A ${right} has ${clue.text}.`], visual: shape(right, color, 'l') },
    };
  }
  const not = level === 2;
  const right = not ? rng.pick(OTHER) : rng.pick(FOUR);
  const rest = not ? rng.sample(FOUR, 2) : rng.sample(OTHER, 2);
  const choices = rng.shuffle([right, ...rest]);
  const prompt = not ? 'Which shape is not a quadrilateral?' : 'Which shape is a quadrilateral?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { shapes: choices, ask: not ? 'notFour' : 'four', options: choices },
    prompt: { text: prompt, speak: [prompt] },
    options: choices.map((each) => ({ ...shape(each, color, 'm'), speak: [each] }) as Visual),
    answerIndex: choices.indexOf(right),
    explanation: {
      speak: ['A quadrilateral has four sides.', not ? `The ${right} does not.` : `The ${right} does.`],
      steps: ['A quadrilateral has 4 straight sides.', not ? `The ${right} does not have 4 sides.` : `The ${right} has 4 sides.`],
      visual: shape(right, color, 'l'),
    },
  };
}

export const quadrilateralsGenerator: SkillGenerator = {
  skillId: 'M-3-G1',
  // Level 3 has one clue for each of the three shapes.
  pool: { 3: 3 },
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: quadrilaterals,
  exampleSeed: 363,
  example: () => quadrilaterals(1, makeRng(363)),
  lesson: (): LessonStep[] => {
    const four: Visual = { kind: 'row', children: FOUR.map((each) => shape(each, 'blue', 's')) };
    return [
      { beat: 'see', text: 'A quadrilateral is any shape with 4 straight sides.', speak: ['A quadrilateral is any shape with four straight sides.'], visual: four },
      { beat: 'watch', text: 'Squares, rectangles, diamonds and trapezoids all have 4 sides. They are all quadrilaterals.', speak: ['Squares, rectangles, diamonds and trapezoids all have four sides. They are all quadrilaterals.'], visual: four },
      { beat: 'try', text: 'Is a triangle a quadrilateral?', speak: ['Is a triangle a quadrilateral?'], visual: shape('triangle', 'green', 'l'), reveal: { text: 'No. A triangle has 3 sides.', speak: ['No. A triangle has three sides.'], visual: shape('triangle', 'green', 'l') } },
      { beat: 'remember', text: 'Quad means four: 4 sides, 4 corners.', speak: ['Quad means four: four sides, four corners.'], visual: four },
    ];
  },
  oracle: 'quadrilateral',
};

// ---- G.2 Equal-area parts ----
// Levels: what fraction is each part / which shape shows fourths / how many parts make the whole. Oracles: fractionValue, fraction.

function partsExplanation(d: number, form: 'circle' | 'rectangle'): Explanation {
  return {
    speak: ['The shape is cut into', { number: d }, 'equal parts. Each part is', ...fractionSay(1, d), 'of the shape.'],
    steps: [`The shape is cut into ${d} equal parts.`, `Each part is ${fractionText(1, d)} of the whole shape.`],
    visual: { kind: 'fraction', shape: form, parts: d, shaded: 1, equal: true },
  };
}

function equalParts(level: Level, rng: Rng): QuestionDraft {
  const d = rng.pick([2, 3, 4, 6, 8]);
  const form = rng.pick<'circle' | 'rectangle'>(['circle', 'rectangle']);
  if (level === 2) {
    // Which shape is cut into equal parts: the others have the same number of parts, unequal, or a different number.
    const n = rng.pick([2, 3, 4]);
    const options: Visual[] = [
      { kind: 'fraction', shape: form, parts: n, shaded: 0, equal: true },
      { kind: 'fraction', shape: form, parts: n, shaded: 0, equal: false },
      { kind: 'fraction', shape: form === 'circle' ? 'rectangle' : 'circle', parts: n, shaded: 0, equal: false },
    ];
    const order = rng.shuffle([0, 1, 2]);
    const name = ({ 2: 'halves', 3: 'thirds', 4: 'fourths' } as Record<number, string>)[n] as string;
    return {
      type: 'choice',
      mode: 'look',
      facts: { parts: n, equal: true, ask: 'equal', oracle: 'fraction', options: order.map((i) => i === 0) },
      prompt: { text: `Which shape is cut into ${name}?`, speak: [`Which shape is cut into ${name}?`] },
      options: order.map((i) => options[i] as Visual),
      answerIndex: order.indexOf(0),
      explanation: { speak: [`To be ${name}, every part must be the same size.`, 'Only one shape has equal parts.'], steps: [`To be ${name}, every part must be the same size.`, 'Only one shape is cut into equal parts.'], visual: options[0] as Visual },
    };
  }
  const stimulus: Visual = { kind: 'fraction', shape: form, parts: d, shaded: 1, equal: true };
  if (level === 3) {
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { n: 1, d, ask: 'parts', oracle: 'fractionValue' },
      prompt: { text: `Each part is ${fractionText(1, d)} of the shape. How many parts make the whole shape?`, speak: ['Each part is', ...fractionSay(1, d), 'of the shape. How many parts make the whole shape?'] },
      answer: d,
      maxDigits: 1,
      explanation: { speak: [...fractionSay(1, d), 'means one of', { number: d }, 'equal parts. So', { number: d }, 'parts make the whole.'], steps: [`${fractionText(1, d)} is 1 of ${d} equal parts.`, `${d} parts make the whole.`], visual: { kind: 'fraction', shape: form, parts: d, shaded: d, equal: true } },
    };
  }
  // The slips: one part too many or too few, or counting the parts that are not shaded.
  const pool: [number, number][] = [[1, d + 1], [1, d === 2 ? 4 : d - 1], [d === 2 ? 2 : d - 1, d]];
  const choices = rng.shuffle([[1, d] as [number, number], ...rng.sample(pool, 2)]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { n: 1, d, ask: 'name', oracle: 'fractionValue', options: choices.map(([x, y]) => fractionText(x, y)) },
    prompt: { text: 'Each part has the same area. What fraction of the shape is the shaded part?', speak: ['Each part has the same area. What fraction of the shape is the shaded part?'] },
    stimulus,
    options: choices.map(([x, y]): Visual => ({ kind: 'text', value: fractionText(x, y), size: 'l', speak: fractionSay(x, y) })),
    answerIndex: choices.findIndex(([x, y]) => x === 1 && y === d),
    explanation: partsExplanation(d, form),
  };
}

export const equalAreaGenerator: SkillGenerator = {
  skillId: 'M-3-G2',
  // Levels with fewer than eight different questions: there are only so many fractions with these parts.
  pool: { 1: 5, 2: 3, 3: 5 },
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: equalParts,
  exampleSeed: 364,
  example: () => equalParts(1, makeRng(364)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'When a shape is cut into equal parts, each part is a fraction of the whole.', speak: ['When a shape is cut into equal parts, each part is a fraction of the whole.'], visual: { kind: 'fraction', shape: 'rectangle', parts: 4, shaded: 1, equal: true } },
    { beat: 'watch', text: partsExplanation(4, 'rectangle').steps.join(' '), speak: partsExplanation(4, 'rectangle').speak, visual: partsExplanation(4, 'rectangle').visual },
    { beat: 'try', text: 'What fraction of the circle is one part?', speak: ['What fraction of the circle is one part?'], visual: { kind: 'fraction', shape: 'circle', parts: 6, shaded: 1, equal: true }, reveal: { text: partsExplanation(6, 'circle').steps.join(' '), speak: partsExplanation(6, 'circle').speak, visual: partsExplanation(6, 'circle').visual } },
    { beat: 'remember', text: 'Equal parts: each one is 1 over the number of parts.', speak: ['Equal parts: each one is one over the number of parts.'], visual: partsExplanation(4, 'rectangle').visual },
  ],
  oracle: 'fractionValue',
};
