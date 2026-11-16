import type { Oracle } from './types';
import { list, same } from './types';

// The pairs whose values are equal. Every item must have exactly one partner.
export const matchEqual: Oracle = (facts) => {
  const leftValues = list(facts, 'leftValues');
  const rightValues = list(facts, 'rightValues');
  if (leftValues.length !== rightValues.length) throw new Error('oracle matchEqual: the two sides differ in size');
  const pairs = leftValues.map((left, l): [number, number] => {
    const found = rightValues.flatMap((right, r) => (same(left, right) ? [r] : []));
    if (found.length !== 1) throw new Error(`oracle matchEqual: a left item has ${found.length} partners`);
    return [l, found[0] as number];
  });
  if (new Set(pairs.map(([, r]) => r)).size !== pairs.length) throw new Error('oracle matchEqual: two left items share a partner');
  return { kind: 'pairs', pairs };
};
