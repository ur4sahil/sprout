import {
  PASSWORD,
  SAME_MESSAGE,
  askForCode,
  codeAfter,
  codeCountAfter,
  expect,
  expectStartScreen,
  fillNewPassword,
  fillSignIn,
  listedEmail,
  logMark,
  openSignedOut,
  signOutFully,
  signUp,
  strangerEmail,
  test,
  wrongCode,
} from './support/fixtures';

test.describe('first sign-up and forgotten password', () => {
  test('a new parent gets a code, sets a password and lands on the start screen', async ({ page }) => {
    await signUp(page);
  });

  test('the email step: field is marked for the password manager', async ({ page }) => {
    await openSignedOut(page);
    await page.getByRole('button', { name: 'First time here' }).click();
    await expect(page.getByLabel('Email')).toHaveAttribute('type', 'email');
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByText('We will email you a six-digit code.')).toBeVisible();
  });

  test('the email step does not call the server with an empty or malformed email', async ({ page }) => {
    await openSignedOut(page);
    await page.getByRole('button', { name: 'First time here' }).click();
    const mark = logMark();
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByRole('heading', { name: 'Set a password' })).toBeVisible();
    expect(codeCountAfter(mark)).toBe(0);
  });

  test('an unlisted address sees the same next screen, and no code is made', async ({ page }) => {
    await openSignedOut(page);
    await page.getByRole('button', { name: 'First time here' }).click();
    await page.getByLabel('Email').fill(strangerEmail());
    const mark = logMark();
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText(/If that email is on the family list/)).toBeVisible();
    await page.waitForTimeout(1500);
    expect(codeCountAfter(mark)).toBe(0);

    // And any code it tries is refused like a wrong one.
    await fillNewPassword(page, '123456', PASSWORD);
    await expect(page.getByRole('alert')).toContainText('That code is not right');
  });

  test('the code step: fields are marked for the code keyboard and the password manager', async ({ page }) => {
    await openSignedOut(page);
    await askForCode(page, listedEmail());
    const code = page.getByLabel('Code from the email');
    await expect(code).toHaveAttribute('inputmode', 'numeric');
    await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(code).toHaveAttribute('maxlength', '6');
    await expect(page.getByLabel('New password', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
    await expect(page.getByLabel('New password again')).toHaveAttribute('autocomplete', 'new-password');
    await expect(page.getByLabel('New password', { exact: true })).toHaveAttribute('type', 'password');
  });

  test('checks the code shape, the password length and the match before calling the server', async ({ page }) => {
    await openSignedOut(page);
    await askForCode(page, listedEmail());
    let calls = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/auth/password')) calls += 1;
    });
    await fillNewPassword(page, '12345', PASSWORD);
    await expect(page.getByRole('alert')).toHaveText('The code is six digits.');
    await fillNewPassword(page, 'abcdef', PASSWORD);
    await expect(page.getByRole('alert')).toHaveText('The code is six digits.');
    await fillNewPassword(page, '123456', 'too-short');
    await expect(page.getByRole('alert')).toHaveText('Use at least 10 characters for the password.');
    await fillNewPassword(page, '123456', PASSWORD, `${PASSWORD}x`);
    await expect(page.getByRole('alert')).toHaveText('The two passwords do not match.');
    expect(calls).toBe(0);
  });

  test('a ten-character password is long enough, a nine-character one is not', async ({ page }) => {
    await openSignedOut(page);
    const code = await askForCode(page, listedEmail());
    await fillNewPassword(page, code, '123456789');
    await expect(page.getByRole('alert')).toContainText('at least 10 characters');
    await fillNewPassword(page, code, '1234567890');
    await expectStartScreen(page);
  });

  test('refuses a wrong code, frees the button, then accepts the right one', async ({ page }) => {
    await openSignedOut(page);
    const code = await askForCode(page, listedEmail());
    await fillNewPassword(page, wrongCode(code), PASSWORD);
    await expect(page.getByRole('alert')).toContainText('That code is not right');
    await expect(page.getByRole('button', { name: 'Save password and sign in' })).toBeEnabled();
    await fillNewPassword(page, code, PASSWORD);
    await expectStartScreen(page);
  });

  test('refuses even the right code after five wrong tries', async ({ page }) => {
    await openSignedOut(page);
    const code = await askForCode(page, listedEmail());
    for (let i = 0; i < 5; i += 1) {
      await fillNewPassword(page, wrongCode(code), PASSWORD);
      await expect(page.getByRole('alert')).toContainText('That code is not right');
      await expect(page.getByRole('button', { name: 'Save password and sign in' })).toBeEnabled();
    }
    await fillNewPassword(page, code, PASSWORD);
    await expect(page.getByRole('alert')).toContainText('That code is not right');
    await expect(page.getByLabel('Code from the email')).toBeVisible();
  });

  test('a code cannot be used a second time', async ({ page, browser }) => {
    const email = listedEmail();
    await openSignedOut(page);
    const code = await askForCode(page, email);
    await fillNewPassword(page, code, PASSWORD);
    await expectStartScreen(page);

    const other = await browser.newContext({ ignoreHTTPSErrors: true });
    const second = await other.newPage();
    const status = await second.request.post('/api/auth/password', {
      headers: { Origin: new URL(page.url()).origin, 'Content-Type': 'application/json' },
      data: { email, code, passwordKey: 'f'.repeat(64) },
    });
    expect(status.status()).toBe(400);
    await other.close();
  });

  test('"Send a new code" goes back to the email step with the email kept', async ({ page }) => {
    const email = listedEmail();
    await openSignedOut(page);
    await askForCode(page, email);
    await fillNewPassword(page, '12', PASSWORD);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Send a new code' }).click();
    await expect(page.getByRole('heading', { name: 'Set a password' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveValue(email);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('asking again within a minute sends no second code, and the first still works', async ({ page }) => {
    const email = listedEmail();
    await openSignedOut(page);
    const code = await askForCode(page, email);
    await page.getByRole('button', { name: 'Send a new code' }).click();
    const mark = logMark();
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(codeCountAfter(mark)).toBe(0);
    await fillNewPassword(page, code, PASSWORD);
    await expectStartScreen(page);
  });

  test('"Back to sign in" works from both steps', async ({ page }) => {
    await openSignedOut(page);
    await page.getByRole('button', { name: 'Forgot password' }).click();
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await askForCode(page, listedEmail(), 'Forgot password');
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('forgotten password: the new password works and the old one stops working', async ({ page }) => {
    const email = await signUp(page);
    await signOutFully(page);

    // Wait out nothing: this is a new code for an address whose last code was used.
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Forgot password' }).click();
    await expect(page.getByLabel('Email')).toHaveValue(email);
    const mark = logMark();
    await page.getByRole('button', { name: 'Email me a code' }).click();
    const code = await codeAfter(mark);
    await fillNewPassword(page, code, 'a-brand-new-password');
    await expectStartScreen(page);

    await signOutFully(page);
    await fillSignIn(page, email, PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText(SAME_MESSAGE);
    await fillSignIn(page, email, 'a-brand-new-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expectStartScreen(page);
  });

  test('forgotten password clears a 15-minute lock', async ({ page }) => {
    const email = await signUp(page);
    await signOutFully(page);
    for (let i = 1; i <= 5; i += 1) {
      await fillSignIn(page, email, `wrong-password-${i}`);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    }
    await expect(page.getByRole('alert')).toContainText('15 minutes');
    const code = await askForCode(page, email, 'Forgot password');
    await fillNewPassword(page, code, 'unlocked-password-1');
    await expectStartScreen(page);
  });

  test('says so when the internet is off, on both steps', async ({ page, context, problems }) => {
    await openSignedOut(page);
    await page.getByRole('button', { name: 'First time here' }).click();
    await page.getByLabel('Email').fill(listedEmail());
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(page.getByRole('alert')).toContainText('No internet connection');
    await expect(page.getByRole('button', { name: 'Email me a code' })).toBeEnabled();
    await context.setOffline(false);
    const mark = logMark();
    await page.getByRole('button', { name: 'Email me a code' }).click();
    const code = await codeAfter(mark);

    await context.setOffline(true);
    await fillNewPassword(page, code, PASSWORD);
    await expect(page.getByRole('alert')).toContainText('No internet connection');
    await expect(page.getByRole('button', { name: 'Save password and sign in' })).toBeEnabled();
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Save password and sign in' }).click();
    await expectStartScreen(page);
    problems.length = 0; // the failed requests while offline are expected
  });

  test('never sends the password itself to the server', async ({ page }) => {
    const bodies: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) bodies.push(request.postData() ?? '');
    });
    const email = await signUp(page);
    await signOutFully(page);
    await fillSignIn(page, email, PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expectStartScreen(page);
    expect(bodies.length).toBeGreaterThanOrEqual(3);
    for (const body of bodies) expect(body).not.toContain(PASSWORD);
    expect(bodies.some((body) => /"passwordKey":"[0-9a-f]{64}"/.test(body))).toBe(true);
  });
});
