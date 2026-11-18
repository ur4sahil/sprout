import type { SoundName } from '../audio/sounds';

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
}

// A skill's stage from its score: not started, 1 to 24, 25 to 74, 75 to 99, mastered.
export function growthStage(score: number, mastered: boolean): GrowthStage {
  if (mastered || score >= 100) return 4;
  if (score >= 75) return 3;
  if (score >= 25) return 2;
  if (score >= 1) return 1;
  return 0;
}
