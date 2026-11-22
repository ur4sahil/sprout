// @vitest-environment node
import { describe, expect, it } from 'vitest';
import stories from '../../src/content/banks/readingStories.json';
import { CVC_WORDS } from '../../src/content/data/cvc';
import { DESCRIBING_SENTENCES } from '../../src/content/data/describing';
import { WORD_FAMILIES } from '../../src/content/data/families';
import { ADJECTIVES, BLEND_ENDS, BLEND_STARTS, COMPOUNDS, DESCRIBING_PICTURES, DIGRAPH_ENDS, DIGRAPH_STARTS, NOUNS, OPPOSITES_1, SAME_MEANING, SILENT_E_PAIRS, SILENT_E_PICTURES, VERBS, VOWEL_TEAM_WORDS } from '../../src/content/data/phonics1';
import { ASKING, SHOUTING, TELLING } from '../../src/content/data/sentences';
import { ALL_SIGHT_WORDS, SIGHT_WORDS, SOUND_ALIKE } from '../../src/content/data/sightWords';
import { STORY_NAMES } from '../../src/content/data/storyProblems';
import { generateQuestion } from '../../src/content/registry';
import type { SoundKey } from '../../src/engine/letterSounds';
import { soundOf } from '../../src/engine/letterSounds';
import type { Level, Question, Visual } from '../../src/engine/types';
import { validateQuestion } from '../../src/engine/validate';

// The level rules of Language Arts grade 1 (plan section 8), its word lists and its story bank (section 9).

const SEEDS = 300;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const s = (question: Question, name: string): string => question.facts[name] as string;
const opts = (question: Question): string[] => question.facts.options as string[];
const spoken = (visual: Visual | undefined): boolean => visual !== undefined && (visual.speak !== undefined || (visual.kind === 'row' && visual.children.some(spoken)));
const choice = (question: Question): Extract<Question, { type: 'choice' }> => {
  if (question.type !== 'choice') throw new Error('not a choice');
  return question;
};
const gapOf = (question: Question): string => {
  const picture = question.stimulus;
  if (picture?.kind !== 'row' || picture.children[1]?.kind !== 'text') throw new Error('no word with a gap');
  return picture.children[1].value;
};

describe('the grade 1 lists', () => {
  it('every word holds its part, in the place its list says', () => {
    for (const entry of DIGRAPH_STARTS) expect(entry.word.startsWith(entry.part)).toBe(true);
    for (const entry of DIGRAPH_ENDS) expect(entry.word.endsWith(entry.part)).toBe(true);
    for (const entry of BLEND_STARTS) expect(entry.word.startsWith(entry.part)).toBe(true);
    for (const entry of BLEND_ENDS) expect(entry.word.endsWith(entry.part)).toBe(true);
    for (const entry of VOWEL_TEAM_WORDS) expect(entry.word.split(entry.part)).toHaveLength(2);
    expect([DIGRAPH_STARTS.length, DIGRAPH_ENDS.length, BLEND_STARTS.length, BLEND_ENDS.length, VOWEL_TEAM_WORDS.length, COMPOUNDS.length]).toEqual([9, 7, 11, 8, 9, 12]);
  });

  it('a silent e pair is a short word and the same word with an e', () => {
    expect(SILENT_E_PAIRS).toHaveLength(9);
    for (const [short, long] of SILENT_E_PAIRS) expect(long).toBe(`${short}e`);
    for (const entry of SILENT_E_PICTURES) expect(SILENT_E_PAIRS.flat()).toContain(entry.word);
  });

  it('every describing sentence holds its three words, and every describing picture is a describing word', () => {
    for (const entry of DESCRIBING_SENTENCES) {
      const words = entry.sentence.toLowerCase().split(/[^a-z]+/);
      for (const each of [entry.describing, entry.naming, entry.action]) expect(words).toContain(each);
      expect(ADJECTIVES).toContain(entry.describing);
    }
    for (const entry of DESCRIBING_PICTURES) expect(ADJECTIVES).toContain(entry.word);
  });
});

describe('A.1 to A.5 phonics', () => {
  it('A.1 and A.4: the word is heard with its letters missing on screen, and the letter pairs keep their order', () => {
    const cases: [string, Level, readonly { word: string; part: string }[], string[]][] = [
      ['E-1-A1', 1, DIGRAPH_STARTS, ['sh', 'ch', 'th', 'wh']],
      ['E-1-A1', 2, DIGRAPH_ENDS, ['sh', 'ch', 'th']],
      ['E-1-A4', 2, VOWEL_TEAM_WORDS, ['ai', 'ee', 'oa']],
    ];
    for (const [skill, level, list, parts] of cases) {
      const seen = new Set<string>();
      for (const question of all(skill, level).map(choice)) {
        const entry = list.find((each) => each.word === s(question, 'target'))!;
        seen.add(entry.word);
        expect(question.mode).toBe('listen');
        expect(opts(question)).toEqual(parts);
        expect(opts(question)[question.answerIndex]).toBe(entry.part);
        // The gap is as wide as the missing letters, and filling it gives the word back.
        expect(gapOf(question).replace('_'.repeat(entry.part.length), entry.part)).toBe(entry.word);
        expect(gapOf(question)).not.toContain(entry.part);
        expect(spoken(question.stimulus) || question.options.some(spoken)).toBe(false);
        expect(question.prompt.text).toBe('Which letters are missing?');
      }
      expect(seen.size).toBe(list.length);
    }
  });

  it('A.2: the starting blend, then the ending blend, then the whole word from tiles', () => {
    for (const [level, list] of [[1, BLEND_STARTS], [2, BLEND_ENDS]] as const) {
      for (const question of all('E-1-A2', level).map(choice)) {
        const entry = list.find((each) => each.word === s(question, 'target'))!;
        const options = opts(question);
        expect(new Set(options).size).toBe(3);
        expect(options[question.answerIndex]).toBe(entry.part);
        for (const each of options) expect(list.some((other) => other.part === each)).toBe(true);
        expect(gapOf(question)).toBe(level === 1 ? `__${entry.word.slice(2)}` : `${entry.word.slice(0, -2)}__`);
      }
    }
    const words = new Set<string>();
    for (const question of all('E-1-A2', 3)) {
      if (question.type !== 'tiles') throw new Error('not tiles');
      words.add(question.answer);
      expect([...BLEND_STARTS, ...BLEND_ENDS].some((each) => each.word === question.answer)).toBe(true);
      expect(question.slots).toBe(question.answer.length);
      expect(question.bank).toHaveLength(question.answer.length + 2);
      expect(question.facts.oracle).toBe('spell');
      expect(question.mode).toBe('listen');
    }
    expect(words.size).toBe(19);
  });

  it('A.3: cap or cape by ear, then from three, then from a picture that says its word', () => {
    const pairOf = (value: string): readonly string[] => SILENT_E_PAIRS.find((pair) => pair.includes(value))!;
    const targets = new Set<string>();
    for (const question of all('E-1-A3', 1).map(choice)) {
      targets.add(s(question, 'target'));
      expect(question.mode).toBe('listen');
      expect([...opts(question)].sort()).toEqual([...pairOf(s(question, 'target'))].sort());
      expect(question.prompt.text).toBe('Listen. Tap the word.');
      expect(question.options.some(spoken)).toBe(false);
    }
    expect(targets.size).toBe(18);
    for (const level of [2, 3] as Level[]) {
      for (const question of all('E-1-A3', level).map(choice)) {
        const options = opts(question);
        expect(options).toHaveLength(3);
        // Both words of the pair are always offered.
        for (const each of pairOf(s(question, 'target'))) expect(options).toContain(each);
        expect(options[question.answerIndex]).toBe(s(question, 'target'));
        if (level === 3) {
          expect(SILENT_E_PICTURES.some((entry) => entry.word === s(question, 'target'))).toBe(true);
          expect(spoken(question.stimulus)).toBe(true);
          expect(question.options.some(spoken)).toBe(false);
        }
      }
    }
    // The first step gives the rule for the word and says the vowel's sound: its name when an e ends the word,
    // its short sound (with a word that has it) when none does.
    for (const question of all('E-1-A3', 1)) {
      const target = s(question, 'target');
      const vowel = target.charAt(1);
      const long = soundOf(`long-${vowel}` as SoundKey).shown;
      const short = soundOf(vowel as SoundKey);
      expect(question.explanation.steps[0]).toBe(target.endsWith('e') ? `The e at the end makes the ${vowel} say its name: ${long}.` : `There is no e at the end, so the ${vowel} is short: ${short.shown}, as in ${short.as}.`);
    }
  });

  it('A.4 level 1: a vowel team word is read and matched to its picture', () => {
    for (const question of all('E-1-A4', 1).map(choice)) {
      expect(question.mode).toBe('read');
      expect(question.stimulus).toEqual({ kind: 'text', value: s(question, 'target'), size: 'xl' });
      expect(opts(question)[question.answerIndex]).toBe(s(question, 'target'));
      expect(new Set(opts(question)).size).toBe(3);
      for (const each of opts(question)) expect(VOWEL_TEAM_WORDS.some((entry) => entry.word === each)).toBe(true);
    }
  });

  it('A.5: short and long words in equal number, never both words of one pair', () => {
    for (const [level, count] of [[1, 4], [2, 6]] as [Level, number][]) {
      for (const question of all('E-1-A5', level)) {
        if (question.type !== 'sort') throw new Error('not a sort');
        const words = question.facts.read as string[];
        expect(words).toHaveLength(count);
        expect(question.answerBin).toEqual(words.map((each) => (each.endsWith('e') ? 1 : 0)));
        expect(question.answerBin.filter((bin) => bin === 1)).toHaveLength(count / 2);
        for (const [short, long] of SILENT_E_PAIRS) expect(words.includes(short) && words.includes(long)).toBe(false);
        expect(question.bins.map((bin) => bin.label)).toEqual(['Short vowel', 'Long vowel']);
        expect(question.items.some(spoken)).toBe(false);
      }
    }
  });
});

describe('B.1 to B.3 words', () => {
  it('B.1: a set 4 word by ear, then built from tiles that cannot spell a sound-alike', () => {
    for (const question of all('E-1-B1', 1).map(choice)) {
      expect(SIGHT_WORDS[4]).toContain(s(question, 'target'));
      expect(question.mode).toBe('listen');
      for (const each of opts(question)) expect(SIGHT_WORDS[4]).toContain(each);
    }
    for (const question of all('E-1-B1', 2)) {
      if (question.type !== 'tiles') throw new Error('not tiles');
      expect(SIGHT_WORDS[4]).toContain(question.answer);
      expect(validateQuestion(question, { soundAlikes: SOUND_ALIKE })).toEqual([]);
    }
  });

  it('B.2: a compound word is built from its two halves, with 2 spare halves, then 4', () => {
    const built = new Set<string>();
    for (const [level, spare] of [[1, 2], [2, 4]] as [Level, number][]) {
      for (const question of all('E-1-B2', level)) {
        if (question.type !== 'tiles') throw new Error('not tiles');
        const entry = COMPOUNDS.find((each) => `${each.first}${each.second}` === question.answer)!;
        built.add(question.answer);
        expect(question.slots).toBe(2);
        expect(question.bank).toHaveLength(2 + spare);
        expect(new Set(question.bank).size).toBe(question.bank.length);
        expect(question.bank).toContain(entry.first);
        expect(question.bank).toContain(entry.second);
        expect(question.facts.parts).toEqual([entry.first, entry.second]);
        expect(question.mode).toBe('listen');
        expect(question.prompt.text).toBe('Listen. Tap the two words that make the word.');
        expect(spoken(question.stimulus)).toBe(false);
      }
    }
    expect(built.size).toBe(12);
  });

  it('B.3: opposites, then same meanings, then both, and no wrong word is also right', () => {
    const same = (value: string): string[] => SAME_MEANING.flatMap(([one, two]) => (one === value ? [two] : two === value ? [one] : []));
    const opposite = (value: string): string[] => OPPOSITES_1.flatMap(([one, two]) => (one === value ? [two] : two === value ? [one] : []));
    for (const level of [1, 2, 3] as Level[]) {
      const kinds = new Set<string>();
      for (const question of all('E-1-B3', level).map(choice)) {
        const target = s(question, 'target');
        const kind = s(question, 'relation');
        kinds.add(kind);
        const answer = opts(question)[question.answerIndex] as string;
        const wrong = opts(question).filter((each) => each !== answer);
        expect(wrong).toHaveLength(2);
        if (kind === 'same') {
          expect(same(target)).toContain(answer);
          for (const each of wrong) expect(same(target)).not.toContain(each);
          expect(question.prompt.text).toBe(`Which word means the same as ${target}?`);
        } else {
          expect(opposite(target)).toContain(answer);
          // Little is also the opposite of big, and small of large: neither is offered as a wrong word.
          const alsoOpposite = [target, ...same(target)].flatMap(opposite).flatMap((each) => [each, ...same(each)]);
          for (const each of wrong) expect(alsoOpposite).not.toContain(each);
          expect(question.prompt.text).toBe(`Which word is the opposite of ${target}?`);
        }
        expect(opts(question)).not.toContain(target);
      }
      expect(kinds).toEqual(new Set(level === 1 ? ['opposite1'] : level === 2 ? ['same'] : ['opposite1', 'same']));
    }
  });
});

describe('C.1 to C.3 grammar', () => {
  it('C.1: naming words and action words in equal number', () => {
    for (const [level, count] of [[1, 4], [2, 6]] as [Level, number][]) {
      for (const question of all('E-1-C1', level)) {
        if (question.type !== 'sort') throw new Error('not a sort');
        const words = question.facts.items as string[];
        expect(new Set(words).size).toBe(count);
        expect(question.answerBin).toEqual(words.map((each) => (NOUNS.includes(each) ? 0 : VERBS.includes(each) ? 1 : -1)));
        expect(question.answerBin.filter((bin) => bin === 0)).toHaveLength(count / 2);
        expect(question.bins.map((bin) => bin.label)).toEqual(['Naming words', 'Action words']);
      }
    }
  });

  it('C.2: three words from the sentence, then a describing word for a picture that is not named', () => {
    for (const question of all('E-1-C2', 1).map(choice)) {
      const entry = DESCRIBING_SENTENCES.find((each) => each.sentence === s(question, 'target'))!;
      expect([...opts(question)].sort()).toEqual([entry.describing, entry.naming, entry.action].sort());
      expect(opts(question)[question.answerIndex]).toBe(entry.describing);
      expect(question.stimulus).toMatchObject({ kind: 'text', value: entry.sentence });
    }
    for (const question of all('E-1-C2', 2).map(choice)) {
      const entry = DESCRIBING_PICTURES.find((each) => each.word === s(question, 'target'))!;
      expect(question.stimulus).toEqual({ kind: 'emojiGroup', emoji: entry.emoji, count: 1, layout: 'row' });
      expect(new Set(opts(question)).size).toBe(3);
      expect(opts(question).includes('big') && opts(question).includes('tall')).toBe(false);
      expect(opts(question)[question.answerIndex]).toBe(entry.word);
    }
  });

  it('C.3: the sentence is shown without its mark: period or question mark, then exclamation mark too', () => {
    for (const [level, marks] of [[1, ['.', '?']], [2, ['.', '?', '!']]] as [Level, string[]][]) {
      const answers = new Set<string>();
      for (const question of all('E-1-C3', level).map(choice)) {
        const sentence = [...TELLING, ...ASKING, ...SHOUTING].find((each) => each.slice(0, -1).toLowerCase() === s(question, 'base'))!;
        expect(opts(question)).toEqual(marks);
        const answer = opts(question)[question.answerIndex] as string;
        answers.add(answer);
        expect(answer).toBe(sentence.slice(-1));
        expect(question.stimulus).toMatchObject({ kind: 'text', value: sentence.slice(0, -1) });
        expect(question.explanation.steps).toEqual([answer === '.' ? 'A telling sentence ends with a period.' : answer === '?' ? 'An asking sentence ends with a question mark.' : 'A shout ends with an exclamation mark.']);
      }
      expect([...answers].sort()).toEqual([...marks].sort());
    }
  });
});

describe('D.1 Read a short story: the bank', () => {
  type Banked = { level: number; facts: { id: string; read: string[] }; prompt: { text: string }; stimulus: { value: string }; options: { value: string }[]; answerIndex: number; explanation: { steps: string[] } };
  const bank = stories as unknown as Banked[];
  const texts = [...new Set(bank.map((each) => each.stimulus.value))];
  const base = new Set(
    [
      ...ALL_SIGHT_WORDS,
      ...CVC_WORDS.map((entry) => entry.word),
      ...WORD_FAMILIES.flatMap((family) => family.words),
      ...[...DIGRAPH_STARTS, ...DIGRAPH_ENDS, ...BLEND_STARTS, ...BLEND_ENDS, ...VOWEL_TEAM_WORDS].map((entry) => entry.word),
      ...SILENT_E_PAIRS.flat(),
      ...COMPOUNDS.flatMap((entry) => [entry.first, entry.second, `${entry.first}${entry.second}`]),
      ...NOUNS,
      ...VERBS,
      ...ADJECTIVES,
      ...OPPOSITES_1.flat(),
      ...SAME_MEANING.flat(),
      ...STORY_NAMES,
    ].map((word) => word.toLowerCase()),
  );
  // A listed word, or one with s, es, ed or ing added (with a doubled last letter, or a dropped e).
  const allowed = (word: string, extra: string[] = []): boolean => {
    const w = word.toLowerCase();
    if (base.has(w) || extra.includes(w)) return true;
    return ['s', 'es', 'ed', 'ing'].some((end) => {
      if (!w.endsWith(end)) return false;
      const stem = w.slice(0, -end.length);
      return base.has(stem) || (stem.length > 2 && stem.at(-1) === stem.at(-2) && base.has(stem.slice(0, -1))) || (end !== 's' && end !== 'es' && base.has(`${stem}e`));
    });
  };
  const wordsOf = (value: string): string[] => value.match(/[A-Za-z]+/g) ?? [];

  it('holds 20 stories of three sentences, each 5 to 8 words long', () => {
    expect(texts).toHaveLength(20);
    for (const story of texts) {
      const sentences = story.split('.').map((each) => each.trim()).filter((each) => each.length > 0);
      expect(sentences, story).toHaveLength(3);
      for (const sentence of sentences) {
        expect(wordsOf(sentence).length, sentence).toBeGreaterThanOrEqual(5);
        expect(wordsOf(sentence).length, sentence).toBeLessThanOrEqual(8);
      }
    }
  });

  it('uses only listed words in every story, and adds only why, does and because to the questions', () => {
    for (const story of texts) for (const word of wordsOf(story)) expect(allowed(word), `"${word}" in: ${story}`).toBe(true);
    for (const each of bank) {
      for (const word of wordsOf(`${each.prompt.text} ${each.options.map((option) => option.value).join(' ')}`)) expect(allowed(word, ['why', 'does', 'because']), `"${word}" in: ${each.prompt.text}`).toBe(true);
    }
  });

  it('asks who or what first, then why or how, with three written options and the answer stated in the story', () => {
    for (const story of texts) {
      const [first, second] = bank.filter((each) => each.stimulus.value === story).sort((one, two) => one.level - two.level);
      expect([first?.level, second?.level]).toEqual([1, 2]);
      expect(first?.prompt.text).toMatch(/^(Who|What) /);
      expect(second?.prompt.text).toMatch(/^(Why|How) /);
    }
    for (const each of bank) {
      expect(each.options).toHaveLength(3);
      expect(new Set(each.options.map((option) => option.value)).size).toBe(3);
      // The explanation quotes one sentence of the story, word for word.
      const quoted = (each.explanation.steps[0] ?? '').replace('The story says: ', '');
      expect(each.stimulus.value).toContain(quoted);
      expect(each.facts.read).toEqual([each.stimulus.value]);
    }
    expect(new Set(bank.map((each) => each.facts.id)).size).toBe(40);
    // The right answer sits in each place about as often.
    for (const level of [1, 2]) expect([0, 1, 2].map((place) => bank.filter((each) => each.level === level && each.answerIndex === place).length).every((count) => count >= 6)).toBe(true);
  });

  it('every banked question is asked, the story is never read aloud, and each one passes the checks', () => {
    for (const level of [1, 2] as Level[]) {
      const questions = all('E-1-D1', level);
      expect(new Set(questions.map((question) => question.facts.id)).size).toBe(20);
      for (const question of questions.map(choice)) {
        expect(question.mode).toBe('read');
        expect(spoken(question.stimulus) || question.options.some(spoken)).toBe(false);
        expect(question.prompt.speak).toEqual([question.prompt.text]);
      }
    }
  });
});
