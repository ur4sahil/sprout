import type { FlowerKind, GrowthStage } from '../worlds/types';
import ScoreRing from './ScoreRing';
import styles from './StatusPanel.module.css';
import StatusPlant from './StatusPlant';

interface Props {
  answered: number; // questions answered in this sitting
  score: number;
  attempts: number;
  placedOut: boolean;
  seconds: number | null; // shown only when the parent turned the timer on
  // The skill's plant (game feel, phase 5): its flower and its stage now. Left out where the world has no garden.
  plant?: { kind: FlowerKind; stage: GrowthStage } | null;
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Beside the question: how many answered, the Skill Score in its stage colour, the skill's plant, and the time if
// the parent wants it.
export default function StatusPanel({ answered, score, attempts, placedOut, seconds, plant = null }: Props) {
  return (
    <>
      <div className={styles.block}>
        <span className={styles.label}>Skill Score</span>
        <ScoreRing score={score} attempts={attempts} placedOut={placedOut} />
      </div>
      {plant && <StatusPlant kind={plant.kind} stage={plant.stage} />}
      <div className={styles.block}>
        <span className={styles.label}>Questions</span>
        <span className={styles.value} data-answered="">
          {answered}
        </span>
      </div>
      {seconds !== null && (
        <div className={styles.block}>
          <span className={styles.label}>Time</span>
          <span className={styles.value} data-time="">
            {clock(seconds)}
          </span>
        </div>
      )}
    </>
  );
}
