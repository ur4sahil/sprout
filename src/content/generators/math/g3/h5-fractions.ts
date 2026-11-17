import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { STORY_COUNTABLES } from '../../../data/countables';
import { FRACTION_STORIES, SET_STORIES } from '../../../data/h5-stories';
import { STORY_NAMES } from '../../../data/storyProblems';
import type { SkillGenerator } from '../../../generator';
import { fractionSay } from './fractions';
import type { Explanation } from './h5-parts';
import { fill, find, fractionPiece, numberAnswer } from './h5-parts';

// Math grade 3, wave H5: E.5 whole numbers as fractions, E.6 fractions of a group, E.7 compare fractions in stories.

const fractionText = (n: number, d: number): string => `${n}/${d}`;
const fractionOption = (n: number, d: number): Visual => ({ kind: 'text', value: fractionText(n, d), size: 'l', speak: fractionSay(n, d) });
const picture = (n: number, d: number, shape: 'circle' | 'rectangle' = 'rectangle'): Visual => ({ kind: 'fraction', shape, parts: d, shaded: n, equal: true });
const parse = (text: string): [number, number] => text.split('/').map(Number) as [number, number];

// ---- E.5 Whole numbers as fractions ----
// Levels: the fraction that names a whole shape / 6/1 and 8/8 as whole numbers / the fraction equal to 2, 3 or 4.
// Oracle: expression3.

function oneWholeExplanation(d: number, shape: 'circle' | 'rectangle'): Explanation {
  return {
    speak: ['The whole is cut into', { number: d }, 'equal parts, and all', { number: d }, 'are shaded.', ...fractionSay(d, d), 'is one whole.'],
    steps: [`The whole is cut into ${d} equal parts.`, `All ${d} parts are shaded: ${d}/${d}.`, `${d}/${d} = 1 whole.`],
    visual: picture(d, d, shape),
  };
}

function wholeExplanation(n: number, d: number): Explanation {
  const w = n / d;
  if (d === 1) return { speak: [...fractionSay(n, 1), 'means', { number: n }, 'wholes, each cut into one part. That is', { number: n }, '.'], steps: [`${n}/1 means ${n} wholes, each in 1 part.`, `${n}/1 = ${n}.`], visual: { kind: 'numberLine', min: 0, max: n, step: 1, marked: [n] } };
  return {
    speak: ['Count the', { number: d }, 'parts of each whole.', { number: n }, 'parts make', { number: w }, w === 1 ? 'whole.' : 'wholes.'],
    steps: [`It takes ${d} parts of ${d} to make 1 whole.`, `${n} parts make ${n} ÷ ${d} = ${w} ${w === 1 ? 'whole' : 'wholes'}.`, `${n}/${d} = ${w}.`],
    visual: { kind: 'numberLine', min: 0, max: n, step: 1, denominator: d, marked: [n] },
  };
}

function wholes(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const d = rng.pick([2, 3, 4, 6, 8]);
    const shape = rng.pick(['circle', 'rectangle'] as const);
    // The slips: one part not shaded, one part only, or the fraction upside down. 1/2 is both of the first two.
    const slips = ([[d - 1, d], [1, d], [d, 1]] as [number, number][]).filter(([n, dd], i, all) => all.findIndex(([m, e]) => m === n && e === dd) === i);
    const choices = rng.shuffle([[d, d] as [number, number], ...rng.sample(slips, 2)]);
    const options = choices.map(([n, dd]) => fractionText(n, dd));
    const ask = 'The whole shape is shaded. Which fraction names it?';
    return {
      type: 'choice',
      mode: 'look',
      facts: { expr: '1', ask: 'equal', d, shape, options },
      prompt: { text: ask, speak: [ask] },
      stimulus: picture(d, d, shape),
      options: choices.map(([n, dd]) => fractionOption(n, dd)),
      answerIndex: options.indexOf(fractionText(d, d)),
      explanation: oneWholeExplanation(d, shape),
    };
  }
  if (level === 2) {
    const overOne = rng.bool();
    const [n, d] = overOne ? [rng.int(2, 10), 1] : ((): [number, number] => {
      const dd = rng.int(2, 8);
      return [dd, dd];
    })();
    const answer = n / d;
    const ask = { text: `${n}/${d} is the same as which whole number?`, speak: [...fractionSay(n, d), 'is the same as which whole number?'] as Say };
    // The slips: the bottom number, the top number, or a whole taken for nothing.
    const slips = overOne ? [1, n + 1, n - 1] : [n, 0, 2];
    return numberAnswer({ prompt: ask, stimulus: fractionOption(n, d), explanation: wholeExplanation(n, d) }, { expr: fractionText(n, d), ask: 'value' }, answer, slips, false, rng, [0, 12]);
  }
  const [w, d] = [rng.int(2, 4), rng.int(2, 4)];
  const right = fractionText(w * d, d);
  // The slips: the whole number over the parts, the fraction upside down, a whole, or the two numbers added.
  const slips = [fractionText(w, d), fractionText(d, w * d), fractionText(w * d, w * d), fractionText(w + d, d)].filter((slip) => {
    const [n, dd] = parse(slip);
    return n !== w * dd && slip !== right;
  });
  const options = rng.shuffle([right, ...rng.sample([...new Set(slips)], 2)]);
  const ask = { text: `Which fraction is equal to ${w}?`, speak: ['Which fraction is equal to', { number: w }, '?'] as Say };
  return {
    type: 'choice',
    mode: 'look',
    facts: { expr: String(w), ask: 'equal', d, options },
    prompt: ask,
    options: options.map((option) => fractionOption(...parse(option))),
    answerIndex: options.indexOf(right),
    explanation: wholeExplanation(w * d, d),
  };
}

export const wholeFractionsGenerator: SkillGenerator = {
  skillId: 'M-3-E5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: wholes,
  exampleSeed: 3125,
  example: () => wholes(1, makeRng(3125)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'When every part of a whole is shaded, the fraction is 1 whole: 4/4 = 1.', speak: ['When every part of a whole is shaded, the fraction is one whole.', ...fractionSay(4, 4), 'is one.'], visual: picture(4, 4) },
    { beat: 'watch', text: wholeExplanation(6, 3).steps.join(' '), speak: wholeExplanation(6, 3).speak, visual: wholeExplanation(6, 3).visual },
    { beat: 'try', text: '5/1 is the same as which whole number?', speak: [...fractionSay(5, 1), 'is the same as which whole number?'], visual: fractionOption(5, 1), reveal: { text: wholeExplanation(5, 1).steps.join(' '), speak: wholeExplanation(5, 1).speak, visual: wholeExplanation(5, 1).visual } },
    { beat: 'remember', text: 'Same top and bottom: 1 whole. A bottom number of 1: the top number of wholes.', speak: ['Same top and bottom: one whole. A bottom number of one: the top number of wholes.'], visual: fractionOption(8, 8) },
  ],
  oracle: 'expression3',
};

// ---- E.6 Fractions of a group ----
// Levels: 1/2, 1/3 or 1/4 of up to 12 things, with a picture / any unit fraction, to 60 / 2/3 or 3/4 of a group, typed.
// Oracle: expression3.

function setExplanation(n: number, d: number, total: number, emoji: string): Explanation {
  const k = total / d;
  const answer = n * k;
  return {
    speak: ['Split', { number: total }, 'into', { number: d }, 'equal groups of', { number: k }, '.', ...fractionSay(n, d), 'is', { number: n }, n === 1 ? 'group:' : 'groups:', { number: answer }, '.'],
    steps: [`Split ${total} into ${d} equal groups: ${total} ÷ ${d} = ${k}.`, n === 1 ? `1/${d} is one group: ${k}.` : `${n}/${d} is ${n} groups: ${n} × ${k} = ${answer}.`],
    visual: k <= 6 && d <= 6 ? { kind: 'row', children: Array.from({ length: d }, (): Visual => ({ kind: 'emojiGroup', emoji, count: k, layout: 'dice' })) } : { kind: 'equation', parts: [total, '÷', d, '=', k] },
  };
}

function fractionOfSet(level: Level, rng: Rng): QuestionDraft {
  const d = rng.pick(level === 1 ? [2, 3, 4] : level === 2 ? [2, 3, 4, 5, 6, 8, 10] : [3, 4, 5, 6, 8]);
  const k = rng.int(2, level === 1 ? Math.floor(12 / d) : 6);
  const n = level === 3 ? rng.int(2, d - 1) : 1;
  const total = d * k;
  const answer = n * k;
  const thing = rng.pick(STORY_COUNTABLES);
  const template = rng.int(0, SET_STORIES.length - 1);
  const prompt = fill(SET_STORIES[template] as string, { name: rng.pick(STORY_NAMES), a: total, things: thing.many, f: fractionPiece(n, d) });
  const stimulus: Visual | undefined = level === 1 ? { kind: 'emojiGroup', emoji: thing.emoji, count: total, layout: 'grid5' } : undefined;
  // The slips: the number of groups, what is left, one group too many.
  return numberAnswer({ prompt, ...(stimulus ? { stimulus } : {}), explanation: setExplanation(n, d, total, thing.emoji) }, { expr: `${n}/${d} × ${total}`, ask: 'value', template, story: prompt.text }, answer, [d, total - answer, answer + k, ...(n > 1 ? [k] : [])].filter((slip) => slip > 0 && slip !== answer), level === 3, rng, [1, 100], 2);
}

export const fractionOfSetGenerator: SkillGenerator = {
  skillId: 'M-3-E6',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  lists: ['countables', 'h5-stories'],
  generate: fractionOfSet,
  exampleSeed: 3126,
  example: () => fractionOfSet(1, makeRng(3126)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To find 1/3 of a group, split it into 3 equal groups. One group is 1/3.', speak: ['To find one third of a group, split it into three equal groups. One group is one third.'], visual: { kind: 'emojiGroup', emoji: '🍎', count: 12, layout: 'grid5' } },
    { beat: 'watch', text: setExplanation(1, 3, 12, '🍎').steps.join(' '), speak: setExplanation(1, 3, 12, '🍎').speak, visual: setExplanation(1, 3, 12, '🍎').visual },
    { beat: 'try', text: 'What is 3/4 of 8?', speak: ['What is', ...fractionSay(3, 4), 'of', { number: 8 }, '?'], visual: { kind: 'emojiGroup', emoji: '🍓', count: 8, layout: 'grid5' }, reveal: { text: setExplanation(3, 4, 8, '🍓').steps.join(' '), speak: setExplanation(3, 4, 8, '🍓').speak, visual: setExplanation(3, 4, 8, '🍓').visual } },
    { beat: 'remember', text: 'The bottom number says how many equal groups. The top number says how many groups to take.', speak: ['The bottom number says how many equal groups. The top number says how many groups to take.'], visual: setExplanation(3, 4, 8, '🍓').visual },
  ],
  oracle: 'expression3',
};

// ---- E.7 Compare fractions in stories ----
// Levels: two people, same bottom number / two people, same top number, more or less / three people, more or less.
// Oracle: expression3 (most, least).

function compareExplanation(fractions: [number, number][], names: string[], ask: 'most' | 'least'): Explanation {
  const sameBottom = fractions.every(([, d]) => d === fractions[0]?.[1]);
  const worth = fractions.map(([n, d]) => n / d);
  const best = worth.indexOf(ask === 'most' ? Math.max(...worth) : Math.min(...worth));
  const [bn, bd] = fractions[best] as [number, number];
  const who = names[best] as string;
  const rule = sameBottom ? 'The parts are the same size, so more parts is more.' : 'The top numbers are the same. Fewer parts in the whole means bigger parts, so a smaller bottom number is more.';
  return {
    speak: [rule, who, 'has', ...fractionSay(bn, bd), ', the', ask === 'most' ? 'most.' : 'least.'],
    steps: [rule, `${fractions.map(([n, d], i) => `${names[i]}: ${n}/${d}`).join('. ')}.`, `${who} has ${bn}/${bd}, the ${ask === 'most' ? 'most' : 'least'}.`],
    visual: { kind: 'row', children: fractions.map(([n, d]) => picture(n, d)) },
  };
}

function compareStories(level: Level, rng: Rng): QuestionDraft {
  const people = level === 3 ? 3 : 2;
  const sameBottom = level === 1 || (level === 3 && rng.bool());
  const fractions = find(
    (): [number, number][] => {
      if (sameBottom) {
        const d = rng.pick([3, 4, 5, 6, 8].filter((each) => each - 1 >= people));
        return rng.sample(Array.from({ length: d - 1 }, (_, i) => i + 1), people).map((n): [number, number] => [n, d]);
      }
      const n = rng.int(1, 3);
      return rng.sample([2, 3, 4, 5, 6, 8].filter((d) => d > n), people).map((d): [number, number] => [n, d]);
    },
    (list) => list.length === people,
  );
  const ask: 'most' | 'least' = level === 1 ? 'most' : rng.bool() ? 'most' : 'least';
  const names = rng.sample(STORY_NAMES, people);
  const story = rng.pick(FRACTION_STORIES);
  const storyIndex = FRACTION_STORIES.indexOf(story);
  const parts = names.map((name, i) => fill(story.did, { name, f: fractionPiece(...(fractions[i] as [number, number])) }));
  const question = ask === 'most' ? story.more : story.less;
  const exprs = fractions.map(([n, d]) => fractionText(n, d));
  return {
    type: 'choice',
    mode: 'look',
    facts: { exprs, ask, story: storyIndex, options: names },
    prompt: { text: [story.same, ...parts.map((part) => part.text), question].join(' '), speak: [story.same, ...parts.flatMap((part) => part.speak), question] },
    options: names.map((name): Visual => ({ kind: 'text', value: name, size: 'l', speak: [name] })),
    answerIndex: exprs.findIndex((_, i) => {
      const worth = fractions.map(([n, d]) => n / d);
      return worth[i] === (ask === 'most' ? Math.max(...worth) : Math.min(...worth));
    }),
    explanation: compareExplanation(fractions, names, ask),
  };
}

export const compareStoriesGenerator: SkillGenerator = {
  skillId: 'M-3-E7',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h5-stories'],
  generate: compareStories,
  exampleSeed: 3127,
  example: () => compareStories(1, makeRng(3127)),
  lesson: (): LessonStep[] => {
    const watch = compareExplanation([[3, 8], [5, 8]], ['Mia', 'Leo'], 'most');
    const attempt = compareExplanation([[2, 3], [2, 6]], ['Sam', 'Zoe'], 'most');
    return [
      { beat: 'see', text: 'To compare parts of wholes the same size, look at the top and bottom numbers.', speak: ['To compare parts of wholes the same size, look at the top and bottom numbers.'], visual: { kind: 'row', children: [picture(3, 8), picture(5, 8)] } },
      { beat: 'watch', text: `Mia ate 3/8 of a pizza. Leo ate 5/8 of a pizza. ${watch.steps.join(' ')}`, speak: ['Mia ate', ...fractionSay(3, 8), 'of a pizza. Leo ate', ...fractionSay(5, 8), 'of a pizza.', ...watch.speak], visual: watch.visual },
      { beat: 'try', text: 'Sam drank 2/3 of a bottle. Zoe drank 2/6 of a bottle the same size. Who drank more?', speak: ['Sam drank', ...fractionSay(2, 3), 'of a bottle. Zoe drank', ...fractionSay(2, 6), 'of a bottle the same size. Who drank more?'], visual: attempt.visual, reveal: { text: attempt.steps.join(' '), speak: attempt.speak, visual: attempt.visual } },
      { beat: 'remember', text: 'Same bottom: the bigger top wins. Same top: the smaller bottom wins.', speak: ['Same bottom: the bigger top wins. Same top: the smaller bottom wins.'], visual: { kind: 'row', children: [picture(2, 3), picture(2, 6)] } },
    ];
  },
  oracle: 'expression3',
};
