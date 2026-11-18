import { useLayoutEffect, useRef, useState } from 'react';
import { describeVisual } from '../engine/describe';
import VisualView from '../visuals/VisualView';
import { turn } from './itemFeel';
import type { ItemProps } from './itemProps';
import { speakable } from './itemProps';
import styles from './items.module.css';

// Where one thread runs, in the group's own measure: from the edge of the left thing to the edge of its partner.
interface Thread {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Tap a left item, then its partner on the right. Tap a matched item to undo that pair.
// A held item shows the end of a thread; each pair made is joined by a thread that draws itself across. When
// the answer is right, every thread is tied with a small bow, one after another.
export default function MatchItem({ question, disabled, onChange, onSpeak, right: won }: ItemProps<'match'>) {
  const [pairs, setPairs] = useState<[number, number][]>([]);
  const [heldLeft, setHeldLeft] = useState<number | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const group = useRef<HTMLDivElement>(null);

  function update(next: [number, number][]): void {
    setPairs(next);
    onChange(next.length === question.left.length ? { pairs: next } : null);
  }

  // Measures where each thread runs. Done after the pairs are drawn, and again when the screen changes size.
  useLayoutEffect(() => {
    const el = group.current;
    if (!el) return;
    const measure = (): void => {
      const frame = el.getBoundingClientRect();
      const next = pairs.map(([l, r]): Thread => {
        const from = el.querySelector(`[data-left="${l}"]`)?.getBoundingClientRect();
        const to = el.querySelector(`[data-right="${r}"]`)?.getBoundingClientRect();
        if (!from || !to) return { x1: 0, y1: 0, x2: 0, y2: 0 };
        return { x1: from.right - frame.left, y1: from.top + from.height / 2 - frame.top, x2: to.left - frame.left, y2: to.top + to.height / 2 - frame.top };
      });
      // Only a real change is saved, so measuring never draws the group in a loop.
      setThreads((now) => (JSON.stringify(now) === JSON.stringify(next) ? now : next));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pairs]);

  const pairOfLeft = (l: number): number => pairs.findIndex(([left]) => left === l);
  const pairOfRight = (r: number): number => pairs.findIndex(([, right]) => right === r);

  return (
    <div ref={group} className={styles.pairs} role="group" aria-label="Match the pairs">
      {question.left.map((_, row) => {
        const left = question.left[row];
        const right = question.right[row];
        if (!left || !right) return null;
        const leftPair = pairOfLeft(row);
        const rightPair = pairOfRight(row);
        const holding = heldLeft === row && leftPair < 0;
        return [
          <button
            key={`l${row}`}
            type="button"
            className={`${styles.tile} ${heldLeft === row || leftPair >= 0 ? styles.picked : ''} ${holding ? styles.threadEnd : ''}`}
            aria-pressed={heldLeft === row || leftPair >= 0}
            aria-label={`${describeVisual(left)}${leftPair >= 0 ? `, pair ${leftPair + 1}` : ''}`}
            disabled={disabled}
            data-left={row}
            data-feel={holding ? '' : undefined}
            data-thread-end={holding ? '' : undefined}
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
      {/* The threads lie over the gap between the two sides. They are a picture only: taps pass through. */}
      <svg className={styles.threadLayer} aria-hidden="true" data-threads={pairs.length}>
        {pairs.map(([l, r], n) => {
          const at = threads[n] ?? { x1: 0, y1: 0, x2: 0, y2: 0 };
          return (
            <g key={`${l}-${r}`} data-thread={n + 1}>
              <path className={`${styles.thread} ${won ? styles.threadDone : ''}`} d={`M${at.x1} ${at.y1}L${at.x2} ${at.y2}`} pathLength="1" data-feel="" />
              {won && (
                <g transform={`translate(${(at.x1 + at.x2) / 2} ${(at.y1 + at.y2) / 2})`}>
                  {/* A bow: two loops, two tails and the knot between them. */}
                  <g className={styles.bow} style={turn(n)} data-feel="" data-bow={n + 1}>
                    <path d="M0 0L-13 -8L-13 8Z" />
                    <path d="M0 0L13 -8L13 8Z" />
                    <path d="M0 0L-7 12M0 0L7 12" />
                    <circle cx="0" cy="0" r="3.5" />
                  </g>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
