import { useState } from 'react';
import CenterRow from '../components/CenterRow';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import { feelSound, turn } from './itemFeel';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Tap an item, then a bin. Tap an item in a bin to take it back out. With an item in hand every group lifts to
// take it, and the item drops in with a soft sound. When the answer is right each group gives a happy shake.
export default function SortItem({ question, disabled, onChange, onSpeak, right }: ItemProps<'sort'>) {
  const [bins, setBins] = useState<(number | null)[]>(() => question.items.map(() => null));
  const [held, setHeld] = useState<number | null>(null);

  function update(next: (number | null)[]): void {
    setBins(next);
    onChange(next.every((bin) => bin !== null) ? { bins: next as number[] } : null);
  }

  function dropInto(binIndex: number): void {
    feelSound('drop');
    update(bins.map((value, index) => (index === held ? binIndex : value)));
    setHeld(null);
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
      <CenterRow>
        {question.bins.map((bin, binIndex) => (
          <div
            key={binIndex}
            className={`${styles.bin} ${held !== null && !disabled ? styles.binReady : ''} ${right ? styles.binHappy : ''}`}
            style={right ? turn(binIndex) : undefined}
            data-feel={right ? '' : undefined}
            data-ready={held !== null && !disabled ? '' : undefined}
            data-happy={right ? '' : undefined}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`${bin.label} group`}
            aria-disabled={disabled}
            data-bin={binIndex}
            onClick={() => {
              if (disabled || held === null) return;
              dropInto(binIndex);
            }}
            onKeyDown={(event) => {
              if (disabled || held === null || (event.key !== 'Enter' && event.key !== ' ')) return;
              event.preventDefault();
              dropInto(binIndex);
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
                    className={`${styles.tile} ${styles.small} ${styles.dropIn}`}
                    data-feel=""
                    aria-label={`${describeVisual(item)}, in ${bin.label}. Tap to take out`}
                    disabled={disabled}
                    data-placed={index}
                    onClick={(event) => {
                      // With an item in hand, a tap anywhere in the group drops it there, even on a picture
                      // already inside. Only with empty hands does a tap take this one out.
                      if (held !== null) return;
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
      </CenterRow>
    </div>
  );
}
