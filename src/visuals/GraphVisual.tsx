import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'graph' }> };

const BAR = ['#1E88E5', '#FB8C00', '#43A047', '#8E24AA', '#E53935'];

// A simple picture graph or bar graph, one row for each category.
export default function GraphVisual({ visual }: Props) {
  const most = Math.max(1, ...visual.categories.map((category) => category.value));
  return (
    <div className={styles.graph} role="img" aria-label={describeVisual(visual)} data-visual="graph">
      {visual.categories.map((category, row) => (
        <div key={category.label} style={{ display: 'contents' }}>
          <span className={styles.graphLabel} aria-hidden="true">
            {category.emoji} {category.label}
          </span>
          {visual.type === 'picture' ? (
            <span className={styles.graphRow} aria-hidden="true" data-row={category.label}>
              {Array.from({ length: category.value }, (_, i) => (
                <span key={i} data-mark="">
                  {category.emoji}
                </span>
              ))}
            </span>
          ) : (
            <svg className={styles.svg} viewBox={`0 0 ${most * 26 + 14} 30`} width={(most * 26 + 14) * 1.3} aria-hidden="true" data-row={category.label}>
              <line x1="2" y1="0" x2="2" y2="30" stroke={INK} strokeWidth="3" />
              <rect x="3" y="5" width={category.value * 26} height="20" fill={BAR[row % BAR.length]} stroke={INK} strokeWidth="1.5" data-bar={category.value} />
              {Array.from({ length: most }, (_, i) => (
                <line key={i} x1={3 + (i + 1) * 26} y1="2" x2={3 + (i + 1) * 26} y2="28" stroke={INK} strokeWidth="0.6" opacity="0.45" />
              ))}
            </svg>
          )}
        </div>
      ))}
      {visual.type === 'bar' && (
        <>
          <span />
          <svg className={styles.svg} viewBox={`0 0 ${most * 26 + 14} 16`} width={(most * 26 + 14) * 1.3} aria-hidden="true">
            {Array.from({ length: most + 1 }, (_, i) => (
              <text key={i} x={3 + i * 26} y="12" textAnchor="middle" fontSize="11" fontWeight="700" fill={INK}>
                {i}
              </text>
            ))}
          </svg>
        </>
      )}
    </div>
  );
}
