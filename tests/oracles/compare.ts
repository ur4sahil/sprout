import type { Oracle } from './types';
import { numbers, text } from './types';

function onlyIndexOf(values: number[], wanted: number, what: string): number {
  const found = values.flatMap((value, index) => (value === wanted ? [index] : []));
  if (found.length !== 1) throw new Error(`oracle compare: ${found.length} values tie for ${what}`);
  return found[0] as number;
}

// most / least: which value is the greatest or least. equal: whether all are the same.
// sign: the sign that goes between two values.
export const compare: Oracle = (facts) => {
  const values = numbers(facts, 'values');
  const ask = text(facts, 'ask');
  if (ask === 'most') return { kind: 'index', index: onlyIndexOf(values, Math.max(...values), 'the most') };
  if (ask === 'least') return { kind: 'index', index: onlyIndexOf(values, Math.min(...values), 'the least') };
  if (ask === 'equal') return { kind: 'value', value: values.every((value) => value === values[0]) };
  if (ask === 'sign') {
    if (values.length !== 2) throw new Error('oracle compare: a sign goes between exactly two values');
    const [left, right] = values as [number, number];
    return { kind: 'value', value: left > right ? '>' : left < right ? '<' : '=' };
  }
  throw new Error(`oracle compare: unknown ask ${ask}`);
};
