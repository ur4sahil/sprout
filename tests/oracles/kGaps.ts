import type { Oracle } from './types';
import { list, num, text } from './types';

// Kindergarten gap skills, worked out from facts kept here (plan section 5).

// Where the thing at slot a sits against the box at slot b, on a 5 by 4 grid.
function relation(a: number, b: number): string {
  const [ac, ar, bc, br] = [a % 5, Math.floor(a / 5), b % 5, Math.floor(b / 5)];
  if (ac === bc && ar === br - 1) return 'above';
  if (ac === bc && ar === br + 1) return 'below';
  if (ar === br && Math.abs(ac - bc) === 1) return 'beside';
  throw new Error(`oracle position: slots ${a} and ${b} are not next to each other`);
}
const pair = (value: unknown): [number, number] => {
  if (!Array.isArray(value) || value.length !== 2) throw new Error('oracle position: a slot pair is needed');
  return [Number(value[0]), Number(value[1])];
};

// ask: where (the words for the one pair), pick (the place of the pair that is facts.want).
export const position: Oracle = (facts) => {
  const slots = list(facts, 'slots').map(pair);
  const ask = text(facts, 'ask');
  if (ask === 'where') return { kind: 'value', value: `${relation(...(slots[0] as [number, number]))} the box` };
  if (ask === 'pick') {
    const want = text(facts, 'want');
    const found = slots.flatMap((each, i) => (relation(...each) === want ? [i] : []));
    if (found.length !== 1) throw new Error(`oracle position: ${found.length} pictures show ${want}`);
    return { kind: 'index', index: found[0] as number };
  }
  throw new Error(`oracle position: unknown ask ${ask}`);
};

const MAKES: Record<string, string> = { '2 square': 'rectangle', '2 triangle': 'square', '2 trapezoid': 'hexagon', '6 triangle': 'hexagon', '4 square': 'square', '4 triangle': 'triangle' };

// ask: makes (what count pieces make), pieces (of the options, the set of pieces that makes facts.makes).
export const composeShape: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (ask === 'makes') {
    const made = MAKES[`${num(facts, 'count')} ${text(facts, 'piece')}`];
    if (!made) throw new Error('oracle composeShape: those pieces are not in the table');
    return { kind: 'value', value: made };
  }
  if (ask === 'count') {
    const found = Object.entries(MAKES).filter(([key, made]) => made === text(facts, 'makes') && key.endsWith(` ${text(facts, 'piece')}`) && key !== '4 square');
    if (found.length !== 1) throw new Error('oracle composeShape: not one way to make it from those pieces');
    return { kind: 'value', value: Number((found[0] as [string, string])[0].split(' ')[0]) };
  }
  if (ask === 'pieces') {
    const makes = text(facts, 'makes');
    const found = list(facts, 'options').map(String).filter((each) => MAKES[each] === makes);
    if (found.length !== 1) throw new Error(`oracle composeShape: ${found.length} options make a ${makes}`);
    return { kind: 'value', value: found[0] as string };
  }
  throw new Error(`oracle composeShape: unknown ask ${ask}`);
};

const TELLS: Record<string, string> = { 'a ruler': 'how long', 'a scale': 'how heavy', 'a measuring cup': 'how much it holds' };

// ask: tells (what the tool tells), tool (the tool that tells facts.want).
export const measureTool: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (ask === 'tells') return { kind: 'value', value: TELLS[text(facts, 'tool')] ?? '?' };
  if (ask === 'tool') {
    const found = Object.entries(TELLS).find(([, tells]) => tells === text(facts, 'want'));
    if (!found) throw new Error('oracle measureTool: no tool tells that');
    return { kind: 'value', value: found[0] };
  }
  throw new Error(`oracle measureTool: unknown ask ${ask}`);
};

// Of rows of clips, the one that starts at the very end with no gaps: each row is "start,nogap" and so on.
export const lineUp: Oracle = (facts) => {
  if (text(facts, 'ask') !== 'lined') throw new Error('oracle lineUp: unknown ask');
  const rows = list(facts, 'rows').map(String);
  const found = rows.flatMap((row, i) => (row === 'start,nogap' ? [i] : []));
  if (found.length !== 1) throw new Error(`oracle lineUp: ${found.length} rows are lined up`);
  return { kind: 'index', index: found[0] as number };
};

// a + b against b + a. ask: missing (the number that makes a + b = b + ?), same (the option written "b + a").
export const turnaround: Oracle = (facts) => {
  const [a, b] = [num(facts, 'a'), num(facts, 'b')];
  const ask = text(facts, 'ask');
  if (ask === 'missing') return { kind: 'value', value: a };
  if (ask === 'same') {
    const found = list(facts, 'options').map(String).filter((option) => {
      const parts = /^(\d+) ([+-]) (\d+)$/.exec(option);
      if (!parts) return false;
      const value = parts[2] === '+' ? Number(parts[1]) + Number(parts[3]) : Number(parts[1]) - Number(parts[3]);
      return value === a + b;
    });
    if (found.length !== 1) throw new Error(`oracle turnaround: ${found.length} options equal ${a} + ${b}`);
    return { kind: 'value', value: found[0] as string };
  }
  throw new Error(`oracle turnaround: unknown ask ${ask}`);
};

// The sum of a list of numbers.
export const sumList: Oracle = (facts) => ({ kind: 'value', value: list(facts, 'numbers').reduce((sum: number, n) => sum + Number(n), 0) });

// Length units. ask: unit (inches under a foot and a half, else feet), moreUnits (the smaller unit gives
// the bigger number: centimeters), estimate (about the length, in the fitting unit).
export const unitChoice: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (ask === 'unit') return { kind: 'value', value: num(facts, 'inches') < 18 ? 'inches' : 'feet' };
  if (ask === 'moreUnits') return { kind: 'value', value: 'the centimeters' };
  if (ask === 'fewerUnits') return { kind: 'value', value: 'the inches' };
  if (ask === 'estimate') {
    const inches = num(facts, 'inches');
    return { kind: 'value', value: inches < 18 ? `${inches} inches` : `${Math.round(inches / 12)} feet` };
  }
  throw new Error(`oracle unitChoice: unknown ask ${ask}`);
};
