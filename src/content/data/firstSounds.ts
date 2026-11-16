// First sounds (plan section 9).
// Options in one question must come from different sound groups.
// Cat and key share a group, so they never appear together.

export interface SoundWord {
  word: string;
  letter: string; // its first letter
  sound: string; // its sound group: cat and key are both 'k'
  emoji: string;
}

const ROWS: [string, string, string, string][] = [
  ['apple', 'a', 'a', '🍎'], ['ball', 'b', 'b', '⚽'], ['bear', 'b', 'b', '🐻'], ['bus', 'b', 'b', '🚌'],
  ['cat', 'c', 'k', '🐱'], ['car', 'c', 'k', '🚗'], ['cow', 'c', 'k', '🐄'],
  ['dog', 'd', 'd', '🐶'], ['duck', 'd', 'd', '🦆'], ['door', 'd', 'd', '🚪'],
  ['egg', 'e', 'e', '🥚'], ['fish', 'f', 'f', '🐟'], ['fox', 'f', 'f', '🦊'], ['fire', 'f', 'f', '🔥'],
  ['goat', 'g', 'g', '🐐'], ['hat', 'h', 'h', '🎩'], ['horse', 'h', 'h', '🐴'], ['house', 'h', 'h', '🏠'],
  ['jacket', 'j', 'j', '🧥'], ['key', 'k', 'k', '🔑'], ['lion', 'l', 'l', '🦁'], ['lemon', 'l', 'l', '🍋'],
  ['moon', 'm', 'm', '🌙'], ['mouse', 'm', 'm', '🐭'], ['milk', 'm', 'm', '🥛'],
  ['nose', 'n', 'n', '👃'], ['octopus', 'o', 'o', '🐙'],
  ['pig', 'p', 'p', '🐷'], ['pizza', 'p', 'p', '🍕'], ['pear', 'p', 'p', '🍐'],
  ['rabbit', 'r', 'r', '🐰'], ['rainbow', 'r', 'r', '🌈'], ['ring', 'r', 'r', '💍'],
  ['sun', 's', 's', '☀️'], ['sock', 's', 's', '🧦'], ['tiger', 't', 't', '🐯'], ['tent', 't', 't', '⛺'],
  ['umbrella', 'u', 'u', '☂️'], ['van', 'v', 'v', '🚐'], ['web', 'w', 'w', '🕸️'],
  ['yarn', 'y', 'y', '🧶'], ['zebra', 'z', 'z', '🦓'],
];

export const FIRST_SOUNDS: readonly SoundWord[] = ROWS.map(([word, letter, sound, emoji]) => ({ word, letter, sound, emoji }));
