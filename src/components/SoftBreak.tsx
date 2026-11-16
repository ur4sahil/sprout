import BigButton from './BigButton';
import CenterRow from './CenterRow';
import styles from './Celebration.module.css';

interface Props {
  answered: number;
  keepGoingLabel?: string; // "Next one" between the picks of a Play run
  onKeepGoing: () => void;
  onAllDone: () => void;
  // The games offered after a finished session. Pop is left out when the child has no skill it can draw on.
  games?: { onPop: (() => void) | null; onPairs: () => void };
}

// After the child's session length: a soft break. There is no forced end.
export default function SoftBreak({ answered, keepGoingLabel = 'Keep going', onKeepGoing, onAllDone, games }: Props) {
  return (
    <div className={styles.cover} role="dialog" aria-modal="true" aria-label="Time for a break?" data-break="">
      <div className={styles.emoji} aria-hidden="true">
        🌱
      </div>
      <h2 className={styles.title}>Nice work!</h2>
      <p className={styles.line}>You answered {answered} questions.</p>
      <BigButton size="kid" onClick={onKeepGoing}>
        <span aria-hidden="true">➡️ </span>
        {keepGoingLabel}
      </BigButton>
      <BigButton size="kid" onClick={onAllDone}>
        <span aria-hidden="true">🏠 </span>All done
      </BigButton>
      {games && (
        <CenterRow>
          {games.onPop && (
            <BigButton size="kid" onClick={games.onPop}>
              <span aria-hidden="true">🎈 </span>Play Pop
            </BigButton>
          )}
          <BigButton size="kid" onClick={games.onPairs}>
            <span aria-hidden="true">🃏 </span>Play Pairs
          </BigButton>
        </CenterRow>
      )}
    </div>
  );
}
