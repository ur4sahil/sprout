import type { Skill } from '../content/catalogue';
import type { Say } from '../engine/types';
import type { SkillState } from '../storage/schema';
import VisualView from '../visuals/VisualView';
import ScoreRing from './ScoreRing';
import styles from './SkillTile.module.css';

interface Props {
  skill: Skill;
  state: SkillState | undefined;
  note?: string; // a short line under the name, such as why it was picked
  band?: number; // which group of tiles it is in, 1 to 6
  onOpen: () => void;
  onSpeak: (say: Say) => void;
}

// A skill as a picture tile: its icon, its score ring and its name in small text.
// The speaker corner says its name, for a child who cannot read yet.
export default function SkillTile({ skill, state, note, band, onOpen, onSpeak }: Props) {
  const score = state?.score ?? 0;
  return (
    <div className={styles.tile} data-band={band ? ((band - 1) % 6) + 1 : undefined} data-skill={skill.id}>
      <button type="button" className={styles.open} aria-label={`${skill.name}. Score ${score}`} onClick={onOpen}>
        <span className={styles.icon}>
          <VisualView visual={skill.icon} />
        </span>
        <ScoreRing small score={score} attempts={state?.attempts ?? 0} placedOut={state?.placedOut ?? false} />
        <span className={styles.name}>{skill.name}</span>
        {note && <span className={styles.note}>{note}</span>}
      </button>
      <button type="button" className={styles.speaker} aria-label={`Hear the name: ${skill.name}`} onClick={() => onSpeak(skill.speakName)}>
        <span aria-hidden="true">🔊</span>
      </button>
    </div>
  );
}
