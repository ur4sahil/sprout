import type { Page } from '@playwright/test';
import { expect, signUp, test } from './support/fixtures';
import { addChild, holdHome } from './support/kid';
import { checkScreen } from './support/layout';
import { openFromMath, saveScores, submit } from './support/sweep';

// The five question types of plan section 15.4, each answered right at its challenge level (a score of 95),
// at every screen size, with every control big enough for a finger.

const prompt = async (page: Page): Promise<string> => (await page.locator('[data-phase="asking"]').textContent()) ?? '';

async function rightAnswerAccepted(page: Page, label: string): Promise<void> {
  await submit(page);
  await expect(page.locator('[data-phase="correct"]'), `${label}: the right answer was not taken as right`).toBeVisible();
}

test.describe('the new question types', () => {
  test('a child answers each new type by touch, and each fits the screen', async ({ page }) => {
    test.setTimeout(300_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 3');
    await saveScores(page, ['M-2-A6', 'M-2-C1', 'M-2-C4', 'M-3-B1', 'M-1-B5'], 95);
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    const stickers = page.locator('[data-card="new-stickers"]');
    await stickers.waitFor({ state: 'visible', timeout: 4000 }).catch(() => undefined);
    if (await stickers.isVisible()) await page.getByRole('button', { name: /Yay/ }).click();

    // Number line: tap the mark.
    await openFromMath(page, 'Number lines to 100', 'Grade 2');
    await checkScreen(page, 'numberLineTap', 64);
    const target = Number(/Put the dot on (\d+)/.exec(await prompt(page))?.[1]);
    const labels = (await page.locator('[data-mark] text').allTextContents()).map(Number);
    const [min, max] = [labels[0] as number, labels[labels.length - 1] as number];
    const index = (target - min) / ((max - min) / 10);
    const mark = (await page.locator(`[data-mark="${index}"] line`).boundingBox())!;
    await page.mouse.click(mark.x + mark.width / 2, mark.y + mark.height / 2);
    await expect(page.locator('[data-marker]')).toBeVisible();
    await rightAnswerAccepted(page, 'numberLineTap');
    await holdHome(page);

    // Clock: turn the hands with the buttons.
    await openFromMath(page, 'Time to five minutes', 'Grade 2');
    await checkScreen(page, 'setClock', 64);
    const [, hour, minute] = /Set the clock to (\d+):(\d+)/.exec(await prompt(page)) ?? [];
    for (let i = 0; i < Number(hour); i += 1) await page.getByRole('button', { name: 'Hour on' }).click();
    for (let i = 0; i < Number(minute) / 5; i += 1) await page.getByRole('button', { name: 'Minutes on' }).click();
    await expect(page.locator('[data-set-clock]')).toHaveAttribute('data-set-clock', `${hour}:${minute}`);
    await rightAnswerAccepted(page, 'setClock');
    await holdHome(page);

    // Bar graph: raise each bar to its tally.
    await openFromMath(page, 'Bar graphs', 'Grade 2');
    await checkScreen(page, 'buildBar', 64);
    const counts = (await page.locator('[data-visual="tally"]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''))).map((text) => Number(/\d+/.exec(text)?.[0]));
    const rows = page.locator('[data-bar]');
    for (let i = 0; i < counts.length; i += 1) {
      const raise = rows.nth(i).getByRole('button', { name: /raise/ });
      for (let n = 0; n < (counts[i] as number); n += 1) await raise.click();
    }
    await rightAnswerAccepted(page, 'buildBar');
    await holdHome(page);

    // Column sum: type the digits, ones first.
    await openFromMath(page, 'Add within 1,000, regrouping');
    await checkScreen(page, 'columnSum', 64);
    const [, a, b] = /(\d+) plus (\d+)/.exec(await prompt(page)) ?? [];
    const sum = String(Number(a) + Number(b));
    for (const digit of sum.split('').reverse()) await page.getByRole('group', { name: 'Number pad' }).getByRole('button', { name: digit, exact: true }).click();
    await rightAnswerAccepted(page, 'columnSum');
    await holdHome(page);

    // Gap: drag the number onto it.
    await openFromMath(page, 'Missing number in an equation', 'Grade 1');
    await checkScreen(page, 'dragWord', 64);
    const line = (await page.locator('[aria-label="Question"] p').filter({ has: page.locator('[data-gap]') }).textContent()) ?? '';
    const nums = (line.match(/\d+/g) ?? []).map(Number);
    const total = nums[nums.length - 1] as number;
    const missing = total - (nums[0] as number);
    const chip = page.locator('[data-option]').filter({ hasText: new RegExp(`^${missing}$`) });
    const from = (await chip.boundingBox())!;
    const to = (await page.locator('[data-gap]').boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('[data-gap]')).not.toHaveAttribute('data-gap', '');
    await rightAnswerAccepted(page, 'dragWord');
  });
});
