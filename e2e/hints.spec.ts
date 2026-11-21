import { expect, signUp, test } from './support/fixtures';
import { addChild, answerRight, holdHome, openSkill } from './support/kid';
import { checkScreen } from './support/layout';
import { saveScores } from './support/sweep';

// Hints (the owner's choice, Nov 21, 2026): the key in the practice bar opens a nudge, then a worked example, over
// the question; 3 a part; the overlay and its buttons fit every screen and are big enough for a finger.

test.describe('hints', () => {
  test('a child opens a hint, sees the nudge and an example, goes back, and answers', async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signUp(page);
    await addChild(page, 'Robin', 'Kindergarten');
    // Started already, so there is no skip test on the way in.
    await saveScores(page, ['M-K-C4'], 20);
    await openSkill(page, 'Robin', 'Add to 10');

    const key = page.locator('[data-hints-left]');
    await expect(key).toHaveAttribute('aria-label', 'Hint, 3 left');
    await checkScreen(page, 'practice with the hint key', 64);
    await key.click();
    const dialog = page.getByRole('dialog', { name: 'Hint' });
    await expect(dialog.locator('[data-nudge]')).toHaveText(/^Start at \d+\.$/);
    await checkScreen(page, 'hint nudge', 64);
    await page.getByRole('button', { name: /Show me an example/ }).click();
    await expect(dialog).toHaveAttribute('data-hint', 'example');
    await checkScreen(page, 'hint example', 64);
    await page.getByRole('button', { name: /Back to my question/ }).click();
    await expect(dialog).toBeHidden();
    await expect(key).toHaveAttribute('aria-label', 'Hint again');
    await answerRight(page);
    await expect(key).toHaveAttribute('data-hints-left', '2');
    await holdHome(page);
  });
});
