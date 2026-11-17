import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, Say, SortBin } from '../../../../engine/types';
import type { PartPicture } from '../../../data/h4-phonics';
import { END_PART_READ, END_PART_WORDS, END_PARTS, ENDING_NAMES, ENDING_SENTENCES, ENDINGS, PLAIN_VERBS, Y_AS_E, Y_AS_I } from '../../../data/h4-phonics';
import type { SkillGenerator } from '../../../generator';
import { cap, row } from '../pk/parts';
import { blankSay, choice, explain, letters, lesson, pic, plain, said, sort } from './h4-parts';

// Language Arts grade 1 A.6 to A.8 (plan section 15 wave H4). Oracle: h4ela.

// ---- A.6 Endings s, ed, ing ----
// Levels: find the word with an ending / pick the word that fits a sentence with a clue / find the root word.

const CLUE: Record<'s' | 'ed' | 'ing', string> = {
  ed: 'Yesterday means it already happened, so add ed.',
  ing: 'Is tells us it is happening right now, so add ing.',
  s: 'Every day, and just one person, so add s.',
};
const endingSay = (ending: string): Say => ['Which word ends with', ...letters(ending), '?'];

function endings(level: Level, rng: Rng): QuestionDraft {
  const verb = rng.pick(PLAIN_VERBS);
  const ending = rng.pick(ENDINGS);
  const right = `${verb}${ending}`;
  if (level === 1) {
    const options = rng.shuffle(ENDINGS.map((each) => `${verb}${each}`));
    return choice({
      prompt: `Which word ends with ${ending}?`,
      speak: endingSay(ending),
      mode: 'read',
      options,
      right,
      facts: { relation: 'ending', target: ending, read: options },
      why: explain([`${cap(right)} is ${verb} with ${ending} on the end.`], plain(`${verb} + ${ending} = ${right}`, 'xl'), [{ word: right }, 'is', { word: verb }, 'with', ...letters(ending), 'on the end.']),
    });
  }
  if (level === 2) {
    const sentence = ENDING_SENTENCES[ending].replace('NAME', rng.pick(ENDING_NAMES));
    const options = rng.shuffle(ENDINGS.map((each) => `${verb}${each}`));
    const done = sentence.replace('___', right);
    return choice({
      prompt: 'Which word fits the sentence?',
      speak: ['Which word fits the sentence?', blankSay(sentence)],
      options,
      right,
      size: 'l',
      facts: { relation: 'endingSentence', target: sentence, base: verb },
      stimulus: { ...plain(sentence), speak: [blankSay(sentence)] },
      why: explain([CLUE[ending], done], said(done), [CLUE[ending], done]),
    });
  }
  const options = rng.shuffle([verb, ...ENDINGS.filter((each) => each !== ending).map((each) => `${verb}${each}`)]);
  return choice({
    prompt: `Which is the root word of ${right}?`,
    speak: ['Which is the root word of', { word: right }, '?'],
    mode: 'read',
    options,
    right: verb,
    facts: { relation: 'root', target: right, read: options },
    why: explain([`Take ${ending} off ${right}.`, `The root word is ${verb}.`], plain(`${right} − ${ending} = ${verb}`, 'xl'), ['Take the ending off', { word: right }, '. The root word is', { word: verb }, '.']),
  });
}

export const endingsGenerator: SkillGenerator = {
  skillId: 'E-1-A6',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-phonics'],
  generate: endings,
  exampleSeed: 1401,
  example: () => endings(1, makeRng(1401)),
  lesson: lesson(
    ['An ending can go on the end of an action word: s, ed or ing.', plain('jump  jumps  jumped  jumping')],
    ['Jumped has ed. It already happened. Jumping has ing. It is happening now.', plain('jump + ed = jumped', 'xl')],
    ['What is the root word of playing?', plain('playing', 'xl'), 'Take off ing. The root word is play.', plain('play', 'xl')],
    ['Find the root word, then look at the ending.', plain('jump + ing = jumping')],
  ),
  oracle: 'h4ela',
};

// ---- A.7 Endings ck, ng, nk ----
// Levels: hear a word, pick ck or ng / pick ck, ng or nk / read three words, find the one with the ending.

const gapOf = (entry: PartPicture): string => entry.word.replace(entry.part, '__');
const MISSING = 'Which letters are missing?';

function partWhy(entry: PartPicture): ReturnType<typeof explain> {
  const told = entry.word.endsWith(entry.part) ? 'ends with' : entry.word.startsWith(entry.part) ? 'starts with' : 'has';
  const tail = told === 'has' ? ' in the middle' : '';
  return explain([`${cap(entry.word)} ${told} ${entry.part}${tail}.`], row(pic(entry.emoji), plain(entry.word, 'xl')), [{ word: entry.word }, told, ...letters(entry.part), tail ? 'in the middle.' : '.']);
}

function endParts(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const part = rng.pick(END_PARTS);
    const options = rng.shuffle(END_PARTS.map((each) => rng.pick(END_PART_READ.filter((entry) => entry.part === each)).word));
    const right = options.find((each) => each.endsWith(part)) as string;
    return choice({
      prompt: `Which word ends with ${part}?`,
      speak: endingSay(part),
      mode: 'read',
      options,
      right,
      facts: { relation: 'endsWith', target: part, read: options },
      why: explain([`${cap(right)} ends with ${part}.`], plain(right, 'xl'), ['It ends with', ...letters(part), '.']),
    });
  }
  return missingPart(level === 1 ? END_PARTS.slice(0, 2) : END_PARTS, END_PART_WORDS, rng);
}

// A picture and its word with a gap; the word is heard, never shown whole. Grade 2 A.4 uses it too.
// The letters are chosen first, so each is right about as often as the others.
export function missingPart(shown: readonly string[], words: readonly PartPicture[], rng: Rng): QuestionDraft {
  const part = rng.pick(shown);
  const entry = rng.pick(words.filter((each) => each.part === part));
  return choice({
    prompt: MISSING,
    speak: ['Which letters are missing in', { word: entry.word }, '?'],
    mode: 'listen',
    fixedOrder: true,
    options: shown,
    right: part,
    facts: { relation: 'part', target: entry.word },
    stimulus: row(pic(entry.emoji), plain(gapOf(entry), 'xl')),
    why: partWhy(entry),
  });
}

const DUCK = END_PART_WORDS[0] as PartPicture;
const RING = END_PART_WORDS.find((each) => each.word === 'ring') as PartPicture;

export const endPartsGenerator: SkillGenerator = {
  skillId: 'E-1-A7',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-phonics'],
  generate: endParts,
  exampleSeed: 1402,
  example: () => endParts(1, makeRng(1402)),
  lesson: lesson(
    ['Some words end with two letters that go together: ck, ng or nk.', row(pic(DUCK.emoji), plain('duck', 'xl'))],
    ['Duck ends with ck. Ring ends with ng.', row(pic(RING.emoji), plain('ring', 'xl'))],
    ['Which letters are missing in sock?', plain('so__', 'xl'), 'Sock ends with ck.', plain('sock', 'xl')],
    ['Say the word slowly and listen to the end.', plain('ck  ng  nk', 'xl')],
  ),
  oracle: 'h4ela',
};

// ---- A.8 Y as a vowel ----
// Levels: sort 4 words / sort 6 words / pick the word where y sounds like e or like i. Read, never spoken.

const Y_BINS: SortBin[] = [
  { label: 'y sounds like e', speak: [{ letter: 'y' }, 'sounds like', { letter: 'e' }] },
  { label: 'y sounds like i', speak: [{ letter: 'y' }, 'sounds like', { letter: 'i' }] },
];
const Y_RULE = ['In a short word like my, y sounds like i.', 'At the end of a longer word like happy, y sounds like e.'];
const yWhy = explain(Y_RULE, plain('my   happy', 'xl'), [{ word: 'my' }, 'has', { letter: 'y' }, 'sounding like', { letter: 'i' }, '.', { word: 'happy' }, 'has', { letter: 'y' }, 'sounding like', { letter: 'e' }, '.']);

function yVowel(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const sound = rng.pick(['e', 'i']);
    const [own, other] = sound === 'e' ? [Y_AS_E, Y_AS_I] : [Y_AS_I, Y_AS_E];
    const right = rng.pick(own);
    const options = rng.shuffle([right, ...rng.sample(other, 2)]);
    return choice({
      prompt: `In which word does y sound like ${sound}?`,
      speak: ['In which word does', { letter: 'y' }, 'sound like', { letter: sound }, '?'],
      mode: 'read',
      options,
      right,
      facts: { relation: 'yChoice', target: sound, read: options },
      why: yWhy,
    });
  }
  const each = level === 1 ? 2 : 3;
  const eWords = rng.sample(Y_AS_E, each);
  const iWords = rng.sample(Y_AS_I, each);
  const items = rng.shuffle([...eWords, ...iWords]);
  return sort({
    prompt: 'Read each word. How does its y sound?',
    mode: 'read',
    items,
    bins: Y_BINS,
    answerBin: items.map((word) => (eWords.includes(word) ? 0 : 1)),
    facts: { relation: 'ySort', target: 'y', bins: ['e', 'i'], read: items },
    why: yWhy,
  });
}

export const yVowelGenerator: SkillGenerator = {
  skillId: 'E-1-A8',
  maxLevel: 3,
  itemTypes: ['sort', 'choice'],
  lists: ['h4-phonics'],
  generate: yVowel,
  exampleSeed: 1403,
  example: () => yVowel(1, makeRng(1403)),
  lesson: lesson(
    ['At the end of a word, y can sound like e or like i.', plain('fly   baby', 'xl')],
    ['In fly, y sounds like i. In baby, y sounds like e.', plain('fly   baby', 'xl')],
    ['How does y sound in sky?', plain('sky', 'xl'), 'In sky, y sounds like i.', plain('sky', 'xl')],
    ['Short word: y sounds like i. Longer word: y sounds like e.', plain('my   happy', 'xl')],
  ),
  oracle: 'h4ela',
};
