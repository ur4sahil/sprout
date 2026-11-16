import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'tally' }> };

// Tally marks in bundles of five: four upright strokes and one across them.
export default function TallyVisual({ visual }: Props) {
  const bundles = Math.floor(visual.count / 5);
  const loose = visual.count % 5;
  const groups = [...new Array<number>(bundles).fill(5), ...(loose > 0 ? [loose] : [])];
  const width = Math.max(groups.length * 62, 20);
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} 50`} width={width * 1.3} role="img" aria-label={describeVisual(visual)} data-visual="tally">
      {groups.map((size, g) => (
        <g key={g} transform={`translate(${g * 62 + 6} 0)`} data-bundle={size}>
          {Array.from({ length: Math.min(size, 4) }, (_, i) => (
            <line key={i} x1={6 + i * 12} y1="6" x2={6 + i * 12} y2="44" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
          ))}
          {size === 5 && <line x1="-2" y1="38" x2="50" y2="12" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />}
        </g>
      ))}
    </svg>
  );
}
