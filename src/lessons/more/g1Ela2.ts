import { G1_FACTS, G1_STORIES } from '../../content/banks/comprehension';
import { DESCRIBING_SENTENCES } from '../../content/data/describing';
import { DAYS, JOINING, MONTHS, PRONOUN_ENTRIES, QUESTIONS, SUBJECTS_ONE, WE_ENTRIES } from '../../content/data/h4-grammar';
import { FACT_TEXTS, FEELING_TEXTS, STORY_TEXTS, TOLD_BY_ME, TOLD_BY_OTHER } from '../../content/data/h4-reading';
import { DESCRIBING_PICTURES, NOUNS } from '../../content/data/phonics1';
import type { Question, Visual } from '../../engine/types';
import { add, alter, art, calm, moment, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Grade 1 Language Arts lessons, grammar C.1 to C.9 and reading D.1 to D.8 (plan section 16).

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

// ---- Reading a question ----

function choiceOf(q: Question): Extract<Question, { type: 'choice' }> {
  if (q.type !== 'choice') throw new Error(`${q.skillId} turn is not a choice`);
  return q;
}

function valueOf(visual: Visual | undefined): string {
  if (visual?.kind !== 'text') throw new Error('Not a text picture');
  return visual.value;
}

const answerOf = (q: Question): string => {
  const c = choiceOf(q);
  return valueOf(c.options[c.answerIndex]);
};
const optionsOf = (q: Question): string[] => choiceOf(q).options.map(valueOf);
const stimulusOf = (q: Question): string => valueOf(q.stimulus);
const blank = (value: string): string => value.replace(/_+/g, 'blank');

// ---- Laying out words and lines ----

const CHAR = 0.42; // a letter's width, in stage squares, for a piece one square high

// Word tiles in one row, centred on x = 5. Shrinks to fit 9.6 squares.
function tiles(prefix: string, words: readonly string[], y: number, size = 0.8): Piece[] {
  const gap = 0.15;
  const widthAt = (h: number) => words.map((word) => Math.max(h, word.length * CHAR * h + 0.35));
  let h = size;
  let widths = widthAt(h);
  let total = widths.reduce((sum, w) => sum + w, 0) + gap * (words.length - 1);
  while (total > 9.6) {
    h *= 0.95;
    widths = widthAt(h);
    total = widths.reduce((sum, w) => sum + w, 0) + gap * (words.length - 1);
  }
  let x = 5 - total / 2;
  return words.map((word, i) => {
    const w = widths[i] ?? 1;
    const piece: Piece = { id: `${prefix}${i}`, look: text(word), x, y: y + (size - h) / 2, w, h };
    x += w + gap;
    return piece;
  });
}

const tileIds = (prefix: string, count: number): string[] => Array.from({ length: count }, (_, i) => `${prefix}${i}`);

function sentencesOf(value: string): string[] {
  return (value.match(/[^.!?]+[.!?]+["”]?/g) ?? [value]).map((each) => each.trim());
}

// A text, one sentence to a line, from the top of the stage.
function lines(prefix: string, sentences: readonly string[], x = 0.2, w = 9.6, top = 0.15): Piece[] {
  const step = 0.75;
  const most = 0.62;
  return sentences.map((sentence, i) => {
    const h = Math.min(most, w / (sentence.length * CHAR + 0.6));
    return { id: `${prefix}${i}`, look: text(sentence), x, y: top + i * step + (most - h) / 2, w, h };
  });
}

// One line of text on its own: a question or a sentence to check.
function lineAt(id: string, value: string, y: number, most = 0.7): Piece {
  const h = Math.min(most, 9.6 / (value.length * CHAR + 0.6));
  return { id, look: text(value), x: 0.2, y: y + (most - h) / 2, w: 9.6, h };
}

const STOP = new Set(['the', 'a', 'an', 'is', 'it', 'he', 'she', 'his', 'her', 'to', 'and', 'of', 'in', 'on', 'at', 'they', 'them', 'do', 'does', 'what', 'who', 'where', 'when', 'why', 'how']);
const wordsOf = (value: string): string[] => value.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((each) => each.length > 0 && !STOP.has(each));

// The sentence of a text that shares the most words with `about`.
function bestSentence(sentences: readonly string[], about: string, preferLast = false): number {
  const want = new Set(wordsOf(about));
  let best = 0;
  let bestScore = -1;
  sentences.forEach((sentence, i) => {
    const score = wordsOf(sentence).filter((each) => want.has(each)).length;
    if (score > bestScore || (preferLast && score === bestScore)) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

function pointed(from: Scene, id: string): Scene {
  const piece = from.pieces.find((each) => each.id === id);
  return piece ? pointAt(from, { ...piece, w: Math.min(piece.w ?? 1, 2) }) : from;
}

// The why of a reading turn: the story, the question, the sentence that answers it, the answer.
function lookBackWhy(q: Question, line: number | null, says = 'The story says:', stage: Scene = scene([...lines('l', sentencesOf(stimulusOf(q))), lineAt('ask', q.prompt.text, 3.4)])): Moment[] {
  const story = sentencesOf(stimulusOf(q));
  const at = line ?? bestSentence(story, `${q.prompt.text} ${answerOf(q)}`);
  const sentence = story[at] ?? '';
  const answer = answerOf(q);
  const asked = set(stage, ['ask'], { lit: true });
  const found = set(calm(asked), [`l${at}`], { lit: true });
  const done = add(found, [lineAt('ans', answer, 4.5)]);
  return [
    moment(['The question is:', q.prompt.text], q.prompt.text, asked),
    moment([says, sentence], sentence, found),
    moment(['So the answer is:', `${answer.replace(/[.!?]$/, '')}.`], answer, set(done, ['ans'], { lit: true })),
  ];
}

// ---- E-1-C1 Naming and action words ----

// Two group labels at the top, the words in a row in the middle; sorting slides each word under its label.
function sortScene(words: readonly string[]): Scene {
  return scene([
    { id: 'binN', look: text('Naming words'), x: 0.3, y: 0.3, w: 4.4, h: 0.7 },
    { id: 'binA', look: text('Action words'), x: 5.3, y: 0.3, w: 4.4, h: 0.7 },
    ...tiles('w', words, 3.6),
  ]);
}

function sortInto(from: Scene, words: readonly string[], picked: readonly string[], left: boolean): Scene {
  return alter(calm(from), (piece) => {
    const i = Number(piece.id.slice(1));
    const word = piece.id.startsWith('w') ? words[i] : undefined;
    if (word === undefined || !picked.includes(word)) return piece;
    const place = picked.indexOf(word);
    return { ...piece, x: (left ? 0.6 : 5.6) + (place % 2) * 2, y: 1.3 + Math.floor(place / 2) * 0.9, w: 1.8, h: 0.7, lit: true };
  });
}

const listSay = (words: readonly string[]): (string | { word: string })[] =>
  words.length === 2 ? [{ word: words[0] ?? '' }, 'and', { word: words[1] ?? '' }] : words.flatMap((word, i) => (i === 0 ? [{ word }] : i === words.length - 1 ? [', and', { word }] : [',', { word }]));

function sortWordsWhy(q: Question): Moment[] {
  const words = (q.facts.items as unknown[]).map(String);
  const nouns = words.filter((word) => NOUNS.includes(word));
  const verbs = words.filter((word) => !NOUNS.includes(word));
  const start = sortScene(words);
  const named = sortInto(start, words, nouns, true);
  const done = sortInto(named, words, verbs, false);
  return [
    moment(['Ask for each word: does it name something, or is it something you do?'], words.join('   '), start),
    moment([...listSay(nouns), nouns.length === 1 ? 'names something. It goes in Naming words.' : 'name things. They go in Naming words.'], `Naming words: ${nouns.join(', ')}`, set(named, ['binN'], { lit: true })),
    moment([...listSay(verbs), verbs.length === 1 ? 'is something you do. It goes in Action words.' : 'are things you do. They go in Action words.'], `Action words: ${verbs.join(', ')}`, set(done, ['binA'], { lit: true })),
  ];
}

export function namingActionLesson(): Lesson {
  const words = ['dog', 'run', 'ball', 'jump'];
  const start = sortScene(words);
  const dog = set(start, ['w0'], { lit: true });
  const dogIn = sortInto(start, words, ['dog'], true);
  const runIn = sortInto(dogIn, words, ['run'], false);
  const ballIn = sortInto(runIn, words, ['dog', 'ball'], true);
  const allIn = sortInto(ballIn, words, ['run', 'jump'], false);
  const first = turnQuestion('E-1-C1', 1, (f) => !(f.items as unknown[]).includes('dog'));
  const second = turnQuestion('E-1-C1', 2, (f) => (f.items as unknown[]).some((each) => !(first.facts.items as unknown[]).includes(each)));
  return {
    parts: [
      show(moment(['Words can name things, or tell what we do.'], 'Naming words and action words', start)),
      show(moment(['A naming word names a person, an animal, or a thing.'], 'Naming words', set(start, ['binN'], { lit: true }))),
      show(moment(['An action word is something you do.'], 'Action words', set(start, ['binA'], { lit: true }))),
      show(moment([{ word: 'dog' }, 'names an animal.'], 'dog', dog)),
      show(moment(['So', { word: 'dog' }, 'goes in Naming words.'], 'dog → Naming words', dogIn)),
      show(moment(['Can you', { word: 'run' }, '? Yes! Run is something you do. It is an action word.'], 'run → Action words', runIn)),
      show(moment([{ word: 'ball' }, 'names a thing. It is a naming word.'], 'ball → Naming words', ballIn)),
      show(moment([{ word: 'jump' }, 'is something you do. It is an action word.'], 'jump → Action words', allIn)),
      show(moment(['Ask: can I do it? If you can do it, it is an action word.'], 'Can I do it?', calm(allIn))),
      turn(first, sortWordsWhy(first)),
      turn(second, sortWordsWhy(second)),
      show(moment(['Things are naming words. Things you do are action words.'], 'Naming words   Action words', calm(allIn))),
    ],
  };
}

// ---- E-1-C2 Describing words ----

function describingSentenceWhy(q: Question): Moment[] {
  const sentence = str(q.facts, 'target');
  const entry = DESCRIBING_SENTENCES.find((each) => each.sentence === sentence);
  if (!entry) throw new Error(`No describing sentence ${sentence}`);
  const words = sentence.split(' ');
  const at = (word: string) => `w${words.findIndex((each) => each.replace(/[.!?]/g, '') === word)}`;
  const start = scene(tiles('w', words, 1.6));
  return [
    moment(['Read it:', sentence], sentence, set(start, tileIds('w', words.length), { lit: true })),
    moment(['What is the', { word: entry.naming }, 'like?'], `What is the ${entry.naming} like?`, set(start, [at(entry.naming)], { lit: true })),
    moment([{ word: entry.describing }, 'tells what the', { word: entry.naming }, 'is like.'], `${entry.describing} tells what the ${entry.naming} is like.`, set(start, [at(entry.describing)], { lit: true })),
  ];
}

function describingPictureWhy(q: Question): Moment[] {
  const word = str(q.facts, 'target');
  const emoji = DESCRIBING_PICTURES.find((each) => each.word === word)?.emoji ?? '';
  const start = scene([{ id: 'pic', look: art(emoji), x: 3.75, y: 0.3, w: 2.5, h: 2.5 }, { id: 'say', look: text(word), x: 3.5, y: 3.6, w: 3, h: 1, gone: true }]);
  return [
    moment(['Look at the picture. What is it like?'], 'What is it like?', set(start, ['pic'], { lit: true })),
    moment(['It is', { word }, '. So the word is', { word }, '.'], word, set(start, ['say'], { gone: false, lit: true })),
  ];
}

export function describingLesson(): Lesson {
  const words = ['The', 'big', 'dog', 'ran.'];
  const start = scene([{ id: 'dog', look: art('🐕'), x: 4, y: 0.8, w: 1.8, h: 1.8 }, ...tiles('w', words, 3.7)]);
  const bigDog = set(set(start, ['w1'], { lit: true }), ['dog'], { x: 3.4, y: 0.2, w: 3, h: 3 });
  const snow = scene([{ id: 'dog', look: art('❄️'), x: 3.9, y: 0.4, w: 2.2, h: 2.2 }, { id: 'cold', look: text('cold'), x: 3.5, y: 3.7, w: 3, h: 1, gone: true }]);
  const first = turnQuestion('E-1-C2', 1, (f) => str(f, 'target') !== 'The big dog ran.');
  const second = turnQuestion('E-1-C2', 2, (f) => str(f, 'target') !== 'cold');
  return {
    parts: [
      show(moment(['Today we find describing words. They tell what something is like.'], 'Describing words', start)),
      show(moment(['Here is a sentence: The big dog ran.'], 'The big dog ran.', set(start, tileIds('w', 4), { lit: true }))),
      show(moment([{ word: 'dog' }, 'is a naming word. It names an animal.'], 'dog names an animal', set(start, ['w2', 'dog'], { lit: true }))),
      show(moment([{ word: 'ran' }, 'is an action word. It is what the dog did.'], 'ran is what the dog did', set(start, ['w3'], { lit: true }))),
      show(moment([{ word: 'big' }, 'tells what the dog is like. The dog is big!'], 'big tells what the dog is like', bigDog)),
      show(moment(['So', { word: 'big' }, 'is the describing word.'], 'big is the describing word', set(bigDog, ['w1'], { badge: 'describes' }))),
      show(moment(['To find it, ask: what is it like?'], 'Ask: what is it like?', calm(bigDog))),
      turn(first, describingSentenceWhy(first)),
      show(moment(['A describing word can tell about a picture too.'], 'Words for pictures', snow)),
      show(moment(['Snow feels', { word: 'cold' }, '. Cold is a describing word.'], 'cold', set(snow, ['cold'], { gone: false, lit: true }))),
      turn(second, describingPictureWhy(second)),
      show(moment(['Ask what it is like, and you find the describing word.'], 'What is it like?', calm(set(snow, ['cold'], { gone: false })))),
    ],
  };
}

// ---- E-1-C3 End marks ----

const MARK_NAME: Record<string, string> = { '.': 'period', '?': 'question mark', '!': 'exclamation mark' };
const MARK_KIND: Record<string, string> = { '.': 'It tells us something.', '?': 'It asks something.', '!': 'It is a shout, said with a strong feeling.' };

function markScene(prefix: string, sentence: string, y = 1.6): Scene {
  const words = sentence.slice(0, -1).split(' ');
  const laid = tiles(prefix, [...words, 'M'], y, 0.9);
  const last = laid[laid.length - 1];
  if (last) last.look = { kind: 'box' };
  return scene(laid);
}

function fillMark(from: Scene, id: string, mark: string): Scene {
  return alter(calm(from), (piece) => (piece.id === id ? { ...piece, look: text(mark), lit: true } : piece));
}

function endMarkWhy(q: Question): Moment[] {
  const said = q.stimulus?.kind === 'text' ? q.stimulus.speak : undefined;
  const sentence = typeof said?.[0] === 'string' ? said[0] : '';
  const mark = sentence.slice(-1);
  const start = markScene('w', sentence);
  const words = sentence.slice(0, -1).split(' ').length;
  return [
    moment(['Listen:', sentence], sentence.slice(0, -1), set(start, tileIds('w', words), { lit: true })),
    moment([MARK_KIND[mark] ?? ''], MARK_KIND[mark] ?? '', set(start, [`w${words}`], { lit: true })),
    moment([`So it ends with ${mark === '!' ? 'an' : 'a'} ${MARK_NAME[mark] ?? ''}.`], sentence, fillMark(start, `w${words}`, mark)),
  ];
}

export function endMarksLesson(): Lesson {
  const tell = markScene('w', 'The sun is hot.');
  const ask = alter(tell, (piece) => {
    const words = ['Is', 'the', 'sun', 'hot'];
    const i = Number(piece.id.slice(1));
    return i < 4 ? { ...piece, look: text(words[i] ?? '') } : { ...piece, look: { kind: 'box' } };
  });
  const shout = markScene('s', 'Wow, the sun is hot!');
  const marks = scene([
    { id: 'm0', look: text('.'), x: 1.5, y: 1, w: 1.4, h: 1.4 },
    { id: 'm1', look: text('?'), x: 4.3, y: 1, w: 1.4, h: 1.4 },
    { id: 'm2', look: text('!'), x: 7.1, y: 1, w: 1.4, h: 1.4 },
    { id: 'n0', look: text('tell'), x: 1.1, y: 3.7, w: 2.2, h: 0.8 },
    { id: 'n1', look: text('ask'), x: 3.9, y: 3.7, w: 2.2, h: 0.8 },
    { id: 'n2', look: text('shout'), x: 6.7, y: 3.7, w: 2.2, h: 0.8 },
  ]);
  const first = turnQuestion('E-1-C3', 1, (f) => str(f, 'base') !== 'the sun is hot' && str(f, 'base') !== 'is the sun hot');
  const second = turnQuestion('E-1-C3', 2, (f) => ['look out', 'oh no', 'we did it', 'help', 'stop'].includes(str(f, 'base')));
  return {
    parts: [
      show(moment(['Every sentence ends with a mark. Let us see which one.'], 'Every sentence ends with a mark.', tell)),
      show(moment(['This sentence tells us something: The sun is hot.'], 'The sun is hot', set(tell, tileIds('w', 4), { lit: true }))),
      show(moment(['A telling sentence ends with a period.'], 'The sun is hot.', fillMark(tell, 'w4', '.'))),
      show(moment(['This one asks something: Is the sun hot?'], 'Is the sun hot', set(ask, tileIds('w', 4), { lit: true }))),
      show(moment(['An asking sentence ends with a question mark.'], 'Is the sun hot?', fillMark(ask, 'w4', '?'))),
      show(moment(['This one is a shout: Wow, the sun is hot!'], 'Wow, the sun is hot', set(shout, tileIds('s', 5), { lit: true }))),
      show(moment(['A shout ends with an exclamation mark.'], 'Wow, the sun is hot!', fillMark(shout, 's5', '!'))),
      show(moment(['Listen to the sentence. Does it tell, ask, or shout?'], 'tell .   ask ?   shout !', set(marks, ['m0', 'm1', 'm2'], { lit: true }))),
      turn(first, endMarkWhy(first)),
      turn(second, endMarkWhy(second)),
      show(moment(['Tell: a period. Ask: a question mark. Shout: an exclamation mark.'], '.   ?   !', marks)),
    ],
  };
}

// ---- E-1-C4 Pronouns ----

const PRONOUN_REASON: Record<string, string> = {
  he: 'That is one boy or man.',
  she: 'That is one girl or woman.',
  it: 'That is one thing or animal.',
  they: 'That is more than one.',
  we: 'That is a group with me in it.',
};

function pronounWhy(q: Question): Moment[] {
  const noun = str(q.facts, 'target');
  const entry = [...PRONOUN_ENTRIES, ...WE_ENTRIES].find((each) => each.noun === noun);
  if (!entry) throw new Error(`No pronoun entry for ${noun}`);
  const start = scene([{ id: 'n', look: text(noun), x: 2.5, y: 1, w: 5, h: 1.1 }]);
  const swapped = alter(start, (piece) => ({ ...piece, look: text(entry.pronoun), lit: true }));
  const moments = [
    moment(['Look at', noun, '.'], noun, set(start, ['n'], { lit: true })),
    moment([PRONOUN_REASON[entry.pronoun] ?? ''], PRONOUN_REASON[entry.pronoun] ?? '', set(start, ['n'], { badge: 'how many?' })),
    moment(['So', { word: entry.pronoun }, 'can take its place.'], `${noun} → ${entry.pronoun}`, swapped),
  ];
  if (str(q.facts, 'relation') === 'pronoun' && q.facts.capital === true) {
    const said = `${entry.pronoun.charAt(0).toUpperCase()}${entry.pronoun.slice(1)} ${entry.then}`;
    moments.push(moment([entry.first, said], `${entry.first} ${said}`, set(scene([lineAt('a', entry.first, 1), lineAt('b', said, 2.4)]), ['b'], { lit: true })));
  }
  return moments;
}

export function pronounsLesson(): Lesson {
  const one = tiles('a', ['Dad', 'made', 'pancakes.'], 0.4);
  const two = tiles('b', ['Dad', 'is', 'a', 'good', 'cook.'], 1.6);
  const start = scene([...one, ...two]);
  const he = alter(calm(start), (piece) => (piece.id === 'b0' ? { ...piece, look: text('He'), lit: true } : piece));
  const chart: Piece[] = [
    { id: 'p0', look: art('👦'), x: 0.8, y: 3, w: 1.2, h: 1.2 },
    { id: 'p1', look: art('👧'), x: 3.3, y: 3, w: 1.2, h: 1.2 },
    { id: 'p2', look: art('⚽'), x: 5.8, y: 3, w: 1.2, h: 1.2 },
    { id: 'p3', look: art('👫'), x: 8.1, y: 3, w: 1.2, h: 1.2 },
    { id: 'q0', look: text('he'), x: 0.65, y: 4.4, w: 1.5, h: 0.8 },
    { id: 'q1', look: text('she'), x: 3.15, y: 4.4, w: 1.5, h: 0.8 },
    { id: 'q2', look: text('it'), x: 5.65, y: 4.4, w: 1.5, h: 0.8 },
    { id: 'q3', look: text('they'), x: 7.95, y: 4.4, w: 1.5, h: 0.8 },
  ];
  const withChart = add(calm(he), chart);
  const first = turnQuestion('E-1-C4', 1, (f) => str(f, 'target') !== 'Dad' && str(f, 'target') !== 'Mom');
  const second = turnQuestion('E-1-C4', 2, (f) => str(f, 'target') !== 'Dad' && str(f, 'target') !== str(first.facts, 'target') && PRONOUN_ENTRIES.find((each) => each.noun === str(f, 'target'))?.pronoun !== PRONOUN_ENTRIES.find((each) => each.noun === str(first.facts, 'target'))?.pronoun);
  return {
    parts: [
      show(moment(['Some short words can take the place of a naming word.'], 'Words that take the place of a name', start)),
      show(moment(['Listen: Dad made pancakes. Dad is a good cook.'], 'Dad made pancakes. Dad is a good cook.', set(start, ['a0', 'b0'], { lit: true }))),
      show(moment(['We do not need to say Dad again.'], 'Dad again?', set(start, ['b0'], { lit: true, crossed: true }))),
      show(moment(['Dad is one man, so we use', { word: 'he' }, '.'], 'Dad → He', he)),
      show(moment(['Dad made pancakes. He is a good cook.'], 'Dad made pancakes. He is a good cook.', set(he, tileIds('b', 5), { lit: true }))),
      show(moment(['One boy or man:', { word: 'he' }, '. One girl or woman:', { word: 'she' }, '.'], 'he   she', set(withChart, ['p0', 'q0', 'p1', 'q1'], { lit: true }))),
      show(moment(['One thing or animal:', { word: 'it' }, '. More than one:', { word: 'they' }, '.'], 'it   they', set(withChart, ['p2', 'q2', 'p3', 'q3'], { lit: true }))),
      turn(first, pronounWhy(first)),
      turn(second, pronounWhy(second)),
      show(moment(['Ask: who is it, and how many? Then pick the word.'], 'he   she   it   they', withChart)),
    ],
  };
}

// ---- E-1-C5 One or more ----

function blankScene(prefix: string, sentence: string, y = 1.8): Scene {
  const words = sentence.split(' ');
  // The gap is laid out as a word of five letters, then drawn as an empty box.
  return scene(tiles(prefix, words.map((word) => (word === '___' ? 'xxxxx' : word)), y, 0.9).map((piece, i) => (words[i] === '___' ? { ...piece, look: { kind: 'box' } } : piece)));
}

function fillBlank(from: Scene, prefix: string, sentence: string, word: string): Scene {
  const at = `${prefix}${sentence.split(' ').indexOf('___')}`;
  return alter(calm(from), (piece) => (piece.id === at ? { ...piece, look: text(word), lit: true } : piece));
}

function agreeWhy(q: Question): Moment[] {
  const sentence = str(q.facts, 'target');
  const subject = str(q.facts, 'subject');
  const right = answerOf(q);
  const one = SUBJECTS_ONE.includes(subject);
  const start = blankScene('w', sentence);
  const subjectIds = tileIds('w', subject.split(' ').length);
  const done = sentence.replace('___', right);
  return [
    moment(['Look at who is doing it:', subject, '.'], subject, set(start, subjectIds, { lit: true })),
    moment([one ? 'That is just one.' : 'That is more than one.'], one ? 'one' : 'more than one', set(start, subjectIds, { lit: true, badge: one ? 'one' : 'more' })),
    moment(['So we say:', done], done, fillBlank(start, 'w', sentence, right)),
  ];
}

export function agreeLesson(): Lesson {
  const start = scene([{ id: 'd0', look: art('🐕'), x: 4.1, y: 0.6, w: 1.8, h: 1.8 }, { id: 'd1', look: art('🐕'), x: 4.1, y: 0.6, w: 1.8, h: 1.8, gone: true }, ...tiles('w', ['The', 'dog', 'runs.'], 3.7)]);
  const two = alter(start, (piece) => {
    if (piece.id === 'd0') return { ...piece, x: 2.6 };
    if (piece.id === 'd1') return { ...piece, x: 5.6, gone: false };
    if (piece.id === 'w1') return { ...piece, look: text('dogs') };
    if (piece.id === 'w2') return { ...piece, look: text('run.') };
    return piece;
  });
  const isAre = scene([lineAt('a', 'The dog is happy.', 1), lineAt('b', 'The dogs are happy.', 2.4)]);
  const first = turnQuestion('E-1-C5', 1, (f) => !str(f, 'target').includes('runs') && !str(f, 'target').startsWith('The dog'));
  const second = turnQuestion('E-1-C5', 2, (f) => SUBJECTS_ONE.includes(str(f, 'subject')) !== SUBJECTS_ONE.includes(str(first.facts, 'subject')));
  return {
    parts: [
      show(moment(['An action word changes for one, or for more than one.'], 'One or more', start)),
      show(moment(['One dog runs.'], 'The dog runs.', set(start, ['d0', 'w1', 'w2'], { lit: true }))),
      show(moment(['For one, the action word ends with', { letter: 's' }, '.'], 'runs ends with s', set(start, ['w2'], { lit: true, badge: '+ s' }))),
      show(moment(['Now there are two dogs. Two dogs run.'], 'The dogs run.', set(two, ['d0', 'd1', 'w1'], { lit: true }))),
      show(moment(['For more than one, the action word has no', { letter: 's' }, '.'], 'run has no s', set(two, ['w2'], { lit: true }))),
      show(moment(['Is and are work the same way. One dog is happy. Two dogs are happy.'], 'is   are', set(isAre, ['a', 'b'], { lit: true }))),
      turn(first, agreeWhy(first)),
      turn(second, agreeWhy(second)),
      show(moment(['Look at who is doing it first: one, or more than one?'], 'One or more?', calm(two))),
    ],
  };
}

// ---- E-1-C6 Capitals for days and months ----

function capitalWhy(q: Question): Moment[] {
  const right = answerOf(q);
  const words = right.split(' ');
  const when = [...DAYS, ...MONTHS].find((each) => right.includes(each)) ?? '';
  const isDay = DAYS.includes(when);
  const at = `w${words.findIndex((each) => each.startsWith(when))}`;
  const start = scene(tiles('w', words, 1.8));
  return [
    moment(['A sentence starts with a capital letter.'], `${words[0] ?? ''} starts with a capital`, set(start, ['w0'], { lit: true })),
    moment([when, isDay ? 'is a day, so it starts with a capital' : 'is a month, so it starts with a capital', { letter: when.charAt(0) }, '.'], `${when}: capital ${when.charAt(0)}`, set(start, [at], { lit: true })),
    moment(['So the right one is:', right], right, set(start, tileIds('w', words.length), { lit: true })),
  ];
}

export function capitalsLesson(): Lesson {
  const swim = scene(tiles('w', ['We', 'swim', 'on', 'monday.'], 1.6));
  const fixed = alter(calm(swim), (piece) => (piece.id === 'w3' ? { ...piece, look: text('Monday.'), lit: true } : piece));
  const birthday = scene(tiles('m', ['My', 'birthday', 'is', 'in', 'june.'], 1.6));
  const june = alter(calm(birthday), (piece) => (piece.id === 'm4' ? { ...piece, look: text('June.'), lit: true } : piece));
  const first = turnQuestion('E-1-C6', 1, (f) => !str(f, 'target').includes('Monday') && !str(f, 'target').startsWith('We swim'));
  const second = turnQuestion('E-1-C6', 2, (f) => !str(f, 'target').includes('June') && !str(f, 'target').startsWith('My birthday'));
  return {
    parts: [
      show(moment(['Days and months are names, so they start with a capital letter.'], 'Capitals for days and months', swim)),
      show(moment(['Here is a sentence: We swim on Monday.'], 'We swim on monday.', set(swim, tileIds('w', 4), { lit: true }))),
      show(moment(['Look! Monday starts with a small', { letter: 'm' }, '. That is not right.'], 'small m', set(swim, ['w3'], { lit: true, crossed: true }))),
      show(moment(['Monday is a day, so it starts with a capital', { letter: 'M' }, '.'], 'Monday', fixed)),
      show(moment(['A sentence starts with a capital letter too, like We.'], 'We', set(calm(fixed), ['w0'], { lit: true }))),
      show(moment(['Months are names too. My birthday is in June.'], 'My birthday is in june.', set(birthday, ['m4'], { lit: true, crossed: true }))),
      show(moment(['June is a month, so it starts with a capital', { letter: 'J' }, '.'], 'June', june)),
      turn(first, capitalWhy(first)),
      turn(second, capitalWhy(second)),
      show(moment(['Days, months, and the first word of a sentence get a capital letter.'], 'Monday   June', calm(june))),
    ],
  };
}

// ---- E-1-C7 Common and proper nouns ----

function properWhy(q: Question): Moment[] {
  const options = optionsOf(q);
  const right = answerOf(q);
  const start = scene(tiles('o', options, 1.8, 1));
  const at = `o${options.indexOf(right)}`;
  const others = options.map((_, i) => `o${i}`).filter((id) => id !== at);
  return [
    moment(['Which one is the name of one special person, place or pet?'], options.join('   '), start),
    moment(['The other words could be any one at all.'], 'any one', set(start, others, { dim: true })),
    moment([right, 'is a special name, and it starts with a capital letter.'], `${right} is a proper noun`, set(set(start, others, { dim: true }), [at], { lit: true })),
  ];
}

export function properNounsLesson(): Lesson {
  const start = scene([
    { id: 'a0', look: art('🐕'), x: 1.5, y: 0.5, w: 1.6, h: 1.6 },
    { id: 'a1', look: art('🐕'), x: 4.2, y: 0.5, w: 1.6, h: 1.6 },
    { id: 'a2', look: art('🐕'), x: 6.9, y: 0.5, w: 1.6, h: 1.6 },
    { id: 'dog', look: text('dog'), x: 2, y: 3.7, w: 2.2, h: 0.9 },
    { id: 'rex', look: text('Rex'), x: 5.8, y: 3.7, w: 2.2, h: 0.9, gone: true },
  ]);
  const anyDog = set(start, ['a0', 'a1', 'a2', 'dog'], { lit: true });
  const rex = set(set(start, ['a0', 'a2', 'dog'], { dim: true }), ['a1', 'rex'], { lit: true, gone: false });
  const rexBadge = set(rex, ['a1'], { badge: 'Rex' });
  const place = scene([
    { id: 'a1', look: art('🏙️'), x: 4.2, y: 0.5, w: 1.6, h: 1.6 },
    { id: 'dog', look: text('city'), x: 2, y: 3.7, w: 2.2, h: 0.9 },
    { id: 'rex', look: text('Ohio'), x: 5.8, y: 3.7, w: 2.2, h: 0.9 },
  ]);
  const first = turnQuestion('E-1-C7', 1, (f) => str(f, 'target') !== 'Rex' && str(f, 'target') !== 'Ohio');
  const second = turnQuestion('E-1-C7', 1, (f) => !['Rex', 'Ohio', str(first.facts, 'target')].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['A noun names a person, a place, or a thing.'], 'Nouns', start)),
      show(moment(['The word', { word: 'dog' }, 'could be any dog at all.'], 'dog: any dog', anyDog)),
      show(moment(['Rex is the name of one special dog.'], 'Rex: one special dog', rexBadge)),
      show(moment(['Dog is a common noun. Rex is a proper noun.'], 'common: dog   proper: Rex', set(calm(rex), ['dog', 'rex'], { lit: true }))),
      show(moment(['A proper noun starts with a capital letter, like', { letter: 'R' }, 'in Rex.'], 'Rex starts with a capital R', set(calm(rex), ['rex'], { lit: true, badge: 'R' }))),
      show(moment(['A place can have a special name too. City could be any city. Ohio is one place.'], 'city   Ohio', set(place, ['rex'], { lit: true }))),
      turn(first, properWhy(first)),
      turn(second, properWhy(second)),
      show(moment(['A special name is a proper noun, with a capital letter.'], 'common: any one   proper: a special name', calm(place))),
    ],
  };
}

// ---- E-1-C8 Question words ----

const ASK_TELLS: Record<string, string> = {
  Who: 'That tells us a person.',
  What: 'That tells us a thing.',
  Where: 'That tells us a place.',
  When: 'That tells us a time.',
  Why: 'That tells us a reason.',
};
const ASK_RULE: Record<string, string> = {
  Who: 'Who asks about a person.',
  What: 'What asks about a thing.',
  Where: 'Where asks about a place.',
  When: 'When asks about a time.',
  Why: 'Why asks for a reason.',
};

function askScene(question: string, answer: string): Scene {
  return add(blankScene('q', question, 0.3), [lineAt('ans', answer, 1.5, 0.65)]);
}

function questionWhy(q: Question): Moment[] {
  const question = str(q.facts, 'target');
  const entry = QUESTIONS.find((each) => each.question === question);
  if (!entry) throw new Error(`No question ${question}`);
  const start = askScene(entry.question, entry.answer);
  return [
    moment(['The answer is:', entry.answer], entry.answer, set(start, ['ans'], { lit: true })),
    moment([ASK_TELLS[entry.word] ?? ''], ASK_TELLS[entry.word] ?? '', set(start, ['ans'], { badge: entry.word === 'Where' ? 'place' : entry.word === 'When' ? 'time' : entry.word === 'Who' ? 'person' : entry.word === 'Why' ? 'reason' : 'thing' })),
    moment([`${ASK_RULE[entry.word] ?? ''} So the word is ${entry.word}.`], `${entry.word}: ${entry.question.replace('___ ', `${entry.word} `)}`, fillBlank(start, 'q', entry.question, entry.word)),
  ];
}

export function questionWordsLesson(): Lesson {
  const words = ['Who', 'What', 'Where', 'When', 'Why'];
  const pics = ['🧒', '📦', '🏠', '⏰', '💭'];
  const chart: Piece[] = [...pics.map((emoji, i) => ({ id: `p${i}`, look: art(emoji), x: 0.5 + i * 1.9, y: 2.7, w: 1, h: 1 })), ...words.map((word, i) => ({ id: `c${i}`, look: text(word), x: 0.1 + i * 1.9, y: 3.85, w: 1.8, h: 0.7 }))];
  const chartOnly = scene(chart);
  const example = add(chartOnly, askScene('___ is the cat?', 'The cat is under the bed.').pieces);
  const filled = set(fillBlank(example, 'q', '___ is the cat?', 'Where'), ['c2', 'p2'], { lit: true });
  const first = turnQuestion('E-1-C8', 1, (f) => str(f, 'target') !== '___ is the cat?');
  const second = turnQuestion('E-1-C8', 2, (f) => QUESTIONS.find((each) => each.question === str(f, 'target'))?.word === 'When');
  return {
    parts: [
      show(moment(['Question words start a question: who, what, where, when, and why.'], 'Who? What? Where? When? Why?', chartOnly)),
      show(moment(['Who asks about a person. What asks about a thing.'], 'Who: a person   What: a thing', set(chartOnly, ['p0', 'c0', 'p1', 'c1'], { lit: true }))),
      show(moment(['Where asks about a place. When asks about a time.'], 'Where: a place   When: a time', set(chartOnly, ['p2', 'c2', 'p3', 'c3'], { lit: true }))),
      show(moment(['Why asks for a reason.'], 'Why: a reason', set(chartOnly, ['p4', 'c4'], { lit: true }))),
      show(moment(['Here is a question with its first word missing.'], '___ is the cat?', set(example, ['q0'], { lit: true }))),
      show(moment(['The answer is: The cat is under the bed.'], 'The cat is under the bed.', set(example, ['ans'], { lit: true }))),
      show(moment(['Under the bed is a place.'], 'a place', set(example, ['ans', 'p2'], { lit: true }))),
      show(moment(['So the question is: Where is the cat?'], 'Where is the cat?', filled)),
      turn(first, questionWhy(first)),
      turn(second, questionWhy(second)),
      show(moment(['Look at the answer to find the question word.'], 'Who? What? Where? When? Why?', calm(filled))),
    ],
  };
}

// ---- E-1-C9 Joining words: and, but, or ----

const JOIN_REASON: Record<string, string> = {
  and: 'The two go together.',
  but: 'The two ideas are different.',
  or: 'It gives a choice.',
};
const JOIN_RULE: Record<string, string> = {
  and: 'And joins things that go together.',
  but: 'But joins two ideas that are different.',
  or: 'Or gives a choice.',
};

const joinWord = (sentence: string): string | undefined => JOINING.find((each) => each.sentence === sentence)?.word;

function joiningWhy(q: Question): Moment[] {
  const sentence = str(q.facts, 'target');
  const right = answerOf(q);
  const start = blankScene('w', sentence);
  const done = sentence.replace('___', right);
  return [
    moment(['Listen:', blank(sentence)], sentence, set(start, tileIds('w', sentence.split(' ').length), { lit: true })),
    moment([JOIN_REASON[right] ?? '', JOIN_RULE[right] ?? ''], JOIN_RULE[right] ?? '', start),
    moment(['So we say:', done], done, fillBlank(start, 'w', sentence, right)),
  ];
}

export function joiningLesson(): Lesson {
  const intro = scene(tiles('j', ['and', 'but', 'or'], 1.6, 1.2));
  const home = 'Mom ___ Dad are at home.';
  const cold = 'The sun is out, ___ it is cold.';
  const hot = 'Is it hot ___ cold?';
  const first = turnQuestion('E-1-C9', 1, (f) => str(f, 'target') !== cold && joinWord(str(f, 'target')) === 'but');
  const second = turnQuestion('E-1-C9', 2, (f) => str(f, 'target') !== hot && joinWord(str(f, 'target')) === 'or');
  return {
    parts: [
      show(moment(['And, but, and or are joining words. They join words and ideas.'], 'and   but   or', set(intro, tileIds('j', 3), { lit: true }))),
      show(moment(['Listen: Mom and Dad are at home.'], 'Mom and Dad are at home.', set(fillBlank(blankScene('w', home), 'w', home, 'and'), ['w0', 'w2'], { lit: true }))),
      show(moment(['And joins things that go together. Mom and Dad are both at home.'], 'and: together', fillBlank(blankScene('w', home), 'w', home, 'and'))),
      show(moment(['Listen: The sun is out, but it is cold.'], 'The sun is out, but it is cold.', calm(fillBlank(blankScene('w', cold), 'w', cold, 'but')))),
      show(moment(['But joins two ideas that are different. Sun, but cold!'], 'but: different', fillBlank(blankScene('w', cold), 'w', cold, 'but'))),
      show(moment(['Listen: Is it hot or cold?'], 'Is it hot or cold?', calm(fillBlank(blankScene('w', hot), 'w', hot, 'or')))),
      show(moment(['Or gives a choice. Is it hot? Is it cold? Pick one.'], 'or: a choice', fillBlank(blankScene('w', hot), 'w', hot, 'or'))),
      turn(first, joiningWhy(first)),
      turn(second, joiningWhy(second)),
      show(moment(['And: together. But: different. Or: a choice.'], 'and   but   or', calm(intro))),
    ],
  };
}

// ---- E-1-D1 Read a short story ----

export function readStoryLesson(): Lesson {
  const story = ['Sam has a red hat.', 'The hat is too big.', 'Sam gives the hat to Max.'];
  const start = scene([...lines('l', story), { ...lineAt('ask', 'Who gets the hat?', 3.4), gone: true }, { id: 'ans', look: text('Max'), x: 4, y: 4.5, w: 2, h: 0.9, gone: true }]);
  const asked = set(start, ['ask'], { gone: false, lit: true });
  const found = set(set(calm(asked), ['ask'], { gone: false }), ['l2'], { lit: true });
  const answered = set(found, ['ans'], { gone: false, lit: true });
  const first = turnQuestion('E-1-D1', 1, (f) => !str(f, 'id').startsWith('story01'));
  const second = turnQuestion('E-1-D1', 2, (f) => !str(f, 'id').startsWith('story01') && str(f, 'id').slice(0, 7) !== str(first.facts, 'id').slice(0, 7));
  return {
    parts: [
      show(moment(['To answer a question about a story, we look back at the story.'], 'Look back at the story.', start)),
      show(moment(['First, read the story.'], 'Read the story.', set(start, ['l0', 'l1', 'l2'], { lit: true }))),
      show(moment(['Then read the question: Who gets the hat?'], 'Who gets the hat?', asked)),
      show(moment(['Look back. Which sentence tells who gets the hat?'], 'Look back.', pointed(set(calm(asked), ['ask'], { gone: false }), 'l2'))),
      show(moment(['The story says: Sam gives the hat to Max.'], 'Sam gives the hat to Max.', pointed(found, 'l2'))),
      show(moment(['So Max gets the hat.'], 'Max', withoutHand(pointed(answered, 'l2')))),
      show(moment(['The answer is in the story. Look back to find it.'], 'The answer is in the story.', calm(withoutHand(pointed(answered, 'l2'))))),
      turn(first, readingWhy(first)),
      turn(second, readingWhy(second)),
      show(moment(['Read the story, read the question, then look back.'], 'Read, ask, look back.', calm(start))),
    ],
  };
}

// D.1's own explanation names the sentence that answers.
function readingWhy(q: Question): Moment[] {
  const story = sentencesOf(stimulusOf(q));
  const because = q.explanation.visual?.kind === 'text' ? q.explanation.visual.value : '';
  const at = story.indexOf(because);
  return lookBackWhy(q, at >= 0 ? at : null);
}

// ---- E-1-D2 Characters and setting ----

export function charactersLesson(): Lesson {
  const tom = G1_STORIES[0];
  if (!tom) throw new Error('No story');
  const story = sentencesOf(tom.text);
  const start = scene([
    ...lines('l', story),
    { id: 'tom', look: art('👦'), x: 1, y: 3.4, w: 1.5, h: 1.5, gone: true },
    { id: 'dog', look: art('🐕'), x: 3, y: 3.4, w: 1.5, h: 1.5, gone: true },
    { id: 'park', look: art('🏞️'), x: 6.8, y: 3.4, w: 1.6, h: 1.6, gone: true },
  ]);
  const people = set(start, ['tom', 'dog'], { gone: false, lit: true });
  const both = set(people, ['l0', 'l2'], { lit: true });
  const place = set(set(calm(people), ['park'], { gone: false, lit: true }), ['l1'], { lit: true });
  const first = turnQuestion('E-1-D2', 1, (f) => !str(f, 'id').startsWith('g1s1'));
  const second = turnQuestion('E-1-D2', 2, (f) => !str(f, 'id').startsWith('g1s1') && str(f, 'id').split('-')[0] !== str(first.facts, 'id').split('-')[0]);
  return {
    parts: [
      show(moment(['Characters are the people or animals in a story.'], 'Characters: who is in it', start)),
      show(moment(['Tom has a red ball. His dog runs after it.'], 'Tom and his dog', set(start, ['l0', 'l2'], { lit: true }))),
      show(moment(['So Tom and his dog are the characters.'], 'The characters: Tom and his dog', both)),
      show(moment(['The setting is where the story happens.'], 'Setting: where it happens', calm(people))),
      show(moment(['He kicks it to the park. So the park is the setting.'], 'The setting: the park', place)),
      show(moment(['Who is in it? Where is it? Look back at the story to find out.'], 'Who? Where?', calm(place))),
      turn(first, lookBackWhy(first, null)),
      turn(second, lookBackWhy(second, null)),
      show(moment(['Characters are who. The setting is where.'], 'who: characters   where: setting', calm(place))),
    ],
  };
}

// ---- E-1-D3 Retell in order ----

function lastWhy(q: Question): Moment[] {
  const story = sentencesOf(stimulusOf(q));
  const answer = answerOf(q);
  const at = bestSentence(story, answer, true);
  const start = scene(lines('l', story, 1.4, 8.4));
  const found = set(start, [`l${at}`], { lit: true });
  return [
    moment(['The question asks what happened last.'], 'What happened last?', start),
    moment(['Look at the end of the story:', story[at] ?? ''], story[at] ?? '', found),
    moment(['So what happened last is:', answer], answer, set(found, [`l${at}`], { badge: 'last' })),
  ];
}

export function retellLesson(): Lesson {
  const ben = G1_STORIES[2];
  if (!ben) throw new Error('No story');
  const story = sentencesOf(ben.text);
  const marks: Piece[] = ['first', 'next', 'last'].map((word, i) => ({ id: `m${i}`, look: text(word), x: 0.1, y: 0.2 + i * 0.75, w: 1.2, h: 0.55, gone: true }));
  const start = scene([...lines('l', story, 1.4, 8.4), ...marks]);
  const firstStep = set(set(start, ['m0'], { gone: false, lit: true }), ['l0'], { lit: true });
  const nextStep = set(set(calm(firstStep), ['m1'], { gone: false, lit: true }), ['l1'], { lit: true });
  const lastStep = set(set(calm(nextStep), ['m2'], { gone: false, lit: true }), ['l2'], { lit: true });
  const all = calm(lastStep);
  const first = turnQuestion('E-1-D3', 2, (f) => !str(f, 'id').startsWith('g1s3'));
  const second = turnQuestion('E-1-D3', 2, (f) => !str(f, 'id').startsWith('g1s3') && str(f, 'id') !== str(first.facts, 'id'));
  return {
    parts: [
      show(moment(['To retell a story, we say what happened first, next, and last.'], 'First, next, last', start)),
      show(moment(['First, Ben feeds the hens.'], 'First: Ben feeds the hens.', firstStep)),
      show(moment(['Next, he milks the cow.'], 'Next: he milks the cow.', nextStep)),
      show(moment(['Last, he gets eggs for lunch.'], 'Last: he gets eggs for lunch.', lastStep)),
      show(moment(['The story tells things in order, from the top down.'], 'In order, from the top', set(all, ['l0', 'l1', 'l2', 'l3'], { lit: true }))),
      show(moment(['What happened last is near the end of the story.'], 'Last is near the end.', set(all, ['m2', 'l2'], { lit: true }))),
      turn(first, lastWhy(first)),
      turn(second, lastWhy(second)),
      show(moment(['First, next, last. Retell it in order.'], 'First, next, last', all)),
    ],
  };
}

// ---- E-1-D4 True or false ----

function truthWhy(q: Question): Moment[] {
  const story = sentencesOf(stimulusOf(q));
  const answer = answerOf(q);
  if (str(q.facts, 'id').includes('-tf-')) {
    const read = q.facts.read as unknown[];
    const statement = typeof read[1] === 'string' ? read[1] : '';
    const because = q.explanation.visual?.kind === 'text' ? q.explanation.visual.value : '';
    const at = bestSentence(story, because);
    const start = scene([...lines('l', story), lineAt('st', statement, 3.6)]);
    const isTrue = answer.startsWith('Yes');
    return [
      moment(['Is this true?', statement], statement, set(start, ['st'], { lit: true })),
      moment(['The story says:', story[at] ?? ''], story[at] ?? '', set(start, [`l${at}`], { lit: true })),
      moment([isTrue ? 'That is what the story says. So: Yes, true.' : 'That is not what the story says. So: No, not true.'], answer, set(set(start, [`l${at}`], { lit: true }), ['st'], isTrue ? { lit: true, badge: 'true' } : { crossed: true })),
    ];
  }
  const at = bestSentence(story, answer);
  const start = scene(lines('l', story));
  return [
    moment(['Which sentence is true? Check each one with the story.'], 'Which one is true?', start),
    moment(['The story says:', story[at] ?? ''], story[at] ?? '', set(start, [`l${at}`], { lit: true })),
    moment(['So the true sentence is:', answer], answer, add(set(start, [`l${at}`], { lit: true }), [{ ...lineAt('ans', answer, 3.8), lit: true }])),
  ];
}

export function trueFalseLesson(): Lesson {
  const tom = G1_STORIES[0];
  if (!tom) throw new Error('No story');
  const story = sentencesOf(tom.text);
  const start = scene([...lines('l', story), { ...lineAt('st', 'Tom has a red ball.', 3.6), gone: true }]);
  const red = set(start, ['st'], { gone: false, lit: true });
  const same = set(red, ['l0'], { lit: true });
  const blue = alter(calm(same), (piece) => (piece.id === 'st' ? { ...piece, look: text('Tom has a blue ball.'), lit: true } : piece));
  const notSame = set(set(blue, ['l0'], { lit: true }), ['st'], { lit: false, crossed: true });
  const first = turnQuestion('E-1-D4', 1, (f) => !str(f, 'id').startsWith('g1s1') && !str(f, 'id').includes('-truth'));
  const second = turnQuestion('E-1-D4', 2, (f) => !str(f, 'id').startsWith('g1s1') && str(f, 'id').split('-')[0] !== str(first.facts, 'id').split('-')[0]);
  return {
    parts: [
      show(moment(['A sentence is true when the story says so.'], 'True: the story says so.', start)),
      show(moment(['Is this true? Tom has a red ball.'], 'Tom has a red ball.', red)),
      show(moment(['Look back. The story says: Tom has a red ball.'], 'The story says: Tom has a red ball.', set(same, ['st'], { lit: true }))),
      show(moment(['That is the same, so yes, it is true.'], 'Yes, true', set(same, ['st'], { badge: 'true' }))),
      show(moment(['Is this one true? Tom has a blue ball.'], 'Tom has a blue ball.', blue)),
      show(moment(['The story says the ball is red, not blue. So no, it is not true.'], 'No, not true', notSame)),
      show(moment(['Always check the story before you answer.'], 'Check the story.', calm(notSame))),
      turn(first, truthWhy(first)),
      turn(second, truthWhy(second)),
      show(moment(['True means the story says so. Look back and check.'], 'Look back and check.', calm(start))),
    ],
  };
}

// ---- E-1-D5 Fact texts ----

function topicWhy(q: Question): Moment[] {
  const text0 = sentencesOf(stimulusOf(q));
  const topic = answerOf(q);
  const start = scene(lines('l', text0));
  const all = tileIds('l', text0.length);
  return [
    moment(['Look at each sentence. What is it about?'], 'What is each sentence about?', start),
    moment([`Every sentence tells about ${topic}.`], topic, set(start, all, { lit: true, badge: topic })),
    moment([`So the main topic is ${topic}.`], `Main topic: ${topic}`, add(set(start, all, { lit: true }), [{ ...lineAt('ans', topic, 3.8, 0.9), lit: true }])),
  ];
}

export function factTextLesson(): Lesson {
  const apples = G1_FACTS[0];
  if (!apples) throw new Error('No fact text');
  const facts = sentencesOf(apples.text);
  const start = scene([...lines('l', facts), { id: 'pic', look: art('🍎'), x: 1.2, y: 3.4, w: 1.6, h: 1.6, gone: true }, { id: 'topic', look: text('apples'), x: 4, y: 3.8, w: 3, h: 0.9, gone: true }]);
  const one = set(start, ['l0'], { lit: true });
  const two = set(start, ['l0', 'l1'], { lit: true });
  const three = set(start, ['l0', 'l1', 'l2'], { lit: true });
  const topic = set(three, ['pic', 'topic'], { gone: false, lit: true });
  const first = turnQuestion('E-1-D5', 1, (f) => !str(f, 'id').startsWith('g1f1'));
  const second = turnQuestion('E-1-D5', 2, (f) => !str(f, 'id').startsWith('g1f1') && str(f, 'id').split('-')[0] !== str(first.facts, 'id').split('-')[0]);
  return {
    parts: [
      show(moment(['A fact text teaches true things about one main topic.'], 'The main topic', start)),
      show(moment(['The first sentence tells about apples.'], 'Apples grow on trees.', pointed(one, 'l0'))),
      show(moment(['The next sentence tells about apples too.'], 'They can be red, green or yellow.', pointed(two, 'l1'))),
      show(moment(['And so does the last one.'], 'You can eat them or make juice.', pointed(three, 'l2'))),
      show(moment(['Every sentence is about apples, so the main topic is apples.'], 'Main topic: apples', withoutHand(pointed(topic, 'l2')))),
      show(moment(['Some questions ask for one fact. Find the sentence that tells it.'], 'Find the fact.', calm(withoutHand(pointed(topic, 'l2'))))),
      turn(first, topicWhy(first)),
      turn(second, lookBackWhy(second, null, 'The text says:')),
      show(moment(['Main topic: what it is all about. Facts: look back to find them.'], 'Main topic, then facts', calm(start))),
    ],
  };
}

// ---- E-1-D6 Story or facts ----

function storyOrFactsWhy(q: Question): Moment[] {
  const answer = answerOf(q);
  if (str(q.facts, 'relation') === 'storyOrFact') {
    const start = scene(lines('l', sentencesOf(stimulusOf(q))));
    const isStory = answer === 'It tells a story.';
    return [
      moment(['Is someone doing things, or does it tell true things?'], 'A story, or facts?', start),
      moment([isStory ? 'There is a character, and things happen.' : 'It tells true things about the world.'], isStory ? 'a character, and things happen' : 'true things about the world', set(start, tileIds('l', 4), { lit: true })),
      moment(['So:', answer], answer, add(set(start, tileIds('l', 4), { lit: true }), [{ ...lineAt('ans', answer, 3.8), lit: true }])),
    ];
  }
  const options = optionsOf(q);
  const at = options.indexOf(answer);
  const start = scene(lines('o', options, 0.2, 9.6, 1));
  const others = options.map((_, i) => `o${i}`).filter((id) => id !== `o${at}`);
  return [
    moment(['Which one tells a true thing about the world?'], 'Which is a fact?', start),
    moment(['The others tell about characters in a story.'], 'story sentences', set(start, others, { dim: true })),
    moment([answer, 'That is a fact, so it is from a fact book.'], answer, set(set(start, others, { dim: true }), [`o${at}`], { lit: true })),
  ];
}

export function storyOrFactsLesson(): Lesson {
  const pip = STORY_TEXTS[0];
  const frogs = FACT_TEXTS[0];
  if (!pip || !frogs) throw new Error('No texts');
  const start = scene([...lines('l', sentencesOf(pip.text)), { id: 'pic', look: art('🐶'), x: 4.2, y: 3.3, w: 1.6, h: 1.6 }]);
  const factScene = alter(calm(start), (piece) => {
    const i = Number(piece.id.slice(1));
    if (piece.id === 'pic') return { ...piece, look: art('🐸') };
    return { ...piece, look: text(sentencesOf(frogs.text)[i] ?? '') };
  });
  const first = turnQuestion('E-1-D6', 1, (f) => str(f, 'target') !== pip.id && str(f, 'target') !== frogs.id);
  const second = turnQuestion('E-1-D6', 2);
  return {
    parts: [
      show(moment(['Some texts tell a story. Some texts give facts.'], 'A story, or facts?', calm(start))),
      show(moment(['Here, Pip the pup lost his bone, and he looks for it.'], 'Pip the pup lost his bone.', set(start, ['l0', 'l1', 'l2'], { lit: true }))),
      show(moment(['Pip is a character, and things happen to him. So it tells a story.'], 'It tells a story.', set(start, ['pic'], { lit: true, badge: 'story' }))),
      show(moment(['Now read this: Frogs live near water. They eat bugs.'], 'Frogs live near water.', set(factScene, ['l0', 'l1', 'l2'], { lit: true }))),
      show(moment(['These are true things about frogs. So it gives facts.'], 'It gives facts.', set(factScene, ['pic'], { lit: true, badge: 'facts' }))),
      show(moment(['Ask: is a character doing things, or am I learning true things?'], 'Characters, or true things?', calm(factScene))),
      turn(first, storyOrFactsWhy(first)),
      turn(second, storyOrFactsWhy(second)),
      show(moment(['Characters and what happens: a story. True things about the world: facts.'], 'story   facts', calm(start))),
    ],
  };
}

// ---- E-1-D7 Who is telling the story ----

function tellerWhy(q: Question): Moment[] {
  const story = sentencesOf(stimulusOf(q));
  const answer = answerOf(q);
  const start = scene(lines('l', story));
  const withI = story.map((sentence, i) => (/\b(I|My|my|me)\b/.test(sentence) ? `l${i}` : '')).filter((id) => id !== '');
  if (str(q.facts, 'relation') === 'teller') {
    return [
      moment(['Look for the word I.'], 'Look for I.', set(start, withI, { lit: true })),
      moment(['The one telling the story says I. Here, I is', `${answer}.`], `I is ${answer}`, set(start, ['l0'], { lit: true })),
      moment(['So the story is told by', `${answer}.`], answer, add(set(start, ['l0'], { lit: true }), [{ ...lineAt('ans', answer, 3.8, 0.9), lit: true }])),
    ];
  }
  const inside = answer === 'A character in the story';
  return [
    moment(['Look for the word I, or me, or my.'], 'I?  me?  my?', set(start, withI, { lit: true })),
    moment([inside ? 'This story says I, so a character in it is telling it.' : 'This story never says I, so someone outside it is telling it.'], inside ? 'It says I.' : 'No I.', set(start, inside ? withI : tileIds('l', story.length), inside ? { lit: true } : { dim: true })),
    moment(['The answer is:', `${answer}.`], answer, add(start, [{ ...lineAt('ans', answer, 3.8), lit: true }])),
  ];
}

export function tellerLesson(): Lesson {
  const frog = TOLD_BY_ME[0];
  const other = TOLD_BY_OTHER[0];
  if (!frog || !other) throw new Error('No texts');
  const mine = sentencesOf(frog.text);
  const outside = sentencesOf(other.text);
  const start = scene([...lines('l', mine), { id: 'pic', look: art('🐸'), x: 4.2, y: 3.3, w: 1.6, h: 1.6 }]);
  const told = alter(calm(start), (piece) => (piece.id === 'pic' ? piece : { ...piece, look: text(outside[Number(piece.id.slice(1))] ?? '') }));
  const first = turnQuestion('E-1-D7', 1, (f) => str(f, 'target') !== frog.id);
  const second = turnQuestion('E-1-D7', 2, (f) => str(f, 'target').startsWith('to') && str(f, 'target') !== other.id);
  return {
    parts: [
      show(moment(['Someone tells every story. Look for the word I.'], 'Who is telling it?', calm(start))),
      show(moment(['I am a little frog. I sit on a log all day.'], 'I am a little frog.', set(start, ['l0', 'l1'], { lit: true }))),
      show(moment(['The frog says I, so the frog is telling the story.'], 'The frog says I.', set(start, ['pic'], { lit: true, badge: 'I' }))),
      show(moment(['Now read this one: A frog sat on a log. A fly came by.'], 'A frog sat on a log.', set(told, ['l0', 'l1', 'l2'], { lit: true }))),
      show(moment(['This story never says I. Someone outside the story is telling it.'], 'No I: someone outside tells it.', set(told, ['l0', 'l1', 'l2'], { dim: true }))),
      turn(first, tellerWhy(first)),
      turn(second, tellerWhy(second)),
      show(moment(['I in the story: a character tells it. No I: someone outside tells it.'], 'I: a character   no I: someone outside', calm(start))),
    ],
  };
}

// ---- E-1-D8 Feelings in a story ----

const FEELING_PIC: Record<string, string> = { happy: '😄', sad: '😢', scared: '😨', angry: '😠', tired: '😴' };

function feelingWhy(q: Question): Moment[] {
  if (str(q.facts, 'relation') === 'feeling') {
    const entry = FEELING_TEXTS.find((each) => each.id === str(q.facts, 'target'));
    if (!entry) throw new Error('No feeling text');
    const story = sentencesOf(entry.text);
    const at = Math.max(0, story.indexOf(entry.clue));
    const start = scene([...lines('l', story), { id: 'pic', look: art(FEELING_PIC[entry.feeling] ?? ''), x: 1, y: 3.3, w: 1.6, h: 1.6, gone: true }, { id: 'ans', look: text(entry.feeling), x: 3.5, y: 3.7, w: 3, h: 0.9, gone: true }]);
    return [
      moment(['Look at what', entry.who, 'does.'], `What does ${entry.who} do?`, start),
      moment([entry.clue], entry.clue, set(start, [`l${at}`], { lit: true })),
      moment(['That shows', entry.who, 'is', `${entry.feeling}.`], entry.feeling, set(set(start, [`l${at}`], { lit: true }), ['pic', 'ans'], { gone: false, lit: true })),
    ];
  }
  const feeling = str(q.facts, 'target');
  const options = optionsOf(q);
  const answer = answerOf(q);
  const at = options.indexOf(answer);
  const start = scene([...lines('o', options, 0.2, 9.6, 0.4), { id: 'pic', look: art(FEELING_PIC[feeling] ?? ''), x: 4.2, y: 3.4, w: 1.6, h: 1.6 }]);
  return [
    moment([`What does someone do when they are ${feeling}?`], feeling, set(start, ['pic'], { lit: true })),
    moment([answer], answer, set(start, [`o${at}`], { lit: true })),
    moment([`That is what someone does when they are ${feeling}.`], `${feeling}: ${answer}`, set(set(start, [`o${at}`], { lit: true }), ['pic'], { lit: true })),
  ];
}

export function feelingsLesson(): Lesson {
  const ana = FEELING_TEXTS[0];
  const max = FEELING_TEXTS[1];
  if (!ana || !max) throw new Error('No texts');
  const start = scene([...lines('l', sentencesOf(ana.text)), { id: 'pic', look: art('😢'), x: 1, y: 3.3, w: 1.6, h: 1.6, gone: true }, { id: 'ans', look: text('sad'), x: 3.5, y: 3.7, w: 3, h: 0.9, gone: true }]);
  const sad = set(set(start, ['l1'], { lit: true }), ['pic', 'ans'], { gone: false, lit: true });
  const maxScene = alter(calm(start), (piece) => {
    if (piece.id === 'pic') return { ...piece, look: art('😄') };
    if (piece.id === 'ans') return { ...piece, look: text('happy') };
    return { ...piece, look: text(sentencesOf(max.text)[Number(piece.id.slice(1))] ?? '') };
  });
  const happy = set(set(maxScene, ['l1'], { lit: true }), ['pic', 'ans'], { gone: false, lit: true });
  const first = turnQuestion('E-1-D8', 1, (f) => !['fe1', 'fe2'].includes(str(f, 'target')));
  const second = turnQuestion('E-1-D8', 2, (f) => str(f, 'target') !== FEELING_TEXTS.find((each) => each.id === str(first.facts, 'target'))?.feeling);
  return {
    parts: [
      show(moment(['A story may not say how a character feels. What they do shows it.'], 'What they do shows how they feel.', start)),
      show(moment(['Ana lost her kite in a tree. She cried and cried.'], 'She cried and cried.', set(start, ['l1'], { lit: true }))),
      show(moment(['Crying shows that Ana is sad.'], 'sad', sad)),
      show(moment(['Max got a puppy. He jumped up and down and laughed.'], 'He jumped up and down and laughed.', set(maxScene, ['l1'], { lit: true }))),
      show(moment(['Laughing shows that Max is happy.'], 'happy', happy)),
      show(moment(['Look at what the character does, and think how they feel.'], 'What do they do?', calm(happy))),
      turn(first, feelingWhy(first)),
      turn(second, feelingWhy(second)),
      show(moment(['Crying, laughing, yawning: what a character does shows how they feel.'], 'happy  sad  scared  angry  tired', calm(start))),
    ],
  };
}

// Lessons that teach (plan section 16), written in the rich look's style. Filled in skill by skill.
export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'E-1-C1': namingActionLesson,
  'E-1-C2': describingLesson,
  'E-1-C3': endMarksLesson,
  'E-1-C4': pronounsLesson,
  'E-1-C5': agreeLesson,
  'E-1-C6': capitalsLesson,
  'E-1-C7': properNounsLesson,
  'E-1-C8': questionWordsLesson,
  'E-1-C9': joiningLesson,
  'E-1-D1': readStoryLesson,
  'E-1-D2': charactersLesson,
  'E-1-D3': retellLesson,
  'E-1-D4': trueFalseLesson,
  'E-1-D5': factTextLesson,
  'E-1-D6': storyOrFactsLesson,
  'E-1-D7': tellerLesson,
  'E-1-D8': feelingsLesson,
};
