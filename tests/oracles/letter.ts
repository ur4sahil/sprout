import type { Oracle } from './types';
import { text } from './types';

const A = 'a'.charCodeAt(0);

// A letter of the alphabet.
// ask: upper, lower (the same letter in that case), next, before (its neighbour in the
// alphabet, in the same case), run (the next `length` letters, joined), kind ('letter' or
// 'number', for a letter or a digit).
export const letter: Oracle = (facts) => {
  const given = text(facts, 'letter');
  const ask = text(facts, 'ask');
  if (ask === 'kind') {
    if (/^[A-Za-z]$/.test(given)) return { kind: 'value', value: 'letter' };
    if (/^[0-9]$/.test(given)) return { kind: 'value', value: 'number' };
    throw new Error(`oracle letter: ${given} is neither one letter nor one digit`);
  }
  if (!/^[A-Za-z]$/.test(given)) throw new Error(`oracle letter: ${given} is not one letter`);
  if (ask === 'upper') return { kind: 'value', value: given.toUpperCase() };
  if (ask === 'lower') return { kind: 'value', value: given.toLowerCase() };
  if (ask === 'next' || ask === 'before') {
    const place = given.toLowerCase().charCodeAt(0) - A + (ask === 'next' ? 1 : -1);
    if (place < 0 || place > 25) throw new Error(`oracle letter: nothing comes ${ask === 'next' ? 'after z' : 'before a'}`);
    const neighbour = String.fromCharCode(A + place);
    return { kind: 'value', value: given === given.toUpperCase() ? neighbour.toUpperCase() : neighbour };
  }
  if (ask === 'run') {
    // The letters that follow, as many as `length` says, joined: after d come "efg".
    const length = facts.length;
    if (typeof length !== 'number' || !Number.isInteger(length) || length < 1) throw new Error('oracle letter: a run needs a whole length');
    const start = given.toLowerCase().charCodeAt(0) - A;
    if (start + length > 25) throw new Error('oracle letter: the run goes past z');
    const run = Array.from({ length }, (_, i) => String.fromCharCode(A + start + 1 + i)).join('');
    return { kind: 'value', value: given === given.toUpperCase() ? run.toUpperCase() : run };
  }
  throw new Error(`oracle letter: unknown ask ${ask}`);
};
