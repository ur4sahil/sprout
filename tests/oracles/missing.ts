import type { Oracle } from './types';
import { num, text } from './types';

// The value that makes a plus b equal total. `blank` says which of the three is hidden.
export const missing: Oracle = (facts) => {
  const blank = text(facts, 'blank');
  if (blank === 'total') return { kind: 'value', value: num(facts, 'a') + num(facts, 'b') };
  const total = num(facts, 'total');
  if (blank === 'a') return { kind: 'value', value: total - num(facts, 'b') };
  if (blank === 'b') return { kind: 'value', value: total - num(facts, 'a') };
  throw new Error(`oracle missing: blank must be a, b or total, not ${blank}`);
};
