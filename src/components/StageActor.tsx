import type { CSSProperties } from 'react';
import { ACTOR_H, ACTOR_W } from '../lessons/actor';
import type { ActorPose } from '../lessons/actor';
import type { HostMood } from './LessonHost';
import LessonHost from './LessonHost';
import styles from './StageActor.module.css';

// The lesson host on the stage (plan section 16): it walks to what the lesson is about, reaches for it, and goes
// along with pieces as they move, so it looks like the one moving them. Its body is drawn behind the pieces and its
// arm in front. It glides at the pieces' own speed; reduced motion turns the gliding off.
export function ActorBody({ pose, mood }: { pose: ActorPose; mood: HostMood }) {
  const place = { '--set-x': pose.left, '--set-y': pose.top, '--set-w': ACTOR_W, '--set-h': ACTOR_H } as CSSProperties;
  return (
    <div className={styles.body} style={place} data-actor={pose.doing} data-faces={pose.faces} aria-hidden="true">
      <LessonHost mood={mood} />
    </div>
  );
}

export function ActorArm({ pose, mood }: { pose: ActorPose; mood: HostMood }) {
  // Cheering: the arm goes up.
  const cheering = mood === 'cheering';
  const angle = cheering ? (pose.faces === 'right' ? -70 : -110) : pose.angle;
  const place = { '--set-x': pose.shoulder.x, '--set-y': pose.shoulder.y, '--set-length': cheering ? 1 : pose.length, '--set-angle': `${angle}deg` } as CSSProperties;
  return (
    <div className={styles.arm} style={place} data-actor-arm={cheering ? 'cheering' : pose.doing} aria-hidden="true">
      <span className={styles.hand} />
    </div>
  );
}
