import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { STORY_COUNTABLES } from '../../../data/countables';
import { CONTAINERS, STORIES } from '../../../data/h5-stories';
import type { StoryKind } from '../../../data/h5-stories';
import { STORY_NAMES } from '../../../data/storyProblems';
import type { SkillGenerator } from '../../../generator';
import type { Explanation, Prompt } from './h5-parts';
import { equation, fill, find, numberAnswer, sentenceOption } from './h5-parts';

// Math grade 3, wave H5: B.5 subtract across zeros, B.6 which operation.

const digit = (n: number, place: number): number => Math.floor(n / 10 ** place) % 10;

// ---- B.5 Subtract across zeros ----
// Levels: from whole hundreds (400 − 156) / a zero in the tens (503 − 278) / either, in columns. Oracle: subtract.

function zerosExplanation(a: number, b: number): Explanation {
  const [h, o] = [Math.floor(a / 100), a % 10];
  const [bh, bt, bo] = [digit(b, 2), digit(b, 1), digit(b, 0)];
  const answer = a - b;
  return {
    speak: ['There are no tens to break, so break a hundred into ten tens first, then a ten into ten ones.', { number: a }, 'is', { number: h - 1 }, 'hundreds,', { number: 9 }, 'tens and', { number: o + 10 }, 'ones. The answer is', { number: answer }, '.'],
    steps: [
      o === 0 ? 'There are no ones and no tens. Break a hundred into 10 tens, then a ten into 10 ones.' : 'There are not enough ones, and no tens to break. Break a hundred into 10 tens, then a ten into 10 ones.',
      `${a} is now ${h - 1} hundreds, 9 tens and ${o + 10} ones.`,
      `Ones: ${o + 10} − ${bo} = ${o + 10 - bo}. Tens: 9 − ${bt} = ${9 - bt}. Hundreds: ${h - 1} − ${bh} = ${h - 1 - bh}.`,
      `The answer is ${answer}.`,
    ],
    visual: equation(a, '-', b, '=', answer),
  };
}

const minusPrompt = (a: number, b: number): Prompt => ({ text: `${a} minus ${b} equals what?`, speak: [{ number: a }, 'minus', { number: b }, 'equals what?'] });

function acrossZeros(level: Level, rng: Rng): QuestionDraft {
  const middle = level === 2 || (level === 3 && rng.bool());
  const [a, b] = find(
    (): [number, number] => {
      const top = rng.int(3, 9) * 100 + (middle ? rng.int(1, 8) : 0);
      return [top, rng.int(101, top - 1)];
    },
    // The ones always need a ten, and there are no tens to break: the hundred must be broken first.
    ([x, y]) => digit(y, 0) > digit(x, 0) && digit(y, 2) < digit(x, 2),
  );
  const answer = a - b;
  const explanation = zerosExplanation(a, b);
  if (level === 3) {
    const asked = minusPrompt(a, b);
    return { type: 'columnSum', mode: 'look', facts: { a, b }, prompt: { text: `Work it out in columns. ${asked.text}`, speak: ['Work it out in columns.', ...asked.speak] }, top: a, bottom: b, op: '-', answer, explanation };
  }
  // The slips: the smaller digit taken from the bigger in each place, the hundred never taken, a ten too many.
  const flipped = [0, 1, 2].reduce((sum, place) => sum + Math.abs(digit(a, place) - digit(b, place)) * 10 ** place, 0);
  return numberAnswer({ prompt: minusPrompt(a, b), stimulus: equation(a, '-', b, '=', 'blank'), explanation }, { a, b }, answer, [flipped, answer + 100, answer + 10], false, rng, [0, 999]);
}

export const subtractZerosGenerator: SkillGenerator = {
  skillId: 'M-3-B5',
  maxLevel: 3,
  itemTypes: ['choice', 'columnSum'],
  lists: [],
  generate: acrossZeros,
  exampleSeed: 3105,
  example: () => acrossZeros(1, makeRng(3105)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'When there are no tens to break, break a hundred into 10 tens first.', speak: ['When there are no tens to break, break a hundred into ten tens first.'], visual: equation(400, '-', 156) },
    { beat: 'watch', text: `400 minus 156. ${zerosExplanation(400, 156).steps.join(' ')}`, speak: [{ number: 400 }, 'minus', { number: 156 }, '.', ...zerosExplanation(400, 156).speak], visual: zerosExplanation(400, 156).visual },
    { beat: 'try', text: minusPrompt(503, 278).text, speak: minusPrompt(503, 278).speak, visual: equation(503, '-', 278, '=', 'blank'), reveal: { text: zerosExplanation(503, 278).steps.join(' '), speak: zerosExplanation(503, 278).speak, visual: zerosExplanation(503, 278).visual } },
    { beat: 'remember', text: '400 is also 3 hundreds, 9 tens and 10 ones.', speak: [{ number: 400 }, 'is also', { number: 3 }, 'hundreds,', { number: 9 }, 'tens and', { number: 10 }, 'ones.'], visual: equation(400, '=', 399, '+', 1) },
  ],
  oracle: 'subtract',
};

// ---- B.6 Which operation? ----
// Levels: times or divided by / any of the four signs / pick the number sentence. Oracle: operation3.

type Sign = '+' | '−' | '×' | '÷';
const SIGNS: readonly Sign[] = ['+', '−', '×', '÷'];
const KINDS: Record<Sign, readonly StoryKind[]> = { '+': ['join'], '−': ['separate', 'compare'], '×': ['groups', 'array'], '÷': ['share', 'groupsOf'] };
const SIGN_SAY: Record<Sign, string> = { '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divided by' };
const WHY: Record<StoryKind, string> = {
  join: 'Two amounts are put together, so add.',
  separate: 'Some are taken away, so subtract.',
  compare: '"How many more" compares two amounts, so subtract.',
  groups: 'Equal groups are put together, so multiply.',
  array: 'Equal rows are put together, so multiply.',
  share: 'Things are shared out equally, so divide.',
  groupsOf: 'We find how many equal groups there are, so divide.',
};
const work = (a: number, sign: Sign, b: number): number => (sign === '+' ? a + b : sign === '−' ? a - b : sign === '×' ? a * b : a / b);

function storyNumbers(kind: StoryKind, rng: Rng): [number, number] {
  if (kind === 'groups' || kind === 'array') return [rng.int(2, 9), rng.int(2, 9)];
  if (kind === 'share' || kind === 'groupsOf') {
    const [b, q] = [rng.int(2, 9), rng.int(2, 9)];
    return [b * q, b];
  }
  const a = rng.int(kind === 'join' ? 12 : 25, kind === 'join' ? 60 : 95);
  return [a, rng.int(5, kind === 'join' ? Math.min(a, 40) : a - 5)];
}

export function tellStory(kind: StoryKind, a: number, b: number, rng: Rng): { story: Prompt; template: number; emoji: string } {
  const template = rng.int(0, STORIES[kind].length - 1);
  const thing = rng.pick(STORY_COUNTABLES);
  const box = rng.pick(CONTAINERS);
  const [name, name2] = rng.sample(STORY_NAMES, 2) as [string, string];
  const story = fill(STORIES[kind][template] as string, { name, name2, a, b, things: thing.many, thing: thing.one, box: box.one, boxes: box.many });
  return { story, template, emoji: thing.emoji };
}

function whichExplanation(kind: StoryKind, sign: Sign, a: number, b: number): Explanation {
  const result = work(a, sign, b);
  return {
    speak: [WHY[kind].replace(/"/g, ''), { number: a }, SIGN_SAY[sign], { number: b }, 'equals', { number: result }, '.'],
    steps: [WHY[kind], `${a} ${sign} ${b} = ${result}.`],
    visual: equation(a, sign === '−' ? '-' : sign, b, '=', result),
  };
}

function whichOperation(level: Level, rng: Rng): QuestionDraft {
  const sign = rng.pick(level === 1 ? (['×', '÷'] as Sign[]) : SIGNS);
  const kind = rng.pick(KINDS[sign]);
  const [a, b] = storyNumbers(kind, rng);
  const { story, template } = tellStory(kind, a, b, rng);
  const explanation = whichExplanation(kind, sign, a, b);
  if (level === 3) {
    const sentences = rng.shuffle([sign, ...rng.sample(SIGNS.filter((other) => other !== sign), 2)]).map((each) => `${a} ${each} ${b}`);
    const ask = 'Which number sentence solves it?';
    return {
      type: 'choice',
      mode: 'look',
      facts: { kind, a, b, template, ask: 'sentence', options: sentences },
      prompt: { text: `${story.text} ${ask}`, speak: [...story.speak, ask] },
      options: sentences.map((sentence) => sentenceOption(sentence)),
      answerIndex: sentences.indexOf(`${a} ${sign} ${b}`),
      explanation,
    };
  }
  const shown = level === 1 ? (['×', '÷'] as Sign[]) : SIGNS;
  const ask = 'Which sign would you use?';
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { kind, a, b, template, ask: 'sign', options: [...shown] },
    prompt: { text: `${story.text} ${ask}`, speak: [...story.speak, ask] },
    options: shown.map((each): Visual => ({ kind: 'text', value: each, size: 'xl', speak: [SIGN_SAY[each]] })),
    answerIndex: shown.indexOf(sign),
    explanation,
  };
}

const lessonStory: Prompt = { text: 'Sam puts 24 apples into bags of 6. How many bags are there?', speak: ['Sam puts', { number: 24 }, 'apples into bags of', { number: 6 }, '. How many bags are there?'] as Say };

export const whichOperationGenerator: SkillGenerator = {
  skillId: 'M-3-B6',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['countables', 'h5-stories'],
  generate: whichOperation,
  exampleSeed: 3106,
  example: () => whichOperation(1, makeRng(3106)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Put together: add. Take away or compare: subtract. Equal groups: multiply. Share equally: divide.', speak: ['Put together: add. Take away or compare: subtract. Equal groups: multiply. Share equally: divide.'], visual: { kind: 'text', value: '+ − × ÷', size: 'xl' } },
    { beat: 'watch', text: `Mia has 4 boxes with 5 balls in each. ${whichExplanation('groups', '×', 4, 5).steps.join(' ')}`, speak: ['Mia has', { number: 4 }, 'boxes with', { number: 5 }, 'balls in each.', ...whichExplanation('groups', '×', 4, 5).speak], visual: whichExplanation('groups', '×', 4, 5).visual },
    { beat: 'try', text: `${lessonStory.text} Which sign would you use?`, speak: [...lessonStory.speak, 'Which sign would you use?'], visual: { kind: 'text', value: '+ − × ÷', size: 'xl' }, reveal: { text: whichExplanation('groupsOf', '÷', 24, 6).steps.join(' '), speak: whichExplanation('groupsOf', '÷', 24, 6).speak, visual: whichExplanation('groupsOf', '÷', 24, 6).visual } },
    { beat: 'remember', text: 'Ask what happens in the story, then choose the sign.', speak: ['Ask what happens in the story, then choose the sign.'], visual: { kind: 'text', value: '+ − × ÷', size: 'xl' } },
  ],
  oracle: 'operation3',
};

