import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { nearbyNumbers } from '../pk/parts';
import { numeralChoices } from './numerals';

// Math K D.1 Teen numbers. Family: Teen numbers. Oracle: place.
// Levels: ten frame plus ones to numeral / 10 plus 4 equals blank / 16 is 10 and blank.

const frames = (n: number): Visual => ({ kind: 'tenFrame', filled: n, frames: 2 });

function explanation(ones: number, hint: Hint): { speak: Say; steps: string[]; visual: Visual; hint: Hint } {
  const n = 10 + ones;
  return { speak: ['A full ten and', { number: ones }, 'more is', { number: n }, '.'], steps: [`A full ten and ${ones} more is ${n}.`], visual: frames(n), hint };
}

// Hints that start from the ten. None names the answer: the ones are 1 to 9 and the teen number is never 10.
const TEN_AND_MORE: Hint = { text: 'A full frame is 10. Count on from 10.' };
const tenPlus = (ones: number): Hint => ({ text: `Start at 10. Count on ${ones} more.` });
const upFromTen = (n: number): Hint => ({ text: `Start at 10. Count up to ${n}.` });

function tenAndMore(ones: number): { text: string; speak: Say } {
  return { text: `10 and ${ones} more is what number?`, speak: [{ number: 10 }, 'and', { number: ones }, 'more is what number?'] };
}

function teenQuestion(ones: number, level: Level, rng: Rng): QuestionDraft {
  const n = 10 + ones;
  const digits = { hundreds: 0, tens: 1, ones };
  if (level === 3) {
    // The slips: one off, the ten itself, or the 1 the number starts with.
    const values = numeralChoices(ones, [10, 1], 1, 10, rng, [1, 2, 2]);
    return {
      type: 'choice',
      mode: 'look',
      facts: { ...digits, ask: 'onesDigit', show: 'parts', options: values },
      // The parts first, as the steps say them (the wording audit, Nov 21, 2026).
      prompt: { text: `10 and what make ${n}?`, speak: [{ number: 10 }, 'and what make', { number: n }, '?'] },
      stimulus: { kind: 'equation', parts: [n, '=', 10, '+', 'blank'] },
      options: values.map((value) => numeral(value)),
      answerIndex: values.indexOf(ones),
      explanation: explanation(ones, upFromTen(n)),
    };
  }
  const values = nearbyNumbers(n, 10, 20, rng);
  return {
    type: 'choice',
    mode: 'look',
    facts: { ...digits, ask: 'number', show: level === 1 ? 'frames' : 'equation', options: values },
    // The sum asked the natural way (the owner's choice, Nov 22, 2026): "What is 10 plus 4?".
    prompt: level === 1 ? tenAndMore(ones) : { text: `What is 10 plus ${ones}?`, speak: ['What is', { number: 10 }, 'plus', { number: ones }, '?'] },
    stimulus: level === 1 ? frames(n) : { kind: 'equation', parts: [10, '+', ones, '=', 'blank'] },
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(n),
    explanation: explanation(ones, level === 1 ? TEN_AND_MORE : tenPlus(ones)),
  };
}

const teens = (level: Level, rng: Rng): QuestionDraft => teenQuestion(rng.int(1, 9), level, rng);

function lesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'Teen numbers are ten and some more. This is 13.',
      speak: ['Teen numbers are ten and some more. This is', { number: 13 }, '.'],
      visual: frames(13),
    },
    { beat: 'watch', text: explanation(5, TEN_AND_MORE).steps.join(' '), speak: explanation(5, TEN_AND_MORE).speak, visual: frames(15) },
    {
      beat: 'try',
      text: tenAndMore(7).text,
      speak: tenAndMore(7).speak,
      visual: frames(17),
      reveal: { text: explanation(7, TEN_AND_MORE).steps.join(' '), speak: explanation(7, TEN_AND_MORE).speak, visual: frames(17) },
    },
    {
      beat: 'remember',
      text: 'Teen numbers are ten and some more.',
      speak: ['Teen numbers are ten and some more.'],
      visual: { kind: 'equation', parts: [10, '+', 4, '=', 14] },
    },
  ];
}

export const teenNumbersGenerator: SkillGenerator = {
  skillId: 'M-K-D1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: teens,
  exampleSeed: 41,
  example: () => teens(1, makeRng(41)),
  lesson,
  oracle: 'place',
};
