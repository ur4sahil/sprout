import styles from './IconButton.module.css';

interface Props {
  icon: string; // one emoji or symbol
  label: string; // what a screen reader says
  onClick: () => void;
  disabled?: boolean;
}

// A round button that carries an icon, never text alone.
export default function IconButton({ icon, label, onClick, disabled = false }: Props) {
  return (
    <button type="button" className={styles.button} aria-label={label} disabled={disabled} onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
