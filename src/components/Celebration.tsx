import { MILESTONE_WORDS } from '../audio/lines';
import Art from '../visuals/Art';
import Icon from './Icon';
import BigButton from './BigButton';
import CenterRow from './CenterRow';
import GrowthShow from './GrowthShow';
import type { GrowthInfo } from './GrowthShow';
import styles from './Celebration.module.css';

interface Props {
  milestone: number; // 50, 80, 90 or 100
  skillName: string;
  onDone: () => void;
  // At 100, the games are offered. Pop is left out when the child has no skill it can draw on.
  games?: { onPop: (() => void) | null; onPairs: () => void };
  // At the half-way milestone, a skill with a second lesson offers it: its harder questions start about here.
  onNextLesson?: () => void;
  // At 100, the sitting is over: the growth show plays first, with the plant in full bloom (game feel, phase 5).
  growth?: GrowthInfo | null;
  // At 100, the big button's words: "All done" when it ends the sitting, "Next one" when a run through today's plan goes
  // on to another part (the owner's choice, Nov 22, 2026).
  doneLabel?: string;
}


// A short full-screen celebration, the first time a milestone is crossed.
export default function Celebration({ milestone, skillName, onDone, games, onNextLesson, growth = null, doneLabel = 'All done' }: Props) {
  const words = MILESTONE_WORDS[milestone] ?? (MILESTONE_WORDS[50] as { emoji: string; title: string; line: string });
  const head = (
    <>
      <h2 className={styles.title}>{words.title}</h2>
      <p className={styles.line}>{words.line}</p>
      <p className={styles.skill}>{skillName}</p>
    </>
  );
  const buttons = (
    <>
      <BigButton size="kid" onClick={onDone}>
        <Icon name="next" />
        {milestone === 100 ? doneLabel : 'Keep going'}
      </BigButton>
      {onNextLesson && (
        <BigButton size="kid" tone="quiet" onClick={onNextLesson} data-next-lesson="">
          <Icon name="film" />
          Lesson, part 2
        </BigButton>
      )}
      {milestone === 100 && games && (
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
    </>
  );
  return (
    <div className={styles.cover} role="dialog" aria-modal="true" aria-label={words.title} data-celebration={milestone}>
      {milestone === 100 && growth ? (
        <GrowthShow info={growth} bloom head={head}>
          {buttons}
        </GrowthShow>
      ) : (
        <>
          <div className={styles.emoji} aria-hidden="true">
            <Art emoji={words.emoji} />
          </div>
          {head}
          {buttons}
        </>
      )}
    </div>
  );
}
