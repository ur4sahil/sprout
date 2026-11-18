// Lists the reusable sentences the app says, one to a line, so the voice can be made for them ahead of time
// (the owner's choice, Nov 17, 2026): praise and screen lines, letters and numbers, every lesson and its example,
// and every fast-facts line. Questions are made the first time a child hears them.
// Lessons are said slower, a sentence at a time, so they go in a second file made at the lesson pace.
// Run: npx tsx scripts/voice-reusable.ts <out file> <lesson out file>
// Then: node scripts/voice-fill.mjs <base url> <session file> <out file>
//  and: node scripts/voice-fill.mjs <base url> <session file> <lesson out file> <progress file> lesson
import { writeFileSync } from 'node:fs';
import { factAskSay, factMissSay } from '../src/app/facts';
import { LINES, MILESTONE_WORDS } from '../src/audio/lines';
import { PRAISE } from '../src/audio/say';
import type { Pace } from '../src/audio/voice';
import { voicePieces, voiceText } from '../src/audio/voice';
import { CATALOGUE } from '../src/content/catalogue';
import { exampleQuestion, generatorFor } from '../src/content/registry';
import { FACT_SETS } from '../src/engine/facts';
import type { Say } from '../src/engine/types';

const [out, lessonOut] = process.argv.slice(2);
if (!out || !lessonOut) throw new Error('Usage: voice-reusable.ts <out file> <lesson out file>');

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

const seen: Record<Pace, Set<string>> = { normal: new Set(), lesson: new Set() };
for (const [name, says] of Object.entries(groups)) {
  const pace: Pace = name === 'lessons' ? 'lesson' : 'normal';
  let added = 0;
  let refused = 0;
  for (const say of says.flatMap((each) => voicePieces(each, pace))) {
    const text = voiceText(say);
    if (text === null) refused += 1;
    else if (!seen[pace].has(text)) {
      seen[pace].add(text);
      added += 1;
    }
  }
  console.log(`${name} (${pace} pace): ${added} sentences${refused > 0 ? `, ${refused} the voice cannot take` : ''}`);
}
writeFileSync(out, `${[...seen.normal].join('\n')}\n`);
writeFileSync(lessonOut, `${[...seen.lesson].join('\n')}\n`);
console.log(`${seen.normal.size} sentences at the normal pace, ${seen.lesson.size} at the lesson pace`);
