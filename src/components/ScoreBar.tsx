import { stageOf } from '../engine/skillscore';
import styles from './ScoreBar.module.css';
import { STAGE_COLOR, STAGE_NAME } from './ScoreRing';

interface Props {
  score: number;
  attempts: number;
  placedOut?: boolean;
}

// The Skill Score as a thin bar in its stage colour with the number beside it. A skill not yet tried says "New".
export default function ScoreBar({ score, attempts, placedOut = false }: Props) {
  const stage = stageOf(score, attempts, placedOut);
  return (
    <span className={styles.bar} role="img" aria-label={`Skill Score ${score} out of 100. ${STAGE_NAME[stage]}`} data-stage={stage} data-score={score}>
      <span className={styles.track}>
        <span className={styles.fill} style={{ width: `${score}%`, background: STAGE_COLOR[stage] }} />
      </span>
      <span className={`${styles.number} ${stage === 'mastered' ? styles.mastered : ''} ${stage === 'notStarted' ? styles.fresh : ''}`}>{stage === 'notStarted' ? 'New' : score}</span>
    </span>
  );
}
