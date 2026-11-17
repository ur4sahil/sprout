import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasPass } from '../../app/pin';
import BigButton from '../../components/BigButton';
import Tabs from '../../components/Tabs';
import Gate from './Gate';
import styles from './Parent.module.css';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'scores', label: 'Scores' },
  { id: 'trouble', label: 'Trouble spots' },
  { id: 'log', label: 'Question log' },
  { id: 'plans', label: 'Plans' },
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
      <header className={styles.head}>
        <div className={styles.bar}>
          <div className={styles.titles}>
            <span className={styles.eyebrow}>Grown-ups</span>
            <h1 className={styles.heading}>{title}</h1>
          </div>
          <BigButton tone="quiet" onClick={() => void navigate('/', { replace: true })}>
            Done
          </BigButton>
        </div>
        <Tabs look="strip" label="Grown-ups pages" tabs={PAGES} current={page} onPick={(id) => void navigate(`/parent/${id}`, { replace: true })} />
      </header>
      {children}
    </main>
  );
}
