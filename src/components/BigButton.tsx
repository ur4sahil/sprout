import type { ButtonHTMLAttributes } from 'react';
import styles from './BigButton.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'form' | 'kid'; // kid buttons are at least 64px tall
  tone?: 'main' | 'quiet'; // quiet is an outlined second choice beside the main one
};

// The main button of a screen.
export default function BigButton({ size = 'form', tone = 'main', type = 'button', className, children, ...rest }: Props) {
  return (
    <button type={type} className={`${styles.button} ${size === 'kid' ? styles.kid : ''} ${tone === 'quiet' ? styles.quiet : ''} ${className ?? ''}`} data-tone={tone} {...rest}>
      {children}
    </button>
  );
}
