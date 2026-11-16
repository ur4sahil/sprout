import type { Page } from '@playwright/test';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answerAnything } from './support/kid';
import { checkScreen } from './support/layout';
import { openFromMath } from './support/sweep';

// The scratchpad and the two games (step 22).
test.describe('the scratchpad', () => {
  test('a line is drawn over the question, the page does not move, and undo and clear work', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Add within 20');
    await page.getByRole('button', { name: 'Open the scratchpad' }).click();
    const pad = page.getByRole('dialog', { name: 'Scratchpad' });
    await expect(pad).toBeVisible();
    const paper = page.getByRole('img', { name: 'Drawing area' });
    // A finger never scrolls or zooms the page while it draws.
    expect(await paper.evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
    const box = (await paper.boundingBox())!;
    const before = await page.evaluate(() => [window.scrollX, window.scrollY]);
    await page.mouse.move(box.x + 60, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + box.height / 2 + 40, { steps: 5 });
    await page.mouse.up();
    await expect(pad).toHaveAttribute('data-lines', '1');
    await expect(paper.locator('polyline')).toHaveCount(1);
    expect(await page.evaluate(() => [window.scrollX, window.scrollY])).toEqual(before);
    // The question is still there under the drawing.
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await checkScreen(page, 'scratchpad', 64);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(pad).toHaveAttribute('data-lines', '0');
    await page.getByRole('button', { name: 'Close the scratchpad' }).click();
    await expect(pad).toBeHidden();
  });

  test('a kindergarten child has no pencil', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Add to 10');
    await expect(page.getByRole('button', { name: 'Open the scratchpad' })).toHaveCount(0);
  });
});

// A kindergarten child finishes one session (8 questions) of a skill that asks choice questions at every level.
async function toBreak(page: Page): Promise<void> {
  await signUp(page);
  await addChild(page, 'Robin', 'Kindergarten');
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
  await openFromMath(page, 'Compare numbers');
  const rest = page.locator('[data-break]');
  for (let i = 0; i < 8; i += 1) {
    // A milestone may be celebrated on the way. Tap past it.
    const party = page.locator('[data-celebration]');
    if (await party.isVisible()) await party.getByRole('button').first().click();
    if (await rest.isVisible()) break;
    await answerAnything(page);
  }
  const party = page.locator('[data-celebration]');
  if (await party.isVisible()) await party.getByRole('button').first().click();
  await expect(rest).toBeVisible({ timeout: 15_000 });
}

test.describe('the games', () => {
  test('Pop is offered after a finished session, and asks balloon questions that stay in place', async ({ page }) => {
    test.setTimeout(180_000);
    await toBreak(page);
    const rest = page.locator('[data-break]');
    await expect(rest.getByRole('button', { name: /Play Pairs/ })).toBeVisible();
    await checkScreen(page, 'break with games', 64);
    await rest.getByRole('button', { name: /Play Pop/ }).click();
    const balloons = page.locator('[data-balloon]');
    await expect(balloons.first()).toBeVisible();
    await expect(page.locator('[data-pop-count="0"]')).toBeVisible();
    const first = (await balloons.first().boundingBox())!;
    await page.waitForTimeout(700);
    const later = (await balloons.first().boundingBox())!;
    // It bobs a little and never floats away.
    expect(Math.abs(later.x - first.x)).toBeLessThan(1);
    expect(Math.abs(later.y - first.y)).toBeLessThan(12);
    // With motion turned down on the device, the balloons keep still. The rest of the check runs that way.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await balloons.first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await checkScreen(page, 'Pop', 64);
    // Taps in the first moments are ignored, so keep tapping until one lands.
    await expect(async () => {
      if (await page.locator('[data-phase="asking"]').isVisible()) await balloons.first().click({ timeout: 500 });
      const gotIt = page.getByRole('button', { name: /Got it/ });
      if (await gotIt.isVisible()) await gotIt.click();
      await expect(page.locator('[data-pop-count="1"]')).toBeVisible({ timeout: 500 });
    }).toPass();
  });

  test('Pairs is offered too: twelve face-down cards that fit the screen and turn when tapped', async ({ page }) => {
    test.setTimeout(180_000);
    await toBreak(page);
    await page.locator('[data-break]').getByRole('button', { name: /Play Pairs/ }).click();
    await expect(page.locator('[data-card]')).toHaveCount(12);
    await checkScreen(page, 'Pairs', 64);
    await page.locator('[data-card="0"]').click();
    await expect(page.locator('[data-card="0"]')).toHaveAttribute('data-up', '');
    await expect(page.locator('[data-card="0"]')).not.toHaveAttribute('aria-label', /face down/);
  });
});
