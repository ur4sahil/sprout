import type { Facts } from '../../../src/engine/types';
import type { Oracle } from '../types';
import { list, num, numbers, same, text } from '../types';

// Oracles added by wave H1. Their names and facts are in src/engine/oracleFacts/h1.ts.
// Each works the answer out from the facts with its own tables, never from a generator or a data list.

function only<T>(found: T[], what: string): T {
  if (found.length !== 1) throw new Error(`oracle ${what}: ${found.length} answers fit, not 1`);
  return found[0] as T;
}
const strings = (facts: Facts, name: string): string[] => list(facts, name).map(String);

// ---- Kindergarten ----

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];

// A line of names from the front. ask: which (the name in place facts.want, a word such as "third"),
// place (the place word of facts.target).
const h1Ordinal: Oracle = (facts) => {
  const line = strings(facts, 'line');
  const ask = text(facts, 'ask');
  if (ask === 'which') {
    const at = ORDINALS.indexOf(text(facts, 'want'));
    if (at < 0 || at >= line.length) throw new Error('oracle h1Ordinal: no one stands in that place');
    return { kind: 'value', value: line[at] as string };
  }
  if (ask === 'place') {
    const at = only(line.flatMap((name, i) => (name === text(facts, 'target') ? [i] : [])), 'h1Ordinal');
    return { kind: 'value', value: ORDINALS[at] as string };
  }
  throw new Error(`oracle h1Ordinal: unknown ask ${ask}`);
};

// need things, have of what each needs. ask: enough (Yes or No), more (how many more are needed).
const h1Enough: Oracle = (facts) => {
  const need = num(facts, 'need');
  const have = num(facts, 'have');
  const ask = text(facts, 'ask');
  if (ask === 'enough') return { kind: 'value', value: have >= need ? 'Yes' : 'No' };
  if (ask === 'more') return { kind: 'value', value: Math.max(0, need - have) };
  throw new Error(`oracle h1Enough: unknown ask ${ask}`);
};

// The sign that makes a ? b = result true.
const h1WhichSign: Oracle = (facts) => {
  const [a, b, result] = [num(facts, 'a'), num(facts, 'b'), num(facts, 'result')];
  const signs = [...(a + b === result ? ['+'] : []), ...(a - b === result ? ['-'] : [])];
  return { kind: 'value', value: only(signs, 'h1WhichSign') };
};

// The sentence (a op b = result) or the sum alone (a op b, for a picture) that a and b make.
const h1SentenceFor: Oracle = (facts) => {
  const [a, b] = [num(facts, 'a'), num(facts, 'b')];
  const op = text(facts, 'op');
  if (op !== '+' && op !== '-') throw new Error(`oracle h1SentenceFor: unknown sign ${op}`);
  const result = op === '+' ? a + b : a - b;
  if (result < 0) throw new Error('oracle h1SentenceFor: below zero');
  const ask = text(facts, 'ask');
  if (ask === 'sentence') return { kind: 'value', value: `${a} ${op} ${b} = ${result}` };
  if (ask === 'picture') return { kind: 'value', value: `${a} ${op} ${b}` };
  throw new Error(`oracle h1SentenceFor: unknown ask ${ask}`);
};

const SHAPE_OF: Record<string, string> = {
  clock: 'circle',
  cookie: 'circle',
  'pizza slice': 'triangle',
  tent: 'triangle',
  door: 'rectangle',
  phone: 'rectangle',
  ball: 'sphere',
  basketball: 'sphere',
  can: 'cylinder',
  candle: 'cylinder',
  box: 'cube',
  present: 'cube',
};

// ask: object (the option shaped like facts.target), shape (the shape of facts.object).
const h1ObjectShape: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (ask === 'object') return { kind: 'value', value: only(strings(facts, 'options').filter((name) => SHAPE_OF[name] === text(facts, 'target')), 'h1ObjectShape') };
  if (ask === 'shape') {
    const found = SHAPE_OF[text(facts, 'object')];
    if (!found) throw new Error('oracle h1ObjectShape: unknown thing');
    return { kind: 'value', value: found };
  }
  throw new Error(`oracle h1ObjectShape: unknown ask ${ask}`);
};

const SOLID: Record<string, { rolls: boolean; stacks: boolean; faces: number; face: string }> = {
  sphere: { rolls: true, stacks: false, faces: 0, face: 'none' },
  cube: { rolls: false, stacks: true, faces: 6, face: 'square' },
  cylinder: { rolls: true, stacks: true, faces: 2, face: 'circle' },
  cone: { rolls: true, stacks: false, faces: 1, face: 'circle' },
};
const solidOf = (name: string): (typeof SOLID)[string] => {
  const found = SOLID[name];
  if (!found) throw new Error(`oracle h1Solids: unknown solid ${name}`);
  return found;
};
const FITS: Record<string, (s: (typeof SOLID)[string]) => boolean> = {
  both: (s) => s.rolls && s.stacks,
  stackOnly: (s) => s.stacks && !s.rolls,
  rollOnly: (s) => s.rolls && !s.stacks,
  none: (s) => s.faces === 0,
  square: (s) => s.face === 'square',
  one: (s) => s.faces === 1,
  two: (s) => s.faces === 2,
};

// ask: roll, stack (Yes or No for facts.solid), faces (how many flat faces), faceShape (the shape of a face),
// which (the option that fits facts.want).
const h1Solids: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  if (ask === 'which') {
    const fits = FITS[text(facts, 'want')];
    if (!fits) throw new Error('oracle h1Solids: unknown want');
    return { kind: 'value', value: only(strings(facts, 'options').filter((name) => fits(solidOf(name))), 'h1Solids') };
  }
  const s = solidOf(text(facts, 'solid'));
  if (ask === 'roll') return { kind: 'value', value: s.rolls ? 'Yes' : 'No' };
  if (ask === 'stack') return { kind: 'value', value: s.stacks ? 'Yes' : 'No' };
  if (ask === 'faces') return { kind: 'value', value: s.faces };
  if (ask === 'faceShape') {
    if (s.faces === 0) throw new Error('oracle h1Solids: a sphere has no face');
    return { kind: 'value', value: s.face };
  }
  throw new Error(`oracle h1Solids: unknown ask ${ask}`);
};

// Rough weights in kilograms and amounts held in millilitres.
const WEIGHT: Record<string, number> = { elephant: 4000, truck: 8000, car: 1300, cow: 650, horse: 500, dog: 25, bike: 12, pumpkin: 6, apple: 0.2, key: 0.02, leaf: 0.002, pencil: 0.01 };
const HOLDS: Record<string, number> = { spoon: 5, cup: 300, glass: 250, pot: 4000, bathtub: 200000 };

// The option that weighs or holds the most or the least.
const h1MeasureOrder: Oracle = (facts) => {
  const table = text(facts, 'kind') === 'weight' ? WEIGHT : HOLDS;
  const options = strings(facts, 'options');
  const values = options.map((name) => {
    const value = table[name];
    if (value === undefined) throw new Error(`oracle h1MeasureOrder: unknown thing ${name}`);
    return value;
  });
  const ask = text(facts, 'ask');
  const want = ask === 'most' ? Math.max(...values) : ask === 'least' ? Math.min(...values) : NaN;
  return { kind: 'value', value: only(options.filter((_, i) => values[i] === want), 'h1MeasureOrder') };
};

const ATTRIBUTES = ['by shape', 'by color', 'by size'];

// Groups of items, each [shape, colour, size]: the attribute that is the same inside every group and
// different from group to group.
const h1SortRule: Oracle = (facts) => {
  const groups = list(facts, 'groups').map((group) => {
    if (!Array.isArray(group) || group.length === 0) throw new Error('oracle h1SortRule: a group is empty');
    return group.map((item) => {
      if (!Array.isArray(item) || item.length !== 3) throw new Error('oracle h1SortRule: an item needs three attributes');
      return item.map(String);
    });
  });
  const rules = ATTRIBUTES.filter((_, at) => {
    const inside = groups.every((group) => group.every((item) => item[at] === (group[0] as string[])[at]));
    return inside && new Set(groups.map((group) => (group[0] as string[])[at])).size === groups.length;
  });
  return { kind: 'value', value: only(rules, 'h1SortRule') };
};

// Each thing in a row named by its first appearance: "cat cat dog cat cat dog" is AABAAB.
function shapeOf(row: string): string {
  const seen: string[] = [];
  return row
    .split(' ')
    .map((word) => {
      if (!seen.includes(word)) seen.push(word);
      return 'ABCDEFG'[seen.indexOf(word)];
    })
    .join('');
}

// The option row that repeats the same way as facts.target.
const h1PatternKind: Oracle = (facts) => {
  const want = shapeOf(text(facts, 'target'));
  return { kind: 'value', value: only(strings(facts, 'options').filter((row) => shapeOf(row) === want), 'h1PatternKind') };
};

// ---- Grade 1 ----

// The option [tens, ones] that makes n.
const h1TensOnes: Oracle = (facts) => {
  const n = num(facts, 'n');
  const found = list(facts, 'options').filter((option) => Array.isArray(option) && option.length === 2 && Number(option[0]) * 10 + Number(option[1]) === n);
  return { kind: 'value', value: (only(found, 'h1TensOnes') as number[]).map(Number) };
};

// A 3 by 3 piece of a hundred chart (rows of ten, 1 to 10 in the first row). The cell at place blank
// (0 to 8, row by row) under a top left cell.
const h1Chart: Oracle = (facts) => {
  const topLeft = num(facts, 'topLeft');
  const blank = num(facts, 'blank');
  const column = ((topLeft - 1) % 10) + 1;
  if (column > 8) throw new Error('oracle h1Chart: the piece would run off the row');
  if (!Number.isInteger(blank) || blank < 0 || blank > 8) throw new Error('oracle h1Chart: no such box');
  return { kind: 'value', value: topLeft + Math.floor(blank / 3) * 10 + (blank % 3) };
};

// An equation "x + y = z" or "x - y = z", or null when it is not one.
function parse(option: string): { values: number[]; true: boolean } | null {
  const parts = /^(\d+) ([+-]) (\d+) = (\d+)$/.exec(option);
  if (!parts) return null;
  const [x, y, z] = [Number(parts[1]), Number(parts[3]), Number(parts[4])];
  return { values: [x, y, z], true: (parts[2] === '+' ? x + y : x - y) === z };
}
const sorted = (values: number[]): string => [...values].sort((p, q) => p - q).join(',');

// ask: in (the one fact of the family of facts.numbers), notIn (the one option that is not of it).
// A fact is in the family when it is true and uses exactly the family's three numbers.
const h1FactFamily: Oracle = (facts) => {
  const family = sorted(numbers(facts, 'numbers'));
  const options = strings(facts, 'options');
  const inFamily = options.filter((option) => {
    const parsed = parse(option);
    return parsed !== null && parsed.true && sorted(parsed.values) === family;
  });
  const ask = text(facts, 'ask');
  if (ask === 'in') return { kind: 'value', value: only(inFamily, 'h1FactFamily') };
  if (ask === 'notIn') return { kind: 'value', value: only(options.filter((option) => !inFamily.includes(option)), 'h1FactFamily') };
  throw new Error(`oracle h1FactFamily: unknown ask ${ask}`);
};

// Both sides of an equation, such as [4, '+', 4] and [6, '+', 'blank']: the number for the blank.
const h1Balance: Oracle = (facts) => {
  // Each side as a sum of signed terms: a known total and the sign of the blank, if it holds one.
  const read = (name: string): { total: number; blank: number } => {
    const parts = list(facts, name);
    let total = 0;
    let blank = 0;
    let sign = 1;
    parts.forEach((part, i) => {
      if (i % 2 === 1) {
        if (part === '+') sign = 1;
        else if (part === '-') sign = -1;
        else throw new Error('oracle h1Balance: unknown sign');
      } else if (part === 'blank') blank = sign;
      else if (typeof part === 'number') total += sign * part;
      else throw new Error('oracle h1Balance: a number is missing');
    });
    return { total, blank };
  };
  const left = read('left');
  const right = read('right');
  if (Math.abs(left.blank) + Math.abs(right.blank) !== 1) throw new Error('oracle h1Balance: there must be exactly one blank');
  // left.total + left.blank x = right.total + right.blank x
  const x = (right.total - left.total) / (left.blank - right.blank);
  if (!Number.isInteger(x) || x < 0) throw new Error('oracle h1Balance: no whole answer');
  return { kind: 'value', value: x };
};

// a − b with a from 11 to 19: take a's ones to reach 10, then "10 - the rest".
const h1DownToTen: Oracle = (facts) => {
  const [a, b] = [num(facts, 'a'), num(facts, 'b')];
  const ones = a % 10;
  if (a < 11 || a > 19 || b <= ones || b > 10) throw new Error('oracle h1DownToTen: this does not go past ten');
  return { kind: 'value', value: `10 - ${b - ones}` };
};

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const YEAR = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// The day or month facts.shift steps after (or before, when negative) facts.start.
const h1Calendar: Oracle = (facts) => {
  const names = text(facts, 'kind') === 'day' ? WEEK : YEAR;
  const at = names.indexOf(text(facts, 'start'));
  if (at < 0) throw new Error('oracle h1Calendar: unknown start');
  const shift = num(facts, 'shift');
  return { kind: 'value', value: names[(((at + shift) % names.length) + names.length) % names.length] as string };
};

// Facts "x is taller than y" as pairs [x, y]. ask: most (taller than all), least (shorter than all).
const h1Transitive: Oracle = (facts) => {
  const pairs = list(facts, 'pairs').map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2) throw new Error('oracle h1Transitive: a pair needs two names');
    return [String(pair[0]), String(pair[1])] as [string, string];
  });
  const names = [...new Set(pairs.flat())];
  // Everything each name is taller than, following the facts from one to the next.
  const below = (name: string, seen: Set<string> = new Set()): Set<string> => {
    for (const [big, small] of pairs) {
      if (big === name && !seen.has(small)) {
        seen.add(small);
        below(small, seen);
      }
    }
    return seen;
  };
  const ask = text(facts, 'ask');
  const fits = names.filter((name) => (ask === 'most' ? below(name).size === names.length - 1 : names.every((other) => other === name || below(other).has(name))));
  const answer = only(fits, 'h1Transitive');
  if (!list(facts, 'options').some((option) => same(option, answer))) throw new Error('oracle h1Transitive: the answer is not offered');
  return { kind: 'value', value: answer };
};

// The same whole cut into facts.parts[i] equal parts for each option. ask: bigger (the option with the
// biggest part: the fewest parts), smaller.
const h1ShareSize: Oracle = (facts) => {
  const parts = numbers(facts, 'parts');
  const sizes = parts.map((count) => 1 / count);
  const ask = text(facts, 'ask');
  const want = ask === 'bigger' ? Math.max(...sizes) : ask === 'smaller' ? Math.min(...sizes) : NaN;
  return { kind: 'index', index: only(sizes.flatMap((size, i) => (size === want ? [i] : [])), 'h1ShareSize') };
};

export const WAVE: Record<string, Oracle> = {
  h1Ordinal,
  h1Enough,
  h1WhichSign,
  h1SentenceFor,
  h1ObjectShape,
  h1Solids,
  h1MeasureOrder,
  h1SortRule,
  h1PatternKind,
  h1TensOnes,
  h1Chart,
  h1FactFamily,
  h1Balance,
  h1DownToTen,
  h1Calendar,
  h1Transitive,
  h1ShareSize,
};
