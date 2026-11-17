// Sound lists for plan section 15 wave H3: kindergarten A.3, B.10 and B.12.

// ---- Count the sounds (kindergarten B.10) ----
// Each word split into its sounds. Letters that work together for one sound stay together:
// fish is f-i-sh, three sounds from four letters. The voice says only the whole word.

export interface SoundSplit {
  word: string;
  sounds: readonly string[];
  emoji: string;
}

const SPLIT_ROWS: [string, string][] = [
  // two sounds
  ['b-ee', '🐝'], ['k-ey', '🔑'], ['sh-oe', '👟'], ['c-ow', '🐄'], ['e-gg', '🥚'], ['p-ie', '🥧'], ['t-ie', '👔'], ['i-ce', '🧊'],
  // three sounds, one letter for each
  ['c-a-t', '🐱'], ['d-o-g', '🐶'], ['s-u-n', '☀️'], ['b-u-s', '🚌'], ['p-i-g', '🐷'], ['b-e-d', '🛏️'], ['h-a-t', '🎩'], ['m-a-p', '🗺️'], ['c-u-p', '🥤'], ['w-e-b', '🕸️'],
  // three sounds, more letters
  ['f-i-sh', '🐟'], ['sh-i-p', '🚢'], ['b-a-th', '🛁'], ['m-oo-n', '🌙'], ['b-oa-t', '⛵'], ['g-oa-t', '🐐'], ['c-a-ke', '🍰'], ['s-oa-p', '🧼'], ['r-ai-n', '🌧️'], ['d-u-ck', '🦆'], ['s-o-ck', '🧦'],
  // four sounds
  ['f-r-o-g', '🐸'], ['h-a-n-d', '✋'], ['d-r-u-m', '🥁'], ['c-r-a-b', '🦀'], ['f-l-a-g', '🚩'], ['t-e-n-t', '⛺'], ['m-i-l-k', '🥛'], ['g-i-f-t', '🎁'],
  ['s-n-a-ke', '🐍'], ['t-r-ai-n', '🚂'], ['s-p-oo-n', '🥄'], ['t-r-u-ck', '🚚'], ['c-l-o-ck', '🕐'],
];

export const SOUND_SPLITS: readonly SoundSplit[] = SPLIT_ROWS.map(([split, emoji]) => ({ word: split.replace(/-/g, ''), sounds: split.split('-'), emoji }));

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
