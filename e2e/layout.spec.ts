import path from 'node:path';
import type { Page } from '@playwright/test';
import { PASSWORD, askForCode, expect, fillNewPassword, listedEmail, openSignedOut, test } from './support/fixtures';
import { checkScreen } from './support/layout';
import { DIR } from './support/paths';

async function shoot(page: Page, name: string): Promise<void> {
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0));
  // Saved for a person to look at: .e2e/shots/<device>-<screen>.png
  const file = path.join(DIR, 'shots', `${test.info().project.name}-${name}.png`);
  await page.screenshot({ path: file });
  await test.info().attach(name, { path: file });
}

test.describe('layout of the account screens', () => {
  test('sign-in screen fits, upright and turned sideways', async ({ page }) => {
    await openSignedOut(page);
    await checkScreen(page, 'sign-in');
    await shoot(page, 'sign-in');

    await page.getByLabel('Email').fill('someone.with.a.very.long.address.indeed@example.com');
    await page.getByLabel('Password', { exact: true }).fill('x');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await checkScreen(page, 'sign-in with a message');
    await shoot(page, 'sign-in-message');

    const size = page.viewportSize();
    if (!size) throw new Error('no viewport');
    await page.setViewportSize({ width: size.height, height: size.width });
    await checkScreen(page, 'sign-in turned');
    await shoot(page, 'sign-in-turned');
  });

  test('set-password screens fit, upright and turned sideways', async ({ page }) => {
    await openSignedOut(page);
    await page.getByRole('button', { name: 'First time here' }).click();
    await checkScreen(page, 'email step');
    await shoot(page, 'email-step');
    await page.getByRole('button', { name: 'Back to sign in' }).click();

    await askForCode(page, listedEmail());
    await fillNewPassword(page, '12', PASSWORD);
    await expect(page.getByRole('alert')).toBeVisible();
    await checkScreen(page, 'code step with a message');
    await shoot(page, 'code-step');

    const size = page.viewportSize();
    if (!size) throw new Error('no viewport');
    await page.setViewportSize({ width: size.height, height: size.width });
    await checkScreen(page, 'code step turned');
    await shoot(page, 'code-step-turned');
  });

  test('the page itself never scrolls or bounces, only the panel inside it', async ({ page }) => {
    await openSignedOut(page);
    const facts = await page.evaluate(() => {
      const shell = document.querySelector('#root > div');
      return {
        docScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
        overscroll: getComputedStyle(document.body).overscrollBehaviorY,
        shellHeight: shell ? shell.getBoundingClientRect().height : 0,
        inner: window.innerHeight,
      };
    });
    expect(facts.docScrolls).toBe(false);
    expect(facts.overscroll).toBe('none');
    expect(Math.round(facts.shellHeight)).toBe(facts.inner);
  });

  test('labels are tied to their fields and messages are announced', async ({ page }) => {
    await openSignedOut(page);
    await page.getByText('Email', { exact: true }).click();
    await expect(page.getByLabel('Email')).toBeFocused();
    await page.getByText('Password', { exact: true }).click();
    await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
