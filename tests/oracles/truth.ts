import type { Facts } from '../../src/engine/types';
import type { Oracle } from './types';
import { list } from './types';

// One side of an equation as a list: [4, '+', 1] or [5]. Worked out from left to right.
function worth(facts: Facts, name: string): number {
  const parts = list(facts, name);
  let total = 0;
  let sign = 1;
  let wantNumber = true;
  for (const part of parts) {
    if (wantNumber) {
      if (typeof part !== 'number' || !Number.isFinite(part)) throw new Error(`oracle truth: facts.${name} has a number missing`);
      total += sign * part;
    } else if (part === '+') sign = 1;
    else if (part === '-') sign = -1;
    else throw new Error(`oracle truth: facts.${name} has an unknown sign`);
    wantNumber = !wantNumber;
  }
  if (wantNumber) throw new Error(`oracle truth: facts.${name} ends on a sign`);
  return total;
}

// Whether the two sides of an equation are worth the same.
export const truth: Oracle = (facts) => ({ kind: 'value', value: worth(facts, 'left') === worth(facts, 'right') });
