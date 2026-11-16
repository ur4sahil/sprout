import type { ButtonHTMLAttributes } from 'react';
import styles from './LinkButton.module.css';

// A quiet button that looks like a link. For grown-up screens only.
export default function LinkButton({ type = 'button', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={styles.link} {...rest}>
      {children}
    </button>
  );
}
