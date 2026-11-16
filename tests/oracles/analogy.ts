import type { Oracle } from './types';
import { list } from './types';

// "from is to to as base is to what": base with the same change applied.
// Each figure is a list of attributes in the same order, such as [shape, colour, size].
// Where from and to differ, base must start the same as from, and the answer takes to's value.
// The answer is the attributes joined with "|".
export const analogy: Oracle = (facts) => {
  const from = list(facts, 'from');
  const to = list(facts, 'to');
  const base = list(facts, 'base');
  if (from.length !== to.length || from.length !== base.length) throw new Error('oracle analogy: the figures differ in size');
  let changed = 0;
  const out = base.map((value, i) => {
    if (from[i] === to[i]) return value;
    changed += 1;
    if (value !== from[i]) throw new Error('oracle analogy: the second pair does not start the way the first pair did');
    return to[i];
  });
  if (changed === 0) throw new Error('oracle analogy: nothing changes in the first pair');
  // The second pair must not simply be the first pair again.
  if (base.every((value, i) => value === from[i])) throw new Error('oracle analogy: the second pair is the first pair again');
  return { kind: 'value', value: out.join('|') };
};
