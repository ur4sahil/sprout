import { useState } from 'react';
import { feelSound, turn } from './itemFeel';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

// Tap letter or word tiles into the blanks. Tap a filled blank to send its tile back. A tile clicks into its
// blank with a soft sound, and a tile sent back slides home. When the answer is right the letters light in turn.
export default function TilesItem({ question, disabled, onChange, right }: ItemProps<'tiles'>) {
  // For each slot, which bank tile sits in it.
  const [slots, setSlots] = useState<(number | null)[]>(() => new Array<number | null>(question.slots).fill(null));

  // The tile that was just sent back, so it alone slides home.
  const [returned, setReturned] = useState<number | null>(null);

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
            className={`${styles.slot} ${right ? styles.light : ''}`}
            style={right ? turn(slot) : undefined}
            data-feel={right ? '' : undefined}
            data-light={right ? slot + 1 : undefined}
            aria-label={tile === null ? `Blank ${slot + 1}` : `${question.bank[tile]}, in blank ${slot + 1}. Tap to take out`}
            disabled={disabled || tile === null}
            data-slot={slot}
            onClick={() => {
              setReturned(tile);
              update(slots.map((value, i) => (i === slot ? null : value)));
            }}
          >
            {tile === null ? (
              ''
            ) : (
              <span key={tile} className={styles.dropIn} data-feel="" data-dropped="">
                {question.bank[tile]}
              </span>
            )}
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
              className={`${styles.tile} ${styles.small} ${styles.letter} ${used ? styles.used : ''} ${returned === index && !used ? styles.back : ''}`}
              data-feel={returned === index && !used ? '' : undefined}
              data-back={returned === index && !used ? '' : undefined}
              aria-label={`Tile ${text}`}
              disabled={disabled || used || slots.every((value) => value !== null)}
              data-tile={index}
              onClick={() => {
                const free = slots.indexOf(null);
                if (free === -1) return;
                feelSound('drop');
                setReturned(null);
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
