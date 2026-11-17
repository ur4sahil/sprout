import readingStories from '../../../banks/readingStories.json';
import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, Say, SortBin, Visual } from '../../../../engine/types';
import type { DescribingSentence } from '../../../data/describing';
import { DESCRIBING_SENTENCES } from '../../../data/describing';
import { DESCRIBING_PICTURES, NOUNS, VERBS } from '../../../data/phonics1';
import { ASKING, SHOUTING, TELLING } from '../../../data/sentences';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from '../pk/parts';
import { cap, pickApart, row } from '../pk/parts';

// Language Arts grade 1 C.1 to C.3 and D.1.

const text = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });
const wordSaid = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size, speak: [{ word: value }] });
const silent = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });

// ---- C.1 Naming and action words ----
// Family: Naming, action and describing words. Oracle: sortBy. Levels: sort 4 words / 6 words.

const WORD_BINS: SortBin[] = [
  { label: 'Naming words', speak: ['Naming words'] },
  { label: 'Action words', speak: ['Action words'] },
];
const KINDS = ['noun', 'verb'];
const GROUP = 'Put each word in its group.';

function nounsAndVerbs(level: Level, rng: Rng): QuestionDraft {
  const each = level === 1 ? 2 : 3;
  const nouns = rng.sample(NOUNS, each);
  const verbs = rng.sample(VERBS, each);
  const words = rng.shuffle([...nouns, ...verbs]);
  const itemAttrs = words.map((value) => (nouns.includes(value) ? 'noun' : 'verb'));
  const [noun, verb] = [nouns[0] as string, verbs[0] as string];
  return {
    type: 'sort',
    mode: 'look',
    facts: { itemAttrs, binAttrs: KINDS, items: words },
    prompt: { text: GROUP, speak: [GROUP] },
    items: words.map((value) => wordSaid(value)),
    bins: WORD_BINS,
    answerBin: itemAttrs.map((attr) => KINDS.indexOf(attr)),
    explanation: { speak: [{ word: noun }, 'names something.', { word: verb }, 'is something you do.'], steps: [`${cap(noun)} names something.`, `${cap(verb)} is something you do.`], visual: row(wordSaid(noun), wordSaid(verb)) },
  };
}

export const nounsAndVerbsGenerator: SkillGenerator = {
  skillId: 'E-1-C1',
  maxLevel: 2,
  itemTypes: ['sort'],
  lists: ['phonics1'],
  generate: nounsAndVerbs,
  exampleSeed: 421,
  example: () => nounsAndVerbs(1, makeRng(421)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A naming word names a person, an animal or a thing. An action word is something you do.', speak: ['A naming word names a person, an animal or a thing. An action word is something you do.'], visual: row(wordSaid('dog'), wordSaid('run')) },
    { beat: 'watch', text: 'Dog names something. Run is something you do.', speak: [{ word: 'dog' }, 'names something.', { word: 'run' }, 'is something you do.'], visual: row(wordSaid('dog'), wordSaid('run')) },
    { beat: 'try', text: 'Is jump a naming word or an action word?', speak: ['Is', { word: 'jump' }, 'a naming word or an action word?'], visual: wordSaid('jump', 'xl'), reveal: { text: 'Jump is something you do. It is an action word.', speak: [{ word: 'jump' }, 'is something you do. It is an action word.'], visual: wordSaid('jump', 'xl') } },
    { beat: 'remember', text: 'Naming words are people, animals and things.', speak: ['Naming words are people, animals and things.'], visual: row(wordSaid('girl'), wordSaid('tree')) },
  ],
  oracle: 'sortBy',
};

// ---- C.2 Describing words ----
// Oracle: wordSet.
// Levels: pick the describing word in a sentence / pick the describing word that fits a picture.

const WHICH_DESCRIBES = 'Which word tells what something is like?';
const FITS = 'Which word fits the picture?';
// Every way of showing the sentence says the same words aloud.
const sentenceSaid = (sentence: string): Visual => ({ kind: 'text', value: sentence, size: 'l', speak: [sentence] });

function describingExplanation(entry: DescribingSentence): Explanation {
  return { speak: [{ word: entry.describing }, 'tells what the', { word: entry.naming }, 'is like.'], steps: [`${cap(entry.describing)} tells what the ${entry.naming} is like.`], visual: sentenceSaid(entry.sentence) };
}

function describing(level: Level, rng: Rng): QuestionDraft {
  if (level === 1) {
    const entry = rng.pick(DESCRIBING_SENTENCES);
    // Three words from the same sentence: the describing word, a naming word and an action word.
    const options = rng.shuffle([entry.describing, entry.naming, entry.action]);
    return {
      type: 'choice',
      mode: 'look',
      facts: { target: entry.sentence, relation: 'describing', options },
      prompt: { text: WHICH_DESCRIBES, speak: [WHICH_DESCRIBES] },
      stimulus: sentenceSaid(entry.sentence),
      options: options.map((each) => wordSaid(each)),
      answerIndex: options.indexOf(entry.describing),
      explanation: describingExplanation(entry),
    };
  }
  // The picture is not named: the three words are, when tapped. Big and tall never meet.
  const entry = rng.pick(DESCRIBING_PICTURES);
  const sizes = ['big', 'tall'];
  const others = pickApart(DESCRIBING_PICTURES, 2, rng, (each, picked) => each !== entry && !(sizes.includes(each.word) && [entry, ...picked].some((other) => sizes.includes(other.word))));
  const options = rng.shuffle([entry, ...others]).map((each) => each.word);
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: entry.word, relation: 'describingPicture', options },
    prompt: { text: FITS, speak: [FITS] },
    stimulus: silent(entry.emoji),
    options: options.map((each) => wordSaid(each)),
    answerIndex: options.indexOf(entry.word),
    explanation: { speak: ['This picture shows something', { word: entry.word }, '.'], steps: [`This picture shows something ${entry.word}.`], visual: row(silent(entry.emoji), wordSaid(entry.word)) },
  };
}

const BIG_DOG = DESCRIBING_SENTENCES[0] as DescribingSentence;
const SOFT_BED = DESCRIBING_SENTENCES[2] as DescribingSentence;

export const describingGenerator: SkillGenerator = {
  skillId: 'E-1-C2',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['describing', 'phonics1'],
  generate: describing,
  exampleSeed: 422,
  example: () => describing(1, makeRng(422)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A describing word tells what something is like: big, red, soft.', speak: ['A describing word tells what something is like:', { word: 'big' }, { word: 'red' }, { word: 'soft' }, '.'], visual: row(wordSaid('big'), wordSaid('red'), wordSaid('soft')) },
    { beat: 'watch', text: `${BIG_DOG.sentence} ${describingExplanation(BIG_DOG).steps.join(' ')}`, speak: [BIG_DOG.sentence, ...describingExplanation(BIG_DOG).speak], visual: sentenceSaid(BIG_DOG.sentence) },
    { beat: 'try', text: WHICH_DESCRIBES, speak: [WHICH_DESCRIBES], visual: sentenceSaid(SOFT_BED.sentence), reveal: { text: describingExplanation(SOFT_BED).steps.join(' '), speak: describingExplanation(SOFT_BED).speak, visual: sentenceSaid(SOFT_BED.sentence) } },
    { beat: 'remember', text: 'Describing words tell what something is like.', speak: ['Describing words tell what something is like.'], visual: row(wordSaid('big'), wordSaid('red'), wordSaid('soft')) },
  ],
  oracle: 'wordSet',
};

// ---- C.3 End marks ----
// Family: End marks. Oracle: sentence.
// Levels: period or question mark / adds exclamation mark / move the mark onto the end (dragWord, added
// Nov 17, 2026). The sentence is shown with its mark taken off.

const MARKS = ['.', '?', '!'] as const;
const MARK_NAME: Record<string, string> = { '.': 'period', '?': 'question mark', '!': 'exclamation mark' };
const MARK_RULE: Record<string, string> = { '.': 'A telling sentence ends with a period.', '?': 'An asking sentence ends with a question mark.', '!': 'A shout ends with an exclamation mark.' };
const WHICH_MARK = 'Which mark goes at the end?';
const mark = (value: string): Visual => ({ kind: 'text', value, size: 'xl', speak: [MARK_NAME[value] as string] });
// The sentence is read aloud when tapped: how it sounds is the clue.
const unmarked = (sentence: string): Visual => ({ kind: 'text', value: sentence.slice(0, -1), size: 'l', speak: [sentence] });

function endMarks(level: Level, rng: Rng): QuestionDraft {
  // Level 2: a shout as often as each of the other two kinds.
  const list = level === 1 ? rng.pick([TELLING, ASKING]) : rng.pick([TELLING, ASKING, SHOUTING]);
  const sentence = rng.pick(list);
  const values = level === 1 ? MARKS.slice(0, 2) : [...MARKS];
  const answer = sentence.slice(-1);
  if (level === 3) {
    const prompt = 'Move the right mark to the end of the sentence.';
    return {
      type: 'dragWord',
      mode: 'look',
      facts: { base: sentence.slice(0, -1).toLowerCase(), ask: 'endMark', options: [...values] },
      prompt: { text: prompt, speak: [prompt, sentence] },
      before: sentence.slice(0, -1),
      after: '',
      options: values.map(mark),
      answerIndex: values.indexOf(answer as (typeof MARKS)[number]),
      explanation: { speak: [MARK_RULE[answer] as string], steps: [MARK_RULE[answer] as string], visual: text(sentence, 'l') },
    };
  }
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { base: sentence.slice(0, -1).toLowerCase(), ask: 'endMark', options: [...values] },
    prompt: { text: WHICH_MARK, speak: [WHICH_MARK] },
    stimulus: unmarked(sentence),
    options: values.map(mark),
    answerIndex: values.indexOf(answer as (typeof MARKS)[number]),
    explanation: { speak: [MARK_RULE[answer] as string], steps: [MARK_RULE[answer] as string], visual: text(sentence, 'l') },
  };
}

export const endMarksGenerator: SkillGenerator = {
  skillId: 'E-1-C3',
  maxLevel: 3,
  itemTypes: ['choice', 'dragWord'],
  lists: ['sentences'],
  generate: endMarks,
  exampleSeed: 423,
  example: () => endMarks(1, makeRng(423)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Every sentence ends with a mark. A telling sentence ends with a period.', speak: ['Every sentence ends with a mark. A telling sentence ends with a period.'], visual: text('The sun is hot.', 'l') },
    { beat: 'watch', text: 'An asking sentence ends with a question mark.', speak: ['An asking sentence ends with a question mark.'], visual: text('Is the sun hot?', 'l') },
    { beat: 'try', text: WHICH_MARK, speak: [WHICH_MARK], visual: unmarked('Can we go?'), reveal: { text: MARK_RULE['?'] as string, speak: [MARK_RULE['?'] as string], visual: text('Can we go?', 'l') } },
    { beat: 'remember', text: 'Asking sentences end with a question mark.', speak: ['Asking sentences end with a question mark.'], visual: text('Is it a bug?', 'l') },
  ],
  oracle: 'sentence',
};

// ---- D.1 Read a short story ----
// Family: Read a story. Oracle: authored (the review sheet covers it).
// Levels: 3-sentence story, who or what question / why or how question.
// The stories are an authored bank. The story is not read aloud. The question is.

type Authored = QuestionDraft & { level: number };
const STORIES = readingStories as unknown as Authored[];

function readStory(level: Level, rng: Rng): QuestionDraft {
  // A copy of the banked question, without the two fields the registry stamps on itself.
  const draft = structuredClone(rng.pick(STORIES.filter((each) => each.level === level))) as Partial<Authored> & { skillId?: string };
  delete draft.level;
  delete draft.skillId;
  return draft as QuestionDraft;
}

const firstStory = STORIES[0] as Authored;
const storyText = (firstStory.stimulus as Extract<Visual, { kind: 'text' }>).value;
const LOOK_BACK: Say = ['Read the story. Then read the question. Look back at the story to find the answer.'];

export const readStoryGenerator: SkillGenerator = {
  skillId: 'E-1-D1',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  generate: readStory,
  exampleSeed: 431,
  example: () => readStory(1, makeRng(431)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: LOOK_BACK[0] as string, speak: LOOK_BACK, visual: text(storyText, 'm') },
    { beat: 'watch', text: `${firstStory.prompt.text} ${firstStory.explanation.steps.join(' ')}`, speak: [...firstStory.prompt.speak, ...firstStory.explanation.speak], visual: text(storyText, 'm') },
    { beat: 'try', text: 'Why does Sam give the hat away?', speak: ['Why does Sam give the hat away?'], visual: text(storyText, 'm'), reveal: { text: 'The story says: The hat is too big.', speak: ['The story says:', 'The hat is too big.'], visual: text('The hat is too big.', 'm') } },
    { beat: 'remember', text: 'Look back at the story.', speak: ['Look back at the story.'], visual: text(storyText, 'm') },
  ],
  oracle: 'authored',
};
