import { useRef, useState } from 'react';
import Art from '../visuals/Art';
import { turn, useCalm, useLineUp } from './itemFeel';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

// Tap that many objects from a group. Tap one again to take it back. A tapped object bounces and shows its
// number, so the child sees the count grow. When the answer is right the counted objects line up at the front
// in the order they were counted, and the last number stamps in as the total.
export default function TapCountItem({ question, disabled, onChange, right }: ItemProps<'tapCount'>) {
  const [tapped, setTapped] = useState<number[]>([]);
  const group = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  const lineUp = !!right && !calm; // in Calm mode nothing changes place
  useLineUp(group, lineUp);
  return (
    <div ref={group} className={styles.objects} role="group" aria-label={`${question.shown} to tap`} data-lined-up={lineUp ? '' : undefined}>
      {Array.from({ length: question.shown }, (_, index) => {
        const place = tapped.indexOf(index);
        const on = place >= 0;
        const total = right && place === tapped.length - 1;
        return (
          <button
            key={index}
            type="button"
            className={`${styles.tile} ${styles.small} ${styles.object} ${on ? `${styles.picked} ${styles.bounce}` : ''}`}
            // Lined up: counted ones first, in counting order; the rest keep their places after them.
            style={lineUp ? { order: on ? place : question.shown } : undefined}
            aria-pressed={on}
            aria-label={`Object ${index + 1}`}
            disabled={disabled}
            data-object={index}
            data-feel={on ? '' : undefined}
            onClick={() => {
              const next = on ? tapped.filter((i) => i !== index) : [...tapped, index];
              setTapped(next);
              onChange(next.length > 0 ? { count: next.length } : null);
            }}
          >
            {on && (
              <span className={`${styles.badge} ${total ? styles.stamp : styles.pin}`} style={turn(place)} aria-hidden="true" data-feel="" data-count={place + 1} data-total={total ? '' : undefined}>
                {place + 1}
              </span>
            )}
            <span aria-hidden="true">
              <Art emoji={question.emoji} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
