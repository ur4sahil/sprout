import type { Rng } from '../../../../engine/rng';
import type { Explanation, FactValue, Hint, LessonStep, Say, SortBin, Visual } from '../../../../engine/types';
import type { QuestionDraft } from '../../../../engine/types';
import type { Line } from './wording';
import { gapSay, stepsOf } from './wording';

// Pieces the wave H4 generators (Language Arts grades 1 and 2, plan section 15) share. Every question
// names the h4ela oracle's relation and target in its facts.

export const plain = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });
export const said = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size, speak: [gapSay(value)] });
export const pic = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });

type Facts = Record<string, FactValue>;

export interface ChoiceSpec {
  prompt: string;
  speak?: Say; // the spoken prompt, when it is not the prompt itself
  mode?: 'look' | 'listen' | 'read';
  options: readonly string[]; // shown in this order
  right: string;
  facts: Facts; // relation and target at least
  why: Explanation;
  stimulus?: Visual;
  spoken?: boolean; // options say themselves when tapped (look questions only)
  fixedOrder?: boolean;
  size?: 'm' | 'l' | 'xl';
}

export function choice(spec: ChoiceSpec): QuestionDraft {
  const mode = spec.mode ?? 'look';
  const speakOptions = spec.spoken === true && mode === 'look';
  return {
    type: 'choice',
    mode,
    ...(spec.fixedOrder ? { fixedOrder: true as const } : {}),
    facts: { ...spec.facts, options: [...spec.options] },
    prompt: { text: spec.prompt, speak: spec.speak ?? [spec.prompt] },
    ...(spec.stimulus ? { stimulus: spec.stimulus } : {}),
    options: spec.options.map((each) => (speakOptions ? said(each, spec.size) : plain(each, spec.size))),
    answerIndex: spec.options.indexOf(spec.right),
    explanation: spec.why,
  };
}

// The right answer and `count` others, in a random order.
export function withOthers(rng: Rng, right: string, pool: readonly string[], count = 2): string[] {
  return rng.shuffle([right, ...rng.sample([...new Set(pool.filter((each) => each !== right))], count)]);
}

export interface SortSpec {
  prompt: string;
  speak?: Say; // the spoken prompt, when it is not the prompt itself (a letter is a typed part)
  mode: 'look' | 'read';
  items: readonly string[];
  bins: SortBin[];
  answerBin: number[];
  facts: Facts;
  why: Explanation;
  stimulus?: Visual;
}

export function sort(spec: SortSpec): QuestionDraft {
  return {
    type: 'sort',
    mode: spec.mode,
    facts: { ...spec.facts, items: [...spec.items] },
    prompt: { text: spec.prompt, speak: spec.speak ?? [spec.prompt] },
    ...(spec.stimulus ? { stimulus: spec.stimulus } : {}),
    items: spec.items.map((each) => (spec.mode === 'look' ? said(each) : plain(each))),
    bins: spec.bins,
    answerBin: spec.answerBin,
    explanation: spec.why,
  };
}

// Put the items in order: answerOrder lists the shown items' places in the right order.
export function order(prompt: string, mode: 'look' | 'read', items: readonly string[], rightOrder: readonly string[], facts: Facts, why: Explanation, stimulus?: Visual): QuestionDraft {
  return {
    type: 'order',
    mode,
    facts: { ...facts, items: [...items] },
    prompt: { text: prompt, speak: [prompt] },
    ...(stimulus ? { stimulus } : {}),
    items: items.map((each) => (mode === 'look' ? said(each) : plain(each))),
    answerOrder: rightOrder.map((each) => items.indexOf(each)),
    explanation: why,
  };
}

// The steps (each with its own speech when it shows a letter group or a sound), the picture, what is said
// as the explanation opens (every step, unless given), and the hint's nudge.
export function explain(lines: readonly Line[], visual: Visual, speak?: Say, nudge?: Hint): Explanation {
  return {
    speak: speak ?? lines.flatMap((each): Say => (typeof each === 'string' ? [gapSay(each)] : each.say)),
    ...stepsOf(lines),
    visual,
    ...(nudge ? { hint: nudge } : {}),
  };
}

// Four beats: see, watch, try (with its answer), remember. Each has a picture.
export function lesson(see: [string, Visual], watch: [string, Visual], tryIt: [string, Visual, string, Visual], remember: [string, Visual]): () => LessonStep[] {
  return () => [
    { beat: 'see', text: see[0], speak: [gapSay(see[0])], visual: see[1] },
    { beat: 'watch', text: watch[0], speak: [gapSay(watch[0])], visual: watch[1] },
    { beat: 'try', text: tryIt[0], speak: [gapSay(tryIt[0])], visual: tryIt[1], reveal: { text: tryIt[2], speak: [gapSay(tryIt[2])], visual: tryIt[3] } },
    { beat: 'remember', text: remember[0], speak: [gapSay(remember[0])], visual: remember[1] },
  ];
}
