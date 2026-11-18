import { useCallback, useMemo, useState } from 'react';
import type { AwardDef } from '../engine/awards';
import type { Say } from '../engine/types';
import { localDay, localDayOf } from '../lib/clock';
import type { AwardEarned } from '../storage/schema';

// The sticker book (game feel, phase 7): which stickers are still loose, what earns each one, and the words the
// book says. A sticker is "loose" from the moment it is earned until the child presses it onto its page.

// The one door to what is saved about pressing stickers on. Today nothing is saved (see `usePlacedStickers`);
// when a saved record exists, only the inside of that hook changes and the book stays as it is.
export interface PlacedStickers {
  placed: string[]; // the ids of the stickers this child has pressed onto their pages
  onPlace: (id: string) => void;
}

// The earned stickers not yet pressed on, in the order they were earned.
export function looseStickers(earned: readonly Pick<AwardEarned, 'awardId' | 'earnedAt'>[], placed: readonly string[]): string[] {
  const on = new Set(placed);
  return [...earned]
    .filter((award) => !on.has(award.awardId))
    .sort((a, b) => a.earnedAt.localeCompare(b.earnedAt))
    .map((award) => award.awardId);
}

// Until pressing-on is saved, the nearest thing existing records can tell us: a sticker earned today is new, so
// it is loose until it is pressed on in this run of the app; a sticker from an earlier day counts as pressed on.
// `today` is a local day (YYYY-MM-DD). `pressed` holds the ids pressed on since the app was opened.
export function placedForNow(earned: readonly Pick<AwardEarned, 'awardId' | 'earnedAt'>[], today: string, pressed: ReadonlySet<string>): string[] {
  return earned.filter((award) => pressed.has(award.awardId) || localDayOf(award.earnedAt) !== today).map((award) => award.awardId);
}

// What was pressed on since the app was opened, for each child. Kept only in memory.
const pressedThisRun = new Map<string, Set<string>>();

// For tests: forget every press.
export function forgetPresses(): void {
  pressedThisRun.clear();
}

// The stand-in for the saved record. To wire the real one: read `placed` from the child's saved sticker book and
// save in `onPlace`; nothing else in the app looks behind this.
export function usePlacedStickers(childId: string | undefined, earned: readonly AwardEarned[]): PlacedStickers {
  const [presses, setPresses] = useState(0);
  const placed = useMemo(() => {
    void presses; // a press changes the remembered set, so the list is worked out again
    return placedForNow(earned, localDay(), pressedThisRun.get(childId ?? '') ?? new Set<string>());
  }, [earned, childId, presses]);
  const onPlace = useCallback(
    (id: string): void => {
      if (!childId) return;
      pressedThisRun.set(childId, new Set([...(pressedThisRun.get(childId) ?? []), id]));
      setPresses((n) => n + 1);
    },
    [childId],
  );
  return { placed, onPlace };
}

// Written words turned into something that can be spoken: a run of digits becomes a number part, the rest stays
// as plain words. "Math, Grade 1" is said "Math, Grade" and then the number one.
export function wordsSay(text: string): Say {
  const say: Say = [];
  for (const piece of text.split(/(\d[\d,]*)/)) {
    if (/^\d/.test(piece)) say.push({ number: Number(piece.replace(/,/g, '')) });
    else if (piece.trim().length > 0) say.push(piece.trim());
  }
  return say;
}

// A group's name without the letter in front: "C. Adding and subtracting" is "Adding and subtracting".
const plainGroup = (label: string): string => label.replace(/^[A-Z]\.\s+/, '');

export interface Telling {
  text: string; // shown on the page
  say: Say; // and said aloud, for a child who cannot read yet
}

// What earns a sticker, in words a child can act on. `boardName` is the page's name, such as "Math, Kindergarten".
export function howToEarn(award: Pick<AwardDef, 'id' | 'family' | 'label'>, boardName: string): Telling {
  const [, second = '', third = ''] = award.id.split(':');
  const board = wordsSay(boardName);
  if (award.family === 'mastered') {
    if (third === 'all') return { text: `Master every skill in ${boardName}.`, say: ['Master every skill in', ...board] };
    const step = Number(third);
    const skills = step === 1 ? 'skill' : 'skills';
    return { text: `Master ${step} ${skills} in ${boardName}.`, say: ['Master', { number: step }, `${skills} in`, ...board] };
  }
  if (award.family === 'category') {
    const group = plainGroup(award.label);
    return { text: `Get every ${group} skill in ${boardName} to 80.`, say: ['Get every skill in', ...wordsSay(group), 'up to', { number: 80 }, 'in', ...board] };
  }
  if (award.family === 'questions') return { text: `Answer ${second} questions.`, say: ['Answer', { number: Number(second) }, 'questions'] };
  if (award.family === 'days') return { text: `Learn on ${second} different days.`, say: ['Learn on', { number: Number(second) }, 'different days'] };
  const subject = second === 'ela' ? 'Language Arts' : 'Math';
  return { text: `Finish the ${subject} check-in.`, say: [`Finish the ${subject} check-in`] };
}

// What a sticker already on its page says when tapped.
export function stickerTelling(award: Pick<AwardDef, 'label'>): Telling {
  const label = plainGroup(award.label);
  return { text: `You earned this one: ${label}.`, say: ['You earned this one.', ...wordsSay(label)] };
}

// The page the book opens on: the first with a loose sticker waiting, or else the Math page of the child's own
// grade, or else the first page.
export function firstPage(pages: readonly { id: string; awards: readonly Pick<AwardDef, 'id'>[] }[], loose: readonly string[], grade: string): number {
  const waiting = new Set(loose);
  const withLoose = pages.findIndex((page) => page.awards.some((award) => waiting.has(award.id)));
  if (withLoose !== -1) return withLoose;
  const own = pages.findIndex((page) => page.id === `math-${grade}`);
  return own === -1 ? 0 : own;
}

// The book's own spoken lines. (They belong with the app's other fixed lines in `src/audio/lines.ts`, so the
// recorded voice can be made ahead; they are here until that file is free to edit.)
export const BOOK_LINES = {
  press: ['You have a new sticker. Tap it to press it on.'],
  pressMany: ['You have new stickers. Tap each one to press it on.'],
} satisfies Record<string, Say>;
