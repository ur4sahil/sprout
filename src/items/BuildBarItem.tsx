import { useState } from 'react';
import Icon from '../components/Icon';
import Art from '../visuals/Art';
import { PALETTE } from '../visuals/palette';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

// Make a bar graph: one row for each thing, with buttons to raise or lower its bar by one step of the scale.
export default function BuildBarItem({ question, disabled, onChange }: ItemProps<'buildBar'>) {
  const scale = question.scale ?? 1;
  const steps = question.max / scale;
  const [values, setValues] = useState<number[]>(question.categories.map(() => 0));

  function change(index: number, by: number): void {
    const next = values.map((value, i) => (i === index ? Math.min(Math.max(value + by * scale, 0), question.max) : value));
    setValues(next);
    onChange(next.some((value) => value > 0) ? { values: next } : null);
  }

  return (
    <div className={styles.column}>
      <div className={styles.barRows} role="group" aria-label="Bar graph">
        {question.categories.map((category, index) => {
          const value = values[index] ?? 0;
          return (
            <div key={category.label} className={styles.barRow} data-bar={index} data-value={value}>
              <span className={styles.barName}>
                <Art emoji={category.emoji} /> {category.label}
              </span>
              <button type="button" className={`${styles.tile} ${styles.small}`} aria-label={`${category.label}: lower`} disabled={disabled || value === 0} onClick={() => change(index, -1)}>
                <Icon name="minus" />
              </button>
              <svg className={styles.barTrack} viewBox={`0 0 ${steps * 20} 24`} preserveAspectRatio="none" role="img" aria-label={`${category.label}: ${value}`}>
                {Array.from({ length: steps }, (_, i) => (
                  <rect key={i} x={i * 20 + 1} y="2" width="18" height="20" rx="3" fill={i < value / scale ? (PALETTE.bars[index % PALETTE.bars.length] as string) : PALETTE.paper} stroke={PALETTE.ink} strokeWidth="1" />
                ))}
              </svg>
              <button type="button" className={`${styles.tile} ${styles.small}`} aria-label={`${category.label}: raise`} disabled={disabled || value === question.max} onClick={() => change(index, 1)}>
                <Icon name="plus" />
              </button>
            </div>
          );
        })}
      </div>
      {scale > 1 && <p className={styles.barKey}>Each block is {scale}.</p>}
    </div>
  );
}
