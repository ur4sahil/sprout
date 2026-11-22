import type { Rng } from '../../../engine/rng';
import { makeRng } from '../../../engine/rng';
import type { Hint, LessonStep, Level, QuestionDraft, Visual } from '../../../engine/types';
import type { PictureAnswer, Pick3 } from '../../banks/comprehension';
import { CONTEXT_WORDS, G1_FACTS, G1_STORIES, G2_FACTS, K_FACTS, K_STORIES } from '../../banks/comprehension';
import type { Story2 } from '../../banks/reading2';
import { STORIES_2 } from '../../banks/reading2';
import type { SkillGenerator } from '../../generator';
import { hint } from './g1/wording';

// Reading comprehension added by the Nov 17, 2026 curriculum check (plan section 8): Kindergarten E.2 and
// E.3 (heard), grade 1 D.2 to D.5 and grade 2 D.4 to D.6 (read). All from the authored bank in
// banks/comprehension.ts. Oracle: authored, as for every banked question.

const plain = (value: string, size: 'm' | 'l' = 'm'): Visual => ({ kind: 'text', value, size });
const pic = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });

// ---- Kindergarten: the story or fact text is heard, the answer is a picture. ----

function heard(id: string, text: string, q: PictureAnswer, intro: string, rng: Rng): QuestionDraft {
  const order = rng.shuffle([0, 1, 2]);
  const right = q.answers[0];
  return {
    type: 'choice',
    mode: 'listen',
    facts: { id, target: right.name },
    prompt: { text: `${intro} ${q.ask}`, speak: [intro, ...text.split(/(?<=\.)\s+/), q.ask] },
    options: order.map((i) => pic(q.answers[i]?.emoji as string)),
    answerIndex: order.indexOf(0),
    explanation: { speak: ['Listen again.', text], steps: [text], visual: pic(right.emoji) },
  };
}

function kStory(level: Level, rng: Rng): QuestionDraft {
  const story = rng.pick(K_STORIES);
  return heard(`${story.id}-${level === 1 ? 'who' : 'where'}`, story.text, level === 1 ? story.who : story.where, 'Listen to the story.', rng);
}

export const kCharactersGenerator: SkillGenerator = {
  skillId: 'E-K-E2',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 8, 2: 8 },
  generate: kStory,
  exampleSeed: 671,
  example: () => kStory(1, makeRng(671)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Stories have characters, the people or animals in them, and a setting, where they happen.', speak: ['Stories have characters, the people or animals in them, and a setting, where they happen.'], visual: pic('📖') },
    { beat: 'watch', text: (K_STORIES[0]?.text as string) + ' The pig is a character. The farm is the setting.', speak: [K_STORIES[0]?.text as string, 'The pig is a character. The farm is the setting.'], visual: pic('🐷') },
    { beat: 'try', text: 'Where does the crab story happen?', speak: [K_STORIES[1]?.text as string, 'Where does the story happen?'], visual: pic('🦀'), reveal: { text: 'At the beach.', speak: ['At the beach.'], visual: pic('🏖️') } },
    { beat: 'remember', text: 'Who is in it? Where is it?', speak: ['Who is in it? Where is it?'], visual: pic('📖') },
  ],
  oracle: 'authored',
};

function kFacts(level: Level, rng: Rng): QuestionDraft {
  const fact = rng.pick(K_FACTS);
  return heard(`${fact.id}-${level}`, fact.text, level === 1 ? fact.first : fact.later, 'Listen.', rng);
}

export const kFactsGenerator: SkillGenerator = {
  skillId: 'E-K-E3',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 8, 2: 8 },
  generate: kFacts,
  exampleSeed: 672,
  example: () => kFacts(1, makeRng(672)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Some books tell true facts about the world.', speak: ['Some books tell true facts about the world.'], visual: pic('🐝') },
    { beat: 'watch', text: `${K_FACTS[0]?.text} Bees make honey.`, speak: [K_FACTS[0]?.text as string, 'So bees make honey.'], visual: pic('🍯') },
    { beat: 'try', text: 'What do cows give us?', speak: [K_FACTS[1]?.text as string, 'What do cows give us?'], visual: pic('🐄'), reveal: { text: 'Milk.', speak: ['Cows give us milk.'], visual: pic('🥛') } },
    { beat: 'remember', text: 'Listen for the fact that answers the question.', speak: ['Listen for the fact that answers the question.'], visual: pic('🐝') },
  ],
  oracle: 'authored',
};

// ---- Grades 1 and 2: the text is read, never spoken, and its answers do not speak. ----

// What the child looks back at: a story, a fact text, or one sentence.
type Source = 'story' | 'text' | 'sentence';

// The steps say where to look, then quote the sentence that shows the answer (or say what it shows).
function read(id: string, text: string, q: Pick3, where: Source, shows: string, nudge: Hint, rng: Rng): QuestionDraft {
  const order = rng.shuffle([0, 1, 2]);
  const look = `Look back at the ${where}.`;
  return {
    type: 'choice',
    mode: 'read',
    facts: { id, read: [text, ...q.answers] },
    prompt: { text: q.ask, speak: [q.ask] },
    stimulus: plain(text),
    options: order.map((i) => plain(q.answers[i] as string)),
    answerIndex: order.indexOf(0),
    explanation: { speak: [look], steps: [look, shows], visual: plain(shows), hint: nudge },
  };
}

const says = (where: Source, sentence: string): string => `The ${where} says: ${sentence}`;
const cap = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// D.2 Characters and setting. Levels: who / where.
function g1Story(level: Level, rng: Rng): QuestionDraft {
  const story = rng.pick(G1_STORIES);
  const q = level === 1 ? story.who : story.where;
  return read(`${story.id}-${level === 1 ? 'who' : 'where'}`, story.text, q, 'story', says('story', q.because), hint(`Look back at the story. Find the sentence that tells ${level === 1 ? 'who' : 'where'}.`), rng);
}

export const g1CharactersGenerator: SkillGenerator = {
  skillId: 'E-1-D2',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 8, 2: 8 },
  generate: g1Story,
  exampleSeed: 673,
  example: () => g1Story(1, makeRng(673)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Characters are who is in a story. The setting is where it happens.', speak: ['Characters are who is in a story. The setting is where it happens.'], visual: plain(G1_STORIES[0]?.text as string) },
    { beat: 'watch', text: 'Tom and his dog are the characters. The park is the setting.', speak: ['Tom and his dog are the characters. The park is the setting.'], visual: plain(G1_STORIES[0]?.text as string) },
    { beat: 'try', text: 'Where do Kim and her mom go?', speak: ['Where do Kim and her mom go?'], visual: plain(G1_STORIES[1]?.text as string), reveal: { text: 'To the beach.', speak: ['To the beach.'], visual: plain('Kim and her mom go to the beach.') } },
    { beat: 'remember', text: 'Who? Where? Look back at the story.', speak: ['Who? Where? Look back at the story.'], visual: plain(G1_STORIES[0]?.text as string) },
  ],
  oracle: 'authored',
};

// D.3 Retell in order. Levels: put 3 events in order / which of three happened last.
// An order question's steps list the answer, so its hint points to the start without placing a card.
const FIRST_HINT = hint('Look at the start of the story. What happened first?');

function retell1(level: Level, rng: Rng): QuestionDraft {
  const story = rng.pick(G1_STORIES);
  if (level === 2) {
    // Something else may happen after these three, so the question asks which of these came last.
    const [a, b, c] = story.events;
    return read(`${story.id}-last`, story.text, { ask: 'Which of these happened last?', answers: [c, a, b] }, 'story', `Of these, this one happened last: ${c}`, hint('Find each one in the story. Which one comes last?'), rng);
  }
  const shown = rng.shuffle([0, 1, 2]);
  const ask = 'Put what happened in order. Tap the first thing first.';
  return {
    type: 'order',
    mode: 'read',
    facts: { id: `${story.id}-order`, read: [story.text, ...story.events] },
    prompt: { text: ask, speak: [ask] },
    stimulus: plain(story.text),
    items: shown.map((i) => plain(story.events[i] as string)),
    answerOrder: [0, 1, 2].map((i) => shown.indexOf(i)),
    explanation: { speak: ['First, next, last. Look back at the story.'], steps: story.events.map((each, i) => `${i + 1}. ${each}`), visual: plain(story.text), hint: FIRST_HINT },
  };
}

export const retell1Generator: SkillGenerator = {
  skillId: 'E-1-D3',
  maxLevel: 2,
  itemTypes: ['order', 'choice'],
  lists: [],
  pool: { 1: 8, 2: 8 },
  generate: retell1,
  exampleSeed: 674,
  example: () => retell1(1, makeRng(674)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To retell a story, say what happened first, next and last.', speak: ['To retell a story, say what happened first, next and last.'], visual: plain(G1_STORIES[2]?.text as string) },
    { beat: 'watch', text: (G1_STORIES[2]?.events ?? []).map((each, i) => `${i + 1}. ${each}`).join(' '), speak: ['First Ben feeds the hens. Next he milks the cow. Last he gets eggs.'], visual: plain(G1_STORIES[2]?.text as string) },
    { beat: 'try', text: 'What happened last?', speak: ['What happened last?'], visual: plain(G1_STORIES[4]?.text as string), reveal: { text: 'It sleeps in the den.', speak: ['Look at the end of the story.'], visual: plain('It sleeps in the den.') } },
    { beat: 'remember', text: 'First, next, last.', speak: ['First, next, last.'], visual: plain(G1_STORIES[2]?.text as string) },
  ],
  oracle: 'authored',
};

// D.4 True or false. Levels: is this true / which sentence is true.
// Each sentence to judge is answered by the story's own sentence about it (`proof`), true or not.
function trueFalse(level: Level, rng: Rng): QuestionDraft {
  const story = rng.pick(G1_STORIES);
  if (level === 2) return read(`${story.id}-truth`, story.text, { ask: 'Which sentence is true?', answers: story.truth }, 'story', says('story', story.proof[0]), hint('Check each sentence against the story.'), rng);
  const isTrue = rng.bool();
  const at = isTrue ? 0 : rng.int(1, 2);
  const statement = story.truth[at] as string;
  const proof = story.proof[at] as string;
  const ask = `Is this true? "${statement}"`;
  return {
    type: 'choice',
    mode: 'read',
    fixedOrder: true,
    facts: { id: `${story.id}-tf-${statement}`, read: [story.text, statement] },
    prompt: { text: ask, speak: ['Is this sentence true?'] },
    stimulus: plain(story.text),
    options: [plain('Yes, true', 'l'), plain('No, not true', 'l')],
    answerIndex: isTrue ? 0 : 1,
    explanation: { speak: ['Look back at the story.'], steps: [says('story', proof), isTrue ? 'So it is true.' : 'So it is not true.'], visual: plain(proof), hint: hint('Find the part of the story that tells about this.') },
  };
}

export const trueFalseGenerator: SkillGenerator = {
  skillId: 'E-1-D4',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  generate: trueFalse,
  exampleSeed: 675,
  example: () => trueFalse(1, makeRng(675)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A sentence is true when the story says so.', speak: ['A sentence is true when the story says so.'], visual: plain(G1_STORIES[0]?.text as string) },
    { beat: 'watch', text: '"Tom has a red ball." The story says that, so it is true.', speak: ['Tom has a red ball. The story says that, so it is true.'], visual: plain(G1_STORIES[0]?.text as string) },
    { beat: 'try', text: 'Is this true? "Tom has a blue ball."', speak: ['Is this sentence true?'], visual: plain(G1_STORIES[0]?.text as string), reveal: { text: 'No. The ball is red.', speak: ['No. The ball is red.'], visual: plain('Tom has a red ball.') } },
    { beat: 'remember', text: 'Check the story before you answer.', speak: ['Check the story before you answer.'], visual: plain(G1_STORIES[0]?.text as string) },
  ],
  oracle: 'authored',
};

// D.5 Fact texts, grade 1 (and D.5, grade 2). Levels: main topic / a fact from it.
function factText(texts: typeof G1_FACTS, prefix: string): (level: Level, rng: Rng) => QuestionDraft {
  return (level, rng) => {
    const text = rng.pick(texts);
    if (level === 1) return read(`${prefix}${text.id}-topic`, text.text, { ask: 'What is this mostly about?', answers: text.topic }, 'text', `Every sentence is about ${text.topic[0]}.`, hint('What does every sentence talk about?'), rng);
    return read(`${prefix}${text.id}-fact`, text.text, text.fact, 'text', says('text', text.fact.because), hint('Find the sentence that answers the question.'), rng);
  };
}

const g1FactText = factText(G1_FACTS, '');
export const g1FactsGenerator: SkillGenerator = {
  skillId: 'E-1-D5',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 6, 2: 6 },
  generate: g1FactText,
  exampleSeed: 676,
  example: () => g1FactText(1, makeRng(676)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'The main topic is what every sentence is about.', speak: ['The main topic is what every sentence is about.'], visual: plain(G1_FACTS[0]?.text as string) },
    { beat: 'watch', text: 'Every sentence is about apples. The main topic is apples.', speak: ['Every sentence is about apples. The main topic is apples.'], visual: plain(G1_FACTS[0]?.text as string) },
    { beat: 'try', text: 'When do owls hunt?', speak: ['When do owls hunt?'], visual: plain(G1_FACTS[1]?.text as string), reveal: { text: 'At night.', speak: ['At night.'], visual: plain('Owls hunt at night.') } },
    { beat: 'remember', text: 'Main topic: what it is all about.', speak: ['Main topic: what it is all about.'], visual: plain(G1_FACTS[0]?.text as string) },
  ],
  oracle: 'authored',
};

const g2FactText = factText(G2_FACTS, '');
export const g2FactsGenerator: SkillGenerator = {
  skillId: 'E-2-D5',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  pool: { 1: 6, 2: 6 },
  generate: g2FactText,
  exampleSeed: 677,
  example: () => g2FactText(1, makeRng(677)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A fact text teaches about one main topic. Each sentence adds a detail.', speak: ['A fact text teaches about one main topic. Each sentence adds a detail.'], visual: plain(G2_FACTS[0]?.text as string) },
    { beat: 'watch', text: 'This text is mostly about how a butterfly grows.', speak: ['This text is mostly about how a butterfly grows.'], visual: plain(G2_FACTS[0]?.text as string) },
    { beat: 'try', text: 'Who lays the eggs?', speak: ['Who lays the eggs?'], visual: plain(G2_FACTS[2]?.text as string), reveal: { text: 'The queen.', speak: ['The queen.'], visual: plain('The queen lays the eggs.') } },
    { beat: 'remember', text: 'Main topic first, then the details.', speak: ['Main topic first, then the details.'], visual: plain(G2_FACTS[0]?.text as string) },
  ],
  oracle: 'authored',
};

// ---- Grade 2 D.4 Retell, from the D.1 stories. Levels: the best retelling / what happened in the middle. ----

function retell2(level: Level, rng: Rng): QuestionDraft {
  const story = rng.pick(STORIES_2);
  const [a, b, , d] = story.events as [string, string, string, string];
  if (level === 2) return read(`${story.id}-middle`, story.text, { ask: 'Which of these happened in the middle?', answers: [b, d, a] }, 'story', `Of these, this one happened in the middle: ${b}`, hint('Find how the story starts and how it ends. What happened between them?'), rng);
  const other = rng.pick(STORIES_2.filter((each) => each !== story)) as Story2;
  return read(`${story.id}-retell-${other.id}`, story.text, { ask: 'Which is the best retelling of the story?', answers: [`${a} ${b} ${d}`, `${d} ${b} ${a}`, `${other.events[0]} ${other.events[1]} ${other.events[3]}`] }, 'story', `In order: ${a} ${b} ${d}`, hint('A good retelling tells the main parts of this story, in the order they happened.'), rng);
}

export const retell2Generator: SkillGenerator = {
  skillId: 'E-2-D4',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  generate: retell2,
  exampleSeed: 678,
  example: () => retell2(1, makeRng(678)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'A good retelling tells the important parts, in order.', speak: ['A good retelling tells the important parts, in order.'], visual: plain(STORIES_2[0]?.text as string) },
    { beat: 'watch', text: (STORIES_2[0]?.events ?? []).join(' '), speak: ['Ana found a bird, put it in a box, her dad called the doctor, and the bird could fly again.'], visual: plain(STORIES_2[0]?.text as string) },
    { beat: 'try', text: 'What happened in the middle?', speak: ['What happened in the middle?'], visual: plain(STORIES_2[1]?.text as string), reveal: { text: 'He watered them every day.', speak: ['Leo watered the seeds every day.'], visual: plain('He watered them every day.') } },
    { beat: 'remember', text: 'Beginning, middle, end.', speak: ['Beginning, middle, end.'], visual: plain(STORIES_2[0]?.text as string) },
  ],
  oracle: 'authored',
};

// ---- Grade 2 D.6 Words in context. Levels: what the word means / which word means it. ----

const CLUES = hint('Read the words around it. They are clues.');

function context(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(CONTEXT_WORDS);
  const shown = entry.sentence;
  if (level === 2) {
    // Every word offered is in the sentence, so the child must know which one means it.
    return read(`${entry.word}-which`, shown, { ask: `Which word in the sentence means "${entry.answers[0]}"?`, answers: [entry.word, entry.others[0], entry.others[1]] }, 'sentence', `${cap(entry.word)} means ${entry.answers[0]}.`, hint('Try each word in its place in the sentence. Which one fits the meaning?'), rng);
  }
  return read(`${entry.word}-means`, shown, { ask: `What does "${entry.word}" mean in this sentence?`, answers: entry.answers }, 'sentence', `The rest of the sentence shows that ${entry.word} means ${entry.answers[0]}.`, CLUES, rng);
}

export const contextWordsGenerator: SkillGenerator = {
  skillId: 'E-2-D6',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: [],
  generate: context,
  exampleSeed: 679,
  example: () => context(1, makeRng(679)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'When you meet a new word, the words around it are clues.', speak: ['When you meet a new word, the words around it are clues.'], visual: plain(CONTEXT_WORDS[0]?.sentence as string) },
    { beat: 'watch', text: 'It fit in my hand, so tiny must mean very small.', speak: ['It fit in my hand, so tiny must mean very small.'], visual: plain(CONTEXT_WORDS[0]?.sentence as string) },
    { beat: 'try', text: 'What does "scalding" mean?', speak: ['What does scalding mean?'], visual: plain(CONTEXT_WORDS[2]?.sentence as string), reveal: { text: 'We waited for it to cool, so scalding means very hot.', speak: ['We waited for it to cool, so scalding means very hot.'], visual: plain(CONTEXT_WORDS[2]?.sentence as string) } },
    { beat: 'remember', text: 'Use the clues around the word.', speak: ['Use the clues around the word.'], visual: plain(CONTEXT_WORDS[0]?.sentence as string) },
  ],
  oracle: 'authored',
};
