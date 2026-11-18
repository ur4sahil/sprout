import type { CSSProperties, ReactNode } from 'react';
import type { Piece, Scene } from '../lessons/types';
import Art from '../visuals/Art';
import Icon from './Icon';
import styles from './LessonStage.module.css';

// The stage of a lesson (plan section 16). Each piece keeps its element from one scene to the next,
// so a change of place, size or highlight glides instead of jumping. Reduced motion turns the gliding off.
interface Props {
  scene: Scene;
  label: string; // what the scene shows, for a screen reader
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
    case 'hand':
      return (
        <span className={styles.hand}>
          <Icon name="point" />
        </span>
      );
  }
}

export default function LessonStage({ scene, label }: Props) {
  const stage = { '--set-cols': scene.cols, '--set-rows': scene.rows } as CSSProperties;
  return (
    <div className={styles.stage} style={stage} role="img" aria-label={label} data-lesson-stage="">
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
    </div>
  );
}
