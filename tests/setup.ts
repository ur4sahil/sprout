import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { useAppStore } from '../src/app/store';
import { clearErrors } from '../src/lib/errorLog';
import { unfreezeClock } from '../src/lib/clock';

// The cloud build machine is far slower than a laptop. Waits allow for that.
configure({ asyncUtilTimeout: 10_000 });

afterEach(() => {
  cleanup();
  clearErrors();
  unfreezeClock();
  vi.unstubAllGlobals();
  useAppStore.getState().setAccount({ status: 'checking' });
});
