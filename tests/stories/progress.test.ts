// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { EPISODES } from '../../src/stories/episodes';
import type { FinishedStory } from '../../src/stories/progress';
import { finishedEpisodes, markFinished, storyForToday, storyShelf } from '../../src/stories/progress';

const id = (n: number): string => {
  const episode = EPISODES.find((each) => each.number === n);
  if (!episode) throw new Error(`no episode ${n}`);
  return episode.id;
};

// A child who reads the day's story every day the plan is done, over a run of days.
function walk(days: { day: string; planDone: boolean }[]): { finished: FinishedStory[]; read: string[] } {
  let finished: FinishedStory[] = [];
  const read: string[] = [];
  for (const { day, planDone } of days) {
    const offered = storyForToday(EPISODES, finished, planDone, day);
    if (!offered) continue;
    expect(finished.map((each) => each.episodeId), 'never a story already finished').not.toContain(offered.id);
    read.push(offered.id);
    finished = markFinished(finished, offered.id, day);
    // Once it is read, nothing more is offered that day.
    expect(storyForToday(EPISODES, finished, planDone, day)).toBeNull();
  }
  return { finished, read };
}

describe("today's story", () => {
  it('offers nothing until the plan is done, then the first story', () => {
    expect(storyForToday(EPISODES, [], false, '2026-11-18')).toBeNull();
    expect(storyForToday(EPISODES, [], true, '2026-11-18')?.id).toBe(id(1));
  });

  it('offers at most one new story a day', () => {
    const finished = markFinished([], id(1), '2026-11-18');
    expect(storyForToday(EPISODES, finished, true, '2026-11-18')).toBeNull();
    expect(storyForToday(EPISODES, finished, true, '2026-11-19')?.id).toBe(id(2));
  });

  it('never offers a finished story, and offers the first one not finished even when some later ones are', () => {
    const finished: FinishedStory[] = [
      { episodeId: id(1), day: '2026-11-01' },
      { episodeId: id(3), day: '2026-11-02' },
    ];
    expect(storyForToday(EPISODES, finished, true, '2026-11-18')?.id).toBe(id(2));
  });

  it('loses nothing by skipping days: after a gap the next story waits, one at a time', () => {
    const { read } = walk([
      { day: '2026-11-01', planDone: true },
      { day: '2026-11-02', planDone: false },
      { day: '2026-11-09', planDone: true },
      { day: '2026-11-10', planDone: true },
    ]);
    expect(read).toEqual([id(1), id(2), id(3)]);
  });

  it('reads every story in order, one a day, and then offers nothing', () => {
    const days = Array.from({ length: EPISODES.length + 3 }, (_, i) => ({ day: `2026-12-${String(i + 1).padStart(2, '0')}`, planDone: true }));
    const { read } = walk(days);
    expect(read).toEqual([...EPISODES].sort((a, b) => a.number - b.number).map((episode) => episode.id));
  });

  it('a re-read keeps the day it was first finished, so it never uses up a later day', () => {
    const first = markFinished([], id(1), '2026-11-01');
    const again = markFinished(first, id(1), '2026-11-05');
    expect(again).toEqual(first);
    expect(storyForToday(EPISODES, again, true, '2026-11-05')?.id).toBe(id(2));
  });
});

describe('the story book', () => {
  it('shows every episode in order, open only when finished', () => {
    const shelf = storyShelf([...EPISODES].reverse(), [id(2), id(1)]);
    expect(shelf.map((place) => place.episode.number)).toEqual(EPISODES.map((episode) => episode.number));
    expect(shelf.filter((place) => place.open).map((place) => place.episode.id)).toEqual([id(1), id(2)]);
  });

  it('lists the finished stories to read again, ignoring any id it does not know', () => {
    expect(finishedEpisodes(EPISODES, [id(4), 'a-story-that-was-removed', id(2)]).map((episode) => episode.id)).toEqual([id(2), id(4)]);
    expect(finishedEpisodes(EPISODES, [])).toEqual([]);
  });
});
