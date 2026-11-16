import type { Oracle } from './types';
import { num } from './types';

// a minus b.
export const subtract: Oracle = (facts) => {
  const a = num(facts, 'a');
  const b = num(facts, 'b');
  if (b > a) throw new Error('oracle subtract: the answer would be below zero');
  return { kind: 'value', value: a - b };
};
