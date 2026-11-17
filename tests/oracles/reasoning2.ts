import { VERBAL_RELATIONS, WORD_CLASSES } from '../../src/content/data/verbal';
import type { Oracle } from './types';
import { list } from './types';

// Reasoning A.15 to A.17 (phase I), worked out from the facts and the word lists.

// The one option that pairs with base the way from[0] pairs with from[1], in any relation they share.
export const verbalAnalogy: Oracle = (facts) => {
  const [a, b] = list(facts, 'from').map(String) as [string, string];
  const base = String(facts.base);
  const shared = Object.values(VERBAL_RELATIONS).filter((rel) => rel.pairs.some(([x, y]) => x === a && y === b));
  const found = list(facts, 'options').map(String).filter((option) => shared.some((rel) => rel.pairs.some(([x, y]) => x === base && y === option)));
  if (found.length !== 1) throw new Error(`oracle verbalAnalogy: ${found.length} options fit`);
  return { kind: 'value', value: found[0] as string };
};

// The one word whose group holds none of the others.
export const verbalClass: Oracle = (facts) => {
  const words = list(facts, 'words').map(String);
  const groupOf = (w: string): string => {
    const found = Object.entries(WORD_CLASSES).find(([, members]) => members.includes(w));
    if (!found) throw new Error(`oracle verbalClass: ${w} is in no group`);
    return found[0];
  };
  const odd = words.filter((w) => words.filter((other) => groupOf(other) === groupOf(w)).length === 1);
  if (odd.length !== 1 || words.length - 1 < 2) throw new Error(`oracle verbalClass: ${odd.length} words stand alone`);
  return { kind: 'value', value: odd[0] as string };
};

// A 3 by 3 grid with -1 for the blank. rule step: each row goes up by the same step as the full rows;
// rule sum: the third number of a row is the first two added.
export const numberGrid: Oracle = (facts) => {
  const rows = list(facts, 'rows').map((row) => (Array.isArray(row) ? row.map(Number) : []));
  const full = rows.filter((row) => !row.includes(-1));
  const gap = rows.find((row) => row.includes(-1));
  if (!gap || full.length < 2) throw new Error('oracle numberGrid: needs two full rows and one with a blank');
  const at = gap.indexOf(-1);
  if (facts.rule === 'sum') {
    if (!full.every(([x = 0, y = 0, z = 0]) => x + y === z)) throw new Error('oracle numberGrid: the full rows do not add up');
    const [x = 0, y = 0, z = 0] = gap;
    return { kind: 'value', value: at === 2 ? x + y : at === 1 ? z - x : z - y };
  }
  const step = (full[0]?.[1] ?? 0) - (full[0]?.[0] ?? 0);
  if (!full.every(([x = 0, y = 0, z = 0]) => y - x === step && z - y === step)) throw new Error('oracle numberGrid: the full rows do not share a step');
  const start = at === 0 ? (gap[1] ?? 0) - step : (gap[0] ?? 0);
  return { kind: 'value', value: start + step * at };
};
