import type { ButtonHTMLAttributes } from 'react';
import styles from './GameButton.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  // A balloon carries an answer in Pop and bobs in place. A card is turned over in Pairs.
  look: 'balloon' | 'card';
}

// The one button the games use. Its state is given through data attributes: data-picked and
// data-right on a balloon, data-up and data-matched on a card.
export default function GameButton({ look, children, ...rest }: Props) {
  return (
    <button type="button" className={look === 'balloon' ? styles.balloon : styles.card} {...rest}>
      {children}
    </button>
  );
}
