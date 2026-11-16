import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, useRoutes } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import Notice from '../components/Notice';
import SignIn from '../screens/account/SignIn';
import InstallGuide from '../screens/kid/InstallGuide';
import { loadClipKeys, syncVoicePack } from '../audio/clips';
import { setMuted } from '../audio/mute';
import { logError } from '../lib/errorLog';
import { needsInstallGuide } from '../lib/platform';
import { checkSession } from '../storage/account';
import { keepErrorsInDeviceRecord, openRepo, requestPersistence } from '../storage/index';
import styles from './App.module.css';
import { routes } from './routes';
import { useAppStore } from './store';

export default function App() {
  const navigate = useNavigate();
  // The kid lock for the Back button and the swipe from the left edge. While a child is playing,
  // a step back in history is never drawn: the screen stays as it was, and the app steps forward again.
  const location = useLocation();
  const how = useNavigationType();
  const childActive = useAppStore((s) => s.child !== null);
  const [held, setHeld] = useState(location);
  const steppedBack = how === 'POP' && childActive && location.key !== held.key;
  if (!steppedBack && held !== location) setHeld(location);
  const screen = useRoutes(routes, steppedBack ? held : location);
  const status = useAppStore((s) => s.account.status);

  const storageSaved = useAppStore((s) => s.storageSaved);
  const installGuide = useAppStore((s) => s.installGuide);

  // A parent chose "Use in this browser anyway". Remembered on this device.
  async function useBrowser(): Promise<void> {
    const { repo } = await openRepo();
    await repo.saveDeviceState({ ...(await repo.getDeviceState()), browserModeAccepted: true });
    useAppStore.getState().setInstallGuide(false);
  }

  useEffect(() => {
    if (useAppStore.getState().account.status !== 'checking') return;
    void (async () => {
      try {
        const { repo, saved } = await openRepo();
        useAppStore.getState().setStorageSaved(saved);
        await keepErrorsInDeviceRecord(repo);
        const device = await repo.getDeviceState();
        setMuted(device.muted);
        useAppStore.getState().setInstallGuide(needsInstallGuide() && !device.browserModeAccepted);
        await loadClipKeys();
        await checkSession();
        await requestPersistence(repo);
      } catch (error) {
        logError(error);
        useAppStore.getState().setAccount({ status: 'signedOut', offline: false });
      }
    })();
  }, []);

  useEffect(() => {
    if (steppedBack) void navigate(1);
  }, [steppedBack, location, navigate]);

  // Once signed in, fetch the voice pack in the background if this device does not have the current one.
  // The app never waits for it: until it arrives, the device voice says everything.
  useEffect(() => {
    if (status === 'signedIn') void syncVoicePack();
  }, [status]);

  // The sign-in guard: without a session nothing else can be reached, on any path.
  let content = screen;
  if (status === 'checking') {
    content = (
      <main className={styles.splash} aria-busy="true" aria-label="Starting Sprout">
        <span aria-hidden="true">🌱</span>
      </main>
    );
  } else if (installGuide) {
    // First of all, before sign-in: in a Safari tab on an iPad or iPhone, only the install guide.
    content = <InstallGuide onUseBrowser={useBrowser} />;
  } else if (status === 'signedOut') {
    content = <SignIn />;
  }

  return (
    <div className={styles.shell}>
      {!storageSaved && (
        <Notice role="status" banner>
          Progress will not be saved on this device.
        </Notice>
      )}
      <ErrorBoundary onHome={() => navigate('/')}>{content}</ErrorBoundary>
    </div>
  );
}
