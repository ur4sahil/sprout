import { useState } from 'react';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Tap the items in order. Tap one again to undo it.
export default function OrderItem({ question, disabled, onChange, onSpeak }: ItemProps<'order'>) {
  const [order, setOrder] = useState<number[]>([]);
  return (
    <div className={styles.options} role="group" aria-label="Tap in order">
      {question.items.map((item, index) => {
        const place = order.indexOf(index);
        return (
          <button
            key={index}
            type="button"
            className={`${styles.tile} ${place >= 0 ? styles.picked : ''}`}
            aria-pressed={place >= 0}
            aria-label={`${describeVisual(item)}${place >= 0 ? `, number ${place + 1}` : ''}`}
            disabled={disabled}
            data-item={index}
            onClick={() => {
              const next = place >= 0 ? order.filter((i) => i !== index) : [...order, index];
              setOrder(next);
              onChange(next.length === question.items.length ? { order: next } : null);
              const say = place >= 0 ? null : speakable(question, item.speak);
              if (say) onSpeak(say);
            }}
          >
            {place >= 0 && (
              <span className={styles.badge} data-place={place + 1}>
                {place + 1}
              </span>
            )}
            <VisualView visual={item} />
          </button>
        );
      })}
    </div>
  );
}
