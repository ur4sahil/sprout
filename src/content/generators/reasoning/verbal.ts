import type { Rng } from '../../../engine/rng';
import { makeRng } from '../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../engine/types';
import { CLOSE_CLASSES, VERBAL_RELATIONS, WORD_CLASSES } from '../../data/verbal';
import type { SkillGenerator } from '../../generator';
import { numeral } from '../../generator';

// Reasoning A.15 word analogies, A.16 which word does not belong, A.17 number grids (plan section 15, phase I).

const word = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: [{ word: value }] });

// ---- A.15 Word analogies ----
// Levels: opposites and homes / babies, what animals give, colours / parts and tools, with a near miss among
// the wrong words. Oracle: verbalAnalogy.

const LEVEL_RELATIONS: Record<number, string[]> = { 1: ['opposite', 'home'], 2: ['baby', 'makes', 'colour'], 3: ['part', 'tool', 'home', 'makes'] };

// True when c and w are a pair of this relation, so w would also be a right answer.
const pairs = (name: string, c: string, w: string): boolean => (VERBAL_RELATIONS[name]?.pairs ?? []).some(([x, y]) => x === c && y === w);

function wordAnalogy(level: Level, rng: Rng): QuestionDraft {
  const name = rng.pick(LEVEL_RELATIONS[level] as string[]);
  const rel = VERBAL_RELATIONS[name] as (typeof VERBAL_RELATIONS)[string];
  const [[a, b], [c, d]] = rng.sample(rel.pairs, 2) as [[string, string], [string, string]];
  const ends = (keep: (other: string) => boolean): string[] => [...new Set(Object.entries(VERBAL_RELATIONS).filter(([other]) => keep(other)).flatMap(([, other]) => other.pairs.map(([, y]) => y)))];
  // Far: a word from another relation. Near (level 3): a word linked to c in another way, such as bee and honey.
  const far = ends((other) => other !== name).filter((w) => w !== d && !pairs(name, c, w));
  const near = Object.entries(VERBAL_RELATIONS).filter(([other]) => other !== name).flatMap(([, other]) => other.pairs.filter(([x]) => x === c).map(([, y]) => y)).filter((w) => w !== d && !pairs(name, c, w));
  const first = level === 3 && near.length > 0 ? rng.pick(near) : rng.pick(far);
  const second = rng.pick(far.filter((w) => w !== first));
  const choices = rng.shuffle([d, first, second]);
  const cap = (w: string): string => `${w[0]?.toUpperCase()}${w.slice(1)}`;
  const arrow: Visual = { kind: 'text', value: '→', size: 'l' };
  return {
    type: 'choice',
    mode: 'look',
    facts: { from: [a, b], base: c, options: choices },
    prompt: { text: `${cap(a)} is to ${b} as ${c} is to ___?`, speak: [{ word: a }, 'is to', { word: b }, 'as', { word: c }, 'is to what?'] },
    stimulus: { kind: 'row', children: [word(a), arrow, word(b)] },
    options: choices.map(word),
    answerIndex: choices.indexOf(d),
    explanation: { speak: [{ word: a }, rel.says, { word: b }, '.', 'So', { word: c }, rel.says, { word: d }, '.'], steps: [`${cap(a)} ${rel.says} ${b}.`, `${cap(c)} ${rel.says} ${d}.`], visual: { kind: 'row', children: [word(c), arrow, word(d)] } },
  };
}

export const wordAnalogiesGenerator: SkillGenerator = {
  skillId: 'R-A15',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['verbal'],
  generate: wordAnalogy,
  exampleSeed: 715,
  example: () => wordAnalogy(1, makeRng(715)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'In an analogy, two pairs of words go together the same way.', speak: ['In an analogy, two pairs of words go together the same way.'], visual: { kind: 'row', children: [word('hot'), { kind: 'text', value: '→', size: 'l' }, word('cold')] } },
    { beat: 'watch', text: 'Hot is the opposite of cold. Up is the opposite of down.', speak: ['Hot is the opposite of cold. Up is the opposite of down.'], visual: { kind: 'row', children: [word('up'), { kind: 'text', value: '→', size: 'l' }, word('down')] } },
    { beat: 'try', text: 'Bird is to nest as bee is to ___?', speak: ['Bird is to nest as bee is to what?'], visual: { kind: 'row', children: [word('bird'), { kind: 'text', value: '→', size: 'l' }, word('nest')] }, reveal: { text: 'A bird lives in a nest. A bee lives in a hive.', speak: ['A bird lives in a nest. A bee lives in a hive.'], visual: { kind: 'row', children: [word('bee'), { kind: 'text', value: '→', size: 'l' }, word('hive')] } } },
    { beat: 'remember', text: 'Find how the first pair goes together, then do the same.', speak: ['Find how the first pair goes together, then do the same.'], visual: { kind: 'row', children: [word('cat'), { kind: 'text', value: '→', size: 'l' }, word('kitten')] } },
  ],
  oracle: 'verbalAnalogy',
};

// ---- A.16 Which word does not belong ----
// Levels: 4 words, one from a far group / one from a close group / 5 words, close group. Oracle: verbalClass.

function oddWord(level: Level, rng: Rng): QuestionDraft {
  const names = Object.keys(WORD_CLASSES);
  let group: string;
  let other: string;
  if (level === 1) {
    [group, other] = rng.sample(names, 2) as [string, string];
    while (CLOSE_CLASSES.some(([x, y]) => (x === group && y === other) || (y === group && x === other))) [group, other] = rng.sample(names, 2) as [string, string];
  } else {
    const pair = rng.pick(CLOSE_CLASSES);
    [group, other] = rng.bool() ? [pair[0], pair[1]] : [pair[1], pair[0]];
  }
  const same = rng.sample(WORD_CLASSES[group] as readonly string[], level === 3 ? 3 : 2);
  const odd = rng.pick(WORD_CLASSES[other] as readonly string[]);
  const choices = rng.shuffle([...same, odd]);
  const prompt = 'Which word does not belong?';
  const label = (name: string): string => ({ fruit: 'fruits', vegetable: 'vegetables', farmAnimal: 'farm animals', wildAnimal: 'wild animals', land: 'things that go on land', water: 'things that go on water', clothes: 'clothes', furniture: 'furniture', colour: 'colors', shape: 'shapes', weather: 'kinds of weather' })[name] ?? name;
  return {
    type: 'choice',
    mode: 'look',
    facts: { options: choices, words: choices },
    prompt: { text: prompt, speak: [prompt] },
    options: choices.map(word),
    answerIndex: choices.indexOf(odd),
    explanation: { speak: [`The others are ${label(group)}.`, { word: odd }, `is not.`], steps: [`${same.join(', ')}: ${label(group)}.`, `${odd[0]?.toUpperCase()}${odd.slice(1)} is not one of them.`], visual: word(odd) },
  };
}

export const oddWordGenerator: SkillGenerator = {
  skillId: 'R-A16',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['verbal'],
  generate: oddWord,
  exampleSeed: 716,
  example: () => oddWord(1, makeRng(716)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Find what most of the words have in common. The one that does not fit is the answer.', speak: ['Find what most of the words have in common. The one that does not fit is the answer.'], visual: { kind: 'row', children: [word('apple'), word('pear'), word('car')] } },
    { beat: 'watch', text: 'Apple and pear are fruits. Car is not.', speak: ['Apple and pear are fruits. Car is not.'], visual: word('car') },
    { beat: 'try', text: 'Which word does not belong? carrot, pea, grape', speak: ['Which word does not belong?'], visual: { kind: 'row', children: [word('carrot'), word('pea'), word('grape')] }, reveal: { text: 'Carrot and pea are vegetables. Grape is a fruit.', speak: ['Carrot and pea are vegetables. Grape is a fruit.'], visual: word('grape') } },
    { beat: 'remember', text: 'Find the group, then the word outside it.', speak: ['Find the group, then the word outside it.'], visual: word('car') },
  ],
  oracle: 'verbalClass',
};

// ---- A.17 Number grids ----
// Levels: each row counts up by 1 / each row goes up by the same step / the third number in a row is the
// first two added. Oracle: numberGrid.

function grid(rows: number[][], blank: number): Visual {
  return { kind: 'matrix', cells: rows.flat().map((n, i): Visual | 'blank' => (i === blank ? 'blank' : numeral(n, 'l'))) };
}

function numberGrid(level: Level, rng: Rng): QuestionDraft {
  const rows: number[][] = [];
  const step = level === 1 ? 1 : rng.pick([2, 3, 5, 10]);
  for (let r = 0; r < 3; r += 1) {
    if (level === 3) {
      const [a, b] = [rng.int(1, 9), rng.int(1, 9)];
      rows.push([a, b, a + b]);
    } else {
      const start = rng.int(1, level === 1 ? 9 : 20);
      rows.push([start, start + step, start + 2 * step]);
    }
  }
  // The blank is in the last row, never its first cell, so the row has a number to start from.
  const blank = 6 + rng.int(1, 2);
  const answer = rows[2]?.[blank - 6] as number;
  const rule: Say = level === 3 ? ['In each row, the first two numbers add up to the third.'] : ['Each row goes up by', { number: step }, '.'];
  const ruleText = level === 3 ? 'In each row, the first two numbers add up to the third.' : `Each row goes up by ${step}.`;
  const prompt = 'Which number goes in the empty box?';
  const slips = [answer + 1, answer - 1, answer + step, answer - step].filter((each) => each > 0 && each !== answer);
  const choices = rng.shuffle([answer, ...rng.sample([...new Set(slips)], 2)]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { rows: rows.map((row, i) => row.map((n, j) => (i * 3 + j === blank ? -1 : n))), rule: level === 3 ? 'sum' : 'step', options: choices },
    prompt: { text: prompt, speak: [prompt] },
    stimulus: grid(rows, blank),
    options: choices.map((n) => numeral(n, 'l')),
    answerIndex: choices.indexOf(answer),
    explanation: { speak: [...rule, 'The missing number is', { number: answer }, '.'], steps: [ruleText, `The missing number is ${answer}.`], visual: grid(rows, -1) },
  };
}

export const numberGridsGenerator: SkillGenerator = {
  skillId: 'R-A17',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: [],
  generate: numberGrid,
  exampleSeed: 717,
  example: () => numberGrid(1, makeRng(717)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Every row of the grid follows the same rule. Find it in the full rows.', speak: ['Every row of the grid follows the same rule. Find it in the full rows.'], visual: grid([[1, 2, 3], [4, 5, 6], [7, 8, 9]], -1) },
    { beat: 'watch', text: 'Each row goes up by 1: 1, 2, 3. 4, 5, 6.', speak: ['Each row goes up by one.'], visual: grid([[1, 2, 3], [4, 5, 6], [7, 8, 9]], -1) },
    { beat: 'try', text: 'Which number goes in the empty box?', speak: ['Which number goes in the empty box?'], visual: grid([[2, 4, 6], [5, 7, 9], [10, 12, 14]], 8), reveal: { text: 'Each row goes up by 2. 10, 12, 14.', speak: ['Each row goes up by two. Ten, twelve, fourteen.'], visual: grid([[2, 4, 6], [5, 7, 9], [10, 12, 14]], -1) } },
    { beat: 'remember', text: 'Find the rule in a full row, then use it.', speak: ['Find the rule in a full row, then use it.'], visual: grid([[1, 2, 3], [4, 5, 6], [7, 8, 9]], -1) },
  ],
  oracle: 'numberGrid',
};
