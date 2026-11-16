import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import VisualView from './VisualView';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'sequence' }> };

// A row of pictures with a missing slot, for patterns.
export default function SequenceVisual({ visual }: Props) {
  return (
    <div className={styles.line} role="img" aria-label={describeVisual(visual)} data-visual="sequence">
      {visual.items.map((item, i) =>
        item === 'blank' ? (
          <span key={i} className={styles.blank} style={{ fontSize: 'var(--text-xxl)' }} data-blank="" aria-hidden="true">
            ?
          </span>
        ) : (
          <VisualView key={i} visual={item} />
        ),
      )}
    </div>
  );
}
