import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../src/app/store';
import { CHECK_EVERY_MS, applyUpdate, checkForUpdate, finishUpdate, isSafeToUpdate, resetUpdatesForTests, startUpdates } from '../../src/app/updates';
import { advanceClock, freezeClock } from '../../src/lib/clock';
import { recentErrors } from '../../src/lib/errorLog';
import { NOW, answer, holdHome, openApp, openSkill, setUp, settled, sumOnScreen } from './practiceHelpers';

vi.mock('../../src/audio/speech', async (original) => ({
  ...(await original<typeof import('../../src/audio/speech')>()),
  speak: async () => true,
  speakPhrase: async () => true,
  stop: () => undefined,
}));
vi.mock('../../src/audio/sfx', async (original) => ({
  ...(await original<typeof import('../../src/audio/sfx')>()),
  playSfx: () => undefined,
  unlockAudio: async () => undefined,
}));

type Listener = () => void;

// A stand-in for the browser's service worker machinery.
function fakeBrowser(start: { controlled: boolean; waiting: boolean }) {
  const listeners: Record<string, Listener[]> = {};
  const on = (name: string, fn: Listener): void => {
    (listeners[name] ??= []).push(fn);
  };
  const fire = (name: string): void => (listeners[name] ?? []).forEach((fn) => fn());
  const makeWorker = () => {
    const mine: Listener[] = [];
    const w = {
      state: 'installing',
      postMessage: vi.fn(),
      addEventListener: (_: string, fn: Listener) => void mine.push(fn),
      change: (state: string) => {
        w.state = state;
        mine.forEach((fn) => fn());
      },
    };
    return w;
  };
  const registration = {
    waiting: start.waiting ? makeWorker() : null,
    installing: null as ReturnType<typeof makeWorker> | null,
    update: vi.fn(async () => undefined),
    addEventListener: (name: string, fn: Listener) => on(`reg:${name}`, fn),
  };
  const container = {
    controller: start.controlled ? {} : null,
    register: vi.fn(async () => registration),
    addEventListener: (name: string, fn: Listener) => on(name, fn),
  };
  const reload = vi.fn();
  return {
    deps: { container: container as unknown as ServiceWorkerContainer, reload },
    container,
    registration,
    reload,
    // A new version arrives and finishes installing.
    newVersion: () => {
      const incoming = makeWorker();
      registration.installing = incoming;
      fire('reg:updatefound');
      registration.installing = null;
      registration.waiting = incoming;
      incoming.change('installed');
      return incoming;
    },
    takeOver: () => fire('controllerchange'),
  };
}

beforeEach(() => {
  resetUpdatesForTests();
  useAppStore.getState().setUpdateReady(false);
  freezeClock(NOW);
});
afterEach(() => resetUpdatesForTests());

const ready = (): boolean => useAppStore.getState().updateReady;

describe('finding a new version', () => {
  it('registers the service worker once, at the root of the site', async () => {
    const browser = fakeBrowser({ controlled: false, waiting: false });
    await startUpdates(browser.deps);
    await startUpdates(browser.deps);
    expect(browser.container.register).toHaveBeenCalledTimes(1);
    expect(browser.container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(ready()).toBe(false);
  });

  it('a browser with no service workers still runs the app', async () => {
    await startUpdates({ container: undefined, reload: vi.fn() });
    checkForUpdate();
    expect(applyUpdate()).toBe(false);
    expect(recentErrors()).toEqual([]);
  });

  it('a failed registration is logged, and the app carries on', async () => {
    const browser = fakeBrowser({ controlled: false, waiting: false });
    browser.container.register.mockRejectedValueOnce(new Error('SecurityError'));
    await startUpdates(browser.deps);
    expect(recentErrors().length).toBe(1);
    expect(applyUpdate()).toBe(false);
  });

  it('the very first install is not an update', async () => {
    const browser = fakeBrowser({ controlled: false, waiting: false });
    await startUpdates(browser.deps);
    browser.newVersion();
    expect(ready()).toBe(false);
    // When the first worker takes control, the page is not loaded again.
    browser.takeOver();
    expect(browser.reload).not.toHaveBeenCalled();
  });

  it('a version already waiting at launch is noticed', async () => {
    const browser = fakeBrowser({ controlled: true, waiting: true });
    await startUpdates(browser.deps);
    expect(ready()).toBe(true);
  });

  it('a version that arrives while the app is open is noticed once it has finished installing', async () => {
    const browser = fakeBrowser({ controlled: true, waiting: false });
    await startUpdates(browser.deps);
    expect(ready()).toBe(false);
    browser.newVersion();
    expect(ready()).toBe(true);
  });

  it('asks the server at most once an hour, and a failed check is tried again later', async () => {
    const browser = fakeBrowser({ controlled: true, waiting: false });
    await startUpdates(browser.deps); // the launch check
    checkForUpdate();
    advanceClock(CHECK_EVERY_MS - 1);
    checkForUpdate();
    expect(browser.registration.update).toHaveBeenCalledTimes(0);
    advanceClock(1);
    browser.registration.update.mockRejectedValueOnce(new Error('offline'));
    checkForUpdate();
    checkForUpdate();
    expect(browser.registration.update).toHaveBeenCalledTimes(1);
    advanceClock(CHECK_EVERY_MS);
    checkForUpdate();
    expect(browser.registration.update).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    expect(recentErrors()).toEqual([]);
  });
});

describe('applying a new version', () => {
  it('tells the waiting version to take over, and loads the page again only once it has', async () => {
    const browser = fakeBrowser({ controlled: true, waiting: false });
    await startUpdates(browser.deps);
    const incoming = browser.newVersion();
    expect(applyUpdate()).toBe(true);
    expect(incoming.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(ready()).toBe(true); // until the hand-over is done
    expect(browser.reload).not.toHaveBeenCalled();
    expect(applyUpdate()).toBe(false); // not twice
    finishUpdate(); // nothing has taken over yet
    expect(browser.reload).not.toHaveBeenCalled();
    browser.takeOver();
    // Taking over does not load the page by itself: the app does that on a safe screen.
    expect(browser.reload).not.toHaveBeenCalled();
    expect(useAppStore.getState().updateTookOver).toBe(true);
    expect(ready()).toBe(false);
    finishUpdate();
    expect(browser.reload).toHaveBeenCalledTimes(1);
    finishUpdate();
    browser.takeOver();
    finishUpdate();
    expect(browser.reload).toHaveBeenCalledTimes(1);
  });

  it('a hand-over that arrives late, when the child has already started a question, waits for home', async () => {
    const browser = fakeBrowser({ controlled: true, waiting: false });
    await startUpdates(browser.deps);
    await setUp('K');
    const user = openApp();
    await screen.findByRole('button', { name: 'Robin' });
    // The new version arrives while the picker is showing, and is told to take over at once.
    const incoming = browser.newVersion();
    await waitFor(() => expect(incoming.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' }));
    // The browser is slow to hand over. Meanwhile the child opens a skill.
    await openSkill(user, 'Add to 10');
    await answer(user, sumOnScreen());
    await settled();
    browser.takeOver();
    await answer(user, sumOnScreen());
    await settled();
    expect(browser.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    await holdHome();
    await waitFor(() => expect(browser.reload).toHaveBeenCalledTimes(1));
  });

  it('only the profile picker and home are safe screens', () => {
    expect(['/', '/home'].every(isSafeToUpdate)).toBe(true);
    expect(['/skill/M-K-C4', '/skill/M-K-C4/learn', '/play', '/review', '/subject/math', '/signin'].some(isSafeToUpdate)).toBe(false);
  });

  it('a version that arrives in the middle of a question waits until the child is back on home', async () => {
    const browser = fakeBrowser({ controlled: true, waiting: false });
    await startUpdates(browser.deps);
    await setUp('K');
    const user = openApp();
    await openSkill(user, 'Add to 10');
    const incoming = browser.newVersion();
    await answer(user, sumOnScreen());
    await settled();
    await answer(user, sumOnScreen());
    await settled();
    expect(ready()).toBe(true);
    expect(incoming.postMessage).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Question' })).toBeTruthy();
    await holdHome();
    await waitFor(() => expect(incoming.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' }));
    expect(browser.reload).not.toHaveBeenCalled();
    act(() => browser.takeOver());
    await waitFor(() => expect(browser.reload).toHaveBeenCalledTimes(1));
  });

  it('a version waiting at launch is applied straight away on the profile picker', async () => {
    const browser = fakeBrowser({ controlled: true, waiting: true });
    await startUpdates(browser.deps);
    await setUp('K');
    openApp();
    await screen.findByRole('button', { name: 'Robin' });
    await waitFor(() => expect(browser.registration.waiting?.postMessage).toHaveBeenCalledTimes(1));
  });
});
