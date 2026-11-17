import type { Oracle } from './types';
import { num, text } from './types';

// The unit to measure with. kind volume: liters. kind mass: grams for under a kilogram (1,000 grams),
// kilograms from there up.
export const measureUnit: Oracle = (facts) => {
  const kind = text(facts, 'kind');
  if (kind === 'volume') return { kind: 'value', value: 'liters' };
  if (kind === 'mass') return { kind: 'value', value: num(facts, 'grams') < 1000 ? 'grams' : 'kilograms' };
  throw new Error(`oracle measureUnit: unknown kind ${kind}`);
};
