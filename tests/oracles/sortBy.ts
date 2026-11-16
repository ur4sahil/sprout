import type { Oracle } from './types';
import { list, same } from './types';

// The bin for each item: the one bin whose attribute equals the item's.
export const sortBy: Oracle = (facts) => {
  const itemAttrs = list(facts, 'itemAttrs');
  const binAttrs = list(facts, 'binAttrs');
  const bins = itemAttrs.map((attr) => {
    const found = binAttrs.flatMap((bin, index) => (same(bin, attr) ? [index] : []));
    if (found.length !== 1) throw new Error(`oracle sortBy: an item fits ${found.length} bins`);
    return found[0] as number;
  });
  return { kind: 'bins', bins };
};
