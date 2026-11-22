import type { Rng } from '../../../../engine/rng';
import type { CoinName, Level, QuestionDraft, SortBin, Visual } from '../../../../engine/types';
import type { WordGroup } from '../../../data/categories';
import { GROUP_WORDS } from '../../../data/categories';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import type { Vote } from '../../../data/h1-things';
import { VOTES } from '../../../data/h1-things';
import type { SkillGenerator } from '../../../generator';
import { listText } from '../../../generator';
import { h1Skill, lessonOf, numberChoice, picture, wordText } from '../k/h1-parts';
import { numeralChoices } from '../k/numerals';
import { easyToTellApart } from '../pk/parts';
import type { Shown as Explanation } from './wording';
import { explain, hintFor, joinAnd } from './wording';

// Math grade 1, plan section 15 wave H1: C.9 tally charts, C.10 sort into three groups,
// C.11 count dimes and pennies, C.12 taller than, shorter than.

// ---- C.9 Tally charts ----
// Three rows of tally marks. Levels: how many chose one / which has the most or the fewest /
// how many more chose one than another, typed. Oracle: graph.

const chart = (vote: Vote, values: number[]): Visual => ({ kind: 'row', children: vote.rows.map((row, i): Visual => ({ kind: 'row', children: [picture(row.emoji, row.label), { kind: 'tally', count: values[i] as number }] })) });

// Votes are for a chart that was voted on. The chart of how children came to school asks "Which way did the most
// children come?" and "came by bus than by car". Every step names a row ("Find the grapes row."), and the last
// step answers the question.
function tallyCharts(level: Level, rng: Rng): QuestionDraft {
  const vote = rng.pick(VOTES);
  const values = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  const stimulus = chart(vote, values);
  const label = (i: number): string => vote.rows[i]?.label ?? '';
  const voted = vote.asked !== 'came by';
  const did = (i: number): string => `${vote.asked} ${label(i)}`; // "chose grapes", "came by bus"
  if (level === 2) {
    const ask = rng.pick(['most', 'least'] as const);
    const want = ask === 'most' ? Math.max(...values) : Math.min(...values);
    const index = values.indexOf(want);
    const most = ask === 'most' ? 'most' : 'fewest';
    const prompt = voted ? `${vote.question} Which got the ${most} votes?` : `${vote.question} Which way did the ${most} children come?`;
    const lines = [`Count each row: ${values.map((value, i) => `${label(i)} ${value}`).join(', ')}.`, `${want} is the ${most}.`, voted ? `So ${label(index)} got the ${most} votes.` : `So the ${most} children came by ${label(index)}.`];
    return {
      type: 'choice',
      mode: 'look',
      facts: { values, ask, vote: vote.question, options: values },
      prompt: { text: prompt, speak: [prompt] },
      stimulus,
      options: vote.rows.map((row) => picture(row.emoji, row.label)),
      answerIndex: index,
      explanation: explain(lines, stimulus, { text: `Find the row with the ${most} marks.` }),
    };
  }
  if (level === 3) {
    const [index, other] = rng.sample([0, 1, 2], 2).sort((x, y) => (values[y] as number) - (values[x] as number)) as [number, number];
    const [a, b] = [values[index] as number, values[other] as number];
    const more = a - b;
    const prompt = `${vote.question} How many more ${did(index)} than ${voted ? '' : 'by '}${label(other)}?`;
    return {
      type: 'numberPad',
      mode: 'look',
      facts: { values, ask: 'difference', index, other, vote: vote.question },
      prompt: { text: prompt, speak: [prompt] },
      stimulus,
      answer: more,
      maxDigits: 1,
      explanation: explain([`${a} ${did(index)}. ${b} ${did(other)}.`, `${a} − ${b} = ${more}.`, `${more} more ${did(index)}.`], stimulus, { text: 'Count both rows. Then take the smaller number away from the bigger number.' }),
    };
  }
  const index = rng.int(0, 2);
  const value = values[index] as number;
  const prompt = `${vote.question} How many ${did(index)}?`;
  const options = numeralChoices(value, [value + 1, value - 1, value + 5], 0, 14, rng);
  // A bundle of tally marks is 5; the marks after it are counted on.
  const after = Array.from({ length: value - 5 }, (_, i) => i + 6);
  const counted = value < 5 ? `Count the marks: ${listText(Array.from({ length: value }, (_, i) => i + 1))}.` : value === 5 ? 'A bundle of marks is 5.' : `A bundle of marks is 5. Count on: ${listText(after)}.`;
  const lines = [`Find the ${label(index)} row.`, counted, `${value} ${did(index)}.`];
  return {
    mode: 'look',
    facts: { values, ask: 'value', index, vote: vote.question, options },
    prompt: { text: prompt, speak: [prompt] },
    stimulus,
    explanation: explain(lines, { kind: 'tally', count: value }, hintFor(value, `Find the ${label(index)} row. Count its marks. A bundle is 5.`, `Find the ${label(index)} row. Count its marks.`)),
    ...numberChoice(value, options),
  };
}

export const tallyChartGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-C9',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'graph',
  exampleSeed: 941,
  lists: ['h1-things'],
  generate: tallyCharts,
  lesson: (make) => lessonOf('A tally chart shows a count as tally marks. Each bundle of marks is 5.', chart(VOTES[0] as Vote, [3, 6, 2]), make(1, 941), make(2, 942), 'Read one row at a time. Count bundles by fives.'),
});

// ---- C.10 Sort into three groups ----
// Levels: 6 pictures, 2 of each / 8 pictures / 9 pictures. Oracle: sortBy.

const GROUPS: WordGroup[] = ['animals', 'vehicles', 'clothes', 'food'];
// "Things that go", not "Vehicles", a hard word to read in grade 1. Each group's step gives a reason.
const GROUP_LABEL: Record<string, string> = { animals: 'Animals', vehicles: 'Things that go', clothes: 'Clothes', food: 'Food' };
const GROUP_REASON: Record<string, string> = { animals: 'They are living things.', vehicles: 'They take us places.', clothes: 'We wear them.', food: 'We eat them.' };
const GROUP_ASK: Record<string, string> = { animals: 'an animal', vehicles: 'a thing that goes', clothes: 'something to wear', food: 'food' };

function sortThree(level: Level, rng: Rng): QuestionDraft {
  const groups = rng.sample(GROUPS, 3);
  const counts = level === 1 ? [2, 2, 2] : level === 2 ? rng.shuffle([3, 3, 2]) : [3, 3, 3];
  // Fish is also food, so it is never one of the animals here.
  const items = rng.shuffle(groups.flatMap((group, g) => rng.sample(GROUP_WORDS.filter((word) => word.group === group && word.word !== 'fish'), counts[g] as number)));
  const bins: SortBin[] = groups.map((group) => ({ label: GROUP_LABEL[group] as string, speak: [(GROUP_LABEL[group] as string).toLowerCase()] }));
  const lines = groups.map((group) => `${GROUP_LABEL[group] as string}: ${joinAnd(items.filter((item) => item.group === group).map((item) => item.word))}. ${GROUP_REASON[group] as string}`);
  const kinds = groups.map((group) => GROUP_ASK[group] as string);
  return {
    type: 'sort',
    mode: 'look',
    facts: { itemAttrs: items.map((item) => item.group), binAttrs: groups, items: items.map((item) => item.word) },
    prompt: { text: 'Sort the pictures into three groups.', speak: ['Sort the pictures into three groups.'] },
    items: items.map((item) => picture(item.emoji, item.word)),
    bins,
    answerBin: items.map((item) => groups.indexOf(item.group)),
    explanation: explain(lines, { kind: 'row', children: items.map((item) => picture(item.emoji)) }, { text: `Look at each picture. Is it ${kinds[0] as string}, ${kinds[1] as string} or ${kinds[2] as string}?` }),
  };
}

export const sortThreeGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-C10',
  maxLevel: 3,
  itemTypes: ['sort'],
  oracle: 'sortBy',
  exampleSeed: 943,
  lists: ['categories'],
  generate: sortThree,
  lesson: (make) => lessonOf('Things that belong together go in one group.', { kind: 'row', children: [picture('🐶'), picture('🐱'), picture('🚗'), picture('🚌')] }, make(1, 943), make(2, 944), 'Ask: what kind of thing is it? Then put it in that group.'),
});

// ---- C.11 Count dimes and pennies ----
// Levels: dimes only / dimes and pennies / typed. Oracle: money.

const cents = (value: number): Visual => ({ kind: 'text', value: `${value}¢`, size: 'l', speak: [{ cents: value }] });

// The counted numbers keep their commas, so each one is said apart. The total is written in full: "41 cents".
function coinsExplanation(dimes: number, pennies: number): Explanation {
  const tens = Array.from({ length: dimes }, (_, i) => (i + 1) * 10);
  const ones = Array.from({ length: pennies }, (_, i) => dimes * 10 + i + 1);
  const total = dimes * 10 + pennies;
  const lines = [`Count the dimes by tens: ${listText(tens)}.`, ...(pennies > 0 ? [`Count on the pennies by ones: ${listText(ones)}.`] : []), `That is ${total} cents.`];
  const hint = pennies > 0 ? 'Count the dimes by tens. Then count on the pennies by ones.' : 'Count the dimes by tens.';
  return explain(lines, { kind: 'coins', coins: [...Array.from({ length: dimes }, (): CoinName => 'dime'), ...Array.from({ length: pennies }, (): CoinName => 'penny')] }, { text: hint });
}

function dimesAndPennies(level: Level, rng: Rng): QuestionDraft {
  const dimes = level === 1 ? rng.int(1, 9) : rng.int(1, 6);
  const pennies = level === 1 ? 0 : rng.int(1, 9);
  const coins: CoinName[] = [...Array.from({ length: dimes }, (): CoinName => 'dime'), ...Array.from({ length: pennies }, (): CoinName => 'penny')];
  const total = dimes * 10 + pennies;
  // Typed on a number pad with no cents sign, the question asks for cents.
  const prompt = level === 3 ? 'How many cents is this?' : 'How much money is this?';
  const base = { mode: 'look' as const, facts: { coins, ask: 'total' }, prompt: { text: prompt, speak: [prompt] }, stimulus: { kind: 'coins', coins } as Visual, explanation: coinsExplanation(dimes, pennies) };
  if (level === 3) return { ...base, type: 'numberPad', answer: total, maxDigits: 2 };
  // Slips: counting every coin as one, or the pennies as tens and the dimes as ones.
  const values = numeralChoices(total, [dimes + pennies, pennies * 10 + dimes, total + 10, total - 10].filter((value) => value !== total), 1, 99, rng);
  return { ...base, type: 'choice', facts: { ...base.facts, options: values }, options: values.map(cents), answerIndex: values.indexOf(total) };
}

export const dimesAndPenniesGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-C11',
  maxLevel: 3,
  itemTypes: ['choice', 'numberPad'],
  oracle: 'money',
  exampleSeed: 945,
  generate: dimesAndPennies,
  lesson: (make) => lessonOf('A dime is worth 10 cents. A penny is worth 1 cent.', { kind: 'coins', coins: ['dime', 'penny'] }, make(1, 945), make(2, 946), 'Dimes count by tens. Pennies count by ones.'),
});

// ---- C.12 Taller than, shorter than ----
// Two facts about three towers; which is the tallest or the shortest? Levels: tallest, with the towers
// drawn / shortest, drawn / either, told only in words. Oracle: h1Transitive.

const tower = (color: ColorName, length: number): Visual => ({ kind: 'bar', length, color, orientation: 'vertical' });

function threeColors(rng: Rng): [ColorName, ColorName, ColorName] {
  const usable = COLOR_NAMES.filter((color) => color !== 'black' && color !== 'brown');
  for (;;) {
    const [x, y, z] = rng.sample(usable, 3) as [ColorName, ColorName, ColorName];
    if (easyToTellApart(x, y) && easyToTellApart(y, z) && easyToTellApart(x, z)) return [x, y, z];
  }
}

function tallerThan(level: Level, rng: Rng): QuestionDraft {
  const [tall, middle, short] = threeColors(rng);
  const ask = level === 1 ? 'most' : level === 2 ? 'least' : rng.pick(['most', 'least'] as const);
  // Each fact may be said as "taller than" or, the other way round, "shorter than".
  const pairs: [string, string][] = rng.shuffle([[tall, middle], [middle, short]] as [string, string][]);
  const sentence = ([big, small]: [string, string]): string => (level === 3 && rng.bool() ? `The ${small} tower is shorter than the ${big} tower.` : `The ${big} tower is taller than the ${small} tower.`);
  const said = pairs.map(sentence);
  const question = ask === 'most' ? 'Which tower is the tallest?' : 'Which tower is the shortest?';
  const options = rng.shuffle([tall, middle, short]);
  const answer = ask === 'most' ? tall : short;
  const heights: Record<string, number> = { [tall]: 7, [middle]: 5, [short]: 3 };
  const prompt = `${said.join(' ')} ${question}`;
  const all: Visual = { kind: 'row', children: [tower(tall, 7), tower(middle, 5), tower(short, 3)] };
  const lines = [`The ${tall} tower is taller than the ${middle} tower.`, `The ${middle} tower is taller than the ${short} tower.`, ask === 'most' ? `So the ${tall} tower is the tallest of all.` : `So the ${short} tower is the shortest of all.`];
  const draft: QuestionDraft = {
    type: 'choice',
    mode: 'look',
    facts: { pairs, ask, options },
    prompt: { text: prompt, speak: [prompt] },
    options: options.map((color) => wordText(color)),
    answerIndex: options.indexOf(answer),
    explanation: explain(lines, all, { text: 'Find the tower that is in both clues. It is in the middle.' }),
  };
  // Drawn, the three towers stand once each, in the order of the colour words: drawing each clue as its own pair
  // showed the middle tower twice, four towers for three colours.
  return level === 3 ? draft : { ...draft, stimulus: { kind: 'row', children: options.map((color) => tower(color, heights[color] as number)) } };
}

export const tallerThanGenerator: SkillGenerator = h1Skill({
  skillId: 'M-1-C12',
  maxLevel: 3,
  itemTypes: ['choice'],
  oracle: 'h1Transitive',
  exampleSeed: 947,
  lists: ['colors'],
  generate: tallerThan,
  lesson: (make) => lessonOf('If red is taller than blue, and blue is taller than green, then red is taller than green too.', { kind: 'row', children: [tower('red', 7), tower('blue', 5), tower('green', 3)] }, make(1, 947), make(2, 948), 'Line them up in your head: tallest, middle, shortest.'),
});
