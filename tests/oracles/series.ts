import type { Oracle } from './types';
import { num, numbers } from './types';

// A row of numbers that starts at `start` and moves by `steps`, used in turn again and again.
// With rule 'grow', the jump starts at steps[0] and grows by `grow` after each jump.
// With rule 'times', each number is steps[0] times the one before.
// The answer is the number at blankIndex, counted from 0.
export const series: Oracle = (facts) => {
  const start = num(facts, 'start');
  const steps = numbers(facts, 'steps');
  const blankIndex = num(facts, 'blankIndex');
  if (!Number.isInteger(blankIndex) || blankIndex < 0) throw new Error('oracle series: the blank must be a place in the row');
  if (facts.rule === 'times') {
    const factor = steps[0] as number;
    if (steps.length !== 1 || !Number.isInteger(factor) || factor < 2) throw new Error('oracle series: times needs one whole factor of 2 or more');
    return { kind: 'value', value: start * factor ** blankIndex };
  }
  if (facts.rule === 'grow') {
    const grow = num(facts, 'grow');
    if (steps.length !== 1 || grow === 0) throw new Error('oracle series: growing jumps need one first jump and a growth that is not zero');
    let value = start;
    let jump = steps[0] as number;
    for (let i = 0; i < blankIndex; i += 1) {
      value += jump;
      jump += grow;
    }
    return { kind: 'value', value };
  }
  if (facts.rule !== undefined) throw new Error(`oracle series: unknown rule ${String(facts.rule)}`);
  if (steps.every((step) => step === 0)) throw new Error('oracle series: the numbers never change');
  let value = start;
  for (let i = 0; i < blankIndex; i += 1) value += steps[i % steps.length] as number;
  return { kind: 'value', value };
};
