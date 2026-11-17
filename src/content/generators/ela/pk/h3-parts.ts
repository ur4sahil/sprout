import type { LessonStep, Say, Visual } from '../../../../engine/types';

// Pieces the wave H3 generators share (plan section 15): Language Arts pre-K and kindergarten.

export type Line = { text: string; speak: Say };
export type Beat = Line & { visual: Visual };

// A picture with no spoken label, for listen and read questions.
export const silent = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });

// Text a child must read or look at: it never speaks.
export const plain = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });

// Text that says itself when tapped.
export const said = (value: string, speak: Say, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size, speak });

// A line whose words are all spoken as written, with no letters or numbers in them.
export const line = (text: string): Line => ({ text, speak: [text] });

// The four beats of a lesson (plan section 8): see it, watch me, try it together, remember.
export function beats(see: Beat, watch: Beat, tryIt: Beat, reveal: Beat, remember: Beat): LessonStep[] {
  return [
    { beat: 'see', ...see },
    { beat: 'watch', ...watch },
    { beat: 'try', ...tryIt, reveal },
    { beat: 'remember', ...remember },
  ];
}

// Joins lines into one: their texts with spaces, their speech one after the other.
export function joined(...lines: Line[]): Line {
  return { text: lines.map((each) => each.text).join(' '), speak: lines.flatMap((each) => each.speak) };
}

// A letter list as text, "M, I, A", and as letter parts.
export function letters(values: readonly string[]): Line {
  return { text: values.join(', '), speak: values.map((letter) => ({ letter })) };
}
