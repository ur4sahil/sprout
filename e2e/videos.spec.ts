import { expect, signUp, test } from './support/fixtures';
import { addChild } from './support/kid';
import { checkScreen } from './support/layout';
import { openFromMath } from './support/sweep';

// Concept videos (step 21). YouTube itself is not loaded in these checks: a blank page stands in
// for the player, so they need no network and play nothing.
test.describe('a video in a lesson', () => {
  test('opens by itself over the lesson (video first) in a sandboxed frame, fits the screen, and closes with one button', async ({ page }) => {
    await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>player</title>' }));
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Add to 5');
    await page.getByRole('button', { name: 'Learn this skill' }).click();
    const player = page.getByRole('dialog', { name: 'Introduction to addition' });
    await expect(player).toBeVisible();
    const frame = player.locator('iframe');
    await expect(frame).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/fsTD_jqseBA\?/);
    const sandbox = (await frame.getAttribute('sandbox')) ?? '';
    expect(sandbox.split(' ')).toContain('allow-scripts');
    expect(sandbox).not.toMatch(/allow-popups|allow-top-navigation/);
    // The video is as large as fits, in the shape of a video, and wholly on screen.
    const box = await frame.boundingBox();
    const view = page.viewportSize();
    expect(box && view && box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width + 0.5 && box.y + box.height <= view.height + 0.5).toBe(true);
    expect(Math.abs((box?.width ?? 0) / (box?.height ?? 1) - 16 / 9)).toBeLessThan(0.02);
    await checkScreen(page, 'video player', 64);
    await page.getByRole('button', { name: /Close/ }).click();
    await expect(player).toBeHidden();
    await expect(page.getByRole('tab', { name: /Lesson/ })).toBeVisible();
  });

  test('a skill with no video has no Video tab', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Are there enough?');
    await page.getByRole('button', { name: 'Learn this skill' }).click();
    await expect(page.getByRole('tab', { name: /Lesson/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Video/ })).toHaveCount(0);
    await expect(page.locator('[data-video]')).toHaveCount(0);
  });
});
