import type { Oracle } from './types';
import { num, text } from './types';

function digit(facts: Parameters<Oracle>[0], name: string): number {
  const value = num(facts, name);
  if (!Number.isInteger(value) || value < 0 || value > 9) throw new Error(`oracle place: facts.${name} must be a digit from 0 to 9`);
  return value;
}

// A number given as its thousands (when there are any), hundreds, tens and ones digits.
// ask: number (the whole number), hundredsDigit, tensDigit, onesDigit (one digit),
// hundredsValue, tensValue, onesValue (what that digit is worth: the 4 in 47 is worth 40),
// expanded (the parts that are not zero, written "300 + 40 + 2").
export const place: Oracle = (facts) => {
  const thousands = 'thousands' in facts ? digit(facts, 'thousands') : 0;
  const hundreds = digit(facts, 'hundreds');
  const tens = digit(facts, 'tens');
  const ones = digit(facts, 'ones');
  const ask = text(facts, 'ask');
  switch (ask) {
    case 'number':
      return { kind: 'value', value: thousands * 1000 + hundreds * 100 + tens * 10 + ones };
    case 'thousandsDigit':
      return { kind: 'value', value: thousands };
    case 'thousandsValue':
      return { kind: 'value', value: thousands * 1000 };
    case 'hundredsDigit':
      return { kind: 'value', value: hundreds };
    case 'tensDigit':
      return { kind: 'value', value: tens };
    case 'onesDigit':
      return { kind: 'value', value: ones };
    case 'hundredsValue':
      return { kind: 'value', value: hundreds * 100 };
    case 'tensValue':
      return { kind: 'value', value: tens * 10 };
    case 'onesValue':
      return { kind: 'value', value: ones };
    case 'expanded': {
      const parts = [hundreds * 100, tens * 10, ones].filter((part) => part > 0);
      return { kind: 'value', value: parts.length === 0 ? '0' : parts.join(' + ') };
    }
    default:
      throw new Error(`oracle place: unknown ask ${ask}`);
  }
};
