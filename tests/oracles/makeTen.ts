import type { Oracle } from './types';
import { num } from './types';

// "Make a ten first": a plus b is the same as 10 plus what is left over. The answer is written "10 plus 3".
export const makeTen: Oracle = (facts) => {
  const a = num(facts, 'a');
  const b = num(facts, 'b');
  if (![a, b].every((value) => Number.isInteger(value) && value >= 1 && value <= 9)) throw new Error('oracle makeTen: both numbers must be 1 to 9');
  const left = a + b - 10;
  if (left < 1) throw new Error('oracle makeTen: the two numbers do not go past ten');
  return { kind: 'value', value: `10 plus ${left}` };
};
