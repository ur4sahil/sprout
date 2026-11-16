import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, ShapeName, Visual } from '../../../../engine/types';
import type { GroupWord, WordGroup } from '../../../data/categories';
import { GROUP_WORDS, groupsClash, wordClashesWithGroup } from '../../../data/categories';
import type { ColorName } from '../../../data/colors';
import { COLOR_NAMES } from '../../../data/colors';
import { OPPOSITE_PAIRS, SIZE_PAIR } from '../../../data/opposites';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from './parts';
import { cap, pickApart, picture, row } from './parts';

// Language Arts pre-K C.1 and C.2. Oracle: wordSet.

// ---- C.1 Word groups ----
// Levels: "Which one is an animal?" 2 pictures / 3 pictures / mixed groups.

// How each group is asked for. "Things" is never asked for: everything is a thing.
const ONE_OF: Partial<Record<WordGroup, string>> = {
  animals: 'an animal',
  food: 'a food',
  vehicles: 'a vehicle',
  clothes: 'a piece of clothing',
  plants: 'a plant',
  people: 'a person',
};
const FIRST_GROUPS: WordGroup[] = ['animals', 'food', 'vehicles', 'clothes'];
const ALL_ASKED = Object.keys(ONE_OF) as WordGroup[];

const groupPicture = (entry: GroupWord): Visual => picture(entry.word, entry.emoji);

function groupPrompt(group: WordGroup): { text: string; speak: Say } {
  const text = `Which one is ${ONE_OF[group]}?`;
  return { text, speak: [text] };
}

function groupExplanation(answer: GroupWord): Explanation {
  return {
    speak: [`This one is ${ONE_OF[answer.group]}.`, { word: answer.word }, '.'],
    steps: [`This one is ${ONE_OF[answer.group]}: ${answer.word}.`],
    visual: groupPicture(answer),
  };
}

// May this word stand beside that group in one question?
const canMeet = (entry: GroupWord, group: WordGroup): boolean => entry.group !== group && !groupsClash(entry.group, group) && !wordClashesWithGroup(entry.word, group);

function wordGroups(level: Level, rng: Rng): QuestionDraft {
  const group = rng.pick(level === 3 ? ALL_ASKED : FIRST_GROUPS);
  // Fish is never offered against food, whichever of the two is the answer.
  const answer = rng.pick(GROUP_WORDS.filter((entry) => entry.group === group));
  const allowed = GROUP_WORDS.filter((entry) => canMeet(entry, group) && !(answer.word === 'fish' && entry.group === 'food'));
  let wrong: GroupWord[];
  if (level === 1) wrong = [rng.pick(allowed.filter((entry) => FIRST_GROUPS.includes(entry.group)))];
  else if (level === 2) {
    // Both wrong pictures come from one other group, so the answer is the one that does not fit with them.
    const other = rng.pick(FIRST_GROUPS.filter((candidate) => allowed.some((entry) => entry.group === candidate)));
    wrong = rng.sample(allowed.filter((entry) => entry.group === other), 2);
  } else {
    // Mixed: the wrong pictures come from two different groups that may meet each other.
    wrong = pickApart(allowed, 2, rng, (entry, picked) => picked.every((taken) => taken.group !== entry.group && !groupsClash(taken.group, entry.group) && !wordClashesWithGroup(taken.word, entry.group) && !wordClashesWithGroup(entry.word, taken.group)));
  }
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: group, relation: 'category', answer: answer.word, options: options.map((entry) => entry.word) },
    prompt: groupPrompt(group),
    options: options.map(groupPicture),
    answerIndex: options.indexOf(answer),
    explanation: groupExplanation(answer),
  };
}

const groupWord = (word: string): GroupWord => GROUP_WORDS.find((entry) => entry.word === word) as GroupWord;

function wordGroupsLesson(): LessonStep[] {
  return [
    {
      beat: 'see',
      text: 'Some things go together. A cat and a dog are both animals.',
      speak: ['Some things go together. A', { word: 'cat' }, 'and a', { word: 'dog' }, 'are both animals.'],
      visual: row(groupPicture(groupWord('cat')), groupPicture(groupWord('dog'))),
    },
    {
      beat: 'watch',
      text: `${groupPrompt('animals').text} ${groupExplanation(groupWord('frog')).steps.join(' ')}`,
      speak: [...groupPrompt('animals').speak, ...groupExplanation(groupWord('frog')).speak],
      visual: row(groupPicture(groupWord('car')), groupPicture(groupWord('frog'))),
    },
    {
      beat: 'try',
      text: groupPrompt('food').text,
      speak: groupPrompt('food').speak,
      visual: row(groupPicture(groupWord('banana')), groupPicture(groupWord('bus'))),
      reveal: { text: groupExplanation(groupWord('banana')).steps.join(' '), speak: groupExplanation(groupWord('banana')).speak, visual: groupPicture(groupWord('banana')) },
    },
    { beat: 'remember', text: 'Things in a group share something.', speak: ['Things in a group share something.'], visual: row(groupPicture(groupWord('cat')), groupPicture(groupWord('dog')), groupPicture(groupWord('frog'))) },
  ];
}

export const wordGroupsGenerator: SkillGenerator = {
  skillId: 'E-PK-C1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['categories'],
  generate: wordGroups,
  exampleSeed: 71,
  example: () => wordGroups(1, makeRng(71)),
  lesson: wordGroupsLesson,
  oracle: 'wordSet',
};

// ---- C.2 Opposites ----
// Levels: spoken pairs with pictures: big and small / hot and cold, day and night / all the pairs.

interface Quality {
  word: string;
  visual: Visual; // a picture that says the word when tapped
}

const EMOJI_QUALITIES: readonly (readonly [Quality, Quality])[] = OPPOSITE_PAIRS.map(([one, two]) => [
  { word: one.word, visual: picture(one.word, one.emoji) },
  { word: two.word, visual: picture(two.word, two.emoji) },
]);

const SIZE_SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart'];

// Big and small, drawn as one shape at two sizes.
function sizeQualities(shape: ShapeName, color: ColorName): [Quality, Quality] {
  const drawn = (word: string, size: 's' | 'l'): Quality => ({ word, visual: { kind: 'shape', shape, color, size, rotation: 0, speak: [{ word }] } });
  return [drawn(SIZE_PAIR[0], 'l'), drawn(SIZE_PAIR[1], 's')];
}

function oppositePrompt(word: string): { text: string; speak: Say } {
  return { text: `Which one is the opposite of ${word}?`, speak: ['Which one is the opposite of', { word }, '?'] };
}

function oppositeExplanation(target: Quality, answer: Quality): Explanation {
  return {
    speak: [{ word: target.word }, 'and', { word: answer.word }, 'are opposites.'],
    steps: [`${cap(target.word)} and ${answer.word} are opposites.`],
    visual: row(target.visual, answer.visual),
  };
}

// Words from other pairs, never both halves of one pair.
function fromOtherPairs(pair: readonly [Quality, Quality], count: number, rng: Rng): Quality[] {
  return rng.sample(EMOJI_QUALITIES.filter((candidate) => candidate[0].word !== pair[0].word), count).map((candidate) => rng.pick(candidate));
}

function oppositeQuestion(target: Quality, answer: Quality, wrong: Quality[], extra: Record<string, string>, rng: Rng): QuestionDraft {
  const options = rng.shuffle([answer, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: target.word, relation: 'opposite', ...extra, options: options.map((option) => option.word) },
    prompt: oppositePrompt(target.word),
    stimulus: target.visual,
    options: options.map((option) => option.visual),
    answerIndex: options.indexOf(answer),
    explanation: oppositeExplanation(target, answer),
  };
}

function emojiQuestion(pair: readonly [Quality, Quality], rng: Rng): QuestionDraft {
  const [target, answer] = rng.shuffle(pair) as [Quality, Quality];
  return oppositeQuestion(target, answer, fromOtherPairs(pair, 2, rng), {}, rng);
}

// Big and small. One wrong option is another shape of the same size as the one shown: for
// "the opposite of big" it is something else big. With three options, the third is a word from another pair.
function sizeQuestion(options: 2 | 3, rng: Rng): QuestionDraft {
  const [shape, otherShape] = rng.sample(SIZE_SHAPES, 2) as [ShapeName, ShapeName];
  const color = rng.pick(COLOR_NAMES);
  const pair = sizeQualities(shape, color);
  const flip = rng.bool();
  const target = pair[flip ? 1 : 0];
  const answer = pair[flip ? 0 : 1];
  const sameSize = sizeQualities(otherShape, color)[flip ? 1 : 0];
  const wrong = options === 2 ? [sameSize] : [sameSize, ...fromOtherPairs(pair, 1, rng)];
  return oppositeQuestion(target, answer, wrong, { shape, otherShape, color }, rng);
}

function opposites(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) return sizeQuestion(2, rng);
  if (level === 2) return emojiQuestion(rng.pick(EMOJI_QUALITIES.slice(0, 2)), rng);
  // Every pair, with big and small as one of them.
  const which = rng.int(0, EMOJI_QUALITIES.length);
  return which === EMOJI_QUALITIES.length ? sizeQuestion(3, rng) : emojiQuestion(EMOJI_QUALITIES[which] as readonly [Quality, Quality], rng);
}

function oppositesLesson(): LessonStep[] {
  const [big, small] = sizeQualities('circle', 'blue');
  const [hot, cold] = EMOJI_QUALITIES[0] as readonly [Quality, Quality];
  const [day, night] = EMOJI_QUALITIES[1] as readonly [Quality, Quality];
  return [
    { beat: 'see', text: 'Opposites are as different as can be. Big and small are opposites.', speak: ['Opposites are as different as can be.', ...oppositeExplanation(big, small).speak], visual: row(big.visual, small.visual) },
    { beat: 'watch', text: `${oppositePrompt('hot').text} ${oppositeExplanation(hot, cold).steps.join(' ')}`, speak: [...oppositePrompt('hot').speak, ...oppositeExplanation(hot, cold).speak], visual: row(hot.visual, cold.visual) },
    {
      beat: 'try',
      text: oppositePrompt('day').text,
      speak: oppositePrompt('day').speak,
      visual: row(cold.visual, night.visual),
      reveal: { text: oppositeExplanation(day, night).steps.join(' '), speak: oppositeExplanation(day, night).speak, visual: row(day.visual, night.visual) },
    },
    { beat: 'remember', text: 'Opposites are as different as can be.', speak: ['Opposites are as different as can be.'], visual: row(big.visual, small.visual) },
  ];
}

export const oppositesGenerator: SkillGenerator = {
  skillId: 'E-PK-C2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['opposites', 'colors'],
  pool: { 2: 4 }, // hot, cold, day and night
  generate: opposites,
  exampleSeed: 72,
  example: () => opposites(1, makeRng(72)),
  lesson: oppositesLesson,
  oracle: 'wordSet',
};
