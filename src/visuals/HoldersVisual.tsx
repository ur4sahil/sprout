import { artSrc } from './Art';
import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { HOLDER, INK, THING, holderSpots } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'holders' }> };

// Plates or baskets to share things onto (the owner's choice, Nov 22, 2026): empty beside the things to share, or
// each holding its share. Each one is a small picture of its own, so on a phone they wrap onto a second line.
export default function HoldersVisual({ visual }: Props) {
  const filled = visual.filled;
  const spots = filled ? holderSpots(filled.each) : [];
  const src = filled ? artSrc(filled.emoji) : null;
  return (
    <div className={styles.holders} role="img" aria-label={describeVisual(visual)} data-visual="holders">
      {Array.from({ length: visual.count }, (_, i) => (
        <svg key={i} className={styles.holder} viewBox={`0 0 ${HOLDER.width} ${HOLDER.height}`} aria-hidden="true" data-holder={visual.holder} data-each={filled?.each ?? 0}>
          {visual.holder === 'plate' ? (
            <>
              <ellipse cx="48" cy="48" rx="44" ry="13" fill={PALETTE.plate} stroke={INK} strokeWidth="2" />
              <ellipse cx="48" cy="47" rx="29" ry="7" fill={PALETTE.plateWell} stroke={INK} strokeWidth="1" />
            </>
          ) : (
            <>
              <path d="M 16 32 Q 48 -16 80 32" fill="none" stroke={PALETTE.basketWeave} strokeWidth="4" strokeLinecap="round" />
              <path d="M 6 30 H 90 L 81 60 H 15 Z" fill={PALETTE.basket} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
              <line x1="12" y1="40" x2="84" y2="40" stroke={PALETTE.basketWeave} strokeWidth="1.5" />
              <line x1="15" y1="50" x2="81" y2="50" stroke={PALETTE.basketWeave} strokeWidth="1.5" />
              {[30, 48, 66].map((x) => (
                <line key={x} x1={x} y1="31" x2={x} y2="59" stroke={PALETTE.basketWeave} strokeWidth="1.5" />
              ))}
            </>
          )}
          {filled &&
            spots.map((spot, k) =>
              src ? (
                <image key={k} href={src} x={spot.x} y={spot.y} width={THING} height={THING} data-item="object" />
              ) : (
                <text key={k} x={spot.x + THING / 2} y={spot.y + THING - 3} textAnchor="middle" fontSize={THING - 4} data-item="object">
                  {filled.emoji}
                </text>
              ),
            )}
        </svg>
      ))}
    </div>
  );
}
