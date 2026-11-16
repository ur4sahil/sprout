import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { silentNumeral } from './parts';

// Family: Find the number. The child hears a number and taps its numeral.
// The screen never shows which one, and the numerals do not say their names.

function explain(n: number): { speak: Say; steps: string[]; visual: Visual } {
  return { speak: ['This is', { number: n }, '.'], steps: [`This is ${n}.`], visual: numeral(n) };
}

// A row of numerals, smallest first.
function numerals(...values: number[]): Visual {
  return { kind: 'row', children: values.slice().sort((x, y) => x - y).map((value) => numeral(value)) };
}

// `values` are the numerals offered, smallest first. `n` is the one asked for.
export function findNumberQuestion(n: number, values: number[]): QuestionDraft {
  return {
    type: 'choice',
    mode: 'listen',
    facts: { target: n, optionAttrs: values, options: values },
    prompt: { text: 'Find the number.', speak: ['Find the number', { number: n }, '.'] },
    options: values.map((value) => silentNumeral(value)),
    answerIndex: values.indexOf(n),
    explanation: explain(n),
  };
}

function lesson(a: number, b: number, c: number): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'Every number has its own shape.',
      speak: ['Every number has its own shape. This is', { number: a }, '.'],
      visual: numeral(a),
    },
    {
      beat: 'watch',
      text: `Find the number ${b}. This is ${b}.`,
      speak: ['Find the number', { number: b }, '.', ...explain(b).speak],
      visual: numerals(a, b),
    },
    {
      beat: 'try',
      text: `Find the number ${c}.`,
      speak: ['Find the number', { number: c }, '.'],
      visual: numerals(b, c),
      reveal: { text: `This is ${c}.`, speak: explain(c).speak, visual: numeral(c) },
    },
    {
      beat: 'remember',
      text: 'Every number has its own shape.',
      speak: ['Every number has its own shape.'],
      visual: numerals(a, b, c),
    },
  ];
}

export function findNumberSkill(skillId: string, maxLevel: Level, pick: (level: Level, rng: Rng) => { n: number; values: number[] }, lessonNumbers: [number, number, number], exampleSeed: number): SkillGenerator {
  const generate = (level: Level, rng: Rng): QuestionDraft => {
    const { n, values } = pick(level, rng);
    return findNumberQuestion(n, values.slice().sort((x, y) => x - y));
  };
  return {
    skillId,
    maxLevel,
    itemTypes: ['choice'],
    lists: [],
    generate,
    exampleSeed,
    example: () => generate(1, makeRng(exampleSeed)),
    lesson: () => lesson(...lessonNumbers),
    oracle: 'attribute',
  };
}
