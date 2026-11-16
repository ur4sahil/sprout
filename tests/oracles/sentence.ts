import { ASKING, SHOUTING, TELLING } from '../../src/content/data/sentences';
import type { Oracle } from './types';
import { text } from './types';

const bare = (sentence: string): string => sentence.replace(/[.?!]$/, '').toLowerCase();

// A sentence from the section 9 lists, given as `base`: its words in small letters with no end mark.
// ask: capital, period, both (the correctly written telling sentence), endMark (the mark it ends with).
export const sentence: Oracle = (facts) => {
  const base = text(facts, 'base');
  const ask = text(facts, 'ask');
  if (ask === 'endMark') {
    const found = [...TELLING, ...ASKING, ...SHOUTING].filter((each) => bare(each) === base);
    if (found.length !== 1) throw new Error(`oracle sentence: "${base}" is not one sentence in the lists`);
    return { kind: 'value', value: (found[0] as string).slice(-1) };
  }
  if (ask !== 'capital' && ask !== 'period' && ask !== 'both') throw new Error(`oracle sentence: unknown ask ${ask}`);
  if (!TELLING.some((each) => bare(each) === base)) throw new Error(`oracle sentence: "${base}" is not a telling sentence in the list`);
  // A capital letter first, a period last. The word I is always a capital.
  const words = base.split(' ').map((word) => (word === 'i' ? 'I' : word));
  const joined = words.join(' ');
  return { kind: 'value', value: `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.` };
};
