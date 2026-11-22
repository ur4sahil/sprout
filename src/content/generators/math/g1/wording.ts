import { numberWords } from '../../../../audio/say';
import { stepSay } from '../../../../audio/stepSay';
import { names } from '../../../../engine/giveaway';
import type { Explanation, Hint, Say, Visual } from '../../../../engine/types';

// How grade 1 Math words its working (the wording audit, round 2, Nov 22, 2026). A step is a line of text that
// stepSay reads aloud, or a line with its own speech (said another way, such as "a single one" for "1 one").
// The explanation's summary, said when the example is shown in a lesson, is the same lines one after another.

export type Line = string | { text: string; say: Say };

// An explanation with its picture, which grade 1 explanations always have.
export type Shown = Explanation & { visual: Visual };

export function explain(lines: readonly Line[], visual: Visual, hint?: Hint): Shown {
  const steps = lines.map((line) => (typeof line === 'string' ? line : line.text));
  const own = lines.map((line) => (typeof line === 'string' ? null : line.say));
  // A line stepSay cannot read is left as text, so validation (rule 1) names it.
  const speak = lines.flatMap((line): Say => (typeof line === 'string' ? (stepSay(line) ?? [line]) : line.say));
  const explanation: Shown = { speak, steps, visual };
  if (own.some((say) => say !== null)) explanation.stepsSay = own;
  if (hint) explanation.hint = hint;
  return explanation;
}

// A hint that never names a number answer: the first wording that does not hold it, in digits or in words.
// The last wording is the one to fall back on, so it never names a number.
export function hintFor(answer: number, ...wordings: [string, ...string[]]): Hint {
  const forms = [String(answer), numberWords(answer)];
  const text = wordings.find((wording) => !forms.some((form) => names(wording, form))) ?? wordings[wordings.length - 1];
  return { text: text as string };
}

// "a 7", "an 8": the article before a digit said aloud.
export const aDigit = (digit: number): string => `${digit === 8 ? 'an' : 'a'} ${digit}`;

// "2 tens", "1 ten", "no tens".
export const tensOf = (count: number): string => (count === 0 ? 'no tens' : count === 1 ? '1 ten' : `${count} tens`);

// "apple and bread", "apple, bread and cheese".
export function joinAnd(words: readonly string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1] as string}`;
}
