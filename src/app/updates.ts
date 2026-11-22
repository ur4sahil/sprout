import { setVoiceEngine } from '../audio/engine';
import { now } from '../lib/clock';
import { logError } from '../lib/errorLog';
import { useAppStore } from './store';

// The app always runs the newest build on the server (the owner's choice, Nov 17, 2026).
// Opening the app loads it from the server first (the service worker's pages are network-first, vite.config.ts);
// the copy kept on the device is used only with no network, or when the server is too slow to answer.
// A Home Screen app can stay open for days, and an iPad brings it back to the front far more often than it
// launches it afresh. So the app also asks the server which build is current (/build.json): at launch, each
// time it comes back to the front, back from the page cache or back online, and every quarter of an hour on
// screen, never twice within a minute. If the server has a newer build, the page loads again on the next
// safe screen (the profile picker or home), never in the middle of a question.

export const CHECK_EVERY_MS = 60_000;
// While the app stays on screen.
export const LOOK_AGAIN_MS = 15 * 60_000;
const SAFE_SCREENS = new Set(['/', '/home']);

// The build this page is running, set by vite.config.ts. Empty outside a built app.
export const RUNNING_BUILD: string = __BUILD_ID__;

// A page loaded again for a build, but still on the old one (the server was too slow, so the kept copy
// answered), does not load again for that build until this long has passed. Without it, it would loop.
export const RETRY_RELOAD_MS = 10 * 60_000;

export interface ReloadNote {
  build: string;
  at: number;
}

// The parts of the browser this needs. Tests pass stand-ins.
export interface UpdateDeps {
  container: ServiceWorkerContainer | undefined;
  reload: () => void;
  // The build the server has now, or null when it cannot be asked.
  serverBuild: () => Promise<string | null>;
  running: string;
  // The last build the page was loaded again for. Kept for this tab only, across the reload.
  lastReload: { get: () => ReloadNote | null; set: (note: ReloadNote) => void };
}

const NOTE_KEY = 'sprout-reloaded-for';
// The note is a convenience: a browser that refuses session storage just never remembers it.
const sessionNote: UpdateDeps['lastReload'] = {
  get: () => {
    try {
      const raw = sessionStorage.getItem(NOTE_KEY);
      const note = raw ? (JSON.parse(raw) as Partial<ReloadNote>) : null;
      return note && typeof note.build === 'string' && typeof note.at === 'number' ? { build: note.build, at: note.at } : null;
    } catch {
      return null;
    }
  },
  set: (note) => {
    try {
      sessionStorage.setItem(NOTE_KEY, JSON.stringify(note));
    } catch {
      // Nothing to do: see above.
    }
  },
};

async function askServer(): Promise<string | null> {
  try {
    // The service worker never keeps /build.json, and `no-store` keeps the browser from keeping it.
    const reply = await fetch('/build.json', { cache: 'no-store' });
    if (!reply.ok) return null;
    const body = (await reply.json()) as { id?: unknown; voice?: unknown };
    // The file also says which voice machine the server speaks with: the switch for the new voices (audio/engine.ts).
    setVoiceEngine(body.voice);
    return typeof body.id === 'string' ? body.id : null;
  } catch {
    // Offline, or the server is away: try again next time.
    return null;
  }
}

const browserDeps = (): UpdateDeps => ({
  container: typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
  reload: () => window.location.reload(),
  serverBuild: askServer,
  running: RUNNING_BUILD,
  lastReload: sessionNote,
});

let deps: UpdateDeps | null = null;
let registration: ServiceWorkerRegistration | null = null;
let lastCheckAt = Number.NEGATIVE_INFINITY;
let newest: string | null = null; // the newer build the server named

export function isSafeToUpdate(pathname: string): boolean {
  return SAFE_SCREENS.has(pathname);
}

// Registers the service worker, then asks the server which build is current. Safe to call more than once.
export async function startUpdates(use: UpdateDeps = browserDeps(), url = '/sw.js'): Promise<void> {
  if (deps) return;
  deps = use;
  if (use.container) {
    try {
      // `updateViaCache: 'none'`: the browser never answers "is there a new service worker" from its own cache.
      registration = await use.container.register(url, { scope: '/', updateViaCache: 'none' });
    } catch (error) {
      // Without a service worker the app still runs, it just needs a network to open.
      logError(error);
    }
  }
  checkForUpdate();
}

// Asks the server for a new build. Does nothing if it asked within the last minute.
export function checkForUpdate(): void {
  const use = deps;
  if (!use) return;
  const at = now().getTime();
  if (at - lastCheckAt < CHECK_EVERY_MS) return;
  lastCheckAt = at;
  // The new service worker takes over as soon as it is installed, so the next open needs no network either.
  if (registration) void registration.update().catch(() => undefined);
  void use.serverBuild().then((build) => {
    if (!build || !use.running || build === use.running) return;
    const note = use.lastReload.get();
    if (note && note.build === build && now().getTime() - note.at < RETRY_RELOAD_MS) return;
    newest = build;
    useAppStore.getState().setNewerBuild(true);
  });
}

// Checks at each return to the front, each return from the page cache, each return online, and every
// LOOK_AGAIN_MS while on screen. Returns the function that stops it.
export function watchForUpdates(win: Window = window): () => void {
  const onShow = (): void => {
    if (win.document.visibilityState === 'visible') checkForUpdate();
  };
  win.document.addEventListener('visibilitychange', onShow);
  win.addEventListener('pageshow', onShow);
  win.addEventListener('online', onShow);
  const every = win.setInterval(onShow, LOOK_AGAIN_MS);
  return () => {
    win.document.removeEventListener('visibilitychange', onShow);
    win.removeEventListener('pageshow', onShow);
    win.removeEventListener('online', onShow);
    win.clearInterval(every);
  };
}

// Loads the page again from the server, now that it has a newer build. Call only on a safe screen.
export function finishUpdate(): void {
  if (!useAppStore.getState().newerBuild) return;
  useAppStore.getState().setNewerBuild(false);
  if (!deps) return;
  if (newest) deps.lastReload.set({ build: newest, at: now().getTime() });
  deps.reload();
}

export function resetUpdatesForTests(): void {
  deps = null;
  registration = null;
  lastCheckAt = Number.NEGATIVE_INFINITY;
  newest = null;
}
