import type { Oracle } from './types';
import { num, text } from './types';

const NAMES: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'fourths' };

// A shape cut into parts. ask: equal (whether the parts are equal), name (halves, thirds or fourths:
// only equal parts have a name).
export const fraction: Oracle = (facts) => {
  const parts = num(facts, 'parts');
  if (typeof facts.equal !== 'boolean') throw new Error('oracle fraction: facts.equal must be true or false');
  const ask = text(facts, 'ask');
  if (ask === 'equal') return { kind: 'value', value: facts.equal };
  if (ask === 'name') {
    const name = NAMES[parts];
    if (!facts.equal) throw new Error('oracle fraction: unequal parts have no name');
    if (!name) throw new Error(`oracle fraction: no name for ${parts} parts`);
    return { kind: 'value', value: name };
  }
  throw new Error(`oracle fraction: unknown ask ${ask}`);
};
