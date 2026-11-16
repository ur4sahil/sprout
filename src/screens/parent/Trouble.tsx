import { useEffect, useState } from 'react';
import { awardSkills } from '../../app/awardsRun';
import type { TroubleSpot } from '../../app/parentData';
import { redraw, troubleSpots } from '../../app/parentData';
import { addToExtraPractice, EXTRA_PRACTICE } from '../../app/plans';
import BigButton from '../../components/BigButton';
import Notice from '../../components/Notice';
import Tabs from '../../components/Tabs';
import { addDays, now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import LoggedQuestion from './LoggedQuestion';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';
import { useChildren } from './useChildren';

// Skills a child is stuck on, each with the three most recent missed questions and a button to add it to a plan.
export default function Trouble() {
  const { children, child, pick } = useChildren();
  const [spots, setSpots] = useState<TroubleSpot[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!child) return;
    let alive = true;
    setSpots(null);
    void (async () => {
      const { repo } = await openRepo();
      const [states, recent] = await Promise.all([repo.getSkillStates(child.id), repo.listAttempts(child.id, { since: addDays(now().toISOString(), -14) })]);
      if (alive) setSpots(troubleSpots(awardSkills(), states, recent));
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, [child]);

  async function addToPlan(spot: TroubleSpot): Promise<void> {
    if (!child) return;
    try {
      const { repo } = await openRepo();
      const plan = addToExtraPractice(await repo.listPlans(), child.id, spot.skill.id, now().toISOString());
      if (plan) await repo.savePlan(plan);
      setMessage(plan ? `${spot.skill.name} is now on ${child.name}'s "${EXTRA_PRACTICE}" plan. It will come up in today's picks.` : `${spot.skill.name} is already on the "${EXTRA_PRACTICE}" plan.`);
    } catch (error) {
      logError(error);
      setMessage('That could not be saved. Try again.');
    }
  }

  return (
    <ParentArea page="trouble" title="Trouble spots">
      {message && <Notice role="status">{message}</Notice>}
      {children !== null && children.length > 1 && child && <Tabs label="Child" tabs={children.map((each) => ({ id: each.id, label: each.name }))} current={child.id} onPick={pick} />}
      {child && spots !== null && spots.length === 0 && <Notice role="status">No trouble spots for {child.name}. A skill shows here after 5 or more answers in two weeks with most of the recent ones wrong.</Notice>}
      {spots?.map((spot) => (
        <section key={spot.skill.id} className={styles.panel} aria-label={spot.skill.name} data-trouble={spot.skill.id}>
          <div className={styles.line}>
            <h2>
              {spot.skill.code} {spot.skill.name}
            </h2>
            <span className={styles.chip}>Score {spot.state.score}</span>
          </div>
          {spot.missed.map((attempt) => (
            <LoggedQuestion key={attempt.id} shown={redraw(attempt, spot.skill)} correct={false} />
          ))}
          <BigButton onClick={() => void addToPlan(spot)}>Add to a plan</BigButton>
        </section>
      ))}
    </ParentArea>
  );
}
