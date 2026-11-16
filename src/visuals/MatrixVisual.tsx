import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import VisualView from './VisualView';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'matrix' }> };

// A 2 by 2 or 3 by 3 reasoning grid with one empty box.
export default function MatrixVisual({ visual }: Props) {
  const side = visual.cells.length > 4 ? styles.matrix3 : styles.matrix2;
  return (
    <div className={`${styles.matrix} ${side}`} role="img" aria-label={describeVisual(visual)} data-visual="matrix">
      {visual.cells.map((cell, i) => (
        <div key={i} className={styles.cell} data-cell={cell === 'blank' ? 'blank' : 'filled'}>
          {cell === 'blank' ? (
            <span className={styles.blank} style={{ fontSize: 'var(--text-xl)' }} aria-hidden="true">
              ?
            </span>
          ) : (
            <VisualView visual={cell} />
          )}
        </div>
      ))}
    </div>
  );
}
