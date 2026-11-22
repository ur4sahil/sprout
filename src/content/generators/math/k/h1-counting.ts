import type { Rng } from '../../../../engine/rng';
import type { Hint, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import { LINE_ANIMALS } from '../../../data/h1-things';
import { numberWord } from '../../../data/h1-numberWords';
import type { SkillGenerator } from '../../../generator';
import { countAloud, listText, numeral } from '../../../generator';
import { findNumberQuestion } from '../pk/findNumber';
import { SCATTER_SLOTS, silentNumeral } from '../pk/parts';
import { h1Skill, lessonOf, numberChoice, picture, shuffled } from './h1-parts';
import { numeralChoices } from './numerals';

// An explanation with the hint and spoken steps the generator gives (h1-parts' type has neither).
type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint; stepsSay?: (Say | null)[] };

// Math kindergarten, plan section 15 wave H1: A.8 count one kind, A.9 find the number to 20,
// A.10 number words to ten, A.11 first to fifth, A.12 count back, A.13 tally marks.

const upTo = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

// ---- A.8 Count one kind ----
// Levels: 3 to 7 among 2 to 5 others / 6 to 12 / 8 to 15, typed. Oracle: count.

function countOneExplanation(thing: Countable, n: number): Explanation {
  return {
    speak: [`Count only the ${thing.many}.`, ...countAloud(n), '. There are', { number: n }, `${thing.many}.`],
    steps: [`Count only the ${thing.many}: ${listText(upTo(n))}.`, `There are ${n} ${thing.many}.`],
    visual: { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: n <= 5 ? 'row' : 'grid5', numbered: true },
    hint: { text: `Touch only the ${thing.many}. Say a number for each.` },
  };
}

function countOneKind(level: Level, rng: Rng): QuestionDraft {
  const [thing, other] = rng.sample(COUNTABLES, 2) as [Countable, Countable];
  const n = level === 1 ? rng.int(3, 7) : level === 2 ? rng.int(6, 12) : rng.int(8, 15);
  const m = level === 1 ? rng.int(2, 5) : rng.int(3, Math.min(6, 20 - n));
  // Each object gets its own place in the 5 by 4 grid, so the two kinds are mixed together.
  const slots = rng.sample(SCATTER_SLOTS, n + m);
  const stimulus: Visual = { kind: 'emojiGroup', emoji: thing.emoji, count: n, emoji2: other.emoji, count2: m, layout: 'scatter', slots };
  const prompt = `Count only the ${thing.many}. How many ${thing.many} are there?`;
  const base = { mode: 'look' as const, facts: { n, thing: thing.one, other: other.one, m, slots }, prompt: { text: prompt, speak: [prompt] }, stimulus, explanation: countOneExplanation(thing, n) };
  if (level === 3) return { ...base, type: 'numberPad', answer: n, maxDigits: 2 };
  const values = numeralChoices(n, [n + m, n + 1, n - 1], 1, 20, rng);
  return { ...base, facts: { ...base.facts, options: values }, ...numberChoice(n, values) };
}

export const countOneKindGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-A8',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'count',
  exampleSeed: 801,
  lists: ['countables'],
  generate: countOneKind,
  lesson: (make) => lessonOf('Two kinds of things are mixed up. Count only the kind you are asked about.', { kind: 'emojiGroup', emoji: '🍎', count: 4, emoji2: '🍌', count2: 3, layout: 'scatter', slots: [0, 7, 3, 12, 9, 15, 18] }, make(1, 801), make(1, 802), 'Count one kind. Skip the others.'),
});

// ---- A.9 Find the number to 20 ----
// Hear a number, tap its numeral. Levels: 11 to 20, far apart / next to each other / digits swapped
// (12 and 21). Listen. Oracle: attribute.

function farApart(n: number, rng: Rng): number[] {
  const others = Array.from({ length: 11 }, (_, i) => i + 10).filter((value) => Math.abs(value - n) >= 3);
  for (;;) {
    const [x, y] = rng.sample(others, 2) as [number, number];
    if (Math.abs(x - y) >= 3) return [n, x, y].sort((p, q) => p - q);
  }
}

const reversed = (n: number): number => Number(String(n).split('').reverse().join(''));

const DIGITS_HINT: Hint = { text: 'Listen again. Then look at both digits of each number.' };
const withHint = (question: QuestionDraft, hint: Hint): QuestionDraft => ({ ...question, explanation: { ...question.explanation, hint } });

function findTo20(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const n = rng.int(12, 19);
    return withHint(findNumberQuestion(n, numeralChoices(n, [reversed(n)], 10, 99, rng)), DIGITS_HINT);
  }
  const n = rng.int(11, 20);
  if (level === 1) return withHint(findNumberQuestion(n, farApart(n, rng)), DIGITS_HINT);
  const start = rng.pick([n - 2, n - 1, n].filter((first) => first >= 10 && first + 2 <= 20));
  return withHint(findNumberQuestion(n, [start, start + 1, start + 2]), DIGITS_HINT);
}

export const findTo20Generator: SkillGenerator = h1Skill({
  skillId: 'M-K-A9',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'attribute',
  exampleSeed: 803,
  generate: findTo20,
  lesson: (make) => lessonOf('Numbers from 11 to 20 have two digits. The 1 in front means one ten.', { kind: 'row', children: [numeral(13), numeral(17)] }, make(1, 803), make(2, 804), 'Listen, then look at both digits.', { kind: 'row', children: [silentNumeral(12), silentNumeral(21)] }),
});

// ---- A.10 Number words to ten ----
// Read a number word. Levels: one to five, pick the numeral / one to ten / the numeral, pick its word.
// Read: nothing that shows the word, or its numeral, says it aloud. Oracle: numberName.

function wordExplanation(n: number): Explanation {
  return { speak: ['This word says', { number: n }, '.'], steps: [`The word ${numberWord(n)} is ${n}.`], visual: { kind: 'row', children: [{ kind: 'text', value: numberWord(n), size: 'l' }, numeral(n)] } };
}

// Kindergarten's steps work spoken as well as on screen (the wording audit, Nov 21, 2026). The hints never say a
// word the child must read.
function kWordExplanation(n: number, ask: 'numeral' | 'words'): Explanation {
  const steps = [`This word says ${numberWord(n)}.`, `It goes with the number ${n}.`];
  return {
    speak: ['This word says', { number: n }, '. It goes with the number', { number: n }, '.'],
    steps,
    visual: { kind: 'row', children: [{ kind: 'text', value: numberWord(n), size: 'l' }, numeral(n)] },
    hint: { text: ask === 'numeral' ? 'Look at the first letter of the word. What sound does it make?' : 'Say the number. Then look at the first letter of each word.' },
  };
}

export function numberWordQuestion(n: number, values: number[], explain: (n: number, ask: 'numeral' | 'words') => Explanation = wordExplanation): { word: QuestionDraft; numeralAsk: QuestionDraft } {
  const word = numberWord(n);
  const words = values.map(numberWord);
  const toNumeral: QuestionDraft = {
    type: 'choice',
    mode: 'read',
    facts: { n, ask: 'numeral', read: [word], options: values },
    prompt: { text: 'Which number does this word say?', speak: ['Which number does this word say?'] },
    stimulus: { kind: 'text', value: word, size: 'xl' },
    options: values.map((value) => silentNumeral(value)),
    answerIndex: values.indexOf(n),
    explanation: explain(n, 'numeral'),
  };
  const toWord: QuestionDraft = {
    type: 'choice',
    mode: 'read',
    facts: { n, ask: 'words', read: words, options: words },
    prompt: { text: 'Which word names this number?', speak: ['Which word names this number?'] },
    stimulus: silentNumeral(n),
    options: words.map((each): Visual => ({ kind: 'text', value: each, size: 'l' })),
    answerIndex: words.indexOf(word),
    explanation: explain(n, 'words'),
  };
  return { word: toNumeral, numeralAsk: toWord };
}

function numberWordsTo10(level: Level, rng: Rng): QuestionDraft {
  const n = rng.int(1, level === 1 ? 5 : 10);
  const made = numberWordQuestion(n, numeralChoices(n, [n + 2, n - 2], 1, 10, rng, level === 1 ? [1, 2, 4] : [1, 1, 1]), kWordExplanation);
  return level === 3 ? made.numeralAsk : made.word;
}

export const numberWordsTo10Generator: SkillGenerator = h1Skill({
  skillId: 'M-K-A10',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'numberName',
  exampleSeed: 805,
  lists: ['h1-numberWords'],
  pool: { 1: 5 },
  generate: numberWordsTo10,
  lesson: (make) => lessonOf('Every number has a word. The word three means 3.', kWordExplanation(3, 'numeral').visual, make(1, 805), make(2, 806), 'Read the word, then find its number.', kWordExplanation(5, 'numeral').visual),
});

// ---- A.11 First to fifth ----
// Animals stand in a line behind a flag. Levels: which one is first to third, of 3 / first to fifth, of 5 /
// what place is this one in. Oracle: h1Ordinal.

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];
type Animal = (typeof LINE_ANIMALS)[number];

const lineOf = (animals: readonly Animal[]): Visual => ({ kind: 'sequence', items: [picture('🏁', 'the flag'), ...animals.map((each) => picture(each.emoji, each.name))] });

function ordinalExplanation(animals: readonly Animal[], place: number): Explanation {
  const counted = ORDINALS.slice(0, place).join(', ');
  const animal = animals[place - 1] as Animal;
  return {
    speak: [`Start at the flag and count: ${counted}. The ${animal.name} is ${ORDINALS[place - 1] as string}.`],
    steps: [`Start at the flag: ${counted}.`, `The ${animal.name} is ${ORDINALS[place - 1] as string}.`],
    visual: lineOf(animals),
    hint: { text: 'Start at the flag. Touch each animal and say its place.' },
  };
}

function ordinal(level: Level, rng: Rng): QuestionDraft {
  const animals = rng.sample(LINE_ANIMALS, level === 1 ? 3 : 5);
  const place = rng.int(1, animals.length);
  const animal = animals[place - 1] as Animal;
  const line = animals.map((each) => each.name);
  if (level === 3) {
    // Three place words next to each other, in order, with the right one among them.
    const first = rng.pick([place - 2, place - 1, place].filter((start) => start >= 1 && start + 2 <= 5));
    const words = [first, first + 1, first + 2].map((at) => ORDINALS[at - 1] as string);
    const prompt = `The line starts at the flag. What place is the ${animal.name} in?`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { line, ask: 'place', target: animal.name, options: words },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: lineOf(animals),
      options: words.map((word): Visual => ({ kind: 'text', value: word, size: 'l', speak: [word] })),
      answerIndex: words.indexOf(ORDINALS[place - 1] as string),
      explanation: ordinalExplanation(animals, place),
    };
  }
  const others = rng.sample(animals.filter((each) => each !== animal), 2);
  const { items, answerIndex } = shuffled(animal, others, rng);
  const want = ORDINALS[place - 1] as string;
  const prompt = `The line starts at the flag. Which animal is ${want}?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { line, ask: 'which', want, options: items.map((each) => each.name) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: lineOf(animals),
    options: items.map((each) => picture(each.emoji, each.name)),
    answerIndex,
    explanation: ordinalExplanation(animals, place),
  };
}

export const ordinalGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-A11',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1Ordinal',
  exampleSeed: 807,
  lists: ['h1-things'],
  generate: ordinal,
  lesson: (make) => lessonOf('First, second, third, fourth, fifth tell the order things are in.', lineOf(LINE_ANIMALS.slice(0, 5)), make(1, 807), make(2, 808), 'Start at the front and count: first, second, third.'),
});

// ---- A.12 Count back ----
// A row counting down by one with a gap. Levels: gap at the end, from 10 or less / gap anywhere, from 20 or
// less / typed, from 30 or less. Oracle: sequence.

function countBackExplanation(row: number[], answer: number): Explanation {
  return {
    speak: ['Counting back goes down by one.', ...row.map((value) => ({ number: value })), '. The missing number is', { number: answer }, '.'],
    steps: ['Counting back goes down by one.', `${listText(row)}.`, `The missing number is ${answer}.`],
    visual: { kind: 'sequence', items: row.map((value) => numeral(value, 'l')) },
    hint: { text: 'Count back. Say the numbers going down.' },
  };
}

function countBack(level: Level, rng: Rng): QuestionDraft {
  const top = level === 1 ? rng.int(4, 10) : level === 2 ? rng.int(5, 20) : rng.int(5, 30);
  const blankIndex = level === 1 ? 3 : rng.int(0, 3);
  const row = [top, top - 1, top - 2, top - 3];
  const answer = row[blankIndex] as number;
  const prompt = 'Count back. Which number is missing?';
  const base = {
    mode: 'look' as const,
    facts: { start: top, step: -1, length: 4, blankIndex },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'sequence', items: row.map((value, i) => (i === blankIndex ? 'blank' : numeral(value, 'l'))) } as Visual,
    explanation: countBackExplanation(row, answer),
  };
  if (level === 3) return { ...base, type: 'numberPad', answer, maxDigits: 2 };
  // Counting up by mistake gives the number two above the answer.
  const values = numeralChoices(answer, [answer + 2], 0, 30, rng);
  return { ...base, facts: { ...base.facts, options: values }, ...numberChoice(answer, values) };
}

export const countBackGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-A12',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'sequence',
  exampleSeed: 809,
  pool: { 1: 7 },
  generate: countBack,
  lesson: (make) => lessonOf('Counting back goes down by one: 5, 4, 3, 2, 1.', { kind: 'sequence', items: [5, 4, 3, 2, 1].map((value) => numeral(value, 'l')) }, make(1, 809), make(2, 810), 'Counting back, each number is one less.'),
});

// ---- A.13 Tally marks ----
// Levels: 1 to 5 / 6 to 10 / 11 to 20, typed. Oracle: count.

function tallyExplanation(n: number): Explanation {
  const visual: Visual = { kind: 'tally', count: n };
  if (n <= 5) {
    const say: Say = n === 5 ? ['Four marks and one mark across them make', { number: 5 }, '.'] : ['Count each mark:', ...countAloud(n), '.'];
    return { speak: say, steps: [n === 5 ? '4 marks and 1 mark across them make 5.' : `Count each mark: ${listText(upTo(n))}.`], visual, hint: { text: 'Touch each mark as you count. Say a number for each.' } };
  }
  const fives = Array.from({ length: Math.floor(n / 5) }, (_, i) => (i + 1) * 5);
  const rest = Array.from({ length: n % 5 }, (_, i) => (fives[fives.length - 1] as number) + i + 1);
  const counted = [...fives, ...rest];
  const how = rest.length > 0 ? 'Count by fives, then by ones' : 'Count by fives';
  return {
    speak: ['Each group of tally marks is', { number: 5 }, `. ${how}:`, ...counted.map((value) => ({ number: value })), '.'],
    steps: ['Each group of tally marks is 5.', `${how}: ${listText(counted)}.`, `There are ${n} marks.`],
    visual,
    hint: { text: 'Each group of tally marks is 5. Count by fives.' },
  };
}

function tallyMarks(level: Level, rng: Rng): QuestionDraft {
  const n = level === 1 ? rng.int(1, 5) : level === 2 ? rng.int(6, 10) : rng.int(11, 20);
  const prompt = 'How many tally marks are there?';
  const base = { mode: 'look' as const, facts: { n }, prompt: { text: prompt, speak: [prompt] }, stimulus: { kind: 'tally', count: n } as Visual, explanation: tallyExplanation(n) };
  if (level === 3) return { ...base, type: 'numberPad', answer: n, maxDigits: 2 };
  const values = numeralChoices(n, [n + 1, n - 1], 1, 12, rng, level === 1 ? [1, 2, 4] : [1, 1, 1]);
  return { ...base, facts: { ...base.facts, options: values }, ...numberChoice(n, values) };
}

export const tallyMarksGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-A13',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'count',
  exampleSeed: 811,
  pool: { 1: 5, 2: 5 },
  generate: tallyMarks,
  lesson: (make) => lessonOf('A tally mark is one line for each thing. The fifth mark goes across the other four.', { kind: 'tally', count: 5 }, make(1, 811), make(2, 812), 'Count the groups of five by fives, then count on by ones.', { kind: 'tally', count: 7 }),
});
