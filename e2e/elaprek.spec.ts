import type { Page } from '@playwright/test';
import { FIRST_SOUNDS } from '../src/content/data/firstSounds';
import { GROUP_WORDS } from '../src/content/data/categories';
import { RHYME_FAMILIES } from '../src/content/data/rhymes';
import { SYLLABLE_WORDS } from '../src/content/data/syllables';
import { expect, signUp, test } from './support/fixtures';
import { addChild, answer, holdHome, shoot } from './support/kid';
import { checkScreen } from './support/layout';
import { openFromSubject, submit, sweepHardestLevels } from './support/sweep';
import { groupNames, skillCount } from './support/catalogue';

// Language Arts pre-K, added in Phase 6d.
const SKILLS: [string, string][] = [
  ['E-PK-A1', 'Find the uppercase letter'],
  ['E-PK-A2', 'Find the lowercase letter'],
  ['E-PK-A3', 'Match uppercase and lowercase'],
  ['E-PK-A4', 'Find the same letter'],
  ['E-PK-A5', 'Letter or number'],
  ['E-PK-B1', 'Starts with the same sound'],
  ['E-PK-B2', 'Rhymes'],
  ['E-PK-B3', 'Count syllables'],
  ['E-PK-C1', 'Word groups'],
  ['E-PK-C2', 'Opposites'],
];

const LA = 'Language Arts';
const score = (page: Page) => page.locator('[data-score]');
const question = (page: Page) => page.getByRole('region', { name: 'Question' });

async function start(page: Page): Promise<void> {
  await signUp(page);
  await addChild(page, 'Robin', 'Pre-K');
  await page.getByRole('button', { name: 'Robin', exact: true }).click();
}

// The names of the pictures offered, in order.
const optionWords = (page: Page): Promise<string[]> => page.locator('[data-option]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));

// The word of the picture the question is about.
const shownWord = async (page: Page): Promise<string> => (await page.locator('[aria-label="Question"] [data-visual="emojiGroup"]').first().getAttribute('aria-label')) ?? '';

test.describe('Language Arts pre-K', () => {
  test('every skill fits the screen at its hardest level, with every control big enough to tap', async ({ page }) => {
    test.setTimeout(240_000);
    await sweepHardestLevels(page, 'Pre-K', SKILLS, 'elaprek', LA);
  });

  test('Language Arts is offered on home, with its three groups of skills', async ({ page }) => {
    await start(page);
    await page.getByRole('button', { name: /^Language Arts$/ }).click();
    await expect(page.getByRole('heading', { name: /Language Arts/ })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(groupNames('ela', 'PK'));
    await expect(page.locator('[data-skill]')).toHaveCount(skillCount('ela', 'PK'));
    await checkScreen(page, 'Language Arts page', 64);
    await shoot(page, 'elaprek-subject');
  });

  test('a letter is asked for by voice only, and one tap answers', async ({ page }) => {
    await start(page);
    await openFromSubject(page, LA, 'Find the uppercase letter');
    await expect(question(page)).toHaveAttribute('data-mode', 'listen');
    // The screen shows the two letters and never says which one was asked for.
    const letters = await optionWords(page);
    expect(letters).toHaveLength(2);
    for (const letter of letters) expect(letter).toMatch(/^[A-Z]$/);
    const text = ((await question(page).textContent()) ?? '').replace('Find the letter.', '');
    // Apart from the prompt, the only letters on the question are the two options (the speaker button is a picture).
    expect(text.replace(/[^A-Za-z]/g, '').split('').sort()).toEqual([...letters].sort());
    await expect(page.locator('[data-answered]')).toHaveText('0');
    // Taps in the first 400 ms are ignored, so keep tapping until one lands. There is no Submit step.
    await expect(async () => {
      if ((await page.locator('[data-answered]').textContent()) === '0') await page.locator('[data-option]').first().click({ timeout: 500 });
      await expect(page.locator('[data-answered]')).toHaveText('1', { timeout: 500 });
    }).toPass();
  });

  test('big and small letters are matched, and letters are sorted from numbers, by touch', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page);
    await openFromSubject(page, LA, 'Match uppercase and lowercase');
    const big = await page.locator('[data-left]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
    const small = await page.locator('[data-right]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
    expect(big).toHaveLength(3);
    for (const [row, letter] of big.entries()) {
      await page.locator(`[data-left="${row}"]`).click();
      await page.locator(`[data-right="${small.indexOf(letter.toLowerCase())}"]`).click();
    }
    await submit(page);
    await expect(score(page)).toHaveAttribute('data-score', '10');
    await holdHome(page);

    await openFromSubject(page, LA, 'Letter or number');
    await expect(page.locator('[data-bin]')).toHaveCount(2);
    const count = await page.locator('[aria-label="To sort"] [data-item]').count();
    expect(count).toBe(4);
    for (let left = count; left > 0; left -= 1) {
      const item = page.locator('[aria-label="To sort"] [data-item]').first();
      const label = (await item.getAttribute('aria-label')) ?? '';
      await item.click();
      await page.getByRole('button', { name: /^\d$/.test(label) ? 'Numbers group' : 'Letters group' }).click();
    }
    await submit(page);
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });

  test('sound questions show named pictures, and the right picture scores', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page);

    await openFromSubject(page, LA, 'Starts with the same sound');
    let word = await shownWord(page);
    await expect(question(page)).toContainText(`Which one starts like ${word}?`);
    const soundOf = (name: string): string | undefined => FIRST_SOUNDS.find((entry) => entry.word === name)?.sound;
    let options = await optionWords(page);
    // Every picture has a word a screen reader can say, and it is a word from the list.
    for (const option of options) expect(soundOf(option), `${option} is not a listed word`).toBeDefined();
    await answer(page, options.findIndex((option) => soundOf(option) === soundOf(word)), 'index');
    await expect(score(page)).toHaveAttribute('data-score', '10');
    await holdHome(page);

    await openFromSubject(page, LA, 'Rhymes');
    word = await shownWord(page);
    await expect(question(page)).toContainText(`Which one rhymes with ${word}?`);
    const family = RHYME_FAMILIES.find((members) => members.some((member) => member.word === word)) ?? [];
    options = await optionWords(page);
    await answer(page, options.findIndex((option) => family.some((member) => member.word === option)), 'index');
    await expect(score(page)).toHaveAttribute('data-score', '10');
    await holdHome(page);

    await openFromSubject(page, LA, 'Count syllables');
    word = await shownWord(page);
    const claps = SYLLABLE_WORDS.find((entry) => entry.word === word)?.parts.length ?? 0;
    expect(claps).toBeGreaterThan(0);
    await answer(page, claps);
    await expect(score(page)).toHaveAttribute('data-score', '10');
  });

  test('a word group is picked out, and a wrong opposite shows the explanation', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page);
    await openFromSubject(page, LA, 'Word groups');
    const asked = /Which one is (an? [a-z ]+)\?/.exec((await question(page).textContent()) ?? '')?.[1] ?? '';
    const group = { 'an animal': 'animals', 'a food': 'food', 'a vehicle': 'vehicles', 'a piece of clothing': 'clothes' }[asked];
    expect(group, `asked for "${asked}"`).toBeDefined();
    const options = await optionWords(page);
    await answer(page, options.findIndex((option) => GROUP_WORDS.some((entry) => entry.word === option && entry.group === group)), 'index');
    await expect(score(page)).toHaveAttribute('data-score', '10');
    await holdHome(page);

    // Opposites, level 1: the picture shown is big or small, and the other size is the answer.
    await openFromSubject(page, LA, 'Opposites');
    const text = (await question(page).textContent()) ?? '';
    const target = /opposite of (big|small)\?/.exec(text)?.[1];
    expect(target).toBeDefined();
    const labels = await optionWords(page);
    // The wrong option is the same size as the picture shown.
    const wrong = labels.findIndex((label) => (target === 'big' ? label.startsWith('large') : label.startsWith('small')));
    expect(wrong).toBeGreaterThanOrEqual(0);
    await answer(page, wrong, 'index');
    await expect(page.getByText(`${target === 'big' ? 'Big and small' : 'Small and big'} are opposites.`)).toBeVisible();
    await checkScreen(page, 'Opposites explanation', 64);
    await shoot(page, 'elaprek-opposites-explained');
  });
});
