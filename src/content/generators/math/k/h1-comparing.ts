import type { Rng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Visual } from '../../../../engine/types';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { EnoughPair } from '../../../data/h1-things';
import { ENOUGH_PAIRS } from '../../../data/h1-things';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { tidyGroup } from '../pk/parts';
import type { Explanation } from './h1-parts';
import { YES_NO, h1Skill, lessonOf, numberChoice, spoken, yesNoOptions } from './h1-parts';
import { numeralChoices } from './numerals';

// Math kindergarten, plan section 15 wave H1: B.4 are there enough, B.5 compare a group and a number.

// ---- B.4 Are there enough? ----
// One row of animals, a row of what each needs under it, matched one to one. Levels: is there one for
// every one (yes or no) / how many more are needed / typed, where none may be needed. Oracle: h1Enough.

// The animals sit in the top row of the 5 by 4 grid, the things under them in the second row.
function rows(pair: EnoughPair, need: number, have: number): Visual {
  const slots = [...Array.from({ length: need }, (_, i) => i), ...Array.from({ length: have }, (_, i) => 5 + i)];
  return { kind: 'emojiGroup', emoji: pair.emoji, count: need, emoji2: pair.wantEmoji, count2: have, layout: 'scatter', slots };
}

const noun = (n: number, one: string, many: string): string => (n === 1 ? one : many);

function enoughExplanation(pair: EnoughPair, need: number, have: number): Explanation {
  const visual = rows(pair, need, have);
  const match = `Match each ${pair.one} with one ${pair.want}.`;
  if (have >= need) {
    const line = `Every ${pair.one} gets one. There are enough.`;
    return { speak: [match, line], steps: [match, line], visual };
  }
  const short = need - have;
  const line = `${short} ${noun(short, pair.one, pair.many)} ${short === 1 ? 'has' : 'have'} none. We need ${short} more ${noun(short, pair.want, pair.wants)}.`;
  return { speak: [match, ...spoken(line)], steps: [match, line], visual };
}

function enough(level: Level, rng: Rng): QuestionDraft {
  const pair = rng.pick(ENOUGH_PAIRS);
  const need = rng.int(2, 5);
  // Level 1 is enough half the time. Level 3 sometimes needs none more.
  const have = level === 1 ? (rng.bool() ? rng.int(need, 5) : rng.int(1, need - 1)) : level === 3 && rng.bool(0.2) ? rng.int(need, 5) : rng.int(1, need - 1);
  const facts = { thing: pair.one, need, have };
  const explanation = enoughExplanation(pair, need, have);
  if (level === 1) {
    const prompt = `Is there a ${pair.want} for every ${pair.one}?`;
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { ...facts, ask: 'enough', options: YES_NO },
      prompt: { text: prompt, speak: [prompt] },
      stimulus: rows(pair, need, have),
      options: yesNoOptions(),
      answerIndex: have >= need ? 0 : 1,
      explanation,
    };
  }
  const more = Math.max(0, need - have);
  const prompt = `Each ${pair.one} needs one ${pair.want}. How many more ${pair.wants} do we need?`;
  const base = { mode: 'look' as const, facts: { ...facts, ask: 'more' }, prompt: { text: prompt, speak: [prompt] }, stimulus: rows(pair, need, have), explanation };
  if (level === 3) return { ...base, type: 'numberPad', answer: more, maxDigits: 1 };
  const values = numeralChoices(more, [need, have], 0, 6, rng);
  return { ...base, facts: { ...base.facts, options: values }, ...numberChoice(more, values) };
}

export const enoughGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-B4',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'h1Enough',
  exampleSeed: 821,
  lists: ['h1-things'],
  generate: enough,
  lesson: (make) => lessonOf('To see if there are enough, match them one to one.', rows(ENOUGH_PAIRS[0] as EnoughPair, 3, 3), make(1, 821), make(2, 822), 'Match one to one. Any left over with none? Then there are not enough.'),
});

// ---- B.5 Compare a group and a number ----
// A group of pictures and a numeral: which shows more (or fewer)? Levels: to 5, 2 or more apart /
// to 10 / to 10, 1 apart, more or fewer. Oracle: compare.

function groupVsNumber(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(COUNTABLES);
  const hi = level === 1 ? 5 : 10;
  let group = rng.int(1, hi);
  let number = rng.int(1, hi);
  const gap = level === 1 ? 2 : 1;
  while (Math.abs(group - number) < gap || (level === 3 && Math.abs(group - number) !== 1) || (level === 2 && Math.abs(group - number) > 3)) {
    group = rng.int(1, hi);
    number = rng.int(1, hi);
  }
  const ask = level === 3 && rng.bool() ? 'least' : 'most';
  const groupFirst = rng.bool();
  const values = groupFirst ? [group, number] : [number, group];
  const picture: Visual = tidyGroup(thing, group);
  const options = groupFirst ? [picture, numeral(number)] : [numeral(number), picture];
  const word = ask === 'most' ? 'more' : 'fewer';
  const prompt = `Which shows ${word}: the ${thing.many} or the number?`;
  const bigger = Math.max(group, number);
  const smaller = Math.min(group, number);
  const compared = ask === 'most' ? `${bigger} is more than ${smaller}.` : `${smaller} is fewer than ${bigger}.`;
  const line = `Count the ${thing.many}: ${group}. ${compared}`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, thing: thing.one, options: values },
    prompt: { text: prompt, speak: [prompt] },
    options,
    answerIndex: values.indexOf(ask === 'most' ? bigger : smaller),
    explanation: { speak: spoken(line), steps: [`Count the ${thing.many}: ${group}.`, compared], visual: { kind: 'emojiGroup', emoji: thing.emoji, count: group, layout: group <= 5 ? 'row' : 'grid5', numbered: true } },
  };
}

export const groupVsNumberGenerator: SkillGenerator = h1Skill({
  skillId: 'M-K-B5',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'compare',
  exampleSeed: 823,
  lists: ['countables'],
  generate: groupVsNumber,
  lesson: (make) => lessonOf('A group of things and a number can be compared. Count the group first.', { kind: 'row', children: [tidyGroup(COUNTABLES[0] as Countable, 4), numeral(6)] }, make(1, 823), make(2, 824), 'Count the group, then compare the two numbers.'),
});
