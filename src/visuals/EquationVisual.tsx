import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'equation' }> };

const SIGNS: Record<string, string> = { '-': '−', '*': '×', x: '×' };

// A number sentence on one line, such as 3 + □ = 7.
export default function EquationVisual({ visual }: Props) {
  return (
    <span className={styles.equation} role="img" aria-label={describeVisual(visual)} data-visual="equation">
      {visual.parts.map((part, i) =>
        part === 'blank' ? (
          <span key={i} className={styles.blank} data-blank="" aria-hidden="true" />
        ) : (
          <span key={i} aria-hidden="true">
            {typeof part === 'string' ? (SIGNS[part] ?? part) : part}
          </span>
        ),
      )}
    </span>
  );
}
