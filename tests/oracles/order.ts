import type { Oracle } from './types';
import { numbers } from './types';

// The positions of the values, smallest first.
export const order: Oracle = (facts) => {
  const values = numbers(facts, 'values');
  if (new Set(values).size !== values.length) throw new Error('oracle order: two values tie, so there is no single order');
  const positions = values.map((_, index) => index);
  positions.sort((x, y) => (values[x] as number) - (values[y] as number));
  return { kind: 'order', order: positions };
};
