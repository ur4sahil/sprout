import { useState } from 'react';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Tap an item, then a bin. Tap an item in a bin to take it back out.
export default function SortItem({ question, disabled, onChange, onSpeak }: ItemProps<'sort'>) {
  const [bins, setBins] = useState<(number | null)[]>(() => question.items.map(() => null));
  const [held, setHeld] = useState<number | null>(null);

  function update(next: (number | null)[]): void {
    setBins(next);
    onChange(next.every((bin) => bin !== null) ? { bins: next as number[] } : null);
  }

  return (
    <div className={styles.column}>
      <div className={styles.options} role="group" aria-label="To sort">
        {question.items.map((item, index) =>
          bins[index] === null ? (
            <button
              key={index}
              type="button"
              className={`${styles.tile} ${held === index ? styles.picked : ''}`}
              aria-pressed={held === index}
              aria-label={describeVisual(item)}
              disabled={disabled}
              data-item={index}
              onClick={() => {
                setHeld(held === index ? null : index);
                const say = held === index ? null : speakable(question, item.speak);
                if (say) onSpeak(say);
              }}
            >
              <VisualView visual={item} />
            </button>
          ) : null,
        )}
      </div>
      <div className={styles.bins}>
        {question.bins.map((bin, binIndex) => (
          <div
            key={binIndex}
            className={styles.bin}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`${bin.label} group`}
            aria-disabled={disabled}
            data-bin={binIndex}
            onClick={() => {
              if (disabled || held === null) return;
              update(bins.map((value, index) => (index === held ? binIndex : value)));
              setHeld(null);
            }}
            onKeyDown={(event) => {
              if (disabled || held === null || (event.key !== 'Enter' && event.key !== ' ')) return;
              event.preventDefault();
              update(bins.map((value, index) => (index === held ? binIndex : value)));
              setHeld(null);
            }}
          >
            {bin.icon && <VisualView visual={bin.icon} />}
            <span className={styles.binLabel}>{bin.label}</span>
            <div className={styles.binItems}>
              {question.items.map((item, index) =>
                bins[index] === binIndex ? (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.tile} ${styles.small}`}
                    aria-label={`${describeVisual(item)}, in ${bin.label}. Tap to take out`}
                    disabled={disabled}
                    data-placed={index}
                    onClick={(event) => {
                      event.stopPropagation();
                      update(bins.map((value, i) => (i === index ? null : value)));
                    }}
                  >
                    <VisualView visual={item} />
                  </button>
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
