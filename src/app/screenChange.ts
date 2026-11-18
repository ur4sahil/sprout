import { useContext, useLayoutEffect, useState } from 'react';
import { UNSAFE_LocationContext } from 'react-router-dom';

// How one kid screen gives way to the next (game feel, phase 8). Going deeper (home into a skill, a skill into its
// lesson) "pushes in", as if the camera moves toward the plant; coming back out "pulls out"; a step sideways
// fades. Nothing here waits: the new screen is there at once and only its first moment moves.

export type ScreenChange = 'push' | 'pull' | 'fade' | 'none';

// How deep a kid screen sits: the profile page, then home, then the lists, then the places a child learns in.
// Null for a screen that is not a child's (the grown-ups' pages, sign-in): changes to and from those fade.
export function screenDepth(path: string): number | null {
  if (path === '/') return 0;
  if (path === '/home') return 1;
  if (path === '/facts' || path === '/awards' || path === '/play' || /^\/subject\/[^/]+$/.test(path)) return 2;
  if (/^\/skill\/[^/]+\/learn$/.test(path)) return 4;
  if (/^\/skill\/[^/]+$/.test(path) || /^\/facts\/[^/]+$/.test(path) || /^\/games\/[^/]+$/.test(path)) return 3;
  if (path === '/review' || path === '/mixed' || path === '/diagnostic') return 3;
  return null;
}

// The change from one screen to the next. The first screen of a launch just appears.
export function screenChange(from: string | null, to: string): ScreenChange {
  if (from === null || from === to) return 'none';
  const before = screenDepth(from);
  const after = screenDepth(to);
  if (before === null || after === null || before === after) return 'fade';
  return after > before ? 'push' : 'pull';
}

// The last kid screen drawn. Kept here, not saved: it only says where the child is coming from.
let last: string | null = null;

export function lastScreen(): string | null {
  return last;
}

export function noteScreen(path: string): void {
  last = path;
}

export function resetScreensForTests(): void {
  last = null;
  if (typeof document !== 'undefined') delete document.documentElement.dataset.screenChange;
}

// Whether the browser draws screen changes itself (the View Transitions API: iPad Safari 18 has it). Where it does
// not, the new screen plays a plain CSS entrance instead.
export function canViewTransition(): boolean {
  return typeof document !== 'undefined' && typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function';
}

// For a kid screen as it opens: which change brought it here. The answer is fixed when the screen first draws.
// The page is told too (`data-screen-change` on the root), because the browser's view transition styles hang
// from the root, not from the screen.
export function useScreenArrival(): ScreenChange {
  const path = useContext(UNSAFE_LocationContext)?.location.pathname ?? null;
  const [change] = useState<ScreenChange>(() => (path === null ? 'none' : screenChange(last, path)));
  useLayoutEffect(() => {
    if (path === null) return;
    noteScreen(path);
  }, [path]);
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.screenChange = change === 'none' ? 'fade' : change;
  }, [change]);
  return change;
}
