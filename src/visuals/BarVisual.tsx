import { colorHex } from '../content/data/colors';
import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'bar' }> };

const UNIT = 22;
const THICK = 20;

// A bar a number of units long, for comparing and ordering lengths.
export default function BarVisual({ visual }: Props) {
  const long = Math.max(visual.length, 0) * UNIT;
  const flat = visual.orientation === 'horizontal';
  const width = flat ? long + 4 : THICK + 4;
  const height = flat ? THICK + 4 : long + 4;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} width={width * 1.4} role="img" aria-label={describeVisual(visual)} data-visual="bar">
      <rect x="2" y="2" width={flat ? long : THICK} height={flat ? THICK : long} rx="4" fill={colorHex(visual.color)} stroke={INK} strokeWidth="2" data-length={visual.length} />
    </svg>
  );
}
