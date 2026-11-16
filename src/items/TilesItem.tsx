import { useState } from 'react';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

// Tap letter or word tiles into the blanks. Tap a filled blank to send its tile back.
export default function TilesItem({ question, disabled, onChange }: ItemProps<'tiles'>) {
  // For each slot, which bank tile sits in it.
  const [slots, setSlots] = useState<(number | null)[]>(() => new Array<number | null>(question.slots).fill(null));

  function update(next: (number | null)[]): void {
    setSlots(next);
    onChange(next.every((tile) => tile !== null) ? { tiles: next.map((tile) => question.bank[tile as number] as string) } : null);
  }

  return (
    <div className={styles.column}>
      <div className={styles.slots} role="group" aria-label="Your word">
        {slots.map((tile, slot) => (
          <button
            key={slot}
            type="button"
            className={styles.slot}
            aria-label={tile === null ? `Blank ${slot + 1}` : `${question.bank[tile]}, in blank ${slot + 1}. Tap to take out`}
            disabled={disabled || tile === null}
            data-slot={slot}
            onClick={() => update(slots.map((value, i) => (i === slot ? null : value)))}
          >
            {tile === null ? '' : question.bank[tile]}
          </button>
        ))}
      </div>
      <div className={styles.options} role="group" aria-label="Tiles">
        {question.bank.map((text, index) => {
          const used = slots.includes(index);
          return (
            <button
              key={index}
              type="button"
              className={`${styles.tile} ${styles.small} ${styles.letter} ${used ? styles.used : ''}`}
              aria-label={`Tile ${text}`}
              disabled={disabled || used || slots.every((value) => value !== null)}
              data-tile={index}
              onClick={() => {
                const free = slots.indexOf(null);
                if (free === -1) return;
                update(slots.map((value, i) => (i === free ? index : value)));
              }}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
