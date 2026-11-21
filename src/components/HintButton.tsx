import Icon from './Icon';
import styles from './HintButton.module.css';

interface Props {
  left: number; // hints still to use in this part
  open: boolean; // this question already had its hint: opening it again is free
  disabled: boolean;
  onOpen: () => void;
}

// The hint button (the owner's choice, Nov 21, 2026): a key and the number of hints left in this part.
export default function HintButton({ left, open, disabled, onOpen }: Props) {
  const label = open ? 'Hint again' : left === 0 ? 'No hints left' : `Hint, ${left} left`;
  return (
    <button type="button" className={styles.button} aria-label={label} disabled={disabled} onClick={onOpen} data-hints-left={left}>
      <span aria-hidden="true">
        <Icon name="hint" />
      </span>
      <span className={styles.left} aria-hidden="true">
        {left}
      </span>
    </button>
  );
}
