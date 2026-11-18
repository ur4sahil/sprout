// Lists the reusable sentences the app says, one to a line, so the voice can be made for them ahead of time
// (the owner's choice, Nov 17, 2026): praise and screen lines, letters and numbers, every lesson and its example,
// and every fast-facts line. Questions are made the first time a child hears them.
// Run: npx tsx scripts/voice-reusable.ts <out file>
// Then: node scripts/voice-fill.mjs <base url> <session file> <out file>
import { writeFileSync } from 'node:fs';
import { factAskSay, factMissSay } from '../src/app/facts';
import { LINES, MILESTONE_WORDS } from '../src/audio/lines';
import { PRAISE } from '../src/audio/say';
import { voicePieces, voiceText } from '../src/audio/voice';
import { CATALOGUE } from '../src/content/catalogue';
import { exampleQuestion, generatorFor } from '../src/content/registry';
import { FACT_SETS } from '../src/engine/facts';
import type { Say } from '../src/engine/types';

const [out] = process.argv.slice(2);
if (!out) throw new Error('Usage: voice-reusable.ts <out file>');

const groups: Record<string, Say[]> = {
  'praise and screen lines': [
    ...PRAISE.map((each) => each.say),
    ...Object.values(LINES),
    ...Object.values(MILESTONE_WORDS).map((words) => [words.title, words.line]),
  ],
  'letters and numbers': [
    ...'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [{ letter }]),
    ...Array.from({ length: 1001 }, (_, number) => [{ number }]),
  ],
  'skill names': CATALOGUE.map((skill) => skill.speakName),
  lessons: CATALOGUE.flatMap((skill) => {
    let beats;
    let example;
    try {
      beats = generatorFor(skill.id).lesson();
      example = exampleQuestion(skill.id);
    } catch {
      return [];
    }
    return [...beats.flatMap((beat) => (beat.reveal ? [beat.speak, beat.reveal.speak] : [beat.speak])), example.prompt.speak, example.explanation.speak];
  }),
  'fast facts': FACT_SETS.flatMap((set) => set.facts.flatMap((fact) => [factAskSay(fact), factMissSay(fact)])),
};

const seen = new Set<string>();
for (const [name, says] of Object.entries(groups)) {
  let added = 0;
  let refused = 0;
  for (const say of says.flatMap(voicePieces)) {
    const text = voiceText(say);
    if (text === null) refused += 1;
    else if (!seen.has(text)) {
      seen.add(text);
      added += 1;
    }
  }
  console.log(`${name}: ${added} sentences${refused > 0 ? `, ${refused} the voice cannot take` : ''}`);
}
writeFileSync(out, `${[...seen].join('\n')}\n`);
console.log(`${seen.size} sentences in all`);
