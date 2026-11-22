// Sound lists for plan section 15 wave H3: kindergarten A.3, B.10 and B.12.

// ---- Count the sounds (kindergarten B.10) ----
// Each word split into its sounds. Letters that work together for one sound stay together:
// fish is f-i-sh, three sounds from four letters. The screen shows the split; the voice says each sound with the
// recorded letter sounds (src/engine/letterSounds.ts). `keys` names those sounds where a part is not one of them
// as written: the ey in key is long e, the a in cake is long a, the ce in ice is /s/. Moon, spoon and shoe are left
// out: their /oo/ has no recording.

export interface SoundSplit {
  word: string;
  sounds: readonly string[]; // the letters of each sound, as the screen shows them
  keys: readonly string[]; // the letter sound of each part, as the voice says it
  emoji: string;
}

const SPLIT_ROWS: [string, string, string?][] = [
  // two sounds
  ['b-ee', '🐝'], ['k-ey', '🔑', 'k long-e'], ['b-oy', '👦'], ['c-ow', '🐄'], ['e-gg', '🥚', 'e g'], ['p-ie', '🥧'], ['t-ie', '👔'], ['i-ce', '🧊', 'long-i s'],
  // three sounds, one letter for each
  ['c-a-t', '🐱'], ['d-o-g', '🐶'], ['s-u-n', '☀️'], ['b-u-s', '🚌'], ['p-i-g', '🐷'], ['b-e-d', '🛏️'], ['h-a-t', '🎩'], ['m-a-p', '🗺️'], ['c-u-p', '🥤'], ['w-e-b', '🕸️'],
  // three sounds, more letters
  ['f-i-sh', '🐟'], ['sh-i-p', '🚢'], ['b-a-th', '🛁'], ['r-i-ng', '💍'], ['b-oa-t', '⛵'], ['g-oa-t', '🐐'], ['c-a-ke', '🍰', 'c long-a k'], ['s-oa-p', '🧼'], ['r-ai-n', '🌧️'], ['d-u-ck', '🦆'], ['s-o-ck', '🧦'],
  // four sounds
  ['f-r-o-g', '🐸'], ['h-a-n-d', '✋'], ['d-r-u-m', '🥁'], ['c-r-a-b', '🦀'], ['f-l-a-g', '🚩'], ['t-e-n-t', '⛺'], ['m-i-l-k', '🥛'], ['g-i-f-t', '🎁'],
  ['s-n-a-ke', '🐍', 's n long-a k'], ['t-r-ai-n', '🚂'], ['c-l-ou-d', '☁️'], ['t-r-u-ck', '🚚'], ['c-l-o-ck', '🕐'],
];

export const SOUND_SPLITS: readonly SoundSplit[] = SPLIT_ROWS.map(([split, emoji, keys]) => ({ word: split.replace(/-/g, ''), sounds: split.split('-'), keys: (keys ?? split.replace(/-/g, ' ')).split(' '), emoji }));

// ---- More claps (kindergarten B.12) ----
// Longer words than the syllables list, split into their claps. The voice says only the whole word.

export interface ClapWord {
  word: string;
  parts: readonly string[];
  emoji: string;
}

const CLAP_ROWS: [string, string][] = [
  ['pen-cil', '✏️'], ['cup-cake', '🧁'], ['ro-bot', '🤖'], ['pan-da', '🐼'], ['pop-corn', '🍿'], ['sand-wich', '🥪'],
  ['kan-ga-roo', '🦘'], ['pine-ap-ple', '🍍'], ['ham-bur-ger', '🍔'], ['com-pu-ter', '💻'], ['la-dy-bug', '🐞'],
  ['wa-ter-mel-on', '🍉'], ['al-li-ga-tor', '🐊'], ['mo-tor-cy-cle', '🏍️'], ['hel-i-cop-ter', '🚁'], ['av-o-ca-do', '🥑'], ['tel-e-vi-sion', '📺'],
];

export const CLAP_WORDS: readonly ClapWord[] = CLAP_ROWS.map(([split, emoji]) => ({ word: split.replace(/-/g, ''), parts: split.split('-'), emoji }));

// ---- Match big and small words (kindergarten A.3) ----
// Words that differ only in the vowel: pan, pen, pin. Shown together, the child must look at every letter.

export const VOWEL_SETS: readonly (readonly string[])[] = [
  ['pan', 'pen', 'pin'],
  ['bag', 'big', 'bug'],
  ['hat', 'hit', 'hot', 'hut'],
  ['cap', 'cop', 'cup'],
  ['tan', 'ten', 'tin'],
  ['pat', 'pet', 'pit', 'pot'],
  ['bat', 'bet', 'bit', 'but'],
  ['fan', 'fin', 'fun'],
  ['sat', 'set', 'sit'],
  ['rag', 'rig', 'rug'],
];
