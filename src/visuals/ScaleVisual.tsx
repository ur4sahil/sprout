import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import ScaleBlocks from './ScaleBlocks';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'scale' }> };

const BLOCK = 30;

// A balance scale sitting level, with number blocks on each pan.
export default function ScaleVisual({ visual }: Props) {
  const most = Math.max(visual.left.length, visual.right.length, 1);
  const pan = most * (BLOCK + 4) + 16;
  const width = pan * 2 + 60;
  const leftCentre = 10 + pan / 2;
  const rightCentre = width - 10 - pan / 2;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} 112`} width={width * 1.3} role="img" aria-label={describeVisual(visual)} data-visual="scale">
      <ScaleBlocks values={visual.left} centre={leftCentre} />
      <ScaleBlocks values={visual.right} centre={rightCentre} />
      {[leftCentre, rightCentre].map((centre) => (
        <path key={centre} d={`M ${centre - pan / 2} 54 H ${centre + pan / 2} L ${centre + pan / 2 - 10} 62 H ${centre - pan / 2 + 10} Z`} fill="#b0bec5" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      ))}
      <line x1={leftCentre} y1="62" x2={leftCentre} y2="72" stroke={INK} strokeWidth="2.5" />
      <line x1={rightCentre} y1="62" x2={rightCentre} y2="72" stroke={INK} strokeWidth="2.5" />
      <line x1={leftCentre} y1="72" x2={rightCentre} y2="72" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <polygon points={`${width / 2},72 ${width / 2 + 20},106 ${width / 2 - 20},106`} fill="#78909c" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
