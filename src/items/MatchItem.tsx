import { useState } from 'react';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Tap a left item, then its partner on the right. Tap a matched item to undo that pair.
export default function MatchItem({ question, disabled, onChange, onSpeak }: ItemProps<'match'>) {
  const [pairs, setPairs] = useState<[number, number][]>([]);
  const [heldLeft, setHeldLeft] = useState<number | null>(null);

  function update(next: [number, number][]): void {
    setPairs(next);
    onChange(next.length === question.left.length ? { pairs: next } : null);
  }

  const pairOfLeft = (l: number): number => pairs.findIndex(([left]) => left === l);
  const pairOfRight = (r: number): number => pairs.findIndex(([, right]) => right === r);

  return (
    <div className={styles.pairs} role="group" aria-label="Match the pairs">
      {question.left.map((_, row) => {
        const left = question.left[row];
        const right = question.right[row];
        if (!left || !right) return null;
        const leftPair = pairOfLeft(row);
        const rightPair = pairOfRight(row);
        return [
          <button
            key={`l${row}`}
            type="button"
            className={`${styles.tile} ${heldLeft === row || leftPair >= 0 ? styles.picked : ''}`}
            aria-pressed={heldLeft === row || leftPair >= 0}
            aria-label={`${describeVisual(left)}${leftPair >= 0 ? `, pair ${leftPair + 1}` : ''}`}
            disabled={disabled}
            data-left={row}
            onClick={() => {
              if (leftPair >= 0) {
                update(pairs.filter(([l]) => l !== row));
                return;
              }
              setHeldLeft(heldLeft === row ? null : row);
              const say = heldLeft === row ? null : speakable(question, left.speak);
              if (say) onSpeak(say);
            }}
          >
            {leftPair >= 0 && (
              <span className={styles.badge} data-pair={leftPair + 1}>
                {leftPair + 1}
              </span>
            )}
            <VisualView visual={left} />
          </button>,
          <button
            key={`r${row}`}
            type="button"
            className={`${styles.tile} ${rightPair >= 0 ? styles.picked : ''}`}
            aria-pressed={rightPair >= 0}
            aria-label={`${describeVisual(right)}${rightPair >= 0 ? `, pair ${rightPair + 1}` : ''}`}
            disabled={disabled}
            data-right={row}
            onClick={() => {
              if (rightPair >= 0) {
                update(pairs.filter(([, r]) => r !== row));
                return;
              }
              const say = speakable(question, right.speak);
              if (say) onSpeak(say);
              if (heldLeft === null) return;
              update([...pairs, [heldLeft, row]]);
              setHeldLeft(null);
            }}
          >
            {rightPair >= 0 && (
              <span className={styles.badge} data-pair={rightPair + 1}>
                {rightPair + 1}
              </span>
            )}
            <VisualView visual={right} />
          </button>,
        ];
      })}
    </div>
  );
}
