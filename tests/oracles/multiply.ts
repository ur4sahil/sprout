import type { Oracle } from './types';
import { num, text } from './types';

// An array of rows and columns, or rows equal groups of cols. ask:
// total (rows times cols); addition (one number for each row: 3 rows of 4 is "4 + 4 + 4");
// groupsOf ("3 groups of 4"); sentence ("3 × 4"); turnaround ("4 × 3");
// missing (the factor named by blank: rows or cols); quotient (total divided by by, which must share exactly);
// inFamily / notInFamily (of the options, the one true fact that uses the same three numbers, or the one that does not).
const FACT = /^(\d+) ([×÷]) (\d+) = (\d+)$/;
function family(option: unknown, rows: number, cols: number): boolean {
  const found = typeof option === 'string' ? FACT.exec(option) : null;
  if (!found) return false;
  const [x, sign, y, z] = [Number(found[1]), found[2], Number(found[3]), Number(found[4])];
  const true_ = sign === '×' ? x * y === z : y !== 0 && x === y * z;
  const numbers = [x, y, z].sort((p, q) => p - q).join(',');
  return true_ && numbers === [rows, cols, rows * cols].sort((p, q) => p - q).join(',');
}
function only(options: unknown, keep: (option: unknown) => boolean, what: string): string {
  if (!Array.isArray(options)) throw new Error('oracle multiply: facts.options is needed');
  const found = options.filter(keep);
  if (found.length !== 1) throw new Error(`oracle multiply: ${found.length} options are ${what}`);
  return found[0] as string;
}
export const multiply: Oracle = (facts) => {
  const rows = num(facts, 'rows');
  const cols = num(facts, 'cols');
  if (![rows, cols].every((value) => Number.isInteger(value) && value >= 1)) throw new Error('oracle multiply: rows and cols must be whole numbers, 1 or more');
  const ask = text(facts, 'ask');
  if (ask === 'total') return { kind: 'value', value: rows * cols };
  if (ask === 'addition') return { kind: 'value', value: Array.from({ length: rows }, () => cols).join(' + ') };
  if (ask === 'groupsOf') return { kind: 'value', value: `${rows} groups of ${cols}` };
  if (ask === 'sentence') return { kind: 'value', value: `${rows} × ${cols}` };
  if (ask === 'turnaround') return { kind: 'value', value: `${cols} × ${rows}` };
  if (ask === 'missing') {
    const blank = text(facts, 'blank');
    if (blank !== 'rows' && blank !== 'cols') throw new Error('oracle multiply: blank must be rows or cols');
    return { kind: 'value', value: blank === 'rows' ? rows : cols };
  }
  if (ask === 'quotient') {
    const total = num(facts, 'total');
    const by = num(facts, 'by');
    if (by < 1 || total % by !== 0) throw new Error(`oracle multiply: ${total} does not share equally by ${by}`);
    return { kind: 'value', value: total / by };
  }
  if (ask === 'inFamily') return { kind: 'value', value: only(facts.options, (option) => family(option, rows, cols), 'in the family') };
  if (ask === 'notInFamily') return { kind: 'value', value: only(facts.options, (option) => !family(option, rows, cols), 'outside the family') };
  throw new Error(`oracle multiply: unknown ask ${ask}`);
};
