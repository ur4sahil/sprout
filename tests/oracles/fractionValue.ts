import type { Oracle } from './types';
import { num, text } from './types';

// A fraction n/d. ask: name (written "3/4"), parts (how many n/d make 1), equivalent (of facts.options, written "c/d",
// the one other fraction worth the same as n/d).
function parse(option: unknown): [number, number] | null {
  const found = typeof option === 'string' ? /^(\d+)\/(\d+)$/.exec(option) : null;
  return found ? [Number(found[1]), Number(found[2])] : null;
}

export const fractionValue: Oracle = (facts) => {
  const n = num(facts, 'n');
  const d = num(facts, 'd');
  if (!Number.isInteger(n) || !Number.isInteger(d) || n < 0 || d < 1) throw new Error('oracle fractionValue: n and d must be whole numbers, d at least 1');
  const ask = text(facts, 'ask');
  if (ask === 'name') return { kind: 'value', value: `${n}/${d}` };
  // parts: how many parts of size n/d make one whole.
  if (ask === 'parts') {
    if (d % n !== 0) throw new Error('oracle fractionValue: those parts do not make a whole');
    return { kind: 'value', value: d / n };
  }
  if (ask === 'equivalent') {
    if (!Array.isArray(facts.options)) throw new Error('oracle fractionValue: facts.options is needed');
    // Cross-multiplying: c/d' equals n/d when c × d = n × d'.
    const found = facts.options.filter((option) => {
      const pair = parse(option);
      return pair !== null && pair[0] * d === n * pair[1] && !(pair[0] === n && pair[1] === d);
    });
    if (found.length !== 1) throw new Error(`oracle fractionValue: ${found.length} options are equal to ${n}/${d}`);
    return { kind: 'value', value: found[0] as string };
  }
  throw new Error(`oracle fractionValue: unknown ask ${ask}`);
};
