import { polar } from '../visuals/geometry';
import styles from './GoalRing.module.css';

interface Props {
  done: number; // questions answered today
  goal: number; // the daily goal
}

const MOST_STARS = 20;

// The daily goal as a ring of stars. One lights up for each share of the goal that is done.
export default function GoalRing({ done, goal }: Props) {
  const stars = Math.min(Math.max(goal, 1), MOST_STARS);
  const lit = Math.min(stars, Math.floor((Math.min(done, goal) / Math.max(goal, 1)) * stars));
  const reached = done >= goal;
  return (
    <svg className={styles.ring} viewBox="0 0 100 100" role="img" aria-label={reached ? `Daily goal reached: ${done} questions today` : `${done} of ${goal} questions today`} data-goal-done={Math.min(done, goal)} data-goal={goal}>
      {Array.from({ length: stars }, (_, i) => {
        const at = polar(50, 50, 40, (360 / stars) * i);
        return (
          <text key={i} x={at.x} y={at.y} className={i < lit ? styles.lit : styles.unlit} textAnchor="middle" dominantBaseline="central" data-star={i < lit ? 'lit' : 'unlit'}>
            ★
          </text>
        );
      })}
      <text x="50" y="50" className={styles.number} textAnchor="middle" dominantBaseline="central">
        {reached ? '🎉' : done}
      </text>
    </svg>
  );
}
