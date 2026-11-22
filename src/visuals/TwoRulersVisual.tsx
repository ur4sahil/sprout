import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import DrawnThing from './DrawnThing';
import { CM_PER_INCH } from '../engine/units';
import { INK } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'twoRulers' }> };

const CM = 14; // one centimeter across
const INCH = CM * CM_PER_INCH;
const ZERO = 14; // where both rulers start, and the thing with them
const UNIT_ROOM = 38; // after the last mark, for the unit

// One thing measured two ways (the owner's choice, Nov 22, 2026): an inch ruler above it and a centimeter ruler
// below it, both starting at its left end, drawn to the same true scale. A dashed line drops from its right end to
// each ruler, so a child can read both numbers and see that the smaller unit gives the bigger number.
export default function TwoRulersVisual({ visual }: Props) {
  const end = ZERO + visual.inches * INCH;
  const inchMarks = Math.max(visual.inches + 1, 3);
  const cmMarks = Math.ceil(visual.inches * CM_PER_INCH) + 1;
  const scaleEnd = ZERO + Math.max(inchMarks * INCH, cmMarks * CM);
  const width = scaleEnd + UNIT_ROOM;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} 96`} width={width * 1.2} role="img" aria-label={describeVisual(visual)} data-visual="twoRulers">
      <g data-ruler="in">
        <rect x="4" y="4" width={width - 8} height="30" rx="3" fill={PALETTE.rulerInch} stroke={INK} strokeWidth="1.5" />
        {Array.from({ length: inchMarks * 2 + 1 }, (_, half) => {
          const x = ZERO + (half / 2) * INCH;
          const whole = half % 2 === 0;
          return <line key={half} x1={x} y1="34" x2={x} y2={whole ? 22 : 28} stroke={INK} strokeWidth={whole ? 1.8 : 1} data-mark={whole ? half / 2 : undefined} />;
        })}
        {Array.from({ length: inchMarks + 1 }, (_, i) => (
          <text key={i} x={ZERO + i * INCH} y="18" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>
            {i}
          </text>
        ))}
        <text x={scaleEnd + 14} y="23" textAnchor="start" fontSize="12" fontWeight="800" fill={INK} data-unit="in">
          in
        </text>
      </g>
      <DrawnThing object={visual.object} x0={ZERO} x1={end} y={40} />
      <line x1={end} y1="34" x2={end} y2="62" stroke={INK} strokeWidth="1" strokeDasharray="3 2" data-guide="" />
      <g data-ruler="cm">
        <rect x="4" y="62" width={width - 8} height="30" rx="3" fill={PALETTE.ruler} stroke={INK} strokeWidth="1.5" />
        {Array.from({ length: cmMarks + 1 }, (_, i) => (
          <line key={i} x1={ZERO + i * CM} y1="62" x2={ZERO + i * CM} y2="72" stroke={INK} strokeWidth="1.4" data-mark={i} />
        ))}
        {Array.from({ length: cmMarks + 1 }, (_, i) => (
          <text key={i} x={ZERO + i * CM} y="85" textAnchor="middle" fontSize="9" fontWeight="700" fill={INK}>
            {i}
          </text>
        ))}
        <text x={scaleEnd + 14} y="83" textAnchor="start" fontSize="12" fontWeight="800" fill={INK} data-unit="cm">
          cm
        </text>
      </g>
    </svg>
  );
}
