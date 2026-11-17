// Lists every sentence the question bank can say for some grades, one to a line, for the voice to be made ahead of time.
// Run: npx tsx scripts/voice-sentences.ts <out file> <grade> [grade...]   (grades: PK K 1 2 all; "all" is Reasoning)
import { writeFileSync } from 'node:fs';
import { openingWords, spokenSteps } from '../src/audio/stepSay';
import { voiceText } from '../src/audio/voice';
import { skillById } from '../src/content/catalogue';
import { allGenerators, generateFrom } from '../src/content/registry';

const SEEDS = 400; // questions tried for each skill and level

const [out, ...grades] = process.argv.slice(2);
if (!out || grades.length === 0) throw new Error('Usage: voice-sentences.ts <out file> <grade> [grade...]');

const seen = new Set<string>();
for (const grade of grades) {
  for (const generator of allGenerators()) {
    if (skillById(generator.skillId)?.grade !== grade) continue;
    for (const level of [1, 2, 3]) {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        let question;
        try {
          question = generateFrom(generator, level, seed);
        } catch {
          continue;
        }
        // The same things the app asks for when a question appears (warmQuestion).
        const says = [question.prompt.speak, openingWords(question), ...(spokenSteps(question)?.slice(1) ?? [question.explanation.speak])];
        for (const say of says) {
          const text = voiceText(say);
          if (text) seen.add(text);
        }
      }
    }
  }
}
writeFileSync(out, `${[...seen].join('\n')}\n`);
console.log(`${seen.size} sentences for ${grades.join(', ')}`);
