import { PALETTE } from '../visuals/palette';
import type { HomeScene, SeasonLook } from '../worlds/types';
import styles from './GardenGround.module.css';
import type { AreaPlace, BedPlace, GardenLayout, Stone } from './layout';
import { LANE, SLOT } from './layout';
import { sceneryFor } from './season';

interface Props {
  layout: GardenLayout;
  beds: readonly BedPlace[]; // only the beds near the screen
  stones: readonly Stone[]; // only the stones near the screen
  home: HomeScene;
  look?: SeasonLook | null; // the season's grass (game feel, phase 8). Left out: the usual colours
}

const C = PALETTE.garden;
const GRASS_TOP = 42;

// The top edge of the grass: a long, gently uneven line.
function grass(wide: number): string {
  let d = `M0 100 L 0 ${GRASS_TOP}`;
  for (let x = 0, i = 0; x < wide; x += 40, i += 1) d += ` Q ${x + 20} ${GRASS_TOP + (i % 2 === 0 ? -1.2 : 1.2)}, ${x + 40} ${GRASS_TOP}`;
  return `${d} L ${wide} 100 Z`;
}

// The one big thing in each area that tells it apart without reading: hay in the meadow, a log with mushrooms
// in the woods, the pond.
function landmark(area: AreaPlace, kind: HomeScene['areas']['math']['landmark']) {
  const x = area.feature.x + area.feature.width / 2;
  if (kind === 'pond') {
    return (
      <g data-landmark="pond">
        <ellipse cx={x} cy="70" rx="15" ry="8" fill={C.pond} stroke={C.grassBlade} strokeWidth="0.8" />
        <ellipse cx={x - 4} cy="68" rx="6" ry="2" fill={C.pondLight} />
        <ellipse cx={x + 6} cy="72" rx="3" ry="1.5" fill={C.lilyPad} />
        <ellipse cx={x - 7} cy="73" rx="2.5" ry="1.2" fill={C.lilyPad} />
        <circle cx={x + 6} cy="71.300" r="0.9" fill={C.petalPink} />
      </g>
    );
  }
  if (kind === 'log') {
    return (
      <g data-landmark="log">
        <rect x={x - 12} y="68" width="24" height="7" rx="3.5" fill={C.wood} />
        <ellipse cx={x + 12} cy="71.500" rx="2.2" ry="3.5" fill={C.soilLight} stroke={C.woodDark} strokeWidth="0.5" />
        <path d={`M${x - 6} 68 L ${x - 6} 64`} stroke={C.mushroomStem} strokeWidth="1.6" strokeLinecap="round" />
        <path d={`M${x - 9.5} 64.500 C ${x - 9.5} 60, ${x - 2.5} 60, ${x - 2.5} 64.500 Z`} fill={C.mushroom} />
        <path d={`M${x + 2} 68 L ${x + 2} 65.500`} stroke={C.mushroomStem} strokeWidth="1.2" strokeLinecap="round" />
        <path d={`M${x - 0.5} 66 C ${x - 0.5} 63, ${x + 4.5} 63, ${x + 4.5} 66 Z`} fill={C.mushroom} />
      </g>
    );
  }
  return (
    <g data-landmark="hay">
      <rect x={x - 12} y="66" width="13" height="10" rx="2" fill={C.hay} stroke={C.hayDark} strokeWidth="0.6" />
      <rect x={x + 1} y="68" width="12" height="8" rx="2" fill={C.hay} stroke={C.hayDark} strokeWidth="0.6" />
      <rect x={x - 6} y="58" width="12" height="8" rx="2" fill={C.hay} stroke={C.hayDark} strokeWidth="0.6" />
      <path d={`M${x - 12} 71 L ${x + 1} 71 M ${x + 1} 72 L ${x + 13} 72 M ${x - 6} 62 L ${x + 6} 62`} stroke={C.hayDark} strokeWidth="0.6" />
    </g>
  );
}

// The ground the garden stands on: grass, the lane the path runs along, each area's sign and landmark, the soil
// of the beds near the screen, and the small stones between today's stepping stones. It is one flat picture
// under the plants; nothing in it is tapped.
export default function GardenGround({ layout, beds, stones, home, look = null }: Props) {
  const scenery = sceneryFor(look, 'afternoon');
  return (
    <svg className={styles.ground} viewBox={`0 0 ${layout.width} 100`} preserveAspectRatio="none" aria-hidden="true" data-layer="near">
      <path d={grass(layout.width)} fill={scenery.grass} />
      <rect x="0" y={LANE - SLOT / 2} width={layout.width} height={100 - LANE + SLOT / 2} fill={scenery.grassFront} />
      {layout.areas.map((area) => (
        <g key={area.subject} data-area={area.subject}>
          {/* the area's sign: a board on a post, with a band in the subject's colour */}
          <rect x={area.sign.x - 0.8} y="56" width="1.6" height="14" fill={C.woodDark} />
          <rect x={area.sign.x - 13} y="49" width="26" height="9" rx="1.5" fill={C.wood} stroke={C.woodDark} strokeWidth="0.5" />
          <rect className={styles.band} x={area.sign.x - 13} y="49" width="26" height="2" rx="1" data-subject={area.subject} />
          <text className={styles.name} x={area.sign.x} y="55.800" textAnchor="middle" fontSize="3" fill={PALETTE.ink}>
            {home.areas[area.subject].name}
          </text>
          {landmark(area, home.areas[area.subject].landmark)}
        </g>
      ))}
      {beds.map((bed) => (
        <g key={bed.id} data-bed={bed.id}>
          <rect x={bed.x} y={bed.y + SLOT * 0.45} width={bed.width} height={bed.height - SLOT * 0.45 + 1.5} rx="4" fill={C.soilEdge} />
          <rect x={bed.x} y={bed.y + SLOT * 0.45} width={bed.width} height={bed.height - SLOT * 0.45} rx="4" fill={C.soil} />
        </g>
      ))}
      {stones.flatMap((stone) =>
        stone.steps.map((step, i) => (
          <g key={`${stone.index}-${i}`} data-step="">
            <ellipse cx={step.x} cy={step.y + 0.4} rx="2.3" ry="1.1" fill={C.stoneEdge} />
            <ellipse cx={step.x} cy={step.y} rx="2.3" ry="1.1" fill={C.stone} />
          </g>
        )),
      )}
    </svg>
  );
}
