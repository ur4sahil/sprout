import type { Skill } from '../content/catalogue';
import { currentWorld } from '../worlds';
import type { FlowerKind } from '../worlds/types';

// Which flower a skill grows as, so the plant beside a question is the same plant the child sees in the garden.
// The garden picks it from a steady number made from the skill's id (`src/garden/layout.ts`); this makes the same
// number the same way, and a test checks the two agree. Null when the world has no garden to grow it in.

const KINDS_PER_AREA = 4;

function steady(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function plantKindFor(skill: Pick<Skill, 'id' | 'subject'>): FlowerKind | null {
  const kinds = currentWorld().home?.areas[skill.subject].kinds;
  return kinds ? (kinds[steady(skill.id) % KINDS_PER_AREA] ?? null) : null;
}
