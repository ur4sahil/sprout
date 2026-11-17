import type { Oracle } from './types';
import { num, text } from './types';

function step(value: number, op: string, by: number): number {
  if (op === '+') return value + by;
  if (op === '-') return value - by;
  if (op === '×') return value * by;
  if (op === '÷') {
    if (by === 0 || value % by !== 0) throw new Error(`oracle twoStep: ${value} does not share equally by ${by}`);
    return value / by;
  }
  throw new Error(`oracle twoStep: unknown sign ${op}`);
}

// A two-step story: a, then op1 b, then op2 c. Neither step may go below zero.
export const twoStep: Oracle = (facts) => {
  const first = step(num(facts, 'a'), text(facts, 'op1'), num(facts, 'b'));
  const second = step(first, text(facts, 'op2'), num(facts, 'c'));
  if (first < 0 || second < 0) throw new Error('oracle twoStep: the story goes below zero');
  return { kind: 'value', value: second };
};
