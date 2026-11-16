import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { nearbyNumbers } from '../pk/parts';
import { numeralChoices } from './numerals';

// Math K D.1 Teen numbers. Family: Teen numbers. Oracle: place.
// Levels: ten frame plus ones to numeral / 10 plus 4 equals blank / 16 is 10 and blank.

const frames = (n: number): Visual => ({ kind: 'tenFrame', filled: n, frames: 2 });

function explanation(ones: number): { speak: Say; steps: string[]; visual: Visual } {
  const n = 10 + ones;
  return { speak: ['A full ten and', { number: ones }, 'more is', { number: n }, '.'], steps: [`A full ten and ${ones} more is ${n}.`], visual: frames(n) };
}

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
      prompt: { text: `${n} is 10 and what?`, speak: [{ number: n }, 'is', { number: 10 }, 'and what?'] },
      stimulus: { kind: 'equation', parts: [n, '=', 10, '+', 'blank'] },
      options: values.map((value) => numeral(value)),
      answerIndex: values.indexOf(ones),
      explanation: explanation(ones),
    };
  }
  const values = nearbyNumbers(n, 10, 20, rng);
  return {
    type: 'choice',
    mode: 'look',
    facts: { ...digits, ask: 'number', show: level === 1 ? 'frames' : 'equation', options: values },
    prompt: level === 1 ? tenAndMore(ones) : { text: `10 plus ${ones} equals what?`, speak: [{ number: 10 }, 'plus', { number: ones }, 'equals what?'] },
    stimulus: level === 1 ? frames(n) : { kind: 'equation', parts: [10, '+', ones, '=', 'blank'] },
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(n),
    explanation: explanation(ones),
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
    { beat: 'watch', text: explanation(5).steps.join(' '), speak: explanation(5).speak, visual: frames(15) },
    {
      beat: 'try',
      text: tenAndMore(7).text,
      speak: tenAndMore(7).speak,
      visual: frames(17),
      reveal: { text: explanation(7).steps.join(' '), speak: explanation(7).speak, visual: frames(17) },
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
