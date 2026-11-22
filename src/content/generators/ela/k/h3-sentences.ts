import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, Visual } from '../../../../engine/types';
import type { Answer, GapSentence, QuestionWord } from '../../../data/h3-stories';
import { ANSWERS, ASKS_ABOUT, COUNT_SENTENCES, filled, GAP_SENTENCES, LONG_NAMES, NAME_SENTENCES, NAMES, QUESTION_WORDS } from '../../../data/h3-stories';
import type { Action } from '../../../data/h3-words';
import { ACTIONS, READ_VERBS } from '../../../data/h3-words';
import type { SkillGenerator } from '../../../generator';
import { numeral } from '../../../generator';
import { a, cap, picture, row } from '../pk/parts';
import type { Line, Told } from '../pk/h3-parts';
import { beats, line, plain, silent, spoken, working } from '../pk/h3-parts';

// Language Arts kindergarten C.4 and D.4 to D.7 (plan section 15, wave H3). Oracle: earlyWords.

// ---- C.4 Sight words in a sentence ----
// Levels: 2 words to choose from / 3. Read: the sentence and the words are never spoken.
// Each sentence lists wrong words that cannot fit; words that could fit are never offered.

// Says what to do with the words: they are dragged (or tapped) into the space. A read question never says the
// words to read, so neither the prompt nor the hint uses any word of a sentence or its options (the, a, in, is...).
const GAP = line('Read this sentence. Which word fits? Drag it into this space.');
const GAP_HINT = line('Put each word into this space. Read this sentence again. Which word makes sense?');

function gapExplanation(gap: GapSentence): Told {
  return { speak: ['The word is', { word: gap.answer }, '.', filled(gap)], steps: [filled(gap)], visual: plain(filled(gap), 'm'), hint: { text: GAP_HINT.text } };
}

function gapWords(level: Level, rng: Rng): QuestionDraft {
  const gap = rng.pick(GAP_SENTENCES);
  const options = rng.shuffle([gap.answer, ...rng.sample(gap.wrong, level)]);
  return {
    type: 'dragWord',
    mode: 'read',
    facts: { relation: 'gapWord', target: filled(gap), read: [gap.before, gap.after, ...options], options },
    prompt: GAP,
    before: gap.before,
    after: gap.after,
    options: options.map((word) => plain(word, 'l')),
    answerIndex: options.indexOf(gap.answer),
    explanation: gapExplanation(gap),
  };
}

const gapOf = (answer: string, before: string): GapSentence => GAP_SENTENCES.find((each) => each.answer === answer && each.before === before) as GapSentence;

export const gapWordsGenerator: SkillGenerator = {
  skillId: 'E-K-C4',
  maxLevel: 2,
  itemTypes: ['dragWord'],
  lists: ['h3-stories'],
  generate: gapWords,
  exampleSeed: 4141,
  example: () => gapWords(1, makeRng(4141)),
  lesson: () => {
    const see = gapExplanation(gapOf('see', 'I'));
    const run = gapExplanation(gapOf('run', 'The dog can'));
    return beats(
      { ...line('Sight words help us read sentences. Read the sentence and find the word that makes sense.'), visual: plain('I ___ a cat.', 'm') },
      { text: `${GAP.text} I see a cat.`, speak: [...GAP.speak, ...see.speak], visual: see.visual },
      { ...GAP, visual: row(plain('The dog can ___ fast.', 'm'), plain('run', 'l'), plain('my', 'l')) },
      { text: run.steps.join(' '), speak: run.speak, visual: run.visual },
      { ...line('Read the whole sentence again with your word in it.'), visual: see.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- D.4 Names start with a capital ----
// Levels: a name, 2 ways to write it / 3 ways / a sentence with a name and the word I, 3 ways.
// The written choices are not spoken: they all sound the same.

const NAME_ASK = line('Which one is written the right way?');
const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);
const capMiddle = (name: string): string => name.charAt(0).toLowerCase() + name.charAt(1).toUpperCase() + name.slice(2);

// One rule a sentence: "Names and the word I always start..." heard aloud sounds like "the word I always start".
// A name alone is followed by its own capital: "Rosa starts with a capital R."
function nameExplanation(right: string, name: string, sentence: boolean): Told {
  const capital = name.charAt(0);
  const steps = sentence
    ? [line('Names start with a capital letter.'), spoken('The word I is always a capital letter.', ['The word', { letter: 'I' }, 'is always a capital letter.']), line(right)]
    : [line('A name starts with a capital letter.'), spoken(`${name} starts with a capital ${capital}.`, [{ word: name }, 'starts with a capital', { letter: capital }, '.'])];
  const hint = sentence ? 'Look at the first letter of the name, and at the word I.' : 'Look at the first letter of each one.';
  return working(steps, plain(right, 'l'), sentence ? spoken(hint, ['Look at the first letter of the name, and at the word', { letter: 'I' }, '.']) : line(hint));
}

function names(level: Level, rng: Rng): QuestionDraft {
  let right: string;
  let name: string;
  let wrong: string[];
  if (level < 3) {
    right = rng.pick([...NAMES, ...LONG_NAMES]);
    name = right;
    wrong = level === 1 ? [right.toLowerCase()] : [right.toLowerCase(), capMiddle(right)];
  } else {
    name = rng.pick(NAMES);
    right = rng.pick(NAME_SENTENCES).replace('{name}', name);
    const nameLow = right.replace(name, name.toLowerCase());
    const iLow = right.replace(/\bI\b/, 'i');
    wrong = [nameLow === right ? lowerFirst(right) : nameLow, iLow];
  }
  const options = rng.shuffle([right, ...wrong]);
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'capitalName', target: right.toLowerCase(), options },
    prompt: NAME_ASK,
    options: options.map((each) => plain(each, level === 3 ? 'm' : 'l')),
    answerIndex: options.indexOf(right),
    explanation: nameExplanation(right, name, level === 3),
  };
}

export const namesGenerator: SkillGenerator = {
  skillId: 'E-K-D4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h3-stories'],
  generate: names,
  exampleSeed: 4241,
  example: () => names(1, makeRng(4241)),
  lesson: () =>
    beats(
      { ...line('A name starts with a capital letter, a big letter.'), visual: plain('Sam', 'xl') },
      { text: `${NAME_ASK.text} Mia is right: the M is big.`, speak: [...NAME_ASK.speak, 'This one is right: the first letter is big.'], visual: row(plain('mia', 'l'), plain('Mia', 'l')) },
      { ...NAME_ASK, visual: row(plain('I see Leo.', 'm'), plain('I see leo.', 'm')) },
      { text: 'I see Leo. Leo is a name, so it starts with a capital.', speak: ['The first one is right. A name starts with a capital letter.'], visual: plain('I see Leo.', 'm') },
      { ...line('Names and the word I always start with a capital letter.'), visual: plain('Sam and I play.', 'm') },
    ),
  oracle: 'earlyWords',
};

// ---- D.5 Question words ----
// Levels: who or where, 2 spoken pictures / who, what or where, 3 spoken pictures /
// a picture, which question word does it answer: who, what, where in fixed places.

const answerPicture = (each: Answer): Visual => picture(each.word, each.emoji);
// Never ending on the question word: "Which one answers the question where?" sounds as if the voice asks the child
// where.
const questionPrompt = (word: QuestionWord): Line => ({ text: `Find the one that answers a ${word} question.`, speak: ['Find the one that answers a', { word }, 'question.'] });
const QUESTION_FOR = line('Which question does this picture answer: who, what or where?');
const wordVisual = (word: QuestionWord): Visual => ({ kind: 'text', value: cap(word), size: 'l', speak: [{ word }] });
const WORDS_HINT = line('Who asks about a person. What asks about a thing. Where asks about a place.');
// When the options are the question words, the hint names none of them.
const PICTURE_HINT = line('Is the picture a person, a thing or a place?');

function questionExplanation(answer: Answer, hint: Line): Told {
  const steps = [`${cap(answer.kind)} asks about ${ASKS_ABOUT[answer.kind]}.`, `${cap(a(answer.word))} is ${ASKS_ABOUT[answer.kind]}.`];
  return working(steps.map(line), answerPicture(answer), hint);
}

function questionWords(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const answer = rng.pick(ANSWERS);
    return {
      type: 'choice',
      mode: 'look',
      fixedOrder: true,
      facts: { relation: 'questionFor', target: answer.word, options: [...QUESTION_WORDS] },
      prompt: QUESTION_FOR,
      stimulus: answerPicture(answer),
      options: QUESTION_WORDS.map(wordVisual),
      answerIndex: QUESTION_WORDS.indexOf(answer.kind),
      explanation: questionExplanation(answer, PICTURE_HINT),
    };
  }
  const kinds: QuestionWord[] = level === 1 ? ['who', 'where'] : [...QUESTION_WORDS];
  const asked = rng.pick(kinds);
  const options = rng.shuffle(kinds.map((kind) => rng.pick(ANSWERS.filter((each) => each.kind === kind))));
  const answer = options.find((each) => each.kind === asked) as Answer;
  return {
    type: 'choice',
    mode: 'look',
    facts: { relation: 'questionWord', target: asked, answer: answer.word, options: options.map((each) => each.word) },
    prompt: questionPrompt(asked),
    options: options.map(answerPicture),
    answerIndex: options.indexOf(answer),
    explanation: questionExplanation(answer, WORDS_HINT),
  };
}

const answerOf = (word: string): Answer => ANSWERS.find((each) => each.word === word) as Answer;

export const questionWordsGenerator: SkillGenerator = {
  skillId: 'E-K-D5',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h3-stories'],
  generate: questionWords,
  exampleSeed: 4251,
  example: () => questionWords(1, makeRng(4251)),
  lesson: () => {
    const school = questionExplanation(answerOf('school'), WORDS_HINT);
    const girl = questionExplanation(answerOf('girl'), WORDS_HINT);
    return beats(
      { ...line('Who asks about a person. What asks about a thing. Where asks about a place.'), visual: row(answerPicture(answerOf('girl')), answerPicture(answerOf('ball')), answerPicture(answerOf('school'))) },
      { text: `${questionPrompt('where').text} ${school.steps.join(' ')}`, speak: [...questionPrompt('where').speak, ...school.speak], visual: school.visual },
      { ...questionPrompt('who'), visual: row(answerPicture(answerOf('house')), answerPicture(answerOf('girl'))) },
      { text: girl.steps.join(' '), speak: girl.speak, visual: girl.visual },
      { ...line('Who is a person, what is a thing, where is a place.'), visual: row(answerPicture(answerOf('boy')), answerPicture(answerOf('cup')), answerPicture(answerOf('beach'))) },
    );
  },
  oracle: 'earlyWords',
};

// ---- D.6 Count the words ----
// Levels: sentences of 2 to 4 words, the numbers 2, 3 and 4 in fixed places / 3 to 6 words, three numbers in a row around the answer.

const COUNT = line('How many words are in this sentence?');
const COUNT_HINT = line('Point to each word as you count. Look for the spaces between words.');
const wordsOf = (sentence: string): string[] => sentence.split(' ');
const bare = (word: string): string => word.replace(/[.?!]$/, '');
const counted = (sentence: string): string => wordsOf(sentence).map((word, i) => `${bare(word)} (${i + 1})`).join(' ');
// Counted aloud as the screen shows it, each word and then its number: "I, one, see, two, you, three."
const countedSay = (sentence: string): Say => wordsOf(sentence).flatMap((word, i, all): Say => [`${bare(word)},`, { number: i + 1 }, i === all.length - 1 ? '.' : ',']);

function countExplanation(sentence: string): Told {
  const n = wordsOf(sentence).length;
  return working([spoken(counted(sentence), countedSay(sentence)), spoken(`There are ${n} words.`, ['There are', { number: n }, 'words.'])], plain(sentence, 'm'), COUNT_HINT);
}

function countWords(level: Level, rng: Rng): QuestionDraft {
  const n = level === 1 ? rng.int(2, 4) : rng.int(3, 6);
  const sentence = rng.pick(COUNT_SENTENCES.filter((each) => wordsOf(each).length === n));
  // Level 2: three numbers in a row, with the answer first, in the middle or last.
  const start = level === 1 ? 2 : n - rng.int(0, Math.min(2, n - 2));
  const values = [start, start + 1, start + 2];
  return {
    type: 'choice',
    mode: 'look',
    ...(level === 1 ? { fixedOrder: true as const } : {}),
    facts: { relation: 'wordCount', target: sentence, options: values },
    prompt: COUNT,
    stimulus: { kind: 'text', value: sentence, size: 'm', speak: [sentence] },
    options: values.map((value) => numeral(value)),
    answerIndex: values.indexOf(n),
    explanation: countExplanation(sentence),
  };
}

export const countWordsGenerator: SkillGenerator = {
  skillId: 'E-K-D6',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-stories'],
  generate: countWords,
  exampleSeed: 4261,
  example: () => countWords(1, makeRng(4261)),
  lesson: () => {
    const dog = countExplanation('The dog can jump.');
    const cat = countExplanation('I like cake.');
    return beats(
      { ...line('A sentence is made of words. A space comes between each word.'), visual: plain('We can run.', 'l') },
      { text: `${COUNT.text} ${dog.steps.join(' ')}`, speak: [...COUNT.speak, ...dog.speak], visual: dog.visual },
      { ...COUNT, visual: row(plain('I like cake.', 'l'), numeral(2), numeral(3), numeral(4)) },
      { text: cat.steps.join(' '), speak: cat.speak, visual: cat.visual },
      { ...line('Point to each word as you count.'), visual: plain('We can run.', 'l') },
    );
  },
  oracle: 'earlyWords',
};

// ---- D.7 Read an action word ----
// Levels: 2 pictures / 3 pictures. Read: the word is never spoken, and the pictures are silent.

const READ_ACTION = line('Read the action word. Which picture shows it?');
// A read hint never says the word to read.
const READ_ACTION_HINT = { text: 'Sound out the word. Then find someone doing it.' };
const readable = ACTIONS.filter((each) => READ_VERBS.includes(each.verb));

function readActionExplanation(answer: Action): Told {
  return { speak: ['This word is', { word: answer.verb }, '.', `This one is ${answer.doing}.`], steps: [`This word is ${answer.verb}.`, `This one is ${answer.doing}.`], visual: row(plain(answer.verb, 'xl'), picture(answer.doing, answer.emoji)), hint: READ_ACTION_HINT };
}

function readAction(level: Level, rng: Rng): QuestionDraft {
  const answer = rng.pick(readable);
  const options = rng.shuffle([answer, ...rng.sample(readable.filter((each) => each !== answer), level)]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { relation: 'action', target: answer.verb, read: [answer.verb], options: options.map((each) => each.verb) },
    prompt: READ_ACTION,
    stimulus: plain(answer.verb, 'xl'),
    options: options.map((each) => silent(each.emoji)),
    answerIndex: options.indexOf(answer),
    explanation: readActionExplanation(answer),
  };
}

const act = (verb: string): Action => ACTIONS.find((each) => each.verb === verb) as Action;

export const readActionGenerator: SkillGenerator = {
  skillId: 'E-K-D7',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-words'],
  generate: readAction,
  exampleSeed: 4271,
  example: () => readAction(1, makeRng(4271)),
  lesson: () => {
    const swim = readActionExplanation(act('swim'));
    const run = readActionExplanation(act('run'));
    return beats(
      { ...line('An action word tells what someone does.'), visual: row(plain('swim', 'xl'), picture(act('swim').doing, act('swim').emoji)) },
      { text: swim.steps.join(' '), speak: swim.speak, visual: swim.visual },
      { ...READ_ACTION, visual: row(plain('run', 'xl'), silent(act('sleep').emoji), silent(act('run').emoji)) },
      { text: run.steps.join(' '), speak: run.speak, visual: run.visual },
      { ...line('Sound out the word, then look for someone doing it.'), visual: swim.visual },
    );
  },
  oracle: 'earlyWords',
};
