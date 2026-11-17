import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { PopTurn } from '../../app/games';
import { POP_ROUND, popSkills, popTurn } from '../../app/games';
import { newSession, recordAnswer } from '../../app/practiceRecord';
import { useAppStore } from '../../app/store';
import { TIMING } from '../../app/timing';
import { useWakeLock } from '../../app/useWakeLock';
import { playSfx } from '../../audio/sfx';
import { speak, stop } from '../../audio/speech';
import { openingWords } from '../../audio/stepSay';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import GameButton from '../../components/GameButton';
import HoldButton from '../../components/HoldButton';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import NotQuite from '../../components/NotQuite';
import Notice from '../../components/Notice';
import StepWalk from '../../components/StepWalk';
import { describeVisual } from '../../engine/describe';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child, Session, SkillState } from '../../storage/schema';
import VisualView from '../../visuals/VisualView';
import styles from './Games.module.css';

// /games/pop. Balloons bob in place, each carrying an answer. The child taps the one that answers
// the spoken question. Nothing floats away and nothing is timed. Ten questions make a round.
// Every answer is saved as normal practice and moves that skill's score.
export default function Pop() {
  const child = useAppStore((s) => s.child);
  if (!child) return <Navigate to="/" replace />;
  return <PopRound key={child.id} child={child} />;
}

type Phase = 'loading' | 'asking' | 'saving' | 'right' | 'wrong' | 'done' | 'none' | 'failed';
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function PopRound({ child }: { child: Child }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [turn, setTurn] = useState<PopTurn | null>(null);
  const [asked, setAsked] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const live = useRef<{ states: SkillState[]; sessions: Map<string, Session>; keys: string[]; shownAt: Date; alive: boolean; at: number }>({ states: [], sessions: new Map(), keys: [], shownAt: now(), alive: true, at: 0 });
  const rate = child.settings.speechRate;
  useWakeLock();
  const goHome = (): void => {
    void navigate('/home', { replace: true });
  };

  // The next balloon question: the skills take turns, each asking what it would ask next in practice.
  const next = useCallback((): void => {
    const self = live.current;
    for (let tries = 0; tries < self.states.length; tries += 1) {
      const state = self.states[self.at % self.states.length] as SkillState;
      self.at += 1;
      const found = popTurn(child, state, self.keys);
      if (!found) continue;
      self.shownAt = now();
      setTurn(found);
      setPicked(null);
      setPhase('asking');
      void speak(found.question.prompt.speak, rate);
      return;
    }
    // No skill has a choice question left: the round ends early.
    setPhase('done');
  }, [child, rate]);

  useEffect(() => {
    const self = live.current;
    self.alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const states = popSkills(child, await repo.getSkillStates(child.id));
      if (!self.alive) return;
      self.states = states;
      if (states.length === 0) setPhase('none');
      else next();
    })().catch((error: unknown) => {
      logError(error);
      if (self.alive) setPhase('failed');
    });
    return () => {
      self.alive = false;
      stop();
      // Close the sessions. Every answer is already saved.
      const endedAt = now().toISOString();
      for (const session of self.sessions.values()) {
        if (session.questions > 0) void openRepo().then(({ repo }) => repo.saveSession({ ...session, endedAt })).catch(logError);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one round for each child
  }, [child]);

  function tap(index: number): void {
    const self = live.current;
    if (phase !== 'asking' || !turn) return;
    if (now().getTime() - self.shownAt.getTime() < TIMING.tapGuardMs) return;
    setPhase('saving');
    setPicked(index);
    void (async () => {
      const session = self.sessions.get(turn.skill.id) ?? newSession(child, turn.skill.id, now());
      const outcome = recordAnswer({ child, skill: turn.skill, state: turn.state, session, question: turn.question, response: { index }, shownAt: self.shownAt, answeredAt: now() });
      try {
        const { repo } = await openRepo();
        await repo.saveAnswer({ attempt: outcome.attempt, states: [outcome.state], session: outcome.session });
      } catch (error) {
        logError(error);
        if (self.alive) setPhase('failed');
        return;
      }
      if (!self.alive) return;
      self.sessions.set(turn.skill.id, outcome.session);
      self.states = self.states.map((state) => (state.skillId === turn.skill.id ? outcome.state : state));
      self.keys = [...self.keys, turn.question.key].slice(-6);
      setAsked((count) => count + 1);
      if (!outcome.correct) {
        setPhase('wrong');
        void speak(openingWords(turn.question), rate);
        return;
      }
      setRight((count) => count + 1);
      setPhase('right');
      playSfx('chime');
      await wait(TIMING.praiseMinMs);
      if (self.alive) advance(asked + 1);
    })();
  }

  function advance(count: number): void {
    stop();
    if (count >= POP_ROUND) {
      setPhase('done');
      playSfx('fanfare');
    } else next();
  }

  if (phase === 'none') return <Navigate to="/home" replace />;
  if (phase === 'done') {
    return (
      <FullScreenCard emoji="🎈" title="Round over!" line={`You popped ${right} of ${asked}.`} name="pop-done">
        <BigButton size="kid" onClick={goHome}>
          <span aria-hidden="true">🏠 </span>Home
        </BigButton>
      </FullScreenCard>
    );
  }
  const question = turn?.question;
  return (
    <KidScreen
      bar={
        <>
          <HoldButton icon="🏠" label="Back to home" onHeld={goHome} />
          <h1 className={styles.title}>
            <span aria-hidden="true">🎈 </span>Pop
          </h1>
          <span className={styles.spacer} />
          <span className={styles.count} data-pop-count={asked} aria-label={`Question ${Math.min(asked + 1, POP_ROUND)} of ${POP_ROUND}`}>
            {Math.min(asked + 1, POP_ROUND)} / {POP_ROUND}
          </span>
        </>
      }
    >
      {phase === 'failed' && <Notice role="alert">The game could not go on. Go back and try again.</Notice>}
      {question && phase !== 'failed' && (
        <section className={styles.pop} aria-label="Question" data-phase={phase} data-skill={turn.skill.id}>
          <div className={styles.ask}>
            <p className={styles.prompt}>{question.prompt.text}</p>
            <IconButton icon="🔊" label="Hear the question" onClick={() => void speak(question.prompt.speak, rate)} />
          </div>
          {question.stimulus && <VisualView visual={question.stimulus} />}
          <div className={styles.balloons} role="group" aria-label="Balloons">
            {question.options.map((option, index) => (
              <GameButton
                key={index}
                look="balloon"
                data-balloon={index}
                data-picked={picked === index ? '' : undefined}
                data-right={phase === 'wrong' && index === question.answerIndex ? '' : undefined}
                aria-label={describeVisual(option)}
                disabled={phase !== 'asking'}
                onClick={() => tap(index)}
              >
                <VisualView visual={option} />
              </GameButton>
            ))}
          </div>
          {phase === 'wrong' && (
            <div className={styles.explain} data-pop-explanation="">
              <NotQuite />
              <StepWalk key={`${question.key}|${question.seed}`} question={question} onDone={() => advance(asked)} onSpeak={(say) => void speak(say, rate)} />
            </div>
          )}
        </section>
      )}
    </KidScreen>
  );
}
