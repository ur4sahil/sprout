import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test as base } from '@playwright/test';
import { BASE_URL, COUNTER, POOL_SIZE, WORKER_LOG, poolEmail } from './paths';

export const PASSWORD = 'e2e-password-123';
export const SAME_MESSAGE = 'That email or password is not right.';

// A made-up address on the family list that no other test has used.
export function listedEmail(): string {
  const next = Number(fs.readFileSync(COUNTER, 'utf8'));
  if (next >= POOL_SIZE) throw new Error('The pool of test addresses ran out. Raise POOL_SIZE.');
  fs.writeFileSync(COUNTER, String(next + 1));
  return poolEmail(next);
}

export function strangerEmail(): string {
  return `stranger-${Date.now()}-${Math.floor(performance.now())}@example.com`;
}

export function logMark(): number {
  return fs.statSync(WORKER_LOG).size;
}

// What the Worker has printed since the mark. The mark is a count of bytes.
export function logAfter(mark: number): string {
  return fs.readFileSync(WORKER_LOG).subarray(mark).toString('utf8');
}

function codesAfter(mark: number): string[] {
  const text = logAfter(mark);
  return [...text.matchAll(/sign-in code: (\d{6})/g)].map((match) => match[1] ?? '');
}

// The local Worker prints the code in its terminal instead of emailing it.
export async function codeAfter(mark: number): Promise<string> {
  let code = '';
  await expect
    .poll(() => {
      code = codesAfter(mark).at(-1) ?? '';
      return code;
    })
    .toMatch(/^\d{6}$/);
  return code;
}

export function codeCountAfter(mark: number): number {
  return codesAfter(mark).length;
}

export function wrongCode(right: string): string {
  return right === '000000' ? '000001' : '000000';
}

export async function openSignedOut(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
}

export async function fillSignIn(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
}

export async function expectStartScreen(page: Page): Promise<void> {
  await expect(page.getByLabel('Email')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Sprout' })).toBeVisible();
  await expect(page).toHaveURL(`${BASE_URL}/`);
}

// Opens the set-password steps and asks for a code. Ends on the code step.
export async function askForCode(page: Page, email: string, link = 'First time here'): Promise<string> {
  await page.getByRole('button', { name: link }).click();
  await expect(page.getByRole('heading', { name: 'Set a password' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  const mark = logMark();
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  return codeAfter(mark);
}

export async function fillNewPassword(page: Page, code: string, password: string, again = password): Promise<void> {
  await page.getByLabel('Code from the email').fill(code);
  await page.getByLabel('New password', { exact: true }).fill(password);
  await page.getByLabel('New password again').fill(again);
  await page.getByRole('button', { name: 'Save password and sign in' }).click();
}

// Signs a new parent up through the screens. Ends on the start screen.
export async function signUp(page: Page, email = listedEmail(), password = PASSWORD): Promise<string> {
  await openSignedOut(page);
  const code = await askForCode(page, email);
  await fillNewPassword(page, code, password);
  await expectStartScreen(page);
  return email;
}

export async function signOutByApi(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const reply = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    return reply.status;
  });
}

interface Fixtures {
  // Fails a test if the page throws or logs an error nobody expected.
  problems: string[];
}

export const test = base.extend<Fixtures>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        // A browser logs every refused request. Those refusals are what the tests check.
        if (/Failed to load resource/.test(text)) return;
        problems.push(`console error: ${text}`);
      });
      await use(problems);
      expect(problems, 'unexpected errors in the page').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
