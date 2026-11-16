import type { ReactNode } from 'react';
import styles from './CenterRow.module.css';

// A full-width row of things, centred, that wraps onto more lines on a narrow screen.
export default function CenterRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
