import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';
import { apple, star, tidyGroup } from './parts';

// Family: More or fewer. Two groups of the same thing. Groups never tie.
// Levels: a gap of 3 or more / a gap of 2 / a gap of 1, up to 10.

type Ask = 'most' | 'least';
const WORD: Record<Ask, { prompt: string; than: string; remember: string }> = {
  most: { prompt: 'Which group has more?', than: 'is more than', remember: 'More means a bigger count.' },
  least: { prompt: 'Which group has fewer?', than: 'is fewer than', remember: 'Fewer means a smaller count.' },
};

function explain(thing: Countable, values: number[], ask: Ask): { speak: Say; steps: string[]; visual: Visual } {
  const [left, right] = values as [number, number];
  const answer = ask === 'most' ? Math.max(left, right) : Math.min(left, right);
  const other = left + right - answer;
  return {
    speak: ['This group has', { number: left }, '. This group has', { number: right }, '.', { number: answer }, WORD[ask].than, { number: other }, '.'],
    steps: [`This group has ${left}.`, `This group has ${right}.`, `${answer} ${WORD[ask].than} ${other}.`],
    visual: tidyGroup(thing, answer),
  };
}

function build(thing: Countable, values: [number, number], ask: Ask): QuestionDraft {
  const wanted = ask === 'most' ? Math.max(...values) : Math.min(...values);
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, thing: thing.one, options: values },
    prompt: { text: WORD[ask].prompt, speak: [WORD[ask].prompt] },
    options: values.map((n) => tidyGroup(thing, n)),
    answerIndex: values.indexOf(wanted),
    explanation: explain(thing, values, ask),
  };
}

function pair(level: Level, rng: Rng): [number, number] {
  for (;;) {
    const a = rng.int(1, 10);
    const b = rng.int(1, 10);
    const gap = Math.abs(a - b);
    if (level === 1 ? gap >= 3 : level === 2 ? gap === 2 : gap === 1) return [a, b];
  }
}

function lesson(ask: Ask): LessonStep[] {
  const two = (a: number, b: number, thing: Countable): Visual => ({ kind: 'row', children: [tidyGroup(thing, a), tidyGroup(thing, b)] });
  return [
    {
      beat: 'see',
      text: ask === 'most' ? 'The group with more has a bigger count.' : 'The group with fewer has a smaller count.',
      speak: [ask === 'most' ? 'The group with more has a bigger count.' : 'The group with fewer has a smaller count.'],
      visual: two(2, 5, apple),
    },
    { beat: 'watch', text: explain(apple, [2, 5], ask).steps.join(' '), speak: explain(apple, [2, 5], ask).speak, visual: explain(apple, [2, 5], ask).visual },
    {
      beat: 'try',
      text: WORD[ask].prompt,
      speak: [WORD[ask].prompt],
      visual: two(4, 1, star),
      reveal: { text: explain(star, [4, 1], ask).steps.join(' '), speak: explain(star, [4, 1], ask).speak, visual: explain(star, [4, 1], ask).visual },
    },
    { beat: 'remember', text: WORD[ask].remember, speak: [WORD[ask].remember], visual: two(3, 6, apple) },
  ];
}

export function moreFewerSkill(skillId: string, ask: Ask, exampleSeed: number): SkillGenerator {
  const generate = (level: Level, rng: Rng): QuestionDraft => build(rng.pick(COUNTABLES), pair(level, rng), ask);
  return {
    skillId,
    maxLevel: 3,
    itemTypes: ['choice'],
    lists: ['countables'],
    generate,
    exampleSeed,
    example: () => generate(1, makeRng(exampleSeed)),
    lesson: () => lesson(ask),
    oracle: 'compare',
  };
}
