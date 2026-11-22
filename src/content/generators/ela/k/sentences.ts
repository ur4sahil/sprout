import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, SortBin, Visual } from '../../../../engine/types';
import type { GroupWord, WordGroup } from '../../../data/categories';
import { GROUP_WORDS } from '../../../data/categories';
import type { Countable } from '../../../data/countables';
import { COUNTABLES } from '../../../data/countables';
import type { SentencePicture } from '../../../data/sentencePictures';
import { SENTENCE_PICTURES } from '../../../data/sentencePictures';
import { TELLING } from '../../../data/sentences';
import type { SkillGenerator } from '../../../generator';
import { a, cap, picture, row } from '../pk/parts';
import type { Told } from '../pk/h3-parts';
import { line, spoken, working } from '../pk/h3-parts';

// Language Arts kindergarten D.1 to D.3 and E.1.

const text = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });
const textSaid = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size, speak: [{ word: value }] });

// ---- D.1 Capitals and periods ----
// Family: Capitals and periods. Oracle: sentence.
// Levels: capital / period / both. Built from the telling sentences.

const lowered = (sentence: string): string => sentence.charAt(0).toLowerCase() + sentence.slice(1);
const noPeriod = (sentence: string): string => sentence.slice(0, -1);
// The same task as D.4 (names), worded the same way.
const CORRECT = 'Which one is written the right way?';
const RULE = 'A sentence starts with a capital letter and ends with a period.';
const ASKS = ['capital', 'period', 'both'] as const;
// Every way of writing it says the same words aloud.
const written = (shown: string, sentence: string): Visual => ({ kind: 'text', value: shown, size: 'm', speak: [sentence] });

// The steps point at the rule the wrong ones break: the capital (level 1), the period (level 2) or both (level 3).
function capitalsExplanation(level: Level, sentence: string): Told {
  const steps =
    level === 1
      ? [line('Look at the first letter of each one.'), line('A sentence starts with a capital letter.'), line(sentence)]
      : level === 2
        ? [line('Look at the end of each one.'), line('A sentence ends with a period.'), line(sentence)]
        : [line('A sentence starts with a capital letter.'), line('It ends with a period.'), line(`Only one has both: ${sentence}`)];
  const hint = level === 1 ? 'Check how each sentence starts.' : level === 2 ? 'Check how each sentence ends.' : 'Check how each sentence starts and how it ends.';
  return working(steps, written(sentence, sentence), line(hint));
}

function capitals(level: Level, rng: Rng): QuestionDraft {
  const sentence = rng.pick(TELLING);
  // Level 3 offers two of the three wrong ways: no capital, no period, or neither. Never more than three options.
  const wrong = level === 1 ? [lowered(sentence)] : level === 2 ? [noPeriod(sentence)] : rng.sample([lowered(sentence), noPeriod(sentence), lowered(noPeriod(sentence))], 2);
  const options = rng.shuffle([sentence, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { base: noPeriod(sentence).toLowerCase(), ask: ASKS[level - 1] as string, options },
    prompt: { text: CORRECT, speak: [CORRECT] },
    options: options.map((each) => written(each, sentence)),
    answerIndex: options.indexOf(sentence),
    explanation: capitalsExplanation(level, sentence),
  };
}

export const capitalsGenerator: SkillGenerator = {
  skillId: 'E-K-D1',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['sentences'],
  generate: capitals,
  exampleSeed: 331,
  example: () => capitals(1, makeRng(331)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A sentence tells a whole idea. It starts with a capital letter.', speak: ['A sentence tells a whole idea. It starts with a capital letter.'], visual: written('The cat is big.', 'The cat is big.') },
    { beat: 'watch', text: 'The sentence ends with a period. A period is a small dot.', speak: ['The sentence ends with a period. A period is a small dot.'], visual: written('We can run.', 'We can run.') },
    { beat: 'try', text: CORRECT, speak: [CORRECT], visual: row(written('the sun is hot.', 'The sun is hot.'), written('The sun is hot.', 'The sun is hot.')), reveal: { text: RULE, speak: [RULE], visual: written('The sun is hot.', 'The sun is hot.') } },
    { beat: 'remember', text: 'Capital at the start, period at the end.', speak: ['Capital at the start, period at the end.'], visual: written('The cat is big.', 'The cat is big.') },
  ],
  oracle: 'sentence',
};

// ---- D.2 Naming words ----
// Family: Naming, action and describing words. Oracle: sortBy.
// Levels: sort pictures with words into people, animals, things: 4 items / 6 items.

const NAMING: WordGroup[] = ['people', 'animals', 'things'];
const NAMING_BINS: SortBin[] = [
  { label: 'People', speak: ['People'] },
  { label: 'Animals', speak: ['Animals'] },
  { label: 'Things', speak: ['Things'] },
];
const KIND_OF: Record<string, string> = { people: 'a person', animals: 'an animal', things: 'a thing' };
const GROUP = 'Put each word in its group.';
// A picture with its word written beside it. The word is said when the card is tapped.
const named = (entry: GroupWord): Visual => ({ kind: 'row', children: [{ kind: 'emojiGroup', emoji: entry.emoji, count: 1, layout: 'row' }, text(entry.word, 'm')], speak: [{ word: entry.word }] });
const inGroup = (group: WordGroup): GroupWord[] => GROUP_WORDS.filter((entry) => entry.group === group);

// A sort has no step to nudge with (its steps list the groups), so its hint is a way to work.
const NAMING_HINT = { text: 'Look at each picture. Is it a person, an animal or a thing?' };

function namingExplanation(items: GroupWord[]): Told {
  // One example from each group.
  const examples = NAMING.map((group) => items.find((entry) => entry.group === group) as GroupWord);
  return {
    speak: examples.flatMap((entry): Say => [`${cap(a(entry.word).split(' ')[0] as string)}`, { word: entry.word }, `is ${KIND_OF[entry.group]}.`]),
    steps: examples.map((entry) => `${cap(a(entry.word))} is ${KIND_OF[entry.group]}.`),
    visual: row(...examples.map(named)),
    hint: NAMING_HINT,
  };
}

function namingWords(level: Level, rng: Rng): QuestionDraft {
  // Every group gets at least one. Level 1 has one more from any group. Level 2 has two from each.
  const picked = NAMING.flatMap((group) => rng.sample(inGroup(group), level === 1 ? 1 : 2));
  if (level === 1) picked.push(rng.pick(GROUP_WORDS.filter((entry) => NAMING.includes(entry.group) && !picked.includes(entry))));
  const items = rng.shuffle(picked);
  const itemAttrs = items.map((entry) => entry.group as string);
  return {
    type: 'sort',
    mode: 'look',
    facts: { itemAttrs, binAttrs: [...NAMING], items: items.map((entry) => entry.word) },
    prompt: { text: GROUP, speak: [GROUP] },
    items: items.map(named),
    bins: NAMING_BINS,
    answerBin: itemAttrs.map((group) => NAMING.indexOf(group as WordGroup)),
    explanation: namingExplanation(items),
  };
}

const group = (value: string): GroupWord => GROUP_WORDS.find((entry) => entry.word === value) as GroupWord;

export const namingWordsGenerator: SkillGenerator = {
  skillId: 'E-K-D2',
  maxLevel: 2,
  itemTypes: ['sort'],
  lists: ['categories'],
  generate: namingWords,
  exampleSeed: 332,
  example: () => namingWords(1, makeRng(332)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A naming word is the name of a person, an animal or a thing.', speak: ['A naming word is the name of a person, an animal or a thing.'], visual: row(named(group('girl')), named(group('dog')), named(group('cup'))) },
    { beat: 'watch', text: namingExplanation([group('girl'), group('dog'), group('cup')]).steps.join(' '), speak: namingExplanation([group('girl'), group('dog'), group('cup')]).speak, visual: row(named(group('girl')), named(group('dog')), named(group('cup'))) },
    { beat: 'try', text: 'Is a baby a person, an animal or a thing?', speak: ['Is a', { word: 'baby' }, 'a person, an animal or a thing?'], visual: named(group('baby')), reveal: { text: 'A baby is a person.', speak: ['A', { word: 'baby' }, 'is a person.'], visual: named(group('baby')) } },
    { beat: 'remember', text: 'Naming words are people, animals and things.', speak: ['Naming words are people, animals and things.'], visual: row(named(group('girl')), named(group('dog')), named(group('cup'))) },
  ],
  oracle: 'sortBy',
};

// ---- D.3 One and more than one ----
// Family: One and more than one. Oracle: wordSet.
// Levels: picture of one or many, pick cat or cats / written only.
// Only words that add an s: fish is the same for one and many, and strawberry changes its ending.

const ADDS_S: readonly Countable[] = COUNTABLES.filter((thing) => thing.many === `${thing.one}s`);
const MATCHES = 'Which word matches the picture?';
const group1 = (thing: Countable, count: number): Visual => ({ kind: 'emojiGroup', emoji: thing.emoji, count, layout: 'row' });

function countExplanation(thing: Countable, many: boolean, count: number): Told {
  const said = many ? thing.many : thing.one;
  const first = many ? 'There is more than one.' : 'There is just one.';
  return { speak: [first, 'We say', { word: said }, '.'], steps: [first, `We say ${said}.`], visual: row(group1(thing, count), textSaid(said)), hint: { text: 'Count the pictures. Is there one, or more than one?' } };
}

// With no picture, the step points at what in the word means more than one: the s at its end. The letter, not a
// sound: the s of ducks says /s/, but the s of frogs says /z/.
function writtenExplanation(thing: Countable, many: boolean): Told {
  const s = { letter: 's' };
  const steps = many
    ? [spoken(`${cap(thing.many)} ends with the letter s.`, [{ word: thing.many }, 'ends with the letter', s, '.']), spoken(`The s means more than one ${thing.one}.`, ['The', s, 'means more than one', { word: thing.one }, '.'])]
    : [spoken(`${cap(thing.one)} has no s at the end.`, [{ word: thing.one }, 'has no', s, 'at the end.']), spoken(`It means just one ${thing.one}.`, ['It means just one', { word: thing.one }, '.'])];
  // A read hint never says the words to read.
  return working(steps, row(group1(thing, many ? 3 : 1), textSaid(many ? thing.many : thing.one)), line('Look at the end of each word.'));
}

function oneOrMany(level: Level, rng: Rng): QuestionDraft {
  const thing = rng.pick(ADDS_S);
  const many = rng.bool();
  const count = many ? rng.int(2, 4) : 1;
  const options = rng.shuffle([thing.one, thing.many]);
  const answer = many ? thing.many : thing.one;
  const facts = { target: thing.one, relation: 'plural', many, options };
  if (level === 1) {
    // The picture is not named aloud: the two words are, when tapped.
    return { type: 'choice', mode: 'look', facts: { ...facts, count }, prompt: { text: MATCHES, speak: [MATCHES] }, stimulus: group1(thing, count), options: options.map((each) => textSaid(each)), answerIndex: options.indexOf(answer), explanation: countExplanation(thing, many, count) };
  }
  // Written only: no picture, and the words are read, not heard.
  const prompt = many ? 'Which word means more than one?' : 'Which word means just one?';
  return { type: 'choice', mode: 'read', facts: { ...facts, read: [thing.one, thing.many] }, prompt: { text: prompt, speak: [prompt] }, options: options.map((each) => text(each)), answerIndex: options.indexOf(answer), explanation: writtenExplanation(thing, many) };
}

const BALL = COUNTABLES.find((thing) => thing.one === 'ball') as Countable;
const FROG = COUNTABLES.find((thing) => thing.one === 'frog') as Countable;

export const oneOrManyGenerator: SkillGenerator = {
  skillId: 'E-K-D3',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['countables'],
  generate: oneOrMany,
  exampleSeed: 333,
  example: () => oneOrMany(1, makeRng(333)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'One ball. Two balls. The word changes when there is more than one.', speak: ['One', { word: 'ball' }, '. Two', { word: 'balls' }, '. The word changes when there is more than one.'], visual: row(group1(BALL, 1), group1(BALL, 2)) },
    { beat: 'watch', text: countExplanation(BALL, true, 3).steps.join(' '), speak: countExplanation(BALL, true, 3).speak, visual: countExplanation(BALL, true, 3).visual },
    { beat: 'try', text: MATCHES, speak: [MATCHES], visual: row(group1(FROG, 1), textSaid('frog'), textSaid('frogs')), reveal: { text: countExplanation(FROG, false, 1).steps.join(' '), speak: countExplanation(FROG, false, 1).speak, visual: countExplanation(FROG, false, 1).visual } },
    { beat: 'remember', text: 'Add s for more than one.', speak: ['Add', { letter: 's' }, 'for more than one.'], visual: row(textSaid('ball'), textSaid('balls')) },
  ],
  oracle: 'wordSet',
};

// ---- E.1 Read a sentence ----
// Family: Read a sentence. Oracle: wordSet.
// Levels: a sentence from the sentence-picture list, pick the matching picture: 2 options / 3 options.

const WHICH_PICTURE = 'Which picture matches the sentence?';
const shown = (entry: SentencePicture): Visual => picture(entry.word, entry.emoji);

// "The sentence has the word bed. The picture shows a bed.": the sentence says more than "bed", and a picture has
// no words. Shared with E.6.
export const seen = (word: string): string => (word === 'sun' ? 'the sun' : a(word));

function sentenceExplanation(entry: SentencePicture): Told {
  return working(
    [line(`The sentence has the word ${entry.word}.`), line(`The picture shows ${seen(entry.word)}.`)],
    row(text(entry.sentence, 'm'), shown(entry)),
    // A read hint never says the words to read.
    line('Read each word of the sentence. Which word names a picture?'),
  );
}

function readSentence(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(SENTENCE_PICTURES);
  // The wrong pictures are the answers to other sentences on the list.
  const others = rng.sample(SENTENCE_PICTURES.filter((each) => each !== entry), level === 1 ? 1 : 2);
  const options = rng.shuffle([entry, ...others]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { target: entry.sentence, relation: 'sentencePicture', read: [entry.sentence], options: options.map((each) => each.word) },
    prompt: { text: WHICH_PICTURE, speak: [WHICH_PICTURE] },
    stimulus: text(entry.sentence, 'l'),
    options: options.map(shown),
    answerIndex: options.indexOf(entry),
    explanation: sentenceExplanation(entry),
  };
}

const CAT = SENTENCE_PICTURES[0] as SentencePicture;
const DOG = SENTENCE_PICTURES[4] as SentencePicture;

export const readSentenceGenerator: SkillGenerator = {
  skillId: 'E-K-E1',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['sentencePictures'],
  generate: readSentence,
  exampleSeed: 341,
  example: () => readSentence(1, makeRng(341)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A sentence is made of words. Read each word from left to right.', speak: ['A sentence is made of words. Read each word from left to right.'], visual: text(CAT.sentence, 'l') },
    { beat: 'watch', text: `${CAT.sentence} ${sentenceExplanation(CAT).steps.join(' ')}`, speak: [CAT.sentence, ...sentenceExplanation(CAT).speak], visual: sentenceExplanation(CAT).visual },
    { beat: 'try', text: WHICH_PICTURE, speak: [WHICH_PICTURE], visual: row(text(DOG.sentence, 'm'), shown(CAT), shown(DOG)), reveal: { text: sentenceExplanation(DOG).steps.join(' '), speak: sentenceExplanation(DOG).speak, visual: sentenceExplanation(DOG).visual } },
    { beat: 'remember', text: 'Read every word.', speak: ['Read every word.'], visual: text(CAT.sentence, 'l') },
  ],
  oracle: 'wordSet',
};
