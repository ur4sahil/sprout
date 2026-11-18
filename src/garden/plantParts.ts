import type { GrowthStage } from '../worlds/types';

// Which parts of a plant show at each of its five stages. A plant is always drawn with every part; growing
// from one stage to the next only changes these numbers, and the style file glides between them.

export const STEM_FULL = 54; // the stem of a plant in bloom, in the picture's own units (the picture is 60 by 90)
export const PICTURE_TALL = 90;
const GROWN: readonly [number, number, number, number, number] = [0, 0.3, 0.68, 0.84, 1];

export interface PlantParts {
  packet: boolean; // the seed packet on its stick
  stem: number; // how much of the full stem has grown, 0 to 1
  rise: number; // how far below its full height the head sits, as a share of the picture's height in percent
  seedLeaves: boolean; // the two first leaves of a sprout
  leaves: boolean; // the grown leaves on the stem
  bud: boolean;
  open: number; // how far the flower has opened: 0 shut, about half for a bud opening, 1 in bloom
  visitor: boolean; // a butterfly or a bee comes to a flower in bloom (not while it droops)
  can: boolean; // the watering can beside a plant whose review is due
}

export function partsAt(stage: GrowthStage, droop: boolean): PlantParts {
  const stem = GROWN[stage];
  return {
    packet: stage === 0,
    stem,
    rise: Math.round(((STEM_FULL * (1 - stem)) / PICTURE_TALL) * 1000) / 10,
    seedLeaves: stage === 1,
    leaves: stage >= 2,
    bud: stage === 2 || stage === 3,
    open: stage === 4 ? 1 : stage === 3 ? 0.55 : 0,
    visitor: stage === 4 && !droop,
    can: droop,
  };
}
