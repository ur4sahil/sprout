import { expect, signUp, test } from './support/fixtures';
import { addChild } from './support/kid';
import { checkScreen } from './support/layout';
import { openFromMath, saveScores, submit } from './support/sweep';

// Fill a shape (the owner's request, Nov 18, 2026): the pieces really fit, and a child places them by touch to check.
test.describe('fill a shape with pieces', () => {
  test('a child fills the shape by touch, sees the count, and the shape fits the screen', async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 1');
    // At the top level the tray also holds a piece that does not fit.
    await saveScores(page, ['M-1-D3'], 95);
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    const stickers = page.locator('[data-card="new-stickers"]');
    await stickers.waitFor({ state: 'visible', timeout: 4000 }).catch(() => undefined);
    if (await stickers.isVisible()) await page.getByRole('button', { name: /Yay/ }).click();
    await openFromMath(page, 'How many pieces make a shape');

    const fill = page.locator('[data-fill]');
    await expect(fill).toBeVisible();
    await checkScreen(page, 'fill a shape', 64);
    // The piece that does not fit stays out.
    await page.locator('[data-tray="odd"]').click();
    await page.locator('[data-spot="0"]').click();
    await expect(fill).toHaveAttribute('data-placed', '0');
    // Each spot is filled with a piece that fits: tap a piece, then a spot.
    const spots = await page.locator('[data-spot]').count();
    for (let i = 0; i < spots; i += 1) {
      await page.locator('[data-tray="fit"]').first().click();
      await page.locator(`[data-spot="${i}"]`).click();
      await expect(fill).toHaveAttribute('data-placed', String(i + 1));
    }
    await expect(page.locator('[data-fill-count]')).toHaveAttribute('data-fill-count', String(spots));
    await submit(page);
    await expect(page.locator('[data-phase="correct"]')).toBeVisible();
  });
});
