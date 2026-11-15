import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import { logError, recentErrors } from '../../src/lib/errorLog';
import { freezeClock } from '../../src/lib/clock';

function Bomb(): never {
  throw new Error('boom');
}

function Harness({ onHome }: { onHome: () => void }) {
  const [broken, setBroken] = useState(true);
  return (
    <ErrorBoundary
      onHome={() => {
        setBroken(false);
        onHome();
      }}
    >
      {broken ? <Bomb /> : <p>All fine</p>}
    </ErrorBoundary>
  );
}

describe('ErrorBoundary', () => {
  it('shows the fallback, logs the error and recovers on the button', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    freezeClock('2026-11-15T12:00:00.000Z');
    const onHome = vi.fn();
    render(<Harness onHome={onHome} />);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeTruthy();
    const logged = recentErrors();
    expect(logged).toHaveLength(1);
    expect(logged[0]?.message).toBe('boom');
    expect(logged[0]?.at).toBe('2026-11-15T12:00:00.000Z');

    await userEvent.click(screen.getByRole('button', { name: 'Back to start' }));
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(screen.getByText('All fine')).toBeTruthy();
    quiet.mockRestore();
  });

  it('keeps only the last 20 errors', () => {
    for (let i = 1; i <= 25; i += 1) logError(new Error(`e${i}`));
    const logged = recentErrors();
    expect(logged).toHaveLength(20);
    expect(logged[0]?.message).toBe('e6');
    expect(logged[19]?.message).toBe('e25');
  });
});
