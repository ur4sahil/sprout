import { PALETTE } from '../visuals/palette';
import type { Season, SeasonLook, World } from '../worlds/types';
import type { Light } from './layout';

// The garden's season (game feel, phase 8): its scenery follows the month on the device's clock.

const C = PALETTE.garden;

// Spring March to May, summer June to August, autumn September to November, winter December to February.
export function seasonAt(at: Date): Season {
  const month = at.getMonth(); // 0 is January
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

// The colours the scenery is drawn in: the sky, the hills, the grass and the tree tops.
export interface Scenery {
  sky: readonly [string, string];
  hillFar: string;
  hillMid: string;
  grass: string;
  grassFront: string;
  tree: string;
  treeLight: string;
  hillEdge: string | null;
}

// The usual scenery, with no season: what the garden looked like before seasons.
export function plainScenery(light: Light): Scenery {
  return { sky: C.sky[light], hillFar: C.hillFar, hillMid: C.hillMid, grass: C.grass, grassFront: C.grassFront, tree: C.tree, treeLight: C.treeLight, hillEdge: null };
}

// The world's look for a season, or nothing when the world has no seasons.
export function seasonLook(world: World, season: Season): SeasonLook | null {
  return world.seasons?.[season] ?? null;
}

// The scenery for a season at a time of day. Evening and night keep their own skies, so the light of the day
// still reads the same; the season shows in the land.
export function sceneryFor(look: SeasonLook | null, light: Light): Scenery {
  const plain = plainScenery(light);
  if (!look) return plain;
  const sky = light === 'morning' || light === 'afternoon' ? look.sky[light] : plain.sky;
  return { sky, hillFar: look.hillFar, hillMid: look.hillMid, grass: look.grass, grassFront: look.grassFront, tree: look.tree, treeLight: look.treeLight, hillEdge: look.hillEdge ?? null };
}
