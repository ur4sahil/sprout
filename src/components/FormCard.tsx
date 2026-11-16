import type { FormEvent, ReactNode } from 'react';
import styles from './FormCard.module.css';

interface Props {
  title: string;
  lead: string;
  mark?: string; // one emoji above the title
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}

// A grown-up form in a card, centred on the screen, scrolling inside its own panel.
export default function FormCard({ title, lead, mark, onSubmit, children }: Props) {
  return (
    <main className={styles.screen}>
      <form className={styles.card} onSubmit={onSubmit}>
        {mark && (
          <div className={styles.mark} aria-hidden="true">
            {mark}
          </div>
        )}
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
        {children}
      </form>
    </main>
  );
}
