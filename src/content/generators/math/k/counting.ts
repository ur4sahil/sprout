import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { countExplanation, countLesson, countQuestion, group, nearbyNumbers } from '../pk/parts';

// Math K A.1 to A.3: counting objects and ten frames. Family: Count objects, and Ten frames.

// ---- A.1 Count to 20 ----
// Levels: 6 to 12 in rows of five / 11 to 20 / typed / scattered to 20, typed.

function typedCount(thing: Countable, n: number, layout: 'grid5' | 'scatter', rng: Rng): QuestionDraft {
  const stimulus = group(thing, n, layout, rng);
  const facts: QuestionDraft['facts'] = { n, thing: thing.one };
  if (stimulus.kind === 'emojiGroup' && stimulus.slots) facts.slots = stimulus.slots;
  const prompt = `How many ${thing.many} are there?`;
  return { type: 'numberPad', mode: 'look', facts, prompt: { text: prompt, speak: [prompt] }, stimulus, answer: n, maxDigits: 2, explanation: countExplanation(thing, n) };
}

function countTo20(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  if (level === 1) return countQuestion(thing, rng.int(6, 12), 'grid5', 1, 20, rng);
  if (level === 2) return countQuestion(thing, rng.int(11, 20), 'grid5', 1, 20, rng);
  if (level === 3) return typedCount(thing, rng.int(11, 20), 'grid5', rng);
  return typedCount(thing, rng.int(6, 20), 'scatter', rng);
}

export const countTo20Generator: SkillGenerator = {
  skillId: 'M-K-A1',
  maxLevel: 4,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables'],
  generate: countTo20,
  exampleSeed: 21,
  example: () => countTo20(1, makeRng(21)),
  lesson: () => countLesson(8, 12, 11),
  oracle: 'count',
};

// ---- A.2 and A.3 Ten frames ----

function frame(n: number, frames: 1 | 2): Visual {
  return { kind: 'tenFrame', filled: n, frames };
}

// The hint for a ten frame: a full row or a full frame first, then count on. Up to 5, count the dots one by
// one; a full row of 5 would be the answer itself.
function frameHint(n: number, frames: 1 | 2): Hint {
  if (frames === 2) return { text: 'A full frame is 10. Count on from 10.' };
  return { text: n <= 5 ? 'Touch each dot as you count. Say a number for each.' : 'A full row is 5. Count on from 5.' };
}

// The things in a ten frame are called dots, the same word as the dot cards. "Counters" is a new word for a
// five-year-old (the wording audit, Nov 21, 2026).
function frameExplanation(n: number, frames: 1 | 2): { speak: Say; steps: string[]; visual: Visual; hint: Hint } {
  const visual = frame(n, frames);
  const hint = frameHint(n, frames);
  if (frames === 2 || n === 10) {
    const more = n - 10;
    if (more === 0) return { speak: ['A full frame is', { number: 10 }, '.'], steps: ['A full frame is 10.'], visual, hint };
    return {
      speak: ['A full frame is', { number: 10 }, '.', { number: 10 }, 'and', { number: more }, 'more makes', { number: n }, '.'],
      steps: ['A full frame is 10.', `10 and ${more} more makes ${n}.`],
      visual,
      hint,
    };
  }
  if (n < 5) return { speak: ['Count the dots.', { number: n }, '.'], steps: [`Count the dots: ${n}.`], visual, hint };
  if (n === 5) return { speak: ['A full row is', { number: 5 }, '.'], steps: ['A full row is 5.'], visual, hint };
  return {
    speak: ['A full row is', { number: 5 }, '.', { number: 5 }, 'and', { number: n - 5 }, 'more makes', { number: n }, '.'],
    steps: ['A full row is 5.', `5 and ${n - 5} more makes ${n}.`],
    visual,
    hint,
  };
}

const frameAsk = (frames: 1 | 2): string => (frames === 1 ? 'How many dots are in the ten frame?' : 'How many dots are in the ten frames?');

function frameQuestion(n: number, frames: 1 | 2, typed: boolean, lo: number, hi: number, rng: Rng): QuestionDraft {
  const prompt = frameAsk(frames);
  const base = { mode: 'look' as const, prompt: { text: prompt, speak: [prompt] as Say }, stimulus: frame(n, frames), explanation: frameExplanation(n, frames) };
  if (typed) return { ...base, type: 'numberPad', facts: { n, frames }, answer: n, maxDigits: 2 };
  const values = nearbyNumbers(n, lo, hi, rng, true);
  return { ...base, type: 'choice', facts: { n, frames, options: values }, options: values.map((value) => numeral(value)), answerIndex: values.indexOf(n) };
}

function frameLesson(frames: 1 | 2, see: number, watch: number, tryIt: number, remember: string): LessonStep[] {
  return [
    {
      beat: 'see',
      text: frames === 1 ? 'A ten frame has two rows of 5.' : 'Two ten frames hold 20. A full frame is 10.',
      speak: frames === 1 ? ['A ten frame has two rows of', { number: 5 }, '.'] : ['Two ten frames hold', { number: 20 }, '. A full frame is', { number: 10 }, '.'],
      visual: frame(see, frames),
    },
    { beat: 'watch', text: frameExplanation(watch, frames).steps.join(' '), speak: frameExplanation(watch, frames).speak, visual: frame(watch, frames) },
    {
      beat: 'try',
      text: frameAsk(frames),
      speak: [frameAsk(frames)],
      visual: frame(tryIt, frames),
      reveal: { text: frameExplanation(tryIt, frames).steps.join(' '), speak: frameExplanation(tryIt, frames).speak, visual: frame(tryIt, frames) },
    },
    { beat: 'remember', text: remember, speak: [remember], visual: frame(10, 1) },
  ];
}

// A.2 Ten frames to 10. Levels: 1 to 5 / 6 to 10 / typed.
const framesTo10 = (level: Level, rng: Rng): QuestionDraft =>
  level === 1 ? frameQuestion(rng.int(1, 5), 1, false, 1, 10, rng) : level === 2 ? frameQuestion(rng.int(6, 10), 1, false, 1, 10, rng) : frameQuestion(rng.int(1, 10), 1, true, 1, 10, rng);

export const framesTo10Generator: SkillGenerator = {
  skillId: 'M-K-A2',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  pool: { 1: 5, 2: 5 }, // a frame is its number of counters and nothing else
  generate: framesTo10,
  exampleSeed: 22,
  example: () => framesTo10(1, makeRng(22)),
  lesson: () => frameLesson(1, 5, 7, 8, 'A full frame is ten.'),
  oracle: 'count',
};

// A.3 Ten frames to 20. Levels: 11 to 15 / 11 to 20 / typed.
const framesTo20 = (level: Level, rng: Rng): QuestionDraft =>
  level === 1 ? frameQuestion(rng.int(11, 15), 2, false, 10, 20, rng) : frameQuestion(rng.int(11, 20), 2, level === 3, 10, 20, rng);

export const framesTo20Generator: SkillGenerator = {
  skillId: 'M-K-A3',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: [],
  pool: { 1: 5 },
  generate: framesTo20,
  exampleSeed: 23,
  example: () => framesTo20(1, makeRng(23)),
  lesson: () => frameLesson(2, 10, 13, 16, 'A full frame is ten.'),
  oracle: 'count',
};
