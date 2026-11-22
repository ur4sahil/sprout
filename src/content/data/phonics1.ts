// Grade 1 phonics lists (plan section 9).

export interface PartWord {
  word: string;
  part: string; // the letters the skill is about: sh in ship, fr in frog, ai in rain
  emoji: string;
}

const rows = (list: [string, string, string][]): readonly PartWord[] => list.map(([word, part, emoji]) => ({ word, part, emoji }));

export const DIGRAPHS: readonly string[] = ['sh', 'ch', 'th', 'wh'];
export const DIGRAPH_STARTS = rows([['ship', 'sh', '🚢'], ['shoe', 'sh', '👟'], ['shell', 'sh', '🐚'], ['sheep', 'sh', '🐑'], ['cheese', 'ch', '🧀'], ['chick', 'ch', '🐥'], ['cherry', 'ch', '🍒'], ['thumb', 'th', '👍'], ['whale', 'wh', '🐋']]);
// Seven words, so that level declares a pool of 7. No word ends in wh.
export const DIGRAPH_ENDS = rows([['fish', 'sh', '🐟'], ['dish', 'sh', '🍽️'], ['brush', 'sh', '🖌️'], ['peach', 'ch', '🍑'], ['beach', 'ch', '🏖️'], ['bath', 'th', '🛁'], ['tooth', 'th', '🦷']]);

export const BLEND_STARTS = rows([['frog', 'fr', '🐸'], ['flag', 'fl', '🚩'], ['star', 'st', '⭐'], ['snake', 'sn', '🐍'], ['drum', 'dr', '🥁'], ['crab', 'cr', '🦀'], ['clock', 'cl', '🕐'], ['plane', 'pl', '✈️'], ['spoon', 'sp', '🥄'], ['truck', 'tr', '🚚'], ['grapes', 'gr', '🍇']]);
export const BLEND_ENDS = rows([['hand', 'nd', '✋'], ['milk', 'lk', '🥛'], ['tent', 'nt', '⛺'], ['gift', 'ft', '🎁'], ['ant', 'nt', '🐜'], ['mask', 'sk', '😷'], ['bank', 'nk', '🏦'], ['plant', 'nt', '🌱']]);

// A short-vowel word and the long-vowel word an e on the end makes.
export const SILENT_E_PAIRS: readonly (readonly [string, string])[] = [['cap', 'cape'], ['kit', 'kite'], ['tub', 'tube'], ['pin', 'pine'], ['can', 'cane'], ['hop', 'hope'], ['cub', 'cube'], ['man', 'mane'], ['not', 'note']];
export const SILENT_E_PICTURES: readonly { word: string; emoji: string }[] = [
  { word: 'cap', emoji: '🧢' },
  { word: 'pin', emoji: '📌' },
  { word: 'pine', emoji: '🌲' },
  { word: 'can', emoji: '🥫' },
  { word: 'man', emoji: '👨' },
  { word: 'note', emoji: '📝' },
];

export const VOWEL_TEAMS_LIST: readonly string[] = ['ai', 'ee', 'oa'];
export const VOWEL_TEAM_WORDS = rows([['rain', 'ai', '🌧️'], ['train', 'ai', '🚂'], ['snail', 'ai', '🐌'], ['bee', 'ee', '🐝'], ['tree', 'ee', '🌳'], ['sheep', 'ee', '🐑'], ['boat', 'oa', '⛵'], ['goat', 'oa', '🐐'], ['soap', 'oa', '🧼']]);

// Compound words are built from word tiles with a picture, never matched half to half:
// halves cross-match into other real words, such as snowball and sunfish.
export interface Compound {
  first: string;
  second: string;
  emoji: string;
}
export const COMPOUNDS: readonly Compound[] = (
  [['sun', 'flower', '🌻'], ['rain', 'bow', '🌈'], ['cup', 'cake', '🧁'], ['foot', 'ball', '🏈'], ['butter', 'fly', '🦋'], ['snow', 'man', '⛄'], ['pop', 'corn', '🍿'], ['lady', 'bug', '🐞'], ['pan', 'cake', '🥞'], ['basket', 'ball', '🏀'], ['pine', 'apple', '🍍'], ['mail', 'box', '📫']] as [string, string, string][]
).map(([first, second, emoji]) => ({ first, second, emoji }));

export const NOUNS: readonly string[] = ['dog', 'ball', 'tree', 'bed', 'girl', 'car'];
export const VERBS: readonly string[] = ['run', 'jump', 'eat', 'sing', 'read', 'swim'];
export const ADJECTIVES: readonly string[] = ['big', 'red', 'soft', 'tall', 'cold', 'happy', 'loud', 'tiny'];

// A picture that stands for a describing word. Big and tall are never offered together.
export const DESCRIBING_PICTURES: readonly { word: string; emoji: string }[] = [
  { word: 'cold', emoji: '❄️' },
  { word: 'happy', emoji: '😀' },
  { word: 'loud', emoji: '🔊' },
  { word: 'red', emoji: '🍎' },
  { word: 'big', emoji: '🐘' },
  { word: 'tiny', emoji: '🐜' },
  { word: 'tall', emoji: '🦒' },
  { word: 'soft', emoji: '🧸' },
];

export const OPPOSITES_1: readonly (readonly [string, string])[] = [['big', 'small'], ['hot', 'cold'], ['up', 'down'], ['fast', 'slow'], ['happy', 'sad'], ['open', 'shut'], ['wet', 'dry'], ['day', 'night']];
// Shut goes with closed, not close: close can also be said to mean near, and these words are heard.
export const SAME_MEANING: readonly (readonly [string, string])[] = [['big', 'large'], ['small', 'little'], ['happy', 'glad'], ['fast', 'quick'], ['shut', 'closed'], ['start', 'begin']];
