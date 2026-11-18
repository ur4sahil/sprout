import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { actorPose } from '../lessons/actor';
import type { ActorPose } from '../lessons/actor';
import type { Piece, Scene } from '../lessons/types';
import Art from '../visuals/Art';
import VisualView from '../visuals/VisualView';
import { PALETTE } from '../visuals/palette';
import Icon from './Icon';
import type { HostMood } from './LessonHost';
import { ActorArm, ActorBody } from './StageActor';
import styles from './LessonStage.module.css';

// The stage of a lesson (plan section 16). Each piece keeps its element from one scene to the next,
// so a change of place, size or highlight glides instead of jumping. Reduced motion turns the gliding off.
interface Props {
  scene: Scene;
  label: string; // what the scene shows, for a screen reader
  lively?: boolean; // pieces land with a little bounce
  actor?: HostMood; // the host stands on the stage and acts the scene out; the pointing hand is then its own
}

// A wall with stripes and a wooden table whose top is at row 3, drawn in stage squares.
function Backdrop({ scene }: { scene: Scene }) {
  const { cols, rows } = scene;
  return (
    <svg className={styles.backdrop} viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="0" width={cols} height={rows} fill={PALETTE.wall} />
      {Array.from({ length: Math.ceil(cols / 1.2) }, (_, i) => (
        <rect key={i} x={i * 1.2} y="0" width="0.6" height="3" fill={PALETTE.wallStripe} />
      ))}
      <rect x="0.2" y="3" width={cols - 0.4} height="0.35" rx="0.08" fill={PALETTE.tableTop} />
      <rect x="0.3" y="3.35" width={cols - 0.6} height={rows - 3.35} fill={PALETTE.tableEdge} />
      <rect x="0.5" y="3.35" width={cols - 1} height="0.12" fill={PALETTE.tableLeg} opacity="0.5" />
    </svg>
  );
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

export default function LessonStage({ scene, label, lively = false, actor }: Props) {
  // The host's pose for this scene, worked out from the scene before it and kept until the scene changes.
  const [held, setHeld] = useState<{ scene: Scene; pose: ActorPose }>(() => ({ scene, pose: actorPose(null, scene, null) }));
  let pose = held.pose;
  if (held.scene !== scene) {
    pose = actorPose(held.scene, scene, held.pose.left);
    setHeld({ scene, pose });
  }
  const stage = { '--set-cols': scene.cols, '--set-rows': scene.rows } as CSSProperties;
  return (
    <div className={styles.stage} style={stage} role="img" aria-label={label} data-lesson-stage="" data-lively={lively ? '' : undefined} data-acted={actor ? '' : undefined}>
      {scene.backdrop === 'table' && <Backdrop scene={scene} />}
      {actor && <ActorBody pose={pose} mood={actor} />}
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
      {actor && <ActorArm pose={pose} mood={actor} />}
    </div>
  );
}
