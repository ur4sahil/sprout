import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { ChildDay } from '../app/childDay';
import type { Skill } from '../content/catalogue';
import type { Ladder } from '../content/ladders';
import { LADDERS } from '../content/ladders';
import type { Grade } from '../storage/schema';
import { PALETTE } from '../visuals/palette';
import { currentWorld } from '../worlds';
import { GARDEN } from '../worlds/garden';
import type { HomeScene } from '../worlds/types';
import type { PlantPlace } from './layout';
import { KINDS_PER_AREA, layoutGarden } from './layout';
import Plant from './Plant';
import styles from './GardenStrip.module.css';

interface Props {
  grade: Grade;
  day: Pick<ChildDay, 'states' | 'plan' | 'reviewsDue'>;
  skills: readonly Skill[];
  ladders?: readonly Ladder[];
  onOpen: () => void; // tapped: go to the whole garden
}

export const STRIP_PLANTS = 7; // the most plants the strip shows

// The plants the strip shows: the ones today's plan leads to first, then the ones that have grown most, then the
// rest in garden order. A child sees today's plants grow as they work.
export function stripPlants(plants: readonly PlantPlace[], most: number = STRIP_PLANTS): PlantPlace[] {
  const order = plants.map((plant, i) => ({ plant, i }));
  order.sort((a, b) => Number(b.plant.today) - Number(a.plant.today) || b.plant.stage - a.plant.stage || a.i - b.i);
  // Shown in garden order, so the flowers of one area stand together.
  return order
    .slice(0, most)
    .sort((a, b) => a.i - b.i)
    .map((each) => each.plant);
}

// Home's strip of the garden (the owner's choice A, Nov 18, 2026): a band of sky and grass with the child's
// plants in it and today's sun. One tap opens the whole garden.
export default function GardenStrip({ grade, day, skills, ladders = LADDERS, onOpen }: Props) {
  const layout = useMemo(() => layoutGarden({ grade, states: day.states, skills, ladders, plan: day.plan, reviewsDue: day.reviewsDue }), [grade, day.states, day.plan, day.reviewsDue, skills, ladders]);
  const plants = stripPlants(layout.beds.flatMap((bed) => bed.plants));
  const home: HomeScene = currentWorld().home ?? (GARDEN.home as HomeScene);
  const colours = PALETTE.garden;
  const look = { '--set-sky-top': colours.sky.afternoon[0], '--set-sky-bottom': colours.sky.afternoon[1], '--set-grass': colours.grass, '--set-grass-front': colours.grassFront } as CSSProperties;
  const { done, goal } = layout.progress;
  return (
    <button type="button" className={styles.strip} style={look} onClick={onOpen} data-garden-strip="" aria-label={`${home.title}. Open it.${goal > 0 ? ` ${done} of ${goal} questions today.` : ''}`}>
      <span className={styles.hill} aria-hidden="true" />
      <span className={styles.plants} aria-hidden="true">
        {plants.map((plant) => {
          const area = home.areas[plant.subject];
          return (
            <span key={plant.skillId} className={styles.plant} data-strip-plant={plant.skillId} data-stage={plant.stage}>
              <Plant stage={plant.stage} kind={area.kinds[plant.kind % KINDS_PER_AREA] ?? area.kinds[0]} droop={plant.droop} />
            </span>
          );
        })}
      </span>
      <span className={styles.label} aria-hidden="true">
        {home.title}
        <span className={styles.chevron}>›</span>
      </span>
      {goal > 0 && (
        <span className={styles.sun} aria-hidden="true" data-strip-sun="">
          {done}/{goal}
        </span>
      )}
    </button>
  );
}
