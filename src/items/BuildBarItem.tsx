import { useState } from 'react';
import Icon from '../components/Icon';
import Art from '../visuals/Art';
import { PALETTE } from '../visuals/palette';
import { feelSound, turn } from './itemFeel';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

// Make a bar graph: one row for each thing, with buttons to raise or lower its bar by one step of the scale.
// With a title, the graph says what was counted above its rows, as a graph picture does.
// A bar rises with a pop that climbs in pitch as it grows. When the answer is right the bars wave one after
// another, the tallest last.
export default function BuildBarItem({ question, disabled, onChange, right }: ItemProps<'buildBar'>) {
  const scale = question.scale ?? 1;
  const steps = question.max / scale;
  const [values, setValues] = useState<number[]>(question.categories.map(() => 0));

  function change(index: number, by: number): void {
    const next = values.map((value, i) => (i === index ? Math.min(Math.max(value + by * scale, 0), question.max) : value));
    if (by > 0) feelSound('pop', (next[index] ?? 0) / scale - 1);
    setValues(next);
    onChange(next.some((value) => value > 0) ? { values: next } : null);
  }

  return (
    <div className={styles.column}>
      {question.title && (
        <p className={styles.barTitle} data-title="">
          {question.title}
        </p>
      )}
      <div className={styles.barRows} role="group" aria-label={question.title ? `Bar graph: ${question.title}` : 'Bar graph'}>
        {question.categories.map((category, index) => {
          const value = values[index] ?? 0;
          // This bar's turn in the wave: how many bars are shorter, with earlier rows first among equals.
          const wave = values.filter((other, i) => other < value || (other === value && i < index)).length;
          return (
            <div key={category.label} className={styles.barRow} data-bar={index} data-value={value}>
              <span className={styles.barName}>
                <Art emoji={category.emoji} /> {category.label}
              </span>
              <button type="button" className={`${styles.tile} ${styles.small}`} aria-label={`${category.label}: lower`} disabled={disabled || value === 0} onClick={() => change(index, -1)}>
                <Icon name="minus" />
              </button>
              <svg className={`${styles.barTrack} ${right ? styles.barWave : ''}`} style={right ? turn(wave) : undefined} data-feel={right ? '' : undefined} data-wave={right ? wave + 1 : undefined} viewBox={`0 0 ${steps * 20} 24`} preserveAspectRatio="none" role="img" aria-label={`${category.label}: ${value}`}>
                {Array.from({ length: steps }, (_, i) => (
                  <rect key={i} className={i < value / scale ? styles.barBlockOn : undefined} data-feel={i < value / scale ? '' : undefined} x={i * 20 + 1} y="2" width="18" height="20" rx="3" fill={i < value / scale ? (PALETTE.bars[index % PALETTE.bars.length] as string) : PALETTE.paper} stroke={PALETTE.ink} strokeWidth="1" />
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
