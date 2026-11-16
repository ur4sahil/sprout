import type { Oracle } from './types';
import { list, num } from './types';

// A repeating pattern: after `shown` items, the next one is unit[shown mod unit length].
export const pattern: Oracle = (facts) => {
  const unit = list(facts, 'unit');
  const shown = num(facts, 'shown');
  if (!Number.isInteger(shown) || shown < 0) throw new Error('oracle pattern: shown must be a whole number');
  if (new Set(unit.map((item) => JSON.stringify(item))).size < 2) throw new Error('oracle pattern: a unit needs at least two different items');
  const next = unit[shown % unit.length];
  if (typeof next !== 'number' && typeof next !== 'string' && typeof next !== 'boolean') {
    throw new Error('oracle pattern: unit items must be plain values');
  }
  return { kind: 'value', value: next };
};
