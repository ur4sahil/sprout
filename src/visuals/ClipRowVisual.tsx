import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import DrawnThing from './DrawnThing';
import { CLIP_HIGH, INK, clipPath } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'clipRow' }> };

const CLIP = 34; // one paper clip's length, the unit the thing is measured in
const LEFT = 10;
const ROW = 32; // the top of the row of clips
const DROP = 12; // how far a clip of a bent row drops

// Paper clips laid under a drawn thing (the owner's choice, Nov 22, 2026), so a question about lining them up is
// about measuring something. A dashed line marks each end of the thing, so a child can see whether the clips start
// at its end, touch, and reach the other end.
export default function ClipRowVisual({ visual }: Props) {
  const x1 = LEFT + visual.length * CLIP;
  const reach = Math.max(visual.length, ...visual.clips.map((at) => at + 1));
  const width = LEFT + reach * CLIP + 10;
  const height = ROW + CLIP_HIGH + (visual.bent ? DROP : 0) + 6;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} width={width * 1.2} role="img" aria-label={describeVisual(visual)} data-visual="clipRow">
      <DrawnThing object={visual.object} x0={LEFT} x1={x1} y={6} />
      {[LEFT, x1].map((x) => (
        <line key={x} x1={x} y1="3" x2={x} y2={height - 3} stroke={INK} strokeWidth="1" strokeDasharray="3 2" opacity="0.55" data-end={x} />
      ))}
      {visual.clips.map((at, i) => {
        const x = LEFT + at * CLIP + 0.5;
        const y = ROW + (visual.bent && i % 2 === 1 ? DROP : 0);
        return <path key={i} d={clipPath(x, y, CLIP - 1)} fill="none" stroke={PALETTE.clip} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" data-clip={at} data-from={x} data-to={x + CLIP - 1} data-y={y} />;
      })}
    </svg>
  );
}
