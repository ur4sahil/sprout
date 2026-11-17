import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';
import { PALETTE } from './palette';

type Props = { visual: Extract<Visual, { kind: 'baseTen' }> };

const U = 7; // one unit cube
const GAP = 8;

const DEPTH = 18; // how far a thousand cube reaches back

// Place-value blocks: thousand cubes, hundred flats, ten rods and unit cubes.
export default function BaseTenVisual({ visual }: Props) {
  const parts: { x: number; kind: 'thousand' | 'hundred' | 'ten' | 'one'; row?: number }[] = [];
  let x = 2;
  for (let i = 0; i < (visual.thousands ?? 0); i += 1) {
    parts.push({ x, kind: 'thousand' });
    x += U * 10 + DEPTH + GAP;
  }
  for (let i = 0; i < visual.hundreds; i += 1) {
    parts.push({ x, kind: 'hundred' });
    x += U * 10 + GAP;
  }
  for (let i = 0; i < visual.tens; i += 1) {
    parts.push({ x, kind: 'ten' });
    x += U + GAP * 0.6;
  }
  if (visual.tens > 0) x += GAP * 0.4;
  // Ones stack in columns of five, so nine ones do not make one long line that looks like a rod.
  for (let i = 0; i < visual.ones; i += 1) parts.push({ x: x + Math.floor(i / 5) * (U + 4), kind: 'one', row: i % 5 });
  const width = Math.max(x + Math.ceil(visual.ones / 5) * (U + 4), 20) + 2;
  const height = U * 10 + 4;
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} width={width * 2.2} role="img" aria-label={describeVisual(visual)} data-visual="baseTen">
      {parts.map((part, index) => {
        if (part.kind === 'thousand') {
          // A cube drawn in depth: a front face of ten by ten, with its top and side going back.
          const front = { x: part.x, y: 2 + DEPTH, size: U * 10 - DEPTH };
          const f = front.size;
          return (
            <g key={index} data-block="thousand">
              <polygon points={`${front.x},${front.y} ${front.x + DEPTH},${front.y - DEPTH} ${front.x + DEPTH + f},${front.y - DEPTH} ${front.x + f},${front.y}`} fill={PALETTE.hundred} stroke={INK} strokeWidth="1.2" />
              <polygon points={`${front.x + f},${front.y} ${front.x + f + DEPTH},${front.y - DEPTH} ${front.x + f + DEPTH},${front.y - DEPTH + f} ${front.x + f},${front.y + f}`} fill={PALETTE.ten} stroke={INK} strokeWidth="1.2" />
              <rect x={front.x} y={front.y} width={f} height={f} fill={PALETTE.hundred} stroke={INK} strokeWidth="1.2" />
              {Array.from({ length: 9 }, (_, i) => (
                <g key={i}>
                  <line x1={front.x + ((i + 1) * f) / 10} y1={front.y} x2={front.x + ((i + 1) * f) / 10} y2={front.y + f} stroke={INK} strokeWidth="0.4" />
                  <line x1={front.x} y1={front.y + ((i + 1) * f) / 10} x2={front.x + f} y2={front.y + ((i + 1) * f) / 10} stroke={INK} strokeWidth="0.4" />
                </g>
              ))}
            </g>
          );
        }
        if (part.kind === 'hundred') {
          return (
            <g key={index} data-block="hundred">
              <rect x={part.x} y={2} width={U * 10} height={U * 10} fill={PALETTE.hundred} stroke={INK} strokeWidth="1.2" />
              {Array.from({ length: 9 }, (_, i) => (
                <g key={i}>
                  <line x1={part.x + (i + 1) * U} y1={2} x2={part.x + (i + 1) * U} y2={2 + U * 10} stroke={INK} strokeWidth="0.5" />
                  <line x1={part.x} y1={2 + (i + 1) * U} x2={part.x + U * 10} y2={2 + (i + 1) * U} stroke={INK} strokeWidth="0.5" />
                </g>
              ))}
            </g>
          );
        }
        if (part.kind === 'ten') {
          return (
            <g key={index} data-block="ten">
              <rect x={part.x} y={2} width={U} height={U * 10} fill={PALETTE.ten} stroke={INK} strokeWidth="1.2" />
              {Array.from({ length: 9 }, (_, i) => (
                <line key={i} x1={part.x} y1={2 + (i + 1) * U} x2={part.x + U} y2={2 + (i + 1) * U} stroke={INK} strokeWidth="0.5" />
              ))}
            </g>
          );
        }
        return <rect key={index} data-block="one" x={part.x} y={2 + U * 10 - U - (part.row ?? 0) * (U + 3)} width={U} height={U} fill={PALETTE.one} stroke={INK} strokeWidth="1.2" />;
      })}
    </svg>
  );
}
