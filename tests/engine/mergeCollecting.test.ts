// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mergeChild, mergeStories } from '../../src/engine/merge';
import type { Child } from '../../src/storage/schema';
import { childSchema, defaultSettings } from '../../src/storage/schema';

// Finished stories and pressed stickers (docs/GAME_FEEL.md, phase 7): nothing done on one iPad is lost on the other.
const at = (minute: number): string => `2026-03-09T10:${String(minute).padStart(2, '0')}:00.000Z`;
const child = (change: Partial<Child>): Child => ({ id: 'kid-1', name: 'Robin', avatar: '🐢', grade: 'K', settings: defaultSettings('K'), resetAt: null, levelWeeks: [], storiesRead: [], stickersPlaced: [], createdAt: at(0), updatedAt: at(1), deletedAt: null, ...change });

describe('stories and stickers across two iPads', () => {
  it('keeps every story finished on either iPad, on the earlier day', () => {
    const merged = mergeStories(
      [{ episodeId: 'four-seeds', day: '2026-03-02' }, { episodeId: 'fair-shares', day: '2026-03-04' }],
      [{ episodeId: 'fair-shares', day: '2026-03-03' }, { episodeId: 'frog-song', day: '2026-03-05' }],
    );
    expect(merged).toEqual([
      { episodeId: 'four-seeds', day: '2026-03-02' },
      { episodeId: 'fair-shares', day: '2026-03-03' },
      { episodeId: 'frog-song', day: '2026-03-05' },
    ]);
  });

  it('a newer child record does not undo a story or a sticker from the older one', () => {
    const older = child({ updatedAt: at(1), storiesRead: [{ episodeId: 'four-seeds', day: '2026-03-02' }], stickersPlaced: ['mastered:math-K:1'] });
    const newer = child({ updatedAt: at(9), name: 'Robin B', stickersPlaced: ['first-10'] });
    const merged = mergeChild(newer, older);
    expect(merged.name).toBe('Robin B');
    expect(merged.storiesRead).toEqual([{ episodeId: 'four-seeds', day: '2026-03-02' }]);
    expect(merged.stickersPlaced).toEqual(['first-10', 'mastered:math-K:1']);
  });

  it('a child saved before stories and the sticker book existed reads with empty lists', () => {
    const { storiesRead: _s, stickersPlaced: _p, ...old } = child({});
    void _s;
    void _p;
    expect(childSchema.parse(old)).toMatchObject({ storiesRead: [], stickersPlaced: [] });
  });
});
