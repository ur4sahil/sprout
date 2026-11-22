import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StepWalk from '../../src/components/StepWalk';
import type { Question, Say } from '../../src/engine/types';

// The wrong-answer steps, one at a time, each said as it appears. A step that cannot be said is shown in silence:
// the question's spoken summary is never said in its place.

function question(steps: string[], stepsSay?: (Say | null)[]): Question {
  return {
    skillId: 'T-1', level: 1, seed: 1, key: 'T-1|1|{}', facts: { n: 3 }, mode: 'look', type: 'numberPad', answer: 3, maxDigits: 1,
    prompt: { text: 'How many?', speak: ['How many?'] },
    explanation: { speak: ['The summary, which is never said here.'], steps, ...(stepsSay ? { stepsSay } : {}) },
  };
}

const hearAgain = (): HTMLElement | null => screen.queryByRole('button', { name: /Hear again/ });

describe('StepWalk', () => {
  it('says each step as it appears; a step that cannot be said is shown with no "Hear again", and the next one is said', () => {
    const onSpeak = vi.fn();
    render(<StepWalk question={question(['Start at 1.', 'It is 50% more.', 'So it is 3.'])} onDone={() => undefined} onSpeak={onSpeak} />);
    fireEvent.click(hearAgain() as HTMLElement);
    expect(onSpeak).toHaveBeenLastCalledWith(['Start at', { number: 1 }, '.']);
    fireEvent.click(screen.getByRole('button', { name: /Next step/ }));
    expect(screen.getByText('It is 50% more.')).toBeTruthy();
    expect(onSpeak).toHaveBeenCalledTimes(1);
    expect(hearAgain()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Next step/ }));
    expect(onSpeak).toHaveBeenLastCalledWith(['So it is', { number: 3 }, '.']);
    expect(hearAgain()).not.toBeNull();
    expect(screen.getByRole('button', { name: /Got it/ })).toBeTruthy();
    expect(onSpeak.mock.calls.some(([say]) => JSON.stringify(say).includes('summary'))).toBe(false);
  });

  it('says a step with its own speech in stepsSay that way', () => {
    const onSpeak = vi.fn();
    const own: Say = ['Jet and wet both end with', { letter: 'e' }, ',', { letter: 't' }, '.'];
    render(<StepWalk question={question(['They rhyme.', 'Jet and wet both end in et.'], [null, own])} onDone={() => undefined} onSpeak={onSpeak} />);
    fireEvent.click(screen.getByRole('button', { name: /Next step/ }));
    expect(onSpeak).toHaveBeenLastCalledWith(own);
    fireEvent.click(hearAgain() as HTMLElement);
    expect(onSpeak).toHaveBeenLastCalledWith(own);
  });
});
