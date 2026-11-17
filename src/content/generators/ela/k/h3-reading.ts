import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Visual } from '../../../../engine/types';
import type { RealSentence, Sequence, WhoSentence } from '../../../data/h3-stories';
import { REAL_SENTENCES, SEQUENCES, WHO_CHARACTERS, WHO_SENTENCES } from '../../../data/h3-stories';
import type { Pic } from '../../../data/h3-words';
import type { SentencePicture } from '../../../data/sentencePictures';
import { SENTENCE_PICTURES } from '../../../data/sentencePictures';
import type { SkillGenerator } from '../../../generator';
import type { Explanation } from '../pk/parts';
import { picture, row } from '../pk/parts';
import { beats, line, plain, silent } from '../pk/h3-parts';

// Language Arts kindergarten E.4 to E.7 (plan section 15, wave H3). Oracle: earlyWords.

const shown = (entry: Pic): Visual => picture(entry.word, entry.emoji);

// ---- E.4 Story order ----
// Levels: which happens first, 3 spoken pictures / put all 3 pictures in order.

const THREE = SEQUENCES.filter((each) => each.steps.length === 3);
const FIRST = line('Which happens first?');
const ORDER = line('Put the pictures in order: first, next, last.');

function orderExplanation(sequence: Sequence): Explanation {
  return { speak: [...sequence.lines], steps: [...sequence.lines], visual: row(...sequence.steps.map(shown)) };
}

function storyOrder(level: Level, rng: Rng): QuestionDraft {
  const sequence = rng.pick(THREE);
  const items = rng.shuffle(sequence.steps);
  if (level === 1) {
    return {
      type: 'choice',
      mode: 'look',
      facts: { relation: 'storyFirst', target: sequence.id, options: items.map((each) => each.word) },
      prompt: FIRST,
      options: items.map(shown),
      answerIndex: items.indexOf(sequence.steps[0] as Pic),
      explanation: orderExplanation(sequence),
    };
  }
  return {
    type: 'order',
    mode: 'look',
    facts: { relation: 'storyOrder', target: sequence.id, items: items.map((each) => each.word) },
    prompt: ORDER,
    items: items.map(shown),
    answerOrder: sequence.steps.map((step) => items.indexOf(step)),
    explanation: orderExplanation(sequence),
  };
}

const seq = (id: string): Sequence => SEQUENCES.find((each) => each.id === id) as Sequence;

export const storyOrderGenerator: SkillGenerator = {
  skillId: 'E-K-E4',
  maxLevel: 2,
  itemTypes: ['choice', 'order'],
  lists: ['h3-stories'],
  pool: { 1: THREE.length }, // one question for each three-step story
  generate: storyOrder,
  exampleSeed: 4341,
  example: () => storyOrder(1, makeRng(4341)),
  lesson: () => {
    const grow = orderExplanation(seq('grow'));
    const rain = orderExplanation(seq('rain'));
    return beats(
      { ...line('Stories happen in order: first, next, last.'), visual: grow.visual },
      { text: `${FIRST.text} ${grow.steps.join(' ')}`, speak: [...FIRST.speak, ...grow.speak], visual: grow.visual },
      { ...ORDER, visual: row(...[2, 0, 1].map((i) => shown(seq('rain').steps[i] as Pic))) },
      { text: rain.steps.join(' '), speak: rain.speak, visual: rain.visual },
      { ...line('Ask: what happens first? Then what? What happens last?'), visual: grow.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- E.5 Real or make-believe ----
// Levels: animals and people / things and the sky. Real and make-believe sit in fixed places.

const KINDS = ['real', 'make-believe'];
const KIND_VISUALS: Visual[] = [
  { kind: 'text', value: 'Real', size: 'l', speak: ['Real'] },
  { kind: 'text', value: 'Make-believe', size: 'l', speak: [{ word: 'make-believe' }] },
];
const REAL_ASK = 'Is it real or make-believe?';

function realExplanation(entry: RealSentence): Explanation {
  const said = entry.real ? 'This can really happen. It is real.' : 'This could not really happen. It is make-believe.';
  return { speak: [entry.sentence, said], steps: [entry.sentence, said], visual: shown(entry.subject) };
}

function realOrNot(level: Level, rng: Rng): QuestionDraft {
  const real = rng.bool();
  const entry = rng.pick(REAL_SENTENCES.filter((each) => each.real === real && each.thing === (level === 2)));
  return {
    type: 'choice',
    mode: 'look',
    fixedOrder: true,
    facts: { relation: 'realOrNot', target: entry.sentence, options: KINDS },
    prompt: { text: `${entry.sentence} ${REAL_ASK}`, speak: [entry.sentence, REAL_ASK] },
    stimulus: shown(entry.subject),
    options: KIND_VISUALS,
    answerIndex: real ? 0 : 1,
    explanation: realExplanation(entry),
  };
}

const realOf = (sentence: string): RealSentence => REAL_SENTENCES.find((each) => each.sentence === sentence) as RealSentence;

export const realOrNotGenerator: SkillGenerator = {
  skillId: 'E-K-E5',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-stories'],
  generate: realOrNot,
  exampleSeed: 4351,
  example: () => realOrNot(1, makeRng(4351)),
  lesson: () => {
    const run = realExplanation(realOf('A dog can run.'));
    const read = realExplanation(realOf('A dog can read a book.'));
    return beats(
      { ...line('Some stories are real: they could happen. Some are make-believe: they could not.'), visual: shown(realOf('A dog can run.').subject) },
      { text: `A dog can run. ${REAL_ASK} ${run.steps[1] as string}`, speak: ['A dog can run.', REAL_ASK, run.steps[1] as string], visual: run.visual },
      { text: `A dog can read a book. ${REAL_ASK}`, speak: ['A dog can read a book.', REAL_ASK], visual: row(...KIND_VISUALS) },
      { text: read.steps[1] as string, speak: [read.steps[1] as string], visual: read.visual },
      { ...line('Ask yourself: could this really happen?'), visual: run.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- E.6 Which sentence matches the picture ----
// Levels: 2 sentences / 3 sentences. Read: the sentences are never spoken, and the picture is silent.

const MATCHES = line('Which sentence matches the picture?');

function sentenceExplanation(entry: SentencePicture): Explanation {
  return { speak: [entry.sentence, 'This sentence has the word', { word: entry.word }, ', just like the picture.'], steps: [entry.sentence, `It has the word ${entry.word}, just like the picture.`], visual: row(picture(entry.word, entry.emoji), plain(entry.sentence, 'm')) };
}

function pickSentence(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(SENTENCE_PICTURES);
  const options = rng.shuffle([entry, ...rng.sample(SENTENCE_PICTURES.filter((each) => each.word !== entry.word), level)]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { relation: 'pictureSentence', target: entry.word, read: options.map((each) => each.sentence), options: options.map((each) => each.sentence) },
    prompt: MATCHES,
    stimulus: silent(entry.emoji),
    options: options.map((each) => plain(each.sentence, 'm')),
    answerIndex: options.indexOf(entry),
    explanation: sentenceExplanation(entry),
  };
}

const sentenceOf = (word: string): SentencePicture => SENTENCE_PICTURES.find((each) => each.word === word) as SentencePicture;

export const pickSentenceGenerator: SkillGenerator = {
  skillId: 'E-K-E6',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['sentencePictures'],
  generate: pickSentence,
  exampleSeed: 4361,
  example: () => pickSentence(1, makeRng(4361)),
  lesson: () => {
    const cat = sentenceExplanation(sentenceOf('cat'));
    const bus = sentenceExplanation(sentenceOf('bus'));
    return beats(
      { ...line('Look at the picture. Then read each sentence and find the one that tells about it.'), visual: silent(sentenceOf('cat').emoji) },
      { text: `${MATCHES.text} ${cat.steps.join(' ')}`, speak: [...MATCHES.speak, ...cat.speak], visual: cat.visual },
      { ...MATCHES, visual: row(silent(sentenceOf('bus').emoji), plain(sentenceOf('dog').sentence, 'm'), plain(sentenceOf('bus').sentence, 'm')) },
      { text: bus.steps.join(' '), speak: bus.speak, visual: bus.visual },
      { ...line('Read every word of the sentence.'), visual: cat.visual },
    );
  },
  oracle: 'earlyWords',
};

// ---- E.7 Read and answer ----
// Levels: a sentence with one character, 2 pictures / two characters, 3 pictures, one of them the other character.
// Read: the sentence is never spoken, and the pictures are silent.

function readExplanation(entry: WhoSentence): Explanation {
  return { speak: [entry.sentence, entry.ask, 'The', { word: entry.answer.word }, '.'], steps: [entry.sentence, `${entry.ask} The ${entry.answer.word}.`], visual: row(plain(entry.sentence, 'm'), shown(entry.answer)) };
}

function readAnswer(level: Level, rng: Rng): QuestionDraft {
  const entry = rng.pick(WHO_SENTENCES.filter((each) => (level === 1 ? each.others.length === 0 : each.others.length > 0)));
  const inSentence = [entry.answer, ...entry.others].map((each) => each.word);
  const extra = rng.sample(WHO_CHARACTERS.filter((each) => !inSentence.includes(each.word)), 1);
  const options = rng.shuffle([entry.answer, ...entry.others, ...extra]);
  return {
    type: 'choice',
    mode: 'read',
    facts: { relation: 'whoDid', target: entry.answer.word, story: entry.sentence, ask: entry.ask, read: [entry.sentence], options: options.map((each) => each.word) },
    prompt: { text: `Read the sentence. ${entry.ask}`, speak: ['Read the sentence.', entry.ask] },
    stimulus: plain(entry.sentence, 'l'),
    options: options.map((each) => silent(each.emoji)),
    answerIndex: options.indexOf(entry.answer),
    explanation: readExplanation(entry),
  };
}

const whoOf = (sentence: string): WhoSentence => WHO_SENTENCES.find((each) => each.sentence === sentence) as WhoSentence;

export const readAnswerGenerator: SkillGenerator = {
  skillId: 'E-K-E7',
  maxLevel: 2,
  itemTypes: ['choice'],
  lists: ['h3-stories'],
  generate: readAnswer,
  exampleSeed: 4371,
  example: () => readAnswer(1, makeRng(4371)),
  lesson: () => {
    const frog = readExplanation(whoOf('The frog hops on a log.'));
    const boy = readExplanation(whoOf('The boy feeds the pig.'));
    return beats(
      { ...line('Read the sentence. Then answer the question about it.'), visual: plain('The frog hops on a log.', 'l') },
      { text: frog.steps.join(' '), speak: ['Who hops?', ...frog.speak], visual: frog.visual },
      { text: 'Read the sentence. Who gets fed?', speak: ['Read the sentence. Who gets fed?'], visual: row(plain('The boy feeds the pig.', 'l'), silent('👦'), silent('🐷')) },
      { text: boy.steps.join(' '), speak: boy.speak, visual: boy.visual },
      { ...line('Look back at the sentence to find the answer.'), visual: frog.visual },
    );
  },
  oracle: 'earlyWords',
};
