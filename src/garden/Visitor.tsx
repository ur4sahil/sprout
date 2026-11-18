import type { ReactNode } from 'react';
import { PALETTE } from '../visuals/palette';
import styles from './Visitor.module.css';
import type { VisitorKind } from './visitors';
import { VISITOR_NAME } from './visitors';

interface Props {
  kind: VisitorKind;
  x?: number; // in the scene: the middle of its feet (scene units; the garden is 100 tall)
  y?: number; // in the scene: the ground under it
  flip?: boolean; // faces left instead of right
  alone?: boolean; // drawn as its own small picture, outside the garden (a card, a test)
}

const C = PALETTE.visitors;

// Each animal is drawn in scene units with its feet on the ground at 0,0, facing right, in the flat style of
// the cast: plain shapes, no outlines, dot eyes, a pink cheek. The part that moves (an ear, a tail, a head)
// carries `styles.idle`, which Calm mode and Reduce Motion stop.
const ART: Record<VisitorKind, { box: string; draw: ReactNode }> = {
  rabbit: {
    box: '-6 -14 13 14',
    draw: (
      <>
        <ellipse cx="0" cy="-3" rx="4.2" ry="3" fill={C.rabbit} />
        <circle cx="-4" cy="-3.6" r="1.3" fill={C.rabbitTail} />
        <g className={styles.ears}>
          <ellipse cx="2.4" cy="-10.2" rx="0.9" ry="2.6" fill={C.rabbit} transform="rotate(-10 2.4 -10.2)" />
          <ellipse cx="2.4" cy="-10.2" rx="0.45" ry="1.8" fill={C.rabbitInner} transform="rotate(-10 2.4 -10.2)" />
          <ellipse cx="4" cy="-10" rx="0.9" ry="2.6" fill={C.rabbit} transform="rotate(12 4 -10)" />
        </g>
        <circle cx="3.2" cy="-6.6" r="2.4" fill={C.rabbit} />
        <circle cx="3.9" cy="-7.1" r="0.4" fill={C.eye} />
        <circle cx="5.5" cy="-6.3" r="0.4" fill={C.nose} />
        <circle cx="3.6" cy="-5.6" r="0.6" fill={C.cheek} />
        <ellipse cx="2.4" cy="-0.4" rx="1.4" ry="0.6" fill={C.rabbit} />
      </>
    ),
  },
  hedgehog: {
    box: '-7 -8 14 8',
    draw: (
      <>
        <path d="M-5.6 -1 L-6.4 -3 L-5 -3.6 L-5.6 -5.2 L-3.8 -5.4 L-3.6 -7 L-1.8 -6.4 L-1 -7.6 L0.4 -6.4 L1.6 -7.2 L2.2 -5.6 L3.6 -5.6 L3 -1 Z" fill={C.hedgehogDark} />
        <ellipse cx="-1.4" cy="-2.8" rx="4.6" ry="2.8" fill={C.hedgehog} />
        <g className={styles.nose}>
          <ellipse cx="3.6" cy="-2.2" rx="2.6" ry="1.8" fill={C.hedgehogFace} />
          <circle cx="6.1" cy="-2.3" r="0.6" fill={C.nose} />
          <circle cx="3.9" cy="-2.9" r="0.4" fill={C.eye} />
          <circle cx="3.4" cy="-1.7" r="0.5" fill={C.cheek} />
        </g>
        <ellipse cx="-2.6" cy="-0.3" rx="0.9" ry="0.4" fill={C.hedgehogDark} />
        <ellipse cx="1.8" cy="-0.3" rx="0.9" ry="0.4" fill={C.hedgehogDark} />
      </>
    ),
  },
  deer: {
    box: '-8 -18 17 18',
    draw: (
      <>
        <rect x="-4.4" y="-6" width="1" height="6" rx="0.5" fill={C.deer} />
        <rect x="-2.6" y="-6" width="1" height="6" rx="0.5" fill={C.deer} />
        <rect x="2.2" y="-6" width="1" height="6" rx="0.5" fill={C.deer} />
        <rect x="3.8" y="-6" width="1" height="6" rx="0.5" fill={C.deer} />
        <ellipse cx="0" cy="-7.4" rx="5.6" ry="3" fill={C.deer} />
        <ellipse cx="0.4" cy="-6.4" rx="3.6" ry="1.2" fill={C.deerLight} />
        <circle cx="-2.6" cy="-8.6" r="0.45" fill={C.deerLight} />
        <circle cx="-0.6" cy="-9.2" r="0.45" fill={C.deerLight} />
        <circle cx="1.2" cy="-8.7" r="0.45" fill={C.deerLight} />
        <ellipse cx="-5.6" cy="-8.8" rx="0.9" ry="1.3" fill={C.deerLight} />
        <path d="M3.4 -9 L5 -13 L6.8 -12.4 L5.6 -8 Z" fill={C.deer} />
        <g className={styles.head}>
          <path d="M5 -16.6 L4.4 -18 M5 -16.6 L6 -17.8 M7.4 -16.6 L8 -18 M7.4 -16.6 L6.8 -17.8 M5 -16.6 L5.6 -15 M7.4 -16.6 L6.8 -15" stroke={C.antler} strokeWidth="0.45" strokeLinecap="round" />
          <ellipse cx="4.2" cy="-14.6" rx="1" ry="0.6" fill={C.deer} transform="rotate(-25 4.2 -14.6)" />
          <ellipse cx="6.4" cy="-13.6" rx="1.9" ry="1.6" fill={C.deer} />
          <ellipse cx="7.8" cy="-13" rx="0.9" ry="0.7" fill={C.deerLight} />
          <circle cx="8.4" cy="-13.1" r="0.35" fill={C.nose} />
          <circle cx="6.6" cy="-14.1" r="0.38" fill={C.eye} />
        </g>
      </>
    ),
  },
  snail: {
    box: '-6 -7 13 7',
    draw: (
      <>
        <path d="M-5 0 Q -5 -1.6 -3 -1.6 L 3 -1.6 Q 4.4 -1.6 4.6 -3.6 L 5.8 -3.6 Q 6.2 -1 5.6 0 Z" fill={C.snailBody} />
        <g className={styles.head}>
          <path d="M4.8 -3.6 L4.4 -6 M5.8 -3.6 L6.2 -5.8" stroke={C.snailBody} strokeWidth="0.45" strokeLinecap="round" />
          <circle cx="4.4" cy="-6.1" r="0.45" fill={C.eye} />
          <circle cx="6.2" cy="-5.9" r="0.45" fill={C.eye} />
        </g>
        <circle cx="-0.6" cy="-3.6" r="3" fill={C.snailShell} />
        <path d="M-0.6 -3.6 m 0.6 0 a 0.6 0.6 0 1 1 -1.2 0 a 1.4 1.4 0 0 1 2.8 0 a 2.2 2.2 0 0 1 -4.4 0" fill="none" stroke={C.snailSwirl} strokeWidth="0.45" strokeLinecap="round" />
      </>
    ),
  },
  squirrel: {
    box: '-7 -11 13 11',
    draw: (
      <>
        <g className={styles.tail}>
          <path d="M-1.6 -1 C -6.4 -1, -7 -6, -5 -8.6 C -3.4 -10.6, -0.6 -9.6, -1.6 -7.4 C -4 -7.6, -4 -4, -1.6 -3.2 Z" fill={C.squirrel} />
        </g>
        <ellipse cx="1" cy="-3" rx="2.6" ry="3" fill={C.squirrel} />
        <ellipse cx="1.8" cy="-2.6" rx="1.3" ry="2" fill={C.squirrelBelly} />
        <path d="M1.2 -8.6 L1.6 -10.2 L2.6 -8.8 Z" fill={C.squirrel} />
        <circle cx="2.6" cy="-7" r="2" fill={C.squirrel} />
        <circle cx="3.2" cy="-7.4" r="0.4" fill={C.eye} />
        <circle cx="4.5" cy="-6.8" r="0.35" fill={C.nose} />
        <circle cx="3" cy="-6.2" r="0.5" fill={C.cheek} />
        <ellipse cx="0.4" cy="-0.3" rx="1.2" ry="0.5" fill={C.squirrel} />
        <ellipse cx="2.4" cy="-0.3" rx="1.2" ry="0.5" fill={C.squirrel} />
      </>
    ),
  },
  fox: {
    box: '-8 -11 14 11',
    draw: (
      <>
        <g className={styles.tail}>
          <ellipse cx="-4" cy="-1.2" rx="3.4" ry="1.4" fill={C.fox} />
          <ellipse cx="-6.6" cy="-1.2" rx="1" ry="0.9" fill={C.white} />
        </g>
        <ellipse cx="0" cy="-3.6" rx="3" ry="3.6" fill={C.fox} />
        <ellipse cx="0.8" cy="-3.2" rx="1.4" ry="2.4" fill={C.white} />
        <ellipse cx="-0.9" cy="-0.3" rx="1" ry="0.5" fill={C.foxDark} />
        <ellipse cx="1.3" cy="-0.3" rx="1" ry="0.5" fill={C.foxDark} />
        <path d="M-1.4 -9.6 L-1 -11 L0.6 -9.4 Z M1.6 -9.4 L3 -11 L3.4 -9.6 Z" fill={C.foxDark} />
        <path d="M-2 -8.6 Q 1 -11, 4 -8.6 Q 4 -6.6, 1.2 -5.6 Q -1.6 -6.6, -2 -8.6 Z" fill={C.fox} />
        <path d="M-0.4 -7.4 Q 1.2 -6.6, 2.6 -7.4 Q 1.6 -5.8, 1.2 -5.6 Q 0.4 -6, -0.4 -7.4 Z" fill={C.white} />
        <circle cx="0.2" cy="-8.2" r="0.4" fill={C.eye} />
        <circle cx="2.2" cy="-8.2" r="0.4" fill={C.eye} />
        <circle cx="1.2" cy="-5.9" r="0.35" fill={C.nose} />
      </>
    ),
  },
  ducks: {
    box: '-9 -6 16 7',
    draw: (
      <>
        <ellipse cx="-1" cy="0.3" rx="7.4" ry="0.8" fill={C.ripple} />
        <g className={styles.bob}>
          <ellipse cx="1.4" cy="-1.3" rx="2.8" ry="1.6" fill={C.duck} />
          <ellipse cx="0.8" cy="-1.5" rx="1.4" ry="0.8" fill={C.duckWing} />
          <circle cx="3.6" cy="-3.6" r="1.4" fill={C.duck} />
          <path d="M4.8 -3.7 L6.4 -3.4 L4.8 -3 Z" fill={C.beak} />
          <circle cx="4" cy="-4" r="0.3" fill={C.eye} />
        </g>
        <g className={styles.bobLate}>
          <ellipse cx="-4.6" cy="-1" rx="2.2" ry="1.3" fill={C.duck} />
          <ellipse cx="-5" cy="-1.2" rx="1.1" ry="0.6" fill={C.duckWing} />
          <circle cx="-2.8" cy="-2.9" r="1.1" fill={C.duck} />
          <path d="M-1.9 -3 L-0.6 -2.8 L-1.9 -2.4 Z" fill={C.beak} />
          <circle cx="-2.5" cy="-3.2" r="0.26" fill={C.eye} />
        </g>
      </>
    ),
  },
  turtle: {
    box: '-6 -5 13 5',
    draw: (
      <>
        <ellipse cx="-2.6" cy="-0.4" rx="1" ry="0.5" fill={C.turtleSkin} />
        <ellipse cx="2.4" cy="-0.4" rx="1" ry="0.5" fill={C.turtleSkin} />
        <g className={styles.head}>
          <circle cx="4.8" cy="-1.8" r="1.3" fill={C.turtleSkin} />
          <circle cx="5.3" cy="-2.1" r="0.32" fill={C.eye} />
        </g>
        <path d="M-4.4 -0.8 Q -4.4 -4.4, 0 -4.4 Q 4.4 -4.4, 4.4 -0.8 Z" fill={C.turtleShell} />
        <path d="M-1.4 -1.4 L-1 -3.2 L1 -3.2 L1.4 -1.4 Z" fill={C.turtlePlate} />
        <path d="M-3.4 -1.4 L-2.2 -3 M3.4 -1.4 L2.2 -3" stroke={C.turtlePlate} strokeWidth="0.5" strokeLinecap="round" />
      </>
    ),
  },
  swan: {
    box: '-7 -12 14 13',
    draw: (
      <>
        <ellipse cx="0" cy="0.3" rx="6.4" ry="0.8" fill={C.ripple} />
        <path d="M-5.4 -2.4 Q -6.4 -4.6, -3.6 -3.4 Q 0 -1.6, 3 -2.2 Q 4.4 -1, 2 0 L -3.6 0 Q -5.4 -0.6, -5.4 -2.4 Z" fill={C.swan} />
        <path d="M-2.6 -2.6 Q 0 -1.4, 2 -2.2" fill="none" stroke={C.swanShade} strokeWidth="0.5" strokeLinecap="round" />
        <g className={styles.head}>
          <path d="M2.2 -1.6 C 4.6 -4, 0.6 -6.6, 2.2 -9.4 C 2.8 -10.6, 4.6 -10.4, 4.6 -9.2" fill="none" stroke={C.swan} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="3.6" cy="-9.6" r="1.1" fill={C.swan} />
          <path d="M4.5 -9.9 L6.4 -9.3 L4.5 -8.9 Z" fill={C.beak} />
          <circle cx="3.9" cy="-10" r="0.28" fill={C.eye} />
        </g>
      </>
    ),
  },
};

// One animal that has moved into the garden. Inside the garden's SVG it is a group standing at x, y; with
// `alone` it is its own small picture. It is only a picture: what it is called goes in `aria-label` when alone,
// and the garden says the rest.
export default function Visitor({ kind, x = 0, y = 0, flip = false, alone = false }: Props) {
  const art = ART[kind];
  const body = (
    <g className={styles.visitor} transform={alone ? undefined : `translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}`} data-visitor={kind}>
      <ellipse cx="0" cy="0" rx="4" ry="0.6" className={styles.shadow} />
      {art.draw}
    </g>
  );
  if (!alone) return body;
  return (
    <svg className={styles.alone} viewBox={art.box} role="img" aria-label={VISITOR_NAME[kind].one}>
      <g transform={flip ? 'scale(-1 1)' : undefined}>{body}</g>
    </svg>
  );
}
