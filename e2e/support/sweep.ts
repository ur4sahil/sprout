import type { Page } from '@playwright/test';
import { expect, signUp } from './fixtures';
import { addChild, holdHome, shoot } from './kid';
import { checkScreen } from './layout';

// Gives the one child on this device a saved score on each of these skills, so the hardest level is asked.
export async function saveScores(page: Page, ids: string[], score: number): Promise<void> {
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
    { ids, value: score },
  );
  await page.reload();
}

// Opens a skill from its tile on a subject's page. `tab` is the grade tab to switch to first, when it is not the child's own.
export async function openFromSubject(page: Page, subject: string, name: string, tab?: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(subject) }).click();
  if (tab) await page.getByRole('tab', { name: tab }).click();
  await page.locator(`[data-skill] >> role=button[name=/^${name.replace(/[:,]/g, (c) => `\\${c}`)}\\. Score/]`).click();
  await expect(page.locator('[data-phase="asking"]')).toBeVisible();
}

export const openFromMath = (page: Page, name: string, tab?: string): Promise<void> => openFromSubject(page, 'Math', name, tab);

export const submit = async (page: Page): Promise<void> => {
  const button = page.getByRole('button', { name: /Submit/ });
  await expect(button).toBeEnabled();
  await expect(async () => {
    if (await button.isVisible()) await button.click();
    await expect(button).toBeHidden({ timeout: 300 });
  }).toPass();
};


// The layout check every content step runs: each skill, at its hardest level, at this screen size.
export async function sweepHardestLevels(page: Page, grade: string, skills: [string, string][], shotPrefix: string, subject = 'Math'): Promise<void> {
  await signUp(page);
  await addChild(page, 'Robin', grade);
  await saveScores(page, skills.map(([id]) => id), 85);
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
  // Scores that high earn stickers, and home shows them once. Tap past the card.
  const stickers = page.locator('[data-card="new-stickers"]');
  await stickers.waitFor({ state: 'visible', timeout: 4000 }).catch(() => undefined);
  if (await stickers.isVisible()) await page.getByRole('button', { name: /Yay/ }).click();
  for (const [id, name] of skills) {
    await openFromSubject(page, subject, name);
    await checkScreen(page, `${id} at its hardest level`, 64);
    // Nothing a child must see is cut off by its own box.
    const cut = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-label="Question"] [data-visual]')]
        .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > window.innerWidth + 0.5)
        .map((el) => el.getAttribute('aria-label') ?? ''),
    );
    expect(cut, `${id}: a picture is cut off`).toEqual([]);
    await shoot(page, `${shotPrefix}-${id}`);
    await holdHome(page);
  }
}
