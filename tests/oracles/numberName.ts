import type { Oracle } from './types';
import { num, text } from './types';

// Written apart from the app's own number words, from the rules of English:
// thousands, then hundreds, then the last two digits, with a hyphen between tens and ones.
const SMALL = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS: Record<number, string> = { 2: 'twenty', 3: 'thirty', 4: 'forty', 5: 'fifty', 6: 'sixty', 7: 'seventy', 8: 'eighty', 9: 'ninety' };

function name(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 9999) throw new Error(`oracle numberName: ${n} is not a whole number from 1 to 9,999`);
  const words: string[] = [];
  let rest = n;
  if (rest >= 1000) {
    words.push(SMALL[Math.floor(rest / 1000)] as string, 'thousand');
    rest %= 1000;
  }
  if (rest >= 100) {
    words.push(SMALL[Math.floor(rest / 100)] as string, 'hundred');
    rest %= 100;
  }
  if (rest >= 20) words.push(rest % 10 === 0 ? (TENS[Math.floor(rest / 10)] as string) : `${TENS[Math.floor(rest / 10)]}-${SMALL[rest % 10]}`);
  else if (rest > 0) words.push(SMALL[rest] as string);
  return words.join(' ');
}

// A number and its name. ask: numeral (the number itself) or words (its name).
export const numberName: Oracle = (facts) => {
  const n = num(facts, 'n');
  const ask = text(facts, 'ask');
  if (ask === 'numeral') return { kind: 'value', value: n };
  if (ask === 'words') return { kind: 'value', value: name(n) };
  throw new Error(`oracle numberName: unknown ask ${ask}`);
};
