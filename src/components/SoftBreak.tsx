import BigButton from './BigButton';
import styles from './Celebration.module.css';

interface Props {
  answered: number;
  onKeepGoing: () => void;
  onAllDone: () => void;
}

// After the child's session length: a soft break. There is no forced end.
export default function SoftBreak({ answered, onKeepGoing, onAllDone }: Props) {
  return (
    <div className={styles.cover} role="dialog" aria-modal="true" aria-label="Time for a break?" data-break="">
      <div className={styles.emoji} aria-hidden="true">
        🌱
      </div>
      <h2 className={styles.title}>Nice work!</h2>
      <p className={styles.line}>You answered {answered} questions.</p>
      <BigButton size="kid" onClick={onKeepGoing}>
        <span aria-hidden="true">➡️ </span>Keep going
      </BigButton>
      <BigButton size="kid" onClick={onAllDone}>
        <span aria-hidden="true">🏠 </span>All done
      </BigButton>
    </div>
  );
}
