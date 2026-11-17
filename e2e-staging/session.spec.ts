import { test } from '@playwright/test';
import path from 'node:path';
import { signUp } from '../e2e/support/fixtures';
import { DIR } from '../e2e/support/paths';

// Signs a made-up account in on the test copy and saves its session, for jobs that need to call the
// test copy as a signed-in device (scripts/voice-fill.mjs). Run only when asked for:
//   SPROUT_SAVE_SESSION=1 npx playwright test -c playwright.staging.config.ts session
test('save a signed-in session', async ({ page, context }) => {
  test.skip(!process.env.SPROUT_SAVE_SESSION, 'only when a session file is wanted');
  await signUp(page);
  await context.storageState({ path: path.join(DIR, 'staging-session.json') });
});
