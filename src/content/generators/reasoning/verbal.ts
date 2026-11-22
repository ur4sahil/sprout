import type { Rng } from '../../../engine/rng';
import { makeRng } from '../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, Visual } from '../../../engine/types';
import { ALSO_IN, CLOSE_CLASSES, NEAR_MISSES, NOT_ASKED, PAIR_SENTENCES, VERBAL_CLASHES, VERBAL_RELATIONS, WORD_CLASSES } from '../../data/verbal';
import type { SkillGenerator } from '../../generator';
import { numeral } from '../../generator';
import type { Line, Piece } from './parts';
import { explained, line } from './parts';

// Reasoning A.15 word analogies, A.16 which word does not belong, A.17 number grids (plan section 15, phase I).

const word = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: [{ word: value }] });

// Words said with no "a" before them: describing words, colours, the weather and stuff that is not counted.
// The sky and the floor take "the".
const BARE = new Set([
  ...(VERBAL_RELATIONS.opposite?.pairs ?? []).flat(),
  ...(VERBAL_RELATIONS.colour?.pairs ?? []).map(([, colour]) => colour),
  ...(WORD_CLASSES.colour ?? []),
  'honey', 'milk', 'wool', 'wood', 'grass', 'snow', 'paper', 'soup', 'hair', 'rain', 'wind', 'sunshine', 'corn',
]);
const WITH_THE = new Set(['sky', 'floor']);

// A word with its article, as pieces of a sentence: "a bee", "an egg", "honey", "the sky", "hot".
function named(value: string): Piece[] {
  if (BARE.has(value)) return [{ word: value }];
  return [WITH_THE.has(value) ? 'the' : /^[aeiou]/.test(value) ? 'an' : 'a', { word: value }];
}

// "a sofa and a bed", "a hat, a sock and a shirt"
function listed(values: readonly string[]): Piece[] {
  return values.flatMap((value, i): Piece[] => [...(i === 0 ? [] : i === values.length - 1 ? ['and'] : [',']), ...named(value)]);
}

// ---- A.15 Word analogies ----
// Levels: opposites and homes / babies, what animals give, colours / parts and tools, and the homes and gifts
// that have one, with a near miss among the wrong words. Oracle: verbalAnalogy.
// Levels 1 and 2 ask "A bee goes with a hive. A pig goes with what?"; level 3 asks "is to ... as ... is to".
// Both pairs are shown, one above the other, with an empty box for the answer.

const LEVEL_RELATIONS: Record<number, string[]> = { 1: ['opposite', 'home'], 2: ['baby', 'makes', 'colour'], 3: ['part', 'tool', 'home', 'makes'] };

// True when c and w are a pair of this relation, so w would also be a right answer.
const pairs = (name: string, c: string, w: string): boolean => (VERBAL_RELATIONS[name]?.pairs ?? []).some(([x, y]) => x === c && y === w);
const clashes = (c: string, w: string): boolean => VERBAL_CLASHES.some(([x, y]) => x === c && y === w);

// Words that go with c in another way: its pair in another relation (bee and honey) or one from the near-miss list.
function nearTo(name: string, c: string, d: string): string[] {
  const others = Object.entries(VERBAL_RELATIONS).filter(([other]) => other !== name).flatMap(([, other]) => other.pairs.filter(([x]) => x === c).map(([, y]) => y));
  return [...new Set([...others, ...(NEAR_MISSES[c] ?? [])])].filter((w) => w !== d && !pairs(name, c, w));
}

const sentence = (a: string, b: string): string => {
  const said = PAIR_SENTENCES[`${a}|${b}`];
  if (said === undefined) throw new Error(`No sentence for ${a} and ${b}`);
  return said;
};

function analogyPrompt(level: Level, a: string, b: string, c: string): Line {
  return level === 3 ? line(...named(a), 'is to', ...named(b), 'as', ...named(c), 'is to what?') : line(...named(a), 'goes with', ...named(b), '.', ...named(c), 'goes with what?');
}

const ANALOGY_HINT = 'How do the first two words go together? Use the same link.';

function wordAnalogy(level: Level, rng: Rng): QuestionDraft {
  const name = rng.pick(LEVEL_RELATIONS[level] as string[]);
  const rel = VERBAL_RELATIONS[name] as (typeof VERBAL_RELATIONS)[string];
  const usable = rel.pairs.filter(([, y]) => !NOT_ASKED.has(y));
  // The hard level asks only about a word that has a near miss, so it is never an easy question again.
  const targets = level === 3 ? usable.filter(([x, y]) => nearTo(name, x, y).length > 0) : usable;
  const [c, d] = rng.pick(targets) as readonly [string, string];
  const [a, b] = rng.pick(usable.filter(([x]) => x !== c)) as readonly [string, string];
  const near = nearTo(name, c, d);
  // Far: a word from another relation that cannot be argued to go with c: not its near misses, not a clash.
  const far = [...new Set(Object.entries(VERBAL_RELATIONS).filter(([other]) => other !== name).flatMap(([, other]) => other.pairs.map(([, y]) => y)))].filter(
    (w) => ![a, b, c, d].includes(w) && !pairs(name, c, w) && !near.includes(w) && !clashes(c, w) && !NOT_ASKED.has(w),
  );
  const first = level === 3 ? rng.pick(near) : rng.pick(far);
  const second = rng.pick(far.filter((w) => w !== first));
  const choices = rng.shuffle([d, first, second]);
  const prompt = analogyPrompt(level, a, b, c);
  return {
    type: 'choice',
    mode: 'look',
    facts: { from: [a, b], base: c, options: choices },
    prompt: { text: prompt.text, speak: prompt.speak },
    stimulus: { kind: 'matrix', cells: [word(a), word(b), word(c), 'blank'] },
    options: choices.map(word),
    answerIndex: choices.indexOf(d),
    explanation: explained([line(sentence(a, b)), line(sentence(c, d))], { kind: 'matrix', cells: [word(a), word(b), word(c), word(d)] }, ANALOGY_HINT),
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
    { beat: 'see', text: 'In an analogy, two pairs of words go together the same way.', speak: ['In an analogy, two pairs of words go together the same way.'], visual: { kind: 'matrix', cells: [word('hot'), word('cold'), word('up'), word('down')] } },
    { beat: 'watch', text: 'Hot is the opposite of cold. Up is the opposite of down.', speak: ['Hot is the opposite of cold. Up is the opposite of down.'], visual: { kind: 'matrix', cells: [word('hot'), word('cold'), word('up'), word('down')] } },
    {
      beat: 'try',
      text: 'A bird goes with a nest. A bee goes with what?',
      speak: ['A bird goes with a nest. A bee goes with what?'],
      visual: { kind: 'matrix', cells: [word('bird'), word('nest'), word('bee'), 'blank'] },
      reveal: { text: 'A bird lives in a nest. A bee lives in a hive.', speak: ['A bird lives in a nest. A bee lives in a hive.'], visual: { kind: 'matrix', cells: [word('bird'), word('nest'), word('bee'), word('hive')] } },
    },
    { beat: 'remember', text: 'Find how the first pair goes together, then do the same.', speak: ['Find how the first pair goes together, then do the same.'], visual: { kind: 'matrix', cells: [word('cat'), word('kitten'), word('dog'), word('puppy')] } },
  ],
  oracle: 'verbalAnalogy',
};

// ---- A.16 Which word does not belong ----
// Levels: 3 words, one from a far group / one from a close group / 4 words, close group. Oracle: verbalClass.
// The prompt says the words, so a child who cannot read them yet still hears them.

// What a group's words are, in a child's words. Two are said by what they do: a car and a van have wheels (a
// hen goes on land too, so "things that go on land" was not true of the group alone).
const GROUP_SAYS: Record<string, { are: string } | { verb: string }> = {
  fruit: { are: 'fruits' },
  vegetable: { are: 'vegetables' },
  farmAnimal: { are: 'farm animals' },
  wildAnimal: { are: 'wild animals' },
  land: { verb: 'have wheels' },
  water: { verb: 'go on water' },
  clothes: { are: 'clothes' },
  furniture: { are: 'furniture' },
  colour: { are: 'colors' },
  shape: { are: 'shapes' },
  weather: { are: 'kinds of weather' },
};

// "A sofa and a bed are furniture." then "A star is not.", or "A car and a van have wheels." then "A hen does not."
function oddLines(group: string, same: readonly string[], odd: string): Line[] {
  const says = GROUP_SAYS[group] ?? { are: group };
  return 'are' in says ? [line(...listed(same), 'are', `${says.are}.`), line(...named(odd), 'is not.')] : [line(...listed(same), `${says.verb}.`), line(...named(odd), 'does not.')];
}

const ODD_WORD_HINT = 'Find the group most of the words belong to.';

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
  // A word that also belongs to the group is never the odd one: a peach is a color as well as a fruit.
  const odd = rng.pick((WORD_CLASSES[other] as readonly string[]).filter((w) => !(ALSO_IN[group] ?? []).includes(w)));
  const choices = rng.shuffle([...same, odd]);
  const prompt = 'Which word does not belong?';
  const together = choices.filter((w) => w !== odd);
  const read: Say = [...choices.flatMap((w, i): Say => (i === 0 ? [{ word: w }] : [',', { word: w }])), '.', prompt];
  return {
    type: 'choice',
    mode: 'look',
    facts: { options: choices, words: choices },
    prompt: { text: prompt, speak: read },
    options: choices.map(word),
    answerIndex: choices.indexOf(odd),
    explanation: explained(oddLines(group, together, odd), { kind: 'row', children: together.map(word) }, ODD_WORD_HINT),
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
    { beat: 'watch', text: 'An apple and a pear are fruits. A car is not.', speak: ['An apple and a pear are fruits. A car is not.'], visual: word('car') },
    { beat: 'try', text: 'Which word does not belong? carrot, pea, grape', speak: ['Carrot, pea, grape. Which word does not belong?'], visual: { kind: 'row', children: [word('carrot'), word('pea'), word('grape')] }, reveal: { text: 'A carrot and a pea are vegetables. A grape is a fruit.', speak: ['A carrot and a pea are vegetables. A grape is a fruit.'], visual: word('grape') } },
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
    explanation: {
      speak: [...rule, 'The missing number is', { number: answer }, '.'],
      steps: [ruleText, `The missing number is ${answer}.`],
      visual: grid(rows, -1),
      // No number words: "the first two" would name an answer of 2.
      hint: { text: level === 3 ? 'Look at a full row. How do you get its last number from the others?' : 'Look at a full row. How much does it go up each time?' },
    },
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
