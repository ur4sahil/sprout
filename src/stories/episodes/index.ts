import type { Episode } from '../types';
import { SPRING } from './spring';
import { SUMMER } from './summer';

// Every episode of "The Garden Year" written so far, in order. Autumn and winter come later.
export const EPISODES: readonly Episode[] = [...SPRING, ...SUMMER];

export function episodeById(id: string): Episode | undefined {
  return EPISODES.find((episode) => episode.id === id);
}
