import type { ButtonHTMLAttributes } from 'react';
import styles from './BigButton.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'form' | 'kid'; // kid buttons are at least 64px tall
};

// The main button of a screen.
export default function BigButton({ size = 'form', type = 'button', className, children, ...rest }: Props) {
  return (
    <button type={type} className={`${styles.button} ${size === 'kid' ? styles.kid : ''} ${className ?? ''}`} {...rest}>
      {children}
    </button>
  );
}
