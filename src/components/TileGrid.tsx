import type { ReactNode } from 'react';
import styles from './TileGrid.module.css';

// A grid of tiles that fills the width and wraps.
// `dense` packs many small things, such as stickers.
export default function TileGrid({ label, dense = false, children }: { label: string; dense?: boolean; children: ReactNode }) {
  return (
    <div className={`${styles.grid} ${dense ? styles.dense : ''}`} role="group" aria-label={label}>
      {children}
    </div>
  );
}
