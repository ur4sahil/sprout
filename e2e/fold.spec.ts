import { expect, signUp, test } from './support/fixtures';
import { checkScreen } from './support/layout';
import { addChild, answerRight, openOnMath, shoot } from './support/kid';

// A foldable phone (iPhone Duo) is opened and closed while the app is in use: the screen changes size under it.
// Nothing may spill sideways or be cut off at either size, and a question in progress carries on.
const CLOSED = { width: 375, height: 812 };
const OPEN = { width: 626, height: 890 };

test('opening and closing a foldable keeps home and a question whole, and the question carries on', async ({ page }) => {
  test.skip(test.info().project.name !== 'fold-open', 'runs once, on the foldable');
  await page.setViewportSize(CLOSED);
  await signUp(page);
  await addChild(page, 'Robin', 'Kindergarten');
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
  await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible();
  await checkScreen(page, 'home, closed', 64);
  await page.setViewportSize(OPEN);
  await checkScreen(page, 'home, opened', 64);
  await shoot(page, 'fold-home-open');

  await openOnMath(page, 'Add to 10');
  await checkScreen(page, 'practice, opened', 64);
  await answerRight(page);
  await expect(page.locator('[data-answered]')).toHaveText('1');
  await page.setViewportSize(CLOSED);
  await checkScreen(page, 'practice, closed', 64);
  await answerRight(page);
  await expect(page.locator('[data-answered]')).toHaveText('2');
  await page.setViewportSize(OPEN);
  await checkScreen(page, 'practice, opened again', 64);
  await shoot(page, 'fold-practice-open');
});
