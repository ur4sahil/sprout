import type { CSSProperties } from 'react';
import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'equation' }> };

const SIGNS: Record<string, string> = { '-': '−', '*': '×', x: '×' };

// How wide the line is, in letter heights: about 0.62 for each character, 1.35 for a blank box,
// and 0.35 for each gap. The style uses it to shrink a long line until it fits a narrow screen.
function widthInEms(parts: readonly (number | string)[]): number {
  const marks = parts.reduce<number>((sum, part) => sum + (part === 'blank' ? 1.35 : String(part).length * 0.62), 0);
  return Math.round((marks + (parts.length - 1) * 0.35) * 100) / 100;
}

// A number sentence on one line, such as 3 + □ = 7.
export default function EquationVisual({ visual }: Props) {
  const style = { '--ems': widthInEms(visual.parts) } as CSSProperties;
  return (
    <span className={styles.equation} style={style} role="img" aria-label={describeVisual(visual)} data-visual="equation">
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
