// Phonics and sight-word lists of plan section 15 wave H4 (Language Arts grades 1 and 2).
// One picture keeps one name across every list.

// ---- Grade 1 A.6 Endings s, ed, ing ----
// Verbs that take each ending with nothing else changing: jump, jumps, jumped, jumping.
export const PLAIN_VERBS: readonly string[] = ['jump', 'play', 'help', 'walk', 'cook', 'rest', 'paint', 'kick'];
export const ENDINGS: readonly ('s' | 'ed' | 'ing')[] = ['s', 'ed', 'ing'];
// Each ending has a clue in its sentence: yesterday for ed, now ... is for ing, every day for s.
export const ENDING_NAMES: readonly string[] = ['Sam', 'Mia', 'Ben', 'Kim'];
export const ENDING_SENTENCES: Readonly<Record<'s' | 'ed' | 'ing', string>> = {
  ed: 'Yesterday, NAME ___.',
  ing: 'Right now, NAME is ___.',
  s: 'NAME ___ every day.',
};

// ---- Grade 1 A.7 Endings ck, ng, nk ----
export interface PartPicture {
  word: string;
  part: string;
  emoji: string;
}
const parts = (list: [string, string, string][]): readonly PartPicture[] => list.map(([word, part, emoji]) => ({ word, part, emoji }));
export const END_PARTS: readonly string[] = ['ck', 'ng', 'nk'];
export const END_PART_WORDS = parts([
  ['duck', 'ck', '🦆'], ['sock', 'ck', '🧦'], ['rock', 'ck', '🪨'], ['lock', 'ck', '🔒'], ['truck', 'ck', '🚚'], ['chick', 'ck', '🐥'],
  ['ring', 'ng', '💍'], ['king', 'ng', '🤴'], ['sing', 'ng', '🎤'], ['bang', 'ng', '💥'],
  ['skunk', 'nk', '🦨'], ['bank', 'nk', '🏦'], ['sink', 'nk', '🚰'], ['wink', 'nk', '😉'],
]);
// Plain words for "which word ends with ...": each ends in its part, and no word ends in two of them.
export const END_PART_READ: readonly PartPicture[] = parts([
  ['back', 'ck', ''], ['neck', 'ck', ''], ['pick', 'ck', ''], ['luck', 'ck', ''],
  ['song', 'ng', ''], ['long', 'ng', ''], ['hung', 'ng', ''], ['sang', 'ng', ''],
  ['pink', 'nk', ''], ['sunk', 'nk', ''], ['tank', 'nk', ''], ['honk', 'nk', ''],
]);

// ---- Grade 1 A.8 Y as a vowel ----
// At the end of a word with no other vowel, y sounds like i (fly). After another vowel sound, like e (baby).
export const Y_AS_I: readonly string[] = ['fly', 'sky', 'cry', 'dry', 'my', 'try', 'shy', 'spy'];
export const Y_AS_E: readonly string[] = ['baby', 'happy', 'funny', 'bunny', 'candy', 'penny', 'lady', 'muddy'];

// ---- Grade 1 B.4 Sight words, set 5 ----
// From the Dolch grade 2 list, leaving out words that sound like another word (buy, their, read, right,
// write, which, would, your, made, been, its, off, or, don't).
export const SIGHT_5: readonly string[] = [
  'always', 'around', 'because', 'before', 'best', 'both', 'call', 'cold', 'does', 'fast', 'first', 'five',
  'found', 'gave', 'goes', 'green', 'many', 'pull', 'sing', 'sit', 'sleep', 'tell', 'these', 'those',
  'upon', 'us', 'use', 'very', 'wash', 'why', 'wish', 'work',
];

// ---- Grade 2 A.4 oi, oy, ou, ow ----
export const SOUND_TEAMS: readonly string[] = ['oi', 'oy', 'ou', 'ow'];
export const SOUND_TEAM_WORDS = parts([
  ['coin', 'oi', '🪙'], ['oil', 'oi', '🛢️'], ['toilet', 'oi', '🚽'],
  ['boy', 'oy', '👦'], ['toy', 'oy', '🪀'], ['oyster', 'oy', '🦪'],
  ['mouse', 'ou', '🐭'], ['cloud', 'ou', '☁️'], ['blouse', 'ou', '👚'], ['couch', 'ou', '🛋️'],
  ['cow', 'ow', '🐄'], ['owl', 'ow', '🦉'], ['crown', 'ow', '👑'], ['clown', 'ow', '🤡'],
]);

// ---- Grade 2 A.5 Soft and hard c and g ----
// Each word has one c or one g (never both). The letter after it decides: e, i or y make it soft.
export const C_SOFT: readonly string[] = ['city', 'face', 'rice', 'cent', 'mice', 'ice', 'pencil', 'race'];
export const C_HARD: readonly string[] = ['cat', 'cup', 'corn', 'cub', 'can', 'coat', 'camp', 'cut'];
export const G_SOFT: readonly string[] = ['gem', 'giant', 'page', 'giraffe', 'huge', 'stage', 'gym', 'large'];
export const G_HARD: readonly string[] = ['gum', 'game', 'gate', 'wagon', 'frog', 'dog', 'leg', 'bug'];

// ---- Grade 2 A.6 Silent letters kn, wr, mb ----
export interface SilentWord {
  word: string;
  silent: string; // the letter that makes no sound
  heard: readonly string[]; // other letters of the word that are heard, offered as wrong answers
}
export const SILENT_WORDS: readonly SilentWord[] = (
  [
    ['knife', 'k', ['n', 'f']], ['knot', 'k', ['n', 't']], ['knit', 'k', ['n', 't']], ['knob', 'k', ['n', 'b']],
    ['write', 'w', ['r', 't']], ['wrap', 'w', ['r', 'p']], ['wrist', 'w', ['r', 's', 't']], ['wrench', 'w', ['r', 'n']],
    ['lamb', 'b', ['l', 'm']], ['comb', 'b', ['c', 'm']], ['climb', 'b', ['c', 'm']], ['crumb', 'b', ['c', 'r', 'm']],
  ] as [string, string, string[]][]
).map(([word, silent, heard]) => ({ word, silent, heard }));
// Pictures for "which word names the picture". The wrong spellings leave the silent letter out, or swap it.
export const SILENT_PICTURES: readonly { word: string; emoji: string }[] = [
  { word: 'knife', emoji: '🔪' },
  { word: 'knot', emoji: '🪢' },
  { word: 'write', emoji: '✍️' },
  { word: 'wrench', emoji: '🔧' },
  { word: 'thumb', emoji: '👍' },
  { word: 'climb', emoji: '🧗' },
  { word: 'knight', emoji: '🛡️' },
];
// Words with no silent letter, to set beside one that has.
export const NOT_SILENT: readonly string[] = ['nap', 'rug', 'lip', 'mop', 'net', 'ten', 'bus', 'map', 'rest', 'drum'];
