import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { openRepo } from '../storage/index';
import type { Child } from '../storage/schema';
import { markFinished } from '../stories/progress';
import { useAppStore } from './store';

// Saving what a child collects (docs/GAME_FEEL.md, phase 7): stories finished and stickers pressed into the book.
// Both are lists on the child record, merged across iPads (src/engine/merge.ts). A save that fails keeps the child
// playing: the story or sticker simply shows as not yet saved next time.

async function saveChange(child: Child, change: (current: Child) => Child): Promise<Child | null> {
  try {
    const { repo } = await openRepo();
    const current = (await repo.listChildren()).find((each) => each.id === child.id) ?? child;
    const next = { ...change(current), updatedAt: now().toISOString() };
    await repo.saveChild(next);
    // The child on screen gets the change too, so home and the book see it at once.
    if (useAppStore.getState().child?.id === child.id) useAppStore.getState().setChild(next);
    // (setChild clears the session id: a story or a sticker is only ever saved from home or the book, never mid-practice.)
    return next;
  } catch (error) {
    logError(error);
    return null;
  }
}

// A story finished today. Reading it again later keeps the first day.
export function saveStoryFinished(child: Child, episodeId: string, today: string): Promise<Child | null> {
  return saveChange(child, (current) => ({ ...current, storiesRead: markFinished(current.storiesRead, episodeId, today) }));
}

// A sticker pressed into its page.
export function saveStickerPlaced(child: Child, awardId: string): Promise<Child | null> {
  return saveChange(child, (current) => (current.stickersPlaced.includes(awardId) ? current : { ...current, stickersPlaced: [...current.stickersPlaced, awardId].sort() }));
}
