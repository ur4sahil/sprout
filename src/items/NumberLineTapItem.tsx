import { useLayoutEffect, useRef, useState } from 'react';
import { partLabel } from '../engine/describe';
import Icon from '../components/Icon';
import { INK } from '../visuals/geometry';
import { PALETTE } from '../visuals/palette';
import { feelSound, isCalm } from './itemFeel';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

const WIDTH = 320; // the drawing's own units; it scales to the screen

// Put the marker on a mark of a number line: tap the line near the mark, or step with the arrows.
// The marker's number is never written, so the child cannot find the answer by reading labels.
// A small frog sits on the marker and hops along the line to each new place. When the answer is right it lands
// with a little squash and the number under it lights up (only then is the number shown).
const HOP_MS = 320; // the same as --t-move

export default function NumberLineTapItem({ question, disabled, onChange, right }: ItemProps<'numberLineTap'>) {
  const { min, max, step, denominator } = question.line;
  const marks = Math.round((max - min) / step);
  const [at, setAt] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const hopper = useRef<SVGGElement>(null);
  const cameFrom = useRef<number | null>(null); // the mark the frog sat on before this one
  const x = (i: number): number => 20 + (i / marks) * (WIDTH - 40);
  const label = (value: number): string => (denominator ? partLabel(value, denominator) : String(value));
  // Which marks carry a number: the two ends, every whole on a fraction line, and on a long line every fifth.
  const labelled = (i: number): boolean => {
    const value = min + i * step;
    if (i === 0 || i === marks) return true;
    if (denominator) return value % denominator === 0;
    return marks <= 10 || i % 5 === 0;
  };

  // The hop: an arc from the mark it was on to the mark it is on now, higher for a longer jump. Skipped in Calm
  // mode and where the browser cannot animate; the frog is then simply at its new place.
  useLayoutEffect(() => {
    const from = cameFrom.current;
    cameFrom.current = at;
    const el = hopper.current;
    if (!el || at === null || from === null || from === at || typeof el.animate !== 'function' || isCalm()) return;
    const back = x(from) - x(at);
    const rise = -Math.min(22, 8 + Math.abs(back) / 6);
    const hop = el.animate(
      [{ transform: `translate(${back}px, 0px)` }, { transform: `translate(${back / 2}px, ${rise}px)`, easing: 'ease-in' }, { transform: 'translate(0px, 0px)' }],
      { duration: HOP_MS, easing: 'ease-out' },
    );
    return () => hop.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a move of the marker starts a hop
  }, [at]);

  function choose(i: number): void {
    const index = Math.min(Math.max(i, 0), marks);
    if (index !== at) feelSound('pop');
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
            {labelled(i) && !(right && i === at) && (
              <text x={x(i)} y="58" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>
                {label(min + i * step)}
              </text>
            )}
          </g>
        ))}
        {at !== null && <circle cx={x(at)} cy="30" r="9" fill={PALETTE.counter} stroke={INK} strokeWidth="2" data-marker="" />}
        {at !== null && (
          // The frog is moved to its mark by the outer group, hopped by the middle one and squashed by the inner.
          <g transform={`translate(${x(at)} 0)`} aria-hidden="true" data-hopper={at}>
            <g ref={hopper}>
              <g className={right ? styles.hopperLand : undefined} data-feel={right ? '' : undefined} data-landed={right ? '' : undefined}>
                <ellipse cx="-6.5" cy="19" rx="3.2" ry="1.8" fill={PALETTE.hostLeaf} />
                <ellipse cx="6.5" cy="19" rx="3.2" ry="1.8" fill={PALETTE.hostLeaf} />
                <ellipse cx="0" cy="13.5" rx="8" ry="6.5" fill={PALETTE.hostBody} stroke={INK} strokeWidth="1.2" />
                <circle cx="-4" cy="7" r="2.8" fill={PALETTE.paper} stroke={INK} strokeWidth="1" />
                <circle cx="4" cy="7" r="2.8" fill={PALETTE.paper} stroke={INK} strokeWidth="1" />
                <circle cx="-4" cy="7" r="1.1" fill={INK} />
                <circle cx="4" cy="7" r="1.1" fill={INK} />
                <path d="M-3 15.5q3 2.200 6 0" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
              </g>
            </g>
          </g>
        )}
        {right && at !== null && (
          // The frog's number, shown only now that the answer is known to be right. It sits where a label goes.
          <text className={styles.lit} x={x(at)} y="58" textAnchor="middle" fontSize="15" fontWeight="800" data-feel="" data-lit="">
            {label(min + at * step)}
          </text>
        )}
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
