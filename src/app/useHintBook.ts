import { useCallback, useRef, useState } from 'react';
import type { HintBook } from './hints';
import { canHint, hintWindow, hintsLeft, takeHint } from './hints';

// The hints a child has in one part, as screens and the answer flow see them (rules in `hints.ts`).
export interface HintAllowance {
  left: number; // hints still to use in this part
  canOpen: (questionId: string) => boolean;
  opened: (questionId: string) => boolean; // this question already had its hint (for the screen)
  usedOn: (questionId: string) => boolean; // read when an answer is saved, so the score knows
  take: (questionId: string) => boolean; // false when none are left
}

// `answered`: answers so far in this sitting. `refillEvery`: plain practice gets 3 again every this many answers;
// left out, the sitting is one part.
export function useHintBook(answered: number, refillEvery?: number): HintAllowance {
  const [book, setBook] = useState<HintBook>(() => new Map());
  // The same book for the answer flow, which reads it after an await, when this render's copy may be old.
  const latest = useRef<HintBook>(book);
  const window = hintWindow(answered, refillEvery);
  const usedOn = useCallback((questionId: string): boolean => latest.current.has(questionId), []);
  const canOpen = useCallback((questionId: string): boolean => canHint(book, questionId, window), [book, window]);
  const opened = useCallback((questionId: string): boolean => book.has(questionId), [book]);
  const take = useCallback(
    (questionId: string): boolean => {
      if (!canHint(latest.current, questionId, window)) return false;
      const next = takeHint(latest.current, questionId, window);
      latest.current = next;
      setBook(next);
      return true;
    },
    [window],
  );
  return { left: hintsLeft(book, window), canOpen, opened, usedOn, take };
}
