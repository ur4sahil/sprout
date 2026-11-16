import { useEffect } from 'react';
import { useNavigate, useRoutes } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import Notice from '../components/Notice';
import SignIn from '../screens/account/SignIn';
import { loadClipKeys, syncVoicePack } from '../audio/clips';
import { setMuted } from '../audio/mute';
import { logError } from '../lib/errorLog';
import { checkSession } from '../storage/account';
import { keepErrorsInDeviceRecord, openRepo, requestPersistence } from '../storage/index';
import styles from './App.module.css';
import { routes } from './routes';
import { useAppStore } from './store';

export default function App() {
  const navigate = useNavigate();
  const screen = useRoutes(routes);
  const status = useAppStore((s) => s.account.status);

  const storageSaved = useAppStore((s) => s.storageSaved);

  useEffect(() => {
    if (useAppStore.getState().account.status !== 'checking') return;
    void (async () => {
      try {
        const { repo, saved } = await openRepo();
        useAppStore.getState().setStorageSaved(saved);
        await keepErrorsInDeviceRecord(repo);
        setMuted((await repo.getDeviceState()).muted);
        await loadClipKeys();
        await checkSession();
        await requestPersistence(repo);
      } catch (error) {
        logError(error);
        useAppStore.getState().setAccount({ status: 'signedOut', offline: false });
      }
    })();
  }, []);

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
