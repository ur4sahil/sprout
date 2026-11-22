import type { Rng } from '../../../../engine/rng';
import type { Hint, Level, QuestionDraft, Say, SayPart, Visual } from '../../../../engine/types';
import { numeral } from '../../../generator';
import { numeralChoices } from '../k/numerals';
import { fractionSay } from './fractions';
import { written } from './numbers';

// What the wave H5 generators share (Math grade 3).

export type Explanation = { speak: Say; steps: string[]; visual: Visual; hint?: Hint };
export type Prompt = { text: string; speak: Say };
export const equation = (...parts: (number | string)[]): Visual => ({ kind: 'equation', parts });

// A piece of a story: a number, plain words, or something written one way and said another (a fraction, a time).
export type Piece = number | string | { text: string; say: Say };

// Fills a template such as "{name} has {a} {things}." Numbers are said as numbers.
export function fill(template: string, values: Record<string, Piece>): Prompt {
  let text = '';
  const speak: Say = [];
  for (const piece of template.split(/(\{\w+\})/)) {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    if (name === undefined) {
      text += piece;
      if (piece.trim().length > 0) speak.push(piece.trim());
      continue;
    }
    const value = values[name];
    if (value === undefined) throw new Error(`fill: no value for {${name}}`);
    if (typeof value === 'number') {
      text += written(value);
      speak.push({ number: value });
    } else if (typeof value === 'string') {
      text += value;
      speak.push(value);
    } else {
      text += value.text;
      speak.push(...value.say);
    }
  }
  return { text, speak: tidy(speak) };
}

// Joins plain words that sit next to each other, so speech reads as sentences.
function tidy(say: Say): Say {
  const out: SayPart[] = [];
  for (const part of say) {
    const last = out[out.length - 1];
    if (typeof part === 'string' && typeof last === 'string') out[out.length - 1] = /^[.,?!]/.test(part) ? `${last}${part}` : `${last} ${part}`;
    else out.push(part);
  }
  return out;
}

export const fractionPiece = (n: number, d: number): Piece => ({ text: `${n}/${d}`, say: fractionSay(n, d) });
export const timePiece = (hour: number, minute: number): Piece => ({ text: `${hour}:${String(minute).padStart(2, '0')}`, say: [{ time: { hour, minute } }] });

const SIGN_WORD: Record<string, string> = { '×': 'times', '÷': 'divided by', '+': 'plus', '−': 'minus', '-': 'minus', '=': 'equals' };

// How a written number sentence is said: "(5 × 4) + (2 × 4)" is "five times four, plus two times four",
// "2 × (3 × 4)" is "two times the answer to three times four", "2/3" is "two thirds", □ is "blank".
export function sentenceSay(sentence: string): Say {
  const tokens = sentence.match(/\d+\/\d+|\d+(?:,\d{3})*|[()×÷+−\-=□]/g) ?? [];
  const say: SayPart[] = [];
  tokens.forEach((token, i) => {
    const before = tokens[i - 1];
    if (/^\d+\/\d+$/.test(token)) {
      const [n, d] = token.split('/').map(Number) as [number, number];
      say.push(...fractionSay(n, d));
    } else if (/^\d/.test(token)) say.push({ number: Number(token.replace(/,/g, '')) });
    else if (token === '(') {
      if (before === '×' || before === '÷') say.push('the answer to');
    } else if (token === ')') {
      if (i < tokens.length - 1) say.push(',');
    } else if (token === '□') say.push('blank');
    else say.push(SIGN_WORD[token] ?? token);
  });
  return tidy(say);
}

// A sentence as a picture to tap: shown as written, said as words.
export const sentenceOption = (sentence: string, size: 'm' | 'l' = 'l'): Visual => ({ kind: 'text', value: sentence, size, speak: sentenceSay(sentence) });

// An equation picture from a written sentence: "□ ÷ 4 = 6" becomes ['blank', '÷', 4, '=', 6].
// A bracket is written against its number: "(2" and "4)", so "2 × (3 × 4)" does not spread out.
export function sentencePicture(sentence: string): Visual {
  const tokens = sentence.match(/\d+\/\d+|\d+|[()×÷+−\-=□]/g) ?? [];
  const parts: (number | string)[] = [];
  let open = '';
  for (const token of tokens) {
    if (token === '(') open += '(';
    else if (token === ')') {
      const last = parts.pop() ?? '';
      parts.push(...(last === 'blank' ? ['blank', ')'] : [`${String(last)})`]));
    }
    else {
      const part: number | string = token === '□' ? 'blank' : /^\d+$/.test(token) ? Number(token) : token === '−' ? '-' : token;
      parts.push(open && part !== 'blank' ? `${open}${part}` : part);
      if (open && part === 'blank') parts.splice(parts.length - 1, 0, open);
      open = '';
    }
  }
  return equation(...parts);
}

// A number question: three numerals to tap, or typed at the typed level.
export function numberAnswer(
  base: { prompt: Prompt; stimulus?: Visual; explanation: Explanation },
  facts: QuestionDraft['facts'],
  answer: number,
  slips: number[],
  typed: boolean,
  rng: Rng,
  range: [number, number] = [0, 1000],
  maxDigits = 3,
): QuestionDraft {
  const common = { mode: 'look' as const, prompt: base.prompt, ...(base.stimulus ? { stimulus: base.stimulus } : {}), explanation: base.explanation };
  if (typed) return { ...common, type: 'numberPad', facts, answer, maxDigits };
  const values = numeralChoices(answer, slips, range[0], range[1], rng);
  return { ...common, type: 'choice', facts: { ...facts, options: values }, options: values.map((value) => numeral(value, 'l')), answerIndex: values.indexOf(answer) };
}

// Two numbers that fit a rule, found by trying.
export function find<T>(pick: () => T, fits: (value: T) => boolean): T {
  for (;;) {
    const value = pick();
    if (fits(value)) return value;
  }
}

export const isTyped = (level: Level): boolean => level === 3;
export const capital = (words: string): string => `${words[0]?.toUpperCase() ?? ''}${words.slice(1)}`;
