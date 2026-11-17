import type { Skill } from '../content/catalogue';
import type { Say } from '../engine/types';
import type { SkillState } from '../storage/schema';
import VisualView from '../visuals/VisualView';
import ScoreBar from './ScoreBar';
import styles from './SkillTile.module.css';

interface Props {
  skill: Skill;
  state: SkillState | undefined;
  note?: string; // a short line with the name, such as why it was picked
  band?: number; // which group of tiles it is in, 1 to 6
  look?: 'row' | 'tile'; // a slim row for a child who reads, a small picture tile for one who does not yet
  onOpen: () => void;
  onSpeak: (say: Say) => void;
}

// A skill to open: a small picture, its name, and its score as a thin bar.
// The speaker says its name, for a child who cannot read yet.
export default function SkillTile({ skill, state, note, band, look = 'row', onOpen, onSpeak }: Props) {
  const score = state?.score ?? 0;
  const bar = <ScoreBar score={score} attempts={state?.attempts ?? 0} placedOut={state?.placedOut ?? false} />;
  return (
    <div className={`${styles.tile} ${look === 'tile' ? styles.picture : styles.row}`} data-look={look} data-band={band ? ((band - 1) % 6) + 1 : undefined} data-skill={skill.id}>
      <button type="button" className={styles.open} aria-label={`${skill.name}. Score ${score}`} onClick={onOpen}>
        <span className={styles.icon}>
          <span className={styles.shrunk}>
            <VisualView visual={skill.icon} />
          </span>
        </span>
        <span className={styles.words}>
          <span className={styles.name}>{skill.name}</span>
          {look === 'row' && (
            <span className={styles.note}>
              <span>{skill.code}</span>
              {note && <span className={styles.why}>{note}</span>}
            </span>
          )}
        </span>
        {look === 'row' && bar}
      </button>
      <button type="button" className={styles.speaker} aria-label={`Hear the name: ${skill.name}`} onClick={() => onSpeak(skill.speakName)}>
        <span aria-hidden="true">🔊</span>
      </button>
      {/* On a picture tile the score sits beside the speaker, under the picture. */}
      {look === 'tile' && <span className={styles.foot}>{bar}</span>}
    </div>
  );
}
