import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'ruler' }> };

const UNIT = 30;

// A drawn object lying above a ruler. It is drawn, never an emoji, which would stretch out of shape.
export default function RulerVisual({ visual }: Props) {
  const end = visual.startUnit + visual.lengthUnits;
  const marks = Math.max(end + 1, 6);
  const width = marks * UNIT + 24;
  const x0 = 12 + visual.startUnit * UNIT;
  const x1 = 12 + end * UNIT;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} 78`} width={width * 1.4} role="img" aria-label={describeVisual(visual)} data-visual="ruler">
      <g data-object={visual.object} data-from={x0} data-to={x1}>
        {visual.object === 'pencil' && (
          <>
            <rect x={x0} y="10" width={Math.max(x1 - x0 - 14, 2)} height="16" fill="#FDD835" stroke={INK} strokeWidth="1.5" />
            <polygon points={`${x1 - 14},10 ${x1},18 ${x1 - 14},26`} fill="#f1d3a8" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
            <polygon points={`${x1 - 5},15.2 ${x1},18 ${x1 - 5},20.8`} fill={INK} />
            <rect x={x0} y="10" width="7" height="16" fill="#EC407A" stroke={INK} strokeWidth="1.5" />
          </>
        )}
        {visual.object === 'crayon' && (
          <>
            <rect x={x0} y="10" width={Math.max(x1 - x0 - 10, 2)} height="16" rx="2" fill="#E53935" stroke={INK} strokeWidth="1.5" />
            <polygon points={`${x1 - 10},12 ${x1},18 ${x1 - 10},24`} fill="#c62828" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
            <rect x={x0 + 8} y="10" width={Math.max((x1 - x0) * 0.4, 2)} height="16" fill="#ffffff" opacity="0.45" />
          </>
        )}
        {visual.object === 'ribbon' && <rect x={x0} y="12" width={x1 - x0} height="12" fill="#8E24AA" stroke={INK} strokeWidth="1.5" />}
      </g>
      <rect x="4" y="38" width={width - 8} height="34" rx="3" fill="#f4e3b1" stroke={INK} strokeWidth="1.5" />
      {Array.from({ length: marks + 1 }, (_, i) => {
        const x = 12 + i * UNIT;
        return (
          <g key={i}>
            <line x1={x} y1="38" x2={x} y2="50" stroke={INK} strokeWidth="1.8" />
            <text x={x} y="65" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>
              {i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
