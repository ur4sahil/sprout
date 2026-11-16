import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, useRoutes } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import Notice from '../components/Notice';
import FirstSync from '../screens/account/FirstSync';
import ChoosePin from '../screens/parent/ChoosePin';
import SignIn from '../screens/account/SignIn';
import InstallGuide from '../screens/kid/InstallGuide';
import { loadClipKeys, syncVoicePack } from '../audio/clips';
import { setMuted } from '../audio/mute';
import { CATALOGUE_VERSION } from '../content/catalogue';
import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { needsInstallGuide } from '../lib/platform';
import { checkSession } from '../storage/account';
import { keepErrorsInDeviceRecord, openRepo, requestPersistence } from '../storage/index';
import styles from './App.module.css';
import { runCatalogueGrowth } from './checkIn';
import { hasPin } from './pin';
import { routes } from './routes';
import { applyUpdate, checkForUpdate, finishUpdate, isSafeToUpdate, startUpdates } from './updates';
import { syncIfDue } from '../storage/sync';
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
  // The family's grown-ups PIN. A family that has none yet chooses one before the profile picker.
  const [pinNeeded, setPinNeeded] = useState<boolean | null>(null);
  const installGuide = useAppStore((s) => s.installGuide);

  // A parent chose "Use in this browser anyway". Remembered on this device.
  async function useBrowser(): Promise<void> {
    const { repo } = await openRepo();
    await repo.updateDeviceState({ browserModeAccepted: true });
    useAppStore.getState().setInstallGuide(false);
  }

  useEffect(() => {
    if (useAppStore.getState().account.status !== 'checking') return;
    void (async () => {
      try {
        const { repo, saved } = await openRepo();
        useAppStore.getState().setStorageSaved(saved);
        await keepErrorsInDeviceRecord(repo);
        // New skills below a child's saved placement are placed out, once for each catalogue version.
        await runCatalogueGrowth(repo, CATALOGUE_VERSION, now().toISOString()).catch(logError);
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

  // Offline use and updates. The service worker exists only in a built app.
  const updateReady = useAppStore((s) => s.updateReady);
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    void startUpdates();
    const onShow = (): void => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, []);
  // A waiting version is applied on the profile picker or home, never in the middle of a question.
  const updateTookOver = useAppStore((s) => s.updateTookOver);
  useEffect(() => {
    if (steppedBack || !isSafeToUpdate(location.pathname)) return;
    if (updateTookOver) finishUpdate();
    else if (updateReady) applyUpdate();
  }, [updateReady, updateTookOver, steppedBack, location.pathname]);

  useEffect(() => {
    if (steppedBack) void navigate(1);
  }, [steppedBack, location, navigate]);

  // Once signed in, fetch the voice pack in the background if this device does not have the current one.
  // The app never waits for it: until it arrives, the device voice says everything.
  useEffect(() => {
    if (status === 'signedIn') void syncVoicePack();
  }, [status]);

  // Backup sync, in the background: at launch, when a session ends (the child is back on the picker or home)
  // and when the app returns to the front. At most once every 5 minutes, and never in the middle of a question.
  const firstSync = useAppStore((s) => s.firstSync);
  const quietScreen = !steppedBack && isSafeToUpdate(location.pathname);
  useEffect(() => {
    // An update goes first, by itself: a request on its way would hold up the hand-over to the new version.
    // The page then loads again, and the launch sync runs.
    if (status !== 'signedIn' || firstSync || !quietScreen || updateReady || updateTookOver) return;
    syncIfDue();
    const onShow = (): void => {
      if (document.visibilityState === 'visible') syncIfDue();
    };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [status, firstSync, quietScreen, updateReady, updateTookOver, location.pathname]);

  useEffect(() => {
    if (status !== 'signedIn' || firstSync) return;
    let alive = true;
    void openRepo()
      .then(({ repo }) => repo.getFamily())
      .then((family) => {
        if (alive) setPinNeeded(!hasPin(family));
      })
      .catch((error: unknown) => {
        logError(error);
        if (alive) setPinNeeded(false);
      });
    return () => {
      alive = false;
    };
  }, [status, firstSync, location.pathname]);

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
  } else if (firstSync) {
    content = <FirstSync />;
  } else if (pinNeeded === true) {
    content = <ChoosePin onDone={() => setPinNeeded(false)} />;
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
