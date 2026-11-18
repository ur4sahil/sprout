import type { Page } from '@playwright/test';
import fs from 'node:fs';
import { PIN, expect, openSignedOut, askForCode, fillNewPassword, listedEmail, signUp, test, typePin } from './support/fixtures';
import { addChild, answerRight, holdHome, openSkill, shoot } from './support/kid';
import { checkScreen } from './support/layout';

// The grown-ups area, added in Phase 8a: the PIN gate, dashboard, scores, settings and data tools.

const PASSWORD = 'a long enough password';

// Waits past the gate's ten-minute pass by ending it: a reload forgets it, as closing the app does.
async function closeGate(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sprout' })).toBeVisible();
}

async function openGrownUps(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Grown-ups' }).click();
}

test.describe('the grown-ups area', () => {
  test('a new family chooses a PIN before anything else, and the screen fits', async ({ page }) => {
    await openSignedOut(page);
    const code = await askForCode(page, listedEmail());
    await fillNewPassword(page, code, PASSWORD);
    await expect(page.getByRole('heading', { name: 'Choose a grown-ups PIN' })).toBeVisible();
    await checkScreen(page, 'choose a PIN', 44);
    await shoot(page, 'parent-choose-pin');
    // Two that do not match start it again.
    await typePin(page, '1234');
    await typePin(page, '4321');
    await expect(page.getByRole('alert')).toHaveText('Those two did not match. Start again.');
    await typePin(page, PIN);
    await typePin(page, PIN);
    await expect(page.getByRole('heading', { name: 'Sprout' })).toBeVisible();
    // It is asked for once: the next launch goes straight to the start screen.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sprout' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose a grown-ups PIN' })).toHaveCount(0);
  });

  test('the gate keeps a child out: a wrong PIN is refused and the right one opens the dashboard', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await closeGate(page);

    // Adding a child is in the grown-ups area, not on the start screen. Grown-ups asks for the PIN.
    await expect(page.getByRole('button', { name: /Add a child/ })).toHaveCount(0);
    await openGrownUps(page);
    await expect(page.getByRole('heading', { name: 'Grown-ups only' })).toBeVisible();
    await checkScreen(page, 'the gate', 44);
    await shoot(page, 'parent-gate');
    await typePin(page, '9999');
    await expect(page.getByRole('alert')).toHaveText('That PIN is not right.');
    await expect(page.locator('[data-parent-page]')).toHaveCount(0);
    await typePin(page, PIN);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page).toHaveURL(/\/parent\/dashboard$/);

    // A grown-up page opened by its address asks too.
    await page.goto('/parent/data');
    await expect(page.getByRole('heading', { name: 'Grown-ups only' })).toBeVisible();
    await expect(page.locator('[data-parent-page]')).toHaveCount(0);
  });

  test('dashboard, scores, settings and data show a child who has practised, and every page fits', async ({ page }) => {
    test.setTimeout(120_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await openSkill(page, 'Robin', 'Add to 10');
    for (let i = 0; i < 3; i += 1) await answerRight(page);
    await holdHome(page);
    await page.getByRole('button', { name: /Switch child/ }).click();
    await openGrownUps(page);

    const practice = page.getByRole('region', { name: 'Practice' });
    await expect(practice.locator('[data-fact="goal"]')).toHaveText(/^Today's plan: 3 of \d+ questions$/);
    await expect(practice.getByRole('img', { name: 'Questions each day for the last 14 days. 3 in all.' })).toBeVisible();
    await expect(practice.locator('[data-fact="picks"]')).toContainText('Add to 10');
    await checkScreen(page, 'dashboard', 44);
    await shoot(page, 'parent-dashboard');

    await page.getByRole('tab', { name: 'Scores' }).click();
    const row = page.locator('[data-skill-row="M-K-C4"]');
    await expect(row.locator('[data-cell="score"]')).toHaveText('31');
    await expect(row.locator('[data-stage]')).toHaveText('Getting started');
    await page.getByRole('button', { name: 'Score', exact: true }).click();
    await expect(page.locator('[data-skill-row]').first()).toHaveAttribute('data-skill-row', 'M-K-C4');
    await checkScreen(page, 'scores', 44);
    await shoot(page, 'parent-scores');

    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('switch', { name: /Reasoning practice/ }).click();
    await expect(page.getByRole('status')).toHaveText('Saved.');
    await page.getByRole('switch', { name: /Pre-reader mode/ }).click();
    await checkScreen(page, 'settings', 44);
    await shoot(page, 'parent-settings');
    await page.getByRole('button', { name: 'Sound check' }).click();
    await expect(page.getByRole('region', { name: 'Sound check' })).toBeVisible();
    await checkScreen(page, 'sound check', 44);

    await page.getByRole('tab', { name: 'Data' }).click();
    await expect(page.locator('[data-signed-in]')).toContainText('Signed in as');
    await expect(page.getByRole('region', { name: 'Credits' })).toContainText('Illustrative Mathematics');
    await checkScreen(page, 'data', 44);
    await shoot(page, 'parent-data');

    // The new setting reached the child's home: the goal is the plan's questions added up, with its skills to practice.
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await expect(page.getByRole('img', { name: /^3 of \d+ questions today$/ })).toBeVisible();
    // Reasoning practice was turned off: Math and Language Arts are left.
    await expect(page.locator('[data-plan-part="keepGoing"]')).toHaveCount(2);
    await expect(page.locator('[data-subject="reasoning"]')).toHaveCount(0);
  });

  test('export makes a backup file, and importing it on a wiped device brings everything back', async ({ page, browserName }) => {
    test.setTimeout(120_000);
    // A test browser has no share sheet to hand the file to, so the app saves it as a download.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
    });
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await openSkill(page, 'Robin', 'Add to 10');
    for (let i = 0; i < 2; i += 1) await answerRight(page);
    await holdHome(page);
    await page.getByRole('button', { name: /Switch child/ }).click();
    await openGrownUps(page);
    await page.getByRole('tab', { name: 'Data' }).click();

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export everything' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^sprout-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const file = await download.path();
    const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as { format: string; children: { name: string }[]; attempts: unknown[]; family: { pinHash: string | null } };
    expect(saved.format).toBe('sprout-export');
    expect(saved.children.map((child) => child.name)).toEqual(['Robin']);
    expect(saved.attempts).toHaveLength(2);
    // The file holds the scrambled PIN, never the PIN.
    expect(saved.family.pinHash).toMatch(/^[0-9a-f]{64}$/);
    expect(fs.readFileSync(file, 'utf8')).not.toContain(`"${PIN}"`);
    await expect(page.getByRole('status').first()).toContainText(/backup file/);

    // Reset the child: two clear steps. Then bring the file back: the child stays reset.
    await page.getByRole('button', { name: 'Reset Robin' }).click();
    await expect(page.getByRole('alert')).toContainText('It cannot be undone');
    await page.getByRole('button', { name: 'Yes, reset Robin' }).click();
    await expect(page.getByText('Robin starts again from the beginning.')).toBeVisible();
    await page.locator('[data-import-file]').setInputFiles(file);
    await expect(page.getByText(/^Imported\./)).toBeVisible();
    await page.getByRole('tab', { name: 'Scores' }).click();
    await expect(page.locator('[data-skill-row="M-K-C4"] [data-cell="score"]')).toHaveText('0');
    void browserName;
  });

  test('signing out keeps the child on the device, and signing in again finds the same PIN', async ({ page }) => {
    const email = await signUp(page, listedEmail(), PASSWORD);
    await addChild(page, 'Robin', 'Kindergarten');
    await openGrownUps(page);
    await page.getByRole('tab', { name: 'Data' }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Straight to the start screen: no new PIN to choose, and the child is still there.
    await expect(page.getByRole('button', { name: 'Robin', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose a grown-ups PIN' })).toHaveCount(0);
    await openGrownUps(page);
    await typePin(page, PIN);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('Forgot PIN: the right password lets a grown-up choose a new PIN', async ({ page }) => {
    await signUp(page, listedEmail(), PASSWORD);
    await addChild(page, 'Robin', 'Kindergarten');
    await closeGate(page);
    await openGrownUps(page);
    await page.getByRole('button', { name: 'Forgot PIN' }).click();
    await page.getByLabel('Password').fill('this is not the password');
    await page.getByRole('button', { name: 'Check password' }).click();
    await expect(page.getByRole('alert')).toHaveText('That password is not right.');
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Check password' }).click();
    await expect(page.getByRole('heading', { name: 'Choose a new PIN' })).toBeVisible();
    await typePin(page, '2468');
    await typePin(page, '2468');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await closeGate(page);
    await openGrownUps(page);
    await typePin(page, PIN);
    await expect(page.getByRole('alert')).toHaveText('That PIN is not right.');
    await typePin(page, '2468');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
