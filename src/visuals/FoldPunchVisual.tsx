import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'foldPunch' }> };

const CELL = 24;

// A paper square on a 4 by 4 grid of cells. Folded, only the half that shows is drawn, with a thick fold edge.
// Unfolded, the whole square is drawn with the fold as a dashed line.
export default function FoldPunchVisual({ visual }: Props) {
  const folded = visual.state === 'folded';
  const cols = folded && visual.fold === 'vertical' ? 2 : 4;
  const rows = folded && visual.fold === 'horizontal' ? 2 : 4;
  const width = cols * CELL;
  const height = rows * CELL;
  return (
    <svg className={styles.svg} viewBox={`-4 -4 ${4 * CELL + 8} ${4 * CELL + 8}`} width="150" role="img" aria-label={describeVisual(visual)} data-visual="foldPunch">
      <rect x="0" y="0" width={width} height={height} fill={PALETTE.foldPaper} stroke={INK} strokeWidth="2" />
      {folded && <rect x="3" y="3" width={width} height={height} fill="none" stroke={INK} strokeWidth="1" opacity="0.35" />}
      {folded ? (
        visual.fold === 'vertical' ? (
          <line x1={width} y1="0" x2={width} y2={height} stroke={INK} strokeWidth="5" data-fold="edge" />
        ) : (
          <line x1="0" y1={height} x2={width} y2={height} stroke={INK} strokeWidth="5" data-fold="edge" />
        )
      ) : visual.fold === 'vertical' ? (
        <line x1={2 * CELL} y1="0" x2={2 * CELL} y2={height} stroke={INK} strokeWidth="1.5" strokeDasharray="5 4" data-fold="crease" />
      ) : (
        <line x1="0" y1={2 * CELL} x2={width} y2={2 * CELL} stroke={INK} strokeWidth="1.5" strokeDasharray="5 4" data-fold="crease" />
      )}
      {visual.holes.map((hole) => (
        <circle key={`${hole.col},${hole.row}`} cx={hole.col * CELL + CELL / 2} cy={hole.row * CELL + CELL / 2} r={CELL * 0.26} fill={INK} data-hole={`${hole.col},${hole.row}`} />
      ))}
    </svg>
  );
}
