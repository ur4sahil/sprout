import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { unlockAudio } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import KidScreen from '../../components/KidScreen';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import TileButton from '../../components/TileButton';
import { daysBetween, localDayOf, now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child } from '../../storage/schema';
import ChildSetup from '../parent/ChildSetup';
import styles from './ProfilePicker.module.css';

const REMIND_DAYS = 5;

// Who is playing? One big avatar button for each child.
export default function ProfilePicker() {
  const navigate = useNavigate();
  const setChild = useAppStore((s) => s.setChild);
  const account = useAppStore((s) => s.account);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setChild(null);
    void (async () => {
      try {
        const list = await (await openRepo()).repo.listChildren();
        if (alive) setChildren(list);
      } catch (error) {
        logError(error);
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [setChild, adding]);

  function pick(child: Child): void {
    // The first speech and sound must start inside a tap, or an iPad stays silent.
    void unlockAudio();
    void speak(['Hi', { word: child.name }], child.settings.speechRate);
    setChild(child);
    void navigate('/home', { replace: true });
  }

  if (adding) return <ChildSetup onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />;

  const daysLeft = account.status === 'signedIn' ? daysBetween(now().toISOString(), account.expiresAt) : null;

  return (
    <KidScreen>
      <div className={styles.mark} aria-hidden="true">
        🌱
      </div>
      <h1 className={styles.title}>Sprout</h1>
      {failed && <Notice role="alert">The saved profiles could not be read. Close the app and open it again.</Notice>}
      {children !== null && children.length > 0 && (
        <div className={styles.children} role="group" aria-label="Who is playing?">
          {children.map((child) => (
            <TileButton key={child.id} label={child.name} onClick={() => pick(child)}>
              <span className={styles.avatar} aria-hidden="true">
                {child.avatar}
              </span>
              <span>{child.name}</span>
            </TileButton>
          ))}
        </div>
      )}
      {children !== null && children.length === 0 && (
        <BigButton size="kid" onClick={() => setAdding(true)}>
          Add a child
        </BigButton>
      )}
      <div className={styles.grownUps}>
        {children !== null && children.length > 0 && <LinkButton onClick={() => setAdding(true)}>Add a child</LinkButton>}
        {account.status === 'signedIn' && daysLeft !== null && daysLeft <= REMIND_DAYS && (
          <p className={styles.small} data-signin-reminder="">
            Grown-ups: sign in again by {localDayOf(account.expiresAt)}.
          </p>
        )}
      </div>
    </KidScreen>
  );
}
