import type { ReactNode } from 'react';
import { ViewTransition, useEffect } from 'react';
import { canViewTransition, useScreenArrival } from '../app/screenChange';
import { watchFrames } from '../lib/frameWatch';
import styles from './KidScreen.module.css';
import './screenChange.css';

interface Props {
  bar?: ReactNode; // a row across the top
  side?: ReactNode; // a panel beside the main area, or a strip above it on a phone
  nav?: ReactNode; // a menu: a column before the main area, or a block above it on a phone
  children: ReactNode;
}

// The frame of every kid screen: a flex column that never scrolls sideways.
// Scrolling happens inside the main area. Double-tap zoom, the long-press menu and text selection are off.
// As it opens it arrives the way the child moved (game feel, phase 8): into a skill it grows in from the middle,
// back to home it settles in from a little larger. Where the browser has view transitions, it draws the change
// between the two screens; elsewhere the new screen plays the same entrance by itself. Neither waits or holds a tap.
export default function KidScreen({ bar, side, nav, children }: Props) {
  const arrival = useScreenArrival();
  // Each kid screen is a moment to check the device keeps up with the movement (the old-device fallback).
  useEffect(() => {
    if (import.meta.env.MODE !== 'test') watchFrames();
  }, []);
  const drawnByBrowser = canViewTransition();
  const screen = (
    <div className={styles.screen} data-screen-in={arrival !== 'none' && !drawnByBrowser ? arrival : undefined}>
      {bar && <header className={styles.bar}>{bar}</header>}
      <div className={styles.body} data-menu={nav ? '' : undefined}>
        <main className={styles.main}>{children}</main>
        {nav && <nav className={styles.nav}>{nav}</nav>}
        {side && <aside className={styles.side}>{side}</aside>}
      </div>
    </div>
  );
  // The browser's view transition is asked for only where it exists; elsewhere the screen plays its own entrance.
  if (!drawnByBrowser) return screen;
  return (
    <ViewTransition name="kid-screen" update="none">
      {screen}
    </ViewTransition>
  );
}
