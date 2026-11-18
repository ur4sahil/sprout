import Art from '../../visuals/Art';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadChildDay } from '../../app/childDay';
import { planProgress } from '../../app/todaysPlan';
import { CHECK_IN_SUBJECTS, SUBJECT_NAME, diagnosticLadders } from '../../app/checkIn';
import type { DayBar } from '../../app/parentData';
import { LADDER_NAME, dayBars, ladderLevel } from '../../app/parentData';
import { useAppStore } from '../../app/store';
import BigButton from '../../components/BigButton';
import Notice from '../../components/Notice';
import Postcard from '../../components/Postcard';
import Tabs from '../../components/Tabs';
import { skillById } from '../../content/catalogue';
import { addDays, daysBetween, localDayOf, localWeek, now } from '../../lib/clock';
import type { TopicRow } from '../../app/topicLevels';
import { topicLevels, topicRows, withWeek } from '../../app/topicLevels';
import { levelNumber, levelWords } from '../../engine/topicLevel';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child, DiagnosticResult } from '../../storage/schema';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';
import { useChildren } from './useChildren';

const REMIND_DAYS = 5;

interface Summary {
  bars: DayBar[];
  mastered: number;
  picks: string[];
  levels: { ladder: string; text: string }[];
  topics: TopicRow[];
  saveFailed: boolean;
  goal: { done: number; goal: number }; // today's plan: its questions, and how many are answered
}

async function summarise(child: Child): Promise<Summary> {
  const { repo } = await openRepo();
  const nowIso = now().toISOString();
  const [attempts, states, results, day] = await Promise.all([repo.listAttempts(child.id, { since: addDays(nowIso, -14) }), repo.getSkillStates(child.id), repo.listDiagnostics(child.id), loadChildDay(child)]);
  const latest = new Map<string, DiagnosticResult>();
  for (const result of results) latest.set(result.ladderId, result);
  const ladders = CHECK_IN_SUBJECTS.flatMap((subject) => diagnosticLadders(subject).map((ladder) => ({ subject, ladder })));
  // Each topic's level now, and this week's snapshot saved for the line over time.
  const week = localWeek();
  const levels = topicLevels(states);
  const updated = withWeek(child, levels, week, nowIso);
  let saveFailed = false;
  if (updated) {
    try {
      await repo.saveChild(updated);
    } catch (error) {
      logError(error);
      saveFailed = true;
    }
  }
  return {
    topics: topicRows(updated ?? child, levels, week),
    saveFailed,
    bars: dayBars(attempts, nowIso),
    mastered: states.filter((state) => state.masteredAt !== null).length,
    goal: planProgress(day.plan),
    picks: day.picks.map((pick) => skillById(pick.skillId)?.name ?? pick.skillId),
    levels: ladders.flatMap(({ subject, ladder }) => {
      const result = latest.get(ladder.id);
      return result ? [{ ladder: `${SUBJECT_NAME[subject]}: ${LADDER_NAME[ladder.id] ?? ladder.id}`, text: ladderLevel(result, ladder, (id) => skillById(id)?.name ?? id) }] : [];
    }),
  };
}

// Bars for the last 14 days. Each bar's height is its share of the tallest.
function Bars({ bars, value, unit }: { bars: DayBar[]; value: (bar: DayBar) => number; unit: string }) {
  const most = Math.max(1, ...bars.map(value));
  const total = bars.reduce((sum, bar) => sum + value(bar), 0);
  return (
    <svg className={styles.bars} viewBox="0 0 280 70" role="img" aria-label={`${unit} each day for the last 14 days. ${total} in all.`} data-bars={unit}>
      <line x1="0" y1="60" x2="280" y2="60" className={styles.barAxis} />
      {bars.map((bar, i) => {
        const height = (value(bar) / most) * 50;
        return <rect key={bar.day} x={i * 20 + 3} y={60 - height} width="14" height={height} className={styles.barFill} data-day={bar.day} data-value={value(bar)} />;
      })}
      <text x="0" y="69" className={styles.barText}>
        {bars[0]?.day.slice(5)}
      </text>
      <text x="280" y="69" textAnchor="end" className={styles.barText}>
        today
      </text>
    </svg>
  );
}

function levelText(row: TopicRow): string {
  if (row.level.kind === 'notTried') return 'not tried yet';
  if (row.level.kind === 'above') return "above Sprout's top level";
  const number = levelNumber(row.level.value);
  return number ? `${levelWords(row.level.value)} (${number})` : levelWords(row.level.value);
}

function changeText(change: number | null): string | null {
  if (change === null) return null;
  if (change === 0) return 'same as last week';
  return change > 0 ? `up ${change.toFixed(1)} since last week` : `down ${(-change).toFixed(1)} since last week`;
}

// The level week by week, as a small line. Drawn only once there are two weeks to join.
function Spark({ row }: { row: TopicRow }) {
  if (row.history.length < 2) return null;
  const values = row.history.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(low + 0.5, ...values);
  const x = (i: number): number => (i / (row.history.length - 1)) * 270 + 5;
  const y = (value: number): number => 26 - ((value - low) / (high - low)) * 22;
  const points = row.history.map((point, i) => `${x(i)},${y(point.value)}`).join(' ');
  return (
    <svg className={styles.spark} viewBox="0 0 280 30" role="img" aria-label={`${row.name}, week by week: ${values.map((value) => value.toFixed(1)).join(', ')}`} data-spark={row.ladderId}>
      <polyline points={points} className={styles.sparkLine} />
    </svg>
  );
}

// Per child: practice over the last 14 days, the daily goal, skills mastered, today's picks, levels by topic and check-in levels.
export default function Dashboard() {
  const navigate = useNavigate();
  const account = useAppStore((s) => s.account);
  const { children, child, pick } = useChildren();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!child) return;
    let alive = true;
    setSummary(null);
    void summarise(child)
      .then((found) => {
        if (alive) setSummary(found);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [child]);

  const daysLeft = account.status === 'signedIn' ? daysBetween(now().toISOString(), account.expiresAt) : null;
  const today = summary?.bars.at(-1);
  return (
    <ParentArea page="dashboard" title="Dashboard">
      {account.status === 'signedIn' && daysLeft !== null && daysLeft <= REMIND_DAYS && (
        <div className={styles.panel} data-signin-banner="">
          <Notice role="alert">Sign in again by {localDayOf(account.expiresAt)}. After that day the app locks until a grown-up signs in.</Notice>
          <BigButton onClick={() => void navigate('/signin')}>Sign in again now</BigButton>
        </div>
      )}
      {children !== null && children.length === 0 && <Notice role="status">No children yet. Add one from Settings.</Notice>}
      {children !== null && children.length > 1 && child && <Tabs label="Child" tabs={children.map((each) => ({ id: each.id, label: each.name }))} current={child.id} onPick={pick} />}
      {child && summary && (
        <>
          <section className={styles.panel} aria-label="Practice">
            <h2>
              <Art emoji={child.avatar} /> {child.name}: the last 14 days
            </h2>
            <div className={styles.charts}>
              <div className={styles.chart}>
                <h3>Questions a day</h3>
                <Bars bars={summary.bars} value={(bar) => bar.questions} unit="Questions" />
              </div>
              <div className={styles.chart}>
                <h3>Minutes a day</h3>
                <Bars bars={summary.bars} value={(bar) => bar.minutes} unit="Minutes" />
              </div>
            </div>
            <ul className={styles.facts}>
              <li data-fact="goal">
                {summary.goal.goal > 0 ? `Today's plan: ${summary.goal.done} of ${summary.goal.goal} questions` : 'Today: no plan'}
                {today && today.questions > summary.goal.done ? ` (${today.questions} answered in all)` : ''}
              </li>
              <li data-fact="mastered">Skills mastered: {summary.mastered}</li>
              <li data-fact="picks">Today's picks: {summary.picks.length > 0 ? summary.picks.join(', ') : 'none'}</li>
            </ul>
          </section>
          {/* The weekly postcard (game feel, phase 7): only for a week with 4 or more sunny days. */}
          <Postcard key={child.id} child={child} />
          <section className={styles.panel} aria-label="Levels by topic">
            <h2>Levels by topic</h2>
            <p className={styles.soft}>From the skills {child.name} has shown they know. Worked out again each time this page opens.</p>
            {summary.saveFailed && <Notice role="alert">This week's levels could not be saved, so the lines over time may miss this week. Close the app and open it again.</Notice>}
            <ul className={styles.topics}>
              {summary.topics.map((row) => (
                <li key={row.ladderId} data-topic={row.ladderId} data-kind={row.level.kind}>
                  <span className={styles.topicName}>{row.name}</span>
                  <span>{levelText(row)}</span>
                  {changeText(row.change) && <span className={styles.soft}>{changeText(row.change)}</span>}
                  <Spark row={row} />
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.panel} aria-label="Check-in levels">
            <h2>Check-in levels</h2>
            {summary.levels.length === 0 ? (
              <p className={styles.soft}>The check-in has not placed {child.name} yet.</p>
            ) : (
              <ul className={styles.facts}>
                {summary.levels.map((level) => (
                  <li key={level.ladder} data-level={level.ladder}>
                    {level.ladder}: {level.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </ParentArea>
  );
}
