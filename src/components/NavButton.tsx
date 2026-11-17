import type { ButtonHTMLAttributes } from 'react';
import Icon, { type IconName } from './Icon';
import styles from './NavButton.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName; // a drawing from the app's own set
  label: string;
  marker?: 'math' | 'ela' | 'reasoning'; // a subject's own colour, as a thin bar at the start
};

// One place to go, in the menu beside the home screen: a picture and its name, left-aligned.
export default function NavButton({ icon, label, marker, className, ...rest }: Props) {
  return (
    <button type="button" className={`${styles.item} ${className ?? ''}`} data-marker={marker} {...rest}>
      <span className={styles.icon} aria-hidden="true">
        <Icon name={icon} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
