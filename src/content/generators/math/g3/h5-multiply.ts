import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { STORY_COUNTABLES } from '../../../data/countables';
import { ESTIMATE_STORIES } from '../../../data/h5-stories';
import { STORY_NAMES } from '../../../data/storyProblems';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { tellStory } from './h5-addSubtract';
import type { Explanation, Prompt } from './h5-parts';
import { equation, fill, find, numberAnswer, sentenceOption, sentencePicture, sentenceSay } from './h5-parts';

// Math grade 3, wave H5: C.8 properties of multiplication, C.9 the distributive property, C.10 multiplication
// word problems, C.11 patterns in the times table, C.12 estimate products, D.4 division word problems,
// D.5 missing numbers in division.

const times = (a: number, b: number): Say => [{ number: a }, 'times', { number: b }];
const array = (rows: number, cols: number, emoji: string): Visual => ({ kind: 'array', rows, cols, emoji });
const groupsPicture = (groups: number, each: number, emoji: string): Visual => ({ kind: 'row', children: Array.from({ length: groups }, (): Visual => ({ kind: 'emojiGroup', emoji, count: each, layout: 'dice' })) });
const blankAsk = (sentence: string): Prompt => ({ text: `${sentence}. What number goes in the blank?`, speak: [...sentenceSay(sentence), '. What number goes in the blank?'] });

// ---- C.8 Properties of multiplication ----
// Levels: times 1 and times 0 / grouping three factors either way / the missing number in a property, typed.
// Oracle: expression3.

function onesZerosExplanation(a: number, other: 0 | 1): Explanation {
  if (other === 0) {
    return { speak: ['Any number times zero is zero. Groups with nothing in them make nothing.'], steps: ['Any number times 0 is 0.', `${a} × 0 = 0 and 0 × ${a} = 0.`], visual: equation(a, '×', 0, '=', 0) };
  }
  return { speak: ['Any number times one is that same number. One group of', { number: a }, 'is', { number: a }, '.'], steps: ['Any number times 1 is that same number.', `${a} × 1 = ${a} and 1 × ${a} = ${a}.`], visual: equation(a, '×', 1, '=', a) };
}

function groupingExplanation(a: number, b: number, c: number): Explanation {
  return {
    speak: ['You can group the factors either way. The product stays the same:', { number: a * b * c }, '.'],
    steps: ['Group the factors either way. The product stays the same.', `(${a} × ${b}) × ${c} = ${a * b} × ${c} = ${a * b * c}.`, `${a} × (${b} × ${c}) = ${a} × ${b * c} = ${a * b * c}.`],
    visual: sentencePicture(`(${a} × ${b}) × ${c} = ${a} × (${b} × ${c})`),
  };
}

function properties(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    // A third of the questions are times 0, so the answer 0, which always sits first, is not too common.
    const other: 0 | 1 = rng.int(0, 2) === 0 ? 0 : 1;
    const a = rng.int(2, 10);
    const sentence = rng.bool() ? `${a} × ${other}` : `${other} × ${a}`;
    const answer = other === 0 ? 0 : a;
    const values = other === 0 ? numeralChoices(0, [1, a], 0, 20, rng) : numeralChoices(a, [a + 1, a - 1, 1, 0], 0, 20, rng, [0, 1, 1]);
    return {
      type: 'choice',
      mode: 'look',
      facts: { expr: sentence, ask: 'value', options: values },
      prompt: { text: `${sentence} equals what?`, speak: [...sentenceSay(sentence), 'equals what?'] },
      stimulus: sentencePicture(`${sentence} = □`),
      options: values.map((value) => numeral(value, 'l')),
      answerIndex: values.indexOf(answer),
      explanation: onesZerosExplanation(a, other),
    };
  }
  if (level === 2) {
    const [a, b, c] = [rng.int(2, 5), rng.int(2, 5), rng.int(2, 5)];
    const leftFirst = rng.bool();
    const shown = leftFirst ? `(${a} × ${b}) × ${c}` : `${a} × (${b} × ${c})`;
    const right = leftFirst ? `${a} × (${b} × ${c})` : `(${a} × ${b}) × ${c}`;
    // The slips: a times sign read as plus, or the brackets dropped so a sign changes. Never one worth the same.
    const worth: Record<string, number> = { [`(${a} + ${b}) × ${c}`]: (a + b) * c, [`${a} × ${b} + ${c}`]: a * b + c, [`${a} × (${b} + ${c})`]: a * (b + c), [`${a} + (${b} × ${c})`]: a + b * c };
    const slips = Object.keys(worth).filter((slip) => worth[slip] !== a * b * c);
    const choices = rng.shuffle([right, ...rng.sample(slips, 2)]);
    return {
      type: 'choice',
      mode: 'look',
      facts: { expr: shown, ask: 'equal', options: choices },
      prompt: { text: `${shown} is the same as which?`, speak: [...sentenceSay(shown), ', is the same as which?'] },
      stimulus: sentencePicture(shown),
      options: choices.map((choice) => sentenceOption(choice)),
      answerIndex: choices.indexOf(right),
      explanation: groupingExplanation(a, b, c),
    };
  }
  const form = rng.pick(['order', 'order', 'group', 'group', 'one', 'zero'] as const);
  const [a, b] = find((): [number, number] => [rng.int(2, 9), rng.int(2, 9)], ([x, y]) => x !== y);
  const c = rng.int(2, 5);
  const sentence = form === 'order' ? `□ × ${a} = ${a} × ${b}` : form === 'group' ? `(${a} × ${c}) × ${b} = ${a} × (□ × ${b})` : form === 'one' ? `${a} × □ = ${a}` : `□ × ${a} = 0`;
  const answer = form === 'order' ? b : form === 'group' ? c : form === 'one' ? 1 : 0;
  const explanation: Explanation =
    form === 'order'
      ? { speak: ['Turning the factors round does not change the product.', ...times(b, a), 'is the same as', ...times(a, b), '.'], steps: ['Turning the factors round does not change the product.', `${b} × ${a} = ${a} × ${b}.`, `The blank is ${b}.`], visual: equation(b, '×', a, '=', a, '×', b) }
      : form === 'group'
        ? { speak: ['Grouping the factors another way does not change the product. The same three factors are on both sides, so the blank is', { number: c }, '.'], steps: ['Grouping the factors another way does not change the product.', `Both sides use ${a}, ${c} and ${b}.`, `The blank is ${c}.`], visual: sentencePicture(`(${a} × ${c}) × ${b} = ${a} × (${c} × ${b})`) }
        : onesZerosExplanation(a, form === 'one' ? 1 : 0);
  return { type: 'numberPad', mode: 'look', facts: { expr: sentence, ask: 'missing' }, prompt: blankAsk(sentence), stimulus: sentencePicture(sentence), answer, maxDigits: 2, explanation };
}

export const propertiesGenerator: SkillGenerator = {
  skillId: 'M-3-C8',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: properties,
  exampleSeed: 3108,
  example: () => properties(1, makeRng(3108)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Times 1 keeps a number the same. Times 0 makes 0. Grouping factors another way keeps the product the same.', speak: ['Times one keeps a number the same. Times zero makes zero. Grouping factors another way keeps the product the same.'], visual: equation(7, '×', 1, '=', 7) },
    { beat: 'watch', text: groupingExplanation(2, 3, 4).steps.join(' '), speak: groupingExplanation(2, 3, 4).speak, visual: groupingExplanation(2, 3, 4).visual },
    { beat: 'try', text: '0 × 8 equals what?', speak: [...times(0, 8), 'equals what?'], visual: equation(0, '×', 8, '=', 'blank'), reveal: { text: onesZerosExplanation(8, 0).steps.join(' '), speak: onesZerosExplanation(8, 0).speak, visual: onesZerosExplanation(8, 0).visual } },
    { beat: 'remember', text: 'The order and the grouping of factors do not change the product.', speak: ['The order and the grouping of factors do not change the product.'], visual: equation(3, '×', 5, '=', 5, '×', 3) },
  ],
  oracle: 'expression3',
};

// ---- C.9 The distributive property ----
// Levels: split an array's rows: pick the matching sum / the missing factor in a split / the missing product, typed.
// Oracle: expression3.

function splitExplanation(rows: number, cols: number, emoji: string): Explanation {
  const rest = rows - 5;
  return {
    speak: ['Split the', { number: rows }, 'rows into', { number: 5 }, 'rows and', { number: rest }, 'rows.', ...times(5, cols), 'is', { number: 5 * cols }, '.', ...times(rest, cols), 'is', { number: rest * cols }, '. Together they make', { number: rows * cols }, '.'],
    steps: [`Split ${rows} rows into 5 rows and ${rest} rows.`, `5 × ${cols} = ${5 * cols}. ${rest} × ${cols} = ${rest * cols}.`, `${5 * cols} + ${rest * cols} = ${rows * cols}, so ${rows} × ${cols} = ${rows * cols}.`],
    visual: { kind: 'row', children: [array(5, cols, emoji), array(rest, cols, emoji)] },
  };
}

function splitFactorExplanation(a: number, b: number): Explanation {
  return {
    speak: ['Split', { number: b }, 'into', { number: 5 }, 'and', { number: b - 5 }, '.', ...times(a, 5), 'is', { number: a * 5 }, '.', ...times(a, b - 5), 'is', { number: a * (b - 5) }, '. Together they make', { number: a * b }, '.'],
    steps: [`Split ${b} into 5 and ${b - 5}.`, `${a} × 5 = ${a * 5}. ${a} × ${b - 5} = ${a * (b - 5)}.`, `${a * 5} + ${a * (b - 5)} = ${a * b}, so ${a} × ${b} = ${a * b}.`],
    visual: sentencePicture(`${a} × ${b} = (${a} × 5) + (${a} × ${b - 5})`),
  };
}

function distributive(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const [rows, cols] = [rng.int(6, 9), rng.int(2, 5)];
    const rest = rows - 5;
    const emoji = rng.pick(STORY_COUNTABLES).emoji;
    const right = `(5 × ${cols}) + (${rest} × ${cols})`;
    const worth: Record<string, number> = { [`(5 × ${cols}) + ${rest}`]: 5 * cols + rest, [`5 + (${rest} × ${cols})`]: 5 + rest * cols, [`(5 × ${cols}) + (${rest} × ${cols + 1})`]: 5 * cols + rest * (cols + 1), [`(5 × ${cols}) + (5 × ${cols})`]: 10 * cols };
    const slips = Object.keys(worth).filter((slip) => worth[slip] !== rows * cols);
    const choices = rng.shuffle([right, ...rng.sample(slips, 2)]);
    const ask = `Split the ${rows} rows into 5 rows and ${rest} rows. Which matches ${rows} × ${cols}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { expr: `${rows} × ${cols}`, ask: 'equal', emoji, options: choices },
      prompt: { text: ask, speak: ['Split the', { number: rows }, 'rows into', { number: 5 }, 'rows and', { number: rest }, 'rows. Which matches', ...times(rows, cols), '?'] },
      stimulus: array(rows, cols, emoji),
      options: choices.map((choice) => sentenceOption(choice, 'm')),
      answerIndex: choices.indexOf(right),
      explanation: splitExplanation(rows, cols, emoji),
    };
  }
  const [a, b] = [rng.int(3, 9), rng.int(6, 9)];
  if (level === 2) {
    // Either part of the split is missing.
    const firstMissing = rng.bool();
    const sentence = firstMissing ? `${a} × ${b} = (${a} × □) + (${a} × ${b - 5})` : `${a} × ${b} = (${a} × 5) + (${a} × □)`;
    const answer = firstMissing ? 5 : b - 5;
    return numberAnswer({ prompt: blankAsk(sentence), stimulus: sentencePicture(sentence), explanation: splitFactorExplanation(a, b) }, { expr: sentence, ask: 'missing' }, answer, [b, answer + 1, answer - 1, a, b - answer], false, rng, [1, 12]);
  }
  const sentence = `${a} × ${b} = ${a * 5} + □`;
  const prompt = { text: `${a} × ${b} is ${a} × 5 plus ${a} × ${b - 5}, and ${a} × 5 = ${a * 5}. What number goes in the blank?`, speak: [...times(a, b), 'is', ...times(a, 5), 'plus', ...times(a, b - 5), ', and', ...times(a, 5), 'is', { number: a * 5 }, '. What number goes in the blank?'] as Say };
  return { type: 'numberPad', mode: 'look', facts: { expr: sentence, ask: 'missing' }, prompt, stimulus: sentencePicture(sentence), answer: a * (b - 5), maxDigits: 2, explanation: splitFactorExplanation(a, b) };
}

export const distributiveGenerator: SkillGenerator = {
  skillId: 'M-3-C9',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: distributive,
  exampleSeed: 3109,
  example: () => distributive(1, makeRng(3109)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A big array can be split into two smaller ones. Their products add up to the big product.', speak: ['A big array can be split into two smaller ones. Their products add up to the big product.'], visual: array(7, 4, '🍓') },
    { beat: 'watch', text: splitExplanation(7, 4, '🍓').steps.join(' '), speak: splitExplanation(7, 4, '🍓').speak, visual: splitExplanation(7, 4, '🍓').visual },
    { beat: 'try', text: '6 × 8 is 6 × 5 plus 6 × 3. What is 6 × 8?', speak: [...times(6, 8), 'is', ...times(6, 5), 'plus', ...times(6, 3), '. What is', ...times(6, 8), '?'], visual: sentencePicture('6 × 8 = (6 × 5) + (6 × 3)'), reveal: { text: splitFactorExplanation(6, 8).steps.join(' '), speak: splitFactorExplanation(6, 8).speak, visual: splitFactorExplanation(6, 8).visual } },
    { beat: 'remember', text: 'Split a fact you do not know into two facts you do know, then add.', speak: ['Split a fact you do not know into two facts you do know, then add.'], visual: equation(7, '×', 4, '=', 20, '+', 8) },
  ],
  oracle: 'expression3',
};

// ---- C.10 Multiplication word problems ----
// Levels: equal groups or rows, with a picture / no picture, facts to 9 × 10 / typed. Oracle: multiply.

function storyTimesExplanation(kind: 'groups' | 'array', a: number, b: number, emoji: string): Explanation {
  const unit = kind === 'groups' ? 'groups' : 'rows';
  return {
    speak: ['There are', { number: a }, `${unit} with`, { number: b }, 'in each.', ...times(a, b), 'is', { number: a * b }, '.'],
    steps: [`There are ${a} ${unit} with ${b} in each.`, `${a} × ${b} = ${a * b}.`],
    visual: kind === 'groups' && b <= 6 ? groupsPicture(a, b, emoji) : kind === 'array' ? array(a, b, emoji) : equation(a, '×', b, '=', a * b),
  };
}

function multiplyStories(level: Level, rng: Rng): QuestionDraft {
  const kind = rng.pick(['groups', 'array'] as const);
  const a = rng.int(2, level === 1 ? 5 : 9);
  const b = rng.int(2, level === 1 ? 6 : 10);
  const { story, template, emoji } = tellStory(kind, a, b, rng);
  const stimulus = level === 1 ? (kind === 'groups' ? groupsPicture(a, b, emoji) : array(a, b, emoji)) : undefined;
  const p = a * b;
  return numberAnswer({ prompt: story, ...(stimulus ? { stimulus } : {}), explanation: storyTimesExplanation(kind, a, b, emoji) }, { rows: a, cols: b, ask: 'total', kind, template, story: story.text }, p, [a + b, p + a, p - a, p + b, p - b], level === 3, rng, [1, 100], 3);
}

export const multiplyStoriesGenerator: SkillGenerator = {
  skillId: 'M-3-C10',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables', 'h5-stories'],
  generate: multiplyStories,
  exampleSeed: 3110,
  example: () => multiplyStories(1, makeRng(3110)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'When a story has equal groups or equal rows, multiply.', speak: ['When a story has equal groups or equal rows, multiply.'], visual: groupsPicture(3, 4, '🍎') },
    { beat: 'watch', text: `Sam has 3 bags with 4 apples in each. ${storyTimesExplanation('groups', 3, 4, '🍎').steps.join(' ')}`, speak: ['Sam has', { number: 3 }, 'bags with', { number: 4 }, 'apples in each.', ...storyTimesExplanation('groups', 3, 4, '🍎').speak], visual: storyTimesExplanation('groups', 3, 4, '🍎').visual },
    { beat: 'try', text: 'Mia lines up cars in 5 rows, with 6 in each row. How many cars are there?', speak: ['Mia lines up cars in', { number: 5 }, 'rows, with', { number: 6 }, 'in each row. How many cars are there?'], visual: array(5, 6, '🚗'), reveal: { text: storyTimesExplanation('array', 5, 6, '🚗').steps.join(' '), speak: storyTimesExplanation('array', 5, 6, '🚗').speak, visual: storyTimesExplanation('array', 5, 6, '🚗').visual } },
    { beat: 'remember', text: 'Number of groups times the number in each group.', speak: ['Number of groups times the number in each group.'], visual: equation(3, '×', 4, '=', 12) },
  ],
  oracle: 'multiply',
};

// ---- C.11 Patterns in the times table ----
// Levels: is the product even or odd / which product is odd (or even) / one more or one fewer group. Oracle: expression3.

const ODD = [3, 5, 7, 9];
const EVEN = [2, 4, 6, 8, 10];

function parityExplanation(a: number, b: number): Explanation {
  const p = a * b;
  if (p % 2 === 1) return { speak: ['Odd times odd is always odd.', ...times(a, b), 'is', { number: p }, ', which is odd.'], steps: ['Odd times odd is always odd.', `${a} × ${b} = ${p}, which is odd.`], visual: equation(a, '×', b, '=', p) };
  const even = a % 2 === 0 ? a : b;
  return { speak: ['An even number times any number is even.', { number: even }, 'is even, so', ...times(a, b), 'is even. It is', { number: p }, '.'], steps: ['An even number times any number is even.', `${even} is even, so ${a} × ${b} is even.`, `${a} × ${b} = ${p}.`], visual: equation(a, '×', b, '=', p) };
}

const oddPair = (rng: Rng): [number, number] => [rng.pick(ODD), rng.pick(ODD)];
const evenPair = (rng: Rng): [number, number] => (rng.bool() ? [rng.pick(EVEN), rng.int(2, 10)] : [rng.int(2, 10), rng.pick(EVEN)]);

function timesPatterns(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const [a, b] = rng.int(1, 5) <= 2 ? oddPair(rng) : evenPair(rng);
    const words = ['even', 'odd'];
    const ask = `Is ${a} × ${b} even or odd?`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { expr: `${a} × ${b}`, ask: 'parity', options: words },
      prompt: { text: ask, speak: ['Is', ...times(a, b), 'even or odd?'] },
      stimulus: equation(a, '×', b),
      options: words.map((word): Visual => ({ kind: 'text', value: word, size: 'l', speak: [word] })),
      answerIndex: (a * b) % 2,
      explanation: parityExplanation(a, b),
    };
  }
  if (level === 2) {
    const want = rng.bool() ? 'odd' : 'even';
    const pick = want === 'odd' ? oddPair : evenPair;
    const other = want === 'odd' ? evenPair : oddPair;
    const right = pick(rng);
    const sentences = find(
      () => [right, other(rng), other(rng)].map(([x, y]) => `${x} × ${y}`),
      (list) => new Set(list).size === 3,
    );
    const choices = rng.shuffle(sentences);
    const rightText = sentences[0] as string;
    const ask = `Which product is ${want}?`;
    return {
      type: 'choice',
      mode: 'look',
      facts: { ask: 'pickParity', want, products: [...sentences].sort(), options: choices },
      prompt: { text: ask, speak: [ask] },
      options: choices.map((choice) => sentenceOption(choice)),
      answerIndex: choices.indexOf(rightText),
      explanation: { ...parityExplanation(right[0], right[1]), steps: [want === 'odd' ? 'A product is odd only when both factors are odd.' : 'A product is even when a factor is even.', ...parityExplanation(right[0], right[1]).steps.slice(1)] },
    };
  }
  const a = rng.int(2, 9);
  const b = rng.int(3, 9);
  const up = rng.bool();
  const next = up ? b + 1 : b - 1;
  const [p, answer] = [a * b, a * next];
  const ask = `${a} × ${b} = ${p}. What is ${a} × ${next}?`;
  const slips = up ? [p + b, p + 1, p, answer + a] : [p - b, p - 1, p, answer - a];
  return numberAnswer(
    {
      prompt: { text: ask, speak: [...times(a, b), 'is', { number: p }, '. What is', ...times(a, next), '?'] },
      stimulus: equation(a, '×', next, '=', 'blank'),
      explanation: {
        speak: [...times(a, next), 'is one', up ? 'more' : 'fewer', 'group of', { number: a }, 'than', ...times(a, b), '.', { number: p }, up ? 'plus' : 'minus', { number: a }, 'is', { number: answer }, '.'],
        steps: [`${a} × ${next} is one ${up ? 'more' : 'fewer'} group of ${a} than ${a} × ${b}.`, `${p} ${up ? '+' : '−'} ${a} = ${answer}.`],
        visual: equation(a, '×', next, '=', answer),
      },
    },
    { expr: `${a} × ${next}`, ask: 'value', known: p },
    answer,
    slips.filter((slip) => slip > 0 && slip !== answer),
    false,
    rng,
    [1, 100],
  );
}

export const timesPatternsGenerator: SkillGenerator = {
  skillId: 'M-3-C11',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: timesPatterns,
  exampleSeed: 3111,
  example: () => timesPatterns(1, makeRng(3111)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'The times table has patterns. Odd times odd is odd. Anything times an even number is even.', speak: ['The times table has patterns. Odd times odd is odd. Anything times an even number is even.'], visual: equation(3, '×', 5, '=', 15) },
    { beat: 'watch', text: parityExplanation(4, 7).steps.join(' '), speak: parityExplanation(4, 7).speak, visual: parityExplanation(4, 7).visual },
    { beat: 'try', text: 'Is 7 × 9 even or odd?', speak: ['Is', ...times(7, 9), 'even or odd?'], visual: equation(7, '×', 9), reveal: { text: parityExplanation(7, 9).steps.join(' '), speak: parityExplanation(7, 9).speak, visual: parityExplanation(7, 9).visual } },
    { beat: 'remember', text: 'Each step along a times table adds one more group.', speak: ['Each step along a times table adds one more group.'], visual: equation(6, '×', 8, '=', 48, '+', 6) },
  ],
  oracle: 'expression3',
};

// ---- C.12 Estimate products ----
// Levels: round to the nearest ten, then multiply / in a story / typed. Oracle: expression3.

const nearestTen = (n: number): number => Math.floor((n + 5) / 10) * 10;

function estimateExplanation(a: number, b: number): Explanation {
  const r = nearestTen(b);
  return {
    speak: [{ number: b }, 'rounds to', { number: r }, '.', ...times(a, r), 'is', { number: a * r }, '. So the answer is about', { number: a * r }, '.'],
    steps: [`${b} rounds to ${r}.`, `${a} × ${r} = ${a * r}.`, `So ${a} × ${b} is about ${a * r}.`],
    visual: equation(a, '×', r, '=', a * r),
  };
}

function estimateProducts(level: Level, rng: Rng): QuestionDraft {
  const a = rng.int(2, 9);
  // Never a number ending in 5 (halfway) or 0 (nothing to round).
  const b = find(() => rng.int(11, 98), (n) => n % 10 !== 0 && n % 10 !== 5);
  const answer = a * nearestTen(b);
  const facts: QuestionDraft['facts'] = { a, b, to: 10, ask: 'roundTimes' };
  let prompt: Prompt = { text: `Round ${b} to the nearest ten, then multiply. About how much is ${a} × ${b}?`, speak: ['Round', { number: b }, 'to the nearest ten, then multiply. About how much is', ...times(a, b), '?'] };
  if (level === 2) {
    const template = rng.int(0, ESTIMATE_STORIES.length - 1);
    prompt = fill(ESTIMATE_STORIES[template] as string, { a, b, name: rng.pick(STORY_NAMES) });
    facts.template = template;
    facts.story = prompt.text;
  }
  const r = nearestTen(b);
  return numberAnswer({ prompt, ...(level === 2 ? {} : { stimulus: equation(a, '×', b) }), explanation: estimateExplanation(a, b) }, facts, answer, [a * (r - 10), a * (r + 10), (a + 1) * r, a + r].filter((slip) => slip > 0), level === 3, rng, [1, 1000], 3);
}

export const estimateProductsGenerator: SkillGenerator = {
  skillId: 'M-3-C12',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['h5-stories'],
  generate: estimateProducts,
  exampleSeed: 3112,
  example: () => estimateProducts(1, makeRng(3112)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To estimate a product, round the bigger number to the nearest ten, then multiply.', speak: ['To estimate a product, round the bigger number to the nearest ten, then multiply.'], visual: equation(4, '×', 28) },
    { beat: 'watch', text: estimateExplanation(4, 28).steps.join(' '), speak: estimateExplanation(4, 28).speak, visual: estimateExplanation(4, 28).visual },
    { beat: 'try', text: 'About how much is 6 × 42?', speak: ['About how much is', ...times(6, 42), '?'], visual: equation(6, '×', 42), reveal: { text: estimateExplanation(6, 42).steps.join(' '), speak: estimateExplanation(6, 42).speak, visual: estimateExplanation(6, 42).visual } },
    { beat: 'remember', text: 'Round, then multiply by a ten: 4 × 30 is 4 × 3 tens, 12 tens, 120.', speak: ['Round, then multiply by a ten:', ...times(4, 30), 'is', { number: 4 }, 'times', { number: 3 }, 'tens,', { number: 12 }, 'tens,', { number: 120 }, '.'], visual: equation(4, '×', 30, '=', 120) },
  ],
  oracle: 'expression3',
};

// ---- D.4 Division word problems ----
// Levels: share equally, with a picture / how many groups, facts to 81 ÷ 9 / either, typed. Oracle: multiply (quotient).

function storyDivideExplanation(kind: 'share' | 'groupsOf', total: number, by: number, emoji: string): Explanation {
  const q = total / by;
  const first: Say = kind === 'share' ? ['Share', { number: total }, 'into', { number: by }, 'equal groups.'] : ['Make groups of', { number: by }, 'from', { number: total }, '.'];
  return {
    speak: [...first, ...times(by, q), 'is', { number: total }, ', so', { number: total }, 'divided by', { number: by }, 'is', { number: q }, '.'],
    steps: [kind === 'share' ? `Share ${total} into ${by} equal groups.` : `Make groups of ${by} from ${total}.`, `${by} × ${q} = ${total}.`, `So ${total} ÷ ${by} = ${q}.`],
    visual: q <= 6 && by <= 6 ? groupsPicture(kind === 'share' ? by : q, kind === 'share' ? q : by, emoji) : equation(total, '÷', by, '=', q),
  };
}

function divideStories(level: Level, rng: Rng): QuestionDraft {
  const kind = level === 1 ? 'share' : level === 2 ? 'groupsOf' : rng.pick(['share', 'groupsOf'] as const);
  const by = rng.int(2, level === 1 ? 5 : 9);
  const q = rng.int(2, level === 1 ? 5 : 9);
  const total = by * q;
  const { story, template, emoji } = tellStory(kind, total, by, rng);
  const stimulus: Visual | undefined = level === 1 ? { kind: 'emojiGroup', emoji, count: total, layout: 'grid5' } : undefined;
  return numberAnswer({ prompt: story, ...(stimulus ? { stimulus } : {}), explanation: storyDivideExplanation(kind, total, by, emoji) }, { rows: by, cols: q, total, by, ask: 'quotient', kind, template, story: story.text }, q, [q + 1, q - 1, by, total - by], level === 3, rng, [1, 100], 2);
}

export const divideStoriesGenerator: SkillGenerator = {
  skillId: 'M-3-D4',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables', 'h5-stories'],
  generate: divideStories,
  exampleSeed: 3114,
  example: () => divideStories(1, makeRng(3114)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'When a story shares things equally, or makes groups of the same size, divide.', speak: ['When a story shares things equally, or makes groups of the same size, divide.'], visual: { kind: 'emojiGroup', emoji: '🍪', count: 12, layout: 'grid5' } },
    { beat: 'watch', text: `Leo shares 12 cookies equally among 3 friends. ${storyDivideExplanation('share', 12, 3, '🍪').steps.join(' ')}`, speak: ['Leo shares', { number: 12 }, 'cookies equally among', { number: 3 }, 'friends.', ...storyDivideExplanation('share', 12, 3, '🍪').speak], visual: storyDivideExplanation('share', 12, 3, '🍪').visual },
    { beat: 'try', text: 'Ava has 20 balls and puts 5 in each box. How many boxes does Ava fill?', speak: ['Ava has', { number: 20 }, 'balls and puts', { number: 5 }, 'in each box. How many boxes does Ava fill?'], visual: { kind: 'emojiGroup', emoji: '⚽', count: 20, layout: 'grid5' }, reveal: { text: storyDivideExplanation('groupsOf', 20, 5, '⚽').steps.join(' '), speak: storyDivideExplanation('groupsOf', 20, 5, '⚽').speak, visual: storyDivideExplanation('groupsOf', 20, 5, '⚽').visual } },
    { beat: 'remember', text: 'Think of the times fact: 3 × 4 = 12, so 12 ÷ 3 = 4.', speak: ['Think of the times fact:', ...times(3, 4), 'is', { number: 12 }, ', so', { number: 12 }, 'divided by', { number: 3 }, 'is', { number: 4 }, '.'], visual: equation(12, '÷', 3, '=', 4) },
  ],
  oracle: 'multiply',
};

// ---- D.5 Missing numbers in division ----
// Levels: the number being divided (□ ÷ 4 = 6) / the number divided by (42 ÷ □ = 7) / either, typed. Oracle: expression3.

function divisionBlankExplanation(total: number, by: number, q: number, blank: 'total' | 'by'): Explanation {
  const wanted = blank === 'total' ? total : by;
  return {
    speak: ['Think of the times fact.', ...times(by, q), 'is', { number: total }, '. So the blank is', { number: wanted }, '.'],
    steps: ['Think of the times fact.', `${by} × ${q} = ${total}.`, `So ${total} ÷ ${by} = ${q}. The blank is ${wanted}.`],
    visual: equation(total, '÷', by, '=', q),
  };
}

function divisionBlanks(level: Level, rng: Rng): QuestionDraft {
  const blank = level === 1 ? 'total' : level === 2 ? 'by' : rng.pick(['total', 'by'] as const);
  const by = rng.int(2, blank === 'total' && level === 1 ? 5 : 9);
  const q = rng.int(2, blank === 'total' && level === 1 ? 10 : 9);
  const total = by * q;
  const sentence = blank === 'total' ? `□ ÷ ${by} = ${q}` : `${total} ÷ □ = ${q}`;
  const prompt: Prompt = blank === 'total' ? { text: `What number divided by ${by} equals ${q}?`, speak: ['What number divided by', { number: by }, 'equals', { number: q }, '?'] } : { text: `${total} divided by what number equals ${q}?`, speak: [{ number: total }, 'divided by what number equals', { number: q }, '?'] };
  const answer = blank === 'total' ? total : by;
  const slips = blank === 'total' ? [by + q, total + by, total - by, total + q] : [q, by + 1, by - 1, total - q];
  return numberAnswer({ prompt, stimulus: sentencePicture(sentence), explanation: divisionBlankExplanation(total, by, q, blank) }, { expr: sentence, ask: 'missing' }, answer, slips.filter((slip) => slip > 0 && slip !== answer), level === 3, rng, [1, 100], 2);
}

export const divisionBlanksGenerator: SkillGenerator = {
  skillId: 'M-3-D5',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: divisionBlanks,
  exampleSeed: 3115,
  example: () => divisionBlanks(1, makeRng(3115)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A blank can stand for any number in a division.', speak: ['A blank can stand for any number in a division.'], visual: sentencePicture('□ ÷ 4 = 6') },
    { beat: 'watch', text: divisionBlankExplanation(24, 4, 6, 'total').steps.join(' '), speak: divisionBlankExplanation(24, 4, 6, 'total').speak, visual: divisionBlankExplanation(24, 4, 6, 'total').visual },
    { beat: 'try', text: '42 divided by what number equals 7?', speak: [{ number: 42 }, 'divided by what number equals', { number: 7 }, '?'], visual: sentencePicture('42 ÷ □ = 7'), reveal: { text: divisionBlankExplanation(42, 6, 7, 'by').steps.join(' '), speak: divisionBlankExplanation(42, 6, 7, 'by').speak, visual: divisionBlankExplanation(42, 6, 7, 'by').visual } },
    { beat: 'remember', text: 'Every division has a times fact behind it.', speak: ['Every division has a times fact behind it.'], visual: equation(6, '×', 7, '=', 42) },
  ],
  oracle: 'expression3',
};

