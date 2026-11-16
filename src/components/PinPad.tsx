import { useState } from 'react';
import type { ReactElement } from 'react';
import pad from '../items/items.module.css';

interface Props {
  length: number;
  disabled?: boolean;
  label: string; // what is being typed, for screen readers
  onComplete: (pin: string) => void; // called once all the digits are in. The pad then clears
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// A number pad for the grown-ups PIN. The digits typed are shown as dots.
export default function PinPad({ length, disabled, label, onComplete }: Props) {
  const [digits, setDigits] = useState('');

  function press(key: string): void {
    const next = digits + key;
    if (next.length >= length) {
      setDigits('');
      onComplete(next.slice(0, length));
    } else setDigits(next);
  }

  const key = (value: string): ReactElement => (
    <button key={value} type="button" className={`${pad.tile} ${pad.small} ${pad.key}`} disabled={disabled} onClick={() => press(value)}>
      {value}
    </button>
  );
  return (
    <div className={pad.column}>
      <output className={pad.display} aria-label={`${label}: ${digits.length} of ${length} digits`} data-pin-digits={digits.length}>
        {'•'.repeat(digits.length)}
      </output>
      <div className={pad.pad} role="group" aria-label="Number pad">
        {KEYS.map(key)}
        <button type="button" className={`${pad.tile} ${pad.small} ${pad.key}`} disabled={disabled || digits.length === 0} aria-label="Delete" onClick={() => setDigits(digits.slice(0, -1))}>
          ⌫
        </button>
        {key('0')}
      </div>
    </div>
  );
}
