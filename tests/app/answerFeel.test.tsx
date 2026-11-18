import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setTimingForTests } from '../../src/app/timing';
import QuestionStage from '../../src/components/QuestionStage';
import { generateQuestion } from '../../src/content/registry';

// Answering a question (plan section 19, phase 2): what a right answer and a miss look like.
const played = vi.hoisted(() => ({ sounds: [] as string[] }));
vi.mock('../../src/audio/sounds', async (original) => ({
  ...(await original<typeof import('../../src/audio/sounds')>()),
  playSound: (name: string) => {
    played.sounds.push(name);
  },
}));

const question = generateQuestion('M-K-C4', 1, 5);
const noop = (): void => undefined;
const stage = (phase: 'asking' | 'correct' | 'wrong', run = 0) => (
  <QuestionStage question={question} phase={phase} run={run} response={{ index: 0 }} lastResponse={{ index: 0 }} saveError={null} onChange={noop} onSubmit={noop} onGotIt={noop} onSpeak={noop} />
);

afterEach(() => {
  played.sounds.length = 0;
  setTimingForTests({ missLookMs: 0 });
  vi.useRealTimers();
});

describe('a right answer', () => {
  it('says Correct, throws the world\'s sparkles and sends a star to the score', () => {
    const view = render(stage('correct', 1));
    expect(screen.getByRole('status').textContent).toContain('Correct!');
    expect(view.container.querySelector('[data-particles]')?.getAttribute('data-particles')).toBe('sparkle');
    expect(view.container.querySelector('[data-fly-star]')).not.toBeNull();
    expect(played.sounds).toEqual([]);
  });

  it('five in a row throws stars, ten throws confetti, and the count is on the card', () => {
    const five = render(stage('correct', 5));
    expect(five.container.querySelector('[data-particles]')?.getAttribute('data-particles')).toBe('star');
    expect(five.container.querySelector('[data-run]')?.getAttribute('data-run')).toBe('5');
    five.unmount();
    expect(render(stage('correct', 10)).container.querySelector('[data-particles]')?.getAttribute('data-particles')).toBe('confetti');
  });
});

describe('a miss', () => {
  it('keeps the child\'s own answer up for a moment with a soft sound, then shows the steps; nothing sparkles', () => {
    vi.useFakeTimers();
    setTimingForTests({ missLookMs: 700 });
    const view = render(stage('wrong'));
    expect(view.container.querySelector('[data-phase="wrong"]')).not.toBeNull();
    expect(view.container.querySelector('[data-particles]')).toBeNull();
    expect(view.container.querySelector('[data-fly-star]')).toBeNull();
    expect(played.sounds).toEqual(['notyet']);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(view.container.querySelector('[data-phase="wrong"]')).toBeNull();
    expect(view.container.querySelector('[data-explanation]')).not.toBeNull();
  });
});
