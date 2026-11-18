// The old-device fallback (game feel, phase 8). For a few seconds after a kid screen opens, the app counts the
// frames the device draws. A device that keeps falling under about 45 a second gets `data-lowfx` on the page for
// the rest of the session: the garden's far layers stop sliding, particles are not drawn and drifting
// decorations stop. Nothing is saved; the next launch measures again.

export const LOW_FPS = 45; // under this many frames a second, a second counts as slow
export const WINDOW_MS = 1000; // frames are counted one second at a time
export const SETTLE_MS = 500; // the first moment of a screen is skipped: it is busy drawing itself once
export const WATCH_MS = 3500; // then this long is measured: three whole seconds and a little over
export const GAP_MS = 400; // a gap this long between two frames means the app was in the background or loading
export const MIN_WINDOWS = 3; // a judgement needs this many whole seconds
export const MOST_WATCHES = 6; // at most this many measurements in a session

export type FrameVerdict = 'slow' | 'fine' | 'unsure';

// Frames drawn in each whole second, from the frames' times (in milliseconds, in order). A second that holds a
// long gap is left out: the app was away or loading, which says nothing about the device.
export function framesPerWindow(times: readonly number[], windowMs: number = WINDOW_MS): number[] {
  const first = times[0];
  if (first === undefined) return [];
  const counts: number[] = [];
  let start = first;
  let count = 0;
  let broken = false;
  let before = first;
  for (const at of times.slice(1)) {
    // A gap spoils every second it touches: the one it starts in and any it runs into.
    const gap = at - before >= GAP_MS;
    if (gap) broken = true;
    while (at >= start + windowMs) {
      if (!broken) counts.push(count);
      start += windowMs;
      count = 0;
      broken = gap;
    }
    count += 1;
    before = at;
  }
  return counts;
}

// The decision, from frames a second: slow only when most seconds (two in three or more) were under the line,
// so one busy moment never turns the effects off.
export function judgeWindows(windows: readonly number[]): FrameVerdict {
  if (windows.length < MIN_WINDOWS) return 'unsure';
  const slow = windows.filter((fps) => fps < LOW_FPS).length;
  return slow * 3 >= windows.length * 2 ? 'slow' : 'fine';
}

export function judgeFrames(times: readonly number[]): FrameVerdict {
  return judgeWindows(framesPerWindow(times));
}

export function isLowFx(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.lowfx !== undefined;
}

export function setLowFx(): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.lowfx = '';
}

const watch = { running: false, count: 0 };

export function resetFrameWatchForTests(): void {
  watch.running = false;
  watch.count = 0;
  if (typeof document !== 'undefined') delete document.documentElement.dataset.lowfx;
}

function movementOff(): boolean {
  if (document.documentElement.dataset.calm !== undefined) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Measures the frames for a few seconds, once at a time, a few times a session. Does nothing where there is no
// animation frame to count, once the fallback is on, or while movement is off (Calm mode, Reduce Motion), since
// then there is little moving to save.
export function watchFrames(): void {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
  if (watch.running || watch.count >= MOST_WATCHES || isLowFx() || movementOff()) return;
  watch.running = true;
  watch.count += 1;
  const times: number[] = [];
  let began: number | null = null;
  const stop = (): void => {
    watch.running = false;
    document.removeEventListener('visibilitychange', away);
  };
  // The app going to the background ends this measurement with no decision.
  let gone = false;
  const away = (): void => {
    if (document.visibilityState === 'hidden') gone = true;
  };
  document.addEventListener('visibilitychange', away);
  const frame = (at: number): void => {
    if (gone) {
      stop();
      return;
    }
    began ??= at;
    if (at - began >= SETTLE_MS) times.push(at);
    if (at - began < SETTLE_MS + WATCH_MS) {
      window.requestAnimationFrame(frame);
      return;
    }
    stop();
    if (judgeFrames(times) === 'slow') setLowFx();
  };
  window.requestAnimationFrame(frame);
}
