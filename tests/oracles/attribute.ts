import type { Oracle } from './types';
import { list, same } from './types';

// Which option has the attribute asked for. Exactly one must.
export const attribute: Oracle = (facts) => {
  const optionAttrs = list(facts, 'optionAttrs');
  if (!('target' in facts)) throw new Error('oracle attribute: facts.target is missing');
  const found = optionAttrs.flatMap((attr, index) => (same(attr, facts.target) ? [index] : []));
  if (found.length !== 1) throw new Error(`oracle attribute: ${found.length} options have the target attribute`);
  return { kind: 'index', index: found[0] as number };
};
