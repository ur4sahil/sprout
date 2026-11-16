import ScoreRing from './ScoreRing';
import styles from './StatusPanel.module.css';

interface Props {
  answered: number; // questions answered in this sitting
  score: number;
  attempts: number;
  placedOut: boolean;
  seconds: number | null; // shown only when the parent turned the timer on
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Beside the question: how many answered, the Skill Score in its stage colour, and the time if the parent wants it.
export default function StatusPanel({ answered, score, attempts, placedOut, seconds }: Props) {
  return (
    <>
      <div className={styles.block}>
        <span className={styles.label}>Skill Score</span>
        <ScoreRing score={score} attempts={attempts} placedOut={placedOut} />
      </div>
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
