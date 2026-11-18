import type { CSSProperties } from 'react';
import Character from '../cast/Character';
import type { Mood } from '../cast/moods';
import type { Who } from '../cast/types';
import { ACTOR_H, ACTOR_W, NO_CUE } from '../lessons/actor';
import type { ActorPose, HostCue } from '../lessons/actor';
import { PALETTE } from '../visuals/palette';
import type { HostMood } from './LessonHost';
import styles from './StageActor.module.css';

// The lesson host on the stage (plan section 16): it walks to what the lesson is about, reaches for it, and goes
// along with pieces as they move, so it looks like the one moving them. Its body is drawn behind the pieces and its
// arm in front. It glides at the pieces' own speed; reduced motion turns the gliding off.
// The host is the friend for the lesson's subject (game feel, phase 6): Sprout, Olive or Finn. Before a turn it
// looks out at the child and nods; when a count finishes it hops.

const MOODS: Record<HostMood, Mood> = { idle: 'idle', talking: 'talk', cheering: 'cheer' };

// The long reaching arm and its hand, in each friend's own colours.
const ARM: Record<Who, { arm: string; hand: string }> = {
  sprout: { arm: PALETTE.hostLeaf, hand: PALETTE.hostBody },
  pip: { arm: PALETTE.pipDark, hand: PALETTE.pipShell },
  olive: { arm: PALETTE.oliveDark, hand: PALETTE.oliveBody },
  finn: { arm: PALETTE.finnShade, hand: PALETTE.finnBody },
};

interface BodyProps {
  pose: ActorPose;
  mood: HostMood;
  who?: Who;
  cue?: HostCue;
}

export function ActorBody({ pose, mood, who = 'sprout', cue = NO_CUE }: BodyProps) {
  const place = { '--set-x': pose.left, '--set-y': pose.top, '--set-w': ACTOR_W, '--set-h': ACTOR_H } as CSSProperties;
  // Looking out at the child: eyes ahead (the talking pose has no sideways look), whatever it was doing. The mouth
  // moves only while the lesson is really speaking.
  const shown: Mood = cue.lookUp && mood === 'idle' ? 'talk' : MOODS[mood];
  return (
    <div
      className={styles.body}
      style={place}
      data-actor={pose.doing}
      data-faces={pose.faces}
      data-look-up={cue.lookUp ? '' : undefined}
      data-nod={cue.nod ? '' : undefined}
      data-hop={cue.hop ? '' : undefined}
      aria-hidden="true"
    >
      <div className={styles.hop}>
        <div className={styles.nod}>
          <Character who={who} mood={shown} talking={mood === 'talking'} className={styles.host} />
        </div>
      </div>
    </div>
  );
}

export function ActorArm({ pose, mood, who = 'sprout' }: { pose: ActorPose; mood: HostMood; who?: Who }) {
  // Cheering: the arm goes up.
  const cheering = mood === 'cheering';
  const angle = cheering ? (pose.faces === 'right' ? -70 : -110) : pose.angle;
  const place = {
    '--set-x': pose.shoulder.x,
    '--set-y': pose.shoulder.y,
    '--set-length': cheering ? 1 : pose.length,
    '--set-angle': `${angle}deg`,
    '--set-arm': ARM[who].arm,
    '--set-hand': ARM[who].hand,
  } as CSSProperties;
  return (
    <div className={styles.arm} style={place} data-actor-arm={cheering ? 'cheering' : pose.doing} aria-hidden="true">
      <span className={styles.hand} />
    </div>
  );
}
