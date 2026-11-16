import type { Rng } from '../../../engine/rng';
import { makeRng } from '../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../engine/types';
import type { AnalogyPair } from '../../data/analogies';
import { ANALOGY_CLASHES, ANALOGY_PAIRS } from '../../data/analogies';
import type { GroupWord, WordGroup } from '../../data/categories';
import { GROUP_WORDS, groupsClash, wordClashesWithGroup } from '../../data/categories';
import { COLOR_NAMES } from '../../data/colors';
import type { Riddle } from '../../data/riddles';
import { RIDDLES } from '../../data/riddles';
import type { SkillGenerator } from '../../generator';
import type { Explanation } from '../ela/pk/parts';
import { cap, pickApart, picture, row } from '../ela/pk/parts';
import { a, shape, twoClearColors } from '../math/pk/parts';

// Reasoning A.1, A.2, A.9 and A.14: questions about pictures and what they have in common.

// Groups that sit close together, so telling them apart takes more thought.
const CLOSE: [WordGroup, WordGroup][] = [
  ['animals', 'people'],
  ['animals', 'plants'],
  ['vehicles', 'things'],
  ['clothes', 'things'],
];
const isClose = (one: WordGroup, two: WordGroup): boolean => CLOSE.some(([x, y]) => (x === one && y === two) || (x === two && y === one));

// May a word from one group sit in a question about another group?
function mayMeet(entry: GroupWord, group: WordGroup, beside: readonly GroupWord[]): boolean {
  if (entry.group === group || groupsClash(entry.group, group) || wordClashesWithGroup(entry.word, group)) return false;
  return beside.every((other) => !wordClashesWithGroup(other.word, entry.group));
}

const groupPicture = (entry: { word: string; emoji: string }): Visual => picture(entry.word, entry.emoji);
const inGroup = (group: WordGroup): GroupWord[] => GROUP_WORDS.filter((entry) => entry.group === group);

// ---- A.1 Odd one out ----
// Levels: 3 pictures, one from another group / 3 pictures from closer groups /
// 4 shapes, three the same and one differing by one attribute.

const ODD = 'Which one does not belong?';
// "Things" is never the group the others share: everything is a thing.
const SHARED_FAR: WordGroup[] = ['animals', 'food', 'vehicles', 'clothes', 'people'];
const SHARED_CLOSE: WordGroup[] = ['animals', 'vehicles', 'clothes', 'people', 'plants'];

function oddPictures(level: Level, rng: Rng): QuestionDraft {
  const group = rng.pick(level === 1 ? SHARED_FAR : SHARED_CLOSE);
  const pair = rng.sample(inGroup(group), 2);
  const odd = rng.pick(GROUP_WORDS.filter((entry) => mayMeet(entry, group, pair) && isClose(entry.group, group) === (level === 2)));
  const options = rng.shuffle([...pair, odd]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { optionAttrs: options.map((entry) => entry.group), odd: odd.word, pair: pair.map((entry) => entry.word).sort(), options: options.map((entry) => entry.word) },
    prompt: { text: ODD, speak: [ODD] },
    options: options.map(groupPicture),
    answerIndex: options.indexOf(odd),
    explanation: {
      speak: [`These are both ${group}. This one is not.`, { word: odd.word }, '.'],
      steps: [`These are both ${group}.`, `This one is not: ${odd.word}.`],
      visual: groupPicture(odd),
    },
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
  let same: string;
  let different: string;
  let extra: Record<string, string>;
  if (by === 'colour') {
    const [one, two] = twoClearColors(rng);
    attrs = place(one, two);
    options = attrs.map((each) => shape(form, each as typeof one));
    [same, different, extra] = [one, two, { shape: form }];
  } else if (by === 'shape') {
    const [one, two] = rng.sample(ODD_SHAPES, 2) as [ShapeName, ShapeName];
    attrs = place(one, two);
    options = attrs.map((each) => shape(each as ShapeName, color));
    [same, different, extra] = [`${one}s`, a(two), { color }];
  } else {
    const [one, two] = rng.shuffle(['s', 'l'] as const) as ['s' | 'l', 's' | 'l'];
    attrs = place(SIZE_WORD[one], SIZE_WORD[two]);
    options = place(one, two).map((each) => shape(form, color, each));
    [same, different, extra] = [SIZE_WORD[one], SIZE_WORD[two], { shape: form, color }];
  }
  return {
    type: 'choice',
    mode: 'look',
    twins: true,
    facts: { optionAttrs: attrs, by, ...extra, options: attrs },
    prompt: { text: ODD, speak: [ODD] },
    options,
    answerIndex: oddAt,
    explanation: { speak: [`These three are all ${same}. This one is ${different}.`], steps: [`These three are all ${same}.`, `This one is ${different}.`], visual: options[oddAt] as Visual },
  };
}

const oddOneOut = (level: Level, rng: Rng): QuestionDraft => (level === 3 ? oddShape(rng) : oddPictures(level, rng));

const word = (name: string): GroupWord => GROUP_WORDS.find((entry) => entry.word === name) as GroupWord;

function oddLesson(): LessonStep[] {
  return [
    { beat: 'see', text: 'Some things belong together. One may not belong.', speak: ['Some things belong together. One may not belong.'], visual: row(groupPicture(word('cat')), groupPicture(word('dog')), groupPicture(word('car'))) },
    {
      beat: 'watch',
      text: `${ODD} These are both animals. This one is not: car.`,
      speak: [ODD, 'These are both animals. This one is not.', { word: 'car' }, '.'],
      visual: groupPicture(word('car')),
    },
    {
      beat: 'try',
      text: ODD,
      speak: [ODD],
      visual: row(groupPicture(word('apple')), groupPicture(word('shoe')), groupPicture(word('banana'))),
      reveal: { text: 'These are both food. This one is not: shoe.', speak: ['These are both food. This one is not.', { word: 'shoe' }, '.'], visual: groupPicture(word('shoe')) },
    },
    { beat: 'remember', text: 'Find what the others share.', speak: ['Find what the others share.'], visual: row(groupPicture(word('cat')), groupPicture(word('dog'))) },
  ];
}

export const oddOneOutGenerator: SkillGenerator = {
  skillId: 'R-A1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['categories', 'colors'],
  generate: oddOneOut,
  exampleSeed: 81,
  example: () => oddOneOut(1, makeRng(81)),
  lesson: oddLesson,
  oracle: 'oddOne',
};

// ---- A.2 Which belongs ----
// Levels: two examples from a group, pick a third / closer distractors.

const BELONGS = 'Which one belongs with these?';

function belongsExplanation(group: WordGroup, answer: GroupWord): Explanation {
  return {
    speak: [`These are both ${group}. So is this one.`, { word: answer.word }, '.'],
    steps: [`These are both ${group}.`, `So is this one: ${answer.word}.`],
    visual: groupPicture(answer),
  };
}

function whichBelongs(level: Level, rng: Rng): QuestionDraft {
  const group = rng.pick(level === 1 ? [...SHARED_FAR, 'plants' as WordGroup] : SHARED_CLOSE);
  const [one, two, answer] = rng.sample(inGroup(group), 3) as [GroupWord, GroupWord, GroupWord];
  const members = [one, two, answer];
  const allowed = GROUP_WORDS.filter((entry) => mayMeet(entry, group, members) && isClose(entry.group, group) === (level === 2));
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
    explanation: belongsExplanation(group, answer),
  };
}

function belongsLesson(): LessonStep[] {
  const shown = belongsExplanation('vehicles', word('train'));
  const revealed = belongsExplanation('clothes', word('hat'));
  return [
    { beat: 'see', text: 'Things in a group share something. A car and a bus are both vehicles.', speak: ['Things in a group share something. A', { word: 'car' }, 'and a', { word: 'bus' }, 'are both vehicles.'], visual: row(groupPicture(word('car')), groupPicture(word('bus'))) },
    { beat: 'watch', text: `${BELONGS} ${shown.steps.join(' ')}`, speak: [BELONGS, ...shown.speak], visual: row(groupPicture(word('car')), groupPicture(word('bus')), groupPicture(word('train'))) },
    {
      beat: 'try',
      text: 'A shirt and a sock. Which one belongs with these?',
      speak: ['A', { word: 'shirt' }, 'and a', { word: 'sock' }, '.', BELONGS],
      visual: row(groupPicture(word('hat')), groupPicture(word('apple'))),
      reveal: { text: revealed.steps.join(' '), speak: revealed.speak, visual: revealed.visual },
    },
    { beat: 'remember', text: 'Find what they share.', speak: ['Find what they share.'], visual: row(groupPicture(word('car')), groupPicture(word('bus'))) },
  ];
}

export const whichBelongsGenerator: SkillGenerator = {
  skillId: 'R-A2',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['categories'],
  generate: whichBelongs,
  exampleSeed: 82,
  example: () => whichBelongs(1, makeRng(82)),
  lesson: belongsLesson,
  oracle: 'wordSet',
};

// ---- A.9 Picture analogies ----
// Levels: "Sock goes with foot. Glove goes with what?": wrong options from other relations / from the same relation.
// A wrong option from another relation is never one that could be argued for, such as an egg for a bird.

function analogyPrompt(example: AnalogyPair, target: AnalogyPair): { text: string; speak: Say } {
  return {
    text: `${cap(example.first.word)} goes with ${example.second.word}. ${cap(target.first.word)} goes with what?`,
    speak: [{ word: example.first.word }, 'goes with', { word: example.second.word }, '.', { word: target.first.word }, 'goes with what?'],
  };
}

function analogyExplanation(example: AnalogyPair, target: AnalogyPair): Explanation {
  return { speak: [example.why, target.why], steps: [example.why, target.why], visual: row(groupPicture(target.first), groupPicture(target.second)) };
}

function pictureAnalogy(level: Level, rng: Rng): QuestionDraft {
  const target = rng.pick(ANALOGY_PAIRS);
  const sameRelation = ANALOGY_PAIRS.filter((pair) => pair.relation === target.relation && pair !== target);
  const example = rng.pick(sameRelation);
  // Level 2: the other second halves of the same relation, the example's among them.
  const clashes = (pair: AnalogyPair): boolean => ANALOGY_CLASHES.some(([first, second]) => first === target.first.word && second === pair.second.word);
  const wrong = level === 1 ? rng.sample(ANALOGY_PAIRS.filter((pair) => pair.relation !== target.relation && !clashes(pair)), 2) : sameRelation;
  const options = rng.shuffle([target, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: target.first.word, relation: 'analogyPair', example: [example.first.word, example.second.word], options: options.map((pair) => pair.second.word) },
    prompt: analogyPrompt(example, target),
    stimulus: { kind: 'matrix', cells: [groupPicture(example.first), groupPicture(example.second), groupPicture(target.first), 'blank'] },
    options: options.map((pair) => groupPicture(pair.second)),
    answerIndex: options.indexOf(target),
    explanation: analogyExplanation(example, target),
  };
}

const pairOf = (first: string): AnalogyPair => ANALOGY_PAIRS.find((pair) => pair.first.word === first) as AnalogyPair;

function analogyLesson(): LessonStep[] {
  const [sock, glove, bee, cow] = [pairOf('sock'), pairOf('glove'), pairOf('bee'), pairOf('cow')];
  return [
    { beat: 'see', text: 'Some things go together. A sock goes on a foot.', speak: ['Some things go together.', sock.why], visual: row(groupPicture(sock.first), groupPicture(sock.second)) },
    {
      beat: 'watch',
      text: `${analogyPrompt(sock, glove).text} ${analogyExplanation(sock, glove).steps.join(' ')}`,
      speak: [...analogyPrompt(sock, glove).speak, ...analogyExplanation(sock, glove).speak],
      visual: { kind: 'matrix', cells: [groupPicture(sock.first), groupPicture(sock.second), groupPicture(glove.first), groupPicture(glove.second)] },
    },
    {
      beat: 'try',
      text: analogyPrompt(bee, cow).text,
      speak: analogyPrompt(bee, cow).speak,
      visual: { kind: 'matrix', cells: [groupPicture(bee.first), groupPicture(bee.second), groupPicture(cow.first), 'blank'] },
      reveal: { text: analogyExplanation(bee, cow).steps.join(' '), speak: analogyExplanation(bee, cow).speak, visual: analogyExplanation(bee, cow).visual },
    },
    { beat: 'remember', text: 'Find how the first two go together.', speak: ['Find how the first two go together.'], visual: row(groupPicture(sock.first), groupPicture(sock.second)) },
  ];
}

export const pictureAnalogiesGenerator: SkillGenerator = {
  skillId: 'R-A9',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['analogies'],
  generate: pictureAnalogy,
  exampleSeed: 89,
  example: () => pictureAnalogy(1, makeRng(89)),
  lesson: analogyLesson,
  oracle: 'wordSet',
};

// ---- A.14 Picture riddles ----
// Levels: spoken riddle with 2 pictures / 3 pictures.

function riddleExplanation(riddle: Riddle): Explanation {
  return {
    speak: ['The', { word: riddle.word }, `is the one that ${riddle.fact}.`],
    steps: [`The ${riddle.word} is the one that ${riddle.fact}.`],
    visual: groupPicture(riddle),
  };
}

function pictureRiddle(level: Level, rng: Rng): QuestionDraft {
  const riddle = rng.pick(RIDDLES);
  const wrong = rng.sample(RIDDLES.filter((other) => other !== riddle), level === 1 ? 1 : 2);
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
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['riddles'],
  generate: pictureRiddle,
  exampleSeed: 94,
  example: () => pictureRiddle(1, makeRng(94)),
  lesson: riddleLesson,
  oracle: 'wordSet',
};
