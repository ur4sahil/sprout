import type { Episode } from './types';

// Which story a child is on (game feel, phase 7). Pure: the caller passes what is saved and the day.
//
// The rules: a new episode is offered only once today's plan is done, at most one new episode a day, always the
// first one the child has not finished. Missing days costs nothing: the next story simply waits, and days are
// never made up with several at once. Finished stories stay in the story book to read any time.

// One finished story, as saved: the episode's id (never its place in the list) and the local day it was finished.
export interface FinishedStory {
  episodeId: string;
  day: string; // localDay() of the day it was finished
}

function inOrder(episodes: readonly Episode[]): Episode[] {
  return [...episodes].sort((a, b) => a.number - b.number);
}

// The new story to offer today, or null: the plan is not done yet, a new story was already finished today, or
// every story is read.
export function storyForToday(episodes: readonly Episode[], finished: readonly FinishedStory[], planDone: boolean, today: string): Episode | null {
  if (!planDone) return null;
  if (finished.some((each) => each.day === today)) return null;
  const read = new Set(finished.map((each) => each.episodeId));
  return inOrder(episodes).find((episode) => !read.has(episode.id)) ?? null;
}

// A place on the story book's shelf: every episode in order, open when the child has finished it.
export interface ShelfPlace {
  episode: Episode;
  open: boolean;
}

export function storyShelf(episodes: readonly Episode[], finishedIds: readonly string[]): ShelfPlace[] {
  const read = new Set(finishedIds);
  return inOrder(episodes).map((episode) => ({ episode, open: read.has(episode.id) }));
}

// The finished stories alone, in order: the ones a child may read again any time.
export function finishedEpisodes(episodes: readonly Episode[], finishedIds: readonly string[]): Episode[] {
  return storyShelf(episodes, finishedIds)
    .filter((place) => place.open)
    .map((place) => place.episode);
}

// Adds a finished story to the saved list. Reading one again keeps the day it was first finished, so a re-read
// never uses up the day's new story.
export function markFinished(finished: readonly FinishedStory[], episodeId: string, today: string): FinishedStory[] {
  if (finished.some((each) => each.episodeId === episodeId)) return [...finished];
  return [...finished, { episodeId, day: today }];
}
