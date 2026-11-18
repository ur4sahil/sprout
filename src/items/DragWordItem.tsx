import { useRef, useState } from 'react';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import { feelSound, turn } from './itemFeel';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

const NEAR = 110; // a dragged word this close to the gap (in screen points) makes the gap open for it

// Move a word into the gap: tap a word, or drag it onto the gap. A tap on the gap sends the word back.
// The gap opens wider as a dragged word comes near, and the word lands with a soft sound. When the answer is
// right the whole sentence glows, word by word from left to right.
export default function DragWordItem({ question, disabled, onChange, onSpeak, right }: ItemProps<'dragWord'>) {
  const [placed, setPlaced] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ index: number; x: number; y: number } | null>(null);
  const [near, setNear] = useState(false); // a dragged word is close to the gap
  const gap = useRef<HTMLButtonElement>(null);

  function place(index: number | null): void {
    setPlaced(index);
    onChange(index === null ? null : { index });
    if (index !== null) {
      feelSound('drop');
      const say = speakable(question, question.options[index]?.speak);
      if (say) onSpeak(say);
    }
  }

  function overGap(x: number, y: number): boolean {
    const box = gap.current?.getBoundingClientRect();
    return !!box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  }

  function nearGap(x: number, y: number): boolean {
    const box = gap.current?.getBoundingClientRect();
    return !!box && Math.hypot(x - (box.left + box.width / 2), y - (box.top + box.height / 2)) < NEAR;
  }

  const word = placed === null ? null : question.options[placed];
  const beforeWords = question.before ? question.before.split(' ') : [];
  const afterWords = question.after ? question.after.split(' ') : [];
  // One part of the sentence. Once right, each word is its own piece so the glow can pass along them in turn;
  // the words and the spaces between them stay exactly as written.
  const part = (words: string[], first: number) =>
    right
      ? words.map((each, i) => (
          <span key={i}>
            {i > 0 && ' '}
            <span className={styles.wordGlow} style={turn(first + i)} data-feel="" data-glow-word={first + i + 1}>
              {each}
            </span>
          </span>
        ))
      : words.join(' ');
  return (
    <div className={styles.column}>
      <p className={styles.gapLine}>
        {question.before && <span>{part(beforeWords, 0)} </span>}
        <button
          ref={gap}
          type="button"
          className={`${styles.gap} ${word ? styles.picked : ''} ${near ? styles.gapNear : ''} ${right ? styles.wordGlow : ''}`}
          style={right ? turn(beforeWords.length) : undefined}
          data-feel={right ? '' : undefined}
          data-near={near ? '' : undefined}
          aria-label={word ? `Gap: ${describeVisual(word)}. Tap to take it out` : 'Gap'} disabled={disabled || word === null} onClick={() => place(null)} data-gap={placed ?? ''}>
          {word ? <VisualView visual={word} /> : <span aria-hidden="true">?</span>}
        </button>
        {question.after && <span> {part(afterWords, beforeWords.length + 1)}</span>}
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
              setNear(nearGap(event.clientX, event.clientY));
            }}
            onPointerUp={(event) => {
              const moved = dragging && (Math.abs(dragging.x) > 8 || Math.abs(dragging.y) > 8);
              setDragging(null);
              setNear(false);
              // A drag that ends on the gap places the word; a plain tap places it too.
              if (!moved || overGap(event.clientX, event.clientY)) place(index);
            }}
            onPointerCancel={() => {
              setDragging(null);
              setNear(false);
            }}
          >
            <VisualView visual={option} />
          </button>
        ))}
      </div>
    </div>
  );
}
