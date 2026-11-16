// Picture riddles (plan section 9). Wrong options are the answers to other riddles.
// No answer on this list fits a second riddle, and any addition must keep that true.
// `fact` finishes the sentence "The shoe is the one that ...".

export interface Riddle {
  riddle: string;
  word: string;
  emoji: string;
  fact: string;
}

const ROWS: [string, string, string, string][] = [
  ['Which one do you wear on your foot?', 'shoe', '👟', 'you wear on your foot'],
  ['Which one tells the time?', 'clock', '🕐', 'tells the time'],
  ['Which one do you eat soup with?', 'spoon', '🥄', 'you eat soup with'],
  ['Which one lives in water?', 'fish', '🐟', 'lives in water'],
  ['Which one gives us milk?', 'cow', '🐄', 'gives us milk'],
  ['Which one keeps you dry in the rain?', 'umbrella', '☂️', 'keeps you dry in the rain'],
  ['Which one has wheels?', 'car', '🚗', 'has wheels'],
  ['Which one is very cold?', 'snow', '❄️', 'is very cold'],
  ['Which one opens a lock?', 'key', '🔑', 'opens a lock'],
  ['Which one do you sleep in?', 'bed', '🛏️', 'you sleep in'],
  ['Which one can you read?', 'book', '📖', 'you can read'],
  ['Which one can fly?', 'bird', '🐦', 'can fly'],
];

export const RIDDLES: readonly Riddle[] = ROWS.map(([riddle, word, emoji, fact]) => ({ riddle, word, emoji, fact }));
