import type { ReactNode } from 'react';
import styles from './Notice.module.css';

interface Props {
  role: 'alert' | 'status'; // alert: something the reader must act on. status: something to know
  banner?: boolean; // a strip across the top of the app
  children: ReactNode;
}

// A short message in a tinted box.
export default function Notice({ role, banner = false, children }: Props) {
  return (
    <p className={`${styles.notice} ${banner ? styles.banner : ''}`} role={role}>
      {children}
    </p>
  );
}
