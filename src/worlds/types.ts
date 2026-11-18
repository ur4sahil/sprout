import type { SoundName } from '../audio/sounds';
import type { Say } from '../engine/types';

// A world (the owner's choice, Nov 18, 2026): the one place the app's look and feel come from. Screens ask the
// current world for its words, colours, particles and sounds instead of having "garden" written into them, so a
// second world later is a new pack, not a change to the app. The learning and the saved progress are outside
// any world: switching worlds changes nothing a child has earned.

export type WorldId = 'garden';

// The five stages a skill is shown in, from its score (plan section 19): the milestones the app already has.
export type GrowthStage = 0 | 1 | 2 | 3 | 4;

export type ParticleKind = 'sparkle' | 'star' | 'petal' | 'leaf' | 'drop' | 'confetti';

export interface World {
  id: WorldId;
  name: string; // "Garden", for the grown-ups' setting
  // What the child's home is called and what the daily plan is, in this world's words.
  words: { home: string; path: string; review: string; stages: readonly [string, string, string, string, string] };
  // Colours, as CSS custom properties set on the page while this world is on (their values are tokens).
  palette: Readonly<Record<`--world-${string}`, string>>;
  // Which particles a moment throws, and in which token colours.
  particles: { right: ParticleKind; milestone: ParticleKind; colours: readonly string[] };
  // Which sound each moment plays.
  sounds: { tap: SoundName; pick: SoundName; drop: SoundName; right: SoundName; next: SoundName; open: SoundName; close: SoundName; star: SoundName };
  // The child's home drawn as a place (game feel, phase 4). A world without one keeps the plain home.
  home?: HomeScene;
  // The home scene's colours through the year (game feel, phase 8). A world without them looks the same all year.
  seasons?: Readonly<Record<Season, SeasonLook>>;
}

// The four seasons, from the month: spring March to May, summer June to August, autumn September to November,
// winter December to February.
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// One season's scenery: the colours that replace the usual ones, and one small seasonal touch. Only scenery:
// the plants, stones and the sun are never changed, so they read the same in every season.
export interface SeasonLook {
  // The sky in the day, top then bottom. Evening and night keep the usual skies.
  sky: Readonly<Record<'morning' | 'afternoon', readonly [string, string]>>;
  hillFar: string;
  hillMid: string;
  grass: string;
  grassFront: string;
  tree: string; // tree tops, two shades
  treeLight: string;
  hillEdge?: string; // a line along the hill tops: snow in winter
  // blossom petals drifting, a bright sun in the sky, leaves drifting, or light snow.
  touch: 'blossom' | 'sun' | 'leaves' | 'snow';
  touchColours: readonly [string, string];
}

// The shape of a flower's head. Each is drawn once, in `src/garden/PlantHead.tsx`.
export type FlowerHead = 'daisy' | 'tulip' | 'bell' | 'star' | 'puff' | 'cattail';

// One kind of plant: a head shape and its two colours (values from the picture palette).
export interface FlowerKind {
  id: string;
  head: FlowerHead;
  petal: string;
  centre: string;
}

// One of the three areas of the home scene, one for each subject.
export interface HomeArea {
  name: string; // "Number Meadow"
  say: Say;
  landmark: 'hay' | 'log' | 'pond'; // the one big thing that tells the area apart without reading
  kinds: readonly [FlowerKind, FlowerKind, FlowerKind, FlowerKind]; // so the beds of an area do not all look the same
}

export interface HomeScene {
  title: string; // what a screen reader calls the scene
  areas: Readonly<Record<'math' | 'ela' | 'reasoning', HomeArea>>;
  // A skill's stage on its card, and the same words to say aloud.
  stages: readonly [string, string, string, string, string];
  stageSay: readonly [Say, Say, Say, Say, Say];
  thirsty: string; // on the card of a plant whose review is due
  thirstySay: Say;
  // The big button under the scene: before the first step, in the middle, and when the path is finished.
  path: { start: string; going: string; done: string };
  // What each stepping stone is called (a screen reader says it, and a tap on the speaker).
  stones: { review: string; practice: string; fresh: string; mixed: string; locked: string; done: string };
  sun: string; // "Today's sun"
  card: { practice: string; lesson: string; close: string; hear: string };
  signpost: { open: string; close: string; math: string; ela: string; reasoning: string; stickers: string; facts: string; switch: string };
}

// A skill's stage from its score: not started, 1 to 24, 25 to 74, 75 to 99, mastered.
export function growthStage(score: number, mastered: boolean): GrowthStage {
  if (mastered || score >= 100) return 4;
  if (score >= 75) return 3;
  if (score >= 25) return 2;
  if (score >= 1) return 1;
  return 0;
}
