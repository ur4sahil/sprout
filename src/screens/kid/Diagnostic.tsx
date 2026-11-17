import Icon from '../../components/Icon';
import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { stickerFor } from '../../app/awardsRun';
import { SUBJECT_NAME } from '../../app/checkIn';
import { useAppStore } from '../../app/store';
import { DONT_KNOW, useDiagnostic } from '../../app/useDiagnostic';
import { useWakeLock } from '../../app/useWakeLock';
import { speak, stop } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import HoldButton from '../../components/HoldButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import QuestionStage from '../../components/QuestionStage';
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
  const say = (text: Say): void => void speak(text, rate);
  const home = (): void => void navigate('/home', { replace: true });
  useWakeLock();

  const questionId = question ? `${question.key}|${question.seed}` : null;
  useEffect(() => {
    if (!question || !child.settings.autoSpeak) return;
    void speak(question.prompt.speak, rate);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one reading for each question shown
  }, [questionId]);

  const over = phase === 'sittingOver' || phase === 'done';
  useEffect(() => {
    if (phase === 'sittingOver') void speak(['All done for today. Here is a sticker.'], rate);
    if (phase === 'done') void speak(['The check-in is finished. Here is a sticker.'], rate);
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
