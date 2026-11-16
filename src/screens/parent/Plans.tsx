import { useEffect, useState } from 'react';
import { awardSkills } from '../../app/awardsRun';
import { GRADE_NAME } from '../../app/parentData';
import { moveSkill, newPlan, reasoningTemplate } from '../../app/plans';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import SelectField from '../../components/SelectField';
import TextField from '../../components/TextField';
import ToggleField from '../../components/ToggleField';
import type { Skill } from '../../content/catalogue';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Plan } from '../../storage/schema';
import { SUBJECTS } from '../kid/Home';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';
import { useChildren } from './useChildren';

const skillLabel = (skill: Skill): string => `${SUBJECTS.find((subject) => subject.id === skill.subject)?.label ?? ''} ${GRADE_NAME[skill.grade] ?? skill.grade}: ${skill.code} ${skill.name}`;

// Name a plan, pick skills, order them, assign children. A plan's first unmastered skill joins a child's daily picks.
export default function Plans() {
  const { children } = useChildren();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const skills = awardSkills();
  const byId = new Map(skills.map((skill) => [skill.id, skill]));

  useEffect(() => {
    let alive = true;
    void openRepo()
      .then(({ repo }) => repo.listPlans())
      .then((list) => {
        if (alive) setPlans(list);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [round]);

  async function save(plan: Plan, said: string): Promise<void> {
    try {
      await (await openRepo()).repo.savePlan({ ...plan, updatedAt: now().toISOString() });
      setDraft(null);
      setMessage(said);
      setRound(round + 1);
    } catch (error) {
      logError(error);
      setMessage('That could not be saved. Try again.');
    }
  }

  const template = reasoningTemplate();
  const everyChild = (children ?? []).map((child) => child.id);

  if (draft) {
    const ready = draft.name.trim().length > 0 && draft.skillIds.length > 0;
    return (
      <ParentArea page="plans" title={plans?.some((plan) => plan.id === draft.id) ? 'Change a plan' : 'New plan'}>
        <section className={styles.panel} aria-label="Plan">
          <TextField label="Name of the plan" value={draft.name} onValue={(name) => setDraft({ ...draft, name })} maxLength={60} />
          <h3>For</h3>
          {(children ?? []).map((child) => (
            <ToggleField
              key={child.id}
              label={`${child.avatar} ${child.name}`}
              checked={draft.childIds.includes(child.id)}
              onChange={(on) => setDraft({ ...draft, childIds: on ? [...draft.childIds, child.id] : draft.childIds.filter((id) => id !== child.id) })}
            />
          ))}
          <h3>Skills, in order</h3>
          {draft.skillIds.length === 0 && <p className={styles.soft}>No skills yet. Add one below.</p>}
          <ol className={styles.facts} data-plan-skills="">
            {draft.skillIds.map((id, index) => (
              <li key={id} className={styles.line} data-plan-skill={id}>
                <span>
                  {index + 1}. {byId.get(id) ? skillLabel(byId.get(id) as Skill) : id}
                </span>
                <span>
                  <LinkButton disabled={index === 0} aria-label={`Move ${byId.get(id)?.name ?? id} earlier`} onClick={() => setDraft(moveSkill(draft, id, -1, draft.updatedAt))}>
                    Up
                  </LinkButton>
                  <LinkButton disabled={index === draft.skillIds.length - 1} aria-label={`Move ${byId.get(id)?.name ?? id} later`} onClick={() => setDraft(moveSkill(draft, id, 1, draft.updatedAt))}>
                    Down
                  </LinkButton>
                  <LinkButton aria-label={`Take out ${byId.get(id)?.name ?? id}`} onClick={() => setDraft({ ...draft, skillIds: draft.skillIds.filter((other) => other !== id) })}>
                    Take out
                  </LinkButton>
                </span>
              </li>
            ))}
          </ol>
          <SelectField
            label="Add a skill"
            value=""
            options={[{ value: '', label: 'Choose a skill' }, ...skills.filter((skill) => !draft.skillIds.includes(skill.id)).map((skill) => ({ value: skill.id, label: skillLabel(skill) }))]}
            onValue={(id) => {
              if (id) setDraft({ ...draft, skillIds: [...draft.skillIds, id] });
            }}
          />
          <CenterRow>
            <BigButton disabled={!ready} onClick={() => void save({ ...draft, name: draft.name.trim() }, `"${draft.name.trim()}" is saved.`)}>
              Save plan
            </BigButton>
            <BigButton onClick={() => setDraft(null)}>Cancel</BigButton>
          </CenterRow>
        </section>
      </ParentArea>
    );
  }

  return (
    <ParentArea page="plans" title="Plans">
      {message && <Notice role="status">{message}</Notice>}
      {plans !== null && plans.length === 0 && <Notice role="status">No plans yet. A plan is a list of skills you choose. Its next skill joins a child's daily picks.</Notice>}
      {plans?.map((plan) => (
        <section key={plan.id} className={styles.panel} aria-label={plan.name} data-plan={plan.id}>
          <h2>{plan.name}</h2>
          <p className={styles.soft}>
            {plan.skillIds.length} {plan.skillIds.length === 1 ? 'skill' : 'skills'}. For:{' '}
            {(children ?? [])
              .filter((child) => plan.childIds.includes(child.id))
              .map((child) => child.name)
              .join(', ') || 'no one yet'}
            .
          </p>
          <CenterRow>
            <BigButton onClick={() => setDraft(plan)}>Change</BigButton>
            <BigButton onClick={() => void save({ ...plan, deletedAt: now().toISOString() }, `"${plan.name}" was removed.`)}>Remove</BigButton>
          </CenterRow>
        </section>
      ))}
      <section className={styles.panel} aria-label="Start a plan">
        <h2>Start a plan</h2>
        <CenterRow>
          <BigButton onClick={() => setDraft(newPlan('', [], everyChild, now().toISOString()))}>New plan</BigButton>
        </CenterRow>
        <h3>Ready-made: {template.name}</h3>
        <p className={styles.soft}>All {template.skillIds.length} reasoning skills, easiest style first.</p>
        <CenterRow>
          <BigButton data-use-template="" onClick={() => void save(newPlan(template.name, template.skillIds, everyChild, now().toISOString()), `"${template.name}" is saved for every child. You can change it.`)}>
            Use this plan
          </BigButton>
        </CenterRow>
      </section>
    </ParentArea>
  );
}
