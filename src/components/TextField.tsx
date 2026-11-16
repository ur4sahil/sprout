import type { InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string;
  value: string;
  onValue: (value: string) => void;
};

// A labelled text box. Its text is 16px or more, so an iPad does not zoom in when it is tapped.
export default function TextField({ label, value, onValue, ...rest }: Props) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onValue(event.target.value)} {...rest} />
    </label>
  );
}
