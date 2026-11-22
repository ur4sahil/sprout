import type { SoundKey } from '../../../../engine/letterSounds';
import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Explanation, Level, QuestionDraft, Say, SortBin, Visual } from '../../../../engine/types';
import type { PartPicture } from '../../../data/h4-phonics';
import { C_HARD, C_SOFT, G_HARD, G_SOFT, NOT_SILENT, SILENT_PICTURES, SILENT_WORDS, SOUND_TEAM_WORDS, SOUND_TEAMS } from '../../../data/h4-phonics';
import type { SkillGenerator } from '../../../generator';
import { missingPart, partLine } from '../g1/h4-phonics';
import { choice, explain, lesson, pic, plain, sort } from '../g1/h4-parts';
import type { Line } from '../g1/wording';
import { groups, hint, line, shownSound, spell } from '../g1/wording';
import { cap, row } from '../pk/parts';

// Language Arts grade 2 A.4 to A.6 (plan section 15 wave H4). Oracle: h4ela.

// ---- A.4 Vowel sounds oi, oy, ou, ow ----
// Levels: oi or oy / ou or ow / all four. The word is heard, its letters are missing on screen.

// oi and oy say the same sound, and so do ou and ow: the steps say the sound, then where each spelling goes, as
// the lesson teaches (oy and ow at the end of a word, oi and ou inside it, ow before n or l). Oyster breaks the
// rule, and its step says so.
const PARTNER: Record<string, string> = { oi: 'oy', oy: 'oi', ou: 'ow', ow: 'ou' };
const SOUND: Record<string, SoundKey> = { oi: 'oi', oy: 'oi', ou: 'ou', ow: 'ou' };

function placeRule(entry: PartPicture): Line | null {
  const { part, word } = entry;
  if ((part === 'oy' || part === 'ow') && word.endsWith(part)) return line(`At the end of a word, use ${part}.`, ['At the end of a word, use', ...spell(part), '.']);
  if (part === 'ow') return line('Before n or l, use ow.', ['Before', { letter: 'n' }, 'or', { letter: 'l' }, ', use', ...spell('ow'), '.']);
  if (part === 'oi') return line('At the start or in the middle of a word, use oi.', ['At the start or in the middle of a word, use', ...spell('oi'), '.']);
  if (part === 'ou') return line('In the middle of a word, use ou.', ['In the middle of a word, use', ...spell('ou'), '.']);
  return line(`Most words use oi at the start, but ${word} uses oy.`, ['Most words use', ...spell('oi'), 'at the start, but', { word }, 'uses', ...spell('oy'), '.']);
}

function soundTeamWhy(entry: PartPicture): Explanation {
  const partner = PARTNER[entry.part] as string;
  const sound = SOUND[entry.part] as SoundKey;
  const pair = [entry.part, partner].sort();
  const both = line(`The letters ${pair[0]} and ${pair[1]} both say ${shownSound(sound)}.`, ['The letters', ...groups(pair), 'both say', { sound }, '.']);
  const rule = placeRule(entry);
  return explain([partLine(entry), both, ...(rule ? [rule] : [])], row(pic(entry.emoji), plain(entry.word, 'xl')), undefined, hint('Listen to the word. Is the sound at the end, or inside the word?'));
}

function soundTeams(level: Level, rng: Rng): QuestionDraft {
  const shown = level === 1 ? SOUND_TEAMS.slice(0, 2) : level === 2 ? SOUND_TEAMS.slice(2, 4) : SOUND_TEAMS;
  return missingPart(shown, SOUND_TEAM_WORDS, rng, soundTeamWhy);
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

// The groups are named soft and hard, as the question is, with the sound each makes.
const BINS: Record<'c' | 'g' | 'cg', SortBin[]> = {
  c: [
    { label: `Soft c: ${shownSound('s')}`, speak: ['Soft', { letter: 'c' }, ',', { sound: 's' }] },
    { label: `Hard c: ${shownSound('c')}`, speak: ['Hard', { letter: 'c' }, ',', { sound: 'c' }] },
  ],
  g: [
    { label: `Soft g: ${shownSound('j')}`, speak: ['Soft', { letter: 'g' }, ',', { sound: 'j' }] },
    { label: `Hard g: ${shownSound('g')}`, speak: ['Hard', { letter: 'g' }, ',', { sound: 'g' }] },
  ],
  cg: [
    { label: `Soft: ${shownSound('s')} or ${shownSound('j')}`, speak: ['Soft,', { sound: 's' }, 'or', { sound: 'j' }] },
    { label: `Hard: ${shownSound('c')} or ${shownSound('g')}`, speak: ['Hard,', { sound: 'c' }, 'or', { sound: 'g' }] },
  ],
};
const SOFT_RULE = 'When e, i or y comes right after c or g, it makes the soft sound.';
// The letter the question is about, written and said: "c", "g", or "c or g".
const LETTER_SAY: Record<'c' | 'g' | 'cg', Say> = { c: [{ letter: 'c' }], g: [{ letter: 'g' }], cg: [{ letter: 'c' }, 'or', { letter: 'g' }] };
const LETTER_TEXT: Record<'c' | 'g' | 'cg', string> = { c: 'c', g: 'g', cg: 'c or g' };
const EIY: Say = [{ letter: 'e' }, ',', { letter: 'i' }, 'or', { letter: 'y' }];

// The rule for the letter asked about, with the sounds said and a word for each.
function softHardLines(letter: 'c' | 'g' | 'cg'): Line[] {
  if (letter === 'cg') {
    return [
      line(`When e, i or y comes right after c or g, it is soft: ${shownSound('s')} or ${shownSound('j')}.`, ['When', ...EIY, 'comes right after', ...LETTER_SAY.cg, ', it is soft:', { sound: 's' }, 'or', { sound: 'j' }, '.']),
      line(`Any other letter after it, or no letter, makes it hard: ${shownSound('c')} or ${shownSound('g')}.`, ['Any other letter after it, or no letter, makes it hard:', { sound: 'c' }, 'or', { sound: 'g' }, '.']),
    ];
  }
  const [soft, hard, softWord, hardWord] = letter === 'c' ? (['s', 'c', 'city', 'cat'] as const) : (['j', 'g', 'gem', 'gum'] as const);
  return [
    line(`When e, i or y comes right after ${letter}, the ${letter} is soft: ${shownSound(soft)}, as in ${softWord}.`, ['When', ...EIY, 'comes right after', { letter }, ', the', { letter }, 'is soft:', { sound: soft }, ', as in', { word: softWord }, '.']),
    line(`Any other letter after it, or no letter, makes the ${letter} hard: ${shownSound(hard)}, as in ${hardWord}.`, ['Any other letter after it, or no letter, makes the', { letter }, 'hard:', { sound: hard }, ', as in', { word: hardWord }, '.']),
  ];
}

function softHard(level: Level, rng: Rng): QuestionDraft {
  const letter = level === 1 ? 'c' : level === 2 ? 'g' : 'cg';
  const each = level === 3 ? 3 : 2;
  const softs = level === 1 ? C_SOFT : level === 2 ? G_SOFT : [...C_SOFT, ...G_SOFT];
  const hards = level === 1 ? C_HARD : level === 2 ? G_HARD : [...C_HARD, ...G_HARD];
  const soft = rng.sample(softs, each);
  const items = rng.shuffle([...soft, ...rng.sample(hards, each)]);
  const example: Visual = plain(letter === 'g' ? 'gem   gum' : 'city   cat', 'xl');
  return sort({
    prompt: `Read each word. Is its ${LETTER_TEXT[letter]} soft or hard? Put it in that group.`,
    speak: ['Read each word. Is its', ...LETTER_SAY[letter], 'soft or hard? Put it in that group.'],
    mode: 'read',
    items,
    bins: BINS[letter],
    answerBin: items.map((word) => (soft.includes(word) ? 0 : 1)),
    facts: { relation: 'softHard', target: letter, bins: ['soft', 'hard'], read: items },
    why: explain(softHardLines(letter), example, undefined, hint(`Look at the letter right after the ${LETTER_TEXT[letter]}.`, ['Look at the letter right after the', ...LETTER_SAY[letter], '.'])),
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
// Each word's own rule only: the letters it has, the sound you hear, and the letter you do not.
const GROUPS = { kn: { silent: 'k', heard: 'n' }, wr: { silent: 'w', heard: 'r' }, mb: { silent: 'b', heard: 'm' } } as const;
const groupOf = (word: string): keyof typeof GROUPS => (word.startsWith('kn') ? 'kn' : word.startsWith('wr') ? 'wr' : 'mb');

function hasLine(word: string): Line {
  const group = groupOf(word);
  const told = group === 'mb' ? 'ends with' : 'starts with';
  return line(`${cap(word)} ${told} ${group}.`, [{ word: cap(word) }, told, ...spell(group), '.']);
}
function silentLine(word: string): Line {
  const { silent, heard } = GROUPS[groupOf(word)];
  return line(`You hear ${shownSound(heard)}, not the ${silent}. The ${silent} is silent.`, ['You hear', { sound: heard }, ', not the', { letter: silent }, '. The', { letter: silent }, 'is silent.']);
}

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
      why: explain(
        [hasLine(entry.word), silentLine(entry.word), line(`${cap(entry.word)} is spelled ${entry.word.split('').join(', ')}.`, [{ word: cap(entry.word) }, 'is spelled', ...spell(entry.word), '.'])],
        row(pic(entry.emoji), plain(entry.word, 'xl')),
        undefined,
        hint('Tap the picture to hear its name. Some words have a letter you do not hear.'),
      ),
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
      why: explain([hasLine(entry.word), silentLine(entry.word)], plain(entry.word, 'xl'), undefined, hint('Look for kn, wr or mb in a word.', ['Look for', ...groups(['kn', 'wr', 'mb'], 'or'), 'in a word.'])),
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
    why: explain([hasLine(entry.word), silentLine(entry.word)], plain(entry.word, 'xl'), undefined, hint('Say the word. Which letter do you see but not hear?')),
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
