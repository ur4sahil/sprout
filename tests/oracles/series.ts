import type { Oracle } from './types';
import { num, numbers } from './types';

// A row of numbers that starts at `start` and moves by `steps`, used in turn again and again.
// The answer is the number at blankIndex, counted from 0.
export const series: Oracle = (facts) => {
  const start = num(facts, 'start');
  const steps = numbers(facts, 'steps');
  const blankIndex = num(facts, 'blankIndex');
  if (!Number.isInteger(blankIndex) || blankIndex < 0) throw new Error('oracle series: the blank must be a place in the row');
  if (steps.every((step) => step === 0)) throw new Error('oracle series: the numbers never change');
  let value = start;
  for (let i = 0; i < blankIndex; i += 1) value += steps[i % steps.length] as number;
  return { kind: 'value', value };
};
