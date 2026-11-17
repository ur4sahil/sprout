import { describeVisual, partLabel } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'linePlot' }> };

const GAP = 46; // between two marks on the line
const MARK = 13; // the height of one X

// A line plot: a number line counted in halves or fourths, with one X for each thing measured.
export default function LinePlotVisual({ visual }: Props) {
  const tallest = Math.max(1, ...visual.counts);
  const width = (visual.counts.length - 1) * GAP + 50;
  const base = 14 + tallest * MARK;
  return (
    <span className={styles.linePlot} role="img" aria-label={describeVisual(visual)} data-visual="linePlot">
      <svg className={styles.svg} viewBox={`0 0 ${width} ${base + 34}`} width={width * 1.4} aria-hidden="true">
        <line x1="8" y1={base} x2={width - 8} y2={base} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        {visual.counts.map((count, i) => {
          const x = 25 + i * GAP;
          return (
            <g key={i} data-count={count}>
              <line x1={x} y1={base - 6} x2={x} y2={base + 6} stroke={INK} strokeWidth="2" />
              <text x={x} y={base + 24} textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>
                {partLabel(visual.min + i, visual.denominator)}
              </text>
              {Array.from({ length: count }, (_, k) => (
                <text key={k} x={x} y={base - 9 - k * MARK} textAnchor="middle" fontSize="14" fontWeight="800" fill={INK} data-x="">
                  ×
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      <span className={styles.linePlotUnit} aria-hidden="true">
        {visual.unit}
      </span>
    </span>
  );
}
