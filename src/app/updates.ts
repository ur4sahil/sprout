import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { useAppStore } from './store';

// Keeps the installed app up to date without ever interrupting anyone.
// A Home Screen app can stay open for days, so it looks for a new version at launch and each time
// it comes back to the front, at most once an hour. A new version is fetched in the background and
// waits. It is never applied by itself: the app shows "A new version of Sprout is ready" with an
// "Update now" button on the profile picker, home and sign-in screens, and applies it when that is pressed.
// Loading the page again, once the new version has taken over, also waits for one of those screens.

export const CHECK_EVERY_MS = 3_600_000;
const SAFE_SCREENS = new Set(['/', '/home']);

// The parts of the browser this needs. Tests pass stand-ins.
export interface UpdateDeps {
  container: ServiceWorkerContainer | undefined;
  reload: () => void;
}

const browserDeps = (): UpdateDeps => ({
  container: typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
  reload: () => window.location.reload(),
});

let deps: UpdateDeps | null = null;
let registration: ServiceWorkerRegistration | null = null;
let lastCheckAt = 0;
let applying = false;

export function isSafeToUpdate(pathname: string): boolean {
  return SAFE_SCREENS.has(pathname);
}

function noteWaiting(): void {
  // With no worker in control yet this is the very first install, not an update.
  if (registration?.waiting && deps?.container?.controller) useAppStore.getState().setUpdateReady(true);
}

// Registers the service worker and starts watching for a new version. Safe to call more than once.
export async function startUpdates(use: UpdateDeps = browserDeps(), url = '/sw.js'): Promise<void> {
  if (registration || !use.container) return;
  deps = use;
  const container = use.container;
  try {
    const found = await container.register(url, { scope: '/' });
    registration = found;
    lastCheckAt = now().getTime();
    noteWaiting();
    found.addEventListener('updatefound', () => {
      const incoming = found.installing;
      incoming?.addEventListener('statechange', () => {
        if (incoming.state === 'installed') noteWaiting();
      });
    });
    // The new version has taken over, because the app asked it to. A browser can take a while to hand over
    // (it lets requests already on their way finish first), and by then a child may be in a question.
    // So the page is not loaded again here: the app does that on the next safe screen (finishUpdate).
    container.addEventListener('controllerchange', () => {
      if (!applying) return;
      applying = false;
      useAppStore.getState().setUpdateReady(false);
      useAppStore.getState().setUpdateTookOver(true);
    });
  } catch (error) {
    // Without a service worker the app still runs, it just needs a network to open.
    logError(error);
  }
}

// Asks the server whether there is a new version. Does nothing if it asked within the last hour.
export function checkForUpdate(): void {
  if (!registration) return;
  const at = now().getTime();
  if (at - lastCheckAt < CHECK_EVERY_MS) return;
  lastCheckAt = at;
  // Offline, or the server is away: try again next time.
  void registration.update().catch(() => undefined);
}

// Tells the waiting version to take over. Returns false when nothing is waiting.
export function applyUpdate(): boolean {
  const waiting = registration?.waiting;
  if (!waiting || applying) return false;
  applying = true;
  // `updateReady` stays set until the hand-over is done, so the app starts no backup request meanwhile.
  waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

// Loads the page again, now that the new version is in charge. Call only on a safe screen.
export function finishUpdate(): void {
  if (!useAppStore.getState().updateTookOver) return;
  useAppStore.getState().setUpdateTookOver(false);
  deps?.reload();
}

export function resetUpdatesForTests(): void {
  deps = null;
  registration = null;
  lastCheckAt = 0;
  applying = false;
}
