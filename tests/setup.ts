import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { useAppStore } from '../src/app/store';
import { clearErrors } from '../src/lib/errorLog';
import { unfreezeClock } from '../src/lib/clock';
import { setRepoForTests } from '../src/storage/index';
import { memoryRepo } from '../src/storage/memoryRepo';

// The cloud build machine is far slower than a laptop. Waits allow for that.
configure({ asyncUtilTimeout: 10_000 });

// Every test starts on an empty device.
beforeEach(() => {
  setRepoForTests(memoryRepo());
});

afterEach(() => {
  cleanup();
  clearErrors();
  unfreezeClock();
  vi.unstubAllGlobals();
  useAppStore.getState().setAccount({ status: 'checking' });
  useAppStore.getState().setStorageSaved(true);
});
