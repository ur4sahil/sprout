import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import { LINE_ANIMALS } from '../../../data/h2-world';
import type { Thing } from '../../../data/h2-world';
import type { SkillGenerator } from '../../../generator';
import { countAloud, listText, numeral } from '../../../generator';
import { skill } from './h2-lesson';
import { group, nearbyNumbers, thingsWord, tidyGroup } from './parts';

// Math pre-K, wave H2 (plan section 15): A.9 one more, A.10 one fewer, A.11 same number,
// A.12 number order, A.13 first and last.

type Explanation = QuestionDraft['explanation'];
const numbered = (thing: Countable, n: number): Visual => ({ kind: 'emojiGroup', emoji: thing.emoji, count: n, layout: n <= 5 ? 'row' : 'grid5', numbered: true });

// A small answer (one fewer) passes preferMiddle, or it would sit first too often.
function numberChoice(answer: number, facts: QuestionDraft['facts'], text: string, speak: Say, stimulus: Visual, explanation: Explanation, rng: Rng, preferMiddle = false): QuestionDraft {
  const values = nearbyNumbers(answer, 1, 10, rng, preferMiddle);
  return {
    type: 'choice',
    mode: 'look',
    facts: { ...facts, options: values },
    prompt: { text, speak },
    stimulus,
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(answer),
    explanation,
  };
}

// ---- A.9 One more ----
// Levels: 1 to 4 and one more beside them / 1 to 9 and one more / 1 to 9, the one more not shown. Oracle: add.

function oneMore(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  const n = level === 1 ? rng.int(1, 4) : rng.int(1, 9);
  const many = thingsWord(thing, n);
  const stimulus: Visual = level === 3 ? tidyGroup(thing, n) : { kind: 'row', children: [tidyGroup(thing, n), group(thing, 1, 'row', rng)] };
  const explanation: Explanation = {
    speak: ['One more than', { number: n }, 'is', { number: n + 1 }, '. Count them:', ...countAloud(n + 1), '.'],
    steps: [`One more than ${n} is ${n + 1}.`, `Count them: ${listText(Array.from({ length: n + 1 }, (_, i) => i + 1))}.`],
    visual: numbered(thing, n + 1),
  };
  const text = `${n} ${many}. One more comes. How many now?`;
  return numberChoice(n + 1, { a: n, b: 1, thing: thing.one }, text, [{ number: n }, `${many}. One more comes. How many now?`], stimulus, explanation, rng);
}

export const oneMoreGenerator: SkillGenerator = skill({
  skillId: 'M-PK-A9',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: oneMore,
  exampleSeed: 901,
  lesson: { see: 'One more means count on to the next number.', remember: 'One more is the next number when we count.' },
  oracle: 'add',
});

// ---- A.10 One fewer ----
// Levels: 2 to 5, one crossed out / 2 to 10, one crossed out / 2 to 10, the one that goes is not shown. Oracle: subtract.

function oneFewer(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  const n = level === 1 ? rng.int(2, 5) : rng.int(2, 10);
  const layout = n <= 5 ? 'row' : 'grid5';
  const stimulus: Visual = level === 3 ? tidyGroup(thing, n) : { kind: 'emojiGroup', emoji: thing.emoji, count: n, layout, crossed: 1 };
  const explanation: Explanation = {
    speak: ['One fewer than', { number: n }, 'is', { number: n - 1 }, '.', { number: n - 1 }, 'comes just before', { number: n }, 'when we count.'],
    steps: [`One fewer than ${n} is ${n - 1}.`, `${n - 1} comes just before ${n} when we count.`],
    visual: numbered(thing, n - 1),
  };
  const many = thingsWord(thing, n);
  const text = `${n} ${many}. One goes away. How many are left?`;
  return numberChoice(n - 1, { a: n, b: 1, thing: thing.one }, text, [{ number: n }, `${many}. One goes away. How many are left?`], stimulus, explanation, rng, true);
}

export const oneFewerGenerator: SkillGenerator = skill({
  skillId: 'M-PK-A10',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: oneFewer,
  exampleSeed: 902,
  lesson: { see: 'One fewer means one goes away.', remember: 'One fewer is the number just before.' },
  oracle: 'subtract',
});

// ---- A.11 Same number ----
// Levels: up to 6, the others 2 or more away / up to 8, the others next to it / scattered groups. Oracle: count.

function sameNumber(level: Level, rng: Rng): QuestionDraft {
  const [thing, other] = rng.sample(COUNTABLES, 2) as [Countable, Countable];
  const n = level === 1 ? rng.int(1, 6) : rng.int(2, 8);
  let counts: number[];
  if (level === 1) {
    const far = Array.from({ length: 6 }, (_, i) => i + 1).filter((value) => Math.abs(value - n) >= 2);
    counts = rng.shuffle([n, ...rng.sample(far, 2)]);
  } else counts = rng.shuffle(nearbyNumbers(n, 1, 9, rng));
  const options = counts.map((count) => (level === 3 ? group(other, count, 'scatter', rng) : tidyGroup(other, count)));
  const prompt = 'Which group has the same number?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { n, thing: thing.one, other: other.one, layout: level === 3 ? 'scatter' : 'tidy', options: counts },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: tidyGroup(thing, n),
    options,
    answerIndex: counts.indexOf(n),
    explanation: {
      speak: [n === 1 ? 'There is' : 'There are', { number: n }, `${thingsWord(thing, n)}. This group has`, { number: n }, `${thingsWord(other, n)} too. They have the same number.`],
      steps: [`${n === 1 ? 'There is' : 'There are'} ${n} ${thingsWord(thing, n)}.`, `This group has ${n} ${thingsWord(other, n)} too.`, 'They have the same number.'],
      visual: { kind: 'row', children: [numbered(thing, n), numbered(other, n)] },
    },
  };
}

export const sameNumberGenerator: SkillGenerator = skill({
  skillId: 'M-PK-A11',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: sameNumber,
  exampleSeed: 903,
  lesson: { see: 'Two groups can have the same number, even when the things are not the same.', remember: 'Count each group. The same count means the same number.' },
  oracle: 'count',
});

// ---- A.12 Number order ----
// Levels: what comes next, 1 to 6 / a missing number in the middle, 1 to 6 / a missing number anywhere, 1 to 10. Oracle: sequence.

function numberOrder(level: Level, rng: Rng): QuestionDraft {
  const top = level === 3 ? 10 : 6;
  const length = rng.int(level === 1 ? 3 : 4, 5);
  const start = rng.int(1, top - length + 1);
  const blankIndex = level === 1 ? length - 1 : level === 2 ? rng.int(1, length - 2) : rng.int(0, length - 1);
  const answer = start + blankIndex;
  const row = Array.from({ length }, (_, i) => start + i);
  const prompt = level === 1 ? 'What number comes next?' : 'Which number is missing?';
  const values = nearbyNumbers(answer, 1, 10, rng, true);
  return {
    type: 'choice',
    mode: 'look',
    facts: { start, step: 1, length, blankIndex, options: values },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'sequence', items: row.map((value, i) => (i === blankIndex ? 'blank' : numeral(value, 'l'))) },
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(answer),
    explanation: {
      speak: ["Let's count:", ...row.map((value) => ({ number: value })), '.', { number: answer }, level === 1 ? 'comes next.' : 'is missing.'],
      steps: [`Let's count: ${listText(row)}.`, `${answer} ${level === 1 ? 'comes next' : 'is missing'}.`],
      visual: { kind: 'sequence', items: row.map((value) => numeral(value, 'l')) },
    },
  };
}

export const numberOrderGenerator: SkillGenerator = skill({
  skillId: 'M-PK-A12',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: numberOrder,
  exampleSeed: 904,
  lesson: { see: 'Numbers come in order when we count: one, two, three.', remember: 'Counting goes up by one each time.', tryLevel: 2 },
  oracle: 'sequence',
});

// ---- A.13 First and last ----
// Levels: first or last of 3 / first or last of 4 or 5 / second or third of 4 or 5. Oracle: h2Ordinal.

const FLAG: Visual = { kind: 'emojiGroup', emoji: '🏁', count: 1, layout: 'row', speak: ['the front of the line'] };
const animal = (each: Thing): Visual => ({ kind: 'emojiGroup', emoji: each.emoji, count: 1, layout: 'row', speak: [each.name] });

function firstLast(level: Level, rng: Rng): QuestionDraft {
  const line = rng.sample(LINE_ANIMALS, level === 1 ? 3 : rng.int(4, 5));
  const ask = level === 3 ? rng.pick(['second', 'third'] as const) : rng.pick(['first', 'last'] as const);
  const at = { first: 0, second: 1, third: 2, last: line.length - 1 }[ask];
  const answer = line[at] as Thing;
  const offered = rng.shuffle([answer, ...rng.sample(line.filter((each) => each !== answer), 2)]);
  const prompt = `Which animal is ${ask} in line?`;
  const why = ask === 'first' ? `The ${answer.name} is next to the flag. It is first.` : ask === 'last' ? `The ${answer.name} is at the very end. It is last.` : `Count from the flag: first, second${ask === 'third' ? ', third' : ''}. The ${answer.name} is ${ask}.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { line: line.map((each) => each.name), ask, options: offered.map((each) => each.name) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: { kind: 'sequence', items: [FLAG, ...line.map(animal)] },
    options: offered.map(animal),
    answerIndex: offered.indexOf(answer),
    explanation: { speak: ['The line starts at the flag.', why], steps: ['The line starts at the flag.', why], visual: { kind: 'sequence', items: [FLAG, ...line.map(animal)] } },
  };
}

export const firstLastGenerator: SkillGenerator = skill({
  skillId: 'M-PK-A13',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h2-world'],
  generate: firstLast,
  exampleSeed: 905,
  lesson: { see: 'In a line, the first one is at the front. The last one is at the end.', remember: 'Start at the front of the line: first, second, third.' },
  oracle: 'h2Ordinal',
});
