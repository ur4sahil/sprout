import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'tenFrame' }> };

const CELL = 30;

// One or two ten frames. Counters fill the top row first, left to right, then the bottom row.
export default function TenFrameVisual({ visual }: Props) {
  const frames = Array.from({ length: visual.frames }, (_, f) => Math.max(0, Math.min(10, visual.filled - f * 10)));
  const width = visual.frames * (CELL * 5) + (visual.frames - 1) * 18 + 4;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${CELL * 2 + 4}`} width={width * 1.4} role="img" aria-label={describeVisual(visual)} data-visual="tenFrame">
      {frames.map((filled, f) => {
        const left = 2 + f * (CELL * 5 + 18);
        return (
          <g key={f}>
            {Array.from({ length: 10 }, (_, i) => {
              const x = left + (i % 5) * CELL;
              const y = 2 + Math.floor(i / 5) * CELL;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={CELL} height={CELL} fill="#ffffff" stroke={INK} strokeWidth="2" />
                  {i < filled && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={CELL * 0.34} fill="#E53935" stroke={INK} strokeWidth="1.5" data-counter="" />}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
