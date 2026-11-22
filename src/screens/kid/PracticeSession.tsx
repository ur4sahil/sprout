import { PART2_AT_SCORE, teachingPart2For } from '../../lessons';
import Icon from '../../components/Icon';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { popSkills } from '../../app/games';
import { answersByDay, sunnyDays } from '../../app/sunnyDays';
import { usePractice } from '../../app/usePractice';
import { useWakeLock } from '../../app/useWakeLock';
import { speak, stop } from '../../audio/speech';
import { useMusic } from '../../audio/useMusic';
import { warmQuestion } from '../../audio/voice';
import BigButton from '../../components/BigButton';
import Celebration from '../../components/Celebration';
import FullScreenCard from '../../components/FullScreenCard';
import type { GrowthInfo } from '../../components/GrowthShow';
import HintButton from '../../components/HintButton';
import HintPanel from '../../components/HintPanel';
import HoldButton from '../../components/HoldButton';
import IconButton from '../../components/IconButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import PracticeFriend from '../../components/PracticeFriend';
import { plantKindFor } from '../../components/plantKind';
import QuestionStage from '../../components/QuestionStage';
import Scratchpad from '../../components/Scratchpad';
import SoftBreak from '../../components/SoftBreak';
import StatusPanel from '../../components/StatusPanel';
import type { Skill } from '../../content/catalogue';
import type { Response, Say } from '../../engine/types';
import { now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child } from '../../storage/schema';
import { castFor } from '../../cast';
import { growthStage } from '../../worlds';
import { GRADE_NAME, SUBJECTS } from './Home';
import styles from './PracticeSession.module.css';

interface Props {
  child: Child;
  skill: Skill;
  // Set when this skill is one pick in a Play run: the break offers "Next one", and each pick lasts one session.
  play?: { onNext: () => void };
  // Set when this skill is one part of a run through today's plan: after `left` answers the run goes on.
  run?: { left: number; onDone: () => void };
}

// The practice screen: the question on the left, the status panel on the right.
export default function PracticeSession({ child, skill, play, run }: Props) {
  const navigate = useNavigate();
  const practice = usePractice(child, skill, { sessions: play !== undefined, stopAfter: run?.left, onStop: run?.onDone });
  const { phase, question, state } = practice;
  const [seconds, setSeconds] = useState(0);
  const rate = child.settings.speechRate;
  const goHome = (): void => {
    void navigate('/home', { replace: true });
  };
  // At the end of a sitting (a skill mastered, or known already), a plan run goes on to its next part.
  const finish = play ? play.onNext : run ? run.onDone : goHome;
  // The subject's friend says everything here: the question, its steps, hints and praise (plan section 20).
  const friend = castFor(skill.subject);
  const say = (text: Say): void => void speak(text, rate, 'normal', friend);
  useWakeLock();

  // The prompt is read aloud when the question appears. Keyed on the question, and cancelled
  // in the cleanup, so it is never said twice.
  const questionId = question ? `${question.key}|${question.seed}` : null;
  useEffect(() => {
    if (!question) return;
    // What this question may say is fetched now, so the recorded voice is ready when it is wanted.
    warmQuestion(question, friend);
    if (!child.settings.autoSpeak) return;
    void speak(question.prompt.speak, rate, 'normal', friend);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one reading for each question shown
  }, [questionId]);

  // The only clock a child can ever see, and only when the parent turned it on.
  useEffect(() => {
    if (!child.settings.showTimer || !practice.startedAt) return;
    const started = new Date(practice.startedAt).getTime();
    const timer = setInterval(() => setSeconds(Math.max(0, Math.floor((now().getTime() - started) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [child.settings.showTimer, practice.startedAt]);

  // Pre-K profiles answer a choice question with one tap, unless its options say their names when tapped.
  const oneTap = child.grade === 'PK' && question?.type === 'choice' && question.options.every((option) => option.speak === undefined);

  function onChange(response: Response | null): void {
    practice.setResponse(response);
    if (oneTap && response) practice.submit(response);
  }

  const asking = phase === 'asking' || phase === 'saving' || phase === 'correct' || phase === 'wrong';
  useMusic('practice', phase !== 'asking' || question?.mode === 'listen');

  // From grade 1, a pencil opens a drawing layer over the question. It is closed again for each new question.
  const canDraw = child.grade !== 'PK' && child.grade !== 'K';
  // It is remembered by the question it was opened on, so nothing has to run to close it: a tap on the
  // pencil in the instant a question appears can never be undone by a late reset.
  const [drawingOn, setDrawingOn] = useState<string | null>(null);
  const drawing = questionId !== null && drawingOn === questionId;
  const setDrawing = (open: boolean): void => setDrawingOn(open ? questionId : null);
  // A hint is remembered by its question in the same way. No hint during the short test on a new skill.
  const hints = practice.hints;
  const [hintOn, setHintOn] = useState<string | null>(null);
  const hinting = questionId !== null && hintOn === questionId && phase === 'asking';
  const openHint = (): void => {
    if (questionId !== null && hints?.take(questionId)) setHintOn(questionId);
  };
  const closeHint = (): void => {
    stop();
    setHintOn(null);
  };

  // The games are offered when a skill is mastered, and between the picks of a Play run.
  // Pop needs a skill in progress whose next question is a choice.
  const [popOffered, setPopOffered] = useState(false);
  useEffect(() => {
    if (phase !== 'break' && phase !== 'celebrating') return;
    let alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const found = popSkills(child, await repo.getSkillStates(child.id)).length > 0;
      if (alive) setPopOffered(found);
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, [phase, child]);
  // The skill's plant, in the status panel and in the growth show at the end of the sitting (game feel, phase 5).
  const kind = useMemo(() => plantKindFor(skill), [skill]);
  const stage = state ? growthStage(state.score, state.masteredAt !== null) : 0;

  // The growth show ends a sitting: on the break card, or on the medal at 100. Its last fact is this week's sunny
  // days, counted from the answers saved since a week ago.
  const ending = phase === 'break' || (phase === 'celebrating' && practice.milestone === 100);
  const [sunny, setSunny] = useState<boolean[] | null>(null);
  useEffect(() => {
    if (!ending) return;
    let alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const since = new Date(now().getTime() - 8 * 86_400_000).toISOString();
      const days = answersByDay(await repo.listAttempts(child.id, { since }));
      if (alive) setSunny(sunnyDays(days, now()).week);
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, [ending, child]);
  const growth: GrowthInfo | null = kind && state ? { who: friend, kind, from: practice.startStage, to: stage, right: practice.right, score: state.score, sunny } : null;

  const games = { onPop: popOffered ? () => void navigate('/games/pop', { replace: true }) : null, onPairs: () => void navigate('/games/pairs', { replace: true }) };

  return (
    <KidScreen
      bar={
        <>
          <HoldButton icon="home" label="Back to home" onHeld={goHome} />
          <div className={styles.title}>
            <span className={styles.where}>
              {SUBJECTS.find((subject) => subject.id === skill.subject)?.label}
              {skill.grade in GRADE_NAME && skill.subject !== 'reasoning' ? ` · ${GRADE_NAME[skill.grade]}` : ''}
            </span>
            <h1 className={styles.skill}>
              <span className={styles.code}>{skill.code}</span> {skill.name}
            </h1>
          </div>
          <span className={styles.spacer} />
          {canDraw && question && phase === 'asking' && <IconButton icon="pencil" label="Open the scratchpad" onClick={() => setDrawing(true)} />}
          {hints && question && questionId !== null && asking && (
            <HintButton left={hints.left} open={hints.opened(questionId)} disabled={phase !== 'asking' || !hints.canOpen(questionId)} onOpen={openHint} />
          )}
          <IconButton icon="bulb" label="Learn this skill" onClick={() => void navigate(`/skill/${skill.id}/learn${run ? `?run=${Math.max(run.left - practice.answered, 1)}` : ''}`, { replace: true })} />
        </>
      }
      side={
        state && (
          <>
            <StatusPanel answered={practice.answered} score={state.score} attempts={state.attempts} placedOut={state.placedOut} seconds={child.settings.showTimer ? seconds : null} plant={kind ? { kind, stage } : null} />
            <PracticeFriend who={friend} questionKey={questionId} phase={phase} />
          </>
        )
      }
    >
      {phase === 'loading' && <p className={styles.wait} aria-busy="true" aria-label="Getting ready" />}
      {phase === 'failed' && (
        <>
          <Notice role="alert">This skill could not be opened. Go back and try again.</Notice>
          <BigButton size="kid" onClick={goHome}>
            <Icon name="home" />Back
          </BigButton>
        </>
      )}
      {question && asking && (
        <QuestionStage
          question={question}
          phase={phase}
          run={practice.run}
          response={practice.response}
          lastResponse={practice.lastResponse}
          saveError={practice.saveError}
          onChange={onChange}
          onSubmit={() => practice.submit()}
          onGotIt={practice.gotIt}
          onSpeak={say}
        />
      )}
      {phase === 'celebrating' && practice.milestone !== null && (
        <Celebration
          milestone={practice.milestone}
          skillName={skill.name}
          onNextLesson={practice.milestone === PART2_AT_SCORE && teachingPart2For(skill.id) ? () => void navigate(`/skill/${skill.id}/learn?part=2`, { replace: true }) : undefined}
          onDone={practice.milestone === 100 ? finish : practice.afterCelebration} games={games} growth={growth} />
      )}
      {phase === 'skipped' && (
        <FullScreenCard emoji="🚀" title="You know this one!" line={`${skill.name}: no need to practise it.`} name="skipped">
          <BigButton size="kid" onClick={finish}>
            <Icon name="next" />
            {play || run ? "Next one" : "Home"}
          </BigButton>
        </FullScreenCard>
      )}
      {phase === 'break' && <SoftBreak answered={practice.answered} score={state?.score ?? 0} keepGoingLabel={play ? 'Next one' : 'Keep going'} onKeepGoing={play ? play.onNext : practice.keepGoing} onAllDone={goHome} games={games} growth={growth} />}
      {drawing && phase === 'asking' && <Scratchpad onClose={() => setDrawing(false)} />}
      {hinting && question && <HintPanel question={question} who={friend} onClose={closeHint} onSpeak={say} />}
    </KidScreen>
  );
}
