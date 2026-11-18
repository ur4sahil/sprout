import type { CSSProperties } from 'react';
import type { FlowerKind } from '../worlds/types';
import type { PlantPlace } from './layout';
import { SLOT } from './layout';
import Plant from './Plant';
import styles from './PlantButton.module.css';

interface Props {
  plant: PlantPlace;
  kind: FlowerKind;
  label: string; // the skill's name and its stage, for a screen reader
  picked: boolean; // its card is open: it has just bounced
  onPick: (skillId: string) => void;
}

// One plant in a bed, as a button. The button is the plant's own square of soil (never smaller than a child's
// finger); the picture stands taller than the square and takes no touches, so the plant behind stays tappable.
export default function PlantButton({ plant, kind, label, picked, onPick }: Props) {
  const place = { '--set-x': plant.x - SLOT / 2, '--set-y': plant.y - SLOT, '--set-row': plant.row } as CSSProperties;
  return (
    <button
      type="button"
      className={styles.plant}
      style={place}
      aria-label={label}
      data-plant-button=""
      data-skill={plant.skillId}
      data-stage={plant.stage}
      data-droop={plant.droop ? '' : undefined}
      data-today={plant.today ? '' : undefined}
      data-picked={picked ? '' : undefined}
      onClick={() => onPick(plant.skillId)}
    >
      <span className={styles.picture}>
        <Plant stage={plant.stage} kind={kind} droop={plant.droop} visitor={(plant.col + plant.row) % 2 === 0 ? 'butterfly' : 'bee'} swayShift={((plant.col * 3 + plant.row * 5) % 10) / 10} />
      </span>
    </button>
  );
}
