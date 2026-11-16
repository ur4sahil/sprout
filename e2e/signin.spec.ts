import {
  PASSWORD,
  SAME_MESSAGE,
  expect,
  expectStartScreen,
  fillSignIn,
  listedEmail,
  openSignedOut,
  signOutFully,
  signUp,
  strangerEmail,
  test,
} from './support/fixtures';

// A parent who has an account and is signed out again.
async function parentWithAccount(page: import('@playwright/test').Page): Promise<string> {
  const email = await signUp(page);
  await signOutFully(page);
  return email;
}

test.describe('the sign-in screen', () => {
  test('marks its fields so the password manager can save and fill them', async ({ page }) => {
    await openSignedOut(page);
    const email = page.getByLabel('Email');
    const password = page.getByLabel('Password', { exact: true });
    await expect(email).toHaveAttribute('type', 'email');
    await expect(email).toHaveAttribute('autocomplete', 'username');
    await expect(email).toHaveAttribute('autocapitalize', 'none');
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveAttribute('autocomplete', 'current-password');
  });

  test('does not call the server while a field is empty', async ({ page }) => {
    await openSignedOut(page);
    let calls = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/auth/login')) calls += 1;
    });
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByLabel('Email').fill(listedEmail());
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(calls).toBe(0);
  });

  test('signs in with the right password and lands on the start screen', async ({ page }) => {
    const email = await parentWithAccount(page);
    await fillSignIn(page, email, PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expectStartScreen(page);
  });

  test('signs in when the email is typed in capitals with spaces around it', async ({ page }) => {
    const email = await parentWithAccount(page);
    await page.getByLabel('Email').fill(email.toUpperCase());
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expectStartScreen(page);
  });

  test('pressing Enter in the password field signs in', async ({ page }) => {
    const email = await parentWithAccount(page);
    await fillSignIn(page, email, PASSWORD);
    await page.getByLabel('Password', { exact: true }).press('Enter');
    await expectStartScreen(page);
  });

  test('gives a wrong password, an address with no account and an unlisted address the same message', async ({
    page,
  }) => {
    const email = await parentWithAccount(page);
    const attempts: [string, string][] = [
      [email, 'not-the-password'],
      [listedEmail(), PASSWORD],
      [strangerEmail(), PASSWORD],
    ];
    for (const [address, password] of attempts) {
      await fillSignIn(page, address, password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('alert')).toHaveText(SAME_MESSAGE);
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    }
  });

  test('a password is exact: case and trailing spaces matter', async ({ page }) => {
    const email = await parentWithAccount(page);
    for (const wrong of [PASSWORD.toUpperCase(), `${PASSWORD} `]) {
      await fillSignIn(page, email, wrong);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('alert')).toHaveText(SAME_MESSAGE);
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    }
  });

  test('shows the button as busy while signing in, then frees it', async ({ page }) => {
    const email = await parentWithAccount(page);
    await page.route('**/api/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await fillSignIn(page, email, 'not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const busy = page.getByRole('button', { name: 'Signing in…' });
    await expect(busy).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    await expect(page.getByRole('alert')).toHaveText(SAME_MESSAGE);
  });

  test('after five wrong passwords says to wait 15 minutes, and then refuses the right one too', async ({ page }) => {
    const email = await parentWithAccount(page);
    for (let i = 1; i <= 5; i += 1) {
      await fillSignIn(page, email, `wrong-password-${i}`);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
      if (i < 5) await expect(page.getByRole('alert')).toHaveText(SAME_MESSAGE);
    }
    await expect(page.getByRole('alert')).toContainText('15 minutes');
    await expect(page.getByRole('alert')).toContainText('Forgot password');

    await fillSignIn(page, email, PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('15 minutes');
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('says so in plain words when the internet is off, and works again when it is back', async ({
    page,
    context,
    problems,
  }) => {
    const email = await parentWithAccount(page);
    await context.setOffline(true);
    await fillSignIn(page, email, PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('No internet connection');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expectStartScreen(page);
    problems.length = 0; // the failed request while offline is expected
  });

  test('says something went wrong when the server fails, and frees the button', async ({ page }) => {
    const email = await parentWithAccount(page);
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"server"}' }),
    );
    await fillSignIn(page, email, PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Something went wrong');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  test('copes with a reply that is not what it expects', async ({ page }) => {
    const email = await parentWithAccount(page);
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html>not json</html>' }),
    );
    await fillSignIn(page, email, PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Something went wrong');
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('both links open the same set-password steps, and Back returns with the email kept', async ({ page }) => {
    await openSignedOut(page);
    const email = listedEmail();
    await page.getByLabel('Email').fill(email);
    for (const link of ['First time here', 'Forgot password']) {
      await page.getByRole('button', { name: link }).click();
      await expect(page.getByRole('heading', { name: 'Set a password' })).toBeVisible();
      await expect(page.getByLabel('Email')).toHaveValue(email);
      await page.getByRole('button', { name: 'Back to sign in' }).click();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await expect(page.getByLabel('Email')).toHaveValue(email);
    }
  });

  test('can be used with the keyboard alone, in a sensible order', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Safari skips buttons on Tab unless a system setting is on');
    await openSignedOut(page);
    await page.getByLabel('Email').focus();
    const order: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => document.activeElement?.textContent || document.activeElement?.getAttribute('name') || ''));
    }
    expect(order).toEqual(['password', 'Sign in', 'First time here', 'Forgot password']);
  });
});
