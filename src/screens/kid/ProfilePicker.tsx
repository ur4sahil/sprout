import Art from '../../visuals/Art';
import Icon from '../../components/Icon';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasPass } from '../../app/pin';
import { useAppStore } from '../../app/store';
import { unlockAudio } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import KidScreen from '../../components/KidScreen';
import Notice from '../../components/Notice';
import ProfileCard, { AddProfileCard } from '../../components/ProfileCard';
import { daysBetween, localDay, localDayOf, now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { failureMessage, signOut } from '../../storage/account';
import { openRepo } from '../../storage/index';
import type { Child } from '../../storage/schema';
import ChildSetup from '../parent/ChildSetup';
import Gate from '../parent/Gate';
import { GRADE_NAME } from './Home';
import styles from './ProfilePicker.module.css';

const REMIND_DAYS = 5;

// Who is playing? One big avatar button for each child.
export default function ProfilePicker() {
  const navigate = useNavigate();
  const setChild = useAppStore((s) => s.setChild);
  const account = useAppStore((s) => s.account);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const [children, setChildren] = useState<Child[] | null>(null);
  // What a grown-up asked for. Both need the PIN first.
  const [asking, setAsking] = useState<'add' | 'signOut' | null>(null);
  const adding = asking === 'add';
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState<string | null>(null);
  // Questions each child has answered today, for the bar on their card.
  const [today, setToday] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  const [passed, setPassed] = useState(0);

  useEffect(() => {
    let alive = true;
    setChild(null);
    void (async () => {
      try {
        const { repo } = await openRepo();
        const list = await repo.listChildren();
        const day = localDay(now());
        const counts: Record<string, number> = {};
        for (const child of list) {
          // Yesterday onward is enough to find today's answers in any time zone.
          const recent = await repo.listAttempts(child.id, { since: new Date(now().getTime() - 36 * 3_600_000).toISOString() });
          counts[child.id] = recent.filter((attempt) => attempt.day === day).length;
        }
        if (alive) {
          setChildren(list);
          setToday(counts);
        }
      } catch (error) {
        logError(error);
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
    // Read again when another device's children arrive.
  }, [setChild, adding, dataVersion]);

  // Past the gate, signing out happens at once. The app then shows the sign-in screen.
  const signOutNow = asking === 'signOut' && hasPass();
  useEffect(() => {
    if (!signOutNow) return;
    setAsking(null);
    setSigningOut(true);
    void signOut().then((result) => {
      setSigningOut(false);
      setSignOutFailed(result.ok ? null : failureMessage(result.reason));
    });
  }, [signOutNow, passed]);

  function pick(child: Child): void {
    // The first speech and sound must start inside a tap, or an iPad stays silent.
    void unlockAudio();
    void speak(['Hi', { word: child.name }], child.settings.speechRate);
    setChild(child);
    // The one entry kid navigation adds. Everything after it replaces, so a Back press
    // or a swipe from the edge has nowhere to go but here, and the app puts the child back.
    void navigate('/home');
  }

  // Adding a child and signing out are for grown-ups: the PIN gate comes first, unless a grown-up passed it in the last few minutes.
  if (asking !== null && !hasPass()) return <Gate onPass={() => setPassed((n) => n + 1)} onCancel={() => setAsking(null)} />;
  if (adding) return <ChildSetup onDone={() => setAsking(null)} onCancel={() => setAsking(null)} />;
  const daysLeft = account.status === 'signedIn' ? daysBetween(now().toISOString(), account.expiresAt) : null;

  return (
    <KidScreen>
      <div className={styles.page}>
        <h1 className={styles.brand}>
          <Art emoji="🌱" />
          Sprout
        </h1>
        {failed && <Notice role="alert">The saved profiles could not be read. Close the app and open it again.</Notice>}
        {signOutFailed && <Notice role="alert">{signOutFailed}</Notice>}
        {children !== null && <p className={styles.ask}>{children.length > 0 ? 'Who is learning today?' : 'Add your first child to begin.'}</p>}
        {children !== null && (
          <div className={styles.children} role="group" aria-label="Who is playing?">
            {children.map((child) => (
              <ProfileCard key={child.id} name={child.name} avatar={child.avatar} grade={GRADE_NAME[child.grade] ?? child.grade} done={today[child.id] ?? 0} goal={child.settings.dailyGoalQuestions} onClick={() => pick(child)} />
            ))}
            <AddProfileCard onClick={() => setAsking('add')} />
          </div>
        )}
        <div className={styles.bar} role="group" aria-label="For grown-ups">
          <BigButton onClick={() => void navigate('/parent/dashboard')}>
            <Icon name="lock" />Grown-ups
          </BigButton>
          <BigButton tone="quiet" disabled={signingOut} onClick={() => setAsking('signOut')}>
            Sign out
          </BigButton>
          {account.status === 'signedIn' && daysLeft !== null && daysLeft <= REMIND_DAYS && (
            <p className={styles.small} data-signin-reminder="">
              Grown-ups: sign in again by {localDayOf(account.expiresAt)}.
            </p>
          )}
        </div>
      </div>
    </KidScreen>
  );
}
