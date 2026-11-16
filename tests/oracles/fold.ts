import type { Oracle } from './types';
import { list, text } from './types';

// Paper folding on a 4 by 4 grid of cells (plan section 5). A vertical fold brings the right half
// over the left, so a hole at column c is also at column 3 minus c once the paper is unfolded.
// A horizontal fold brings the bottom up over the top: row r is also at row 3 minus r.
// The answer is every hole as "col,row", sorted and joined with spaces.
export const fold: Oracle = (facts) => {
  const way = text(facts, 'fold');
  if (way !== 'vertical' && way !== 'horizontal') throw new Error(`oracle fold: unknown fold ${way}`);
  const holes = list(facts, 'holes').map((hole) => {
    if (hole === null || typeof hole !== 'object' || Array.isArray(hole)) throw new Error('oracle fold: a hole needs a col and a row');
    const { col, row } = hole as { col?: unknown; row?: unknown };
    if (typeof col !== 'number' || typeof row !== 'number' || !Number.isInteger(col) || !Number.isInteger(row)) throw new Error('oracle fold: a hole needs a col and a row');
    const inHalf = way === 'vertical' ? col >= 0 && col <= 1 && row >= 0 && row <= 3 : row >= 0 && row <= 1 && col >= 0 && col <= 3;
    if (!inHalf) throw new Error('oracle fold: a hole is outside the folded paper');
    return { col, row };
  });
  const all = new Set<string>();
  for (const { col, row } of holes) {
    all.add(`${col},${row}`);
    all.add(way === 'vertical' ? `${3 - col},${row}` : `${col},${3 - row}`);
  }
  if (all.size !== holes.length * 2) throw new Error('oracle fold: two holes are in the same place');
  return { kind: 'value', value: [...all].sort().join(' ') };
};
