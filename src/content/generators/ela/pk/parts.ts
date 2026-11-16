import type { Rng } from '../../../../engine/rng';
import type { Say, Visual } from '../../../../engine/types';

// Pieces the Language Arts pre-K generators share.

export type Explanation = { speak: Say; steps: string[]; visual: Visual };

// A letter with no spoken label: the child must know it by its shape.
export function letterTile(letter: string): Visual {
  return { kind: 'text', value: letter, size: 'xl' };
}

// A letter that says its name when tapped.
export function letterSaid(letter: string): Visual {
  return { kind: 'text', value: letter, size: 'xl', speak: [{ letter }] };
}

// One picture that says its word when tapped. A child is never left to guess what an emoji is called.
export function picture(word: string, emoji: string): Visual {
  return { kind: 'emojiGroup', emoji, count: 1, layout: 'row', speak: [{ word }] };
}

export function row(...children: Visual[]): Visual {
  return { kind: 'row', children };
}

export function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "a dog", "an animal".
export function a(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

// Picks `count` items for which `ok` holds against everything picked so far.
export function pickApart<T>(pool: readonly T[], count: number, rng: Rng, ok: (item: T, picked: readonly T[]) => boolean): T[] {
  const picked: T[] = [];
  for (const item of rng.shuffle(pool)) {
    if (picked.length === count) break;
    if (ok(item, picked)) picked.push(item);
  }
  if (picked.length < count) throw new Error(`pickApart: only ${picked.length} of ${count} could be picked`);
  return picked;
}
