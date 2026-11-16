import type { Oracle } from './types';
import { numbers } from './types';

// Even or odd for each value. One value gives one word. Several give a bin for each: 0 for even, 1 for odd.
export const parity: Oracle = (facts) => {
  const values = numbers(facts, 'values');
  if (values.some((value) => !Number.isInteger(value) || value < 0)) throw new Error('oracle parity: values must be whole numbers, zero or more');
  const odd = values.map((value) => value % 2);
  if (values.length === 1) return { kind: 'value', value: odd[0] === 1 ? 'odd' : 'even' };
  return { kind: 'bins', bins: odd };
};
