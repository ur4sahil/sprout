import Art from './Art';
import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'array' }> };

// Objects in equal rows, for repeated addition.
export default function ArrayVisual({ visual }: Props) {
  return (
    <div className={styles.arrayGrid} style={{ gridTemplateColumns: `repeat(${visual.cols}, auto)` }} role="img" aria-label={describeVisual(visual)} data-visual="array">
      {Array.from({ length: visual.rows * visual.cols }, (_, i) => (
        <span key={i} aria-hidden="true" data-item="object">
          <Art emoji={visual.emoji} />
        </span>
      ))}
    </div>
  );
}
