// Short-vowel words with a picture (plan section 9).
// Pot is left out, because its picture is "soup" in the analogy list. It stays in the word families.

export type ShortVowel = 'a' | 'e' | 'i' | 'o' | 'u';

export interface CvcWord {
  word: string;
  emoji: string;
  vowel: ShortVowel;
}

const ROWS: Record<ShortVowel, [string, string][]> = {
  a: [['cat', '🐱'], ['hat', '🎩'], ['bat', '🦇'], ['van', '🚐'], ['pan', '🍳'], ['map', '🗺️'], ['bag', '👜']],
  e: [['bed', '🛏️'], ['hen', '🐔'], ['pen', '🖊️'], ['web', '🕸️'], ['leg', '🦵']],
  i: [['pig', '🐷'], ['pin', '📌'], ['bin', '🗑️']],
  o: [['dog', '🐶'], ['fox', '🦊'], ['box', '📦']],
  u: [['sun', '☀️'], ['bus', '🚌'], ['bug', '🐛'], ['cup', '🥤'], ['nut', '🥜']],
};

export const SHORT_VOWELS = Object.keys(ROWS) as ShortVowel[];

export const CVC_WORDS: readonly CvcWord[] = SHORT_VOWELS.flatMap((vowel) => ROWS[vowel].map(([word, emoji]) => ({ word, emoji, vowel })));

// The vowel a child most often hears instead: e with i, o with u.
export const CLOSEST_VOWEL: Record<ShortVowel, ShortVowel> = { a: 'e', e: 'i', i: 'e', o: 'u', u: 'o' };
