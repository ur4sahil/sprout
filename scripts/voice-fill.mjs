// Makes the voice for a list of sentences ahead of time, one at a time, by asking a Sprout server for each.
// The server makes any sentence it does not have yet and keeps it; one it already has costs almost nothing,
// so this can be stopped and run again. It signs in with a saved session (a Playwright storage-state file).
// Run: node scripts/voice-fill.mjs <base url> <session file> <sentences file> [progress file] [pace]
// pace is normal (the default) or lesson.
import { appendFileSync, readFileSync } from 'node:fs';

const [base, sessionFile, sentencesFile, progressFile = 'voice-fill.log', pace = 'normal'] = process.argv.slice(2);
if (pace !== 'normal' && pace !== 'lesson') throw new Error('pace is normal or lesson');
if (!base || !sessionFile || !sentencesFile) throw new Error('Usage: voice-fill.mjs <base url> <session file> <sentences file> [progress file]');

const cookies = JSON.parse(readFileSync(sessionFile, 'utf8')).cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
const sentences = readFileSync(sentencesFile, 'utf8').split('\n').filter((line) => line.trim() !== '');
const note = (line) => {
  appendFileSync(progressFile, `${new Date().toISOString()} ${line}\n`);
};

let made = 0;
let saved = 0;
let failed = 0;
note(`start: ${sentences.length} sentences`);
for (const [index, text] of sentences.entries()) {
  let outcome = 'failed';
  // A sentence the voice machine was too busy for is tried again, a few times.
  for (let attempt = 0; attempt < 4 && outcome === 'failed'; attempt += 1) {
    try {
      const reply = await fetch(`${base}/api/voice`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookies }, body: JSON.stringify(pace === 'normal' ? { text } : { text, pace }) });
      await reply.arrayBuffer();
      if (reply.status === 401) {
        note('stopped: the session has ended. Sign in again and rerun.');
        process.exit(1);
      }
      if (reply.ok) outcome = reply.headers.get('X-Voice') === 'made' ? 'made' : 'saved';
      else if (reply.status === 400) outcome = 'refused';
    } catch {
      // The network dropped: wait and try again.
    }
    if (outcome === 'failed') await new Promise((resolve) => setTimeout(resolve, 5000 * (attempt + 1)));
  }
  if (outcome === 'made') made += 1;
  else if (outcome === 'saved') saved += 1;
  else {
    failed += 1;
    note(`${outcome}: ${text}`);
  }
  if ((index + 1) % 100 === 0) note(`progress: ${index + 1} of ${sentences.length} (made ${made}, already there ${saved}, failed ${failed})`);
}
note(`done: ${sentences.length} sentences (made ${made}, already there ${saved}, failed ${failed})`);
