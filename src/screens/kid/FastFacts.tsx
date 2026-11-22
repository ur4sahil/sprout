import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { recordsOf } from '../../app/facts';
import { useAppStore } from '../../app/store';
import { castFor } from '../../cast';
import BigButton from '../../components/BigButton';
import GameFriend from '../../components/GameFriend';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import type { FactRecord } from '../../engine/facts';
import { fluentShare, isFluent, openSets } from '../../engine/facts';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import styles from './FastFacts.module.css';
import page from './SubjectPage.module.css';

// /facts: the fact sets open to this child, each with a grid of its facts that fill with stars as they
// become fluent, and a button to race a round (plan section 15.5).
export default function FastFacts() {
  const navigate = useNavigate();
  const child = useAppStore((s) => s.child);
  const [records, setRecords] = useState<Map<string, FactRecord> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!child) return;
    let alive = true;
    void (async () => {
      try {
        const { repo } = await openRepo();
        const states = await repo.listFactStates(child.id);
        if (alive) setRecords(recordsOf(states));
      } catch (error) {
        logError(error);
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [child]);

  if (!child) return <Navigate to="/" replace />;
  const sets = openSets(child.grade, child.settings.factSets);
  if (sets.length === 0) return <Navigate to="/home" replace />;
  return (
    <KidScreen
      bar={
        <>
          <IconButton icon="home" label="Back to home" onClick={() => void navigate('/home', { replace: true })} />
          <h1 className={page.title}>
            <Icon name="bolt" />Fast facts
          </h1>
          <span className={styles.spacer} />
          <GameFriend who={castFor('math')} last={null} beat={0} />
        </>
      }
    >
      {failed && <Notice role="alert">Your fast facts could not be read. Close the app and open it again.</Notice>}
      {records &&
        sets.map((set) => {
          const fluent = set.facts.filter((fact) => isFluent(records.get(fact.id), fact.op)).length;
          return (
            <section key={set.id} className={styles.set} aria-label={set.name} data-fact-set={set.id}>
              <div className={styles.head}>
                <h2 className={page.heading}>{set.name}</h2>
                <span className={styles.count} data-fluent={fluent}>
                  <Icon name="star" />
                  {fluent} of {set.facts.length}
                </span>
              </div>
              <div className={styles.grid} role="img" aria-label={`${fluent} of ${set.facts.length} facts ${fluent === 1 ? 'is' : 'are'} fast. ${Math.round(fluentShare(set, records) * 100)}%`}>
                {set.facts.map((fact) => (
                  <span key={fact.id} className={`${styles.cell} ${isFluent(records.get(fact.id), fact.op) ? styles.fast : ''}`} data-fact={fact.id} />
                ))}
              </div>
              <BigButton size="kid" onClick={() => void navigate(`/facts/${set.id}`, { replace: true })}>
                <Icon name="flag" />
                Race
              </BigButton>
            </section>
          );
        })}
    </KidScreen>
  );
}
