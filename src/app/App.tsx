import Art from '../visuals/Art';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, useRoutes } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import Notice from '../components/Notice';
import ChoosePin from '../screens/parent/ChoosePin';
import SignIn from '../screens/account/SignIn';
import InstallGuide from '../screens/kid/InstallGuide';
import { removeOldClips } from '../audio/clips';
import { setMuted } from '../audio/mute';
import { CATALOGUE_VERSION } from '../content/catalogue';
import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { needsInstallGuide } from '../lib/platform';
import { checkSession, inviteToken, resetToken } from '../storage/account';
import { keepErrorsInDeviceRecord, openRepo, requestPersistence, syncFamily, watchSync } from '../storage/index';
import type { SyncResult } from '../storage/sync';
import styles from './App.module.css';
import { runCatalogueGrowth } from './checkIn';
import { applyChildFeel, startTouchSounds } from './feel';
import { hasPin } from './pin';
import { routes } from './routes';
import { finishUpdate, isSafeToUpdate, startUpdates, watchForUpdates } from './updates';
import { useAppStore } from './store';

// A run is not started more often than this, however many screens are passed through.
const RUN_GAP_MS = 10_000;
const RETRY_MS = 30_000;
const lastRun = { at: 0 };

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

  // How the app feels follows the child who is playing: their world, Calm mode, and a sound under every touch.
  const child = useAppStore((s) => s.child);
  useEffect(() => applyChildFeel(child), [child]);
  useEffect(() => startTouchSounds(), []);

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
        const device = await repo.getDeviceState();
        setMuted(device.muted);
        useAppStore.getState().setInstallGuide(needsInstallGuide() && !device.browserModeAccepted);
        await checkSession();
        await requestPersistence(repo);
      } catch (error) {
        logError(error);
        useAppStore.getState().setAccount({ status: 'signedOut', offline: false });
      }
    })();
  }, []);

  // Offline use and updates. The service worker exists only in a built app.
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    void startUpdates();
    return watchForUpdates();
  }, []);
  // The server has a newer build than this page (the owner's choice: always the newest). The page loads
  // again from the server on the profile picker or home, never in the middle of a question.
  const newerBuild = useAppStore((s) => s.newerBuild);
  useEffect(() => {
    if (steppedBack || !isSafeToUpdate(location.pathname)) return;
    if (newerBuild) finishUpdate();
  }, [newerBuild, steppedBack, location.pathname]);

  useEffect(() => {
    if (steppedBack) void navigate(1);
  }, [steppedBack, location, navigate]);

  // The old voice pack is no longer used: any clips left on this device are removed in the background.
  useEffect(() => {
    void removeOldClips();
  }, []);

  // The device keeps a copy of the family's records, so the app opens at once, with or without the
  // internet. The server holds the main copy: a run fetches what other devices saved and sends what
  // this one has waiting.
  const link = useAppStore((s) => s.link);
  const dataVersion = useAppStore((s) => s.dataVersion);
  useEffect(() => {
    // Every run, whoever started it, says how it went.
    watchSync((result: SyncResult) => {
      const store = useAppStore.getState();
      // A run the server refused changes nothing here. Whether the device is still signed in is
      // settled by the sign-in check alone: the app stays open this launch and locks at the next.
      if (result.outcome === 'signedOut') return;
      if (result.changed) store.bumpData();
      // 'waiting' is ended only by the first run below, never by a send in the background.
      if (store.link !== 'waiting') store.setLink(result.outcome === 'offline' ? 'offline' : 'ready');
    });
    return () => watchSync(null);
  }, []);

  useEffect(() => {
    if (status !== 'signedIn') return;
    let alive = true;
    void (async () => {
      const { repo } = await openRepo();
      // A device that has never fetched the family's records waits for them: an empty picker
      // would look as if everything was gone. Any other device opens straight away.
      const first = (await repo.getDeviceState()).lastSyncAt === null && import.meta.env.MODE !== 'test';
      useAppStore.getState().setLink(first ? 'waiting' : 'ready');
      const result = await syncFamily();
      // New skills below a child's saved placement are placed out, once for each catalogue version.
      await runCatalogueGrowth(repo, CATALOGUE_VERSION, now().toISOString()).catch(logError);
      if (alive && useAppStore.getState().account.status === 'signedIn') useAppStore.getState().setLink(result.outcome === 'offline' ? 'offline' : 'ready');
    })().catch((error: unknown) => {
      logError(error);
      useAppStore.getState().setLink('ready');
    });
    return () => {
      alive = false;
    };
  }, [status]);

  // The device says when it loses the network and when it finds it again. While it is offline,
  // the app also tries by itself every half minute.
  useEffect(() => {
    if (status !== 'signedIn') return;
    const lost = (): void => {
      if (useAppStore.getState().link === 'ready') useAppStore.getState().setLink('offline');
    };
    const found = (): void => void syncFamily();
    window.addEventListener('offline', lost);
    window.addEventListener('online', found);
    const retry = link === 'offline' ? setInterval(() => void syncFamily(), RETRY_MS) : null;
    return () => {
      window.removeEventListener('offline', lost);
      window.removeEventListener('online', found);
      if (retry) clearInterval(retry);
    };
  }, [status, link]);

  // Another device may have saved something. A run starts when the app comes back to the front and
  // whenever the child is back on the picker or home, never in the middle of a question.
  const quietScreen = !steppedBack && isSafeToUpdate(location.pathname);
  useEffect(() => {
    if (status !== 'signedIn' || link === 'waiting' || !quietScreen) return;
    const again = (): void => {
      if (now().getTime() - lastRun.at < RUN_GAP_MS) return;
      lastRun.at = now().getTime();
      void syncFamily();
    };
    again();
    const onShow = (): void => {
      if (document.visibilityState === 'visible') again();
    };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [status, link, quietScreen, location.pathname]);

  useEffect(() => {
    if (status !== 'signedIn' || link === 'waiting') return;
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
  }, [status, link, location.pathname, dataVersion]);

  // The sign-in guard: without a session nothing else can be reached, on any path.
  let content = screen;
  if (status === 'checking') {
    content = (
      <main className={styles.splash} aria-busy="true" aria-label="Starting Sprout">
        <Art emoji="🌱" />
      </main>
    );
  } else if (installGuide && !(status === 'signedOut' && (inviteToken(location) || resetToken(location)))) {
    // First of all, before sign-in: in a Safari tab on an iPad or iPhone, only the install guide. An invite link
    // is the one exception: the account is made in the tab, since the installed app opens without the link.
    content = <InstallGuide onUseBrowser={useBrowser} />;
  } else if (status === 'signedOut') {
    content = <SignIn />;
  } else if (link === 'waiting') {
    content = (
      <main className={styles.splash} aria-busy="true" aria-label="Getting your family's progress">
        <Art emoji="🌱" />
      </main>
    );
  } else if (pinNeeded === true) {
    content = <ChoosePin onDone={() => setPinNeeded(false)} />;
  }

  return (
    <div className={styles.shell}>
      {!storageSaved && (
        <Notice role="status" banner>
          Progress will not be kept on this device. It is still saved online while the internet is on.
        </Notice>
      )}
      {status === 'signedIn' && link === 'offline' && (
        <Notice role="status" banner>
          No internet. Progress is saved on this device and will be sent when the internet is back.
        </Notice>
      )}
      <ErrorBoundary onHome={() => navigate('/')}>{content}</ErrorBoundary>
    </div>
  );
}
