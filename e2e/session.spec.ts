import {
  PASSWORD,
  askForCode,
  expect,
  expectLockedAtNextLaunch,
  expectStartScreen,
  savedSignIn,
  fillNewPassword,
  fillSignIn,
  openSignedOut,
  signOutByApi,
  signUp,
  test,
} from './support/fixtures';

const DAY = 24 * 60 * 60;

test.describe('the session on a device', () => {
  test('survives a reload and a fresh visit to any path', async ({ page }) => {
    await signUp(page);
    await page.reload();
    await expectStartScreen(page);
    await page.goto('/parent/no-such-page');
    await expectStartScreen(page);
  });

  test('is a cookie with every flag, that page scripts cannot read, lasting 30 days', async ({ page, context }) => {
    await signUp(page);
    const cookies = await context.cookies();
    expect(cookies.map((c) => c.name)).toEqual(['__Host-sprout']);
    const cookie = cookies[0];
    if (!cookie) throw new Error('no cookie');
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
    expect(cookie.sameSite).toBe('Strict');
    expect(cookie.path).toBe('/');
    expect(cookie.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const left = cookie.expires - Date.now() / 1000;
    expect(left).toBeGreaterThan(30 * DAY - 120);
    expect(left).toBeLessThanOrEqual(30 * DAY + 5);
    expect(await page.evaluate(() => document.cookie)).toBe('');
  });

  test('keeps nothing about the account in browser storage', async ({ page }) => {
    const email = await signUp(page);
    const stored = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }]));
    expect(stored).not.toContain(email);
    expect(stored).not.toContain(PASSWORD);
  });

  test('belongs to one device: another browser is still signed out', async ({ page, browser }) => {
    await signUp(page);
    const other = await browser.newContext({ ignoreHTTPSErrors: true });
    const second = await other.newPage();
    await openSignedOut(second, '/home');
    await other.close();
  });

  test('is kept in the device record, so the app opens when the server cannot be reached', async ({ page, problems }) => {
    const email = await signUp(page);
    const saved = await savedSignIn(page);
    expect(saved?.email).toBe(email);
    expect(new Date(saved?.expiresAt ?? 0).getTime() - Date.now()).toBeGreaterThan(29 * DAY * 1000);
    await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
    await page.reload();
    await expectStartScreen(page);
    await page.goto('/parent/no-such-page');
    await expectStartScreen(page);
    await expect(page.getByRole('alert')).toHaveCount(0);
    // Being offline did not sign the device out.
    expect((await savedSignIn(page))?.email).toBe(email);
    problems.length = 0; // the blocked requests are expected
  });

  test('opens offline until the saved end date, then locks even with no network', async ({ page, problems }) => {
    await signUp(page);
    await page.clock.setFixedTime(new Date(Date.now() + 29 * DAY * 1000));
    await page.reload();
    await expectStartScreen(page);

    await page.clock.setFixedTime(new Date(Date.now() + 31 * DAY * 1000));
    await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    expect((await savedSignIn(page))?.email).toBeNull();
    // (With the network on, the server's own clock decides. The unit tests cover that with both clocks moved.)
    problems.length = 0;
  });

  test('when the server ends the session, the app stays open this launch and locks at the next', async ({ page }) => {
    await signUp(page);
    expect(await signOutByApi(page)).toBe(200);
    await expectLockedAtNextLaunch(page);
    // Signing out twice is refused quietly.
    expect(await signOutByApi(page)).toBe(401);
  });

  test('a removed or made-up cookie locks the app at the next launch', async ({ page, context }) => {
    await signUp(page);
    const [cookie] = await context.cookies();
    if (!cookie) throw new Error('no cookie');
    await context.clearCookies();
    await context.addCookies([{ ...cookie, value: 'x'.repeat(43) }]);
    await expectLockedAtNextLaunch(page);
  });

  test('the device record survives a lost cookie only until the server is asked', async ({ page, context }) => {
    await signUp(page);
    await context.clearCookies();
    await page.reload();
    await expectStartScreen(page); // opens from the device record
    await expect.poll(async () => (await savedSignIn(page))?.email ?? null).toBeNull();
  });

  test('/signin lets a signed-in parent sign in again', async ({ page }) => {
    const email = await signUp(page);
    await page.goto('/signin');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await fillSignIn(page, email, PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expectStartScreen(page);
  });

  test('a new password set on one device signs the other device out', async ({ page, browser }) => {
    const email = await signUp(page);

    const other = await browser.newContext({ ignoreHTTPSErrors: true });
    const second = await other.newPage();
    await openSignedOut(second);
    const code = await askForCode(second, email, 'Forgot password');
    await fillNewPassword(second, code, 'second-device-password');
    await expectStartScreen(second);

    await expectLockedAtNextLaunch(page);
    await second.reload();
    await expectStartScreen(second);
    await other.close();
  });

  test('"sign out everywhere" ends the session on every device', async ({ page, browser }) => {
    const email = await signUp(page);
    const other = await browser.newContext({ ignoreHTTPSErrors: true });
    const second = await other.newPage();
    await openSignedOut(second);
    await fillSignIn(second, email, PASSWORD);
    await second.getByRole('button', { name: 'Sign in' }).click();
    await expectStartScreen(second);

    const status = await second.evaluate(async () => {
      const reply = await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      return reply.status;
    });
    expect(status).toBe(200);
    await expectLockedAtNextLaunch(page);
    await expectLockedAtNextLaunch(second);
    await other.close();
  });

  test('a device with no saved sign-in shows the sign-in screen, with a plain message, when the server cannot be reached', async ({
    page,
    problems,
  }) => {
    await page.route('**/api/auth/session', (route) => route.abort('internetdisconnected'));
    await page.goto('/home');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('No internet connection');
    problems.length = 0; // the blocked request is expected
  });

  test('saves to this device: no warning banner, and nothing about the account outside the device record', async ({ page }) => {
    const email = await signUp(page);
    await expect(page.getByRole('status')).toHaveCount(0);
    const names = await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name));
    expect(names).toContain('sprout');
    const stored = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }]));
    expect(stored).not.toContain(email);
  });

  test('going back in the browser after signing in does not return to the sign-in form', async ({ page }) => {
    await signUp(page);
    await page.goBack().catch(() => null);
    await page.waitForTimeout(300);
    if (page.url().startsWith('https://localhost')) {
      await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
    }
  });
});
