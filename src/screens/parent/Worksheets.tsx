import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { awardSkills } from '../../app/awardsRun';
import { loadChildDay } from '../../app/childDay';
import { GRADE_NAME, troubleSpots } from '../../app/parentData';
import BigButton from '../../components/BigButton';
import Icon from '../../components/Icon';
import Notice from '../../components/Notice';
import SelectField from '../../components/SelectField';
import Tabs from '../../components/Tabs';
import ToggleField from '../../components/ToggleField';
import { addDays, now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';
import { useChildren } from './useChildren';

type Source = 'pack' | 'picks' | 'trouble' | 'choose';
const SOURCES: { value: Source; label: string }[] = [
  { value: 'pack', label: "This week's pack: today's picks and trouble spots" },
  { value: 'picks', label: "Today's picks" },
  { value: 'trouble', label: 'Trouble spots' },
  { value: 'choose', label: 'Choose skills' },
];
const SUBJECT_WORD: Record<string, string> = { math: 'Math', ela: 'Language Arts', reasoning: 'Reasoning' };

// /parent/worksheets: choose what goes on a printed worksheet (plan section 15.6), then open it.
export default function Worksheets() {
  const navigate = useNavigate();
  const { children, child, pick } = useChildren();
  const [source, setSource] = useState<Source>('pack');
  const [count, setCount] = useState('10');
  const [shift, setShift] = useState('0');
  const [found, setFound] = useState<{ picks: string[]; trouble: string[] } | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [group, setGroup] = useState('');
  const skills = awardSkills();
  const groups = [...new Set(skills.map((skill) => `${skill.subject}|${skill.grade}`))];

  useEffect(() => {
    if (!child) return;
    let alive = true;
    setFound(null);
    setChosen([]);
    setGroup(skills.some((skill) => skill.subject === 'math' && skill.grade === child.grade) ? `math|${child.grade}` : (groups[0] ?? ''));
    void (async () => {
      const { repo } = await openRepo();
      const [day, states, recent] = await Promise.all([loadChildDay(child), repo.getSkillStates(child.id), repo.listAttempts(child.id, { since: addDays(now().toISOString(), -14) })]);
      if (alive) setFound({ picks: day.picks.map((each) => each.skillId), trouble: troubleSpots(skills, states, recent).map((spot) => spot.skill.id) });
    })().catch(logError);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once for each child
  }, [child]);

  const picked = !found ? [] : source === 'pack' ? [...new Set([...found.picks, ...found.trouble])] : source === 'picks' ? found.picks : source === 'trouble' ? found.trouble : chosen;
  const make = (): void => {
    if (!child || picked.length === 0) return;
    const seed = (now().getTime() % 90000) + 10000;
    const n = source === 'pack' ? '20' : count;
    void navigate(`/parent/worksheet?child=${encodeURIComponent(child.id)}&skills=${picked.map(encodeURIComponent).join(',')}&n=${n}&shift=${shift}&seed=${seed}`, { replace: true });
  };
  const groupLabel = (id: string): string => {
    const [subject = '', grade = ''] = id.split('|');
    return grade === 'all' ? (SUBJECT_WORD[subject] ?? subject) : `${SUBJECT_WORD[subject] ?? subject}, ${GRADE_NAME[grade] ?? grade}`;
  };

  return (
    <ParentArea page="worksheets" title="Worksheets">
      {children !== null && children.length > 1 && child && <Tabs label="Child" tabs={children.map((each) => ({ id: each.id, label: each.name }))} current={child.id} onPick={pick} />}
      {child && found && (
        <section className={styles.panel} aria-label="Make a worksheet">
          <p className={styles.soft}>A worksheet and its answer key, ready to print on Letter paper. Questions a child answers by listening are left off.</p>
          <SelectField label="What to practise" value={source} options={SOURCES} onValue={(value) => setSource(value as Source)} />
          {source === 'choose' && (
            <>
              <SelectField label="Subject and grade" value={group} options={groups.map((id) => ({ value: id, label: groupLabel(id) }))} onValue={setGroup} />
              <div className={styles.facts} data-skill-choices="">
                {skills
                  .filter((skill) => `${skill.subject}|${skill.grade}` === group)
                  .map((skill) => (
                    <ToggleField key={skill.id} label={`${skill.code} ${skill.name}`} checked={chosen.includes(skill.id)} onChange={(on) => setChosen((list) => (on ? [...list, skill.id] : list.filter((id) => id !== skill.id)))} />
                  ))}
              </div>
            </>
          )}
          {source !== 'pack' && (
            <SelectField
              label="Questions"
              value={count}
              options={[
                { value: '10', label: '10 questions' },
                { value: '20', label: '20 questions' },
              ]}
              onValue={setCount}
            />
          )}
          <SelectField
            label="Level"
            value={shift}
            options={[
              { value: '0', label: `${child.name}'s level` },
              { value: '-1', label: 'One easier' },
              { value: '1', label: 'One harder' },
            ]}
            onValue={setShift}
          />
          {picked.length === 0 ? (
            <Notice role="status">{source === 'trouble' ? `${child.name} has no trouble spots right now.` : source === 'choose' ? 'Choose at least one skill.' : 'Nothing to put on a worksheet today.'}</Notice>
          ) : (
            <p className={styles.soft} data-sheet-skills={picked.length}>
              {picked.length} {picked.length === 1 ? 'skill' : 'skills'} on the sheet.
            </p>
          )}
          <BigButton disabled={picked.length === 0} onClick={make}>
            <Icon name="printer" />
            Make the worksheet
          </BigButton>
        </section>
      )}
    </ParentArea>
  );
}
