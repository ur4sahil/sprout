import type { ReactNode } from 'react';
import styles from './TileGrid.module.css';

// A grid of tiles that fills the width and wraps.
export default function TileGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.grid} role="group" aria-label={label}>
      {children}
    </div>
  );
}
