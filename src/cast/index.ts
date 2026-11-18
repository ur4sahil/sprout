import type { Skill } from '../content/catalogue';
import type { Who } from './types';

// The cast (plan section 19, phase 3): Sprout, who is everywhere, and a friend for each subject.
export { default as Character } from './Character';
export type { CharacterProps } from './Character';
export { MOODS, MOOD_POSES } from './moods';
export type { Mood } from './moods';
export { LINES, LINE_KINDS, pickLine } from './lines';
export type { LineKind, PickedLine } from './lines';
export { useLoudness } from './useLoudness';
export { MOUTHS, WHO } from './types';
export type { MouthShape, Who } from './types';

const FRIENDS: Record<Skill['subject'], Who> = { math: 'pip', ela: 'olive', reasoning: 'finn' };

// The friend who belongs to a subject: Pip the ladybug for Math, Olive the owl for Language Arts, Finn the frog
// for Reasoning.
export function castFor(subject: Skill['subject']): Who {
  return FRIENDS[subject];
}

// The name a child knows each friend by.
export const CAST_NAMES: Record<Who, string> = { sprout: 'Sprout', pip: 'Pip', olive: 'Olive', finn: 'Finn' };
