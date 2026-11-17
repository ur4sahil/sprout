import Art from '../visuals/Art';
import Icon from './Icon';
import BigButton from './BigButton';
import CenterRow from './CenterRow';
import styles from './Celebration.module.css';

interface Props {
  answered: number;
  score: number; // the skill's score now, out of 100
  keepGoingLabel?: string; // "Next one" between the picks of a Play run
  onKeepGoing: () => void;
  onAllDone: () => void;
  // The games offered after a finished session. Pop is left out when the child has no skill it can draw on.
  games?: { onPop: (() => void) | null; onPairs: () => void };
}

// Between the picks of a Play run: the score so far, and on to the next one. It never says a skill
// is done: only a score of 100 does that.
export default function SoftBreak({ answered, score, keepGoingLabel = 'Keep going', onKeepGoing, onAllDone, games }: Props) {
  return (
    <div className={styles.cover} role="dialog" aria-modal="true" aria-label="Nice work!" data-break="">
      <div className={styles.emoji} aria-hidden="true">
        <Art emoji="🌱" />
      </div>
      <h2 className={styles.title}>Nice work!</h2>
      <p className={styles.line}>
        You answered {answered} questions. Score {score} of 100.
      </p>
      <BigButton size="kid" onClick={onKeepGoing}>
        <Icon name="next" />
        {keepGoingLabel}
      </BigButton>
      <BigButton size="kid" tone="quiet" onClick={onAllDone}>
        <Icon name="home" />Stop for now
      </BigButton>
      {games && (
        <CenterRow>
          {games.onPop && (
            <BigButton size="kid" tone="quiet" onClick={games.onPop}>
              <Icon name="balloon" />Play Pop
            </BigButton>
          )}
          <BigButton size="kid" tone="quiet" onClick={games.onPairs}>
            <Icon name="cards" />Play Pairs
          </BigButton>
        </CenterRow>
      )}
    </div>
  );
}
