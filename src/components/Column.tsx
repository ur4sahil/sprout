import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Column.module.css';

// A centred column at question width. `label` makes it a named region.
export default function Column({ label, children, ...rest }: { label?: string; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <section className={styles.column} aria-label={label} {...rest}>
      {children}
    </section>
  );
}
