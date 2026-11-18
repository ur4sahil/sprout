import { useState } from 'react';
import { feelSound } from './itemFeel';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Type a number on an on-screen pad. The device keyboard never opens. Each key ticks and its digit drops into
// the box; when the answer is right the number glows.
export default function NumberPadItem({ question, disabled, onChange, right }: ItemProps<'numberPad'>) {
  const [digits, setDigits] = useState('');

  function update(next: string): void {
    setDigits(next);
    onChange(next.length > 0 ? { value: Number(next) } : null);
  }

  function press(key: string): void {
    if (digits.length >= question.maxDigits) return;
    feelSound('tick');
    // A leading zero is replaced, so "07" cannot be typed. Zero itself can.
    update(digits === '0' ? key : digits + key);
  }

  return (
    <div className={styles.column}>
      <output className={`${styles.display} ${right ? styles.glow : ''}`} aria-label="Your answer" data-display="" data-feel={right ? '' : undefined} data-glow={right ? '' : undefined}>
        {digits.split('').map((digit, place) => (
          // Keyed by place and digit, so only a digit that has just been typed drops in.
          <span key={`${place}${digit}`} className={styles.dropIn} data-feel="" data-digit="">
            {digit}
          </span>
        ))}
      </output>
      <div className={styles.pad} role="group" aria-label="Number pad">
        {KEYS.map((key) => (
          <button key={key} type="button" className={`${styles.tile} ${styles.small} ${styles.key}`} disabled={disabled} onClick={() => press(key)}>
            {key}
          </button>
        ))}
        <button type="button" className={`${styles.tile} ${styles.small} ${styles.key}`} disabled={disabled || digits.length === 0} aria-label="Delete" onClick={() => update(digits.slice(0, -1))}>
          ⌫
        </button>
        <button type="button" className={`${styles.tile} ${styles.small} ${styles.key}`} disabled={disabled} onClick={() => press('0')}>
          0
        </button>
      </div>
    </div>
  );
}
