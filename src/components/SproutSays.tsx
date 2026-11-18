import type { Mood } from '../cast';
import { Character } from '../cast';
import styles from './SproutSays.module.css';

interface Props {
  words: string; // shown in the bubble
  mood?: Mood;
  onHear: () => void; // tapped: say it aloud
}

// Sprout with a speech bubble: on home, over the plan cards, saying what is next. One tap says it aloud, for a
// child who cannot read yet.
export default function SproutSays({ words, mood = 'point', onHear }: Props) {
  return (
    <button type="button" className={styles.says} onClick={onHear} data-sprout-says="" aria-label={`${words} Hear it.`}>
      <span className={styles.sprout}>
        <Character who="sprout" mood={mood} />
      </span>
      <span className={styles.bubble}>{words}</span>
    </button>
  );
}
