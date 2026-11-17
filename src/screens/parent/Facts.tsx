import { useEffect, useState } from 'react';
import { factText, recordsOf } from '../../app/facts';
import BigButton from '../../components/BigButton';
import Notice from '../../components/Notice';
import Tabs from '../../components/Tabs';
import type { FactRecord } from '../../engine/facts';
import { FACT_SETS, fluentShare, isFluent, openSets, troubleFacts } from '../../engine/facts';
import { gradeRank } from '../../engine/grades';
import { nowIso } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';
import { useChildren } from './useChildren';

const GRADE_WORD: Record<string, string> = { '1': 'grade 1', '2': 'grade 2', '3': 'grade 3' };

// Fast facts for grown-ups (plan section 15.5): for each set, how much is fluent, the grid, and the facts
// that are slow or often wrong. A set above the child's grade can be opened early.
export default function Facts() {
  const { children, child, pick, reload } = useChildren();
  const [records, setRecords] = useState<Map<string, FactRecord> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!child) return;
    let alive = true;
    setRecords(null);
    void openRepo()
      .then(({ repo }) => repo.listFactStates(child.id))
      .then((states) => {
        if (alive) setRecords(recordsOf(states));
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [child]);

  async function openEarly(setId: string, name: string): Promise<void> {
    if (!child) return;
    try {
      const { repo } = await openRepo();
      await repo.saveChild({ ...child, settings: { ...child.settings, factSets: [...child.settings.factSets, setId] }, updatedAt: nowIso() });
      setMessage(`${name} is open for ${child.name} now.`);
      reload();
    } catch (error) {
      logError(error);
      setMessage('That could not be saved. Try again.');
    }
  }

  const open = child ? openSets(child.grade, child.settings.factSets) : [];
  return (
    <ParentArea page="facts" title="Fast facts">
      {message && <Notice role="status">{message}</Notice>}
      {children !== null && children.length > 1 && child && <Tabs label="Child" tabs={children.map((each) => ({ id: each.id, label: each.name }))} current={child.id} onPick={pick} />}
      {child && records && (
        <>
          <p className={styles.soft}>A fact is fast once it is answered right within 3 seconds (4 for times and divide) twice in a row. Fast facts never change a Skill Score.</p>
          {FACT_SETS.map((set) => {
            const isOpen = open.some((each) => each.id === set.id);
            const trouble = troubleFacts(set, records);
            return (
              <section key={set.id} className={styles.panel} aria-label={set.name} data-facts-set={set.id}>
                <div className={styles.line}>
                  <h2>{set.name}</h2>
                  <span className={styles.chip} data-share={set.id}>
                    {isOpen ? `${Math.round(fluentShare(set, records) * 100)}% fast` : `opens at ${GRADE_WORD[set.grade] ?? set.grade}`}
                  </span>
                </div>
                {isOpen ? (
                  <>
                    <div className={styles.factGrid} role="img" aria-label={`${set.facts.filter((fact) => isFluent(records.get(fact.id), fact.op)).length} of ${set.facts.length} fast`}>
                      {set.facts.map((fact) => (
                        <span key={fact.id} className={`${styles.factCell} ${isFluent(records.get(fact.id), fact.op) ? styles.factFast : ''}`} title={factText(fact)} data-fact={fact.id} />
                      ))}
                    </div>
                    {trouble.length > 0 ? (
                      <ul className={styles.facts} data-fact-trouble={set.id}>
                        {trouble.slice(0, 12).map(({ fact, why }) => (
                          <li key={fact.id}>
                            {factText(fact)} = {fact.answer}: {why === 'wrong' ? 'often wrong' : 'right, but slow'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.soft}>No slow or often-wrong facts yet.</p>
                    )}
                  </>
                ) : (
                  gradeRank(set.grade) > gradeRank(child.grade) && <BigButton tone="quiet" onClick={() => void openEarly(set.id, set.name)}>Open early</BigButton>
                )}
              </section>
            );
          })}
        </>
      )}
    </ParentArea>
  );
}
