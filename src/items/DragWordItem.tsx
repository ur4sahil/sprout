import { useRef, useState } from 'react';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Move a word into the gap: tap a word, or drag it onto the gap. A tap on the gap sends the word back.
export default function DragWordItem({ question, disabled, onChange, onSpeak }: ItemProps<'dragWord'>) {
  const [placed, setPlaced] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ index: number; x: number; y: number } | null>(null);
  const gap = useRef<HTMLButtonElement>(null);

  function place(index: number | null): void {
    setPlaced(index);
    onChange(index === null ? null : { index });
    if (index !== null) {
      const say = speakable(question, question.options[index]?.speak);
      if (say) onSpeak(say);
    }
  }

  function overGap(x: number, y: number): boolean {
    const box = gap.current?.getBoundingClientRect();
    return !!box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  }

  const word = placed === null ? null : question.options[placed];
  return (
    <div className={styles.column}>
      <p className={styles.gapLine}>
        {question.before && <span>{question.before} </span>}
        <button ref={gap} type="button" className={`${styles.gap} ${word ? styles.picked : ''}`} aria-label={word ? `Gap: ${describeVisual(word)}. Tap to take it out` : 'Gap'} disabled={disabled || word === null} onClick={() => place(null)} data-gap={placed ?? ''}>
          {word ? <VisualView visual={word} /> : <span aria-hidden="true">?</span>}
        </button>
        {question.after && <span> {question.after}</span>}
      </p>
      <div className={styles.options} role="group" aria-label="Words">
        {question.options.map((option, index) => (
          <button
            key={index}
            type="button"
            className={`${styles.tile} ${placed === index ? styles.used : ''}`}
            aria-label={describeVisual(option)}
            disabled={disabled || placed === index}
            data-option={index}
            style={dragging?.index === index ? { transform: `translate(${dragging.x}px, ${dragging.y}px)`, zIndex: 2 } : undefined}
            onPointerDown={(event) => {
              if (disabled) return;
              event.currentTarget.setPointerCapture?.(event.pointerId);
              setDragging({ index, x: 0, y: 0 });
              (event.currentTarget as HTMLElement).dataset.startX = String(event.clientX);
              (event.currentTarget as HTMLElement).dataset.startY = String(event.clientY);
            }}
            onPointerMove={(event) => {
              if (!dragging || dragging.index !== index) return;
              const el = event.currentTarget as HTMLElement;
              setDragging({ index, x: event.clientX - Number(el.dataset.startX), y: event.clientY - Number(el.dataset.startY) });
            }}
            onPointerUp={(event) => {
              const moved = dragging && (Math.abs(dragging.x) > 8 || Math.abs(dragging.y) > 8);
              setDragging(null);
              // A drag that ends on the gap places the word; a plain tap places it too.
              if (!moved || overGap(event.clientX, event.clientY)) place(index);
            }}
            onPointerCancel={() => setDragging(null)}
          >
            <VisualView visual={option} />
          </button>
        ))}
      </div>
    </div>
  );
}
