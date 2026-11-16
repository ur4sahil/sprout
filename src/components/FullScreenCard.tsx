import type { ReactNode } from 'react';
import styles from './Celebration.module.css';

interface Props {
  emoji: string;
  title: string;
  line: string;
  name: string; // a data-* name for this card, such as "break" or "limit"
  children: ReactNode; // the buttons
}

// A full-screen moment between questions: a break, the end of a review, the daily limit.
export default function FullScreenCard({ emoji, title, line, name, children }: Props) {
  return (
    <div className={styles.cover} role="dialog" aria-modal="true" aria-label={title} data-card={name}>
      <div className={styles.emoji} aria-hidden="true">
        {emoji}
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.line}>{line}</p>
      {children}
    </div>
  );
}
