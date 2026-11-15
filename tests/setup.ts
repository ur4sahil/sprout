import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { clearErrors } from '../src/lib/errorLog';
import { unfreezeClock } from '../src/lib/clock';

afterEach(() => {
  cleanup();
  clearErrors();
  unfreezeClock();
});
