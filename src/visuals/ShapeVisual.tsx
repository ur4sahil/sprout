import { colorHex } from '../content/data/colors';
import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK, SHAPES, shapeTransform } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'shape' }> };

const WIDTH = { s: 56, m: 92, l: 136 };

// A flat shape. It always has a dark outline, so it never relies on colour alone.
export default function ShapeVisual({ visual }: Props) {
  const outline = SHAPES[visual.shape];
  const fill = visual.open ? 'none' : colorHex(visual.color);
  const stroke = visual.open ? colorHex(visual.color) : INK;
  // An open shape is an outline with a gap in it.
  const common = {
    fill,
    stroke,
    strokeWidth: visual.open ? 6 : 3,
    strokeLinejoin: 'round' as const,
    ...(visual.open ? { pathLength: 100, strokeDasharray: '86 14', strokeLinecap: 'round' as const } : {}),
  };
  return (
    <svg className={styles.svg} viewBox="0 0 100 100" width={WIDTH[visual.size]} role="img" aria-label={describeVisual(visual)} data-visual="shape">
      <g transform={shapeTransform(visual.rotation, visual.flip === true)}>
        {outline.type === 'circle' && <circle cx="50" cy="50" r={outline.r} {...common} />}
        {outline.type === 'ellipse' && <ellipse cx="50" cy="50" rx={outline.rx} ry={outline.ry} {...common} />}
        {outline.type === 'polygon' && <polygon points={outline.points} {...common} />}
        {outline.type === 'path' && <path d={outline.d} {...common} />}
        {outline.type === 'flag' && (
          <>
            <line x1="26" y1="8" x2="26" y2="94" stroke={INK} strokeWidth="6" strokeLinecap="round" />
            <polygon points="29,12 86,30 29,50" fill={colorHex(visual.color)} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          </>
        )}
      </g>
    </svg>
  );
}
