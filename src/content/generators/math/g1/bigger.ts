import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { STORY_COUNTABLES } from '../../../data/countables';
import type { StoryKind } from '../../../data/storyProblems';
import { STORY_NAMES } from '../../../data/storyProblems';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import type { Told } from '../k/stories';
import { tellStory } from '../k/stories';

// Math grade 1 B.8, B.9 and B.10: two-digit plus one-digit, adding and subtracting tens, and word problems.

type Explanation = { speak: Say; steps: string[]; visual: Visual };
const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });
const plusPrompt = (a: number, b: number): { text: string; speak: Say } => ({ text: `${a} plus ${b} equals what?`, speak: [{ number: a }, 'plus', { number: b }, 'equals what?'] });
const minusPrompt = (a: number, b: number): { text: string; speak: Say } => ({ text: `${a} minus ${b} equals what?`, speak: [{ number: a }, 'minus', { number: b }, 'equals what?'] });

// ---- B.8 Add two-digit and one-digit ----
// Levels: no regrouping / regrouping / typed. Families: Add, no regrouping and Add, regrouping. Oracle: add.

function placeExplanation(a: number, b: number): Explanation {
  const [x, sum] = [a % 10, a + b];
  const ones = x + b;
  const visual = equation(a, '+', b, '=', sum);
  if (ones < 10) {
    return {
      speak: ['Add the ones:', { number: x }, 'plus', { number: b }, 'is', { number: ones }, '. The tens stay the same. The answer is', { number: sum }, '.'],
      steps: [`Add the ones: ${x} plus ${b} is ${ones}.`, 'The tens stay the same.', `The answer is ${sum}.`],
      visual,
    };
  }
  return {
    speak: ['Add the ones:', { number: x }, 'plus', { number: b }, 'is', { number: ones }, '. That is one ten and', { number: ones - 10 }, ones - 10 === 1 ? 'one.' : 'ones.', 'Add the extra ten to the tens.', { number: sum }, '.'],
    steps: [`Add the ones: ${x} plus ${b} is ${ones}.`, `That is 1 ten and ${ones - 10} ${ones - 10 === 1 ? 'one' : 'ones'}.`, `Add the extra ten to the tens: ${sum}.`],
    visual,
  };
}

function twoDigitPlusOne(level: Level, rng: Rng): QuestionDraft {
  for (;;) {
    const a = rng.int(11, 89);
    const b = rng.int(1, 9);
    const regroup = (a % 10) + b >= 10;
    // Level 1 never carries a ten. Level 2 always does. Level 3 is either.
    if ((level === 1 && regroup) || (level === 2 && !regroup) || a % 10 === 0) continue;
    const sum = a + b;
    const base = { mode: 'look' as const, prompt: plusPrompt(a, b), stimulus: equation(a, '+', b, '=', 'blank'), explanation: placeExplanation(a, b) };
    if (level === 3) return { ...base, type: 'numberPad', facts: { a, b }, answer: sum, maxDigits: 2 };
    // The slips: the extra ten forgotten or added twice, the one-digit number added to the tens, or one off.
    const values = numeralChoices(sum, [sum - 10, sum + 10, a + b * 10], 1, 120, rng);
    return { ...base, type: 'choice', facts: { a, b, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(sum) };
  }
}

export const twoDigitPlusOneGenerator: SkillGenerator = {
  skillId: 'M-1-B8',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: twoDigitPlusOne,
  exampleSeed: 118,
  example: () => twoDigitPlusOne(1, makeRng(118)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To add to a two-digit number, add the ones first.', speak: ['To add to a two-digit number, add the ones first.'], visual: { kind: 'baseTen', hundreds: 0, tens: 2, ones: 3 } },
    { beat: 'watch', text: `23 plus 4. ${placeExplanation(23, 4).steps.join(' ')}`, speak: [{ number: 23 }, 'plus', { number: 4 }, '.', ...placeExplanation(23, 4).speak], visual: equation(23, '+', 4, '=', 27) },
    { beat: 'try', text: plusPrompt(36, 7).text, speak: plusPrompt(36, 7).speak, visual: equation(36, '+', 7, '=', 'blank'), reveal: { text: placeExplanation(36, 7).steps.join(' '), speak: placeExplanation(36, 7).speak, visual: equation(36, '+', 7, '=', 43) } },
    { beat: 'remember', text: 'Ones with ones, tens with tens.', speak: ['Ones with ones, tens with tens.'], visual: equation(23, '+', 4, '=', 27) },
  ],
  oracle: 'add',
};

// ---- B.9 Add and subtract tens ----
// Levels: 30 plus 20 / 70 minus 40 / 34 plus 20, typed. Oracles: add, subtract.

function tensExplanation(a: number, b: number, plus: boolean): Explanation {
  const [ta, tb] = [Math.floor(a / 10), b / 10];
  const answer = plus ? a + b : a - b;
  const tens = plus ? ta + tb : ta - tb;
  const word = plus ? 'plus' : 'minus';
  const tensWord = (n: number): string => (n === 1 ? 'ten' : 'tens');
  const first: Say = [{ number: ta }, `${tensWord(ta)} ${word}`, { number: tb }, `${tensWord(tb)} is`, { number: tens }, `${tensWord(tens)}.`];
  const firstText = `${ta} ${tensWord(ta)} ${word} ${tb} ${tensWord(tb)} is ${tens} ${tensWord(tens)}.`;
  const visual = equation(a, plus ? '+' : '-', b, '=', answer);
  if (a % 10 === 0) return { speak: [...first, { number: answer }, '.'], steps: [firstText, `${answer}.`], visual };
  return { speak: ['Only the tens change.', ...first, 'The ones stay the same.', { number: answer }, '.'], steps: ['Only the tens change.', firstText, `The ones stay the same: ${answer}.`], visual };
}

function tensQuestion(a: number, b: number, plus: boolean, typed: boolean, rng: Rng): QuestionDraft {
  const answer = plus ? a + b : a - b;
  // The oracle is named on the question, because the skill uses two.
  const facts = { a, b, oracle: plus ? 'add' : 'subtract' };
  const base = { mode: 'look' as const, prompt: plus ? plusPrompt(a, b) : minusPrompt(a, b), stimulus: equation(a, plus ? '+' : '-', b, '=', 'blank'), explanation: tensExplanation(a, b, plus) };
  if (typed) return { ...base, type: 'numberPad', facts, answer, maxDigits: 3 };
  // The slips: ten out either way, the other operation, or the tens counted as ones.
  const values = numeralChoices(answer, [answer - 10, answer + 10, plus ? a - b : a + b, Math.floor(a / 10) + (plus ? b / 10 : -b / 10)], 0, 120, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

function addSubtractTens(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const a = 10 * rng.int(1, 8);
    return tensQuestion(a, 10 * rng.int(1, 9 - a / 10), true, false, rng);
  }
  if (level === 2) {
    const a = 10 * rng.int(2, 9);
    return tensQuestion(a, 10 * rng.int(1, a / 10 - 1), false, false, rng);
  }
  // A number with ones in it, plus tens.
  const a = rng.int(1, 7) * 10 + rng.int(1, 9);
  return tensQuestion(a, 10 * rng.int(1, 9 - Math.floor(a / 10)), true, true, rng);
}

export const addSubtractTensGenerator: SkillGenerator = {
  skillId: 'M-1-B9',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: addSubtractTens,
  exampleSeed: 119,
  example: () => addSubtractTens(1, makeRng(119)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Tens add like ones. 3 tens and 2 tens are 5 tens.', speak: ['Tens add like ones.', { number: 3 }, 'tens and', { number: 2 }, 'tens are', { number: 5 }, 'tens.'], visual: { kind: 'baseTen', hundreds: 0, tens: 5, ones: 0 } },
    { beat: 'watch', text: `30 plus 20. ${tensExplanation(30, 20, true).steps.join(' ')}`, speak: [{ number: 30 }, 'plus', { number: 20 }, '.', ...tensExplanation(30, 20, true).speak], visual: equation(30, '+', 20, '=', 50) },
    { beat: 'try', text: minusPrompt(70, 40).text, speak: minusPrompt(70, 40).speak, visual: equation(70, '-', 40, '=', 'blank'), reveal: { text: tensExplanation(70, 40, false).steps.join(' '), speak: tensExplanation(70, 40, false).speak, visual: equation(70, '-', 40, '=', 30) } },
    { beat: 'remember', text: 'Add tens to tens.', speak: ['Add tens to tens.'], visual: equation(34, '+', 20, '=', 54) },
  ],
  oracle: 'add',
};

// ---- B.10 Word problems within 20 ----
// Levels: add to / take from / compare, typed. Family: Stories. Oracles: add, subtract.

function storyExplanation(a: number, b: number, plus: boolean): Explanation {
  const answer = plus ? a + b : a - b;
  const word = plus ? 'plus' : 'minus';
  return { speak: [{ number: a }, word, { number: b }, 'is', { number: answer }, '.'], steps: [`${a} ${word} ${b} is ${answer}.`], visual: equation(a, plus ? '+' : '-', b, '=', answer) };
}

function wordProblem(level: Level, rng: Rng): QuestionDraft {
  const kind: StoryKind = level === 1 ? rng.pick<StoryKind>(['gets', 'table']) : level === 2 ? rng.pick<StoryKind>(['givesAway', 'takes']) : 'compare';
  const plus = level === 1;
  const [name, name2] = rng.sample(STORY_NAMES, 2) as [string, string];
  const thing = rng.pick(STORY_COUNTABLES);
  let a: number;
  let b: number;
  if (plus) {
    const sum = rng.int(11, 20);
    a = rng.int(Math.max(2, sum - 10), Math.min(10, sum - 2));
    b = sum - a;
  } else {
    // In a compare story the first number is always the bigger one.
    a = rng.int(8, 20);
    b = rng.int(2, a - 2);
  }
  const told: Told = level === 3 ? { kind, name, name2, thing, a, b } : { kind, name, thing, a, b };
  const answer = plus ? a + b : a - b;
  const story = tellStory(told);
  const named = kind !== 'table';
  const facts: QuestionDraft['facts'] = { a, b, thing: thing.one, story: kind, oracle: plus ? 'add' : 'subtract', ...(named ? { name } : {}), ...(level === 3 ? { name2 } : {}) };
  const base = { mode: 'look' as const, prompt: story, explanation: storyExplanation(a, b, plus) };
  if (level === 3) return { ...base, type: 'numberPad', facts, answer, maxDigits: 2 };
  // The slips: one off, the other operation, or a number from the story said again.
  const values = numeralChoices(answer, [plus ? Math.abs(a - b) : a + b, a, b], 0, 40, rng);
  return { ...base, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer) };
}

const APPLE = STORY_COUNTABLES[0]!;

export const wordProblemsGenerator: SkillGenerator = {
  skillId: 'M-1-B10',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables', 'storyProblems'],
  generate: wordProblem,
  exampleSeed: 120,
  example: () => wordProblem(1, makeRng(120)),
  lesson: (): LessonStep[] => {
    const add: Told = { kind: 'gets', name: 'Sam', thing: APPLE, a: 8, b: 5 };
    const take: Told = { kind: 'givesAway', name: 'Mia', thing: APPLE, a: 12, b: 4 };
    return [
      { beat: 'see', text: 'A story tells us what to do. Getting more means plus. Giving away means minus.', speak: ['A story tells us what to do. Getting more means plus. Giving away means minus.'], visual: equation(8, '+', 5) },
      { beat: 'watch', text: `${tellStory(add).text} ${storyExplanation(8, 5, true).steps.join(' ')}`, speak: [...tellStory(add).speak, ...storyExplanation(8, 5, true).speak], visual: equation(8, '+', 5, '=', 13) },
      { beat: 'try', text: tellStory(take).text, speak: tellStory(take).speak, visual: equation(12, '-', 4, '=', 'blank'), reveal: { text: storyExplanation(12, 4, false).steps.join(' '), speak: storyExplanation(12, 4, false).speak, visual: equation(12, '-', 4, '=', 8) } },
      { beat: 'remember', text: 'Listen for joining or taking away.', speak: ['Listen for joining or taking away.'], visual: equation(12, '-', 4, '=', 8) },
    ];
  },
  oracle: 'add',
};
