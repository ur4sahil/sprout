import type { ReactNode } from 'react';
import styles from './FormLinks.module.css';

// The row of quiet links under a form's main button.
export default function FormLinks({ children }: { children: ReactNode }) {
  return <div className={styles.links}>{children}</div>;
}
