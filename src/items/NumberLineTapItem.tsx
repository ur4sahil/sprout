import { useRef, useState } from 'react';
import { partLabel } from '../engine/describe';
import Icon from '../components/Icon';
import { INK } from '../visuals/geometry';
import { PALETTE } from '../visuals/palette';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

const WIDTH = 320; // the drawing's own units; it scales to the screen

// Put the marker on a mark of a number line: tap the line near the mark, or step with the arrows.
// The marker's number is never written, so the child cannot find the answer by reading labels.
export default function NumberLineTapItem({ question, disabled, onChange }: ItemProps<'numberLineTap'>) {
  const { min, max, step, denominator } = question.line;
  const marks = Math.round((max - min) / step);
  const [at, setAt] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const x = (i: number): number => 20 + (i / marks) * (WIDTH - 40);
  const label = (value: number): string => (denominator ? partLabel(value, denominator) : String(value));
  // Which marks carry a number: the two ends, every whole on a fraction line, and on a long line every fifth.
  const labelled = (i: number): boolean => {
    const value = min + i * step;
    if (i === 0 || i === marks) return true;
    if (denominator) return value % denominator === 0;
    return marks <= 10 || i % 5 === 0;
  };

  function choose(i: number): void {
    const index = Math.min(Math.max(i, 0), marks);
    setAt(index);
    onChange({ value: min + index * step });
  }

  function tapLine(clientX: number): void {
    const box = svg.current?.getBoundingClientRect();
    if (!box || disabled) return;
    const units = ((clientX - box.left) / box.width) * WIDTH;
    choose(Math.round(((units - 20) / (WIDTH - 40)) * marks));
  }

  return (
    <div className={styles.column}>
      <svg
        ref={svg}
        className={styles.lineTap}
        viewBox={`0 0 ${WIDTH} 70`}
        role="slider"
        aria-label="Number line"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={at === null ? undefined : min + at * step}
        aria-valuetext={at === null ? 'No mark chosen' : 'A mark is chosen'}
        data-line-tap={at === null ? '' : at}
        onPointerDown={(event) => tapLine(event.clientX)}
      >
        <rect x="0" y="0" width={WIDTH} height="70" fill="transparent" />
        <line x1="12" y1="30" x2={WIDTH - 12} y2="30" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        {Array.from({ length: marks + 1 }, (_, i) => (
          <g key={i} data-mark={i}>
            <line x1={x(i)} y1={labelled(i) ? 20 : 24} x2={x(i)} y2={labelled(i) ? 40 : 36} stroke={INK} strokeWidth={labelled(i) ? 2.2 : 1.4} />
            {labelled(i) && (
              <text x={x(i)} y="58" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>
                {label(min + i * step)}
              </text>
            )}
          </g>
        ))}
        {at !== null && <circle cx={x(at)} cy="30" r="9" fill={PALETTE.counter} stroke={INK} strokeWidth="2" data-marker="" />}
      </svg>
      <div className={styles.options} role="group" aria-label="Move the dot">
        <button type="button" className={`${styles.tile} ${styles.small}`} aria-label="Move left" disabled={disabled || at === 0} onClick={() => choose(at === null ? Math.floor(marks / 2) : at - 1)}>
          <Icon name="back" />
        </button>
        <button type="button" className={`${styles.tile} ${styles.small}`} aria-label="Move right" disabled={disabled || at === marks} onClick={() => choose(at === null ? Math.ceil(marks / 2) : at + 1)}>
          <Icon name="next" />
        </button>
      </div>
    </div>
  );
}
