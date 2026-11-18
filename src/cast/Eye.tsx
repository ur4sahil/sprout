import { PALETTE } from '../visuals/palette';
import styles from './Character.module.css';
import { pivot } from './types';
import type { EyeState, Look } from './types';

// One eye of a friend. Open, it has a pupil that turns toward what the friend looks at and a lid that blinks.
// Smiling, it is a happy arch. Closed, it is a sleeping curve. There is no other kind of eye.
interface EyeProps {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  state: EyeState;
  look: Look;
  lid: string; // the colour of the face around the eye, which the lid is made of
  line: string; // the colour of the arch when the eye is smiling or closed
}

export default function Eye({ cx, cy, rx, ry, state, look, lid, line }: EyeProps) {
  if (state === 'smiling') {
    return <path data-part="eye" data-eye="smiling" d={`M${cx - rx} ${cy + ry * 0.35} Q${cx} ${cy - ry * 1.1} ${cx + rx} ${cy + ry * 0.35}`} fill="none" stroke={line} strokeWidth="3.2" strokeLinecap="round" />;
  }
  if (state === 'closed') {
    return <path data-part="eye" data-eye="closed" d={`M${cx - rx} ${cy} Q${cx} ${cy + ry * 0.9} ${cx + rx} ${cy}`} fill="none" stroke={line} strokeWidth="3.2" strokeLinecap="round" />;
  }
  // The pupil sits a little low, as the old host's did, and travels about a third of the eye toward the look.
  const reach = rx * 0.34;
  const pupil = rx * 0.56;
  return (
    <g data-part="eye" data-eye="open">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={PALETTE.paper} />
      <g data-part="pupil" transform={`translate(${(look.x * reach).toFixed(2)} ${(look.y * reach).toFixed(2)})`}>
        <circle cx={cx} cy={cy + ry * 0.15} r={pupil} fill={PALETTE.ink} />
        <circle cx={cx + pupil * 0.35} cy={cy + ry * 0.15 - pupil * 0.4} r={pupil * 0.33} fill={PALETTE.paper} />
      </g>
      {/* the lid: the eye's own shape in the face's colour, drawn down from the top for a blink */}
      <ellipse className={styles.lid} data-part="lid" style={pivot(cx, cy - ry - 0.8)} cx={cx} cy={cy} rx={rx + 0.8} ry={ry + 0.8} fill={lid} />
    </g>
  );
}
