import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import { useCalm, useLineUp } from './itemFeel';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Tap the items in order. Tap one again to undo it. A picked tile lifts, leans toward the place it is heading
// for and casts a bigger shadow. When the answer is right the tiles slide into the order chosen, link up like
// the cars of a train and chug once together.
export default function OrderItem({ question, disabled, onChange, onSpeak, right }: ItemProps<'order'>) {
  const [order, setOrder] = useState<number[]>([]);
  const group = useRef<HTMLDivElement>(null);
  const calm = useCalm();
  const lineUp = !!right && !calm; // in Calm mode nothing changes place
  useLineUp(group, lineUp);
  return (
    <div ref={group} className={styles.options} role="group" aria-label="Tap in order" data-lined-up={lineUp ? '' : undefined}>
      {question.items.map((item, index) => {
        const place = order.indexOf(index);
        const on = place >= 0;
        // Which way this tile will travel to reach its place: left, right or nowhere.
        const lean = Math.sign(place - index);
        const last = place === order.length - 1;
        const style: CSSProperties | undefined = right ? (lineUp ? { order: place } : undefined) : on ? ({ '--set-lean': lean } as CSSProperties) : undefined;
        return (
          <button
            key={index}
            type="button"
            className={`${styles.tile} ${on ? styles.picked : ''} ${on && !right ? styles.lean : ''} ${right ? `${styles.chug} ${last ? '' : styles.link}` : ''}`}
            style={style}
            aria-pressed={on}
            aria-label={`${describeVisual(item)}${on ? `, number ${place + 1}` : ''}`}
            disabled={disabled}
            data-item={index}
            data-feel={right ? '' : undefined}
            data-lean={on && !right ? lean : undefined}
            data-chug={right ? '' : undefined}
            onClick={() => {
              const next = on ? order.filter((i) => i !== index) : [...order, index];
              setOrder(next);
              onChange(next.length === question.items.length ? { order: next } : null);
              const say = on ? null : speakable(question, item.speak);
              if (say) onSpeak(say);
            }}
          >
            {on && (
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
