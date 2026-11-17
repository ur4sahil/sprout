import Art from '../visuals/Art';
import { useState } from 'react';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

// Tap that many objects from a group. Tap one again to take it back.
export default function TapCountItem({ question, disabled, onChange }: ItemProps<'tapCount'>) {
  const [tapped, setTapped] = useState<number[]>([]);
  return (
    <div className={styles.objects} role="group" aria-label={`${question.shown} to tap`}>
      {Array.from({ length: question.shown }, (_, index) => {
        const on = tapped.includes(index);
        return (
          <button
            key={index}
            type="button"
            className={`${styles.tile} ${styles.small} ${styles.object} ${on ? styles.picked : ''}`}
            aria-pressed={on}
            aria-label={`Object ${index + 1}`}
            disabled={disabled}
            data-object={index}
            onClick={() => {
              const next = on ? tapped.filter((i) => i !== index) : [...tapped, index];
              setTapped(next);
              onChange(next.length > 0 ? { count: next.length } : null);
            }}
          >
            <span aria-hidden="true">
              <Art emoji={question.emoji} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
