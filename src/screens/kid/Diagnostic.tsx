import { LINES } from '../../audio/lines';
import Icon from '../../components/Icon';
import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { stickerFor } from '../../app/awardsRun';
import { SUBJECT_NAME } from '../../app/checkIn';
import { useAppStore } from '../../app/store';
import { DONT_KNOW, useDiagnostic } from '../../app/useDiagnostic';
import { useWakeLock } from '../../app/useWakeLock';
import { speak, stop } from '../../audio/speech';
import { warm, warmAll } from '../../audio/voice';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import HoldButton from '../../components/HoldButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import QuestionStage from '../../components/QuestionStage';
import { voiceFor } from '../../cast';
import type { Say } from '../../engine/types';
import type { Child, DiagnosticSubject } from '../../storage/schema';
import styles from './ReviewSession.module.css';

// The placement check-in, one short sitting at a time (plan section 7).
export default function Diagnostic() {
  const child = useAppStore((s) => s.child);
  const [params] = useSearchParams();
  if (!child) return <Navigate to="/" replace />;
  const subject: DiagnosticSubject = params.get('subject') === 'ela' ? 'ela' : 'math';
  return <Sitting key={`${child.id}|${subject}`} child={child} subject={subject} />;
}

function Sitting({ child, subject }: { child: Child; subject: DiagnosticSubject }) {
  const navigate = useNavigate();
  const diagnostic = useDiagnostic(child, subject);
  const { phase, question } = diagnostic;
  const rate = child.settings.speechRate;
  // The check-in's questions are said by the subject's friend once the server speaks with the new voices, by Sprout
  // until then; its closing sticker lines by Sprout (plan section 20).
  const voice = voiceFor(subject);
  const say = (text: Say): void => void speak(text, rate, 'normal', voice);
  const home = (): void => void navigate('/home', { replace: true });
  useWakeLock();

  const questionId = question ? `${question.key}|${question.seed}` : null;
  useEffect(() => {
    if (!question) return;
    // The recorded voice is fetched as the question appears, whether or not the speaker is tapped.
    warm(question.prompt.speak, 'normal', voice);
    if (!child.settings.autoSpeak) return;
    void speak(question.prompt.speak, rate, 'normal', voice);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one reading for each question shown
  }, [questionId]);

  // The closing lines are asked for at the start, so they are ready when a sitting ends.
  useEffect(() => {
    warmAll([LINES.checkInSitting, LINES.checkInDone]);
  }, []);

  const over = phase === 'sittingOver' || phase === 'done';
  useEffect(() => {
    if (phase === 'sittingOver') void speak(LINES.checkInSitting, rate);
    if (phase === 'done') void speak(LINES.checkInDone, rate);
  }, [phase, rate]);

  return (
    <KidScreen
      bar={
        <>
          <HoldButton icon="home" label="Back to home" onHeld={home} />
          <h1 className={styles.title}>
            <Icon name="compass" />Check-in: {SUBJECT_NAME[subject]}
          </h1>
        </>
      }
      side={
        <p className={styles.count} data-check-in-count="">
          {diagnostic.asked}
        </p>
      }
    >
      {phase === 'loading' && <p className={styles.wait} aria-busy="true" aria-label="Getting ready" />}
      {phase === 'failed' && <Notice role="alert">The check-in could not be opened. Go back and try again.</Notice>}
      {question && (phase === 'asking' || phase === 'saving') && (
        <>
          <QuestionStage
            question={question}
            phase={phase}
            response={diagnostic.response}
            lastResponse={null}
            saveError={diagnostic.saveError}
            onChange={diagnostic.setResponse}
            onSubmit={diagnostic.submit}
            onGotIt={() => undefined}
            onSpeak={say}
          />
          <BigButton size="kid" disabled={phase !== 'asking'} onClick={diagnostic.dontKnow}>
            <Icon name="question" />
            {DONT_KNOW}
          </BigButton>
          {/* Before the first answer, a child or a grown-up can put the check-in off. Home offers it again. */}
          {diagnostic.asked === 0 && (
            <BigButton size="kid" disabled={phase !== 'asking'} onClick={home}>
              <Icon name="skip" />Skip for now
            </BigButton>
          )}
        </>
      )}
      {over && (
        <FullScreenCard
          emoji={stickerFor(`${subject}:${diagnostic.asked}`)}
          title={phase === 'done' ? 'Check-in finished' : 'All done for today'}
          line={phase === 'done' ? 'Now Sprout knows where to start.' : 'Here is a sticker. There is more another day.'}
          name={phase === 'done' ? 'check-in-done' : 'sitting-over'}
        >
          <BigButton size="kid" onClick={home}>
            <Icon name="home" />Home
          </BigButton>
        </FullScreenCard>
      )}
    </KidScreen>
  );
}
