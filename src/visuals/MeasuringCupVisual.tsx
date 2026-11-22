import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'measuringCup' }> };

// The jug: a spout at the top left, then down the left side, along the bottom and up the right side.
const JUG = 'M 14 18 L 24 24 L 28 90 Q 28 94 32 94 L 64 94 Q 68 94 68 90 L 72 20 Z';
// The water inside it, up to the middle line.
const WATER = 'M 26.1 58 L 69.8 58 L 68 90 Q 68 94 64 94 L 32 94 Q 28 94 28 90 Z';
// The lines up its side, from the bottom: a long one, then a short one, and so on.
const MARKS = [80, 71, 62, 53, 44, 35];

// A measuring cup (the owner's choice, Nov 22, 2026): a clear jug with a spout, a handle, lines up its side and
// some water in it. There is no emoji for one, and a glass of milk is a glass, so the app draws it.
export default function MeasuringCupVisual({ visual }: Props) {
  return (
    <svg className={styles.svg} viewBox="0 0 100 100" width="120" role="img" aria-label={describeVisual(visual)} data-visual="measuringCup">
      <path d="M 70 32 C 92 32 92 74 68 74" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" data-handle="" />
      <path d="M 70 32 C 89 32 89 74 68 74" fill="none" stroke={PALETTE.cupGlass} strokeWidth="3.5" strokeLinecap="round" />
      <path d={JUG} fill={PALETTE.cupGlass} />
      <path d={WATER} fill={PALETTE.water} data-water="" />
      <path d={JUG} fill="none" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" data-jug="" />
      {MARKS.map((y, i) => (
        <line key={y} x1="33" y1={y} x2={i % 2 === 0 ? 45 : 40} y2={y} stroke={INK} strokeWidth={i % 2 === 0 ? 2 : 1.4} strokeLinecap="round" data-line="" />
      ))}
    </svg>
  );
}
