import type { Page } from '@playwright/test';
import { CVC_WORDS } from '../src/content/data/cvc';
import { SENTENCE_PICTURES } from '../src/content/data/sentencePictures';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answer, holdHome } from './support/kid';
import { openFromSubject, submit, sweepHardestLevels } from './support/sweep';

// Language Arts kindergarten, added in Phase 11e.
const SKILLS: [string, string][] = [
  ['E-K-A1', 'ABC order'],
  ['E-K-A2', 'Uppercase and lowercase, all letters'],
  ['E-K-B1', 'First letter of a word'],
  ['E-K-B2', 'Last letter of a word'],
  ['E-K-B3', 'Middle vowel'],
  ['E-K-B4', 'Read a word, pick the picture'],
  ['E-K-B5', 'Spell a word'],
  ['E-K-B6', 'Rhyming words'],
  ['E-K-B7', 'Word families'],
  ['E-K-C1', 'Sight words, set 1'],
  ['E-K-C2', 'Sight words, set 2'],
  ['E-K-C3', 'Sight words, set 3'],
  ['E-K-D1', 'Capitals and periods'],
  ['E-K-D2', 'Naming words'],
  ['E-K-D3', 'One and more than one'],
  ['E-K-E1', 'Read a sentence'],
];

const LA = 'Language Arts';
const score = (page: Page) => page.locator('[data-score]');
const question = (page: Page) => page.getByRole('region', { name: 'Question' });
const optionWords = (page: Page): Promise<string[]> => page.locator('[data-option]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));

async function start(page: Page): Promise<void> {
  await signUp(page);
  await addChild(page, 'Robin', 'Kindergarten');
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
}

test.describe('Language Arts kindergarten', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(420_000);
    await sweepHardestLevels(page, 'Kindergarten', SKILLS, 'elak', LA);
  });

  test('every skill fits the screen at its first level too', async ({ page }) => {
    test.setTimeout(420_000);
    await start(page);
    for (const [, name] of SKILLS) {
      await openFromSubject(page, LA, name);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll('[aria-label="Question"] [data-visual]')].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > window.innerWidth + 0.5).map((el) => el.getAttribute('aria-label') ?? ''),
      );
      expect(cut, `${name}: a picture is cut off`).toEqual([]);
      await holdHome(page);
    }
  });

  test('the Language Arts page opens on Kindergarten, with its five groups', async ({ page }) => {
    await start(page);
    await page.getByRole('button', { name: /Language Arts/ }).click();
    await expect(page.getByRole('tab', { name: 'Kindergarten' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['A. Letters', 'B. Sounds and spelling', 'C. Sight words', 'D. Words and sentences', 'E. Reading']);
    await expect(page.locator('[data-skill]')).toHaveCount(16);
  });

  test('a written word is read and matched to its picture, and a sentence too', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page);
    await openFromSubject(page, LA, 'Read a word, pick the picture');
    await expect(question(page)).toHaveAttribute('data-mode', 'read');
    const word = ((await page.locator('[aria-label="Question"] [data-visual="text"]').first().textContent()) ?? '').trim();
    expect(CVC_WORDS.some((entry) => entry.word === word), `"${word}" is not a listed word`).toBe(true);
    await answer(page, (await optionWords(page)).indexOf(word), 'index');
    await expect(score(page)).toHaveAttribute('data-score', '10');
    await holdHome(page);

    await openFromSubject(page, LA, 'Read a sentence');
    const sentence = ((await page.locator('[aria-label="Question"] [data-visual="text"]').first().textContent()) ?? '').trim();
    const entry = SENTENCE_PICTURES.find((each) => each.sentence === sentence);
    expect(entry, `"${sentence}" is not a listed sentence`).toBeDefined();
    await answer(page, (await optionWords(page)).indexOf(entry?.word ?? ''), 'index');
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });

  test('a sight word is asked for by voice only, and words are sorted into families by touch', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page);
    await openFromSubject(page, LA, 'Sight words, set 1');
    await expect(question(page)).toHaveAttribute('data-mode', 'listen');
    await expect(question(page)).toContainText(/Listen\. Tap (the|one) word\./);
    expect(await optionWords(page)).toHaveLength(3);
    await holdHome(page);

    await openFromSubject(page, LA, 'Word families');
    const bins = await page.locator('[data-bin]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
    expect(bins).toHaveLength(2);
    const count = await page.locator('[aria-label="To sort"] [data-item]').count();
    expect(count).toBe(4);
    for (let left = count; left > 0; left -= 1) {
      const item = page.locator('[aria-label="To sort"] [data-item]').first();
      const label = ((await item.getAttribute('aria-label')) ?? '').trim();
      const bin = bins.find((each) => label.endsWith(each.replace(/^-/, '').replace(/ group$/, ''))) ?? '';
      await item.click();
      await page.getByRole('button', { name: bin, exact: true }).click();
    }
    await submit(page);
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });
});
