import Art from '../visuals/Art';
import { useId } from 'react';
import styles from './ProfileCard.module.css';

interface Props {
  name: string;
  avatar: string;
  grade: string; // "Grade 1"
  done: number; // questions answered today
  goal: number; // the daily goal
  onClick: () => void;
}

// One child on the profile page: who they are, their grade, and how far along today's goal is.
// A screen reader says the name as the button, then the grade and the progress as its description.
export default function ProfileCard({ name, avatar, grade, done, goal, onClick }: Props) {
  const about = useId();
  const reached = done >= goal;
  const share = Math.round((Math.min(done, goal) / Math.max(goal, 1)) * 100);
  return (
    <button type="button" className={styles.card} aria-label={name} aria-describedby={about} data-profile={name} onClick={onClick}>
      <span className={styles.avatar} aria-hidden="true">
        <Art emoji={avatar} />
      </span>
      <span className={styles.name} aria-hidden="true">
        {name}
      </span>
      <span className={styles.grade} aria-hidden="true">
        {grade}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} data-reached={reached ? '' : undefined} style={{ inlineSize: `${share}%` }} />
      </span>
      <span className={styles.today} aria-hidden="true" data-today={done}>
        {reached ? `🎉 ${done} today` : `${done} of ${goal} today`}
      </span>
      <span id={about} className={styles.hidden}>
        {grade}. {reached ? `Daily goal reached: ${done} questions today.` : `${done} of ${goal} questions today.`}
      </span>
    </button>
  );
}

// The last card in the grid: a grown-up adds a child.
export function AddProfileCard({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={`${styles.card} ${styles.add}`} aria-label="Add a child" data-profile-add="" onClick={onClick}>
      <span className={styles.plus} aria-hidden="true">
        ＋
      </span>
      <span className={styles.name} aria-hidden="true">
        Add a child
      </span>
    </button>
  );
}
