// Syllables (plan section 9). Each word is stored with its parts, because the explanation
// shows the split on screen. The voice says only the whole word.

export interface SyllableWord {
  word: string;
  parts: string[];
  emoji: string;
}

const ROWS: [string, string][] = [
  // one clap
  ['cat', '🐱'], ['dog', '🐶'], ['sun', '☀️'], ['fish', '🐟'], ['star', '⭐'], ['moon', '🌙'], ['frog', '🐸'], ['cake', '🍰'],
  // two claps
  ['ap-ple', '🍎'], ['rab-bit', '🐰'], ['tur-tle', '🐢'], ['piz-za', '🍕'], ['mon-key', '🐵'], ['rock-et', '🚀'], ['lem-on', '🍋'], ['ti-ger', '🐯'], ['rain-bow', '🌈'],
  // three claps
  ['ba-na-na', '🍌'], ['oc-to-pus', '🐙'], ['um-brel-la', '☂️'], ['el-e-phant', '🐘'], ['but-ter-fly', '🦋'], ['straw-ber-ry', '🍓'], ['di-no-saur', '🦕'], ['to-ma-to', '🍅'],
];

export const SYLLABLE_WORDS: readonly SyllableWord[] = ROWS.map(([split, emoji]) => ({ word: split.replace(/-/g, ''), parts: split.split('-'), emoji }));
