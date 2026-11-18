import { describeVisual } from '../engine/describe';
import { FIGURES, pointsText } from '../engine/figures';
import type { Point } from '../engine/figures';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import { PALETTE } from './palette';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'figure' }> };

const centre = (points: readonly Point[]): Point => [points.reduce((sum, [x]) => sum + x, 0) / points.length, points.reduce((sum, [, y]) => sum + y, 0) / points.length];

// A shape made of pieces. 'cut' draws the whole with dashed lines where the pieces meet; 'pieces' pulls each piece
// a little away from the middle, so the gaps show the pieces and their shapes still show how they fit.
export default function FigureVisual({ visual }: Props) {
  const figure = FIGURES[visual.figure];
  const middle = centre(figure.outline);
  const apart = (slot: readonly Point[]): Point[] => {
    const [cx, cy] = centre(slot);
    const dx = (cx - middle[0]) * 0.18;
    const dy = (cy - middle[1]) * 0.18;
    return slot.map(([x, y]) => [x + dx, y + dy] as Point);
  };
  return (
    <svg className={styles.svg} viewBox="-12 -12 124 124" width="150" role="img" aria-label={describeVisual(visual)} data-visual="figure" data-figure={visual.figure}>
      {visual.show !== 'pieces' && <polygon points={pointsText(figure.outline)} fill={PALETTE.solidLight} stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
      {visual.show === 'cut' &&
        figure.slots.map((slot, i) => <polygon key={i} points={pointsText(slot)} fill="none" stroke={INK} strokeWidth="1.6" strokeDasharray="5 4" strokeLinejoin="round" />)}
      {visual.show === 'pieces' &&
        figure.slots.map((slot, i) => <polygon key={i} points={pointsText(apart(slot))} fill={PALETTE.solidMid} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" data-piece={i} />)}
    </svg>
  );
}
