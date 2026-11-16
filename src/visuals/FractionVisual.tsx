import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK, partShares, wedge } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'fraction' }> };

const SHADE = PALETTE.shade;

// A circle or rectangle cut into parts, some shaded. Unequal parts are clearly different sizes.
export default function FractionVisual({ visual }: Props) {
  const shares = partShares(visual.parts, visual.equal);
  let at = 0;
  const parts = shares.map((share, i) => {
    const from = at;
    at += share;
    return { from, to: at, shaded: i < visual.shaded };
  });
  return (
    <svg className={styles.svg} viewBox={visual.shape === 'circle' ? '0 0 100 100' : '0 0 124 84'} width={visual.shape === 'circle' ? 130 : 170} role="img" aria-label={describeVisual(visual)} data-visual="fraction">
      {parts.map((part, i) =>
        visual.shape === 'circle' ? (
          <path key={i} d={wedge(50, 50, 45, part.from * 360, part.to * 360)} fill={part.shaded ? SHADE : PALETTE.paper} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" data-part={part.shaded ? 'shaded' : 'plain'} />
        ) : (
          <rect key={i} x={4 + part.from * 116} y="4" width={(part.to - part.from) * 116} height="76" fill={part.shaded ? SHADE : PALETTE.paper} stroke={INK} strokeWidth="2.2" data-part={part.shaded ? 'shaded' : 'plain'} />
        ),
      )}
    </svg>
  );
}
