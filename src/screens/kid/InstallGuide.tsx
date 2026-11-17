import Icon from '../../components/Icon';
import { useState } from 'react';
import BigButton from '../../components/BigButton';
import KidScreen from '../../components/KidScreen';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import styles from './InstallGuide.module.css';

interface Props {
  onUseBrowser: () => Promise<void>;
}

// In a Safari tab on an iPad or iPhone, this is the only screen. Anything made in the tab
// would be left behind once the app is installed, because the Home Screen app has its own storage.
export default function InstallGuide({ onUseBrowser }: Props) {
  const [warned, setWarned] = useState(false);
  const [failed, setFailed] = useState(false);

  async function carryOn(): Promise<void> {
    try {
      await onUseBrowser();
    } catch {
      setFailed(true);
    }
  }

  return (
    <KidScreen>
      <div className={styles.mark} aria-hidden="true">
        🌱
      </div>
      <h1 className={styles.title}>Add Sprout to the Home Screen</h1>
      <p className={styles.lead}>Sprout works as an app. It takes three taps, and then it opens from its own icon.</p>
      <ol className={styles.steps}>
        <li className={styles.step}>
          <svg className={styles.icon} viewBox="0 0 48 48" role="img" aria-label="The Share button: a square with an arrow pointing up">
            <path d="M14 20 H10 V42 H38 V20 H34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M24 30 V6 M16 13 L24 5 L32 13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <span>
            Tap the <strong>Share</strong> button in Safari.
          </span>
        </li>
        <li className={styles.step}>
          <svg className={styles.icon} viewBox="0 0 48 48" role="img" aria-label="Add to Home Screen: a square with a plus sign">
            <rect x="7" y="7" width="34" height="34" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M24 15 V33 M15 24 H33" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span>
            Scroll down and tap <strong>Add to Home Screen</strong>.
          </span>
        </li>
        <li className={styles.step}>
          <Icon name="sprout" />
          <span>
            Tap <strong>Add</strong>, then open Sprout from its new icon.
          </span>
        </li>
      </ol>
      {failed && <Notice role="alert">That did not work. Please try again.</Notice>}
      {warned ? (
        <div className={styles.warning}>
          <Notice role="alert">Anything you set up in this browser tab will not appear in the installed app. Only carry on here for testing.</Notice>
          <BigButton onClick={() => void carryOn()}>Carry on in this browser</BigButton>
        </div>
      ) : (
        <LinkButton onClick={() => setWarned(true)}>Use in this browser anyway</LinkButton>
      )}
    </KidScreen>
  );
}
