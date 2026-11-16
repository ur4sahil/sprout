import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { STORY_COUNTABLES } from '../../../data/countables';
import type { StoryKind } from '../../../data/storyProblems';
import { STORY_NAMES, STORY_TEMPLATES } from '../../../data/storyProblems';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { tidyGroup } from '../pk/parts';
import type { PlaceWeights } from './numerals';
import { numeralChoices } from './numerals';
import { crossedGroup } from './subtracting';

// Math K C.10 and C.11. Family: Stories. Oracles: add, subtract.
// Levels: spoken story with pictures, to 5 / to 10 / no pictures, typed.

export interface Told {
  kind: StoryKind;
  name: string;
  name2?: string; // the second child in a compare story
  thing: Countable;
  a: number;
  b: number;
  c?: number; // the third number in a two-step story
}

const isAre = (n: number): string => (n === 1 ? 'is' : 'are');

// Fills a story template (plan section 9). Numbers become number parts, so they are said as numbers.
export function tellStory(told: Told): { text: string; speak: Say } {
  const words: Record<string, string> = {
    name: told.name,
    things: told.thing.many,
    thingsA: told.a === 1 ? told.thing.one : told.thing.many,
    areA: isAre(told.a),
    areB: isAre(told.b),
  };
  const numbers: Record<string, number> = { a: told.a, b: told.b };
  if (told.name2 !== undefined) words.name2 = told.name2;
  if (told.c !== undefined) numbers.c = told.c;
  const lines: string[] = [];
  const speak: Say = [];
  for (const sentence of STORY_TEMPLATES[told.kind]) {
    let line = '';
    let run = ''; // plain words waiting to be said
    const flush = (): void => {
      if (run.trim().length > 0) speak.push(run.trim());
      run = '';
    };
    for (const piece of sentence.split(/(\{\w+\})/)) {
      const token = /^\{(\w+)\}$/.exec(piece)?.[1];
      if (token === undefined) {
        line += piece;
        run += piece;
      } else if (token in numbers) {
        const value = numbers[token] as number;
        line += String(value);
        flush();
        speak.push({ number: value });
      } else {
        const word = words[token];
        if (word === undefined) throw new Error(`story template ${told.kind} uses {${token}}, which this story does not have`);
        line += word;
        run += word;
      }
    }
    flush();
    lines.push(line);
  }
  return { text: lines.join(' '), speak };
}

function who(kind: StoryKind, rng: Rng): Told {
  // The values are filled in by the caller.
  return { kind, name: rng.pick(STORY_NAMES), thing: rng.pick(STORY_COUNTABLES), a: 0, b: 0 };
}

function storyQuestion(told: Told, level: Level, rng: Rng): QuestionDraft {
  const adding = told.kind === 'gets' || told.kind === 'table';
  const { a, b, thing } = told;
  const answer = adding ? a + b : a - b;
  // A story that names no one keeps no name, so two children's names cannot make the same story twice.
  const named = STORY_TEMPLATES[told.kind].some((sentence) => sentence.includes('{name}'));
  const facts: QuestionDraft['facts'] = named ? { a, b, thing: thing.one, name: told.name, story: told.kind } : { a, b, thing: thing.one, story: told.kind };
  const explanation = {
    speak: [{ number: a }, adding ? 'plus' : 'take away', { number: b }, 'is', { number: answer }, '.'] as Say,
    steps: [`${a} ${adding ? 'plus' : 'take away'} ${b} is ${answer}.`],
    visual: { kind: 'equation', parts: [a, adding ? '+' : '-', b, '=', answer] } as Visual,
  };
  const prompt = tellStory(told);
  if (level === 3) return { type: 'numberPad', mode: 'look', facts, prompt, answer, maxDigits: 2, explanation };
  // The slips: one off, the other operation's answer, or a number from the story said again.
  // Small answers can rarely sit last, so at level 1 that place gets extra weight when it is open.
  const weights: PlaceWeights = level === 1 ? [1, 1, 2] : [1, 1, 1];
  const values = adding ? numeralChoices(answer, [a, b, Math.abs(a - b)], 1, 12, rng, weights) : numeralChoices(answer, [a, b, a + b], 0, 12, rng, weights);
  const stimulus: Visual = adding ? { kind: 'row', children: [tidyGroup(thing, a), tidyGroup(thing, b)] } : crossedGroup(thing.emoji, a, b);
  return { type: 'choice', mode: 'look', facts: { ...facts, options: values }, prompt, stimulus, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(answer), explanation };
}

function storyLesson(seeText: string, watch: Told, tryIt: Told): LessonStep[] {
  const adding = watch.kind === 'gets' || watch.kind === 'table';
  const picture = (told: Told): Visual => (adding ? { kind: 'row', children: [tidyGroup(told.thing, told.a), tidyGroup(told.thing, told.b)] } : crossedGroup(told.thing.emoji, told.a, told.b));
  const answerOf = (told: Told): { text: string; speak: Say } => {
    const answer = adding ? told.a + told.b : told.a - told.b;
    const word = adding ? 'plus' : 'take away';
    return { text: `${told.a} ${word} ${told.b} is ${answer}.`, speak: [{ number: told.a }, word, { number: told.b }, 'is', { number: answer }, '.'] };
  };
  return [
    { beat: 'see', text: seeText, speak: [seeText], visual: picture(watch) },
    {
      beat: 'watch',
      text: `${tellStory(watch).text} ${answerOf(watch).text}`,
      speak: [...tellStory(watch).speak, ...answerOf(watch).speak],
      visual: picture(watch),
    },
    { beat: 'try', text: tellStory(tryIt).text, speak: tellStory(tryIt).speak, visual: picture(tryIt), reveal: { text: answerOf(tryIt).text, speak: answerOf(tryIt).speak } },
    { beat: 'remember', text: 'Listen for joining or taking away.', speak: ['Listen for joining or taking away.'], visual: picture(tryIt) },
  ];
}

const APPLE = STORY_COUNTABLES[0] as Countable;
const COOKIE = STORY_COUNTABLES.find((thing) => thing.one === 'cookie') ?? APPLE;

// ---- C.10 Addition stories ----
// Levels: sums to 5 / to 10 / no pictures, typed.

const SUMS: Record<number, [number, number]> = { 1: [2, 5], 2: [6, 10], 3: [2, 10] };

function additionStory(level: Level, rng: Rng): QuestionDraft {
  const told = who(rng.pick<StoryKind>(['gets', 'table']), rng);
  const [lo, hi] = SUMS[level] ?? (SUMS[3] as [number, number]);
  const sum = rng.int(lo, hi);
  told.a = rng.int(1, sum - 1);
  told.b = sum - told.a;
  return storyQuestion(told, level, rng);
}

export const additionStoriesGenerator: SkillGenerator = {
  skillId: 'M-K-C10',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables', 'storyProblems'],
  generate: additionStory,
  exampleSeed: 40,
  example: () => additionStory(1, makeRng(40)),
  lesson: () =>
    storyLesson(
      'A story can tell us to add. Getting more means adding.',
      { kind: 'gets', name: 'Sam', thing: APPLE, a: 2, b: 1 },
      { kind: 'table', name: 'Mia', thing: COOKIE, a: 3, b: 2 },
    ),
  oracle: 'add',
};

// ---- C.11 Subtraction stories ----
// Levels: within 5 / within 10 / no pictures, typed.

const STARTS: Record<number, [number, number]> = { 1: [2, 5], 2: [6, 10], 3: [2, 10] };

function subtractionStory(level: Level, rng: Rng): QuestionDraft {
  const told = who(rng.pick<StoryKind>(['givesAway', 'takes']), rng);
  const [lo, hi] = STARTS[level] ?? (STARTS[3] as [number, number]);
  told.a = rng.int(lo, hi);
  told.b = rng.int(1, told.a - 1);
  return storyQuestion(told, level, rng);
}

export const subtractionStoriesGenerator: SkillGenerator = {
  skillId: 'M-K-C11',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables', 'storyProblems'],
  generate: subtractionStory,
  exampleSeed: 42,
  example: () => subtractionStory(1, makeRng(42)),
  lesson: () =>
    storyLesson(
      'A story can tell us to take away. Giving some away means taking away.',
      { kind: 'givesAway', name: 'Leo', thing: APPLE, a: 4, b: 1 },
      { kind: 'takes', name: 'Zoe', thing: COOKIE, a: 5, b: 2 },
    ),
  oracle: 'subtract',
};
