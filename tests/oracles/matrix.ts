import type { Oracle } from './types';
import { list, num } from './types';

// A 2 by 2 or 3 by 3 grid with one empty box, numbered along the rows from 0.
// Grid rule: every cell has its row's attribute and its column's attribute. The answer is "row|column".
// Checker rule (facts.rule is 'checker', with facts.colors): the two colours alternate like a
// checkerboard, starting with colors[0] at the top left. The answer is the colour.
export const matrix: Oracle = (facts) => {
  const rowAttrs = list(facts, 'rowAttrs');
  const colAttrs = list(facts, 'colAttrs');
  const blank = num(facts, 'blank');
  const side = rowAttrs.length;
  if (colAttrs.length !== side || (side !== 2 && side !== 3)) throw new Error('oracle matrix: the grid must be 2 by 2 or 3 by 3');
  if (!Number.isInteger(blank) || blank < 0 || blank >= side * side) throw new Error('oracle matrix: the empty box is outside the grid');
  const row = Math.floor(blank / side);
  const col = blank % side;
  if (facts.rule === 'checker') {
    const colors = list(facts, 'colors');
    if (colors.length !== 2 || colors[0] === colors[1]) throw new Error('oracle matrix: a checkerboard needs two different colours');
    return { kind: 'value', value: String(colors[(row + col) % 2]) };
  }
  if (new Set(rowAttrs.map(String)).size < 2 && new Set(colAttrs.map(String)).size < 2) throw new Error('oracle matrix: every cell would be the same');
  return { kind: 'value', value: `${String(rowAttrs[row])}|${String(colAttrs[col])}` };
};
