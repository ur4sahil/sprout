import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { answerFact, clockText, factAskSay, factMissSay, factSay, factText, recordsOf } from '../../app/facts';
import { warmAll } from '../../audio/voice';
import { useAppStore } from '../../app/store';
import { useWakeLock } from '../../app/useWakeLock';
import { playSfx } from '../../audio/sfx';
import { speak, stop } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import HoldButton from '../../components/HoldButton';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import NotQuite from '../../components/NotQuite';
import Notice from '../../components/Notice';
import type { Fact, FactRecord } from '../../engine/facts';
import { ROUND_SIZE, factSetById, openSets, pickRound } from '../../engine/facts';
import { makeRng } from '../../engine/rng';
import type { Question, Response } from '../../engine/types';
import NumberPadItem from '../../items/NumberPadItem';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child } from '../../storage/schema';
import Art from '../../visuals/Art';
import styles from './FastFacts.module.css';
import page from './SubjectPage.module.css';

// /facts/:setId: one round of 20 facts, always a race (the owner's choice, Nov 17, 2026). The car moves on
// with each right answer and the round's time shows: the one place a child sees time without a parent
// turning the timer on. The answer is checked as soon as it has as many digits as the right one.
export default function FactRace() {
  const child = useAppStore((s) => s.child);
  const { setId = '' } = useParams();
  if (!child) return <Navigate to="/" replace />;
  const set = factSetById(setId);
  if (!set || !openSets(child.grade, child.settings.factSets).some((each) => each.id === set.id)) return <Navigate to="/facts" replace />;
  return <Race key={`${child.id}|${set.id}`} child={child} setId={set.id} />;
}

type Phase = 'loading' | 'asking' | 'saving' | 'wrong' | 'done' | 'failed';

// The number pad reads a question; a fact is asked as a plain number question.
function padQuestion(fact: Fact, index: number): Extract<Question, { type: 'numberPad' }> {
  return { type: 'numberPad', skillId: 'fast-facts', level: 1, seed: index, key: `${fact.id}|${index}`, facts: {}, mode: 'look', prompt: { text: factText(fact), speak: factSay(fact) }, explanation: { speak: [], steps: [] }, answer: fact.answer, maxDigits: String(fact.answer).length };
}

function Race({ child, setId }: { child: Child; setId: string }) {
  const navigate = useNavigate();
  const set = factSetById(setId);
  const [phase, setPhase] = useState<Phase>('loading');
  const [round, setRound] = useState<Fact[]>([]);
  const [at, setAt] = useState(0);
  const [right, setRight] = useState(0);
  const [newFast, setNewFast] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [given, setGiven] = useState<number | null>(null);
  const live = useRef<{ records: Map<string, FactRecord>; startedAt: number; shownAt: number; endedAt: number | null; alive: boolean }>({ records: new Map(), startedAt: 0, shownAt: 0, endedAt: null, alive: true });
  const rate = child.settings.speechRate;
  useWakeLock();
  const goHome = (): void => {
    void navigate('/home', { replace: true });
  };

  useEffect(() => {
    const self = live.current;
    self.alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const records = recordsOf(await repo.listFactStates(child.id));
      if (!self.alive || !set) return;
      self.records = records;
      const picked = pickRound(set, records, makeRng(now().getTime() % 2147483647));
      setRound(picked);
      // What the race may say about each fact is asked for now, so it is ready the moment it is wanted.
      warmAll(picked.flatMap((each) => [factAskSay(each), factMissSay(each)]));
      self.startedAt = now().getTime();
      self.shownAt = self.startedAt;
      setPhase('asking');
    })().catch((error: unknown) => {
      logError(error);
      if (self.alive) setPhase('failed');
    });
    return () => {
      self.alive = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one round for each child and set
  }, []);

  // The race clock, once a second, until the round ends.
  useEffect(() => {
    if (phase === 'loading' || phase === 'done' || phase === 'failed') return;
    const tick = (): void => setElapsed(now().getTime() - live.current.startedAt);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const fact = round[at];

  function answered(response: Response | null): void {
    const self = live.current;
    if (phase !== 'asking' || !fact || !response || !('value' in response)) return;
    if (String(response.value).length < String(fact.answer).length) return;
    const ms = now().getTime() - self.shownAt;
    const outcome = answerFact(child.id, fact, self.records.get(fact.id), response.value, ms, now().toISOString());
    setPhase('saving');
    setGiven(response.value);
    void (async () => {
      try {
        const { repo } = await openRepo();
        await repo.saveFactStates([outcome.state]);
      } catch (error) {
        logError(error);
        if (self.alive) setPhase('failed');
        return;
      }
      if (!self.alive) return;
      self.records.set(fact.id, { factId: fact.id, answers: outcome.state.answers, right: outcome.state.right, recent: outcome.state.recent });
      if (outcome.becameFluent) setNewFast((count) => count + 1);
      if (outcome.right) {
        setRight((count) => count + 1);
        playSfx('chime');
        advance();
      } else {
        setPhase('wrong');
        void speak(factMissSay(fact), rate);
      }
    })();
  }

  function advance(): void {
    const self = live.current;
    stop();
    setGiven(null);
    if (at + 1 >= round.length) {
      self.endedAt = now().getTime();
      setElapsed(self.endedAt - self.startedAt);
      setPhase('done');
      playSfx('fanfare');
      return;
    }
    setAt((index) => index + 1);
    self.shownAt = now().getTime();
    setPhase('asking');
  }

  if (!set) return <Navigate to="/facts" replace />;
  if (phase === 'done') {
    return (
      <FullScreenCard emoji="🏁" title="Finish!" line={`${right} of ${round.length} right in ${clockText(elapsed)}.${newFast > 0 ? ` ${newFast} new fast ${newFast === 1 ? 'fact' : 'facts'}!` : ''}`} name="race-done">
        <BigButton size="kid" onClick={() => void navigate(`/facts`, { replace: true })}>
          <Icon name="bolt" />
          Fast facts
        </BigButton>
        <BigButton size="kid" tone="quiet" onClick={goHome}>
          <Icon name="home" />
          Home
        </BigButton>
      </FullScreenCard>
    );
  }
  const progress = round.length === 0 ? 0 : right / ROUND_SIZE;
  return (
    <KidScreen
      bar={
        <>
          <HoldButton icon="home" label="Back to home" onHeld={goHome} />
          <h1 className={page.title}>
            <Icon name="bolt" />
            {set.name}
          </h1>
        </>
      }
    >
      {phase === 'failed' && <Notice role="alert">The race could not go on. Go back and try again.</Notice>}
      {fact && phase !== 'failed' && (
        <section className={styles.race} aria-label="Question" data-phase={phase} data-fact={fact.id}>
          <div className={styles.track} role="img" aria-label={`${right} of ${ROUND_SIZE} right`} data-right={right}>
            <span className={styles.car} style={{ left: `calc(${Math.round(progress * 85)}% + var(--space-6))` }} aria-hidden="true">
              <Art emoji="🏎️" />
            </span>
            <span className={styles.finish} aria-hidden="true">
              <Icon name="flag" />
            </span>
          </div>
          <span className={styles.clock} aria-label={`Time ${clockText(elapsed)}`} data-clock="">
            {clockText(elapsed)}
          </span>
          <div className={page.title}>
            <p className={styles.fact} data-fact-text="">
              {factText(fact)} = {phase === 'wrong' ? fact.answer : '?'}
            </p>
            <IconButton icon="speaker" label="Hear the fact" onClick={() => void speak(factAskSay(fact), rate)} />
          </div>
          {phase === 'wrong' ? (
            <div className={styles.miss} data-fact-miss="">
              <NotQuite />
              <p className={styles.fact}>
                {factText(fact)} = {fact.answer}
                {given !== null && <span className={page.heading}> (not {given})</span>}
              </p>
              <BigButton size="kid" onClick={advance}>
                <Icon name="next" />
                Next
              </BigButton>
            </div>
          ) : (
            <NumberPadItem key={`${fact.id}|${at}`} question={padQuestion(fact, at)} disabled={phase !== 'asking'} onChange={answered} onSpeak={() => undefined} />
          )}
        </section>
      )}
    </KidScreen>
  );
}
