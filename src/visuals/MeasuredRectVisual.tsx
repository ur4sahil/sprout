import { describeVisual, sideLabel } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK, rectBox } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'measuredRect' }> };

const LONG = 160; // the longer side, across
const ROOM = 52; // beside a side, for its label
const HEAD = 30; // above or below a side, for its label

// A rectangle drawn to its sides (the owner's choice, Nov 22, 2026): "6 cm" along the top, "4 cm" down the left
// side, and with `allSides` the bottom and the right side too. A side to be found shows "?".
export default function MeasuredRectVisual({ visual }: Props) {
  const { w, h } = rectBox(visual.length, visual.width, LONG);
  const left = ROOM;
  const top = HEAD;
  const width = left + w + (visual.allSides ? ROOM : 14);
  const height = top + h + (visual.allSides ? HEAD : 14);
  const along = sideLabel(visual, 'length');
  const down = sideLabel(visual, 'width');
  const label = { fontSize: 15, fontWeight: 800, fill: INK } as const;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} width={width * 1.3} role="img" aria-label={describeVisual(visual)} data-visual="measuredRect">
      <rect x={left} y={top} width={w} height={h} fill={PALETTE.rectFill} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" data-w={w} data-h={h} />
      <text x={left + w / 2} y={top - 9} textAnchor="middle" {...label} data-side="top">
        {along}
      </text>
      <text x={left - 8} y={top + h / 2 + 5} textAnchor="end" {...label} data-side="left">
        {down}
      </text>
      {visual.allSides && (
        <>
          <text x={left + w / 2} y={top + h + 21} textAnchor="middle" {...label} data-side="bottom">
            {along}
          </text>
          <text x={left + w + 8} y={top + h / 2 + 5} textAnchor="start" {...label} data-side="right">
            {down}
          </text>
        </>
      )}
    </svg>
  );
}
