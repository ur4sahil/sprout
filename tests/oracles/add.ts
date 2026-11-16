import type { Oracle } from './types';
import { num } from './types';

// a plus b, plus c when there are three addends.
export const add: Oracle = (facts) => {
  let total = 0;
  for (const name of ['a', 'b']) total += num(facts, name);
  if ('c' in facts) total += num(facts, 'c');
  return { kind: 'value', value: total };
};
