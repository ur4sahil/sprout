import type { Stage } from '../engine/skillscore';
import { stageOf } from '../engine/skillscore';
import styles from './ScoreRing.module.css';

interface Props {
  score: number;
  attempts: number;
  placedOut?: boolean;
  small?: boolean;
}

// The six stage colours are defined once, in tokens.css.
export const STAGE_COLOR: Record<Stage, string> = {
  notStarted: 'var(--stage-not-started)',
  gettingStarted: 'var(--stage-getting-started)',
  practising: 'var(--stage-practising)',
  proficient: 'var(--stage-proficient)',
  challenge: 'var(--stage-challenge)',
  mastered: 'var(--stage-mastered)',
};

export const STAGE_NAME: Record<Stage, string> = {
  notStarted: 'Not started',
  gettingStarted: 'Getting started',
  practising: 'Practising',
  proficient: 'Proficient',
  challenge: 'Challenge zone',
  mastered: 'Mastered',
};

const R = 42;
const AROUND = 2 * Math.PI * R;

// The Skill Score as a ring that fills, in its stage colour, with the number in the middle.
export default function ScoreRing({ score, attempts, placedOut = false, small = false }: Props) {
  const stage = stageOf(score, attempts, placedOut);
  return (
    <svg
      className={`${styles.ring} ${small ? styles.small : ''}`}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Skill Score ${score} out of 100. ${STAGE_NAME[stage]}`}
      data-stage={stage}
      data-score={score}
    >
      <circle cx="50" cy="50" r={R} className={styles.track} />
      {/* An empty ring draws no arc at all: a zero-length arc with round ends would show as a dot. */}
      {score > 0 && <circle cx="50" cy="50" r={R} className={styles.fill} style={{ stroke: STAGE_COLOR[stage], strokeDasharray: `${(score / 100) * AROUND} ${AROUND}` }} transform="rotate(-90 50 50)" />}
      <text x="50" y="50" className={styles.number} textAnchor="middle" dominantBaseline="central">
        {stage === 'mastered' ? '🏅' : score}
      </text>
    </svg>
  );
}
