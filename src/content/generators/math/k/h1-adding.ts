import type { Rng } from '../../../../engine/rng';
import type { Hint, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { listText } from '../../../generator';
import { tidyGroup } from '../pk/parts';
import { equation, h1Skill, lessonOf, mathText, numberChoice, sayMath, shown, spoken } from './h1-parts';
import { numeralChoices } from './numerals';
import { crossedGroup } from './subtracting';

// An explanation with the hint and spoken steps the generator gives (h1-parts' type has neither).
type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint; stepsSay?: (Say | null)[] };

// Math kindergarten, plan section 15 wave H1: C.12 add on a number line, C.13 take away on a number line,
// C.14 plus or take away, C.15 addition sentences, C.16 subtraction sentences, C.17 make 5.
// Kindergarten says "take away" for the minus sign.

const TAKE = 'take away';
const range = (from: number, to: number): number[] => Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (to >= from ? from + i : from - i));

// ---- C.12 Add on a number line ----
// Start at a, hop b. Levels: sums to 5 / to 10 / to 10, typed. Oracle: add.

// A sum said aloud the kindergarten way, with a full stop: "4 − 1 = 3." is "four take away one equals three."
// stepSay would say "minus", the grade 1 word.
const kSum = (expr: string, after = '.'): Say => [...sayMath(expr, TAKE), after];

function hopExplanation(a: number, b: number, op: '+' | '-', max: number): Explanation {
  const end = op === '+' ? a + b : a - b;
  const hops = range(op === '+' ? a + 1 : a - 1, end);
  const say: Say = ['Start at', { number: a }, op === '+' ? '. Hop forward' : '. Hop back', { number: b }, ':', ...hops.map((value) => ({ number: value })), '. You land on', { number: end }, '.'];
  return {
    speak: say,
    steps: [`Start at ${a}.`, `Hop ${op === '+' ? 'forward' : 'back'} ${b}: ${listText(hops)}.`, `${shown(`${a} ${op} ${b}`)} = ${end}.`],
    visual: { kind: 'numberLine', min: 0, max, step: 1, marked: [a, end] },
    stepsSay: [null, null, kSum(`${a} ${op} ${b} = ${end}`)],
    hint: { text: `Put your finger on the start number. Count each hop ${op === '+' ? 'forward' : 'back'}.` },
  };
}

function hopPrompt(a: number, b: number, op: '+' | '-'): { text: string; speak: Say } {
  return {
    text: `${shown(`${a} ${op} ${b}`)}. Start at ${a} and hop ${op === '+' ? 'forward' : 'back'} ${b}. Where do you land?`,
    speak: [{ number: a }, op === '+' ? 'plus' : TAKE, { number: b }, '. Start at', { number: a }, op === '+' ? 'and hop forward' : 'and hop back', { number: b }, '. Where do you land?'],
  };
}

function onLine(op: '+' | '-') {
  return (level: Level, rng: Rng): QuestionDraft => {
    const max = level === 1 ? 5 : 10;
    const a = op === '+' ? rng.int(0, max - 1) : rng.int(2, max);
    const b = op === '+' ? rng.int(1, max - a) : rng.int(1, a);
    const end = op === '+' ? a + b : a - b;
    const base = {
      mode: 'look' as const,
      facts: { a, b },
      prompt: hopPrompt(a, b, op),
      stimulus: { kind: 'numberLine', min: 0, max, step: 1, marked: [a] } as Visual,
      explanation: hopExplanation(a, b, op, max),
    };
    if (level === 3) return { ...base, type: 'numberPad', answer: end, maxDigits: 2 };
    // One hop too few or too many, and the start itself.
    const values = op === '+' ? numeralChoices(end, [end + 1, end - 1, a], 0, max + 2, rng) : numeralChoices(end, [end + 1, end - 1, a], 0, max, rng, [1, 2, 3]);
    return { ...base, facts: { ...base.facts, options: values }, ...numberChoice(end, values) };
  };
}

export const addOnLineGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-C12',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'add',
  exampleSeed: 831,
  generate: onLine('+'),
  lesson: (make) => lessonOf('On a number line, adding means hopping forward.', { kind: 'numberLine', min: 0, max: 10, step: 1, marked: [3] }, make(1, 831), make(2, 832), 'Adding: hop forward. Count each hop.'),
});

export const takeAwayOnLineGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-C13',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'subtract',
  exampleSeed: 833,
  generate: onLine('-'),
  lesson: (make) => lessonOf('On a number line, taking away means hopping back.', { kind: 'numberLine', min: 0, max: 10, step: 1, marked: [7] }, make(1, 833), make(2, 834), 'Taking away: hop back. Count each hop.'),
});

// ---- C.14 Plus or take away? ----
// Levels: a picture, joining or crossing out, within 5 / which sign makes it true, within 5 / within 10.
// Oracle: h1WhichSign.

const SIGNS = ['+', '-'];
const signOptions = (): Visual[] => [
  { kind: 'text', value: '+', size: 'xl', speak: ['plus'] },
  { kind: 'text', value: '−', size: 'xl', speak: [TAKE] },
];

// Why: groups put together or some crossed out (the picture), or the number grew or shrank (the sentence). Then the
// sentence and its sign, said "plus" or "take away".
function signExplanation(a: number, b: number, op: '+' | '-', visual: Visual, picture: boolean): Explanation {
  const result = op === '+' ? a + b : a - b;
  const why = picture
    ? op === '+' ? 'The two groups are put together.' : 'Some are crossed out. They are taken away.'
    : op === '+' ? `${result} is bigger than ${a}, so we add.` : `${result} is smaller than ${a}, so we take away.`;
  const sentence = `${shown(`${a} ${op} ${b}`)} = ${result}.`;
  const sign: Say = kSum(`${a} ${op} ${b} = ${result}`, `. The sign is ${op === '+' ? 'plus' : TAKE}.`);
  return {
    speak: [...spoken(why), ...sign],
    steps: [why, `${sentence} The sign is ${op === '+' ? '+' : '−'}.`],
    visual,
    stepsSay: [null, sign],
    hint: { text: picture ? 'Look at the picture. Are two groups put together, or are some crossed out?' : 'Look at the first number and the last number. Did it get bigger or smaller?' },
  };
}

function plusOrTakeAway(level: Level, rng: Rng): QuestionDraft {
  const op = rng.pick(['+', '-'] as const);
  const max = level === 3 ? 10 : 5;
  const a = op === '+' ? rng.int(1, max - 1) : rng.int(2, max);
  const b = op === '+' ? rng.int(1, max - a) : rng.int(1, a - 1);
  const result = op === '+' ? a + b : a - b;
  const facts = { a, b, result, options: SIGNS };
  const answerIndex = op === '+' ? 0 : 1;
  if (level === 1) {
    const thing = rng.pick(COUNTABLES);
    const visual: Visual = op === '+' ? { kind: 'row', children: [tidyGroup(thing, a), tidyGroup(thing, b)] } : crossedGroup(thing.emoji, a, b);
    const prompt = 'Does the picture show plus or take away?';
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ...facts, thing: thing.one },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: visual,
      options: signOptions(),
      answerIndex,
      explanation: signExplanation(a, b, op, visual, true),
    };
  }
  const prompt = 'Which sign makes it true?';
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts,
    prompt: { text: prompt, speak: [prompt] },
    stimulus: equation(a, 'blank', b, '=', result),
    options: signOptions(),
    answerIndex,
    explanation: signExplanation(a, b, op, equation(a, op, b, '=', result), false),
  };
}

export const plusOrTakeAwayGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-C14',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1WhichSign',
  exampleSeed: 835,
  lists: ['countables'],
  generate: plusOrTakeAway,
  lesson: (make) => lessonOf('Plus puts groups together. Take away makes a group smaller.', equation(3, '+', 2, '=', 5), make(1, 835), make(2, 836), 'Got bigger? Plus. Got smaller? Take away.'),
});

// ---- C.15 and C.16 Number sentences for a picture ----
// C.15: two kinds of things side by side. C.16: some crossed out. Levels: which sentence fits, to 5 /
// to 10 / which picture fits the sum. Oracle: h1SentenceFor.

const speakSentence = (expr: string): Say => mathText(expr, TAKE).speak ?? [];

// a of one thing and b of another, or a things with b crossed out.
function scene(op: '+' | '-', one: Countable, two: Countable, a: number, b: number): Visual {
  if (op === '-') return crossedGroup(one.emoji, a, b);
  return { kind: 'emojiGroup', emoji: one.emoji, count: a, emoji2: two.emoji, count2: b, layout: a + b <= 6 ? 'row' : 'grid5' };
}

function sentenceExplanation(op: '+' | '-', one: Countable, two: Countable, a: number, b: number, level: Level): Explanation {
  const result = op === '+' ? a + b : a - b;
  const sentence = `${a} ${op} ${b} = ${result}`;
  const first = op === '+' ? `Count them: ${a} ${a === 1 ? one.one : one.many} and ${b} ${b === 1 ? two.one : two.many}.` : `There are ${a} ${a === 1 ? one.one : one.many}. ${b} ${b === 1 ? 'is' : 'are'} crossed out.`;
  const hint = op === '+'
    ? level === 3 ? 'In each picture, count each kind of thing.' : 'Count each kind of thing. Find the sentence with those numbers.'
    : level === 3 ? 'In each picture, count them all, then the crossed out ones.' : 'Count them all. Then count the crossed out ones.';
  return { speak: [...spoken(first), ...spoken('So')], steps: [first, `So ${shown(sentence)}.`], visual: scene(op, one, two, a, b), stepsSay: [null, ['So', ...kSum(sentence)]], hint: { text: hint } };
}

function sentences(op: '+' | '-') {
  return (level: Level, rng: Rng): QuestionDraft => {
    const [one, two] = rng.sample(COUNTABLES, 2) as [Countable, Countable];
    const max = level === 1 ? 5 : 10;
    const a = op === '+' ? rng.int(1, max - 1) : rng.int(2, max);
    const b = op === '+' ? rng.int(1, max - a) : rng.int(1, a - 1);
    const result = op === '+' ? a + b : a - b;
    const explanation = sentenceExplanation(op, one, two, a, b, level);
    explanation.speak = [...explanation.speak, ...speakSentence(`${a} ${op} ${b} = ${result}`), '.'];
    const facts = { a, b, op, one: one.one, two: two.one };
    if (level === 3) {
      // Which picture shows the sum? Wrong pictures are one off in either number. The sum turned
      // around (b + a) is never offered, because it is also right.
      const pairs: [number, number][] = [[a, b + 1], [a + 1, b], [a, b - 1], [a - 1, b], [a + 1, b + 1]];
      const wrong = [
        ...new Set(pairs.filter(([x, y]) => x >= 1 && y >= 1 && (op === '+' || y < x) && !(x === a && y === b) && !(x === b && y === a)).map(([x, y]) => `${x} ${op} ${y}`)),
      ];
      const right = `${a} ${op} ${b}`;
      const picked = rng.shuffle([right, ...rng.sample(wrong, 2)]);
      const prompt = { text: `Which picture shows ${shown(right)}?`, speak: ['Which picture shows', ...speakSentence(right), '?'] as Say };
      return {
        type: 'choice',
        mode: 'look',
        facts: { ...facts, ask: 'picture', options: picked },
        prompt,
        options: picked.map((each) => {
          const [x, , y] = each.split(' ');
          return scene(op, one, two, Number(x), Number(y));
        }),
        answerIndex: picked.indexOf(right),
        explanation,
      };
    }
    const right = `${a} ${op} ${b} = ${result}`;
    const wrong = op === '+' ? [`${a} + ${b} = ${result + 1}`, `${a} + ${b + 1} = ${result + 1}`, `${a + 1} + ${b} = ${result + 1}`] : [`${a} - ${b} = ${result + 1}`, `${a} + ${b} = ${a + b}`, `${a + 1} - ${b} = ${result + 1}`];
    const picked = rng.shuffle([right, ...rng.sample(wrong, 2)]);
    const prompt = op === '+' ? 'Which addition sentence fits the picture?' : 'Which take away sentence fits the picture?';
    return {
      type: 'choice',
      mode: 'look',
      facts: { ...facts, ask: 'sentence', options: picked },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: scene(op, one, two, a, b),
      options: picked.map((each) => mathText(each, TAKE, 'm')),
      answerIndex: picked.indexOf(right),
      explanation,
    };
  };
}

export const additionSentenceGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-C15',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1SentenceFor',
  exampleSeed: 837,
  lists: ['countables'],
  generate: sentences('+'),
  lesson: (make) => lessonOf('A picture of two groups can be told as an addition sentence.', mathText('3 + 2 = 5', TAKE), make(1, 837), make(2, 838), 'Count each group. Then write the plus sentence.'),
});

export const subtractionSentenceGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-C16',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1SentenceFor',
  exampleSeed: 839,
  lists: ['countables'],
  generate: sentences('-'),
  lesson: (make) => lessonOf('A picture with some crossed out can be told as a take away sentence.', mathText('5 - 2 = 3', TAKE), make(1, 839), make(2, 840), 'Count them all, take away the crossed out ones, count what is left.'),
});

// ---- C.17 Make 5 ----
// Levels: five spots, some filled, how many more / a group of things, how many more to make 5 / typed,
// 2 plus what equals 5 or what plus 2 equals 5, from 0 to 5. Oracle: missing.

function fiveExplanation(have: number, hint: Hint): Explanation {
  const more = 5 - have;
  const there = have === 0 ? 'None are there yet.' : have === 1 ? '1 is there.' : `${have} are there.`;
  const needed = more === 0 ? 'No more are needed.' : more === 1 ? '1 more is needed.' : `${more} more are needed.`;
  const line = `${have} and ${more} make 5.`;
  return { speak: spoken(`${there} ${needed} ${line}`), steps: [there, needed, line], visual: { kind: 'emojiGroup', emoji: '⚫', count: have, emoji2: '⚪', count2: more, layout: 'row' }, hint };
}

// The typed level shows only the sum, so its hint counts up from the number shown. It never names the answer:
// with 0 shown the answer is 5, and with 5 shown it is 0.
function countUpToFive(known: number): Hint {
  if (known === 0) return { text: 'Zero means none.' };
  if (known === 5) return { text: 'There are 5 already. Do you need any more?' };
  return { text: `Start at ${known}. Count up to 5.` };
}

function makeFive(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const known = rng.int(0, 5);
    const blank = rng.pick(['a', 'b'] as const);
    const answer = 5 - known;
    const [x, y] = blank === 'a' ? ['blank', known] : [known, 'blank'];
    return {
      type: 'numberPad',
      mode: 'look',
      facts: blank === 'a' ? { a: answer, b: known, total: 5, blank } : { a: known, b: answer, total: 5, blank },
      // The sum is shown once, in the picture; the question says it in words, as at Make 10 level 3.
      prompt: blank === 'a' ? { text: `What plus ${known} equals 5?`, speak: ['What plus', { number: known }, 'equals', { number: 5 }, '?'] } : { text: `${known} plus what equals 5?`, speak: [{ number: known }, 'plus what equals', { number: 5 }, '?'] },
      stimulus: equation(x as number | string, '+', y as number | string, '=', 5),
      answer,
      maxDigits: 1,
      explanation: fiveExplanation(known, countUpToFive(known)),
    };
  }
  const have = rng.int(1, 4);
  const more = 5 - have;
  const thing = rng.pick(COUNTABLES);
  const facts: Record<string, number | string> = level === 1 ? { a: have, b: more, total: 5, blank: 'b' } : { a: have, b: more, total: 5, blank: 'b', thing: thing.one };
  const prompt = level === 1 ? 'How many more black dots are needed to make 5?' : `How many more ${thing.many} make 5?`;
  const values = numeralChoices(more, [have, 5], 0, 5, rng);
  return {
    mode: 'look',
    facts: { ...facts, options: values },
    prompt: { text: prompt, speak: spoken(prompt) },
    stimulus: level === 1 ? { kind: 'emojiGroup', emoji: '⚫', count: have, emoji2: '⚪', count2: more, layout: 'row' } : tidyGroup(thing, have),
    explanation: fiveExplanation(have, { text: level === 1 ? 'Each white dot needs a black dot. Count the white dots.' : `Count the ${thing.many}. Then count on to 5.` }),
    ...numberChoice(more, values),
  };
}

export const makeFiveGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-C17',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'missing',
  exampleSeed: 841,
  lists: ['countables'],
  pool: { 1: 4 },
  generate: makeFive,
  lesson: (make) => lessonOf('5 can be made from two parts, like 4 and 1, or 3 and 2.', { kind: 'emojiGroup', emoji: '⚫', count: 3, emoji2: '⚪', count2: 2, layout: 'row' }, make(1, 841), make(2, 842), 'Know the pairs that make 5.'),
});
