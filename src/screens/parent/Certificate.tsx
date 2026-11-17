import Icon from '../../components/Icon';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { awardSkills } from '../../app/awardsRun';
import type { ScoreRow } from '../../app/parentData';
import { categoryComplete, categoryRows, GRADE_NAME, scoreRows } from '../../app/parentData';
import { hasPass } from '../../app/pin';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import { skillById } from '../../content/catalogue';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child } from '../../storage/schema';
import { SUBJECTS } from '../kid/Home';
import styles from './Certificate.module.css';
import Gate from './Gate';

// /parent/certificate/:childId/:skillId. A printable certificate for one completed group of skills
// (plan section 7). The skill id names the group: any skill in it will do. Only the certificate
// itself is printed: the buttons are left off the page.
export default function Certificate() {
  const navigate = useNavigate();
  const { childId, skillId } = useParams();
  const [, setPassed] = useState(0);
  const [found, setFound] = useState<{ child: Child | null; rows: ScoreRow[] } | null>(null);
  const skill = skillId ? skillById(skillId) : undefined;
  const passed = hasPass();

  useEffect(() => {
    if (!passed || !childId) return;
    let alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const child = (await repo.listChildren()).find((each) => each.id === childId) ?? null;
      const rows = child ? scoreRows(awardSkills(), await repo.getSkillStates(child.id), []) : [];
      if (alive) setFound({ child, rows });
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, [passed, childId]);

  const back = (): void => {
    void navigate('/parent/scores', { replace: true });
  };
  if (!passed) return <Gate onPass={() => setPassed((n) => n + 1)} onCancel={() => void navigate('/', { replace: true })} />;
  if (!found) return null;
  const { child, rows } = found;
  const ready = child !== null && skill !== undefined && categoryComplete(rows, skill);
  const subject = SUBJECTS.find((each) => each.id === skill?.subject)?.label ?? '';
  const grade = skill ? (GRADE_NAME[skill.grade] ?? '') : '';
  const day = now().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <main className={styles.page} data-parent-page="certificate">
      {ready && skill ? (
        <article className={styles.certificate} aria-label="Certificate" data-certificate={`${skill.subject}|${skill.grade}|${skill.category}`}>
          <p className={styles.mark} aria-hidden="true">
            🌱
          </p>
          <h1 className={styles.heading}>Certificate</h1>
          <p className={styles.line}>This is to say that</p>
          <p className={styles.name}>{child.name}</p>
          <p className={styles.line}>has mastered every skill in</p>
          <p className={styles.group}>{skill.category.replace(/^[A-Z]\. /, '')}</p>
          <p className={styles.line}>
            {[subject, grade].filter((each) => each.length > 0).join(', ')} · {categoryRows(rows, skill).length} skills
          </p>
          <p className={styles.day}>{day}</p>
        </article>
      ) : (
        <Notice role="status">This group is not finished yet. A certificate can be printed when every skill in it is mastered.</Notice>
      )}
      <div className={styles.screenOnly}>
        <CenterRow>
          {ready && (
            <BigButton onClick={() => window.print()}>
              <Icon name="printer" />Print
            </BigButton>
          )}
          <LinkButton onClick={back}>Back to scores</LinkButton>
        </CenterRow>
      </div>
    </main>
  );
}
