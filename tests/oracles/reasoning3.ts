import type { Oracle } from './types';
import { list, num } from './types';

// The harder Reasoning levels (plan section 15, phase I, part 2), worked out from the facts alone.

// A 3 by 3 grid of figures, each written "shape|colour", with 'blank' in one cell.
// For each attribute, the two other cells of the empty box's row decide it when they agree (each row
// shares it); otherwise the two other cells of its column decide it when they agree (each column shares
// it); otherwise it is the one value of the three that its row does not hold yet (each row and column
// holds every value once). The filled grid must then follow one of those three rules in every attribute.
export const figureGrid: Oracle = (facts) => {
  const cells = list(facts, 'cells').map(String);
  const blank = num(facts, 'blank');
  if (cells.length !== 9 || cells[blank] !== 'blank' || cells.filter((cell) => cell === 'blank').length !== 1) throw new Error('oracle figureGrid: needs nine cells with one blank, at facts.blank');
  const parts = cells.map((cell) => (cell === 'blank' ? null : cell.split('|')));
  const width = parts.find((part) => part !== null)?.length ?? 0;
  if (width === 0 || parts.some((part) => part !== null && part.length !== width)) throw new Error('oracle figureGrid: the cells do not all have the same attributes');
  const [r, c] = [Math.floor(blank / 3), blank % 3];
  const answer: string[] = [];
  for (let k = 0; k < width; k += 1) {
    const at = (i: number): string => parts[i]?.[k] ?? '';
    const inRow = [0, 1, 2].filter((j) => j !== c).map((j) => at(r * 3 + j));
    const inCol = [0, 1, 2].filter((i) => i !== r).map((i) => at(i * 3 + c));
    if (inRow[0] === inRow[1]) answer.push(inRow[0] as string);
    else if (inCol[0] === inCol[1]) answer.push(inCol[0] as string);
    else {
      const values = new Set(parts.flatMap((part) => (part ? [part[k] as string] : [])));
      const missing = [...values].filter((value) => !inRow.includes(value));
      if (values.size !== 3 || missing.length !== 1) throw new Error('oracle figureGrid: no one value is missing from the row');
      answer.push(missing[0] as string);
    }
  }
  const filled = parts.map((part) => part ?? answer);
  for (let k = 0; k < width; k += 1) {
    const value = (i: number): string => (filled[i] as string[])[k] as string;
    const rows = [0, 1, 2].map((i) => [0, 1, 2].map((j) => value(i * 3 + j)));
    const cols = [0, 1, 2].map((j) => [0, 1, 2].map((i) => value(i * 3 + j)));
    const allSame = (lines: string[][]): boolean => lines.every((line) => new Set(line).size === 1);
    const eachOnce = (lines: string[][]): boolean => lines.every((line) => new Set(line).size === 3);
    if (!(allSame(rows) || allSame(cols) || (eachOnce(rows) && eachOnce(cols)))) throw new Error(`oracle figureGrid: attribute ${k} follows no rule`);
  }
  return { kind: 'value', value: answer.join('|') };
};

// A picture of pieces side by side, each { shape, color, turn } (quarter turns clockwise, not flipped).
// A mirror swaps left and right of the whole picture: the order of the pieces is reversed and each one
// is flipped. The app draws a flip before the turn, so a flipped piece's turn runs the other way.
// The answer is each piece as "shape:colour:turnf", joined with spaces.
export const mirrorRow: Oracle = (facts) => {
  const pieces = list(facts, 'pieces').map((piece) => {
    if (piece === null || typeof piece !== 'object' || Array.isArray(piece)) throw new Error('oracle mirrorRow: a piece needs a shape, a colour and a turn');
    const { shape, color, turn } = piece as { shape?: unknown; color?: unknown; turn?: unknown };
    if (typeof shape !== 'string' || typeof color !== 'string' || typeof turn !== 'number' || !Number.isInteger(turn) || turn < 0 || turn > 3) {
      throw new Error('oracle mirrorRow: a piece needs a shape, a colour and a turn from 0 to 3');
    }
    return { shape, color, turn };
  });
  if (pieces.length < 2) throw new Error('oracle mirrorRow: needs at least two pieces');
  return { kind: 'value', value: [...pieces].reverse().map((piece) => `${piece.shape}:${piece.color}:${(4 - piece.turn) % 4}f`).join(' ') };
};

// A balance scale: the left pan holds numbers and empty boxes that all hold the same number, the right
// pan holds numbers. The answer is the number in each box.
export const balance: Oracle = (facts) => {
  const left = list(facts, 'left');
  const right = list(facts, 'right');
  const boxes = left.filter((value) => value === 'blank').length;
  const known = left.filter((value): value is number => typeof value === 'number');
  if (boxes === 0) throw new Error('oracle balance: there is no empty box');
  if (known.length + boxes !== left.length || !right.every((value) => typeof value === 'number')) throw new Error('oracle balance: a pan holds something that is not a number or a box');
  const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);
  const share = (sum(right as number[]) - sum(known)) / boxes;
  if (!Number.isInteger(share) || share < 0) throw new Error('oracle balance: the boxes cannot share what is left equally');
  return { kind: 'value', value: share };
};
