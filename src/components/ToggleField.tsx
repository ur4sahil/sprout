import styles from './ToggleField.module.css';

interface Props {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

// A labelled on-off switch. For grown-up screens.
export default function ToggleField({ label, hint, checked, onChange, disabled }: Props) {
  return (
    <label className={styles.field}>
      <span className={styles.words}>
        <span>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
