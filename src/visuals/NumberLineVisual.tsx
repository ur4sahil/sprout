import { describeVisual } from '../engine/describe';
import type { Visual } from '../engine/types';
import { INK } from './geometry';
import styles from './visuals.module.css';

type Props = { visual: Extract<Visual, { kind: 'numberLine' }> };

// A number line with a dot on some numbers, and a blank box where a number is hidden.
export default function NumberLineVisual({ visual }: Props) {
  const count = Math.max(1, Math.round((visual.max - visual.min) / visual.step));
  const values = Array.from({ length: count + 1 }, (_, i) => visual.min + i * visual.step);
  const gap = values.some((value) => String(value).length > 2) ? 34 : 26;
  const width = count * gap + 40;
  const marked = new Set(visual.marked ?? []);
  const hidden = new Set(visual.hidden ?? []);
  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} 62`} width={width * 1.5} role="img" aria-label={describeVisual(visual)} data-visual="numberLine">
      <line x1="8" y1="24" x2={width - 8} y2="24" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      {values.map((value, i) => {
        const x = 20 + i * gap;
        return (
          <g key={value}>
            <line x1={x} y1="16" x2={x} y2="32" stroke={INK} strokeWidth="2" />
            {hidden.has(value) ? (
              <rect x={x - 9} y="38" width="18" height="18" rx="3" fill="#ffffff" stroke={INK} strokeWidth="1.5" strokeDasharray="3 2" data-hidden="" />
            ) : (
              <text x={x} y="52" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>
                {value}
              </text>
            )}
            {marked.has(value) && <circle cx={x} cy="24" r="6.5" fill="#E53935" stroke={INK} strokeWidth="1.5" data-dot="" />}
          </g>
        );
      })}
    </svg>
  );
}
