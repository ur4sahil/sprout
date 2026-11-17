import type { Oracle } from './types';
import { num, text } from './types';
import { round } from './round';

const near = (n: number, to: number): number => round({ n, to }).kind === 'value' ? (round({ n, to }) as { value: number }).value : n;

// An estimate: round a and b to the nearest ten or hundred, then add or take away.
// ask: estimate (that number) or reasonable (whether a claimed answer is within one rounding step of the estimate).
export const estimate: Oracle = (facts) => {
  const a = num(facts, 'a');
  const b = num(facts, 'b');
  const to = num(facts, 'to');
  const op = text(facts, 'op');
  if (op !== '+' && op !== '-') throw new Error(`oracle estimate: unknown sign ${op}`);
  const guess = op === '+' ? near(a, to) + near(b, to) : near(a, to) - near(b, to);
  const ask = text(facts, 'ask');
  if (ask === 'estimate') return { kind: 'value', value: guess };
  if (ask === 'reasonable') return { kind: 'value', value: Math.abs(num(facts, 'claim') - guess) <= to };
  throw new Error(`oracle estimate: unknown ask ${ask}`);
};
