import styles from './SelectField.module.css';

interface Props {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onValue: (value: string) => void;
  disabled?: boolean;
}

// A labelled choice from a short list. For grown-up screens.
export default function SelectField({ label, value, options, onValue, disabled }: Props) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onValue(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
