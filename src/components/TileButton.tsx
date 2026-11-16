import type { ReactNode } from 'react';
import styles from './TileButton.module.css';

interface Props {
  label: string; // what a screen reader says
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

// A big square button with a picture in it: a child's avatar, or a skill.
export default function TileButton({ label, onClick, selected = false, disabled = false, children }: Props) {
  return (
    <button type="button" className={`${styles.tile} ${selected ? styles.selected : ''}`} aria-label={label} aria-pressed={selected} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
