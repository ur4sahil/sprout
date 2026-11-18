import fs from 'node:fs';
import { describeVisual } from '../src/engine/describe';
import { LESSONS } from '../src/lessons';
import { expect, test } from './support/fixtures';
import { openLesson } from './support/lesson';

// A screen recording of each sample lesson, for the owner to judge (plan section 16). Run only when asked for:
//   SPROUT_RECORD=1 npx playwright test teach-record --project=ipad-landscape
// The stand-in voice takes as long as the real one: SPROUT_DURATIONS names a JSON file of sentence -> { ms }
// (made with the real voice). Each sentence's start is written next to the video (said.json), so the real
// voice can be laid over it afterwards. Without the file, about 0.45 s a word.

const LESSON_SKILLS = ['M-K-A1', 'M-K-C1', 'M-K-D1', 'E-K-B1', 'E-K-B3', 'M-1-B5'];

test.use({ video: { mode: 'on', size: { width: 1024, height: 768 } } });

for (const skillId of LESSON_SKILLS) {
  test(`record the ${skillId} lesson`, async ({ page, context }) => {
    test.skip(!process.env.SPROUT_RECORD, 'only when a recording is wanted');
    test.setTimeout(600_000);
    const durations = process.env.SPROUT_DURATIONS ? (JSON.parse(fs.readFileSync(process.env.SPROUT_DURATIONS, 'utf8')) as Record<string, { ms: number }>) : {};
    const ms = Object.fromEntries(Object.entries(durations).map(([text, entry]) => [text, entry.ms]));
    await context.addInitScript((known: Record<string, number>) => {
      const log: { t: number; text: string }[] = [];
      (window as unknown as { said: typeof log }).said = log;
      const synth = window.speechSynthesis as unknown as { speak: (u: SpeechSynthesisUtterance) => void };
      synth.speak = (utterance: SpeechSynthesisUtterance): void => {
        log.push({ t: Date.now(), text: utterance.text });
        const words = utterance.text.split(/\s+/).filter(Boolean).length;
        setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), known[utterance.text] ?? Math.max(500, words * 450));
      };
    }, ms);
    const videoStart = Date.now();
    const said: { t: number; text: string }[] = [];
    const keep = async (): Promise<void> => {
      const now = await page.evaluate(() => (window as unknown as { said?: { t: number; text: string }[] }).said ?? []);
      for (const each of now) if (!said.some((old) => old.t === each.t && old.text === each.text)) said.push(each);
    };
    const lesson = LESSONS[skillId]?.();
    if (!lesson) throw new Error(`No lesson for ${skillId}`);
    const turns = lesson.parts.flatMap((part) => (part.kind === 'turn' ? [part.turn] : []));
    await openLesson(page, skillId);
    const card = page.getByRole('region', { name: 'Lesson' });
    await expect(card).toBeVisible();
    const lessonStart = Date.now();
    for (const [index, turn] of turns.entries()) {
      await expect(card).toHaveAttribute('data-teach-phase', 'asking', { timeout: 300_000 });
      const q = turn.question;
      if (q.type !== 'choice') throw new Error('choice turns only');
      const labels = q.options.map((option) => describeVisual(option));
      const right = labels[q.answerIndex] ?? '';
      const wrong = labels.find((_, i) => i !== q.answerIndex) ?? '';
      await page.waitForTimeout(2500);
      await page.locator(`[data-option][aria-label="${index === 0 ? wrong : right}"]`).click();
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: /Check/ }).click();
      if (index === 0) {
        await expect(card).toHaveAttribute('data-teach-phase', 'again', { timeout: 300_000 });
        await page.waitForTimeout(2500);
        await page.locator(`[data-option][aria-label="${right}"]`).click();
        await page.waitForTimeout(800);
        await page.getByRole('button', { name: /Check/ }).click();
      }
    }
    await expect(page.getByRole('button', { name: /Practise/ })).toBeVisible({ timeout: 300_000 });
    await page.waitForTimeout(2000);
    await keep();
    fs.writeFileSync(test.info().outputPath('said.json'), JSON.stringify({ videoStart, lessonStart, said }));
  });
}
