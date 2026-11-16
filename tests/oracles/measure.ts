import type { Oracle } from './types';
import { num } from './types';

// An object on a ruler from startUnit, lengthUnits long. Its length is lengthUnits wherever it starts:
// the spaces are counted, not the mark it ends on.
export const measure: Oracle = (facts) => {
  const start = num(facts, 'startUnit');
  const length = num(facts, 'lengthUnits');
  if (!Number.isInteger(start) || start < 0) throw new Error('oracle measure: the start must be a mark on the ruler');
  if (!Number.isInteger(length) || length < 1) throw new Error('oracle measure: the object must be at least one unit long');
  return { kind: 'value', value: length };
};
