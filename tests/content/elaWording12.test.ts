// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nudgeFor } from '../../src/app/hints';
import { spokenSteps, stepSay } from '../../src/audio/stepSay';
import { CONTEXT_WORDS, G1_FACTS, G1_STORIES, G2_FACTS } from '../../src/content/banks/comprehension';
import { ACTIONS, COMPLETE, COMPLETE_PARTS, FRAGMENT_MISSING, FRAGMENTS, PRONOUN_ENTRIES, REFLEXIVE_SUBJECTS, WE_ENTRIES } from '../../src/content/data/h4-grammar';
import { FEATURE_USE } from '../../src/content/data/h4-reading';
import { SAME_MEANING } from '../../src/content/data/phonics1';
import { PAST_SENTENCES, PUNCTUATION, SUFFIXED, SYNONYMS } from '../../src/content/data/phonics2';
import { SHOUTING } from '../../src/content/data/sentences';
import { allGenerators, generateQuestion } from '../../src/content/registry';
import { sayText } from '../../src/engine/describe';
import type { Level, Question, Say, Visual } from '../../src/engine/types';

// The wording rules of Language Arts grades 1 and 2 (the wording audit, Nov 22, 2026): what a child hears is
// what they should hear, every question has a hint, and each question has one right answer.

const SEEDS = 80;
const MINE = allGenerators().filter((g) => /^E-[12]-/.test(g.skillId));
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const levelsOf = (max: number): Level[] => Array.from({ length: max }, (_, i) => (i + 1) as Level);
const EVERY: Question[] = MINE.flatMap((g) => levelsOf(g.maxLevel).flatMap((level) => all(g.skillId, level)));
const choice = (q: Question): Extract<Question, { type: 'choice' }> => {
  if (q.type !== 'choice') throw new Error(`${q.skillId} gave a ${q.type}`);
  return q;
};
const texts = (q: Question): string[] => (q.type === 'choice' ? q.options.map((o) => (o.kind === 'text' ? o.value : '')) : []);
const right = (q: Question): string => texts(q)[choice(q).answerIndex] as string;

// Letter groups and word parts: a voice reads each as if it were a word ("ft" as feet, "er" as a filler sound),
// so they are said with letter or sound parts, never as plain words.
const GROUPS = new Set(['sh', 'ch', 'th', 'wh', 'ck', 'ng', 'nk', 'ai', 'ay', 'ee', 'ea', 'oa', 'oi', 'oy', 'ou', 'ow', 'igh', 'ie', 'ar', 'er', 'ir', 'ur', 'kn', 'wr', 'mb', 'ed', 'ing', 'es', 'ly', 'est', 'ful', 'un', 're', 'ft', 'lk', 'nd', 'nt', 'sk', 'cl', 'fr', 'fl', 'st', 'sn', 'dr', 'cr', 'pl', 'sp', 'tr', 'gr']);
// A curly apostrophe is an apostrophe: "Sam’s" is one word.
const plainWords = (say: Say): string[] => say.flatMap((part) => (typeof part === 'string' ? part.replace(/’/g, "'").toLowerCase().split(/[^a-z']+/).filter((word) => word.length > 0) : []));
const misread = (say: Say): string[] => plainWords(say).filter((word) => GROUPS.has(word) || (word.length === 1 && word !== 'a' && word !== 'i'));

function visualSays(visual: Visual | undefined): Say[] {
  if (!visual) return [];
  const own = visual.speak ? [visual.speak] : [];
  return visual.kind === 'row' ? [...own, ...visual.children.flatMap(visualSays)] : own;
}

// Everything a question can say: the prompt, the pictures and options, sort groups, the hint, and every step.
function everythingSaid(q: Question): Say[] {
  const hint = q.explanation.hint;
  return [
    q.prompt.speak,
    q.explanation.speak,
    ...visualSays(q.stimulus),
    ...(q.type === 'choice' || q.type === 'dragWord' ? q.options.flatMap(visualSays) : []),
    ...(q.type === 'sort' ? q.bins.map((bin) => bin.speak) : []),
    ...(hint ? [hint.say ?? stepSay(hint.text) ?? []] : []),
    ...spokenSteps(q).filter((say): say is Say => say !== null),
  ];
}

describe('what a child hears, in every E-1 and E-2 skill', () => {
  it('covers all 64 skills', () => {
    expect(MINE).toHaveLength(64);
  });

  it('never says a letter group, a word ending or a lone letter as a plain word', () => {
    const found = EVERY.flatMap((q) => everythingSaid(q).flatMap((say) => misread(say).map((word) => `${q.skillId} L${q.level}: "${word}" in "${sayText(say)}"`)));
    expect([...new Set(found)].slice(0, 20)).toEqual([]);
  });

  it('says a gap as a short pause, never as the word blank, and reads every fill-in sentence aloud', () => {
    for (const q of EVERY) {
      for (const say of everythingSaid(q)) expect(plainWords(say), `${q.skillId}: ${sayText(say)}`).not.toContain('blank');
      const sentence = q.stimulus?.kind === 'text' && q.stimulus.value.includes('___') && q.stimulus.value.includes(' ') ? q.stimulus.value : q.prompt.text.includes('___') ? q.prompt.text : null;
      if (sentence !== null) expect(sayText(q.prompt.speak), `${q.skillId}: ${q.prompt.text}`).toContain('...');
    }
  });

  it('gives every question its own hint, which is the nudge the hint button offers', () => {
    for (const q of EVERY) {
      const hint = q.explanation.hint;
      expect(hint, `${q.skillId} L${q.level}`).toBeDefined();
      expect(nudgeFor(q)?.text).toBe(hint?.text);
    }
  });

  it('starts every step and hint with a capital letter or a number, as a sentence does', () => {
    for (const q of EVERY) for (const line of [...q.explanation.steps, q.explanation.hint?.text ?? 'Hint']) expect(line, q.skillId).toMatch(/^[A-Z0-9"“]/);
  });

  it('says a sound with a sound part in the phonics steps', () => {
    for (const id of ['E-1-A1', 'E-1-A2', 'E-1-A3', 'E-1-A4', 'E-1-A5', 'E-1-A7', 'E-1-A8', 'E-2-A1', 'E-2-A2', 'E-2-A4', 'E-2-A5', 'E-2-A6']) {
      const generator = MINE.find((g) => g.skillId === id);
      for (const level of levelsOf(generator?.maxLevel ?? 1)) {
        for (const q of all(id, level)) {
          // Level 3 of E-1-A2 spells a whole word with tiles: its step names letters only.
          if (id === 'E-1-A2' && level === 3) continue;
          const sounds = spokenSteps(q).flatMap((say) => say ?? []).filter((part) => typeof part === 'object' && 'sound' in part);
          expect(sounds.length, `${id} L${level}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('one right answer', () => {
  it('E-1-C4: "it" is only ever a thing, he and she only clear names, and the question names what is replaced', () => {
    const UNCLEAR = ['Kim', 'Sam', 'Jo', 'Lin', 'Alex'];
    const ANIMALS = /\b(dog|cat|pup|puppy|kitten|bird|fish|pet|horse|cow)\b/i;
    for (const entry of [...PRONOUN_ENTRIES, ...WE_ENTRIES]) {
      if (entry.pronoun === 'it') expect(entry.noun, entry.noun).not.toMatch(ANIMALS);
      if (entry.pronoun === 'he' || entry.pronoun === 'she') expect(UNCLEAR, entry.noun).not.toContain(entry.noun);
    }
    for (const level of [2, 3] as Level[]) {
      for (const q of all('E-1-C4', level)) expect(q.prompt.text).toMatch(/^Which word can take the place of /);
    }
  });

  it('E-1-C5 and E-1-C1: no word with two ways to say it, and no word for more than one that is a past word too', () => {
    expect(ACTIONS.map(([, more]) => more)).not.toContain('read');
    for (const level of [1, 2] as Level[]) for (const q of all('E-1-C1', level)) expect(q.facts.items as string[]).not.toContain('read');
  });

  it('E-1-C3: a shout is only a shout, never a telling sentence or a command with a period', () => {
    for (const shout of SHOUTING) {
      expect(['Stop!', 'We did it!']).not.toContain(shout);
      expect(shout, shout).not.toMatch(/\b(I|we|you|he|she|they|it)\b/i);
    }
  });

  it('E-1-B3 and E-2-B4: shut is paired with closed, which has one way to say it', () => {
    for (const pairs of [SAME_MEANING, SYNONYMS]) {
      expect(pairs.flat()).not.toContain('close');
      expect(pairs.some(([a, b]) => [a, b].includes('shut') && [a, b].includes('closed'))).toBe(true);
    }
  });

  it('E-2-C4: an owner is a name, so no wrong sentence is right with more than one owner', () => {
    for (const entry of PUNCTUATION.filter((each) => each.kind === 'apostrophe')) expect(entry.right, entry.right).toMatch(/\b[A-Z][a-z]+'s\b/);
  });

  it('E-2-C6: the one doing it is a he or a she that the sentence makes clear', () => {
    expect(REFLEXIVE_SUBJECTS.map((each) => each.subject)).not.toContain('Kim');
  });

  it('E-2-D6: every word offered is in the sentence, and no other word there means the same', () => {
    for (const q of all('E-2-D6', 2)) {
      const entry = CONTEXT_WORDS.find((each) => each.sentence === (q.facts.read as string[])[0]);
      const words = (entry?.sentence ?? '').toLowerCase().split(/[^a-z]+/);
      for (const option of texts(q)) expect(words, option).toContain(option);
    }
    expect(CONTEXT_WORDS.some((each) => each.sentence.includes('giant'))).toBe(false);
  });

  it('E-2-A1: the gap is as wide for every word of level 3, so its length never names the team', () => {
    const widths = new Set(all('E-2-A1', 3).map((q) => (q.stimulus?.kind === 'row' && q.stimulus.children[1]?.kind === 'text' ? q.stimulus.children[1].value.replace(/[^_]/g, '').length : 0)));
    expect([...widths]).toEqual([3]);
  });

  it('E-2-B1 and E-2-B2: every meaning offered is about the same base word, and every one is a real phrase', () => {
    for (const level of [1, 3] as Level[]) {
      for (const q of all('E-2-B1', level).filter((each) => each.facts.relation === 'prefixMeaning')) {
        const base = String(q.facts.target).replace(/^(un|re)/, '');
        for (const option of texts(q)) expect(option.split(' '), option).toContain(base);
      }
    }
    const nouns = SUFFIXED.filter((each) => each.suffix === 'ful' || each.suffix === 'less').map((each) => each.base);
    const describing = SUFFIXED.filter((each) => each.suffix === 'er' || each.suffix === 'est').map((each) => each.base);
    for (const level of [1, 3] as Level[]) {
      for (const q of all('E-2-B2', level).filter((each) => each.facts.relation === 'suffixMeaning')) {
        const entry = SUFFIXED.find((each) => each.word === q.facts.target);
        for (const option of texts(q)) {
          expect(option, option).toContain(entry?.base ?? '?');
          // "full of tall" and "most end" are not English: a noun takes full of and without, a describing word more and most.
          if (/^(full of|without|a little) /.test(option)) expect(nouns).toContain(entry?.base);
          if (/^(more|the most|not) /.test(option)) expect(describing).toContain(entry?.base);
        }
      }
    }
  });
});

describe('steps that show how', () => {
  it('E-1-D4: a sentence is judged by the line of the story about it, quoted word for word', () => {
    for (const story of G1_STORIES) for (const proof of story.proof) expect(story.text, story.id).toContain(proof);
    for (const q of all('E-1-D4', 1)) {
      const story = G1_STORIES.find((each) => each.text === (q.facts.read as string[])[0]);
      const statement = (q.facts.read as string[])[1] as string;
      const at = story?.truth.indexOf(statement) ?? -1;
      expect(q.explanation.steps).toEqual([`The story says: ${story?.proof[at]}`, at === 0 ? 'So it is true.' : 'So it is not true.']);
    }
  });

  it('E-1-D2, E-1-D5 and E-2-D5: the step quotes the sentence that answers the question', () => {
    for (const story of G1_STORIES) for (const q of [story.who, story.where]) expect(story.text).toContain(q.because);
    for (const text of [...G1_FACTS, ...G2_FACTS]) expect(text.text).toContain(text.fact.because);
    for (const [id, level] of [['E-1-D2', 1], ['E-1-D2', 2], ['E-1-D5', 2], ['E-2-D5', 2]] as [string, Level][]) {
      for (const q of all(id, level)) {
        const quoted = (q.explanation.steps[1] ?? '').replace(/^The (story|text) says: /, '');
        expect(quoted).not.toBe(q.explanation.steps[1]);
        expect((q.facts.read as string[])[0]).toContain(quoted);
      }
    }
  });

  it('E-1-B5 and E-2-B8: the steps name the letter that puts each word in its place', () => {
    for (const [id, at] of [['E-1-B5', 0], ['E-2-B8', 1]] as [string, number][]) {
      for (const level of [1, 2, 3] as Level[]) {
        for (const q of all(id, level)) {
          const words = q.type === 'order' ? q.items.map((item) => (item.kind === 'text' ? item.value : '')) : texts(q);
          const named = q.explanation.steps.join(' ');
          for (const word of words) expect(named, `${id}: ${word}`).toMatch(new RegExp(`${word.charAt(at).toUpperCase()}\\b`));
        }
      }
    }
  });

  it('E-2-C3: the clue the step names is the one in the sentence', () => {
    for (const entry of PAST_SENTENCES) expect(entry.sentence.startsWith(entry.clue), entry.sentence).toBe(true);
    for (const q of all('E-2-C3', 3)) {
      const entry = PAST_SENTENCES.find((each) => each.sentence === q.facts.target);
      expect(q.explanation.steps[0]?.toLowerCase()).toContain(entry?.clue.toLowerCase());
    }
  });

  it('E-2-C8: a step says what a sentence tells, or which part it leaves out', () => {
    for (const sentence of COMPLETE) expect(COMPLETE_PARTS[sentence], sentence).toBeDefined();
    for (const fragment of FRAGMENTS) expect(FRAGMENT_MISSING[fragment], fragment).toBeDefined();
    for (const q of all('E-2-C8', 1)) expect(q.explanation.steps[1]).toMatch(/^It (tells|does not tell) /);
  });

  it('E-2-A6, E-2-B1 and E-2-B2: a step gives this word\'s rule only, not every rule of the skill', () => {
    for (const q of [...all('E-2-A6', 1), ...all('E-2-A6', 3)]) {
      const shown = q.explanation.steps.join(' ');
      expect(['kn', 'wr', 'mb'].filter((group) => shown.includes(` ${group}`))).toHaveLength(1);
    }
    for (const q of all('E-2-B1', 3)) expect(q.explanation.steps[0]).toMatch(/^The (letters|ending) [a-z]+ /);
    // E-2-B2 gives a real word first, then what its ending adds (the owner's choice, Nov 22, 2026).
    for (const q of all('E-2-B2', 3)) expect(q.explanation.steps[1]).toMatch(/^The ending [a-z]+ /);
  });

  it('E-2-A4: the step gives the rule for where each spelling goes', () => {
    for (const q of all('E-2-A4', 3)) {
      const word = String(q.facts.target);
      const part = right(q);
      const steps = q.explanation.steps.join(' ');
      if ((part === 'oy' || part === 'ow') && word.endsWith(part)) expect(steps).toContain(`At the end of a word, use ${part}.`);
      if (part === 'ou') expect(steps).toContain('In the middle of a word, use ou.');
    }
  });
});

describe('the same words for the same thing', () => {
  it('asks the same way across the skills', () => {
    const prompts = (id: string, level: Level): string[] => [...new Set(all(id, level).map((q) => q.prompt.text))];
    expect(prompts('E-1-A3', 1)).toEqual(['Listen. Tap the word.']);
    expect(prompts('E-1-A2', 3)).toEqual(['Listen. Tap the letters to spell the word.']);
    expect(prompts('E-1-B1', 2)).toEqual(['Listen. Tap the letters to spell the word.']);
    for (const [id, level] of [['E-1-A5', 1], ['E-1-C1', 1], ['E-1-C7', 2], ['E-2-C1', 1]] as [string, Level][]) expect(prompts(id, level)).toEqual(['Put each word in its group.']);
    expect(prompts('E-1-C6', 1)).toEqual(prompts('E-2-C4', 1));
    for (const id of ['E-1-B5', 'E-2-B8', 'E-1-D3', 'E-2-D3', 'E-2-B6']) {
      const order = all(id, id === 'E-1-D3' || id === 'E-2-D3' ? 1 : id === 'E-2-B6' ? 3 : 2).filter((q) => q.type === 'order');
      for (const q of order) expect(q.prompt.text, id).toMatch(/Tap the (first one|first thing|weakest) first\.$/);
    }
    for (const q of all('E-2-B4', 2)) expect(q.prompt.text).toMatch(/^Which word is the opposite of /);
  });

  it('shows and says the same question', () => {
    for (const q of all('E-2-C2', 1)) expect(q.prompt.text).toMatch(/Which word is spelled right\?$/);
    for (const q of all('E-2-B9', 1)) expect(q.prompt.text).toMatch(/are the guide words at the top of a dictionary page\./);
    for (const q of all('E-2-C5', 2)) expect(q.prompt.text).toMatch(/^A [a-z]+ is a group of which of these\?$/);
    for (const q of all('E-1-D3', 2)) expect(q.prompt.text).toBe('Which of these happened last?');
    for (const q of all('E-2-D4', 2)) expect(q.prompt.text).toBe('Which of these happened in the middle?');
    expect(FEATURE_USE.map((each) => each.ask)).not.toContain('You want to know what the whole book is about. Where do you look?');
  });
});
