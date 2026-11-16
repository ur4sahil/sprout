import BigButton from './BigButton';
import CenterRow from './CenterRow';
import styles from './Celebration.module.css';

interface Props {
  milestone: number; // 50, 80, 90 or 100
  skillName: string;
  onDone: () => void;
  // At 100, the games are offered. Pop is left out when the child has no skill it can draw on.
  games?: { onPop: (() => void) | null; onPairs: () => void };
}

export const MILESTONE_WORDS: Record<number, { emoji: string; title: string; line: string }> = {
  50: { emoji: '⭐', title: 'Halfway there!', line: 'You are halfway to mastering this skill.' },
  80: { emoji: '🎗️', title: 'Proficient!', line: 'You earned a ribbon.' },
  90: { emoji: '🔥', title: 'Challenge zone!', line: 'These are the hardest questions. You are ready.' },
  100: { emoji: '🏅', title: 'Mastered!', line: 'You earned a medal.' },
};

// A short full-screen celebration, the first time a milestone is crossed.
export default function Celebration({ milestone, skillName, onDone, games }: Props) {
  const words = MILESTONE_WORDS[milestone] ?? (MILESTONE_WORDS[50] as { emoji: string; title: string; line: string });
  return (
    <div className={styles.cover} role="dialog" aria-modal="true" aria-label={words.title} data-celebration={milestone}>
      <div className={styles.emoji} aria-hidden="true">
        {words.emoji}
      </div>
      <h2 className={styles.title}>{words.title}</h2>
      <p className={styles.line}>{words.line}</p>
      <p className={styles.skill}>{skillName}</p>
      <BigButton size="kid" onClick={onDone}>
        <span aria-hidden="true">➡️ </span>
        {milestone === 100 ? 'All done' : 'Keep going'}
      </BigButton>
      {milestone === 100 && games && (
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
