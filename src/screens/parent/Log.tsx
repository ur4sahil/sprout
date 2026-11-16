import { useEffect, useState } from 'react';
import type { LogPeriod } from '../../app/parentData';
import { filterLog, redraw } from '../../app/parentData';
import BigButton from '../../components/BigButton';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import SelectField from '../../components/SelectField';
import Tabs from '../../components/Tabs';
import TextField from '../../components/TextField';
import { skillById } from '../../content/catalogue';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { newId } from '../../lib/ids';
import { openRepo } from '../../storage/index';
import type { Attempt, Flag } from '../../storage/schema';
import LoggedQuestion from './LoggedQuestion';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';
import { useChildren } from './useChildren';

const PAGE = 30;
const PERIODS: { value: LogPeriod; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
];
const KIND: Record<Attempt['kind'], string> = { practice: 'Practice', review: 'Review', diagnostic: 'Check-in' };

// Every answer, newest first, filtered by child, skill and date. Each row shows the question again
// with the child's answer beside the right one, and can be flagged with a note.
export default function Log() {
  const { children, child, pick } = useChildren();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [skillId, setSkillId] = useState('all');
  const [period, setPeriod] = useState<LogPeriod>('all');
  const [showing, setShowing] = useState(PAGE);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!child) return;
    let alive = true;
    setAttempts(null);
    setSkillId('all');
    setShowing(PAGE);
    void (async () => {
      const { repo } = await openRepo();
      const [list, saved] = await Promise.all([repo.listAttempts(child.id, {}), repo.listFlags()]);
      if (!alive) return;
      setAttempts(list);
      setFlags(saved);
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, [child]);

  async function flag(attempt: Attempt): Promise<void> {
    const saved: Flag = { id: newId(), childId: attempt.childId, attemptId: attempt.id, skillId: attempt.skillId, level: attempt.level, seed: attempt.seed, note: note.trim().slice(0, 500), createdAt: now().toISOString(), resolvedAt: null };
    try {
      await (await openRepo()).repo.saveFlag(saved);
      setFlags([...flags, saved]);
      setFlagging(null);
      setNote('');
    } catch (error) {
      logError(error);
    }
  }

  const rows = attempts ? filterLog(attempts, skillId, period, now().toISOString()) : [];
  const skills = attempts ? [...new Set(attempts.map((attempt) => attempt.skillId))].map((id) => ({ value: id, label: skillById(id)?.name ?? id })) : [];
  return (
    <ParentArea page="log" title="Question log">
      {children !== null && children.length > 1 && child && <Tabs label="Child" tabs={children.map((each) => ({ id: each.id, label: each.name }))} current={child.id} onPick={pick} />}
      {child && attempts && (
        <section className={styles.panel} aria-label="Answers">
          <SelectField label="Skill" value={skillId} options={[{ value: 'all', label: 'All skills' }, ...skills]} onValue={setSkillId} />
          <SelectField label="When" value={period} options={PERIODS} onValue={(value) => setPeriod(value as LogPeriod)} />
          <p className={styles.soft} data-log-count="">
            {rows.length} {rows.length === 1 ? 'answer' : 'answers'}
          </p>
          {rows.length === 0 && <Notice role="status">No answers to show.</Notice>}
          {rows.slice(0, showing).map((attempt) => {
            const skill = skillById(attempt.skillId);
            const flagged = flags.some((saved) => saved.attemptId === attempt.id);
            return (
              <div key={attempt.id} data-log-row={attempt.id}>
                <div className={styles.line}>
                  <span className={styles.soft}>
                    {attempt.day} · {skill ? `${skill.code} ${skill.name}` : attempt.skillId} · level {attempt.level} · {KIND[attempt.kind]}
                  </span>
                  {flagged ? (
                    <span className={styles.chip} data-flagged="">
                      Flagged
                    </span>
                  ) : (
                    <LinkButton onClick={() => setFlagging(flagging === attempt.id ? null : attempt.id)}>Flag</LinkButton>
                  )}
                </div>
                <LoggedQuestion shown={redraw(attempt, skill)} correct={attempt.correct} />
                {flagging === attempt.id && !flagged && (
                  <>
                    <TextField label="What is wrong with this question? (You can leave this empty.)" value={note} onValue={setNote} maxLength={500} />
                    <BigButton onClick={() => void flag(attempt)}>Save flag</BigButton>
                  </>
                )}
              </div>
            );
          })}
          {rows.length > showing && <BigButton onClick={() => setShowing(showing + PAGE)}>Show more</BigButton>}
        </section>
      )}
    </ParentArea>
  );
}
