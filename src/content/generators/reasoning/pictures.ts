import type { Rng } from '../../../engine/rng';
import { makeRng } from '../../../engine/rng';
import type { Explanation, LessonStep, Level, QuestionDraft, ShapeName, Visual } from '../../../engine/types';
import type { AnalogyPair } from '../../data/analogies';
import { ANALOGY_CLASHES, ANALOGY_PAIRS } from '../../data/analogies';
import type { GroupWord, WordGroup } from '../../data/categories';
import { GROUP_WORDS, groupsClash, wordClashesWithGroup } from '../../data/categories';
import { COLOR_NAMES } from '../../data/colors';
import type { Riddle } from '../../data/riddles';
import { RIDDLES } from '../../data/riddles';
import type { SkillGenerator } from '../../generator';
import { pickApart, picture, row } from '../ela/pk/parts';
import { easyToTellApart, shape, twoClearColors } from '../math/pk/parts';
import type { ColorName } from '../../data/colors';
import type { Line, Piece } from './parts';
import { explained, line } from './parts';

// Reasoning A.1, A.2, A.9 and A.14: questions about pictures and what they have in common.
// After a wrong answer the screen shows only the child's answer and the right one, so a step names the pictures it
// talks about ("A dress and a scarf are clothes."), and the explanation picture shows the ones that go together.

// Groups that sit close together, so telling them apart takes more thought.
const CLOSE: [WordGroup, WordGroup][] = [
  ['animals', 'people'],
  ['animals', 'plants'],
  ['vehicles', 'things'],
  ['clothes', 'things'],
];
const isClose = (one: WordGroup, two: WordGroup): boolean => CLOSE.some(([x, y]) => (x === one && y === two) || (x === two && y === one));

// The pictures these puzzles use. The king is left out: his picture is a young prince, so it does not match his name.
const PICTURES: readonly GroupWord[] = GROUP_WORDS.filter((entry) => entry.word !== 'king');

// May a word from one group sit in a question about another group?
function mayMeet(entry: GroupWord, group: WordGroup, beside: readonly GroupWord[]): boolean {
  if (entry.group === group || groupsClash(entry.group, group) || wordClashesWithGroup(entry.word, group)) return false;
  return beside.every((other) => !wordClashesWithGroup(other.word, entry.group));
}

const groupPicture = (entry: { word: string; emoji: string }): Visual => picture(entry.word, entry.emoji);
const inGroup = (group: WordGroup): GroupWord[] => PICTURES.filter((entry) => entry.group === group);

// Names said whole, with no "a" before them: food and drink that are not counted, and things that come as a pair.
const UNCOUNTED = new Set(['cheese', 'bread', 'water', 'honey', 'milk', 'soup', 'paper']);
const MANY = new Set(['pants', 'grapes', 'glasses', 'eyes']);

// A picture's name with its article, as pieces of a sentence: "a dog", "an apple", "cheese", "pants".
function named(name: string): Piece[] {
  if (UNCOUNTED.has(name) || MANY.has(name)) return [{ word: name }];
  return [/^[aeiou]/.test(name) ? 'an' : 'a', { word: name }];
}

// "a dress and a scarf", "a boy, a girl and a woman"
function listed(names: readonly string[]): Piece[] {
  return names.flatMap((name, i): Piece[] => [...(i === 0 ? [] : i === names.length - 1 ? ['and'] : [',']), ...named(name)]);
}

// What a group's pictures are, in a young child's words. Vehicles are said by what they do: a dog goes too, but it
// does not take us places.
const GROUP_SAYS: Record<WordGroup, { are: string } | { verb: string }> = {
  animals: { are: 'animals' },
  food: { are: 'food' },
  vehicles: { verb: 'take us places' },
  clothes: { are: 'clothes' },
  plants: { are: 'plants' },
  people: { are: 'people' },
  things: { are: 'things' },
};

// "A dress and a scarf are clothes." / "A car and a bus take us places."
function shared(names: readonly string[], group: WordGroup): Line {
  const says = GROUP_SAYS[group];
  return 'are' in says ? line(...listed(names), 'are', `${says.are}.`) : line(...listed(names), `${says.verb}.`);
}

// "Cheese is not." / "Pants are not." / "A cactus does not."
function notOne(name: string, group: WordGroup): Line {
  const many = MANY.has(name);
  return line(...named(name), 'are' in GROUP_SAYS[group] ? (many ? 'are not.' : 'is not.') : many ? 'do not.' : 'does not.');
}

// "So is a glove." / "So are pants." / "So does a train."
function soIs(name: string, group: WordGroup): Line {
  const many = MANY.has(name);
  return line('so', 'are' in GROUP_SAYS[group] ? (many ? 'are' : 'is') : many ? 'do' : 'does', ...named(name), '.');
}

// ---- A.1 Odd one out ----
// Levels: 3 pictures, one from another group / 3 pictures from closer groups /
// 4 shapes, three the same and one differing by one attribute /
// 4 shapes that all look different, and a hidden rule three of them share: corners, colour or shape.

const ODD = 'Which one does not belong?';
const ODD_HINT = 'Find two that go together.';
// "Things" is never the group the others share: everything is a thing.
const SHARED_FAR: WordGroup[] = ['animals', 'food', 'vehicles', 'clothes', 'people'];
const SHARED_CLOSE: WordGroup[] = ['animals', 'vehicles', 'clothes', 'people', 'plants'];

function oddPictures(level: Level, rng: Rng): QuestionDraft {
  const group = rng.pick(level === 1 ? SHARED_FAR : SHARED_CLOSE);
  const pair = rng.sample(inGroup(group), 2);
  const odd = rng.pick(PICTURES.filter((entry) => mayMeet(entry, group, pair) && isClose(entry.group, group) === (level === 2)));
  const options = rng.shuffle([...pair, odd]);
  // The two that go together, in the order they were shown.
  const together = options.filter((entry) => entry !== odd);
  return {
    type: 'choice',
    mode: 'look',
    facts: { optionAttrs: options.map((entry) => entry.group), odd: odd.word, pair: pair.map((entry) => entry.word).sort(), options: options.map((entry) => entry.word) },
    prompt: { text: ODD, speak: [ODD] },
    options: options.map(groupPicture),
    answerIndex: options.indexOf(odd),
    explanation: explained([shared(together.map((entry) => entry.word), group), notOne(odd.word, group)], row(...together.map(groupPicture)), ODD_HINT),
  };
}

const ODD_SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];
const SIZE_WORD = { s: 'small', l: 'big' } as const;

// Four shapes: three the same picture, one different in a single way.
function oddShape(rng: Rng): QuestionDraft {
  const oddAt = rng.int(0, 3);
  const place = <T,>(same: T, odd: T): T[] => [0, 1, 2, 3].map((i) => (i === oddAt ? odd : same));
  const by = rng.pick(['colour', 'shape', 'size'] as const);
  const form = rng.pick(ODD_SHAPES);
  const color = rng.pick(COLOR_NAMES);
  let attrs: string[];
  let options: Visual[];
  let lines: Line[];
  let extra: Record<string, string>;
  if (by === 'colour') {
    const [one, two] = twoClearColors(rng);
    attrs = place(one, two);
    options = attrs.map((each) => shape(form, each as typeof one));
    lines = [line(`three of them are ${one} ${form}s.`), line(`the ${two} ${form} does not belong.`)];
    extra = { shape: form };
  } else if (by === 'shape') {
    const [one, two] = rng.sample(ODD_SHAPES, 2) as [ShapeName, ShapeName];
    attrs = place(one, two);
    options = attrs.map((each) => shape(each as ShapeName, color));
    lines = [line(`three of them are ${one}s.`), line(`the ${two} does not belong.`)];
    extra = { color };
  } else {
    const [one, two] = rng.shuffle(['s', 'l'] as const) as ['s' | 'l', 's' | 'l'];
    attrs = place(SIZE_WORD[one], SIZE_WORD[two]);
    options = place(one, two).map((each) => shape(form, color, each));
    lines = [line(`three of them are ${SIZE_WORD[one]} ${form}s.`), line(`the ${SIZE_WORD[two]} ${form} does not belong.`)];
    extra = { shape: form, color };
  }
  return {
    type: 'choice',
    mode: 'look',
    twins: true,
    facts: { optionAttrs: attrs, by, ...extra, options: attrs },
    prompt: { text: ODD, speak: [ODD] },
    options,
    answerIndex: oddAt,
    explanation: explained(lines, row(...options.filter((_, i) => i !== oddAt)), 'Look at the color, the shape and the size of each one.'),
  };
}

// Level 4: no two options are the same picture. Three share one thing the fourth does not, and
// everything else is mixed so that nothing else splits three to one: the sizes go two and two.
const ROUND: ShapeName[] = ['circle', 'oval'];
const CORNERED: ShapeName[] = ['square', 'triangle', 'star', 'hexagon', 'rectangle'];

function fourClearColors(rng: Rng): ColorName[] {
  for (;;) {
    const colors = rng.sample(COLOR_NAMES, 4);
    if (colors.every((one, i) => colors.slice(i + 1).every((two) => easyToTellApart(one, two)))) return colors;
  }
}

function oddByRule(rng: Rng): QuestionDraft {
  const oddAt = rng.int(0, 3);
  const place = <T,>(same: T, odd: T): T[] => [0, 1, 2, 3].map((i) => (i === oddAt ? odd : same));
  const by = rng.pick(['round', 'colour', 'shape'] as const);
  const sizes = rng.shuffle<'s' | 'l'>(['s', 's', 'l', 'l']);
  let forms: ShapeName[];
  let colors: ColorName[];
  let attrs: string[];
  let lines: Line[];
  if (by === 'round') {
    // Three shapes with corners and one round one, every colour different.
    const cornered = rng.sample(CORNERED, 3);
    const round = rng.pick(ROUND);
    forms = [0, 1, 2, 3].map((i) => (i === oddAt ? round : (cornered[i < oddAt ? i : i - 1] as ShapeName)));
    colors = fourClearColors(rng);
    attrs = place('corners', 'round');
    lines = [line('three of them have corners.'), line(`the ${round} is round, so it does not belong.`)];
  } else if (by === 'colour') {
    // Three of one colour and one of another, four different shapes that all have corners.
    const [one, two] = twoClearColors(rng);
    forms = rng.sample(CORNERED, 4);
    colors = place(one, two);
    attrs = colors;
    lines = [line(`three of them are ${one}.`), line(`the ${two} ${forms[oddAt] as string} does not belong.`)];
  } else {
    // Three of one shape and one of another, every colour different.
    const [one, two] = rng.sample(CORNERED, 2) as [ShapeName, ShapeName];
    forms = place(one, two);
    colors = fourClearColors(rng);
    attrs = forms;
    lines = [line(`three of them are ${one}s.`), line(`the ${two} does not belong.`)];
  }
  const options = forms.map((form, i) => shape(form, colors[i] as ColorName, sizes[i]));
  return {
    type: 'choice',
    mode: 'look',
    facts: { optionAttrs: attrs, by, options: forms.map((form, i) => `${form}|${colors[i]}|${sizes[i]}`) },
    prompt: { text: ODD, speak: [ODD] },
    options,
    answerIndex: oddAt,
    explanation: explained(lines, row(...options.filter((_, i) => i !== oddAt)), 'Three of them share one thing: a color, a shape, or having corners.'),
  };
}

const oddOneOut = (level: Level, rng: Rng): QuestionDraft => (level === 4 ? oddByRule(rng) : level === 3 ? oddShape(rng) : oddPictures(level, rng));

const word = (name: string): GroupWord => GROUP_WORDS.find((entry) => entry.word === name) as GroupWord;

function oddLesson(): LessonStep[] {
  const animals = [shared(['cat', 'dog'], 'animals'), notOne('car', 'animals')];
  const food = [shared(['apple', 'banana'], 'food'), notOne('shoe', 'food')];
  return [
    { beat: 'see', text: 'Some things belong together. One may not belong.', speak: ['Some things belong together. One may not belong.'], visual: row(groupPicture(word('cat')), groupPicture(word('dog')), groupPicture(word('car'))) },
    { beat: 'watch', text: `${ODD} ${animals.map((each) => each.text).join(' ')}`, speak: [ODD, ...animals.flatMap((each) => each.speak)], visual: row(groupPicture(word('cat')), groupPicture(word('dog'))) },
    {
      beat: 'try',
      text: ODD,
      speak: [ODD],
      visual: row(groupPicture(word('apple')), groupPicture(word('shoe')), groupPicture(word('banana'))),
      reveal: { text: food.map((each) => each.text).join(' '), speak: food.flatMap((each) => each.speak), visual: row(groupPicture(word('apple')), groupPicture(word('banana'))) },
    },
    { beat: 'remember', text: 'Find what the others share.', speak: ['Find what the others share.'], visual: row(groupPicture(word('cat')), groupPicture(word('dog'))) },
  ];
}

export const oddOneOutGenerator: SkillGenerator = {
  skillId: 'R-A1',
  maxLevel: 4,
  itemTypes: ['choice'],
  lists: ['categories', 'colors'],
  generate: oddOneOut,
  exampleSeed: 81,
  example: () => oddOneOut(1, makeRng(81)),
  lesson: oddLesson,
  oracle: 'oddOne',
};

// ---- A.2 Which belongs ----
// Levels: two examples from a group, pick a third / closer distractors /
// three examples and four options: two from close groups and one from a far group.

const BELONGS = 'Which one belongs with these?';

// The examples and the answer make the group whole: the explanation picture shows all of them.
function belongsExplanation(examples: readonly GroupWord[], group: WordGroup, answer: GroupWord): Explanation {
  return explained([shared(examples.map((entry) => entry.word), group), soIs(answer.word, group)], row(...[...examples, answer].map(groupPicture)), 'Say what kind of things these are. Then find one more.');
}

function whichBelongs(level: Level, rng: Rng): QuestionDraft {
  const group = rng.pick(level === 1 ? [...SHARED_FAR, 'plants' as WordGroup] : SHARED_CLOSE);
  const [one, two, answer] = rng.sample(inGroup(group), 3) as [GroupWord, GroupWord, GroupWord];
  const members = [one, two, answer];
  const allowed = PICTURES.filter((entry) => mayMeet(entry, group, members) && isClose(entry.group, group) === (level === 2));
  // Far wrong options come from two different groups. Close ones may share a group: there are few close groups.
  const wrong = pickApart(allowed, 2, rng, (entry, picked) => picked.every((taken) => (level === 2 || taken.group !== entry.group) && !groupsClash(taken.group, entry.group) && !wordClashesWithGroup(taken.word, entry.group) && !wordClashesWithGroup(entry.word, taken.group)));
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: group, relation: 'category', examples: [one.word, two.word], answer: answer.word, options: options.map((entry) => entry.word) },
    prompt: { text: BELONGS, speak: [BELONGS] },
    stimulus: row(groupPicture(one), groupPicture(two)),
    options: options.map(groupPicture),
    answerIndex: options.indexOf(answer),
    explanation: belongsExplanation([one, two], group, answer),
  };
}

const avoid = (one: GroupWord, two: GroupWord): boolean => groupsClash(one.group, two.group) || wordClashesWithGroup(one.word, two.group) || wordClashesWithGroup(two.word, one.group);

function belongsHarder(rng: Rng): QuestionDraft {
  const group = rng.pick(SHARED_CLOSE);
  const members = rng.sample(inGroup(group), 4) as [GroupWord, GroupWord, GroupWord, GroupWord];
  const [one, two, three, answer] = members;
  const allowed = (close: boolean): GroupWord[] => PICTURES.filter((entry) => mayMeet(entry, group, members) && isClose(entry.group, group) === close);
  const near = pickApart(allowed(true), 2, rng, (entry, picked) => picked.every((taken) => !avoid(taken, entry)));
  const far = pickApart(allowed(false), 1, rng, (entry) => near.every((taken) => !avoid(taken, entry)));
  const options = rng.shuffle([answer, ...near, ...far]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: group, relation: 'category', examples: [one.word, two.word, three.word], answer: answer.word, options: options.map((entry) => entry.word) },
    prompt: { text: BELONGS, speak: [BELONGS] },
    stimulus: row(groupPicture(one), groupPicture(two), groupPicture(three)),
    options: options.map(groupPicture),
    answerIndex: options.indexOf(answer),
    explanation: belongsExplanation([one, two, three], group, answer),
  };
}

const belongs = (level: Level, rng: Rng): QuestionDraft => (level === 3 ? belongsHarder(rng) : whichBelongs(level, rng));

function belongsLesson(): LessonStep[] {
  const shown = belongsExplanation([word('car'), word('bus')], 'vehicles', word('train'));
  const revealed = belongsExplanation([word('shirt'), word('sock')], 'clothes', word('hat'));
  return [
    { beat: 'see', text: 'Things in a group share something. A car and a bus both take us places.', speak: ['Things in a group share something. A', { word: 'car' }, 'and a', { word: 'bus' }, 'both take us places.'], visual: row(groupPicture(word('car')), groupPicture(word('bus'))) },
    { beat: 'watch', text: `${BELONGS} ${shown.steps.join(' ')}`, speak: [BELONGS, ...shown.speak], visual: row(groupPicture(word('car')), groupPicture(word('bus')), groupPicture(word('train'))) },
    {
      beat: 'try',
      text: 'A shirt and a sock. Which one belongs with these?',
      speak: ['A', { word: 'shirt' }, 'and a', { word: 'sock' }, '.', BELONGS],
      visual: row(groupPicture(word('hat')), groupPicture(word('apple'))),
      reveal: { text: revealed.steps.join(' '), speak: revealed.speak, visual: revealed.visual ?? groupPicture(word('hat')) },
    },
    { beat: 'remember', text: 'Find what they share.', speak: ['Find what they share.'], visual: row(groupPicture(word('car')), groupPicture(word('bus'))) },
  ];
}

export const whichBelongsGenerator: SkillGenerator = {
  skillId: 'R-A2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['categories'],
  generate: belongs,
  exampleSeed: 82,
  example: () => belongs(1, makeRng(82)),
  lesson: belongsLesson,
  oracle: 'wordSet',
};

// ---- A.9 Picture analogies ----
// Levels: "A sock goes with a foot. A glove goes with what?": wrong options from other relations / from the same
// relation. Level 3 runs the other way, "A foot is to a sock as a hand is to what?", with four options: the other
// first halves of the same relation and one from another relation.
// No option is ever one that could be argued for, such as an egg for a bird (ANALOGY_CLASHES).

const goesWith = (name: string): string => (MANY.has(name) ? 'go with' : 'goes with');
const isTo = (name: string): string => (MANY.has(name) ? 'are to' : 'is to');

function analogyPrompt(example: AnalogyPair, target: AnalogyPair): Line {
  return line(...named(example.first.word), goesWith(example.first.word), ...named(example.second.word), '.', ...named(target.first.word), goesWith(target.first.word), 'what?');
}

const ANALOGY_HINT = 'How do the first two pictures go together?';

function analogyExplanation(example: AnalogyPair, target: AnalogyPair, visual: Visual): Explanation {
  return explained([line(example.why), line(target.why)], visual, ANALOGY_HINT);
}

// A first word and a second word that must never meet in one question.
const clash = (first: string, second: string): boolean => ANALOGY_CLASHES.some(([one, two]) => one === first && two === second);

function pictureAnalogy(level: Level, rng: Rng): QuestionDraft {
  const target = rng.pick(ANALOGY_PAIRS);
  const sameRelation = ANALOGY_PAIRS.filter((pair) => pair.relation === target.relation && pair !== target);
  const example = rng.pick(sameRelation);
  // Level 2: the other second halves of the same relation, the example's among them.
  const fits = (pair: AnalogyPair): boolean => !clash(target.first.word, pair.second.word);
  const wrong = level === 1 ? rng.sample(ANALOGY_PAIRS.filter((pair) => pair.relation !== target.relation && fits(pair)), 2) : sameRelation.filter(fits);
  const options = rng.shuffle([target, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: target.first.word, relation: 'analogyPair', example: [example.first.word, example.second.word], options: options.map((pair) => pair.second.word) },
    prompt: analogyPrompt(example, target),
    stimulus: { kind: 'matrix', cells: [groupPicture(example.first), groupPicture(example.second), groupPicture(target.first), 'blank'] },
    options: options.map((pair) => groupPicture(pair.second)),
    answerIndex: options.indexOf(target),
    explanation: analogyExplanation(example, target, row(groupPicture(target.first), groupPicture(target.second))),
  };
}

function backAnalogy(rng: Rng): QuestionDraft {
  const target = rng.pick(ANALOGY_PAIRS);
  const fits = (pair: AnalogyPair): boolean => !clash(pair.first.word, target.second.word);
  const sameRelation = ANALOGY_PAIRS.filter((pair) => pair.relation === target.relation && pair !== target);
  const example = rng.pick(sameRelation);
  const other = rng.pick(ANALOGY_PAIRS.filter((pair) => pair.relation !== target.relation && fits(pair)));
  const options = rng.shuffle([target, ...sameRelation.filter(fits), other]);
  const prompt = line(...named(example.second.word), isTo(example.second.word), ...named(example.first.word), 'as', ...named(target.second.word), isTo(target.second.word), 'what?');
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: target.second.word, relation: 'analogyBack', example: [example.second.word, example.first.word], options: options.map((pair) => pair.first.word) },
    prompt,
    stimulus: { kind: 'matrix', cells: [groupPicture(example.second), groupPicture(example.first), groupPicture(target.second), 'blank'] },
    options: options.map((pair) => groupPicture(pair.first)),
    answerIndex: options.indexOf(target),
    explanation: analogyExplanation(example, target, row(groupPicture(target.second), groupPicture(target.first))),
  };
}

const analogy = (level: Level, rng: Rng): QuestionDraft => (level === 3 ? backAnalogy(rng) : pictureAnalogy(level, rng));

const pairOf = (first: string): AnalogyPair => ANALOGY_PAIRS.find((pair) => pair.first.word === first) as AnalogyPair;

function analogyLesson(): LessonStep[] {
  const [sock, glove, bee, cow] = [pairOf('sock'), pairOf('glove'), pairOf('bee'), pairOf('cow')];
  const socks = analogyExplanation(sock, glove, row(groupPicture(glove.first), groupPicture(glove.second)));
  const milk = analogyExplanation(bee, cow, row(groupPicture(cow.first), groupPicture(cow.second)));
  return [
    { beat: 'see', text: 'Some things go together. A sock goes on a foot.', speak: ['Some things go together.', sock.why], visual: row(groupPicture(sock.first), groupPicture(sock.second)) },
    {
      beat: 'watch',
      text: `${analogyPrompt(sock, glove).text} ${socks.steps.join(' ')}`,
      speak: [...analogyPrompt(sock, glove).speak, ...socks.speak],
      visual: { kind: 'matrix', cells: [groupPicture(sock.first), groupPicture(sock.second), groupPicture(glove.first), groupPicture(glove.second)] },
    },
    {
      beat: 'try',
      text: analogyPrompt(bee, cow).text,
      speak: analogyPrompt(bee, cow).speak,
      visual: { kind: 'matrix', cells: [groupPicture(bee.first), groupPicture(bee.second), groupPicture(cow.first), 'blank'] },
      reveal: { text: milk.steps.join(' '), speak: milk.speak, visual: milk.visual ?? groupPicture(cow.second) },
    },
    { beat: 'remember', text: 'Find how the first two go together.', speak: ['Find how the first two go together.'], visual: row(groupPicture(sock.first), groupPicture(sock.second)) },
  ];
}

export const pictureAnalogiesGenerator: SkillGenerator = {
  skillId: 'R-A9',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['analogies'],
  generate: analogy,
  exampleSeed: 89,
  example: () => analogy(1, makeRng(89)),
  lesson: analogyLesson,
  oracle: 'wordSet',
};

// ---- A.14 Picture riddles ----
// Levels: spoken riddle with 2 pictures / 3 pictures / 4 pictures.
// The step gives the reason ("An umbrella keeps the rain off your head."), not the riddle again.

function riddleExplanation(riddle: Riddle): Explanation {
  return explained([line(riddle.why)], groupPicture(riddle), 'Listen to the whole riddle. Then check each picture.');
}

function pictureRiddle(level: Level, rng: Rng): QuestionDraft {
  const riddle = rng.pick(RIDDLES);
  const wrong = rng.sample(RIDDLES.filter((other) => other !== riddle), level);
  const options = rng.shuffle([riddle, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: riddle.riddle, relation: 'riddle', options: options.map((option) => option.word) },
    prompt: { text: riddle.riddle, speak: [riddle.riddle] },
    options: options.map(groupPicture),
    answerIndex: options.indexOf(riddle),
    explanation: riddleExplanation(riddle),
  };
}

const riddleFor = (answer: string): Riddle => RIDDLES.find((riddle) => riddle.word === answer) as Riddle;

function riddleLesson(): LessonStep[] {
  const [clock, bird, shoe] = [riddleFor('clock'), riddleFor('bird'), riddleFor('shoe')];
  return [
    { beat: 'see', text: 'A riddle gives clues. The clues point to one picture.', speak: ['A riddle gives clues. The clues point to one picture.'], visual: row(groupPicture(clock), groupPicture(shoe)) },
    { beat: 'watch', text: `${clock.riddle} ${riddleExplanation(clock).steps.join(' ')}`, speak: [clock.riddle, ...riddleExplanation(clock).speak], visual: groupPicture(clock) },
    {
      beat: 'try',
      text: bird.riddle,
      speak: [bird.riddle],
      visual: row(groupPicture(shoe), groupPicture(bird)),
      reveal: { text: riddleExplanation(bird).steps.join(' '), speak: riddleExplanation(bird).speak, visual: groupPicture(bird) },
    },
    { beat: 'remember', text: 'Listen to every clue.', speak: ['Listen to every clue.'], visual: row(groupPicture(clock), groupPicture(bird)) },
  ];
}

export const pictureRiddlesGenerator: SkillGenerator = {
  skillId: 'R-A14',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['riddles'],
  generate: pictureRiddle,
  exampleSeed: 94,
  example: () => pictureRiddle(1, makeRng(94)),
  lesson: riddleLesson,
  oracle: 'wordSet',
};
