import type { Page } from '@playwright/test';
import { expect, signUp, test } from './support/fixtures';
import { addChild, holdHome, shoot } from './support/kid';
import { checkScreen } from './support/layout';

const SKILLS: [string, string][] = [
  ['M-PK-A1', 'Count to 3'],
  ['M-PK-A2', 'Count to 5'],
  ['M-PK-A3', 'Count to 10'],
  ['M-PK-A4', 'Tap that many'],
  ['M-PK-A5', 'Find the number, 1 to 5'],
  ['M-PK-A6', 'Find the number, 1 to 10'],
  ['M-PK-A7', 'Match numbers to groups'],
  ['M-PK-A8', 'Dot cards'],
  ['M-PK-B1', 'Which has more'],
  ['M-PK-B2', 'Which has fewer'],
  ['M-PK-C1', 'Find the shape'],
  ['M-PK-C2', 'Find the colour'],
  ['M-PK-C3', 'Big and small'],
  ['M-PK-D1', 'Which one is different'],
  ['M-PK-D2', 'What comes next: AB patterns'],
  ['M-PK-D3', 'Sort into two groups'],
];

// Gives the one child on this device a saved score on every pre-K skill, so the hardest level is asked.
async function saveScores(page: Page, score: number): Promise<void> {
  await page.evaluate(
    async ({ ids, value }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open('sprout');
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const tx = db.transaction(['children', 'skillStates'], 'readwrite');
      const children = await new Promise<{ id: string }[]>((resolve) => {
        const all = tx.objectStore('children').getAll();
        all.onsuccess = () => resolve(all.result as { id: string }[]);
      });
      const childId = (children[0] as { id: string }).id;
      const at = new Date().toISOString();
      for (const skillId of ids) {
        tx.objectStore('skillStates').put(
          { childId, skillId, score: value, bestScore: value, streak: 3, attempts: 20, correct: 18, recent: Array.from({ length: 10 }, () => true), masteredAt: null, placedOut: false, reviewBox: 0, reviewDueAt: null, lastPracticedAt: at, updatedAt: at },
          `${childId}|${skillId}`,
        );
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { ids: SKILLS.map(([id]) => id), value: score },
  );
  await page.reload();
}

async function openFromMath(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: /Math/ }).click();
  await page.locator(`[data-skill] >> role=button[name=/^${name.replace(/[:,]/g, (c) => `\\${c}`)}\\. Score/]`).click();
  await expect(page.locator('[data-phase="asking"]')).toBeVisible();
}

const submit = async (page: Page): Promise<void> => {
  const button = page.getByRole('button', { name: /Submit/ });
  await expect(button).toBeEnabled();
  await expect(async () => {
    if (await button.isVisible()) await button.click();
    await expect(button).toBeHidden({ timeout: 300 });
  }).toPass();
};

test.describe('Math pre-K', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(240_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Pre-K');
    await saveScores(page, 85);
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    for (const [id, name] of SKILLS) {
      await openFromMath(page, name);
      await checkScreen(page, `${id} at its hardest level`, 64);
      // Nothing a child must see is cut off by its own box.
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll('[aria-label="Question"] [data-visual]')]
          .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > window.innerWidth + 0.5)
          .map((el) => el.getAttribute('aria-label') ?? ''),
      );
      expect(cut, `${id}: a picture is cut off`).toEqual([]);
      await shoot(page, `prek-${id}`);
      await holdHome(page);
    }
  });

  test('tapping, matching and sorting work by touch, and a right answer scores', async ({ page }) => {
    test.setTimeout(120_000);
    await signUp(page);
    await addChild(page, 'Robin', 'Pre-K');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();

    // Tap that many: the number is in the prompt.
    await openFromMath(page, 'Tap that many');
    const wanted = Number(/\d+/.exec((await page.getByRole('region', { name: 'Question' }).textContent()) ?? '')?.[0]);
    for (let i = 1; i <= wanted; i += 1) await page.getByRole('button', { name: `Object ${i}`, exact: true }).click();
    await submit(page);
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '10');
    await holdHome(page);

    // Match numbers to groups: each numeral goes with the group of that many.
    await openFromMath(page, 'Match numbers to groups');
    const numbers = await page.locator('[data-left]').evaluateAll((els) => els.map((el) => Number.parseInt(el.getAttribute('aria-label') ?? '', 10)));
    const groups = await page.locator('[data-right]').evaluateAll((els) => els.map((el) => Number.parseInt(el.getAttribute('aria-label') ?? '', 10)));
    for (const [row, n] of numbers.entries()) {
      await page.locator(`[data-left="${row}"]`).click();
      await page.locator(`[data-right="${groups.indexOf(n)}"]`).click();
    }
    await submit(page);
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '10');
    await holdHome(page);

    // Sort into two groups, by colour: each shape goes in the group named after its colour.
    await openFromMath(page, 'Sort into two groups');
    const bins = await page.locator('[data-bin]').evaluateAll((els) => els.map((el) => (el.getAttribute('aria-label') ?? '').replace(' group', '').toLowerCase()));
    const count = await page.locator('[aria-label="To sort"] [data-item]').count();
    for (let left = count; left > 0; left -= 1) {
      const item = page.locator('[aria-label="To sort"] [data-item]').first();
      const label = (await item.getAttribute('aria-label')) ?? '';
      await item.click();
      // The tap lands in the middle of the group, which may be on a shape already sorted. It must still drop there.
      await page.locator(`[data-bin="${bins.findIndex((colour) => label.includes(colour))}"]`).click();
    }
    await submit(page);
    await expect(page.locator('[data-score]')).toHaveAttribute('data-score', '10');
  });

  test('a pre-K child answers a listening question with one tap: there is no second step', async ({ page }) => {
    await signUp(page);
    await addChild(page, 'Robin', 'Pre-K');
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await openFromMath(page, 'Find the number, 1 to 5');
    const question = page.getByRole('region', { name: 'Question' });
    await expect(question).toHaveAttribute('data-mode', 'listen');
    // The screen does not show which number was asked for.
    await expect(question).toContainText('Find the number.');
    await expect(page.locator('[data-answered]')).toHaveText('0');
    // Taps in the first 400 ms are ignored, so keep tapping until one lands.
    await expect(async () => {
      if ((await page.locator('[data-answered]').textContent()) === '0') await page.locator('[data-option]').first().click({ timeout: 500 });
      await expect(page.locator('[data-answered]')).toHaveText('1', { timeout: 500 });
    }).toPass();
  });
});
