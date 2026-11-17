import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Level, QuestionDraft, SortBin, Visual } from '../../../../engine/types';
import type { PartPicture } from '../../../data/h4-phonics';
import { C_HARD, C_SOFT, G_HARD, G_SOFT, NOT_SILENT, SILENT_PICTURES, SILENT_WORDS, SOUND_TEAM_WORDS, SOUND_TEAMS } from '../../../data/h4-phonics';
import type { SkillGenerator } from '../../../generator';
import { missingPart } from '../g1/h4-phonics';
import { choice, explain, lesson, letters, pic, plain, sort } from '../g1/h4-parts';
import { cap, row } from '../pk/parts';

// Language Arts grade 2 A.4 to A.6 (plan section 15 wave H4). Oracle: h4ela.

// ---- A.4 Vowel sounds oi, oy, ou, ow ----
// Levels: oi or oy / ou or ow / all four. The word is heard, its letters are missing on screen.

function soundTeams(level: Level, rng: Rng): QuestionDraft {
  const shown = level === 1 ? SOUND_TEAMS.slice(0, 2) : level === 2 ? SOUND_TEAMS.slice(2, 4) : SOUND_TEAMS;
  return missingPart(shown, SOUND_TEAM_WORDS, rng);
}

const COIN = SOUND_TEAM_WORDS[0] as PartPicture;
const BOY = SOUND_TEAM_WORDS.find((each) => each.word === 'boy') as PartPicture;
const COW = SOUND_TEAM_WORDS.find((each) => each.word === 'cow') as PartPicture;

export const soundTeamsGenerator: SkillGenerator = {
  skillId: 'E-2-A4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-phonics'],
  pool: { 1: 6 }, // three oi words and three oy words
  generate: soundTeams,
  exampleSeed: 1501,
  example: () => soundTeams(1, makeRng(1501)),
  lesson: lesson(
    ['oi and oy make the same sound, as in coin and boy. ou and ow make the same sound, as in mouse and cow.', row(pic(COIN.emoji), plain('coin', 'xl'))],
    ['Boy ends with oy. Coin has oi in the middle. At the end of a word, use oy.', row(pic(BOY.emoji), plain('boy', 'xl'))],
    ['Which letters are missing in cow?', row(pic(COW.emoji), plain('c__', 'xl')), 'Cow ends with ow.', row(pic(COW.emoji), plain('cow', 'xl'))],
    ['oi and ou often sit in the middle of a word. oy and ow often come at the end.', plain('oi oy ou ow', 'xl')],
  ),
  oracle: 'h4ela',
};

// ---- A.5 Soft and hard c and g ----
// Levels: sort 4 c words / sort 4 g words / sort 6 c and g words. The words are read, never spoken.

const BINS: Record<'c' | 'g' | 'cg', SortBin[]> = {
  c: [
    { label: 'c sounds like s', speak: [{ letter: 'c' }, 'sounds like the start of sun'] },
    { label: 'c sounds like k', speak: [{ letter: 'c' }, 'sounds like the start of kite'] },
  ],
  g: [
    { label: 'g sounds like j', speak: [{ letter: 'g' }, 'sounds like the start of jam'] },
    { label: 'g sounds like g in go', speak: [{ letter: 'g' }, 'sounds like the start of go'] },
  ],
  cg: [
    { label: 'Soft: like s or j', speak: ['Soft, like the start of sun or jam'] },
    { label: 'Hard: like k or g', speak: ['Hard, like the start of kite or go'] },
  ],
};
const SOFT_RULE = 'When e, i or y comes right after c or g, it makes the soft sound.';

function softHard(level: Level, rng: Rng): QuestionDraft {
  const letter = level === 1 ? 'c' : level === 2 ? 'g' : 'cg';
  const each = level === 3 ? 3 : 2;
  const softs = level === 1 ? C_SOFT : level === 2 ? G_SOFT : [...C_SOFT, ...G_SOFT];
  const hards = level === 1 ? C_HARD : level === 2 ? G_HARD : [...C_HARD, ...G_HARD];
  const soft = rng.sample(softs, each);
  const items = rng.shuffle([...soft, ...rng.sample(hards, each)]);
  const example: Visual = plain(letter === 'g' ? 'gem   gum' : 'city   cat', 'xl');
  return sort({
    prompt: 'Read each word. Is the sound soft or hard?',
    mode: 'read',
    items,
    bins: BINS[letter],
    answerBin: items.map((word) => (soft.includes(word) ? 0 : 1)),
    facts: { relation: 'softHard', target: letter, bins: ['soft', 'hard'], read: items },
    why: explain([SOFT_RULE, 'Any other letter after it, or none, makes the hard sound.'], example, [SOFT_RULE, 'Any other letter after it makes the hard sound.']),
  });
}

export const softHardGenerator: SkillGenerator = {
  skillId: 'E-2-A5',
  maxLevel: 3,
  itemTypes: ['sort'],
  lists: ['h4-phonics'],
  generate: softHard,
  exampleSeed: 1502,
  example: () => softHard(1, makeRng(1502)),
  lesson: lesson(
    ['c and g each have two sounds: a hard one and a soft one.', plain('cat   city', 'xl')],
    ['In cat, c sounds like k. In city, an i comes after c, so it sounds like s.', plain('cat   city', 'xl')],
    ['Is the g in gem soft or hard?', plain('gem', 'xl'), 'Soft. e comes after g, so it sounds like j.', plain('gem', 'xl')],
    [SOFT_RULE, plain('ce ci cy  ge gi gy')],
  ),
  oracle: 'h4ela',
};

// ---- A.6 Silent letters kn, wr, mb ----
// Levels: which letter is silent / which spelling names the picture / which word has a silent letter.

const SILENT_RULE = 'In kn the k is silent. In wr the w is silent. In mb the b is silent.';

// The silent letter of a picture word, and the word with it left out or swapped with its neighbour.
function misspellings(word: string): [string, string] {
  if (word.endsWith('mb')) return [word.slice(0, -1), `${word.slice(0, -2)}bm`];
  return [word.slice(1), `${word.charAt(1)}${word.charAt(0)}${word.slice(2)}`];
}

function silentLetters(level: Level, rng: Rng): QuestionDraft {
  if (level === 2) {
    const entry = rng.pick(SILENT_PICTURES);
    const options = rng.shuffle([entry.word, ...misspellings(entry.word)]);
    return choice({
      prompt: 'Which word names the picture?',
      options,
      right: entry.word,
      size: 'xl',
      stimulus: { ...pic(entry.emoji), speak: [{ word: entry.word }] },
      facts: { relation: 'silentSpelling', target: entry.word },
      why: explain([SILENT_RULE, `${cap(entry.word)} is spelled ${entry.word.split('').join(' ')}.`], row(pic(entry.emoji), plain(entry.word, 'xl')), [SILENT_RULE, { word: entry.word }, 'is spelled', ...letters(entry.word), '.']),
    });
  }
  if (level === 3) {
    const entry = rng.pick(SILENT_WORDS);
    const options = rng.shuffle([entry.word, ...rng.sample(NOT_SILENT, 2)]);
    return choice({
      prompt: 'Which word has a silent letter?',
      mode: 'read',
      options,
      right: entry.word,
      size: 'xl',
      facts: { relation: 'hasSilent', target: 'silent', read: options },
      why: explain([SILENT_RULE, `In ${entry.word}, you do not hear the ${entry.silent}.`], plain(entry.word, 'xl'), [SILENT_RULE, 'You do not hear the', { letter: entry.silent }, '.']),
    });
  }
  const entry = rng.pick(SILENT_WORDS);
  const options = rng.shuffle([entry.silent, ...rng.sample(entry.heard, 2)]);
  return choice({
    prompt: `Which letter is silent in ${entry.word}?`,
    speak: ['Which letter is silent in', { word: entry.word }, '?'],
    options,
    right: entry.silent,
    size: 'xl',
    stimulus: { ...plain(entry.word, 'xl'), speak: [{ word: entry.word }] },
    facts: { relation: 'silentLetter', target: entry.word },
    why: explain([SILENT_RULE, `In ${entry.word}, you do not hear the ${entry.silent}.`], plain(entry.word, 'xl'), [SILENT_RULE, 'In', { word: entry.word }, ', you do not hear the', { letter: entry.silent }, '.']),
  });
}

export const silentLettersGenerator: SkillGenerator = {
  skillId: 'E-2-A6',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['h4-phonics'],
  pool: { 2: 7 }, // seven picture words
  generate: silentLetters,
  exampleSeed: 1503,
  example: () => silentLetters(1, makeRng(1503)),
  lesson: lesson(
    ['Some words have a letter you see but do not hear.', plain('knife   write   lamb', 'xl')],
    ['Knife starts with kn. You hear the n, not the k.', plain('knife', 'xl')],
    ['Which letter is silent in write?', plain('write', 'xl'), 'The w. Write starts with the r sound.', plain('write', 'xl')],
    [SILENT_RULE, plain('kn  wr  mb', 'xl')],
  ),
  oracle: 'h4ela',
};
