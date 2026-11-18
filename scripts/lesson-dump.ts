// Prints lessons that teach (plan section 16) as a script a person can read: each moment's caption and spoken words,
// each turn's question, options and answer, and the why that follows a miss.
// Run: npx tsx scripts/lesson-dump.ts [skill id prefix ...]   e.g. npx tsx scripts/lesson-dump.ts M-K-A E-1-B2
import { sayWords } from '../src/audio/say';
import { CATALOGUE } from '../src/content/catalogue';
import { describeAnswer, describePrompt, describeVisual } from '../src/engine/describe';
import { LESSONS } from '../src/lessons';
import type { Moment } from '../src/lessons/types';

const wanted = process.argv.slice(2);
const line = (each: Moment): string => `  [${each.text}]  "${sayWords(each.say).replace(/\s+/g, ' ').trim()}"  (${each.scene.pieces.filter((piece) => !piece.gone).length} pieces)`;

for (const [skillId, make] of Object.entries(LESSONS)) {
  if (wanted.length > 0 && !wanted.some((prefix) => skillId.startsWith(prefix))) continue;
  const skill = CATALOGUE.find((each) => each.id === skillId);
  console.log(`\n=== ${skillId}  ${skill?.name ?? ''}  (grade ${skill?.grade ?? '?'})`);
  for (const part of make().parts) {
    if (part.kind === 'show') console.log(line(part.moment));
    else {
      const q = part.turn.question;
      console.log(`  TURN (level ${q.level}, ${q.type}): ${describePrompt(q)}`);
      if (q.type === 'choice') console.log(`    options: ${q.options.map((option) => describeVisual(option)).join(' | ')}`);
      console.log(`    answer: ${describeAnswer(q)}`);
      console.log('    why, after a miss:');
      for (const each of part.turn.why) console.log(`  ${line(each)}`);
    }
  }
}
