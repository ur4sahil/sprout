import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import DrawnThing from './DrawnThing';
import { INK } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'ruler' }> };

const UNIT = 30;
// Room at the right end of the ruler for its unit, "cm" or "in", after the last number.
const UNIT_ROOM = 36;

// A drawn object lying above a ruler. It is drawn, never an emoji, which would stretch out of shape.
// With a unit, the ruler prints it at its right end, as a real ruler does.
export default function RulerVisual({ visual }: Props) {
  const end = visual.startUnit + visual.lengthUnits;
  const marks = Math.max(end + 1, 6);
  const width = marks * UNIT + 24 + (visual.unit ? UNIT_ROOM : 0);
  const x0 = 12 + visual.startUnit * UNIT;
  const x1 = 12 + end * UNIT;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} 78`} width={width * 1.4} role="img" aria-label={describeVisual(visual)} data-visual="ruler">
      <DrawnThing object={visual.object} x0={x0} x1={x1} y={10} />
      <rect x="4" y="38" width={width - 8} height="34" rx="3" fill={PALETTE.ruler} stroke={INK} strokeWidth="1.5" />
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
      {visual.unit && (
        <text x={12 + marks * UNIT + 18} y="65" textAnchor="start" fontSize="12" fontWeight="800" fill={INK} data-unit={visual.unit}>
          {visual.unit}
        </text>
      )}
    </svg>
  );
}
