import { CAPITAL_WORD_SENTENCES, COMPLETE, DAYS, FRAGMENTS, HOW_GAPS, HOW_SENTENCES, JOINING, MONTHS, PRONOUN_ENTRIES, PROPER_NOUNS, QUESTIONS, REFLEXIVE_SUBJECTS, WE_ENTRIES } from '../../../src/content/data/h4-grammar';
import { END_PART_READ, END_PART_WORDS, PLAIN_VERBS, SIGHT_5, SILENT_PICTURES, SILENT_WORDS, SOUND_TEAM_WORDS } from '../../../src/content/data/h4-phonics';
import { FACT_SENTENCES, FACT_TEXTS, FEATURE_USE, FEATURE_WHAT, FEELING_TEXTS, POEMS, PURPOSE_TEXTS, STORY_PAIRS, STORY_SENTENCES, STORY_TEXTS, TELLERS, TOLD_BY_ME, TOLD_BY_OTHER } from '../../../src/content/data/h4-reading';
import { COLLECTIVES, SHADES, TWO_MEANINGS, WORD_GROUPS } from '../../../src/content/data/h4-words';
import type { Oracle, OracleAnswer } from '../types';
import { list, text } from '../types';

// Language Arts grades 1 and 2, wave H4 of plan section 15. Rules are worked out here where a rule exists
// (endings, ABC order, guide words, y and soft c and g sounds, capitals, one or more, who tells the story,
// adjective or adverb); everything else is looked up in the wave's lists, never in a generator.

function only(options: readonly string[], fits: (word: string) => boolean, relation: string): OracleAnswer {
  const found = options.filter(fits);
  if (found.length !== 1) throw new Error(`oracle h4ela ${relation}: ${found.length} options fit`);
  return { kind: 'value', value: found[0] as string };
}
function find<T>(found: T | undefined, what: string): T {
  if (found === undefined) throw new Error(`oracle h4ela: ${what} is not in the lists`);
  return found;
}
const capital = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

// Letter by letter, as a dictionary does.
function abc(a: string, b: string): number {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const diff = a.charCodeAt(i) - b.charCodeAt(i);
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
}

// y at the end: like e when another vowel comes before it (baby), like i when none does (fly).
const ySound = (word: string): string => {
  if (!word.endsWith('y')) throw new Error(`oracle h4ela: ${word} does not end in y`);
  return /[aeiou]/.test(word.slice(0, -1)) ? 'e' : 'i';
};
// The c or g is soft when e, i or y comes right after it.
const softness = (word: string): string => {
  const at = word.search(/[cg]/);
  if (at === -1 || /[cg]/.test(word.slice(at + 1))) throw new Error(`oracle h4ela: ${word} needs exactly one c or g`);
  return /[eiy]/.test(word.charAt(at + 1)) ? 'soft' : 'hard';
};
// More than one: a pronoun for more, a pair joined by and, or a word ending in s.
function isMore(subject: string): boolean {
  if (['He', 'She', 'It'].includes(subject)) return false;
  if (['We', 'They', 'I', 'You'].includes(subject)) return true;
  return subject.includes(' and ') || subject.endsWith('s');
}
const NAMES = [...DAYS, ...MONTHS];
// Written right: a capital at the start, and every day or month written with its capital.
function capitalsRight(sentence: string): boolean {
  if (!/^[A-Z]/.test(sentence)) return false;
  const words = sentence.split(/[^A-Za-z]+/).filter((word) => word.length > 0);
  return words.every((word) => !NAMES.some((name) => name.toLowerCase() === word.toLowerCase()) || NAMES.includes(word));
}
const tellsAsI = (story: string): boolean => /\b(I|me|my)\b/i.test(story);
const lineKey = (line: string): string => line.replace(/[,.]$/, '').toLowerCase();

export const h4ela: Oracle = (facts) => {
  const relation = text(facts, 'relation');
  const target = text(facts, 'target');
  const options = (): string[] => list(facts, 'options').map(String);
  const items = (): string[] => list(facts, 'items').map(String);
  switch (relation) {
    // ---- Grade 1 phonics ----
    case 'ending':
      return only(options(), (word) => word.endsWith(target) && PLAIN_VERBS.includes(word.slice(0, -target.length)), relation);
    case 'endingSentence': {
      const base = text(facts, 'base');
      if (!PLAIN_VERBS.includes(base)) throw new Error(`oracle h4ela: ${base} is not a plain verb`);
      const ending = target.startsWith('Yesterday') ? 'ed' : / is ___/.test(target) ? 'ing' : target.includes('every day') ? 's' : undefined;
      return { kind: 'value', value: `${base}${find(ending, `a clue in ${target}`)}` };
    }
    case 'root':
      return { kind: 'value', value: find(PLAIN_VERBS.find((verb) => ['s', 'ed', 'ing'].some((ending) => `${verb}${ending}` === target)), target) };
    case 'part':
      return { kind: 'value', value: find([...END_PART_WORDS, ...SOUND_TEAM_WORDS].find((each) => each.word === target), target).part };
    case 'endsWith':
      return only(options(), (word) => word.endsWith(target) && END_PART_READ.some((each) => each.word === word), relation);
    case 'ySort': {
      const bins = list(facts, 'bins').map(String);
      return { kind: 'bins', bins: items().map((word) => bins.indexOf(ySound(word))) };
    }
    case 'yChoice':
      return only(options(), (word) => ySound(word) === target, relation);
    // ---- Grade 1 words ----
    case 'sight5':
      return { kind: 'value', value: find(SIGHT_5.find((word) => word === target), target) };
    case 'abcFirst':
      return { kind: 'value', value: [...options()].sort(abc)[0] as string };
    case 'abcOrder': {
      const shown = items();
      return { kind: 'order', order: [...shown].sort(abc).map((word) => shown.indexOf(word)) };
    }
    case 'groupFits': {
      const shown = target.split(', ');
      const group = find(WORD_GROUPS.find((each) => shown.every((word) => each.words.includes(word))), target);
      return only(options(), (word) => group.words.includes(word) && !shown.includes(word), relation);
    }
    case 'oddWord': {
      const groupOf = (word: string): string => find(WORD_GROUPS.find((each) => each.words.includes(word)), word).name;
      const all = options();
      return only(all, (word) => all.filter((other) => groupOf(other) === groupOf(word)).length === 1, relation);
    }
    case 'groupName': {
      const shown = target.split(', ');
      return { kind: 'value', value: find(WORD_GROUPS.find((each) => shown.every((word) => each.words.includes(word))), target).name };
    }
    // ---- Grade 1 grammar ----
    case 'pronoun': {
      const pronoun = find([...PRONOUN_ENTRIES, ...WE_ENTRIES].find((each) => each.noun === target), target).pronoun;
      return { kind: 'value', value: facts.capital === true ? capital(pronoun) : pronoun };
    }
    case 'agree': {
      const more = isMore(text(facts, 'subject'));
      const single = ['is', 'has', 'was'];
      const plural = ['are', 'have', 'were'];
      return only(options(), (word) => (more ? plural.includes(word) || (!single.includes(word) && !word.endsWith('s')) : single.includes(word) || (!plural.includes(word) && word.endsWith('s'))), relation);
    }
    case 'capitalRight':
      return only(options(), capitalsRight, relation);
    case 'capitalWord':
      if (!CAPITAL_WORD_SENTENCES.some((each) => NAMES.some((name) => each.sentence.replace('WHEN', name.toLowerCase()) === target))) throw new Error(`oracle h4ela: ${target} is not a capital sentence`);
      return only(options(), (word) => NAMES.some((name) => name.toLowerCase() === word), relation);
    case 'properNoun':
      return only(options(), (word) => /^[A-Z]/.test(word) && PROPER_NOUNS.includes(word), relation);
    case 'nounSort': {
      const bins = list(facts, 'bins').map(String);
      return { kind: 'bins', bins: items().map((word) => bins.indexOf(/^[A-Z]/.test(word) ? 'proper' : 'common')) };
    }
    case 'questionWord':
      return { kind: 'value', value: find(QUESTIONS.find((each) => each.question === target), target).word };
    case 'joining':
      return { kind: 'value', value: find(JOINING.find((each) => each.sentence === target), target).word };
    // ---- Grade 1 reading ----
    case 'storyOrFact': {
      if (STORY_TEXTS.some((each) => each.id === target)) return { kind: 'value', value: 'It tells a story.' };
      if (FACT_TEXTS.some((each) => each.id === target)) return { kind: 'value', value: 'It gives facts.' };
      throw new Error(`oracle h4ela: no text ${target}`);
    }
    case 'factSentence':
      return only(options(), (sentence) => FACT_SENTENCES.includes(sentence) && !STORY_SENTENCES.includes(sentence), relation);
    case 'teller':
      return { kind: 'value', value: find(TOLD_BY_ME.find((each) => each.id === target), target).teller[0] };
    case 'tellerKind': {
      const story = find([...TOLD_BY_ME, ...TOLD_BY_OTHER].find((each) => each.id === target), target).text;
      return { kind: 'value', value: TELLERS[tellsAsI(story) ? 0 : 1] };
    }
    case 'feeling':
      return { kind: 'value', value: find(FEELING_TEXTS.find((each) => each.id === target), target).feeling };
    case 'feelingClue':
      return only(options(), (sentence) => FEELING_TEXTS.some((each) => each.clue === sentence && each.feeling === target), relation);
    // ---- Grade 2 phonics ----
    case 'softHard': {
      const bins = list(facts, 'bins').map(String);
      return { kind: 'bins', bins: items().map((word) => bins.indexOf(softness(word))) };
    }
    case 'silentLetter':
      return { kind: 'value', value: find(SILENT_WORDS.find((each) => each.word === target), target).silent };
    case 'silentSpelling': {
      const word = find(SILENT_PICTURES.find((each) => each.word === target), target).word;
      if (!/^(kn|wr)|mb$/.test(word)) throw new Error(`oracle h4ela: ${word} has no silent letter`);
      return { kind: 'value', value: word };
    }
    case 'hasSilent':
      return only(options(), (word) => SILENT_WORDS.some((each) => each.word === word), relation);
    // ---- Grade 2 words ----
    case 'shadeStrong':
      return { kind: 'value', value: find(SHADES.find((scale) => scale[1] === target), target)[2] };
    case 'shadeWeak':
      return { kind: 'value', value: find(SHADES.find((scale) => scale[1] === target), target)[0] };
    case 'shadeOrder': {
      const scale = find(SHADES.find((each) => each[1] === target), target);
      const shown = items();
      return { kind: 'order', order: scale.map((word) => shown.indexOf(word)) };
    }
    case 'meaning': {
      const entry = find(TWO_MEANINGS.find((each) => each.sentences.includes(target)), target);
      return { kind: 'value', value: entry.meanings[entry.sentences.indexOf(target)] as string };
    }
    case 'meaningSentence': {
      const entry = find(TWO_MEANINGS.find((each) => each.word === text(facts, 'word')), text(facts, 'word'));
      return { kind: 'value', value: entry.sentences[entry.meanings.indexOf(target)] as string };
    }
    case 'guide': {
      const [first, last] = target.split(' ') as [string, string];
      return only(options(), (word) => abc(first, word) < 0 && abc(word, last) < 0, relation);
    }
    // ---- Grade 2 grammar ----
    case 'collective':
      return { kind: 'value', value: find(COLLECTIVES.find((each) => each.things === target), target).group };
    case 'collectiveThings':
      return { kind: 'value', value: find(COLLECTIVES.find((each) => each.group === target), target).things };
    case 'reflexive':
      return { kind: 'value', value: find(REFLEXIVE_SUBJECTS.find((each) => each.subject === text(facts, 'subject')), text(facts, 'subject')).reflexive };
    case 'adverb':
      if (!HOW_SENTENCES.some((each) => each.sentence === target)) throw new Error(`oracle h4ela: ${target} is not in the lists`);
      return only(options(), (word) => word.endsWith('ly') && target.split(/[^A-Za-z]+/).includes(word), relation);
    case 'adverbGap': {
      if (!HOW_GAPS.some((each) => each.sentence === target)) throw new Error(`oracle h4ela: ${target} is not in the lists`);
      const before = target.split(' ___')[0]?.split(' ').pop() ?? '';
      const describing = ['is', 'was', 'are', 'were'].includes(before);
      return only(options(), (word) => word.endsWith('ly') !== describing, relation);
    }
    case 'complete':
      if (COMPLETE.includes(target)) return { kind: 'value', value: 'Yes' };
      if (FRAGMENTS.includes(target)) return { kind: 'value', value: 'No' };
      throw new Error(`oracle h4ela: ${target} is not in the lists`);
    case 'completeChoice':
      return only(options(), (sentence) => COMPLETE.includes(sentence), relation);
    // ---- Grade 2 reading ----
    case 'feature':
      return { kind: 'value', value: find([...FEATURE_WHAT, ...FEATURE_USE].find((each) => each.ask === target), target).feature };
    case 'poemRhyme': {
      const poem = find(POEMS.find((each) => each.id === text(facts, 'id')), text(facts, 'id'));
      if (poem.rhyme[0] !== target) throw new Error(`oracle h4ela: ${target} is not the poem's rhyme`);
      return { kind: 'value', value: poem.rhyme[1] };
    }
    case 'poemRepeat': {
      const poem = find(POEMS.find((each) => each.id === target), target);
      const twice = find(poem.lines.find((line) => poem.lines.filter((other) => lineKey(other) === lineKey(line)).length === 2), `a repeated line in ${target}`);
      return { kind: 'value', value: capital(twice.replace(/[,.]$/, '')) };
    }
    case 'sameInBoth':
      return { kind: 'value', value: find(STORY_PAIRS.find((each) => each.id === target), target).same[0] };
    case 'differ':
      return { kind: 'value', value: find(STORY_PAIRS.find((each) => each.id === target), target).differ[0] };
    case 'purpose':
      return { kind: 'value', value: find(PURPOSE_TEXTS.find((each) => each.id === target), target).purpose };
  }
  throw new Error(`oracle h4ela: unknown relation ${relation}`);
};
