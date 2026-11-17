import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TIMING } from '../../src/app/timing';
import HoldButton from '../../src/components/HoldButton';

// The kid lock: a quick tap does nothing but say what to do. A full hold leaves.

describe('HoldButton', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a quick tap does not leave, and shows "Press and hold" for a moment', () => {
    const onHeld = vi.fn();
    render(<HoldButton icon="home" label="Back to home" onHeld={onHeld} />);
    const button = screen.getByRole('button', { name: /Back to home/ });
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.pointerDown(button);
    act(() => void vi.advanceTimersByTime(300));
    fireEvent.pointerUp(button);
    expect(onHeld).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('Press and hold');
    act(() => void vi.advanceTimersByTime(TIMING.holdHintMs + 10));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a full hold leaves, with no hint', () => {
    const onHeld = vi.fn();
    render(<HoldButton icon="home" label="Back to home" onHeld={onHeld} />);
    const button = screen.getByRole('button', { name: /Back to home/ });
    fireEvent.pointerDown(button);
    act(() => void vi.advanceTimersByTime(TIMING.holdToExitMs + 10));
    fireEvent.pointerUp(button);
    expect(onHeld).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
