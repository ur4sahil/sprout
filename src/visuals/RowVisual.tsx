import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import VisualView from './VisualView';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'row' }> };

// Lays pictures side by side.
export default function RowVisual({ visual }: Props) {
  return (
    <div className={styles.line} role="img" aria-label={describeVisual(visual)} data-visual="row">
      {visual.children.map((child, i) => (
        <VisualView key={i} visual={child} />
      ))}
    </div>
  );
}
