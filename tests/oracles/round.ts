import type { Oracle } from './types';
import { num } from './types';

// n rounded to the nearest ten or hundred. Halfway rounds up.
export const round: Oracle = (facts) => {
  const n = num(facts, 'n');
  const to = num(facts, 'to');
  if (to !== 10 && to !== 100) throw new Error('oracle round: to must be 10 or 100');
  const below = n - (n % to);
  return { kind: 'value', value: n % to >= to / 2 ? below + to : below };
};
