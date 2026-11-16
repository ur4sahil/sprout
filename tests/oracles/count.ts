import type { Oracle } from './types';
import { num } from './types';

// How many there are: n.
export const count: Oracle = (facts) => {
  const n = num(facts, 'n');
  if (!Number.isInteger(n) || n < 0) throw new Error('oracle count: n must be a whole number, zero or more');
  return { kind: 'value', value: n };
};
