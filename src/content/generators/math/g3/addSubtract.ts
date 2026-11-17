import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { STORY_COUNTABLES } from '../../../data/countables';
import { STORY_NAMES } from '../../../data/storyProblems';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { addExplanation, addQuestion, borrows, carries, equation, plusPrompt, subtractExplanation, subtractQuestion } from '../g2/addSubtract';

// Math grade 3 B.1 to B.4: adding and subtracting within 1,000 with regrouping, estimating, two-step stories.

type Explanation = { speak: Say; steps: string[]; visual: Visual };
const digit = (n: number, place: number): number => Math.floor(n / 10 ** place) % 10;

// Two numbers that fit a rule, found by trying.
function find(pick: () => [number, number], fits: (a: number, b: number) => boolean): [number, number] {
  for (;;) {
    const [a, b] = pick();
    if (fits(a, b)) return [a, b];
  }
}

// ---- B.1 Add within 1,000, regrouping ----
// Levels: one regroup / two regroups / typed. Oracle: add.

function addRegroup(level: Level, rng: Rng): QuestionDraft {
  const regroups = level === 1 ? 1 : level === 2 ? 2 : rng.pick([1, 2]);
  // Two three-digit numbers. The sum stays below 1,000, so there is never a new thousand.
  const [a, b] = find(
    () => [rng.int(101, 799), rng.int(101, 799)],
    (x, y) => x + y <= 999 && carries(x, y).length === regroups && x % 10 !== 0 && y % 10 !== 0,
  );
  return addQuestion(a, b, level === 3, rng);
}

export const addRegroup1000Generator: SkillGenerator = {
  skillId: 'M-3-B1',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: addRegroup,
  exampleSeed: 311,
  example: () => addRegroup(1, makeRng(311)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Add the ones, then the tens, then the hundreds. Ten of one place make one of the next.', speak: ['Add the ones, then the tens, then the hundreds. Ten of one place make one of the next.'], visual: equation(367, '+', 258) },
    { beat: 'watch', text: `367 plus 258. ${addExplanation(367, 258).steps.join(' ')}`, speak: [{ number: 367 }, 'plus', { number: 258 }, '.', ...addExplanation(367, 258).speak], visual: addExplanation(367, 258).visual },
    { beat: 'try', text: plusPrompt(475, 286).text, speak: plusPrompt(475, 286).speak, visual: equation(475, '+', 286, '=', 'blank'), reveal: { text: addExplanation(475, 286).steps.join(' '), speak: addExplanation(475, 286).speak, visual: addExplanation(475, 286).visual } },
    { beat: 'remember', text: 'Ten ones make a ten. Ten tens make a hundred.', speak: ['Ten ones make a ten. Ten tens make a hundred.'], visual: addExplanation(367, 258).visual },
  ],
  oracle: 'add',
};

// ---- B.2 Subtract within 1,000, regrouping ----
// Levels: one regroup / two regroups / two regroups, typed. Never across a zero. Oracle: subtract.

function subtractRegroup(level: Level, rng: Rng): QuestionDraft {
  const regroups = level === 1 ? 1 : 2;
  const [a, b] = find(
    () => [rng.int(300, 999), rng.int(101, 899)],
    // Breaking a ten when there are no tens would need breaking a hundred first: never asked here.
    (x, y) => x > y && borrows(x, y).length === regroups && !(borrows(x, y).includes(0) && digit(x, 1) === 0) && y % 10 !== 0,
  );
  return subtractQuestion(a, b, level === 3, rng);
}

export const subtractRegroup1000Generator: SkillGenerator = {
  skillId: 'M-3-B2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  generate: subtractRegroup,
  exampleSeed: 312,
  example: () => subtractRegroup(1, makeRng(312)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Take away the ones, then the tens, then the hundreds. When there are not enough, break one from the next place.', speak: ['Take away the ones, then the tens, then the hundreds. When there are not enough, break one from the next place.'], visual: equation(642, '-', 375) },
    { beat: 'watch', text: `642 minus 375. ${subtractExplanation(642, 375).steps.join(' ')}`, speak: [{ number: 642 }, 'minus', { number: 375 }, '.', ...subtractExplanation(642, 375).speak], visual: subtractExplanation(642, 375).visual },
    { beat: 'try', text: '731 minus 248 equals what?', speak: [{ number: 731 }, 'minus', { number: 248 }, 'equals what?'], visual: equation(731, '-', 248, '=', 'blank'), reveal: { text: subtractExplanation(731, 248).steps.join(' '), speak: subtractExplanation(731, 248).speak, visual: subtractExplanation(731, 248).visual } },
    { beat: 'remember', text: 'A hundred breaks into ten tens. A ten breaks into ten ones.', speak: ['A hundred breaks into ten tens. A ten breaks into ten ones.'], visual: subtractExplanation(642, 375).visual },
  ],
  oracle: 'subtract',
};

// ---- B.3 Estimate sums and differences ----
// Levels: round both to tens, then add / to hundreds, then add or subtract / is the answer reasonable. Oracle: estimate.

const roundTo = (n: number, to: number): number => Math.floor((n + to / 2) / to) * to;
const signWord = (op: '+' | '-'): string => (op === '+' ? 'plus' : 'minus');

function estimateExplanation(a: number, b: number, op: '+' | '-', to: number): Explanation {
  const [ra, rb] = [roundTo(a, to), roundTo(b, to)];
  const guess = op === '+' ? ra + rb : ra - rb;
  const unit = to === 10 ? 'ten' : 'hundred';
  return {
    speak: [{ number: a }, 'rounds to', { number: ra }, '.', { number: b }, 'rounds to', { number: rb }, '.', { number: ra }, signWord(op), { number: rb }, 'is', { number: guess }, '.'],
    steps: [`Round each number to the nearest ${unit}.`, `${a} rounds to ${ra}. ${b} rounds to ${rb}.`, `${ra} ${signWord(op)} ${rb} is ${guess}.`],
    visual: equation(ra, op, rb, '=', guess),
  };
}

function estimating(level: Level, rng: Rng): QuestionDraft {
  const to = level === 1 ? 10 : 100;
  const op: '+' | '-' = level === 1 || rng.bool() ? '+' : '-';
  const lo = to === 10 ? 11 : 101;
  const hi = to === 10 ? 89 : op === '+' ? 449 : 899;
  const [a, b] = find(
    () => [rng.int(lo, hi), rng.int(lo, hi)],
    (x, y) => x % 10 !== 0 && y % 10 !== 0 && (op === '+' || x - y >= to * 2) && roundTo(x, to) !== x && roundTo(y, to) !== y,
  );
  const exact = op === '+' ? a + b : a - b;
  const guess = op === '+' ? roundTo(a, to) + roundTo(b, to) : roundTo(a, to) - roundTo(b, to);
  if (level === 3) {
    // Half the time the claimed answer is the real one; otherwise it is far off.
    const right = rng.bool();
    const claim = right ? exact : exact + rng.pick([-1, 1]) * rng.int(25, 30) * 10;
    const safeClaim = claim > 0 ? claim : exact + rng.int(25, 30) * 10;
    const prompt = `Sam says ${a} ${signWord(op)} ${b} is ${safeClaim}. Is that reasonable?`;
    const isReasonable = Math.abs(safeClaim - guess) <= to;
    const why = estimateExplanation(a, b, op, to);
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { a, b, to, op, ask: 'reasonable', claim: safeClaim, options: [true, false] },
      prompt: { text: prompt, speak: ['Sam says', { number: a }, signWord(op), { number: b }, 'is', { number: safeClaim }, '. Is that reasonable?'] },
      stimulus: equation(a, op, b, '=', safeClaim),
      options: [
        { kind: 'text', value: 'Yes', size: 'l', speak: ['Yes'] },
        { kind: 'text', value: 'No', size: 'l', speak: ['No'] },
      ],
      answerIndex: isReasonable ? 0 : 1,
      explanation: {
        speak: [...why.speak, ...(isReasonable ? (['Yes.', { number: safeClaim }, 'is close to that.'] as Say) : (['No.', { number: safeClaim }, 'is too far from that.'] as Say))],
        steps: [...why.steps.slice(1), isReasonable ? `${safeClaim} is close to ${guess}, so yes.` : `${safeClaim} is far from ${guess}, so no.`],
        visual: why.visual,
      },
    };
  }
  const prompt = to === 10 ? `Round each number to the nearest ten, then ${op === '+' ? 'add' : 'subtract'}. What is the estimate?` : `Round each number to the nearest hundred, then ${op === '+' ? 'add' : 'subtract'}. What is the estimate?`;
  // The estimate, the exact answer a child might give instead, and round numbers a step or two away.
  // The place of the estimate is picked first, so it is not always in the middle.
  const below = [...new Set([exact, guess - to, guess - 2 * to])].filter((value) => value >= 0 && value < guess);
  const above = [...new Set([exact, guess + to, guess + 2 * to])].filter((value) => value > guess);
  const place = rng.pick([0, 1, 2].filter((each) => below.length >= each && above.length >= 2 - each));
  // The exact answer is offered whenever it fits on its side.
  const side = (list: number[], n: number): number[] => (list.includes(exact) && n > 0 ? [exact, ...rng.sample(list.filter((value) => value !== exact), n - 1)] : rng.sample(list, n));
  const values = [...side(below, place), guess, ...side(above, 2 - place)].sort((x, y) => x - y);
  return {
    type: 'choice',
    mode: 'look',
    facts: { a, b, to, op, ask: 'estimate', options: values },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: equation(a, op, b),
    options: values.map((value) => numeral(value, 'l')),
    answerIndex: values.indexOf(guess),
    explanation: estimateExplanation(a, b, op, to),
  };
}

export const estimateGenerator: SkillGenerator = {
  skillId: 'M-3-B3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: estimating,
  exampleSeed: 313,
  example: () => estimating(1, makeRng(313)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'An estimate is a close answer you can work out in your head.', speak: ['An estimate is a close answer you can work out in your head.'], visual: equation(38, '+', 51) },
    { beat: 'watch', text: estimateExplanation(38, 51, '+', 10).steps.join(' '), speak: estimateExplanation(38, 51, '+', 10).speak, visual: estimateExplanation(38, 51, '+', 10).visual },
    { beat: 'try', text: 'Estimate 412 plus 289 by rounding to hundreds.', speak: ['Estimate', { number: 412 }, 'plus', { number: 289 }, 'by rounding to hundreds.'], visual: equation(412, '+', 289), reveal: { text: estimateExplanation(412, 289, '+', 100).steps.join(' '), speak: estimateExplanation(412, 289, '+', 100).speak, visual: estimateExplanation(412, 289, '+', 100).visual } },
    { beat: 'remember', text: 'Round first, then add or take away.', speak: ['Round first, then add or take away.'], visual: estimateExplanation(38, 51, '+', 10).visual },
  ],
  oracle: 'estimate',
};

// ---- B.4 Two-step word problems ----
// Levels: add and subtract / with one multiplication / with one division. Oracle: twoStep.

type Op = '+' | '-' | '×' | '÷';
const OP_WORD: Record<Op, string> = { '+': 'plus', '-': 'minus', '×': 'times', '÷': 'divided by' };
const apply = (x: number, op: Op, y: number): number => (op === '+' ? x + y : op === '-' ? x - y : op === '×' ? x * y : x / y);

function twoStepExplanation(a: number, op1: Op, b: number, op2: Op, c: number): Explanation {
  const first = apply(a, op1, b);
  const second = apply(first, op2, c);
  return {
    speak: ['First,', { number: a }, OP_WORD[op1], { number: b }, 'is', { number: first }, '. Then,', { number: first }, OP_WORD[op2], { number: c }, 'is', { number: second }, '.'],
    steps: [`First, ${a} ${OP_WORD[op1]} ${b} is ${first}.`, `Then, ${first} ${OP_WORD[op2]} ${c} is ${second}.`, `The answer is ${second}.`],
    visual: numeral(second, 'xl'),
  };
}

interface Story {
  text: string;
  speak: Say;
  a: number;
  op1: Op;
  b: number;
  op2: Op;
  c: number;
}

function story(level: Level, rng: Rng): Story {
  const name = rng.pick(STORY_NAMES);
  const thing = rng.pick(STORY_COUNTABLES);
  if (level === 1) {
    const a = rng.int(120, 480);
    const b = rng.int(25, 240);
    const c = rng.int(15, Math.min(a + b - 10, 260));
    return {
      text: `${name} has ${a} ${thing.many}. ${name} gets ${b} more, then gives away ${c}. How many ${thing.many} does ${name} have now?`,
      speak: [`${name} has`, { number: a }, `${thing.many}.`, `${name} gets`, { number: b }, 'more, then gives away', { number: c }, '.', `How many ${thing.many} does ${name} have now?`],
      a, op1: '+', b, op2: '-', c,
    };
  }
  if (level === 2) {
    const a = rng.int(3, 9);
    const b = rng.int(3, 10);
    const c = rng.int(2, 15);
    return {
      text: `There are ${a} boxes with ${b} ${thing.many} in each. ${name} adds ${c} more ${thing.many}. How many ${thing.many} are there now?`,
      speak: ['There are', { number: a }, 'boxes with', { number: b }, `${thing.many} in each.`, `${name} adds`, { number: c }, `more ${thing.many}.`, `How many ${thing.many} are there now?`],
      a, op1: '×', b, op2: '+', c,
    };
  }
  const bags = rng.int(2, 6);
  const each = rng.int(3, 9);
  const c = rng.int(2, 8);
  const a = bags * each;
  return {
    text: `${name} shares ${a} ${thing.many} equally into ${bags} bags. Then ${c} more ${thing.many} go into one bag. How many ${thing.many} are in that bag now?`,
    speak: [`${name} shares`, { number: a }, `${thing.many} equally into`, { number: bags }, 'bags. Then', { number: c }, `more ${thing.many} go into one bag.`, `How many ${thing.many} are in that bag now?`],
    a, op1: '÷', b: bags, op2: '+', c,
  };
}

function twoStepProblems(level: Level, rng: Rng): QuestionDraft {
  const s = story(level, rng);
  const answer = apply(apply(s.a, s.op1, s.b), s.op2, s.c);
  return {
    type: 'numberPad',
    mode: 'look',
    facts: { a: s.a, op1: s.op1, b: s.b, op2: s.op2, c: s.c },
    prompt: { text: s.text, speak: s.speak },
    answer,
    maxDigits: 3,
    explanation: twoStepExplanation(s.a, s.op1, s.b, s.op2, s.c),
  };
}

export const twoStep3Generator: SkillGenerator = {
  skillId: 'M-3-B4',
  maxLevel: 3,
  itemTypes: ['numberPad'],
  lists: ['countables', 'storyProblems'],
  generate: twoStepProblems,
  exampleSeed: 314,
  example: () => twoStepProblems(1, makeRng(314)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A two-step story has two parts. Work out the first part, then use that answer for the second.', speak: ['A two-step story has two parts. Work out the first part, then use that answer for the second.'], visual: equation(4, '×', 6, '+', 5) },
    { beat: 'watch', text: `There are 4 boxes with 6 apples in each. 5 more apples are added. ${twoStepExplanation(4, '×', 6, '+', 5).steps.join(' ')}`, speak: ['There are', { number: 4 }, 'boxes with', { number: 6 }, 'apples in each.', { number: 5 }, 'more apples are added.', ...twoStepExplanation(4, '×', 6, '+', 5).speak], visual: twoStepExplanation(4, '×', 6, '+', 5).visual },
    { beat: 'try', text: 'Mia has 230 cards. She gets 145 more, then gives away 60. How many now?', speak: ['Mia has', { number: 230 }, 'cards. She gets', { number: 145 }, 'more, then gives away', { number: 60 }, '. How many now?'], visual: equation(230, '+', 145, '-', 60), reveal: { text: twoStepExplanation(230, '+', 145, '-', 60).steps.join(' '), speak: twoStepExplanation(230, '+', 145, '-', 60).speak, visual: twoStepExplanation(230, '+', 145, '-', 60).visual } },
    { beat: 'remember', text: 'First part first. Then use its answer.', speak: ['First part first. Then use its answer.'], visual: twoStepExplanation(4, '×', 6, '+', 5).visual },
  ],
  oracle: 'twoStep',
};
