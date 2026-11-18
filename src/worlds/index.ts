import { GARDEN } from './garden';
import type { World, WorldId } from './types';

export const WORLDS: Readonly<Record<WorldId, World>> = { garden: GARDEN };

// The world in use. Set when a child is picked (from the child's setting) and read by sounds and particles, which
// are called from places that do not hold the child.
let current: World = GARDEN;

export function worldFor(id: string | undefined): World {
  return WORLDS[(id ?? 'garden') as WorldId] ?? GARDEN;
}

export function currentWorld(): World {
  return current;
}

export function setWorld(id: string | undefined): World {
  current = worldFor(id);
  return current;
}

export type { GrowthStage, ParticleKind, World, WorldId } from './types';
export { growthStage } from './types';
