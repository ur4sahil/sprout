import type { Oracle } from './types';
import { num, text } from './types';

// An array of rows and columns. ask: total (rows times cols), addition (the matching repeated
// addition, one number for each row: 3 rows of 4 is "4 + 4 + 4").
export const multiply: Oracle = (facts) => {
  const rows = num(facts, 'rows');
  const cols = num(facts, 'cols');
  if (![rows, cols].every((value) => Number.isInteger(value) && value >= 1)) throw new Error('oracle multiply: rows and cols must be whole numbers, 1 or more');
  const ask = text(facts, 'ask');
  if (ask === 'total') return { kind: 'value', value: rows * cols };
  if (ask === 'addition') return { kind: 'value', value: Array.from({ length: rows }, () => cols).join(' + ') };
  throw new Error(`oracle multiply: unknown ask ${ask}`);
};
