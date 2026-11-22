import Icon from './Icon';
import styles from './HintButton.module.css';

interface Props {
  left: number; // skips still to use in this Mixed bag
  disabled: boolean;
  onSkip: () => void;
}

// The Mixed bag's skip button (the owner's choice, Nov 22, 2026), beside the hint button and drawn like it: the skip
// arrow and the number left.
export default function SkipButton({ left, disabled, onSkip }: Props) {
  const label = left === 0 ? 'No skips left' : `Skip this question, ${left} left`;
  return (
    <button type="button" className={styles.button} aria-label={label} disabled={disabled || left === 0} onClick={onSkip} data-skips-left={left}>
      <span aria-hidden="true">
        <Icon name="skip" />
      </span>
      <span className={styles.left} aria-hidden="true">
        {left}
      </span>
    </button>
  );
}
