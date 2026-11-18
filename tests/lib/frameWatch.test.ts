import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOW_FPS, SETTLE_MS, WATCH_MS, framesPerWindow, isLowFx, judgeFrames, judgeWindows, resetFrameWatchForTests, setLowFx, watchFrames } from '../../src/lib/frameWatch';

// The old-device fallback (game feel, phase 8): count frames for a few seconds; a device that keeps falling under
// about 45 a second turns the extra effects off for the session.

// Frame times for `seconds` seconds at `fps` frames a second.
const frames = (fps: number, seconds: number, from = 0): number[] => Array.from({ length: Math.round(fps * seconds) + 1 }, (_, i) => from + (i * 1000) / fps);

afterEach(() => {
  resetFrameWatchForTests();
  delete document.documentElement.dataset.calm;
  vi.unstubAllGlobals();
});

describe('frames a second', () => {
  it('counts each whole second and leaves the last part-second out', () => {
    const counts = framesPerWindow(frames(60, 3.5));
    expect(counts).toHaveLength(3);
    expect(counts.every((n) => n >= 59 && n <= 60)).toBe(true);
    expect(framesPerWindow([])).toEqual([]);
    expect(framesPerWindow([5])).toEqual([]);
  });

  it('leaves out a second with a long gap in it: the app was away or loading', () => {
    const times = [...frames(60, 1.5), ...frames(60, 2.5, 2600)];
    const counts = framesPerWindow(times);
    // The second that ran into the gap and the one it ended in are not counted; the rest are.
    expect(counts.every((n) => n >= 55)).toBe(true);
    expect(counts.length).toBeLessThan(4);
  });
});

describe('the decision', () => {
  it('is slow only when most seconds were under the line', () => {
    expect(judgeWindows([30, 32, 28])).toBe('slow');
    expect(judgeWindows([30, 60, 28])).toBe('slow');
    // One busy second is not enough.
    expect(judgeWindows([60, 30, 60])).toBe('fine');
    expect(judgeWindows([LOW_FPS, LOW_FPS, LOW_FPS])).toBe('fine');
    // Too little to go on.
    expect(judgeWindows([20, 20])).toBe('unsure');
  });

  it('a smooth device is fine, a struggling one is slow, an iPad at 120 is fine', () => {
    expect(judgeFrames(frames(60, 3.2))).toBe('fine');
    expect(judgeFrames(frames(120, 3.2))).toBe('fine');
    expect(judgeFrames(frames(30, 3.2))).toBe('slow');
    expect(judgeFrames(frames(40, 3.2))).toBe('slow');
  });
});

describe('watching', () => {
  // A stand-in for the screen's frames: each request is answered `ms` later, by hand.
  function fakeFrames(ms: number): { run: () => void } {
    let next: FrameRequestCallback | null = null;
    let at = 1000;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      next = callback;
      return 1;
    });
    return {
      run: () => {
        for (let guard = 0; guard < 10_000 && next; guard += 1) {
          const callback: FrameRequestCallback = next;
          next = null;
          at += ms;
          callback(at);
        }
      },
    };
  }

  it('turns the effects off on a device that keeps dropping frames, for the rest of the session', () => {
    const screen = fakeFrames(1000 / 30);
    watchFrames();
    screen.run();
    expect(isLowFx()).toBe(true);
    expect(document.documentElement.hasAttribute('data-lowfx')).toBe(true);
  });

  it('leaves them on for a smooth device, measuring the few seconds after the screen settles', () => {
    let asked = 0;
    const screen = fakeFrames(1000 / 60);
    const real = window.requestAnimationFrame;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      asked += 1;
      return real(callback);
    });
    watchFrames();
    screen.run();
    expect(isLowFx()).toBe(false);
    // About the settling moment and the measured seconds' worth of frames, then it stops asking.
    expect(asked).toBeGreaterThanOrEqual(Math.floor(((SETTLE_MS + WATCH_MS) * 60) / 1000));
    expect(asked).toBeLessThan(Math.ceil(((SETTLE_MS + WATCH_MS) * 60) / 1000) + 5);
  });

  it('does not measure in Calm mode or once the fallback is on', () => {
    const asked = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', asked);
    document.documentElement.dataset.calm = '';
    watchFrames();
    expect(asked).not.toHaveBeenCalled();
    delete document.documentElement.dataset.calm;
    setLowFx();
    watchFrames();
    expect(asked).not.toHaveBeenCalled();
  });
});
