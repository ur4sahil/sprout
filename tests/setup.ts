import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { useAppStore } from '../src/app/store';
import { resetVoiceEngine } from '../src/audio/engine';
import { clearErrors } from '../src/lib/errorLog';
import { unfreezeClock } from '../src/lib/clock';
import { setDataApiForTests, setRepoForTests } from '../src/storage/index';
import { memoryRepo } from '../src/storage/memoryRepo';

// The cloud build machine is far slower than a laptop. Waits allow for that.
configure({ asyncUtilTimeout: 10_000 });

// Every test starts on an empty device.
beforeEach(() => {
  setDataApiForTests(null);
  setRepoForTests(memoryRepo());
});

afterEach(() => {
  cleanup();
  clearErrors();
  // As at launch: the server has not said it speaks with the new voices.
  resetVoiceEngine();
  unfreezeClock();
  vi.unstubAllGlobals();
  useAppStore.getState().setAccount({ status: 'checking' });
  useAppStore.getState().setStorageSaved(true);
  useAppStore.getState().setChild(null);
  useAppStore.getState().setInstallGuide(false);
  useAppStore.getState().setLink('waiting');
  useAppStore.getState().setNewerBuild(false);
});
