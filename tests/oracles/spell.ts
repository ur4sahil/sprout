import type { Oracle } from './types';
import { list, text } from './types';

// A word built from tiles. `parts` are the tiles in order: the word's letters one at a time,
// or, for a compound word, its smaller words. They must join to make the word, and a word
// spelled letter by letter must use one tile for each letter.
export const spell: Oracle = (facts) => {
  const word = text(facts, 'word');
  const parts = list(facts, 'parts').map((part) => {
    if (typeof part !== 'string' || part.length === 0) throw new Error('oracle spell: every part must be text');
    return part;
  });
  if (parts.join('') !== word) throw new Error(`oracle spell: the parts do not make ${word}`);
  const letterByLetter = parts.every((part) => part.length === 1);
  const wordByWord = parts.length === 2 && parts.every((part) => part.length >= 2);
  if (!letterByLetter && !wordByWord) throw new Error('oracle spell: the parts must be single letters, or the two words of a compound word');
  return { kind: 'value', value: word };
};
