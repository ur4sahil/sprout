import { useState } from 'react';
import type { ItemProps } from './itemProps';
import styles from './items.module.css';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

// A sum written in columns. The child picks a box (the ones box first) and types its digit; the box to its
// left is picked next. The small boxes above are for carried or borrowed ones: a tap writes or clears a 1.
// Only the answer row is marked.
export default function ColumnSumItem({ question, disabled, onChange }: ItemProps<'columnSum'>) {
  const width = Math.max(String(question.top).length, String(question.bottom).length, String(question.answer).length) + (question.op === '+' ? 1 : 0);
  const [digits, setDigits] = useState<string[]>(Array.from({ length: width }, () => ''));
  const [carry, setCarry] = useState<boolean[]>(Array.from({ length: width }, () => false));
  const [at, setAt] = useState(width - 1);
  const padded = (n: number): string[] => String(n).padStart(width, ' ').split('');

  function report(next: string[]): void {
    // The digits must sit together from the right: no gap between them.
    const text = next.join('');
    const trimmed = text.replace(/^ +/, '');
    const filled = next.map((digit) => digit !== '');
    const first = filled.indexOf(true);
    const whole = first !== -1 && filled.slice(first).every(Boolean);
    onChange(whole ? { value: Number(next.slice(first).join('')) } : trimmed.length === 0 ? null : null);
  }

  function type(key: string): void {
    const next = digits.map((digit, i) => (i === at ? key : digit));
    setDigits(next);
    report(next);
    if (at > 0) setAt(at - 1);
  }

  function clear(): void {
    const next = digits.map((digit, i) => (i === at ? '' : digit));
    setDigits(next);
    report(next);
  }

  const sign = question.op === '+' ? '+' : '−';
  return (
    <div className={styles.column}>
      <div className={styles.sum} style={{ gridTemplateColumns: `repeat(${width + 1}, auto)` }} data-column-sum={digits.join('|')}>
        <span />
        {carry.map((on, i) => (
          <button
            key={`c${i}`}
            type="button"
            className={`${styles.carry} ${on ? styles.picked : ''}`}
            aria-label={`${question.op === '+' ? 'Carry' : 'Borrow'} mark, column ${width - i}`}
            aria-pressed={on}
            disabled={disabled || i === width - 1}
            onClick={() => setCarry(carry.map((each, j) => (j === i ? !each : each)))}
          >
            {on ? '1' : ''}
          </button>
        ))}
        <span />
        {padded(question.top).map((digit, i) => (
          <span key={`t${i}`} className={styles.sumDigit}>
            {digit.trim()}
          </span>
        ))}
        <span className={styles.sumDigit}>{sign}</span>
        {padded(question.bottom).map((digit, i) => (
          <span key={`b${i}`} className={`${styles.sumDigit} ${styles.sumBottom}`}>
            {digit.trim()}
          </span>
        ))}
        <span />
        {digits.map((digit, i) => (
          <button key={`a${i}`} type="button" className={`${styles.tile} ${styles.small} ${styles.sumBox} ${i === at ? styles.picked : ''}`} aria-label={`Answer, column ${width - i}${digit ? `: ${digit}` : ''}`} aria-pressed={i === at} disabled={disabled} onClick={() => setAt(i)} data-box={i}>
            {digit}
          </button>
        ))}
      </div>
      <div className={styles.pad} role="group" aria-label="Number pad">
        {KEYS.map((key) => (
          <button key={key} type="button" className={`${styles.tile} ${styles.small} ${styles.key}`} disabled={disabled} onClick={() => type(key)}>
            {key}
          </button>
        ))}
        <button type="button" className={`${styles.tile} ${styles.small} ${styles.key}`} disabled={disabled || digits[at] === ''} aria-label="Delete" onClick={clear}>
          ⌫
        </button>
      </div>
    </div>
  );
}
