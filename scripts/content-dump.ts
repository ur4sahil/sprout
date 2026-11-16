// Writes review/<batch>.md: three sample questions for every skill and level, as plain text.
// Run: npm run content:dump -- <batch>
// <batch> is a skill id or the start of one, such as M-PK or M-K-C, or `all`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { CATALOGUE } from '../src/content/catalogue';
import { allGenerators, generateFrom } from '../src/content/registry';
import { describeVisual, sayText } from '../src/engine/describe';
import type { Level, Question } from '../src/engine/types';

const SAMPLES = 3;

function answerLines(question: Question): string[] {
  switch (question.type) {
    case 'choice':
      return [
        `- Options: ${question.options.map((option, i) => `${i === question.answerIndex ? '**' : ''}${describeVisual(option)}${i === question.answerIndex ? '**' : ''}`).join(' | ')}`,
        `- Answer: ${describeVisual(question.options[question.answerIndex] ?? 'blank')}`,
      ];
    case 'multiSelect':
      return [
        `- Options: ${question.options.map((option) => describeVisual(option)).join(' | ')}`,
        `- Answer: ${question.answerIndexes.map((i) => describeVisual(question.options[i] ?? 'blank')).join(', ')}`,
      ];
    case 'tapCount':
      return [`- Shown: ${question.shown} ${question.emoji}`, `- Answer: tap ${question.answer}`];
    case 'numberPad':
      return [`- Answer: type ${question.answer}`];
    case 'order':
      return [
        `- Items: ${question.items.map((item) => describeVisual(item)).join(' | ')}`,
        `- Answer: ${question.answerOrder.map((i) => describeVisual(question.items[i] ?? 'blank')).join(', ')}`,
      ];
    case 'sort':
      return [
        `- Bins: ${question.bins.map((bin) => bin.label).join(' | ')}`,
        `- Answer: ${question.items.map((item, i) => `${describeVisual(item)} → ${question.bins[question.answerBin[i] ?? 0]?.label ?? '?'}`).join(', ')}`,
      ];
    case 'match':
      return [
        `- Answer: ${question.answerPairs.map(([l, r]) => `${describeVisual(question.left[l] ?? 'blank')} ↔ ${describeVisual(question.right[r] ?? 'blank')}`).join(', ')}`,
      ];
    case 'tiles':
      return [`- Tiles: ${question.bank.join(' ')}`, `- Answer: ${question.answer}`];
  }
}

function sample(question: Question): string[] {
  const lines = [`**Seed ${question.seed}** (${question.type}, ${question.mode})`, '', `- On screen: ${question.prompt.text}`];
  const spoken = sayText(question.prompt.speak);
  if (spoken !== question.prompt.text) lines.push(`- Spoken: ${spoken}`);
  if (question.stimulus) lines.push(`- Picture: ${describeVisual(question.stimulus)}`);
  lines.push(...answerLines(question));
  lines.push(`- Explanation, spoken: ${sayText(question.explanation.speak)}`);
  lines.push(`- Explanation, shown: ${question.explanation.steps.join(' / ')}`);
  if (question.explanation.visual) lines.push(`- Explanation picture: ${describeVisual(question.explanation.visual)}`);
  lines.push('');
  return lines;
}

const batch = process.argv[2];
if (!batch) {
  console.error('Usage: npm run content:dump -- <batch>   (a skill id, the start of one, or all)');
  process.exit(1);
}
const generators = allGenerators().filter((generator) => batch === 'all' || generator.skillId.startsWith(batch));
if (generators.length === 0) {
  console.error(`No skill id starts with "${batch}".`);
  process.exit(1);
}

const out: string[] = [`# Content review: ${batch}`, '', `${generators.length} skills, ${SAMPLES} samples for each level.`, ''];
for (const generator of generators) {
  const skill = CATALOGUE.find((row) => row.id === generator.skillId);
  out.push(`## ${generator.skillId} ${skill ? `${skill.code} ${skill.name}` : ''}`.trim(), '');
  for (let level = 1 as Level; level <= generator.maxLevel; level = (level + 1) as Level) {
    out.push(`### Level ${level}`, '');
    for (let seed = 1; seed <= SAMPLES; seed += 1) out.push(...sample(generateFrom(generator, level, seed)));
  }
  out.push('### Lesson', '');
  for (const step of generator.lesson()) {
    out.push(`- ${step.beat}: ${step.text} (picture: ${describeVisual(step.visual)})`);
    if (step.reveal) out.push(`  - then: ${step.reveal.text}`);
  }
  out.push('');
}

mkdirSync('review', { recursive: true });
const name = batch.replace(/[^A-Za-z0-9-]/g, '');
writeFileSync(`review/${name}.md`, `${out.join('\n')}\n`);
console.log(`Wrote review/${name}.md (${generators.length} skills)`);
