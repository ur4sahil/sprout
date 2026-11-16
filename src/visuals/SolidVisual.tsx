import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'solid' }> };

const LIGHT = PALETTE.solidLight;
const MID = PALETTE.solidMid;
const DARK = PALETTE.solidDark;
const edge = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const };

// A solid shape, drawn so that it looks three-dimensional.
export default function SolidVisual({ visual }: Props) {
  return (
    <svg className={styles.svg} viewBox="0 0 100 100" width="110" role="img" aria-label={describeVisual(visual)} data-visual="solid">
      {visual.solid === 'cube' && (
        <>
          <polygon points="50,8 88,27 50,46 12,27" fill={LIGHT} {...edge} />
          <polygon points="12,27 50,46 50,92 12,73" fill={MID} {...edge} />
          <polygon points="88,27 50,46 50,92 88,73" fill={DARK} {...edge} />
        </>
      )}
      {visual.solid === 'sphere' && (
        <>
          <circle cx="50" cy="50" r="42" fill={MID} {...edge} />
          <path d="M 8 50 A 42 14 0 0 0 92 50" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="0" opacity="0.55" />
          <ellipse cx="36" cy="32" rx="12" ry="7" fill={PALETTE.paper} opacity="0.6" transform="rotate(-30 36 32)" />
        </>
      )}
      {visual.solid === 'cone' && (
        <>
          <path d="M 50 8 L 12 80 A 38 12 0 0 0 88 80 Z" fill={MID} {...edge} />
          <path d="M 12 80 A 38 12 0 0 1 88 80" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="5 4" opacity="0.6" />
        </>
      )}
      {visual.solid === 'cylinder' && (
        <>
          <path d="M 16 22 L 16 78 A 34 12 0 0 0 84 78 L 84 22 Z" fill={MID} {...edge} />
          <ellipse cx="50" cy="22" rx="34" ry="12" fill={LIGHT} {...edge} />
        </>
      )}
    </svg>
  );
}
