import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { LessonStep, Level, QuestionDraft, SortBin, Visual } from '../../../../engine/types';
import { ADJECTIVES_2, NOUNS_2, PAST_ED, PAST_ODD, PAST_SENTENCES, PLURALS_IES, PLURALS_ODD, PLURALS_S, PUNCTUATION, VERBS_2 } from '../../../data/phonics2';
import type { SkillGenerator } from '../../../generator';
import { cap } from '../pk/parts';

// Language Arts grade 2 C.1 to C.4: kinds of words, plurals, past tense, punctuation.

const said = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: [value] });
const plain = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });

// ---- C.1 Nouns, verbs, adjectives ----
// Levels: sort 3 words into 3 groups / 6 words. Oracle: ela2.

const KINDS = ['noun', 'verb', 'adjective'] as const;
const KIND_LISTS = { noun: NOUNS_2, verb: VERBS_2, adjective: ADJECTIVES_2 } as const;
const KIND_RULE: Record<(typeof KINDS)[number], string> = { noun: 'A noun names a person, place or thing.', verb: 'A verb is an action, something you do.', adjective: 'An adjective describes, it tells what something is like.' };
const BINS: SortBin[] = [
  { label: 'Noun', speak: ['Noun: a person, place or thing'] },
  { label: 'Verb', speak: ['Verb: an action'] },
  { label: 'Adjective', speak: ['Adjective: a describing word'] },
];

function kindsOfWords(level: Level, rng: Rng): QuestionDraft {
  const each = level === 1 ? 1 : 2;
  const items = rng.shuffle(KINDS.flatMap((kind) => rng.sample(KIND_LISTS[kind], each).map((word) => ({ word, kind }))));
  const prompt = 'Sort the words: noun, verb or adjective.';
  return {
    type: 'sort',
    mode: 'look',
    facts: { items: items.map((item) => item.word), relation: 'wordKind', target: 'kinds', bins: [...KINDS] },
    prompt: { text: prompt, speak: [prompt] },
    items: items.map((item) => said(item.word)),
    bins: BINS,
    answerBin: items.map((item) => KINDS.indexOf(item.kind)),
    explanation: { speak: KINDS.map((kind) => KIND_RULE[kind]), steps: [...KINDS.map((kind) => KIND_RULE[kind]), items.map((item) => `${item.word}: ${item.kind}`).join(', ') + '.'], visual: plain(items.map((item) => item.word).join('  ')) },
  };
}

export const kindsOfWordsGenerator: SkillGenerator = {
  skillId: 'E-2-C1',
  maxLevel: 2,
  itemTypes: ['sort'],
  lists: ['phonics2'],
  generate: kindsOfWords,
  exampleSeed: 521,
  example: () => kindsOfWords(1, makeRng(521)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: KINDS.map((kind) => KIND_RULE[kind]).join(' '), speak: KINDS.map((kind) => KIND_RULE[kind]), visual: plain('dog   run   big') },
    { beat: 'watch', text: 'Dog is a thing: a noun. Run is an action: a verb. Big describes: an adjective.', speak: ['Dog is a thing: a noun. Run is an action: a verb. Big describes: an adjective.'], visual: plain('dog   run   big') },
    { beat: 'try', text: 'Is sing a noun, a verb or an adjective?', speak: ['Is sing a noun, a verb or an adjective?'], visual: said('sing'), reveal: { text: 'Sing is something you do: a verb.', speak: ['Sing is something you do: a verb.'], visual: said('sing') } },
    { beat: 'remember', text: 'Thing: noun. Do: verb. Describe: adjective.', speak: ['Thing: noun. Do: verb. Describe: adjective.'], visual: plain('dog   run   big') },
  ],
  oracle: 'ela2',
};

// ---- C.2 Plurals ----
// Levels: add s or es / change y to ies / irregular. Oracle: ela2.

function pluralRule(one: string, many: string): string {
  if (PLURALS_ODD.some(([a]) => a === one)) return `${cap(one)} has its own word for more than one: ${many}.`;
  if (many.endsWith('ies')) return `Change the y to i and add es: ${many}.`;
  if (many.endsWith('es')) return `Words that end in s, x, sh or ch add es: ${many}.`;
  return `Add s: ${many}.`;
}

function plurals(level: Level, rng: Rng): QuestionDraft {
  const [one, many] = rng.pick(level === 1 ? PLURALS_S : level === 2 ? PLURALS_IES : PLURALS_ODD);
  // The slips: the other ways of making a plural, applied where they do not belong.
  const slips = [`${one}s`, `${one}es`, ...(one.endsWith('y') ? [`${one.slice(0, -1)}ies`] : []), ...(level === 3 ? [`${many}s`] : [`${one}ies`])].filter((each) => each !== many);
  const choices = rng.shuffle([many, ...rng.sample([...new Set(slips)], 2)]);
  const prompt = `One ${one}, two of them. Which is right?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: one, relation: 'plural2', options: choices },
    prompt: { text: prompt, speak: ['One', { word: one }, ', two of them. Which word is spelled right?'] },
    options: choices.map((each) => plain(each)),
    answerIndex: choices.indexOf(many),
    explanation: { speak: [pluralRule(one, many)], steps: [pluralRule(one, many)], visual: plain(`one ${one}, two ${many}`) },
  };
}

export const plurals2Generator: SkillGenerator = {
  skillId: 'E-2-C2',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  pool: { 2: 7, 3: 7 },
  generate: plurals,
  exampleSeed: 522,
  example: () => plurals(1, makeRng(522)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'Most words add s for more than one: cats. Words ending in s, x, sh or ch add es: boxes.', speak: ['Most words add s for more than one. Words ending in s, x, sh or ch add es.'], visual: plain('cat → cats   box → boxes') },
    { beat: 'watch', text: 'Baby ends in y. Change the y to i and add es: babies.', speak: ['Baby ends in y. Change the y to i and add es: babies.'], visual: plain('baby → babies') },
    { beat: 'try', text: 'One mouse, two of them. Which is right?', speak: ['One mouse, two of them. Which word is spelled right?'], visual: plain('mouse'), reveal: { text: 'Mouse has its own word: mice.', speak: ['Mouse has its own word: mice.'], visual: plain('mouse → mice') } },
    { beat: 'remember', text: 's, es, ies, or a word of its own.', speak: ['s, es, ies, or a word of its own.'], visual: plain('foot → feet') },
  ],
  oracle: 'ela2',
};

// ---- C.3 Past tense ----
// Levels: add ed / irregular / in a sentence. Oracle: ela2.

const pastOf = (verb: string): string => (PAST_ED.find(([a]) => a === verb) ?? PAST_ODD.find(([a]) => a === verb))?.[1] ?? `${verb}ed`;

function pastTense(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const entry = rng.pick(PAST_SENTENCES);
    const right = pastOf(entry.verb);
    const slips = [entry.verb, `${entry.verb}s`, `${entry.verb}ed`, `${entry.verb}ing`].filter((each) => each !== right);
    const choices = rng.shuffle([right, ...rng.sample(slips, 2)]);
    const prompt = 'Which word fits the sentence?';
    return {
      type: 'choice',
      mode: 'look',
      facts: { target: entry.sentence, relation: 'pastSentence', options: choices },
      prompt: { text: prompt, speak: [prompt, entry.sentence.replace('___', 'blank')] },
      stimulus: { ...plain(entry.sentence), speak: [entry.sentence.replace('___', 'blank')] },
      options: choices.map(said),
      answerIndex: choices.indexOf(right),
      explanation: { speak: ['It already happened, so the verb is in the past:', right, '.'], steps: ['Yesterday and last tell us it already happened.', entry.sentence.replace('___', right)], visual: plain(entry.sentence.replace('___', right)) },
    };
  }
  const [verb, past] = rng.pick(level === 1 ? PAST_ED : PAST_ODD);
  const slips = [`${verb}s`, `${verb}ed`, `${verb}ing`, `${past}ed`].filter((each) => each !== past);
  const choices = rng.shuffle([past, ...rng.sample(slips, 2)]);
  const prompt = `Today I ${verb}. Yesterday I ___.`;
  const rule = level === 1 ? 'Add ed to tell about the past.' : `${cap(verb)} has its own past word: ${past}.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: verb, relation: 'past', options: choices },
    prompt: { text: prompt, speak: ['Today I', { word: verb }, '. Yesterday I blank.'] },
    options: choices.map((each) => plain(each)),
    answerIndex: choices.indexOf(past),
    explanation: { speak: [rule], steps: [rule, `Yesterday I ${past}.`], visual: plain(`${verb} → ${past}`) },
  };
}

export const pastTenseGenerator: SkillGenerator = {
  skillId: 'E-2-C3',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  generate: pastTense,
  exampleSeed: 523,
  example: () => pastTense(1, makeRng(523)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: 'To tell about the past, most verbs add ed: jump, jumped.', speak: ['To tell about the past, most verbs add ed: jump, jumped.'], visual: plain('jump → jumped') },
    { beat: 'watch', text: 'Some verbs have their own past word: run, ran. go, went.', speak: ['Some verbs have their own past word: run, ran. go, went.'], visual: plain('run → ran   go → went') },
    { beat: 'try', text: 'Today I eat. Yesterday I ___.', speak: ['Today I eat. Yesterday I blank.'], visual: plain('eat'), reveal: { text: 'Eat has its own past word: ate.', speak: ['Eat has its own past word: ate.'], visual: plain('eat → ate') } },
    { beat: 'remember', text: 'Past: add ed, or use the verb’s own past word.', speak: ['Past: add ed, or use the verb’s own past word.'], visual: plain('play → played') },
  ],
  oracle: 'ela2',
};

// ---- C.4 Punctuation ----
// Levels: capitals for names / commas in a list / apostrophe for owning. Oracle: ela2.

const PUNCT_RULE: Record<string, string> = {
  capital: 'Names of people and places start with a capital letter.',
  comma: 'Commas go between the things in a list.',
  apostrophe: 'An apostrophe and s show who owns something.',
};

function punctuation(level: Level, rng: Rng): QuestionDraft {
  const kind = level === 1 ? 'capital' : level === 2 ? 'comma' : 'apostrophe';
  const entry = rng.pick(PUNCTUATION.filter((each) => each.kind === kind));
  const choices = rng.shuffle([entry.right, ...entry.wrong]);
  const prompt = 'Which sentence is written right?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: entry.right, relation: 'punctuation', options: choices },
    prompt: { text: prompt, speak: [prompt] },
    options: choices.map((each) => plain(each, 'm')),
    answerIndex: choices.indexOf(entry.right),
    explanation: { speak: [PUNCT_RULE[kind] as string], steps: [PUNCT_RULE[kind] as string, entry.right], visual: plain(entry.right) },
  };
}

export const punctuationGenerator: SkillGenerator = {
  skillId: 'E-2-C4',
  maxLevel: 3,
  itemTypes: ['choice'],
  lists: ['phonics2'],
  pool: { 1: 4, 2: 4, 3: 4 },
  generate: punctuation,
  exampleSeed: 524,
  example: () => punctuation(1, makeRng(524)),
  lesson: (): LessonStep[] => [
    { beat: 'see', text: PUNCT_RULE.capital as string, speak: [PUNCT_RULE.capital as string], visual: plain('Lily lives in Texas.') },
    { beat: 'watch', text: PUNCT_RULE.comma as string, speak: [PUNCT_RULE.comma as string], visual: plain('I like apples, pears, and grapes.') },
    { beat: 'try', text: 'Whose hat is it? That is Tom___ hat.', speak: ['Whose hat is it?'], visual: plain('That is Toms hat.'), reveal: { text: PUNCT_RULE.apostrophe as string, speak: [PUNCT_RULE.apostrophe as string], visual: plain("That is Tom's hat.") } },
    { beat: 'remember', text: 'Capitals for names, commas in lists, apostrophes for owning.', speak: ['Capitals for names, commas in lists, apostrophes for owning.'], visual: plain("That is Tom's hat.") },
  ],
  oracle: 'ela2',
};
