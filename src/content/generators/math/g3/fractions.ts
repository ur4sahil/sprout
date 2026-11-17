import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import { COUNTABLES } from '../../../data/countables';
import type { SkillGenerator } from '../../../generator';

// Math grade 3 E.1 to E.4: naming fractions, fractions on a number line, comparing, equal fractions.

type Explanation = { speak: Say; steps: string[]; visual: Visual };
const ONE: Record<number, string> = { 1: 'whole', 2: 'half', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 12: 'twelfth', 16: 'sixteenth' };
const MANY: Record<number, string> = { 1: 'wholes', 2: 'halves', 3: 'thirds', 4: 'fourths', 5: 'fifths', 6: 'sixths', 7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 12: 'twelfths', 16: 'sixteenths' };
const partName = (n: number, d: number): string => {
  const name = (n === 1 ? ONE : MANY)[d];
  if (!name) throw new Error(`no name for parts of ${d}`);
  return name;
};

export const fractionText = (n: number, d: number): string => `${n}/${d}`;
// 3/4 is said "three fourths", 1/2 "one half".
export const fractionSay = (n: number, d: number): Say => [{ number: n }, partName(n, d)];
const fractionOption = (n: number, d: number): Visual => ({ kind: 'text', value: fractionText(n, d), size: 'l', speak: fractionSay(n, d) });
const picture = (n: number, d: number, shape: 'circle' | 'rectangle' = 'rectangle'): Visual => ({ kind: 'fraction', shape, parts: d, shaded: n, equal: true });
const line = (d: number, marked: number, hide: boolean): Visual => ({ kind: 'numberLine', min: 0, max: d, step: 1, denominator: d, marked: [marked], ...(hide ? { hidden: [marked] } : {}) });

// Three different fractions, the right one among them, in a random order.
function threeFractions(right: [number, number], slips: [number, number][], rng: Rng): [number, number][] {
  const key = ([n, d]: [number, number]): string => `${n}/${d}`;
  const usable = slips.filter(([n, d]) => n >= 1 && d >= 2 && n < d * 2 && key([n, d]) !== key(right));
  const unique = usable.filter((pair, i) => usable.findIndex((other) => key(other) === key(pair)) === i);
  return rng.shuffle([right, ...rng.sample(unique, 2)]);
}

// ---- E.1 Name fractions ----
// Levels: unit fractions of a shape / any fraction of a shape / of a set of objects. Oracle: fractionValue.

function nameExplanation(n: number, d: number, visual: Visual, what = 'parts'): Explanation {
  return {
    speak: ['The whole is cut into', { number: d }, `equal ${what}.`, { number: n }, n === 1 ? 'is shaded.' : 'are shaded.', 'That is', ...fractionSay(n, d), '.'],
    steps: [`The whole has ${d} equal ${what}. That is the bottom number.`, `${n} ${n === 1 ? 'is' : 'are'} shaded. That is the top number.`, `So it is ${fractionText(n, d)}.`],
    visual,
  };
}

function nameFractions(level: Level, rng: Rng): QuestionDraft {
  const d = rng.pick([2, 3, 4, 6, 8]);
  const n = level === 1 ? 1 : rng.int(1, d - 1);
  const shape = rng.pick<'circle' | 'rectangle'>(['circle', 'rectangle']);
  // The slips: counting the parts that are not shaded, or putting the shaded parts on the bottom.
  const slips: [number, number][] = [[d - n, d], [n, d - n], [1, rng.pick([2, 3, 4, 6, 8].filter((x) => x !== d))], [n + 1, d], [n, d + 2]];
  const choices = threeFractions([n, d], slips, rng);
  if (level === 3) {
    // A set: n of the d things are one kind.
    const [thing, other] = rng.sample(COUNTABLES, 2) as [(typeof COUNTABLES)[number], (typeof COUNTABLES)[number]];
    const stimulus: Visual = { kind: 'emojiGroup', emoji: thing.emoji, count: n, emoji2: other.emoji, count2: d - n, layout: 'grid5' };
    const prompt = { text: `What fraction of the group are ${thing.many}?`, speak: [`What fraction of the group are ${thing.many}?`] as Say };
    return {
      type: 'choice',
      mode: 'look',
      facts: { n, d, ask: 'name', options: choices.map(([x, y]) => fractionText(x, y)) },
      prompt,
      stimulus,
      options: choices.map(([x, y]) => fractionOption(x, y)),
      answerIndex: choices.findIndex(([x, y]) => x === n && y === d),
      explanation: {
        speak: ['There are', { number: d }, 'things in all.', { number: n }, n === 1 ? `is ${thing.one === 'fish' ? 'a fish' : `a ${thing.one}`}.` : `are ${thing.many}.`, 'So', ...fractionSay(n, d), `are ${thing.many}.`],
        steps: [`There are ${d} things in all. That is the bottom number.`, `${n} ${n === 1 ? 'is' : 'are'} ${n === 1 ? thing.one : thing.many}. That is the top number.`, `So ${fractionText(n, d)} are ${thing.many}.`],
        visual: stimulus,
      },
    };
  }
  const prompt = 'What fraction is shaded?';
  const stimulus = picture(n, d, shape);
  return {
    type: 'choice',
    mode: 'look',
    facts: { n, d, ask: 'name', options: choices.map(([x, y]) => fractionText(x, y)) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus,
    options: choices.map(([x, y]) => fractionOption(x, y)),
    answerIndex: choices.findIndex(([x, y]) => x === n && y === d),
    explanation: nameExplanation(n, d, stimulus),
  };
}

export const nameFractionsGenerator: SkillGenerator = {
  skillId: 'M-3-E1',
  // Levels with fewer than eight different questions: there are only so many fractions with these parts.
  pool: { 1: 5 },
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: nameFractions,
  exampleSeed: 341,
  example: () => nameFractions(1, makeRng(341)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A fraction names part of a whole. The bottom number is how many equal parts. The top number is how many we mean.', speak: ['A fraction names part of a whole. The bottom number is how many equal parts. The top number is how many we mean.'], visual: picture(3, 4) },
    { beat: 'watch', text: nameExplanation(3, 4, picture(3, 4)).steps.join(' '), speak: nameExplanation(3, 4, picture(3, 4)).speak, visual: picture(3, 4) },
    { beat: 'try', text: 'What fraction is shaded?', speak: ['What fraction is shaded?'], visual: picture(2, 6, 'circle'), reveal: { text: nameExplanation(2, 6, picture(2, 6, 'circle')).steps.join(' '), speak: nameExplanation(2, 6, picture(2, 6, 'circle')).speak, visual: picture(2, 6, 'circle') } },
    { beat: 'remember', text: 'Bottom: how many equal parts. Top: how many shaded.', speak: ['Bottom: how many equal parts. Top: how many shaded.'], visual: picture(3, 4) },
  ],
  oracle: 'fractionValue',
};

// ---- E.2 Fractions on a number line ----
// Levels: halves and fourths / thirds and sixths / eighths. Oracle: fractionValue.

function lineExplanation(n: number, d: number): Explanation {
  return {
    speak: ['From', { number: 0 }, 'to', { number: 1 }, 'is cut into', { number: d }, 'equal parts. The dot is', { number: n }, n === 1 ? 'part' : 'parts', `from zero. So it is`, ...fractionSay(n, d), '.'],
    steps: [`From 0 to 1 is cut into ${d} equal parts.`, `The dot is ${n} ${n === 1 ? 'part' : 'parts'} from 0.`, `So it is ${fractionText(n, d)}.`],
    visual: line(d, n, false),
  };
}

function onALine(level: Level, rng: Rng): QuestionDraft {
  const d = rng.pick(level === 1 ? [2, 4] : level === 2 ? [3, 6] : [8]);
  const n = rng.int(1, d - 1);
  const choices = threeFractions([n, d], [[n + 1, d], [n - 1, d], [n, d * 2], [d - n, d], [n, d + 1]], rng);
  const prompt = 'Which fraction is at the dot?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { n, d, ask: 'name', options: choices.map(([x, y]) => fractionText(x, y)) },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: line(d, n, true),
    options: choices.map(([x, y]) => fractionOption(x, y)),
    answerIndex: choices.findIndex(([x, y]) => x === n && y === d),
    explanation: lineExplanation(n, d),
  };
}

export const fractionLineGenerator: SkillGenerator = {
  skillId: 'M-3-E2',
  // Levels with fewer than eight different questions: there are only so many fractions with these parts.
  pool: { 1: 4, 2: 7, 3: 7 },
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: onALine,
  exampleSeed: 342,
  example: () => onALine(1, makeRng(342)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Fractions live on the number line between 0 and 1.', speak: ['Fractions live on the number line between zero and one.'], visual: line(4, 1, false) },
    { beat: 'watch', text: lineExplanation(3, 4).steps.join(' '), speak: lineExplanation(3, 4).speak, visual: lineExplanation(3, 4).visual },
    { beat: 'try', text: 'Which fraction is at the dot?', speak: ['Which fraction is at the dot?'], visual: line(6, 5, true), reveal: { text: lineExplanation(5, 6).steps.join(' '), speak: lineExplanation(5, 6).speak, visual: lineExplanation(5, 6).visual } },
    { beat: 'remember', text: 'Count the equal parts from 0 to 1. That is the bottom number.', speak: ['Count the equal parts from zero to one. That is the bottom number.'], visual: line(4, 3, false) },
  ],
  oracle: 'fractionValue',
};

// ---- E.3 Compare fractions ----
// Levels: same bottom number / same top number / pick the sign. Oracle: compare (on the fractions' values).

const SIGNS = ['>', '<', '='] as const;
const SIGN_WORDS: Record<string, string> = { '>': 'greater than', '<': 'less than', '=': 'equal to' };

function compareExplanation(a: [number, number], b: [number, number]): Explanation {
  const [an, ad] = a;
  const [bn, bd] = b;
  const va = an / ad;
  const vb = bn / bd;
  const sign = va > vb ? '>' : va < vb ? '<' : '=';
  const lines: string[] = [];
  const speak: Say = [];
  const parts = (count: number): string => `${count} ${count === 1 ? 'part' : 'parts'}`;
  if (ad === bd) {
    lines.push(`Both are cut into ${ad} equal parts.`, `${parts(Math.max(an, bn))} shaded is more than ${parts(Math.min(an, bn))}.`);
    speak.push('Both are cut into', { number: ad }, 'equal parts. More shaded parts means more.');
  } else if (an === bn) {
    const [big, small] = [MANY[Math.min(ad, bd)] as string, MANY[Math.max(ad, bd)] as string];
    lines.push(`Both have ${parts(an)} shaded.`, `${big[0]?.toUpperCase()}${big.slice(1)} are bigger than ${small}.`);
    speak.push('Both have', { number: an }, an === 1 ? 'part shaded.' : 'parts shaded.', `${big[0]?.toUpperCase()}${big.slice(1)} are bigger than ${small}.`);
  } else {
    lines.push('Look at how much of each whole is shaded.');
    speak.push('Look at how much of each whole is shaded.');
  }
  lines.push(`So ${fractionText(an, ad)} ${sign} ${fractionText(bn, bd)}.`);
  speak.push('So', ...fractionSay(an, ad), `is ${SIGN_WORDS[sign]}`, ...fractionSay(bn, bd), '.');
  return { speak, steps: lines, visual: { kind: 'row', children: [picture(an, ad), picture(bn, bd)] } };
}

function comparePair(level: Level, rng: Rng): [[number, number], [number, number]] {
  if (level === 1) {
    const d = rng.pick([3, 4, 6, 8]);
    const [x, y] = rng.sample([...Array(d - 1).keys()].map((i) => i + 1), 2) as [number, number];
    return [[x, d], [y, d]];
  }
  if (level === 2) {
    const [d1, d2] = rng.sample([2, 3, 4, 6, 8], 2) as [number, number];
    const n = rng.int(1, Math.min(d1, d2) - 1);
    return [[n, d1], [n, d2]];
  }
  // The sign: one time in four the two are equal fractions, such as 1/2 and 2/4.
  if (rng.bool(0.25)) {
    const d = rng.pick([2, 3, 4]);
    const n = rng.int(1, d - 1);
    const k = rng.pick([2, 3, 4].filter((each) => d * each <= 8));
    return rng.shuffle([[n, d], [n * k, d * k]]) as [[number, number], [number, number]];
  }
  return comparePair(rng.pick([1, 2]) as Level, rng);
}

function compareFractions(level: Level, rng: Rng): QuestionDraft {
  const [a, b] = comparePair(level, rng);
  const values = [a[0] / a[1], b[0] / b[1]];
  const stimulus: Visual = { kind: 'row', children: [picture(...a), picture(...b)] };
  if (level === 3) {
    const sign = values[0]! > values[1]! ? '>' : values[0]! < values[1]! ? '<' : '=';
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { values, ask: 'sign', options: [...SIGNS] },
      prompt: { text: `Which sign goes between ${fractionText(...a)} and ${fractionText(...b)}?`, speak: ['Which sign goes between', ...fractionSay(...a), 'and', ...fractionSay(...b), '?'] },
      stimulus,
      options: SIGNS.map((each): Visual => ({ kind: 'text', value: each, size: 'xl', speak: [SIGN_WORDS[each] as string] })),
      answerIndex: SIGNS.indexOf(sign),
      explanation: compareExplanation(a, b),
    };
  }
  const ask = rng.pick<'most' | 'least'>(['most', 'least']);
  const prompt = ask === 'most' ? 'Which fraction is greater?' : 'Which fraction is less?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { values, ask, options: values },
    prompt: { text: prompt, speak: [prompt] },
    stimulus,
    options: [fractionOption(...a), fractionOption(...b)],
    answerIndex: ask === 'most' ? (values[0]! > values[1]! ? 0 : 1) : values[0]! < values[1]! ? 0 : 1,
    explanation: compareExplanation(a, b),
  };
}

export const compareFractionsGenerator: SkillGenerator = {
  skillId: 'M-3-E3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: compareFractions,
  exampleSeed: 343,
  example: () => compareFractions(1, makeRng(343)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To compare fractions, look at the size of the parts and how many there are.', speak: ['To compare fractions, look at the size of the parts and how many there are.'], visual: { kind: 'row', children: [picture(1, 3), picture(1, 6)] } },
    { beat: 'watch', text: compareExplanation([1, 3], [1, 6]).steps.join(' '), speak: compareExplanation([1, 3], [1, 6]).speak, visual: compareExplanation([1, 3], [1, 6]).visual },
    { beat: 'try', text: 'Which fraction is greater?', speak: ['Which fraction is greater?'], visual: { kind: 'row', children: [picture(3, 8), picture(5, 8)] }, reveal: { text: compareExplanation([3, 8], [5, 8]).steps.join(' '), speak: compareExplanation([3, 8], [5, 8]).speak, visual: compareExplanation([3, 8], [5, 8]).visual } },
    { beat: 'remember', text: 'Same bottom number: more parts is more. Same top number: bigger parts are more.', speak: ['Same bottom number: more parts is more. Same top number: bigger parts are more.'], visual: compareExplanation([1, 3], [1, 6]).visual },
  ],
  oracle: 'compare',
};

// ---- E.4 Equal fractions ----
// Levels: pictures side by side / on number lines / pick the equal one. Oracle: fractionValue.

function equalExplanation(a: [number, number], b: [number, number]): Explanation {
  const k = b[1] / a[1];
  return {
    speak: ['Cut each part of', ...fractionSay(...a), 'into', { number: k }, '. You get', ...fractionSay(...b), '. The same amount is shaded, so they are equal.'],
    steps: [`Cut each part of ${fractionText(...a)} into ${k}.`, `${a[0]} × ${k} = ${b[0]} and ${a[1]} × ${k} = ${b[1]}.`, `So ${fractionText(...a)} = ${fractionText(...b)}.`],
    visual: { kind: 'row', children: [picture(...a), picture(...b)] },
  };
}

function equalFractions(level: Level, rng: Rng): QuestionDraft {
  const d = rng.pick([2, 3, 4]);
  const n = rng.int(1, d - 1);
  const k = rng.pick([2, 3, 4].filter((each) => d * each <= 8));
  const target: [number, number] = [n, d];
  const equal: [number, number] = [n * k, d * k];
  // The others have the same bottom number as the equal one, so only the top number tells them apart.
  const others = [n * k - 1, n * k + 1, n * k + 2].filter((top) => top >= 1 && top < d * k).map((top): [number, number] => [top, d * k]);
  const choices = rng.shuffle([equal, ...rng.sample(others, 2)]);
  const prompt = { text: `Which fraction is equal to ${fractionText(...target)}?`, speak: ['Which fraction is equal to', ...fractionSay(...target), '?'] as Say };
  const options = level === 1 ? choices.map(([x, y]) => ({ ...picture(x, y), speak: fractionSay(x, y) }) as Visual) : choices.map(([x, y]) => fractionOption(x, y));
  const stimulus: Visual = level === 1 ? picture(...target) : level === 2 ? { kind: 'row', children: [line(d, n, false), line(d * k, n * k, true)] } : { kind: 'text', value: fractionText(...target), size: 'xl', speak: fractionSay(...target) };
  return {
    type: 'choice',
    mode: 'look',
    facts: { n, d, ask: 'equivalent', options: choices.map(([x, y]) => fractionText(x, y)) },
    prompt,
    stimulus,
    options,
    answerIndex: choices.findIndex(([x, y]) => x === equal[0] && y === equal[1]),
    explanation: equalExplanation(target, equal),
  };
}

export const equalFractionsGenerator: SkillGenerator = {
  skillId: 'M-3-E4',
  // Levels with fewer than eight different questions: there are only so many fractions with these parts.
  pool: { 1: 6, 2: 6, 3: 6 },
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: equalFractions,
  exampleSeed: 344,
  example: () => equalFractions(1, makeRng(344)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Different fractions can name the same amount.', speak: ['Different fractions can name the same amount.'], visual: { kind: 'row', children: [picture(1, 2), picture(2, 4)] } },
    { beat: 'watch', text: equalExplanation([1, 2], [2, 4]).steps.join(' '), speak: equalExplanation([1, 2], [2, 4]).speak, visual: equalExplanation([1, 2], [2, 4]).visual },
    { beat: 'try', text: 'Which fraction is equal to 1/3?', speak: ['Which fraction is equal to', ...fractionSay(1, 3), '?'], visual: picture(1, 3), reveal: { text: equalExplanation([1, 3], [2, 6]).steps.join(' '), speak: equalExplanation([1, 3], [2, 6]).speak, visual: equalExplanation([1, 3], [2, 6]).visual } },
    { beat: 'remember', text: 'Cutting every part into the same number of pieces keeps the amount the same.', speak: ['Cutting every part into the same number of pieces keeps the amount the same.'], visual: equalExplanation([1, 2], [2, 4]).visual },
  ],
  oracle: 'fractionValue',
};
