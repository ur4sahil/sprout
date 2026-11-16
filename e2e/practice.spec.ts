import type { Page } from '@playwright/test';
import { expect, signUp, test } from './support/fixtures';
import { checkScreen } from './support/layout';
import path from 'node:path';
import { BASE_URL, DIR } from './support/paths';

// Saved for a person to look at: .e2e/shots/<device>-<screen>.png
async function shoot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(DIR, 'shots', `${test.info().project.name}-${name}.png`) });
}

// Adds a child through the screens. Ends on the profile picker.
async function addChild(page: Page, name: string, grade: string): Promise<void> {
  await page.getByRole('button', { name: 'Add a child' }).click();
  await page.getByLabel('First name').fill(name);
  await page.getByRole('button', { name: 'turtle' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: grade, exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
}

async function openSkill(page: Page, child: string, skill: string): Promise<void> {
  await page.getByRole('button', { name: child, exact: true }).click();
  await page.getByRole('button', { name: new RegExp(`^${skill}\\.`) }).click();
  await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
}

// The sum the question on screen asks for, read from its picture.
async function sum(page: Page): Promise<number> {
  const label = (await page.locator('[data-visual="equation"]').first().getAttribute('aria-label')) ?? '';
  const numbers = (label.match(/\d+/g) ?? []).map(Number);
  return (numbers[0] ?? 0) + (numbers[1] ?? 0);
}

async function answer(page: Page, value: number): Promise<void> {
  const type = await page.getByRole('region', { name: 'Question' }).getAttribute('data-type');
  if (type === 'choice') await page.locator(`[data-option][aria-label="${value}"]`).click();
  else for (const digit of String(value)) await page.getByRole('button', { name: digit, exact: true }).click();
  const submit = page.getByRole('button', { name: /Submit/ });
  await expect(submit).toBeEnabled();
  // Taps in the first 400 ms after a question appears are ignored, so keep tapping until one lands.
  await expect(async () => {
    if (await submit.isVisible()) await submit.click();
    await expect(submit).toBeHidden({ timeout: 300 });
  }).toPass();
}

async function answerRight(page: Page): Promise<number> {
  const value = await sum(page);
  const before = await page.locator('[data-answered]').textContent();
  await answer(page, value);
  await expect(page.locator('[data-answered]')).not.toHaveText(before ?? '');
  await expect(page.locator('[data-phase="asking"]')).toBeVisible();
  return value;
}

test.describe('practice', () => {
  test('a grown-up adds a child, and the child completes a 3-question session, with nothing spilling sideways', async ({ page }) => {
    await signUp(page);
    await page.getByRole('button', { name: 'Add a child' }).click();
    await checkScreen(page, 'child setup, step 1');
    await shoot(page, 'child-setup');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await addChild(page, 'Robin', 'Grade 1');
    await checkScreen(page, 'profile picker', 44);
    await shoot(page, 'picker');

    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Skills' })).toBeVisible();
    await checkScreen(page, 'home', 64);
    await shoot(page, 'home');
    await page.getByRole('button', { name: /^Add to 10\./ }).click();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await checkScreen(page, 'practice', 64);
    await shoot(page, 'practice');

    for (let i = 1; i <= 3; i += 1) {
      await answerRight(page);
      await expect(page.locator('[data-answered]')).toHaveText(String(i));
    }
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '31');
    await expect(page.locator('[data-score]')).toHaveAttribute('data-stage', 'gettingStarted');
  });

  test('a wrong answer shows what was answered, the right answer and the explanation, then moves on', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await openSkill(page, 'Robin', 'Add to 10');
    const right = await sum(page);
    const options = await page.locator('[data-option]').evaluateAll((els) => els.map((el) => Number(el.getAttribute('aria-label'))));
    const wrong = options.find((option) => option !== right) ?? right + 1;
    await answer(page, wrong);
    const panel = page.getByRole('region', { name: 'Explanation' });
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-given]')).toHaveText(String(wrong));
    await expect(panel.locator('[data-correct]')).toHaveText(String(right));
    await expect(panel.locator('ol li').first()).toBeVisible();
    await checkScreen(page, 'explanation', 64);
    await shoot(page, 'explanation');
    await page.getByRole('button', { name: /Got it/ }).click();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await expect(page.locator('[data-answered]')).toHaveText('1');
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '0');
  });

  test('progress is saved on the device: it is still there after the app is closed and opened again', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await openSkill(page, 'Robin', 'Add to 10');
    await answerRight(page);
    await answerRight(page);
    await page.reload();
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add to 10. Score 20' })).toBeVisible();
    // And the next question is a new one, picking up from where the child was.
    await page.getByRole('button', { name: /^Add to 10\./ }).click();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '20');
    await answerRight(page);
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '31');
  });

  test('the other question types work by touch: counting, and putting numbers in order', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();

    await page.getByRole('button', { name: /^Count to 5\./ }).click();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    const group = (await page.locator('[data-visual="emojiGroup"]').first().getAttribute('aria-label')) ?? '';
    await answer(page, Number(/^\d+/.exec(group)?.[0]));
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '10');
    await page.getByRole('button', { name: 'Back to home' }).click();

    await page.getByRole('button', { name: /^Put numbers in order\./ }).click();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    const values = await page.locator('[data-item]').evaluateAll((els) => els.map((el) => Number(el.getAttribute('aria-label'))));
    for (const value of values.slice().sort((a, b) => a - b)) await page.locator(`[data-item][aria-label^="${value}"]`).first().click();
    const submit = page.getByRole('button', { name: /Submit/ });
    await expect(async () => {
      if (await submit.isVisible()) await submit.click();
      await expect(submit).toBeHidden({ timeout: 300 });
    }).toPass();
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '10');
  });

  test('kid screens replace history: the browser Back button never lands on an earlier kid screen', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    const before = await page.evaluate(() => history.length);
    await openSkill(page, 'Robin', 'Add to 10');
    await page.getByRole('button', { name: 'Back to home' }).click();
    await expect(page.getByRole('group', { name: 'Skills' })).toBeVisible();
    expect(await page.evaluate(() => history.length)).toBe(before);
  });

  test('with no child chosen, a skill address goes to the profile picker', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await page.goto('/skill/M-K-C4');
    await expect(page.getByRole('button', { name: 'Robin', exact: true })).toBeVisible();
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });
});

test.describe('the install guide', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' });

  test('a Safari tab on an iPhone or iPad sees only the install guide, until a grown-up chooses to carry on', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Add Sprout to the Home Screen' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
    await checkScreen(page, 'install guide', 44);
    await shoot(page, 'install-guide');

    await page.getByRole('button', { name: 'Use in this browser anyway' }).click();
    await expect(page.getByRole('alert')).toContainText('will not appear in the installed app');
    await page.getByRole('button', { name: 'Carry on in this browser' }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Sprout to the Home Screen' })).toHaveCount(0);
  });
});
