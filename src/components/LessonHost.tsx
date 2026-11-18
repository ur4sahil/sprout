import Character from '../cast/Character';
import type { Mood } from '../cast/moods';
import styles from './LessonHost.module.css';

// The lesson host (plan section 16): Sprout, who stands beside the scene. It breathes and blinks while idle,
// moves its mouth while the lesson speaks, and hops when a child gets a turn right.
// Sprout is drawn by the cast now (plan section 19); this keeps the three moods the lesson stage asks for.
export type HostMood = 'idle' | 'talking' | 'cheering';

const MOODS: Record<HostMood, Mood> = { idle: 'idle', talking: 'talk', cheering: 'cheer' };

export default function LessonHost({ mood }: { mood: HostMood }) {
  return <Character who="sprout" mood={MOODS[mood]} className={styles.host} />;
}
