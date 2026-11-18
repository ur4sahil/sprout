import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import path from 'node:path';
import { PASSWORD, fillSignIn, openSignedOut, signUp, typePin } from '../e2e/support/fixtures';
import { addChild, answer, answerRight, sum } from '../e2e/support/kid';
import { DIR } from '../e2e/support/paths';

// One walk through the deployed test copy with a made-up family: sign-up, the look, practice,
// the recorded voice, the wrong-answer walk-through, the kid lock, pre-reader tiles, the grown-ups
// area, and the same family on a second device.

interface Spoken {
  status: number;
  type: string;
  from: string | null;
  bytes: number;
}

const shot = (page: Page, name: string): Promise<Buffer> => page.screenshot({ path: path.join(DIR, 'shots', `staging-${name}.png`) });

test('the deployed app works end to end for a new family', async ({ page, browser }) => {
  const spoken: Spoken[] = [];
  page.on('response', (reply) => {
    if (!reply.url().endsWith('/api/voice')) return;
    void reply
      .body()
      .then((body) => spoken.push({ status: reply.status(), type: reply.headers()['content-type'] ?? '', from: reply.headers()['x-voice'] ?? null, bytes: body.length }))
      .catch(() => spoken.push({ status: reply.status(), type: '', from: null, bytes: 0 }));
  });

  await test.step('a new family signs up, chooses a PIN and adds two children', async () => {
    const email = await signUp(page);
    test.info().annotations.push({ type: 'account', description: email });
    await addChild(page, 'Robin', 'Grade 1');
    await addChild(page, 'Kit', 'Pre-K');
    await shot(page, '1-picker');
  });

  await test.step('the look: Nunito, drawn icons, rows for a reader', async () => {
    await page.getByRole('button', { name: 'Robin', exact: true }).click();
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Nunito');
    expect(await page.evaluate(async () => (await document.fonts.ready, document.fonts.check('16px "Nunito Variable"')))).toBe(true);
    expect(await page.locator('svg[data-icon]').count()).toBeGreaterThan(4);
    await expect(page.locator('[data-skill]').first()).toHaveAttribute('data-look', 'row');
    await shot(page, '2-home');
  });

  await test.step('practice: a question appears and the recorded voice is fetched without any tap', async () => {
    await page.getByRole('button', { name: 'Math', exact: true }).click();
    await page.getByRole('button', { name: /^Add within 20\./ }).click();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    // The prompt, "Not quite" with step one, and the later steps are all asked for as the question shows.
    await expect.poll(() => spoken.length, { timeout: 60_000 }).toBeGreaterThanOrEqual(3);
    for (const each of spoken) {
      expect(each.status, JSON.stringify(each)).toBe(200);
      expect(each.type).toBe('audio/mpeg');
      expect(each.bytes).toBeGreaterThan(2000);
      expect(['made', 'saved']).toContain(each.from);
    }
    await shot(page, '3-practice');
  });

  await test.step('a sentence made once is served from the store the second time, and it is real audio', async () => {
    const result = await page.evaluate(async () => {
      const ask = async (): Promise<{ status: number; from: string | null; ms: number; bytes: ArrayBuffer }> => {
        const started = performance.now();
        const reply = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'This sentence checks the voice.' }) });
        const bytes = await reply.arrayBuffer();
        return { status: reply.status, from: reply.headers.get('X-Voice'), ms: Math.round(performance.now() - started), bytes };
      };
      const first = await ask();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const second = await ask();
      const head = [...new Uint8Array(second.bytes.slice(0, 3))];
      let seconds: number | string = 'no AudioContext';
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        seconds = (await new Ctx().decodeAudioData(second.bytes.slice(0))).duration;
      } catch (error) {
        seconds = `decode failed: ${String(error)}`;
      }
      return { first: { status: first.status, from: first.from, ms: first.ms }, second: { status: second.status, from: second.from, ms: second.ms, size: second.bytes.byteLength }, head, seconds };
    });
    test.info().annotations.push({ type: 'voice', description: JSON.stringify(result) });
    expect(result.first.status).toBe(200);
    expect(result.second.status).toBe(200);
    expect(result.second.from).toBe('saved');
    // An MP3 starts with an ID3 tag or a frame sync.
    expect(result.head[0] === 0x49 || result.head[0] === 0xff, JSON.stringify(result.head)).toBe(true);
  });

  await test.step('a right answer moves the score; a wrong one says "Not quite" and walks through the steps', async () => {
    await answerRight(page);
    await expect(page.locator('[data-phase="asking"]')).toBeVisible();
    const right = await sum(page);
    const wrong = await page.locator('[data-option]').evaluateAll((els, n) => els.findIndex((el) => el.getAttribute('aria-label') !== String(n)), right);
    await answer(page, wrong, 'index');
    const panel = page.getByRole('region', { name: 'Explanation' });
    await expect(panel.locator('[data-verdict]')).toHaveText(/Not quite/);
    await expect(panel.locator('[data-asked]')).toContainText('equals what?');
    await expect(panel.locator('ol li')).toHaveCount(1);
    await shot(page, '4-not-quite');
    while (await page.getByRole('button', { name: /Next step/ }).isVisible()) await page.getByRole('button', { name: /Next step/ }).click();
    await page.getByRole('button', { name: /Got it/ }).click();
    await expect(page.locator('[data-phase="asking"]')).toBeVisible();
  });

  await test.step('the kid lock: a tap says "Press and hold", a 2-second hold goes home', async () => {
    const home = page.getByRole('button', { name: /^Back to home\. Press and hold/ });
    await home.dispatchEvent('pointerdown');
    await page.waitForTimeout(300);
    await home.dispatchEvent('pointerup');
    await expect(page.locator('[data-hold-hint]')).toHaveText('Press and hold');
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await home.dispatchEvent('pointerdown');
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible({ timeout: 8000 });
  });

  await test.step('a pre-reader sees picture tiles', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Kit', exact: true }).click();
    await expect(page.getByRole('group', { name: "Today's picks" })).toBeVisible();
    await expect(page.locator('[data-skill]').first()).toHaveAttribute('data-look', 'tile');
    await shot(page, '5-tiles');
  });

  await test.step('the grown-ups area opens behind the PIN and shows the practice just done', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Grown-ups' }).click();
    const gate = page.getByRole('heading', { name: 'Grown-ups only' });
    await expect(gate.or(page.getByRole('heading', { name: 'Dashboard' }))).toBeVisible();
    if (await gate.isVisible()) await typePin(page);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.locator('[data-fact="goal"]')).toContainText('Today: 2 of');
    await shot(page, '6-dashboard');
  });

  await test.step('the records reached the server: a second device signs in and finds both children and the score', async () => {
    const email = test.info().annotations.find((note) => note.type === 'account')?.description ?? '';
    // Give the last change its moment to be sent.
    await page.waitForTimeout(2500);
    const second = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 }, baseURL: 'https://sprout-staging.logstocks.com' });
    const other = await second.newPage();
    await openSignedOut(other);
    await fillSignIn(other, email, PASSWORD);
    await other.getByRole('button', { name: 'Sign in' }).click();
    await expect(other.getByRole('button', { name: 'Robin', exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(other.getByRole('button', { name: 'Kit', exact: true })).toBeVisible();
    await other.getByRole('button', { name: 'Robin', exact: true }).click();
    await other.getByRole('button', { name: 'Math', exact: true }).click();
    await expect(other.getByRole('button', { name: /^Add within 20\. Score [1-9]/ })).toBeVisible();
    await second.close();
  });
});
