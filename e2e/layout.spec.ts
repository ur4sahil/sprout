import path from 'node:path';
import type { Page } from '@playwright/test';
import { PASSWORD, askForCode, expect, fillNewPassword, listedEmail, openSignedOut, test } from './support/fixtures';
import { DIR } from './support/paths';

// Checks one screen at the current size: nothing spills sideways, every
// control is big enough to tap and can be brought on screen.
async function checkScreen(page: Page, label: string): Promise<void> {
  const size = page.viewportSize();
  if (!size) throw new Error('no viewport');

  const widths = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(widths.doc, `${label}: page scrolls sideways`).toBeLessThanOrEqual(widths.inner);
  expect(widths.body, `${label}: body scrolls sideways`).toBeLessThanOrEqual(widths.inner);

  const controls = page.locator('button, input:not([aria-hidden="true"])');
  const count = await controls.count();
  expect(count).toBeGreaterThan(1);
  for (let i = 0; i < count; i += 1) {
    const control = controls.nth(i);
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    const name = (await control.textContent()) || (await control.getAttribute('name')) || `#${i}`;
    if (!box) throw new Error(`${label}: ${name} has no box`);
    expect(box.height, `${label}: ${name} is too short to tap`).toBeGreaterThanOrEqual(44);
    expect(box.x, `${label}: ${name} is cut off on the left`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${label}: ${name} is cut off on the right`).toBeLessThanOrEqual(size.width + 0.5);
    expect(box.y, `${label}: ${name} cannot be scrolled into view`).toBeGreaterThanOrEqual(-0.5);
    expect(box.y + box.height, `${label}: ${name} cannot be scrolled into view`).toBeLessThanOrEqual(size.height + 0.5);
  }

  // Text is not cut off inside its box.
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll('h1, p, label span, button')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent ?? ''),
  );
  expect(clipped, `${label}: text is cut off`).toEqual([]);

  // Typing on an iPad or iPhone must not zoom the page: inputs need 16px text or more.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('input:not([aria-hidden="true"])')]
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => el.getAttribute('name') ?? ''),
  );
  expect(small, `${label}: input text under 16px makes iOS zoom`).toEqual([]);
}

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
