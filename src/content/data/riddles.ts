// Picture riddles (plan section 9). Wrong options are the answers to other riddles.
// No answer on this list fits a second riddle, and any addition must keep that true: a car keeps you dry in the
// rain and a clock can be read, so the umbrella is the one you hold over your head and the book has pages to read
// (the wording audit, Nov 22, 2026).
// `fact` finishes the sentence "The shoe is the one that ..." (the lessons say it). `why` is the reason the
// explanation gives, in a child's words.

export interface Riddle {
  riddle: string;
  word: string;
  emoji: string;
  fact: string;
  why: string;
}

const ROWS: [string, string, string, string, string][] = [
  ['Which one do you wear on your foot?', 'shoe', '👟', 'you wear on your foot', 'A shoe is made to fit your foot.'],
  ['Which one tells the time?', 'clock', '🕐', 'tells the time', 'A clock has hands that show the time.'],
  ['Which one do you eat soup with?', 'spoon', '🥄', 'you eat soup with', 'A spoon scoops up the soup.'],
  ['Which one lives in water?', 'fish', '🐟', 'lives in water', 'A fish swims and breathes under water.'],
  ['Which one gives us milk?', 'cow', '🐄', 'gives us milk', 'Milk comes from a cow.'],
  ['Which one do you hold over your head in the rain?', 'umbrella', '☂️', 'you hold over your head in the rain', 'An umbrella keeps the rain off your head.'],
  ['Which one has wheels?', 'car', '🚗', 'has wheels', 'A car rolls along on four wheels.'],
  ['Which one is very cold?', 'snow', '❄️', 'is very cold', 'Snow is made of ice.'],
  ['Which one opens a lock?', 'key', '🔑', 'opens a lock', 'A key turns in a lock to open it.'],
  ['Which one do you sleep in?', 'bed', '🛏️', 'you sleep in', 'You lie down in a bed to sleep.'],
  ['Which one has pages to read?', 'book', '📖', 'has pages to read', 'A book is full of pages with words.'],
  ['Which one can fly?', 'bird', '🐦', 'can fly', 'A bird flaps its wings to fly.'],
];

export const RIDDLES: readonly Riddle[] = ROWS.map(([riddle, word, emoji, fact, why]) => ({ riddle, word, emoji, fact, why }));
