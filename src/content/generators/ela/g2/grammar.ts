import type { Rng } from '../../../../engine/rng';
import { makeRng } from '../../../../engine/rng';
import type { Explanation, Hint, LessonStep, Level, QuestionDraft, Say, SortBin, Visual } from '../../../../engine/types';
import { ADJECTIVES_2, NOUNS_2, PAST_ED, PAST_ODD, PAST_SENTENCES, PLURALS_IES, PLURALS_ODD, PLURALS_S, PUNCTUATION, VERBS_2 } from '../../../data/phonics2';
import type { SkillGenerator } from '../../../generator';
import { cap } from '../pk/parts';
import type { Line } from '../g1/wording';
import { gapSay, groups, hint, line, listed, spell, stepsOf } from '../g1/wording';

// Language Arts grade 2 C.1 to C.4: kinds of words, plurals, past tense, punctuation.

const said = (value: string): Visual => ({ kind: 'text', value, size: 'l', speak: [value] });
const plain = (value: string, size: 'm' | 'l' | 'xl' = 'l'): Visual => ({ kind: 'text', value, size });

// The explanation: its steps (with their own speech where they need it), what is said as it opens, the picture
// and the hint.
function explained(lines: readonly Line[], visual: Visual, nudge: Hint): Explanation {
  return { speak: lines.flatMap((each): Say => (typeof each === 'string' ? [each] : each.say)), ...stepsOf(lines), visual, hint: nudge };
}

// ---- C.1 Nouns, verbs, adjectives ----
// Levels: sort 3 words into 3 groups / 6 words. Oracle: ela2.

const KINDS = ['noun', 'verb', 'adjective'] as const;
const KIND_LISTS = { noun: NOUNS_2, verb: VERBS_2, adjective: ADJECTIVES_2 } as const;
const KIND_RULE: Record<(typeof KINDS)[number], string> = { noun: 'A noun names a person, place or thing.', verb: 'A verb is an action, something you do.', adjective: 'An adjective describes. It tells what something is like.' };
// "Tree is a noun." and "Tree and dog are nouns."
const KIND_NAME: Record<(typeof KINDS)[number], [string, string]> = { noun: ['a noun', 'nouns'], verb: ['a verb', 'verbs'], adjective: ['an adjective', 'adjectives'] };
const BINS: SortBin[] = [
  { label: 'Noun', speak: ['Noun: a person, place or thing'] },
  { label: 'Verb', speak: ['Verb: an action'] },
  { label: 'Adjective', speak: ['Adjective: a describing word'] },
];

function kindsOfWords(level: Level, rng: Rng): QuestionDraft {
  const each = level === 1 ? 1 : 2;
  const items = rng.shuffle(KINDS.flatMap((kind) => rng.sample(KIND_LISTS[kind], each).map((word) => ({ word, kind }))));
  // Worded as the other sorts are.
  const prompt = 'Put each word in its group.';
  // One step for each kind: its rule, then this question's words of that kind, in short sentences.
  const steps = KINDS.map((kind) => {
    const words = items.filter((item) => item.kind === kind).map((item) => item.word);
    const [one, many] = KIND_NAME[kind];
    return `${KIND_RULE[kind]} ${cap(listed(words))} ${words.length === 1 ? `is ${one}` : `are ${many}`}.`;
  });
  return {
    type: 'sort',
    mode: 'look',
    facts: { items: items.map((item) => item.word), relation: 'wordKind', target: 'kinds', bins: [...KINDS] },
    prompt: { text: prompt, speak: [prompt] },
    items: items.map((item) => said(item.word)),
    bins: BINS,
    answerBin: items.map((item) => KINDS.indexOf(item.kind)),
    explanation: { speak: steps, steps, visual: plain(items.map((item) => item.word).join('  ')), hint: hint('Ask: is it a thing, an action, or a word that describes?') },
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

// The rule for this word only, with its ending spelled when it is said.
function pluralRule(one: string, many: string): Line {
  if (PLURALS_ODD.some(([a]) => a === one)) return `${cap(one)} has its own word for more than one: ${many}.`;
  if (many.endsWith('ies')) return line(`${cap(one)} ends in y. Change the y to i and add es: ${many}.`, [{ word: cap(one) }, 'ends in', { letter: 'y' }, '. Change the', { letter: 'y' }, 'to', { letter: 'i' }, 'and add', ...spell('es'), ':', { word: many }, '.']);
  if (many.endsWith('es')) {
    const ending = ['sh', 'ch', 'ss'].find((each) => one.endsWith(each)) ?? one.slice(-1);
    return line(`${cap(one)} ends in ${ending}, so add es: ${many}.`, [{ word: cap(one) }, 'ends in', ...spell(ending), ', so add', ...spell('es'), ':', { word: many }, '.']);
  }
  return line(`${cap(one)} just adds s: ${many}.`, [{ word: cap(one) }, 'just adds', { letter: 's' }, ':', { word: many }, '.']);
}
const PLURAL_HINT: Record<1 | 2 | 3, Hint> = {
  1: hint('Look at the end of the word. Does it end in s, x, sh or ch?', ['Look at the end of the word. Does it end in', ...groups(['s', 'x', 'sh', 'ch'], 'or'), '?']),
  2: hint('The word ends in y. What happens to the y?'),
  3: hint('Some words change to a new word for more than one.'),
};

function plurals(level: Level, rng: Rng): QuestionDraft {
  const [one, many] = rng.pick(level === 1 ? PLURALS_S : level === 2 ? PLURALS_IES : PLURALS_ODD);
  // The slips: the other ways of making a plural, applied where they do not belong.
  const slips = [`${one}s`, `${one}es`, ...(one.endsWith('y') ? [`${one.slice(0, -1)}ies`] : []), ...(level === 3 ? [`${many}s`] : [`${one}ies`])].filter((each) => each !== many);
  const choices = rng.shuffle([many, ...rng.sample([...new Set(slips)], 2)]);
  // Shown and said alike: the gap is the word for two.
  const prompt = `One ${one}, two ___. Which word is spelled right?`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: one, relation: 'plural2', options: choices },
    prompt: { text: prompt, speak: ['One', { word: one }, ', two ...', 'Which word is spelled right?'] },
    options: choices.map((each) => plain(each)),
    answerIndex: choices.indexOf(many),
    explanation: explained([pluralRule(one, many)], plain(`one ${one}, two ${many}`), PLURAL_HINT[level === 1 ? 1 : level === 2 ? 2 : 3]),
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
    { beat: 'try', text: 'One mouse, two ___. Which word is spelled right?', speak: ['One mouse, two ... Which word is spelled right?'], visual: plain('mouse'), reveal: { text: 'Mouse has its own word: mice.', speak: ['Mouse has its own word: mice.'], visual: plain('mouse → mice') } },
    { beat: 'remember', text: 's, es, ies, or a word of its own.', speak: ['s, es, ies, or a word of its own.'], visual: plain('foot → feet') },
  ],
  oracle: 'ela2',
};

// ---- C.3 Past tense ----
// Levels: add ed / irregular / in a sentence. Oracle: ela2.

const pastOf = (verb: string): string => (PAST_ED.find(([a]) => a === verb) ?? PAST_ODD.find(([a]) => a === verb))?.[1] ?? `${verb}ed`;
// The sentence's own clue, named as words: "The words last night tell us it already happened."
const clueLine = (clue: string): string => `${clue.includes(' ') ? 'The words' : 'The word'} ${clue.toLowerCase()} ${clue.includes(' ') ? 'tell' : 'tells'} us it already happened.`;

function pastTense(level: Level, rng: Rng): QuestionDraft {
  if (level === 3) {
    const entry = rng.pick(PAST_SENTENCES);
    const right = pastOf(entry.verb);
    const slips = [entry.verb, `${entry.verb}s`, `${entry.verb}ed`, `${entry.verb}ing`].filter((each) => each !== right);
    const choices = rng.shuffle([right, ...rng.sample(slips, 2)]);
    const prompt = 'Which word fits the sentence?';
    const done = entry.sentence.replace('___', right);
    return {
      type: 'choice',
      mode: 'look',
      facts: { target: entry.sentence, relation: 'pastSentence', options: choices },
      prompt: { text: prompt, speak: [prompt, gapSay(entry.sentence)] },
      stimulus: { ...plain(entry.sentence), speak: [gapSay(entry.sentence)] },
      options: choices.map(said),
      answerIndex: choices.indexOf(right),
      explanation: explained([clueLine(entry.clue), done], plain(done), hint('Find the words that tell when it happened.')),
    };
  }
  const [verb, past] = rng.pick(level === 1 ? PAST_ED : PAST_ODD);
  const slips = [`${verb}s`, `${verb}ed`, `${verb}ing`, `${past}ed`].filter((each) => each !== past);
  const choices = rng.shuffle([past, ...rng.sample(slips, 2)]);
  const prompt = `Today I ${verb}. Yesterday I ___.`;
  const rule = level === 1 ? line(`Add ed to tell about the past: ${past}.`, ['Add', ...spell('ed'), 'to tell about the past:', { word: past }, '.']) : `The word ${verb} has its own past word: ${past}.`;
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: verb, relation: 'past', options: choices },
    prompt: { text: prompt, speak: ['Today I', { word: verb }, '. Yesterday I ...'] },
    options: choices.map((each) => plain(each)),
    answerIndex: choices.indexOf(past),
    explanation: explained([rule, `Yesterday I ${past}.`], plain(`${verb} → ${past}`), hint('Think about how you tell about yesterday.')),
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
    { beat: 'try', text: 'Today I eat. Yesterday I ___.', speak: ['Today I eat. Yesterday I ...'], visual: plain('eat'), reveal: { text: 'Eat has its own past word: ate.', speak: ['Eat has its own past word: ate.'], visual: plain('eat → ate') } },
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
// What is said as the explanation opens: the rule, with the letter s as a letter.
const PUNCT_SAY: Record<string, Say> = {
  capital: [PUNCT_RULE.capital as string],
  comma: [PUNCT_RULE.comma as string],
  apostrophe: ['An apostrophe and', { letter: 's' }, 'show who owns something.'],
};
const PUNCT_HINT: Record<string, string> = {
  capital: 'Check each name. Does it start with a capital letter?',
  comma: 'Look for commas between the things in the list.',
  apostrophe: 'Who owns something? Look for an apostrophe and s.',
};

function punctuation(level: Level, rng: Rng): QuestionDraft {
  const kind = level === 1 ? 'capital' : level === 2 ? 'comma' : 'apostrophe';
  const entry = rng.pick(PUNCTUATION.filter((each) => each.kind === kind));
  const choices = rng.shuffle([entry.right, ...entry.wrong]);
  // Worded as grade 1 C.6 is.
  const prompt = 'Which sentence is written the right way?';
  return {
    type: 'choice',
    mode: 'look',
    facts: { target: entry.right, relation: 'punctuation', options: choices },
    prompt: { text: prompt, speak: [prompt] },
    options: choices.map((each) => plain(each, 'm')),
    answerIndex: choices.indexOf(entry.right),
    explanation: { speak: PUNCT_SAY[kind] as Say, steps: [PUNCT_RULE[kind] as string, entry.right], visual: plain(entry.right), hint: hint(PUNCT_HINT[kind] as string) },
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
