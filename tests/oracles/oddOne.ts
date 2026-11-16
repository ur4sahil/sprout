import type { Oracle } from './types';
import { list, same } from './types';

// Which option differs from all the others, when the others are all alike.
export const oddOne: Oracle = (facts) => {
  const optionAttrs = list(facts, 'optionAttrs');
  if (optionAttrs.length < 3) throw new Error('oracle oddOne: needs at least three options');
  const odd = optionAttrs.flatMap((attr, index) => {
    const others = optionAttrs.filter((_, i) => i !== index);
    const alike = others.every((other) => same(other, others[0]));
    return alike && !same(attr, others[0]) ? [index] : [];
  });
  if (odd.length !== 1) throw new Error(`oracle oddOne: ${odd.length} options could be the odd one`);
  return { kind: 'index', index: odd[0] as number };
};
