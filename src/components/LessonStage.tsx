import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { playSound } from '../audio/sounds';
import type { Who } from '../cast/types';
import { useStill } from '../cast/useStill';
import { WIDE, actorPose, cameraFor, countersLand } from '../lessons/actor';
import type { ActorPose, Camera, HostCue } from '../lessons/actor';
import type { Piece, Scene } from '../lessons/types';
import Art from '../visuals/Art';
import VisualView from '../visuals/VisualView';
import { currentWorld } from '../worlds';
import Icon from './Icon';
import type { HostMood } from './LessonHost';
import { ActorArm, ActorBody } from './StageActor';
import StageBackdrop from './StageBackdrop';
import styles from './LessonStage.module.css';

// The stage of a lesson (plan section 16). Each piece keeps its element from one scene to the next,
// so a change of place, size or highlight glides instead of jumping. Reduced motion turns the gliding off.
interface Props {
  scene: Scene;
  label: string; // what the scene shows, for a screen reader
  lively?: boolean; // pieces land with a little bounce
  actor?: HostMood; // the host stands on the stage and acts the scene out; the pointing hand is then its own
  who?: Who; // which friend the host is (Sprout when left out)
  cue?: HostCue; // a look, a nod or a hop for this moment
}

function look(piece: Piece): ReactNode {
  switch (piece.look.kind) {
    case 'art':
      return <Art emoji={piece.look.emoji} />;
    case 'numeral':
      return <span className={styles.word}>{piece.look.value}</span>;
    case 'text':
      return <span className={styles.word}>{piece.look.text}</span>;
    case 'rod':
      return (
        <span className={styles.rod}>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={styles.rodSquare} />
          ))}
        </span>
      );
    case 'cube':
      return <span className={styles.cube} />;
    case 'cell':
      return <span className={styles.cell} />;
    case 'box':
      return <span className={styles.box} />;
    case 'visual':
      return (
        <span className={styles.visual}>
          <VisualView visual={piece.look.visual} />
        </span>
      );
    case 'hand':
      return (
        <span className={styles.hand}>
          <Icon name="point" />
        </span>
      );
  }
}

export default function LessonStage({ scene, label, lively = false, actor, who, cue }: Props) {
  // The host's pose and the camera for this scene, worked out from the scene before it and kept until it changes.
  const [held, setHeld] = useState<{ scene: Scene; pose: ActorPose; camera: Camera }>(() => {
    const pose = actorPose(null, scene, null);
    return { scene, pose, camera: cameraFor(null, scene, pose) };
  });
  let { pose, camera } = held;
  if (held.scene !== scene) {
    pose = actorPose(held.scene, scene, held.pose.left);
    camera = cameraFor(held.scene, scene, pose);
    setHeld({ scene, pose, camera });
  }
  // Calm mode and Reduce Motion: the camera stays back and never moves.
  const still = useStill();
  if (still) camera = WIDE;

  // Counters clack as they land: one sound for the moment, however many land together.
  const landed = useRef<Scene | null>(null);
  useEffect(() => {
    const before = landed.current;
    landed.current = scene;
    if (countersLand(before, scene)) playSound(currentWorld().sounds.drop);
  }, [scene]);

  const stage = { '--set-cols': scene.cols, '--set-rows': scene.rows } as CSSProperties;
  const lens = { '--set-zoom': camera.zoom, '--set-pan-x': camera.x, '--set-pan-y': camera.y } as CSSProperties;
  const zoomed = camera.zoom > 1 ? '' : undefined;
  return (
    <div className={styles.stage} style={stage} role="img" aria-label={label} data-lesson-stage="" data-lively={lively ? '' : undefined} data-acted={actor ? '' : undefined}>
      {scene.backdrop && (
        <div className={styles.scenery}>
          <div className={styles.camera} style={lens} data-zoomed={zoomed}>
            <StageBackdrop place={scene.backdrop} cols={scene.cols} rows={scene.rows} />
          </div>
        </div>
      )}
      <div className={styles.camera} style={lens} data-camera={camera.zoom.toFixed(3)} data-zoomed={zoomed}>
        {actor && <ActorBody pose={pose} mood={actor} who={who} cue={cue} />}
        {scene.pieces.map((piece) => {
          const place = { '--set-x': piece.x, '--set-y': piece.y, '--set-w': piece.w ?? 1, '--set-h': piece.h ?? 1 } as CSSProperties;
          return (
            <div
              key={piece.id}
              className={styles.piece}
              style={place}
              data-piece={piece.id}
              data-kind={piece.look.kind}
              data-lit={piece.lit ? '' : undefined}
              data-dim={piece.dim ? '' : undefined}
              data-gone={piece.gone ? '' : undefined}
              data-crossed={piece.crossed ? '' : undefined}
            >
              {look(piece)}
              {piece.badge && <span className={styles.badge}>{piece.badge}</span>}
            </div>
          );
        })}
        {actor && <ActorArm pose={pose} mood={actor} who={who} />}
      </div>
    </div>
  );
}
