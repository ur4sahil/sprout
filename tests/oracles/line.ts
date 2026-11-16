import type { Oracle } from './types';
import { num } from './types';

// A number line that starts at min and goes up by step: the number at mark `index`, counted from 0.
export const line: Oracle = (facts) => {
  const min = num(facts, 'min');
  const step = num(facts, 'step');
  const index = num(facts, 'index');
  if (step <= 0) throw new Error('oracle line: the step must be more than zero');
  if (!Number.isInteger(index) || index < 0) throw new Error('oracle line: the mark must be a place on the line');
  return { kind: 'value', value: min + step * index };
};
