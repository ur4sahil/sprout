import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasPass } from '../../app/pin';
import LinkButton from '../../components/LinkButton';
import Tabs from '../../components/Tabs';
import Gate from './Gate';
import styles from './Parent.module.css';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'scores', label: 'Scores' },
  { id: 'settings', label: 'Settings' },
  { id: 'data', label: 'Data' },
];

// Every grown-up screen sits inside this: the PIN gate first, then the page with its tabs.
export default function ParentArea({ page, title, children }: { page: string; title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const [, setPassed] = useState(0);
  if (!hasPass()) return <Gate onPass={() => setPassed((n) => n + 1)} onCancel={() => void navigate('/', { replace: true })} />;
  return (
    <main className={styles.area} data-parent-page={page}>
      <div className={styles.bar}>
        <h1 className={styles.heading}>{title}</h1>
        <LinkButton onClick={() => void navigate('/', { replace: true })}>Done</LinkButton>
      </div>
      <Tabs label="Grown-ups pages" tabs={PAGES} current={page} onPick={(id) => void navigate(`/parent/${id}`, { replace: true })} />
      {children}
    </main>
  );
}
