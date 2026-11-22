import { spokenSteps, stepSay } from '../audio/stepSay';
import { generateQuestion } from '../content/registry';
import { sayText } from '../engine/describe';
import { givesAway } from '../engine/giveaway';
import type { Question, Say } from '../engine/types';

// Hints (the owner's choice, Nov 21, 2026). Pure rules; `useHintBook` keeps the count on screen.
// A hint first nudges: with the question's own `explanation.hint` when its generator gives one, otherwise with the
// opening step of its working, but only when that step cannot give the answer away; otherwise, or on a second tap,
// it shows a worked example of a different question of the same skill. A child has 3 hints in one part (a Play
// pick, a part of today's plan, a Mixed bag, a review); practice opened by itself has no parts, so it gets 3 again
// every 10 answers. Opening the hint again on the same question is free. A right answer after a hint counts for
// half (`applyPractice`, `reviewRight`).

export const HINTS_PER_PART = 3;
export const HINT_REFILL_EVERY = 10;

// A nudge needs at least 3 steps: with 1 or 2, the first step is too close to the answer ("Rat and mat both end
// in at." for "Which word is different?").
export const NUDGE_MIN_STEPS = 3;

export interface Nudge {
  text: string;
  say: Say | null; // null when the line cannot be read aloud safely: it is shown only
}

// The nudge: the generator's own hint first. Otherwise the first step, but never from the steps of a sort, an
// order or a match (they list the answer), never with fewer than 3 steps, and never a step that names the answer
// (`givesAway`: the right option, the number, the word or the sign). Null: the hint goes straight to the example.
export function nudgeFor(question: Question): Nudge | null {
  const hint = question.explanation.hint;
  if (hint) return { text: hint.text, say: hint.say ?? stepSay(hint.text) };
  if (question.type === 'sort' || question.type === 'order' || question.type === 'match') return null;
  const steps = question.explanation.steps;
  const first = steps[0];
  if (steps.length < NUDGE_MIN_STEPS || first === undefined) return null;
  const say = spokenSteps(question)[0] ?? null;
  const own = question.explanation.stepsSay?.[0];
  return givesAway(question, first, own ? sayText(own) : null) ? null : { text: first, say };
}

const EXAMPLE_TRIES = 24;

// A worked example for a question: another question of the same skill at the same level, never the one on screen.
// Chosen from the question's own seed, so the same question always gets the same example. Null when the skill
// has nothing else to show at that level.
export function exampleFor(question: Question): Question | null {
  for (let i = 1; i <= EXAMPLE_TRIES; i += 1) {
    const seed = (Math.imul(question.seed ^ 0x51ed27, 2654435761) + i * 7919) >>> 0;
    const example = generateQuestion(question.skillId, question.level, seed);
    if (example.key !== question.key) return example;
  }
  return null;
}

// Which questions had a hint, and in which part. `window` numbers the parts: 0 for a part that is one sitting,
// or the answers so far divided by the refill size for plain practice.
export type HintBook = ReadonlyMap<string, number>;

export function hintWindow(answered: number, refillEvery: number | undefined): number {
  return refillEvery === undefined ? 0 : Math.floor(answered / refillEvery);
}

export function hintsLeft(book: HintBook, window: number): number {
  let used = 0;
  for (const at of book.values()) if (at === window) used += 1;
  return Math.max(0, HINTS_PER_PART - used);
}

// Whether the hint may open on this question: it already had one (free), or there is one left in this part.
export function canHint(book: HintBook, questionId: string, window: number): boolean {
  return book.has(questionId) || hintsLeft(book, window) > 0;
}

// The book after opening the hint on a question. Unchanged when the question already had one, or none are left.
export function takeHint(book: HintBook, questionId: string, window: number): HintBook {
  if (book.has(questionId) || hintsLeft(book, window) === 0) return book;
  return new Map([...book, [questionId, window]]);
}

// The id a hint is kept under: one question as shown.
export function hintId(question: Question): string {
  return `${question.key}|${question.seed}`;
}
