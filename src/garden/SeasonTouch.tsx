import type { CSSProperties } from 'react';
import type { SeasonLook } from '../worlds/types';
import styles from './SeasonTouch.module.css';

interface Props {
  look: SeasonLook;
}

// Where each falling thing starts across the window (0 to 100), how far into its fall it starts, and how slow it
// is beside the others. Spread by hand, so the fall looks loose but is the same every time.
const BITS = [
  { x: 6, delay: 0.1, pace: 1 },
  { x: 17, delay: 0.62, pace: 1.25 },
  { x: 29, delay: 0.35, pace: 0.9 },
  { x: 41, delay: 0.82, pace: 1.15 },
  { x: 52, delay: 0.2, pace: 1.05 },
  { x: 63, delay: 0.5, pace: 0.95 },
  { x: 74, delay: 0.05, pace: 1.3 },
  { x: 85, delay: 0.7, pace: 1 },
  { x: 94, delay: 0.42, pace: 1.1 },
  { x: 11, delay: 0.9, pace: 1.2 },
  { x: 35, delay: 0.15, pace: 1.35 },
  { x: 58, delay: 0.75, pace: 1.2 },
  { x: 79, delay: 0.28, pace: 0.85 },
  { x: 47, delay: 0.55, pace: 1.4 },
] as const;
const HOW_MANY: Readonly<Record<SeasonLook['touch'], number>> = { blossom: 9, leaves: 8, snow: 14, sun: 0 };

// The season's small touch over the garden (game feel, phase 8): blossom petals drifting in spring, orange
// leaves in autumn, light snow in winter. A few, small and soft, behind the plants and the path, and never in
// the way of a touch. Drawn only when the garden may move: the garden leaves it out in Calm mode and with
// Reduce Motion, and the style hides it there too. Summer's touch, the sun, is part of the sky instead.
export default function SeasonTouch({ look }: Props) {
  const count = HOW_MANY[look.touch];
  if (count === 0) return null;
  return (
    <div className={styles.fall} aria-hidden="true" data-season-touch={look.touch}>
      {BITS.slice(0, count).map((bit, i) => (
        <span key={bit.x} className={styles.lane} style={{ '--set-x': bit.x, '--set-delay': bit.delay, '--set-pace': bit.pace } as CSSProperties} data-season-bit="">
          <svg className={styles.bit} viewBox="-5 -5 10 10">
            {look.touch === 'snow' ? (
              <circle r={i % 3 === 0 ? 2.6 : 1.8} fill={look.touchColours[i % 2]} />
            ) : look.touch === 'leaves' ? (
              <path d="M0 -4.2 C 3.2 -2.4, 3.2 2.4, 0 4.2 C -3.2 2.4, -3.2 -2.4, 0 -4.2 Z" fill={look.touchColours[i % 2]} />
            ) : (
              <ellipse rx="3.2" ry="1.9" fill={look.touchColours[i % 2]} />
            )}
          </svg>
        </span>
      ))}
    </div>
  );
}
