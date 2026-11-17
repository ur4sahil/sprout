import type { Oracle } from '../types';
import { list, num, text } from '../types';

// Wave H5 (Math grade 3): number sentences worked out from their written form.
// A sentence is written the way the child sees it: "(2 × 3) × 4", "7 × 8 = 35 + □", "2/3 × 12".
// Signs: + and − (or -), × and ÷, and / for a fraction, which is a division. × ÷ / come before + and −,
// brackets first. □ is the one unknown number; it may appear more than once ("6 + □ + 6 + □ = 20").
// Values are kept as exact fractions, so 2/3 × 12 is 8 and 3/8 is less than 5/8.

type Rat = { n: number; d: number };
type Node = { kind: 'num'; value: number } | { kind: 'box' } | { kind: 'op'; op: string; left: Node; right: Node };

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
function rat(n: number, d: number): Rat {
  if (d === 0) throw new Error('oracle expression3: division by zero');
  const g = gcd(n, d) || 1;
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: (sign * d) / g };
}
const sameRat = (a: Rat, b: Rat): boolean => a.n === b.n && a.d === b.d;

function tokens(source: string): string[] {
  const found = source.replace(/,(?=\d{3})/g, '').match(/\d+|[()+\-−×÷/□=]|\S/g) ?? [];
  for (const token of found) if (!/^(\d+|[()+\-−×÷/□=])$/.test(token)) throw new Error(`oracle expression3: cannot read "${token}" in "${source}"`);
  return found;
}

function parse(source: string): Node {
  const all = tokens(source);
  let at = 0;
  const peek = (): string | undefined => all[at];
  const take = (): string => {
    const token = all[at];
    if (token === undefined) throw new Error(`oracle expression3: "${source}" ends too soon`);
    at += 1;
    return token;
  };
  function factor(): Node {
    const token = take();
    if (token === '(') {
      const inner = sum();
      if (take() !== ')') throw new Error(`oracle expression3: a bracket is not closed in "${source}"`);
      return inner;
    }
    if (token === '□') return { kind: 'box' };
    if (/^\d+$/.test(token)) return { kind: 'num', value: Number(token) };
    throw new Error(`oracle expression3: a number is missing in "${source}"`);
  }
  function product(): Node {
    let node = factor();
    while (peek() === '×' || peek() === '÷' || peek() === '/') node = { kind: 'op', op: take(), left: node, right: factor() };
    return node;
  }
  function sum(): Node {
    let node = product();
    while (peek() === '+' || peek() === '-' || peek() === '−') node = { kind: 'op', op: take() === '+' ? '+' : '-', left: node, right: product() };
    return node;
  }
  const node = sum();
  if (at !== all.length) throw new Error(`oracle expression3: cannot read the end of "${source}"`);
  return node;
}

function worth(node: Node, box: number | null): Rat {
  if (node.kind === 'num') return rat(node.value, 1);
  if (node.kind === 'box') {
    if (box === null) throw new Error('oracle expression3: a □ where no unknown is allowed');
    return rat(box, 1);
  }
  const [a, b] = [worth(node.left, box), worth(node.right, box)];
  if (node.op === '+') return rat(a.n * b.d + b.n * a.d, a.d * b.d);
  if (node.op === '-') return rat(a.n * b.d - b.n * a.d, a.d * b.d);
  if (node.op === '×') return rat(a.n * b.n, a.d * b.d);
  return rat(a.n * b.d, a.d * b.n); // ÷ and /
}

export function valueOf(source: string): Rat {
  return worth(parse(source), null);
}

function whole(source: string): number {
  const value = valueOf(source);
  if (value.d !== 1) throw new Error(`oracle expression3: "${source}" is not a whole number`);
  return value.n;
}

// The one whole number from 0 to 1,000 that makes the sentence true.
export function solve(source: string): number {
  const sides = source.split('=');
  if (sides.length !== 2) throw new Error(`oracle expression3: "${source}" needs one equals sign`);
  const [left, right] = [parse(sides[0] as string), parse(sides[1] as string)];
  const found: number[] = [];
  for (let box = 0; box <= 1000 && found.length < 2; box += 1) {
    try {
      if (sameRat(worth(left, box), worth(right, box))) found.push(box);
    } catch {
      // A □ of zero under a division sign: not an answer.
    }
  }
  if (found.length !== 1) throw new Error(`oracle expression3: "${source}" has ${found.length === 0 ? 'no' : 'more than one'} answer`);
  return found[0] as number;
}

const nearest = (n: number, to: number): number => (n % to >= to / 2 ? n - (n % to) + to : n - (n % to));

// ask:
//   value      the whole number facts.expr is worth
//   equal      of facts.options (sentences), the one worth the same as facts.expr
//   missing    the number for □ that makes the equation facts.expr true
//   parity     "even" or "odd" for the whole number facts.expr is worth
//   pickParity of facts.options, the one sentence whose value is facts.want ("even" or "odd")
//   most/least of facts.exprs, the place of the greatest or least value
//   roundTimes facts.a times facts.b rounded to the nearest facts.to
export const expression3: Oracle = (facts) => {
  const ask = text(facts, 'ask');
  const options = (): string[] => list(facts, 'options').map(String);
  const only = (found: string[], what: string): string => {
    if (found.length !== 1) throw new Error(`oracle expression3: ${found.length} options are ${what}`);
    return found[0] as string;
  };
  if (ask === 'value') return { kind: 'value', value: whole(text(facts, 'expr')) };
  if (ask === 'equal') {
    const target = valueOf(text(facts, 'expr'));
    return { kind: 'value', value: only(options().filter((option) => sameRat(valueOf(option), target)), `worth ${text(facts, 'expr')}`) };
  }
  if (ask === 'missing') return { kind: 'value', value: solve(text(facts, 'expr')) };
  if (ask === 'parity') return { kind: 'value', value: whole(text(facts, 'expr')) % 2 === 0 ? 'even' : 'odd' };
  if (ask === 'pickParity') {
    const want = text(facts, 'want');
    return { kind: 'value', value: only(options().filter((option) => (whole(option) % 2 === 0 ? 'even' : 'odd') === want), want) };
  }
  if (ask === 'most' || ask === 'least') {
    const values = list(facts, 'exprs').map((each) => valueOf(String(each)));
    const bigger = (a: Rat, b: Rat): boolean => a.n * b.d > b.n * a.d;
    const best = values.reduce((keep, value) => ((ask === 'most' ? bigger(value, keep) : bigger(keep, value)) ? value : keep));
    const found = values.flatMap((value, index) => (sameRat(value, best) ? [index] : []));
    if (found.length !== 1) throw new Error(`oracle expression3: ${found.length} values tie for the ${ask}`);
    return { kind: 'index', index: found[0] as number };
  }
  if (ask === 'roundTimes') {
    const to = num(facts, 'to');
    if (to !== 10 && to !== 100) throw new Error('oracle expression3: round to 10 or 100');
    return { kind: 'value', value: num(facts, 'a') * nearest(num(facts, 'b'), to) };
  }
  throw new Error(`oracle expression3: unknown ask ${ask}`);
};

// Which sign a story needs, from what happens in it (kept here, apart from the stories):
// join (things put together), separate (some go away), compare (how many more), groups and array
// (equal groups put together), share (shared out equally) and groupsOf (how many groups of a size).
const SIGN: Record<string, string> = { join: '+', separate: '−', compare: '−', groups: '×', array: '×', share: '÷', groupsOf: '÷' };

// ask: sign (the sign the story needs), sentence (the number sentence: "a sign b").
export const operation3: Oracle = (facts) => {
  const sign = SIGN[text(facts, 'kind')];
  if (!sign) throw new Error(`oracle operation3: unknown story kind ${text(facts, 'kind')}`);
  const ask = text(facts, 'ask');
  if (ask === 'sign') return { kind: 'value', value: sign };
  if (ask === 'sentence') {
    const [a, b] = [num(facts, 'a'), num(facts, 'b')];
    if ((sign === '−' && b > a) || (sign === '÷' && a % b !== 0)) throw new Error('oracle operation3: the numbers do not fit the story');
    return { kind: 'value', value: `${a} ${sign} ${b}` };
  }
  throw new Error(`oracle operation3: unknown ask ${ask}`);
};
