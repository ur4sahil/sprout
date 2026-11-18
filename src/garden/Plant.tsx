import type { CSSProperties, Ref } from 'react';
import { useImperativeHandle, useState } from 'react';
import { PALETTE } from '../visuals/palette';
import type { FlowerKind, GrowthStage } from '../worlds/types';
import styles from './Plant.module.css';
import PlantHead from './PlantHead';
import { partsAt } from './plantParts';

// What a caller holding a plant can ask of it: grow (or shrink back) to a stage, with the growing shown.
export interface PlantHandle {
  growTo: (stage: GrowthStage) => void;
}

interface Props {
  stage: GrowthStage;
  kind: FlowerKind; // the flower's shape and colours, from the world
  droop?: boolean; // its review is due: it leans, and a watering can stands beside it
  visitor?: 'butterfly' | 'bee'; // who comes when it blooms
  swayShift?: number; // 0 to 1: where in the sway it starts, so a bed of plants does not move as one
  ref?: Ref<PlantHandle>;
}

const C = PALETTE.garden;
const on = (shown: boolean): '' | undefined => (shown ? '' : undefined);

// One plant in any of its five stages: a seed in the soil, a sprout, a plant with a bud, a bud opening, a bloom with a
// visitor. Every part is always in the picture; a stage only says which parts show and how tall the stem is, so
// moving from one stage to the next is a glide, not a swap. The picture is 60 wide and 90 tall; the soil is at 84.
export default function Plant({ stage, kind, droop = false, visitor = 'butterfly', swayShift = 0, ref }: Props) {
  // The stage on show. It follows the stage given, and `growTo` can move it for a growth show.
  const [shown, setShown] = useState<GrowthStage>(stage);
  const [given, setGiven] = useState<GrowthStage>(stage);
  if (given !== stage) {
    setGiven(stage);
    setShown(stage);
  }
  useImperativeHandle(ref, () => ({ growTo: (next: GrowthStage) => setShown(next) }), []);

  const parts = partsAt(shown, droop);
  const numbers = { '--set-grow': parts.stem, '--set-rise': parts.rise, '--set-open': parts.open, '--set-sway-shift': swayShift } as CSSProperties;

  return (
    <svg className={styles.plant} viewBox="0 0 60 90" aria-hidden="true" data-plant="" data-stage={shown} data-kind={kind.id} data-droop={on(droop)} style={numbers}>
      {/* a mound of soil */}
      <ellipse cx="30" cy="85" rx="15" ry="4" fill={C.soilEdge} />
      <ellipse cx="30" cy="84" rx="12" ry="3" fill={C.soilLight} />

      {/* a skill not started yet (the owner's choice, Nov 18, 2026): a seed in a small mound of soil, with a tiny
          green tip just showing, so it reads as "about to grow". The first right answer makes it sprout. */}
      <g className={`${styles.part} ${styles.packet}`} data-part="packet" data-on={on(parts.packet)}>
        <path d="M5 86 C 10 58, 50 58, 55 86 Z" fill={C.soilEdge} />
        <path d="M10 86 C 15 64, 45 64, 50 86 Z" fill={C.soilLight} />
        <ellipse cx="30" cy="64" rx="11" ry="8" fill={C.seed} stroke={C.seedEdge} strokeWidth="1.5" />
        <path d="M24 61 C 28 58, 33 58, 37 61" stroke={C.seedEdge} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M30 57 C 30 49, 32 42, 37 37" stroke={C.stem} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M37 37 C 45 32, 50 39, 44 43 C 40.5 44.5, 38 41, 37 37 Z" fill={C.leaf} />
      </g>

      <g className={styles.lean} data-part="lean">
        <g className={styles.sway}>
          <path className={`${styles.part} ${styles.stem}`} data-part="stem" d="M30 84 L 30 30" stroke={C.stem} strokeWidth="4" strokeLinecap="round" />

          {/* grown leaves, low on the stem */}
          <path className={`${styles.part} ${styles.leafLow}`} data-part="leaf" data-on={on(parts.leaves)} d="M30 70 C 20 70, 12 64, 10 56 C 20 55, 28 60, 30 70 Z" fill={C.leaf} />
          <path className={`${styles.part} ${styles.leafHigh}`} data-part="leaf" data-on={on(parts.leaves)} d="M30 60 C 40 60, 48 54, 50 46 C 40 45, 32 50, 30 60 Z" fill={C.leafDark} />

          {/* everything at the top of the stem rides up as the stem grows */}
          <g className={`${styles.part} ${styles.head}`} data-part="head">
            <g className={styles.nod} data-part="nod">
              <g className={`${styles.part} ${styles.seedLeaves}`} data-part="seed-leaves" data-on={on(parts.seedLeaves)}>
                <path d="M30 31 C 22 30, 16 25, 16 19 C 23 19, 29 24, 30 31 Z" fill={C.leaf} />
                <path d="M30 31 C 38 30, 44 25, 44 19 C 37 19, 31 24, 30 31 Z" fill={C.bud} />
              </g>
              <g className={`${styles.part} ${styles.bloom}`} data-part="bloom" data-on={on(parts.open > 0)}>
                <PlantHead kind={kind} />
              </g>
              <g className={`${styles.part} ${styles.bud}`} data-part="bud" data-on={on(parts.bud)}>
                <path d="M30 20 C 37 24, 37 34, 30 37 C 23 34, 23 24, 30 20 Z" fill={C.bud} />
                <path d="M30 37 C 25 36, 22 32, 22 28 C 26 29, 29 32, 30 37 Z" fill={C.leafDark} />
                <path d="M30 37 C 35 36, 38 32, 38 28 C 34 29, 31 32, 30 37 Z" fill={C.leafDark} />
                {/* a bud that is opening shows its colour at the tip */}
                <path className={`${styles.part} ${styles.tip}`} data-part="tip" data-on={on(parts.open > 0)} d="M30 19 C 33 21, 33 25, 30 27 C 27 25, 27 21, 30 19 Z" fill={kind.petal} />
              </g>
            </g>
          </g>
        </g>
      </g>

      {/* a visitor for a flower in bloom */}
      <g className={`${styles.part} ${styles.visitor}`} data-part="visitor" data-visitor={visitor} data-on={on(parts.visitor)}>
        {visitor === 'butterfly' ? (
          <g className={styles.hover}>
            <g className={styles.wings}>
              <ellipse cx="44" cy="10" rx="4.5" ry="5.5" fill={C.butterfly} />
              <ellipse cx="54" cy="10" rx="4.5" ry="5.5" fill={C.butterfly} />
              <ellipse cx="45.5" cy="17" rx="3" ry="3.5" fill={C.petalYellow} />
              <ellipse cx="52.5" cy="17" rx="3" ry="3.5" fill={C.petalYellow} />
            </g>
            <path d="M49 6 L 49 20" stroke={C.butterflyBody} strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : (
          <g className={styles.hover}>
            <g className={styles.wings}>
              <ellipse cx="46" cy="8" rx="4" ry="3" fill={C.wing} />
              <ellipse cx="52" cy="8" rx="4" ry="3" fill={C.wing} />
            </g>
            <ellipse cx="49" cy="13" rx="6" ry="4.5" fill={C.bee} />
            <path d="M47 9.200 L 47 16.800 M 51 9.200 L 51 16.800" stroke={C.beeStripe} strokeWidth="1.6" />
            <circle cx="54" cy="12.500" r="0.9" fill={C.beeStripe} />
          </g>
        )}
      </g>

      {/* the watering can beside a plant that is due a review */}
      <g className={`${styles.part} ${styles.can}`} data-part="can" data-on={on(parts.can)}>
        <path d="M46 72 L 39 64" stroke={C.canDark} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M56 70 C 62 70, 62 80, 56 80" stroke={C.canDark} strokeWidth="2" fill="none" />
        <rect x="45" y="68" width="12" height="15" rx="2" fill={C.can} />
        <rect x="45" y="68" width="12" height="3" rx="1.5" fill={C.canDark} />
        <circle cx="37.5" cy="67" r="1" fill={C.water} />
        <circle cx="35.5" cy="70.500" r="1" fill={C.water} />
        <circle cx="38.5" cy="71.500" r="1" fill={C.water} />
      </g>
    </svg>
  );
}
