import type { CSSProperties } from 'react';
import { useId } from 'react';
import { PALETTE } from '../visuals/palette';
import type { SeasonLook } from '../worlds/types';
import styles from './GardenBackdrop.module.css';
import type { AreaPlace, Light } from './layout';
import { sceneryFor } from './season';

interface Props {
  width: number; // the scene's width, in its own units
  light: Light;
  still: boolean; // Calm mode: the layers do not slide against each other
  areas: readonly AreaPlace[];
  look?: SeasonLook | null; // the season's scenery (game feel, phase 8). Left out: the usual colours
}

const C = PALETTE.garden;
// How fast each layer moves beside the garden itself: the far hills a quarter as fast, the trees about half.
export const FAR_SPEED = 0.25;
export const MID_SPEED = 0.55;
const SPARE = 320; // a slower layer is shorter than the scene, plus enough to fill the widest screen at the far end
const USUAL_VIEW = 130; // the usual width of the screen in scene units, used to line trees up with their area

// A row of rounded hills from one end to the other.
function hills(wide: number, crest: number, each: number, rise: number): string {
  let d = `M0 100 L 0 ${crest}`;
  for (let x = 0, i = 0; x < wide; x += each, i += 1) d += ` Q ${x + each / 2} ${crest - rise - (i % 3) * 2}, ${x + each} ${crest}`;
  return `${d} L ${wide} 100 Z`;
}

// The two layers behind the garden: the sky with its clouds, stars and far hills, and nearer hills with trees.
// Both are plain pictures; the garden slides them more slowly than itself as the child scrolls.
export default function GardenBackdrop({ width, light, still, areas, look = null }: Props) {
  const sky = useId();
  const farSpeed = still ? 1 : FAR_SPEED;
  const midSpeed = still ? 1 : MID_SPEED;
  const farWide = Math.ceil(still ? width : width * FAR_SPEED + SPARE);
  const midWide = Math.ceil(still ? width : width * MID_SPEED + SPARE);
  // Where a place in the garden shows on a slower layer when it is in the middle of the screen.
  const onMid = (x: number): number => midSpeed * x + (1 - midSpeed) * (USUAL_VIEW / 2);
  const scenery = sceneryFor(look, light);
  const [top, bottom] = scenery.sky;
  // Summer's bright sun, high in the sky by day: one every so often along the far layer, so one is in view.
  const suns = look?.touch === 'sun' && (light === 'morning' || light === 'afternoon') ? Array.from({ length: Math.ceil(farWide / 260) }, (_, i) => ({ x: 34 + i * 260 })) : [];

  const clouds = Array.from({ length: Math.ceil(farWide / 70) }, (_, i) => ({ x: 20 + i * 70 + ((i * 23) % 17), y: 7 + (i % 3) * 6, size: 1 + (i % 2) * 0.35 }));
  const stars = light === 'night' ? Array.from({ length: Math.ceil(farWide / 9) }, (_, i) => ({ x: i * 9 + ((i * 37) % 7), y: 3 + ((i * 53) % 31), r: 0.25 + (i % 3) * 0.12 })) : [];
  // The Word Woods are thick with trees; the meadow and the pond have a few.
  const trees = areas.flatMap((area) => {
    const gap = area.subject === 'ela' ? 15 : area.subject === 'math' ? 64 : 44;
    return Array.from({ length: Math.floor(area.width / gap) }, (_, i) => ({ x: onMid(area.x + 10 + i * gap + ((i * 7) % 5)), tall: 13 + ((i * 5) % 3) * 4 }));
  });

  return (
    <>
      <svg className={styles.far} style={{ '--set-strip': farWide } as CSSProperties} viewBox={`0 0 ${farWide} 100`} preserveAspectRatio="none" aria-hidden="true" data-layer="far" data-speed={farSpeed}>
        <defs>
          <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="0.5" stopColor={bottom} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={farWide} height="100" fill={`url(#${sky})`} />
        {stars.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill={C.starlight} data-star="" />
        ))}
        {suns.map((sun) => (
          <g key={sun.x} data-season-sun="">
            <circle cx={sun.x} cy="12" r="7.5" fill={look?.touchColours[1]} opacity="0.7" />
            <circle cx={sun.x} cy="12" r="4.8" fill={look?.touchColours[0]} />
          </g>
        ))}
        {clouds.map((cloud, i) => (
          <g key={i} className={styles.cloud} style={{ '--set-sway-shift': (i % 5) / 5 } as CSSProperties} opacity={light === 'night' ? 0.25 : 0.9} data-cloud="">
            <g transform={`translate(${cloud.x} ${cloud.y}) scale(${cloud.size})`} fill={C.cloud}>
              <ellipse cx="0" cy="0" rx="9" ry="3.2" />
              <ellipse cx="-4" cy="-2" rx="4.5" ry="3" />
              <ellipse cx="3" cy="-3" rx="5" ry="3.6" />
            </g>
          </g>
        ))}
        <path d={hills(farWide, 40, 64, 9)} fill={scenery.hillFar} stroke={scenery.hillEdge ?? 'none'} strokeWidth="1.2" data-hill-edge={scenery.hillEdge ? '' : undefined} />
      </svg>
      <svg className={styles.mid} style={{ '--set-strip': midWide } as CSSProperties} viewBox={`0 0 ${midWide} 100`} preserveAspectRatio="none" aria-hidden="true" data-layer="mid" data-speed={midSpeed}>
        <path d={hills(midWide, 44, 46, 5)} fill={scenery.hillMid} stroke={scenery.hillEdge ?? 'none'} strokeWidth="0.8" />
        {trees.map((tree, i) => (
          <g key={i} data-tree="">
            <rect x={tree.x - 0.9} y={46 - tree.tall * 0.45} width="1.8" height={tree.tall * 0.45} fill={C.trunk} />
            <ellipse cx={tree.x} cy={46 - tree.tall * 0.7} rx={tree.tall * 0.3} ry={tree.tall * 0.36} fill={i % 2 === 0 ? scenery.tree : scenery.treeLight} />
          </g>
        ))}
      </svg>
    </>
  );
}
