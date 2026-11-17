import type { ReactNode } from 'react';
import styles from './KidScreen.module.css';

interface Props {
  bar?: ReactNode; // a row across the top
  side?: ReactNode; // a panel beside the main area, or a strip above it on a phone
  nav?: ReactNode; // a menu: a column before the main area, or a block above it on a phone
  children: ReactNode;
}

// The frame of every kid screen: a flex column that never scrolls sideways.
// Scrolling happens inside the main area. Double-tap zoom, the long-press menu and text selection are off.
export default function KidScreen({ bar, side, nav, children }: Props) {
  return (
    <div className={styles.screen}>
      {bar && <header className={styles.bar}>{bar}</header>}
      <div className={styles.body} data-menu={nav ? '' : undefined}>
        <main className={styles.main}>{children}</main>
        {nav && <nav className={styles.nav}>{nav}</nav>}
        {side && <aside className={styles.side}>{side}</aside>}
      </div>
    </div>
  );
}
