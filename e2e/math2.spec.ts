import { expect, signUp, test } from './support/fixtures';
import { addChild, answer } from './support/kid';
import { openFromMath, sweepHardestLevels } from './support/sweep';
import { groupNames, skillCount } from './support/catalogue';

// Math grade 2 (Phases 11c and 11d): all 22 skills.
const SKILLS: [string, string][] = [
  ['M-2-A1', 'Hundreds, tens, ones'],
  ['M-2-A2', 'Expanded form'],
  ['M-2-A3', 'Compare three-digit numbers'],
  ['M-2-A4', 'Skip count by 5s, 10s, 100s'],
  ['M-2-A5', 'Even and odd'],
  ['M-2-A6', 'Number lines to 100'],
  ['M-2-B1', 'Add within 100, no regrouping'],
  ['M-2-B2', 'Add within 100, regrouping'],
  ['M-2-B3', 'Subtract within 100, no regrouping'],
  ['M-2-B4', 'Subtract within 100, regrouping'],
  ['M-2-B5', 'Add within 1,000'],
  ['M-2-B6', 'Subtract within 1,000'],
  ['M-2-B7', 'Add or subtract 10 or 100'],
  ['M-2-B8', 'Arrays and repeated addition'],
  ['M-2-B9', 'One-step word problems to 100'],
  ['M-2-B10', 'Two-step word problems'],
  ['M-2-C1', 'Time to five minutes'],
  ['M-2-C2', 'Count coins'],
  ['M-2-C3', 'Measure with a ruler'],
  ['M-2-C4', 'Bar graphs'],
  ['M-2-D1', 'Name shapes by sides'],
  ['M-2-D2', 'Halves, thirds, fourths'],
];

test.describe('Math grade 2', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(480_000);
    await sweepHardestLevels(page, 'Grade 2', SKILLS, 'math2');
  });

  test('every skill fits the screen at its first level too', async ({ page }) => {
    test.setTimeout(480_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 2');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    for (const [, name] of SKILLS) {
      await openFromMath(page, name);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll('[aria-label="Question"] [data-visual]')].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > window.innerWidth + 0.5).map((el) => el.getAttribute('aria-label') ?? ''),
      );
      expect(cut, `${name}: a picture is cut off`).toEqual([]);
      await page.getByRole('button', { name: /^Back to home\. Press and hold/ }).dispatchEvent('pointerdown');
      await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible({ timeout: 8000 });
    }
  });

  test('the Math page opens on Grade 2 for a grade 2 child, with its four groups', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 2');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await page.getByRole('button', { name: /^Math$/ }).click();
    await expect(page.getByRole('tab', { name: 'Grade 2' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-skill]')).toHaveCount(skillCount('math', '2'));
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(groupNames('math', '2'));
  });

  test('a ruler is read from zero by touch, and the dot on a number line does not give its number away', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Grade 2');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Measure with a ruler');
    const ruler = (await page.locator('[aria-label="Question"] [data-visual="ruler"]').getAttribute('aria-label')) ?? '';
    const [from, to] = (ruler.match(/\d+/g) ?? []).map(Number);
    expect(from).toBe(0);
    await answer(page, (to ?? 0) - (from ?? 0));
    await expect(page.locator('[data-score]')).not.toHaveAttribute('data-score', '0');
    await page.getByRole('button', { name: /^Back to home\. Press and hold/ }).dispatchEvent('pointerdown');
    await expect(page.getByRole('list', { name: "Today's plan" })).toBeVisible({ timeout: 8000 });

    await openFromMath(page, 'Number lines to 100');
    const line = page.locator('[aria-label="Question"] [data-visual="numberLine"]');
    await expect(line).toHaveAttribute('aria-label', 'number line from 0 to 100 by 10, dot on a hidden number');
    await expect(line.locator('[data-dot]')).toHaveCount(1);
    await expect(line.locator('[data-hidden]')).toHaveCount(1);
  });
});
