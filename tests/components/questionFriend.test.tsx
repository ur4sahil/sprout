import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDeviceTalking, startPlaying, stopPlaying } from '../../src/audio/playing';
import { setSpeaking } from '../../src/audio/speaking';
import { keepTiming, shapeAt } from '../../src/audio/voice';
import type { SpokenTiming } from '../../src/audio/voice';
import { mouthNow } from '../../src/cast/voiceMouth';
import PracticeFriend, { CHEERS, HABIT_EVERY_MS, HABIT_LASTS_MS, HABITS, actFor, reactionFor } from '../../src/components/PracticeFriend';
import QuestionStage from '../../src/components/QuestionStage';
import type { Question } from '../../src/engine/types';
import { generateQuestion } from '../../src/content/registry';

// The friend on the question screen (plan section 20, phase 2): beside the question line on every device, its
// mouth following the voice, its own cheer on a right answer and a kind nod on a miss, a tap to hear the question
// again, small habits while it waits, and still poses in Calm mode.

const TIMING: SpokenTiming = {
  duration: 1.25,
  shapes: [
    { at: 0, shape: 'closed' },
    { at: 0.1, shape: 'small' },
    { at: 0.32, shape: 'wide' },
    { at: 0.6, shape: 'round' },
    { at: 1.1, shape: 'closed' },
  ],
};

const calm = (): void => {
  document.documentElement.dataset.calm = '';
};
const character = (): HTMLElement => document.querySelector('[data-friend] [data-character]') as HTMLElement;
const box = (): HTMLElement => document.querySelector('[data-friend]') as HTMLElement;

// A stand-in for the frame loop: the test runs each frame itself.
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
const runFrame = (): void => {
  const waiting = [...frames.values()];
  frames.clear();
  act(() => {
    for (const each of waiting) each(0);
  });
};

beforeEach(() => {
  frames = new Map();
  nextFrame = 1;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrame;
    nextFrame += 1;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});

afterEach(() => {
  cleanup();
  setSpeaking(false);
  setDeviceTalking(false);
  stopPlaying();
  delete document.documentElement.dataset.calm;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the mouth for each moment of the voice', () => {
  const recording = (at: number) => ({ timing: TIMING, at });

  it('follows the timing of the recording playing: the shape it says at that moment', () => {
    for (const at of [0, 0.05, 0.1, 0.2, 0.32, 0.5, 0.6, 1, 1.1, 1.2, 2]) {
      expect(mouthNow({ mine: true, recording: recording(at), loudness: 0.9, device: false }), String(at)).toBe(shapeAt(TIMING, at));
    }
    expect(mouthNow({ mine: true, recording: recording(0.4), loudness: 0, device: false })).toBe('wide');
    expect(mouthNow({ mine: true, recording: recording(0.7), loudness: 0, device: false })).toBe('round');
  });

  it('with no timing it follows the loudness, or runs its talk loop where the sound cannot be measured', () => {
    expect(mouthNow({ mine: true, recording: { timing: null, at: 0.4 }, loudness: 0.55, device: false })).toBe(0.55);
    expect(mouthNow({ mine: true, recording: { timing: null, at: 0.4 }, loudness: true, device: false })).toBe(true);
    expect(mouthNow({ mine: true, recording: { timing: null, at: 0.4 }, loudness: false, device: false })).toBe(true);
  });

  it("the device's own voice gets the talk loop; another voice, or a voice still on its way, leaves the mouth to the mood", () => {
    expect(mouthNow({ mine: true, recording: null, loudness: false, device: true })).toBe(true);
    expect(mouthNow({ mine: true, recording: null, loudness: false, device: false })).toBeUndefined();
    expect(mouthNow({ mine: false, recording: recording(0.4), loudness: 1, device: true })).toBeUndefined();
  });
});

describe('the friend follows the recording that is playing', () => {
  function play(timing: SpokenTiming | null): { clock: { currentTime: number } } {
    const bytes = new ArrayBuffer(8);
    if (timing) keepTiming(bytes, timing);
    const clock = { currentTime: 10 };
    act(() => {
      startPlaying({ bytes, clock, startedAt: 10, speed: 1 });
    });
    return { clock };
  }

  it('its mouth takes the shape the timing says, moment by moment, while its own voice speaks', () => {
    render(<PracticeFriend who="pip" questionKey="q1" phase="asking" />);
    act(() => setSpeaking(true, 'pip'));
    const { clock } = play(TIMING);
    const seen: string[] = [];
    for (const at of [0.05, 0.2, 0.4, 0.7, 1.15]) {
      clock.currentTime = 10 + at;
      runFrame();
      seen.push(character().dataset.mouth ?? '');
    }
    expect(seen).toEqual(['closed', 'small', 'wide', 'round', 'closed']);
    // Reading the question out, it points.
    expect(box().dataset.friendAct).toBe('reading');
    expect(character().dataset.mood).toBe('point');
  });

  it('a faster voice gets further into the timing in the same time', () => {
    render(<PracticeFriend who="pip" questionKey="q1" phase="asking" />);
    act(() => setSpeaking(true, 'pip'));
    const bytes = new ArrayBuffer(8);
    keepTiming(bytes, TIMING);
    const clock = { currentTime: 0 };
    act(() => {
      startPlaying({ bytes, clock, startedAt: 0, speed: 2 });
    });
    clock.currentTime = 0.2; // 0.4 s into the recording
    runFrame();
    expect(character().dataset.mouth).toBe('wide');
  });

  it('in Calm mode the mouth still follows the voice, and nothing else moves', () => {
    calm();
    render(<PracticeFriend who="olive" questionKey="q1" phase="asking" />);
    act(() => setSpeaking(true, 'olive'));
    const { clock } = play(TIMING);
    clock.currentTime = 10.4;
    runFrame();
    expect(character().dataset.mouth).toBe('wide');
    expect(character().hasAttribute('data-still')).toBe(true);
  });

  it("another voice speaking does not move its mouth: the friend is not the one talking", () => {
    render(<PracticeFriend who="pip" questionKey="q1" phase="asking" />);
    act(() => setSpeaking(true, 'sprout'));
    const { clock } = play(TIMING);
    clock.currentTime = 10.4;
    runFrame();
    expect(character().dataset.mouth).toBe('smile');
    expect(box().dataset.friendAct).toBe('waiting');
  });

  it('a recording with no timing and nothing to measure, or the device voice, runs the talk loop', () => {
    render(<PracticeFriend who="finn" questionKey="q1" phase="asking" />);
    act(() => setSpeaking(true, 'finn'));
    play(null);
    expect(character().dataset.mouth).toBe('talking');
    act(() => stopPlaying());
    expect(character().dataset.mouth).not.toBe('talking');
    act(() => setDeviceTalking(true));
    expect(character().dataset.mouth).toBe('talking');
  });
});

describe('reactions', () => {
  it('each friend has its own cheer for a right answer: Pip flies a loop, Olive flaps, Finn jumps, with sparkles', () => {
    expect(CHEERS).toEqual({ pip: 'loop', olive: 'flap', finn: 'jump', sprout: 'jump' });
    for (const who of ['pip', 'olive', 'finn'] as const) {
      const view = render(<PracticeFriend who={who} questionKey="q1" phase="asking" />);
      expect(box().dataset.friendReaction).toBeUndefined();
      view.rerender(<PracticeFriend who={who} questionKey="q1" phase="correct" />);
      expect(box().dataset.friendReaction).toBe(CHEERS[who]);
      expect(document.querySelector(`[data-react="${CHEERS[who]}"]`)).not.toBeNull();
      expect(document.querySelectorAll('[data-sparkles] i').length).toBeGreaterThan(0);
      expect(['cheer', 'cheerBig']).toContain(character().dataset.mood);
      view.unmount();
    }
  });

  it('a miss gets a kind nod and a thinking look, never sparkles and never a sad face', () => {
    const view = render(<PracticeFriend who="olive" questionKey="q1" phase="asking" />);
    view.rerender(<PracticeFriend who="olive" questionKey="q1" phase="wrong" />);
    expect(box().dataset.friendReaction).toBe('nod');
    expect(document.querySelector('[data-sparkles]')).toBeNull();
    expect(['think', 'encourage']).toContain(character().dataset.mood);
    expect(['smile', 'small', 'bigSmile']).toContain(character().dataset.mouth);
    expect(reactionFor('pip', 'wrong')).toBe('nod');
    expect(reactionFor('pip', 'asking')).toBeNull();
  });

  it('in Calm mode there is no loop, flap, jump, nod or sparkle: a still pose', () => {
    calm();
    const view = render(<PracticeFriend who="pip" questionKey="q1" phase="asking" />);
    view.rerender(<PracticeFriend who="pip" questionKey="q1" phase="correct" />);
    expect(box().dataset.friendReaction).toBeUndefined();
    expect(document.querySelector('[data-react]')).toBeNull();
    expect(document.querySelector('[data-sparkles]')).toBeNull();
    expect(character().dataset.mood).toBe('cheer');
    expect(character().hasAttribute('data-still')).toBe(true);
  });

  it('the styles hold a still form for Calm mode, Reduce Motion and a slow device', () => {
    const css = readFileSync('src/components/PracticeFriend.module.css', 'utf8');
    expect(css).toMatch(/:global\(:root\[data-calm\]\) \.react/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/:global\(:root\[data-lowfx\]\) \.react/);
  });
});

describe('habits while it waits', () => {
  it('now and then a glance, a little bounce, a tilt, a look about, each for a moment, in a fixed round', () => {
    vi.useFakeTimers();
    render(<PracticeFriend who="finn" questionKey="q1" phase="asking" />);
    const habit = (): string | null => document.querySelector('[data-habit]')?.getAttribute('data-habit') ?? null;
    expect(habit()).toBeNull();
    const seen: (string | null)[] = [];
    for (let i = 0; i < HABITS.length; i += 1) {
      // One every few seconds: the first after a whole wait, each after that a wait after the last one ended.
      act(() => vi.advanceTimersByTime(i === 0 ? HABIT_EVERY_MS : HABIT_EVERY_MS - HABIT_LASTS_MS));
      seen.push(habit());
      act(() => vi.advanceTimersByTime(HABIT_LASTS_MS - 1));
      expect(habit()).toBe(seen[i]);
      act(() => vi.advanceTimersByTime(1));
      expect(habit()).toBeNull();
    }
    expect(seen).toEqual([...HABITS]);
  });

  it('no habits while it reads, after an answer, or in Calm mode', () => {
    vi.useFakeTimers();
    const view = render(<PracticeFriend who="finn" questionKey="q1" phase="correct" />);
    act(() => vi.advanceTimersByTime(HABIT_EVERY_MS * 3));
    expect(document.querySelector('[data-habit]')).toBeNull();
    view.unmount();
    calm();
    render(<PracticeFriend who="finn" questionKey="q2" phase="asking" />);
    act(() => vi.advanceTimersByTime(HABIT_EVERY_MS * 3));
    expect(document.querySelector('[data-habit]')).toBeNull();
    expect(actFor('asking', true)).toBe('reading');
    expect(actFor('saving', false)).toBe('waiting');
    expect(actFor('wrong', true)).toBe('reacting');
  });
});

describe('beside the question line', () => {
  const question = (): Question => generateQuestion('M-K-C4', 1, 7);

  it('QuestionStage draws the friend at the question line, and a tap says the question again in its own words', () => {
    const q = question();
    const said: unknown[] = [];
    render(<QuestionStage question={q} phase="asking" response={null} lastResponse={null} saveError={null} onChange={() => undefined} onSubmit={() => undefined} onGotIt={() => undefined} onSpeak={(say) => said.push(say)} friend={{ who: 'pip', voice: 'pip' }} />);
    const stage = document.querySelector('[data-friend-stage]') as HTMLElement;
    expect(stage.querySelector('[data-friend="pip"]')).not.toBeNull();
    expect(stage.querySelector('[data-friend-line]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pip: hear the question again' }));
    expect(said).toEqual([q.prompt.speak]);
  });

  it('no friend is drawn where none is given', () => {
    render(<QuestionStage question={question()} phase="asking" response={null} lastResponse={null} saveError={null} onChange={() => undefined} onSubmit={() => undefined} onGotIt={() => undefined} onSpeak={() => undefined} />);
    expect(document.querySelector('[data-friend]')).toBeNull();
    expect(document.querySelector('[data-friend-stage]')).toBeNull();
  });

  it('is shown on a phone too: no style hides it at any width', () => {
    for (const file of ['src/components/PracticeFriend.module.css', 'src/components/QuestionStage.module.css']) {
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const [, selector = '', rules = ''] = block;
        if (/\.(friend|friendSpot|tap|react|habit|stage)\b/.test(selector) && !/sparkles/.test(selector)) {
          expect(rules, `${file}: ${selector.trim()}`).not.toMatch(/display:\s*none|visibility:\s*hidden/);
        }
      }
    }
  });
});
