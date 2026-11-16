import { expect, isSilent, openSignedOut, signUp, test } from './support/fixtures';
import { BASE_URL } from './support/paths';

// Every path in the plan's route table, plus ones that do not exist.
const PATHS = [
  '/',
  '/home',
  '/play',
  '/subject/math',
  '/skill/M-K-B3',
  '/skill/M-K-B3/learn',
  '/review',
  '/diagnostic',
  '/awards',
  '/games/pop',
  '/games/pairs',
  '/parent',
  '/parent/dashboard',
  '/parent/scores',
  '/parent/trouble',
  '/parent/log',
  '/parent/plans',
  '/parent/settings',
  '/parent/sound',
  '/parent/pin',
  '/parent/data',
  '/signin',
  '/dev/gallery',
  '/no/such/page',
  '/index.html',
];

test.describe('the sign-in guard', () => {
  test('with no session, every path shows only the sign-in screen', async ({ page }) => {
    for (const path of PATHS) {
      await openSignedOut(page, path);
      await expect(page.getByLabel('Email'), path).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true }), path).toBeVisible();
      await expect(page.getByRole('button', { name: 'First time here' }), path).toBeVisible();
      await expect(page.getByRole('button', { name: 'Forgot password' }), path).toBeVisible();
    }
  });

  test('with a session, unknown and unbuilt paths land on the start screen', async ({ page }) => {
    await signUp(page);
    // (The grown-ups pages are built now. parent.spec.ts covers them and their PIN gate.)
    for (const path of ['/no/such/page', '/home', '/parent/no-such-page', '/dev/gallery']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Sprout' }), path).toBeVisible();
      await expect(page.getByLabel('Email'), path).toHaveCount(0);
      await expect(page, path).toHaveURL(`${BASE_URL}/`);
    }
  });

  test('these tests make no noise: the page has a silent voice and no audio output, before and after a reload', async ({ page }) => {
    await openSignedOut(page);
    expect(await isSilent(page)).toBe(true);
    await page.reload();
    expect(await isSilent(page)).toBe(true);
    await page.goto('/home');
    expect(await isSilent(page)).toBe(true);
  });

  test('the page has the install tags an iPad needs', async ({ page }) => {
    await openSignedOut(page);
    await expect(page).toHaveTitle('Sprout');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Sprout');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
  });
});
