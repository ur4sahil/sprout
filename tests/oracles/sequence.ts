import type { Oracle } from './types';
import { num } from './types';

// A row that goes up or down by the same step: the value at the blank.
export const sequence: Oracle = (facts) => {
  const start = num(facts, 'start');
  const step = num(facts, 'step');
  const length = num(facts, 'length');
  const blankIndex = num(facts, 'blankIndex');
  if (!Number.isInteger(blankIndex) || blankIndex < 0 || blankIndex >= length) {
    throw new Error('oracle sequence: the blank is outside the row');
  }
  if (step === 0) throw new Error('oracle sequence: a step of zero is not a sequence');
  return { kind: 'value', value: start + step * blankIndex };
};
