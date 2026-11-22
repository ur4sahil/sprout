import type { SoundKey } from '../../../../engine/letterSounds';
import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Explanation, Level, QuestionDraft, Say, SortBin } from '../../../../engine/types';
import type { PartPicture } from '../../../data/h4-phonics';
import { END_PART_READ, END_PART_WORDS, END_PARTS, ENDING_NAMES, ENDING_SENTENCES, ENDINGS, PLAIN_VERBS, Y_AS_E, Y_AS_I } from '../../../data/h4-phonics';
import type { SkillGenerator } from '../../../generator';
import { cap, row } from '../pk/parts';
import { choice, explain, lesson, pic, plain, said, sort } from './h4-parts';
import type { Line } from './wording';
import { gapSay, hint, line, shownSound, soundRun, spell } from './wording';

// Language Arts grade 1 A.6 to A.8 (plan section 15 wave H4). Oracle: h4ela.

// ---- A.6 Endings s, ed, ing ----
// Levels: find the word with an ending / pick the word that fits a sentence with a clue / find the root word.

// The clue in each sentence, named as a word, and the ending it calls for, spelled out.
function clueLine(ending: 's' | 'ed' | 'ing', name: string): Line {
  if (ending === 'ed') return line('The word yesterday tells us it already happened, so add ed.', ['The word', { word: 'yesterday' }, 'tells us it already happened, so add', ...spell('ed'), '.']);
  if (ending === 'ing') return line('The words right now tell us it is happening now, so add ing.', ['The words right now tell us it is happening now, so add', ...spell('ing'), '.']);
  return line(`It happens every day, and ${name} is one person, so add s.`, [`It happens every day, and ${name} is one person, so add`, { letter: 's' }, '.']);
}
const endingSay = (ending: string): Say => ['Which word ends with', ...spell(ending), '?'];

function endings(level: Level, rng: Rng): QuestionDraft {
  const verb = rng.pick(PLAIN_VERBS);
  const ending = rng.pick(ENDINGS);
  const right = `${verb}${ending}`;
  if (level === 1) {
    const options = rng.shuffle(ENDINGS.map((each) => `${verb}${each}`));
    const why = line(`${cap(right)} is ${verb} with ${ending} on the end.`, [{ word: cap(right) }, 'is', { word: verb }, 'with', ...spell(ending), 'on the end.']);
    return choice({
      prompt: `Which word ends with ${ending}?`,
      speak: endingSay(ending),
      mode: 'read',
      options,
      right,
      facts: { relation: 'ending', target: ending, read: options },
      why: explain([why], plain(`${verb} + ${ending} = ${right}`, 'xl'), undefined, hint('Look at the last letters of each word.')),
    });
  }
  if (level === 2) {
    const name = rng.pick(ENDING_NAMES);
    const sentence = ENDING_SENTENCES[ending].replace('NAME', name);
    const options = rng.shuffle(ENDINGS.map((each) => `${verb}${each}`));
    const done = sentence.replace('___', right);
    return choice({
      prompt: 'Which word fits the sentence?',
      speak: ['Which word fits the sentence?', gapSay(sentence)],
      options,
      right,
      size: 'l',
      facts: { relation: 'endingSentence', target: sentence, base: verb },
      stimulus: { ...plain(sentence), speak: [gapSay(sentence)] },
      why: explain([clueLine(ending, name), done], said(done), undefined, hint('Look for the words that tell when it happens.')),
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
    why: explain(
      [line(`Take ${ending} off ${right}.`, ['Take', ...spell(ending), 'off', { word: right }, '.']), `The root word is ${verb}.`],
      plain(`${right} − ${ending} = ${verb}`, 'xl'),
      ['Take the ending off', { word: right }, '. The root word is', { word: verb }, '.'],
      hint('Cover the ending. What word is left?'),
    ),
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

// The sounds a letter group makes: ck is one sound, /k/; nk is two, /ng/ /k/.
const PART_SOUNDS: Record<string, readonly SoundKey[]> = { ck: ['ck'], ng: ['ng'], nk: ['ng', 'k'], oi: ['oi'], oy: ['oy'], ou: ['ou'], ow: ['ow'] };

const toldOf = (entry: PartPicture): string => (entry.word.endsWith(entry.part) ? 'ends with' : entry.word.startsWith(entry.part) ? 'starts with' : 'has');

// "Ring ends with ng: /ng/.", said with the letters, then the sound.
export function partLine(entry: PartPicture): Line {
  const told = toldOf(entry);
  const tail = told === 'has' ? ' in the middle' : '';
  const sounds = soundRun(PART_SOUNDS[entry.part] ?? []);
  return line(`${cap(entry.word)} ${told} ${entry.part}${tail}: ${sounds.text}.`, [{ word: cap(entry.word) }, told, ...spell(entry.part), `${tail}:`.trim(), ...sounds.say, '.']);
}

const LISTEN_END = hint('Say the word slowly. Listen to its last sound.');

function partWhy(entry: PartPicture): Explanation {
  return explain([partLine(entry)], row(pic(entry.emoji), plain(entry.word, 'xl')), undefined, LISTEN_END);
}

// A picture and its word with a gap; the word is heard, never shown whole. Grade 2 A.4 uses it too, with its
// own explanation. The letters are chosen first, so each is right about as often as the others.
export function missingPart(shown: readonly string[], words: readonly PartPicture[], rng: Rng, why: (entry: PartPicture) => Explanation = partWhy): QuestionDraft {
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
    why: why(entry),
  });
}

function endParts(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const part = rng.pick(END_PARTS);
    const options = rng.shuffle(END_PARTS.map((each) => rng.pick(END_PART_READ.filter((entry) => entry.part === each)).word));
    const right = options.find((each) => each.endsWith(part)) as string;
    const sounds = soundRun(PART_SOUNDS[part] ?? []);
    const why = line(`${cap(right)} ends with ${part}: ${sounds.text}.`, [{ word: cap(right) }, 'ends with', ...spell(part), ':', ...sounds.say, '.']);
    return choice({
      prompt: `Which word ends with ${part}?`,
      speak: endingSay(part),
      mode: 'read',
      options,
      right,
      facts: { relation: 'endsWith', target: part, read: options },
      why: explain([why], plain(right, 'xl'), ['It ends with', ...spell(part), '.'], hint('Look at the last two letters of each word.')),
    });
  }
  return missingPart(level === 1 ? END_PARTS.slice(0, 2) : END_PARTS, END_PART_WORDS, rng);
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
// Levels: sort 4 words / sort 6 words / pick the word where y says /ē/ or /ī/. Read, never spoken.

const Y_SOUND: Record<'e' | 'i', SoundKey> = { e: 'long-e', i: 'long-i' };
const Y_BINS: SortBin[] = [
  { label: `y says ${shownSound('long-e')}`, speak: [{ letter: 'y' }, 'says', { sound: 'long-e' }] },
  { label: `y says ${shownSound('long-i')}`, speak: [{ letter: 'y' }, 'says', { sound: 'long-i' }] },
];
// The rule the h4ela oracle checks: y says /ī/ when it is the word's only vowel, /ē/ when another vowel comes first.
const Y_LINES: Line[] = [
  line(`When y is the only vowel, as in my, it says ${shownSound('long-i')}.`, ['When', { letter: 'y' }, 'is the only vowel, as in', { word: 'my' }, ', it says', { sound: 'long-i' }, '.']),
  line(`When another vowel comes before it, as in happy, it says ${shownSound('long-e')}.`, ['When another vowel comes before it, as in', { word: 'happy' }, ', it says', { sound: 'long-e' }, '.']),
];
const yWhy = explain(Y_LINES, plain('my   happy', 'xl'), undefined, hint('Look for another vowel before the y.'));

function yVowel(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const sound = rng.pick(['e', 'i'] as const);
    const [own, other] = sound === 'e' ? [Y_AS_E, Y_AS_I] : [Y_AS_I, Y_AS_E];
    const right = rng.pick(own);
    const options = rng.shuffle([right, ...rng.sample(other, 2)]);
    return choice({
      prompt: `In which word does y say ${shownSound(Y_SOUND[sound])}?`,
      speak: ['In which word does', { letter: 'y' }, 'say', { sound: Y_SOUND[sound] }, '?'],
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
    prompt: 'Read each word. Put it with the sound its y makes.',
    speak: ['Read each word. Put it with the sound its', { letter: 'y' }, 'makes.'],
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
