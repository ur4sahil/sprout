import type { Oracle } from './types';
import { num, numbers, text } from './types';

// A graph's values, one for each category in order.
// ask: value (the value of the category at facts.index), most, least (which category, by its place),
// total (all the values added), difference (how many more the category at facts.index has than the one at facts.other).
export const graph: Oracle = (facts) => {
  const values = numbers(facts, 'values');
  const ask = text(facts, 'ask');
  const at = (name: string): number => {
    const index = num(facts, name);
    if (!Number.isInteger(index) || index < 0 || index >= values.length) throw new Error(`oracle graph: facts.${name} is not a category`);
    return values[index] as number;
  };
  const only = (wanted: number, what: string): number => {
    const found = values.flatMap((value, index) => (value === wanted ? [index] : []));
    if (found.length !== 1) throw new Error(`oracle graph: ${found.length} categories tie for ${what}`);
    return found[0] as number;
  };
  // all: every value, for a bar graph the child builds.
  if (ask === 'all') return { kind: 'value', value: values };
  if (ask === 'total') return { kind: 'value', value: values.reduce((sum, value) => sum + value, 0) };
  if (ask === 'value') return { kind: 'value', value: at('index') };
  if (ask === 'most') return { kind: 'index', index: only(Math.max(...values), 'the most') };
  if (ask === 'least') return { kind: 'index', index: only(Math.min(...values), 'the least') };
  if (ask === 'difference') {
    const more = at('index') - at('other');
    if (more <= 0) throw new Error('oracle graph: "how many more" needs the first category to have more');
    return { kind: 'value', value: more };
  }
  throw new Error(`oracle graph: unknown ask ${ask}`);
};
