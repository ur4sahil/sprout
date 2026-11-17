import type { ReactNode } from 'react';
import styles from './TileGrid.module.css';

// A grid of tiles that fills the width and wraps.
// `dense` packs many small things, such as stickers. `rows` lays out slim rows, two across when there is room.
export default function TileGrid({ label, dense = false, rows = false, children }: { label: string; dense?: boolean; rows?: boolean; children: ReactNode }) {
  return (
    <div className={`${styles.grid} ${dense ? styles.dense : ''} ${rows ? styles.rows : ''}`} role="group" aria-label={label}>
      {children}
    </div>
  );
}
