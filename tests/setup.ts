import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { useAppStore } from '../src/app/store';
import { clearErrors } from '../src/lib/errorLog';
import { unfreezeClock } from '../src/lib/clock';

afterEach(() => {
  cleanup();
  clearErrors();
  unfreezeClock();
  vi.unstubAllGlobals();
  useAppStore.getState().setAccount({ status: 'checking' });
});
