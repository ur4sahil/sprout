import { K_FACTS, K_STORIES } from '../../content/banks/comprehension';
import type { WordGroup } from '../../content/data/categories';
import { GROUP_WORDS } from '../../content/data/categories';
import { COUNTABLES } from '../../content/data/countables';
import type { Answer, Sequence } from '../../content/data/h3-stories';
import { ANSWERS, ASKS_ABOUT, REAL_SENTENCES, SEQUENCES, WHO_SENTENCES } from '../../content/data/h3-stories';
import { ACTIONS } from '../../content/data/h3-words';
import { SENTENCE_PICTURES } from '../../content/data/sentencePictures';
import type { Question, Say, SayPart, Visual } from '../../engine/types';
import { add, alter, art, calm, countAlong, moment, num, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Kindergarten Language Arts lessons, part 2 (plan section 16): sight words, sentences, naming,
// one and more than one, question words, and reading. Letters are said by name and words as words.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });
const shows = (list: Moment[]): LessonPart[] => list.map(show);
const last = (list: Moment[]): Scene => list.at(-1)?.scene ?? scene([]);

function strings(facts: Record<string, unknown>, key: string): string[] {
  const value = facts[key];
  if (!Array.isArray(value) || !value.every((each) => typeof each === 'string')) throw new Error(`facts.${key} is not a list of words`);
  return value as string[];
}

function bool(facts: Record<string, unknown>, key: string): boolean {
  const value = facts[key];
  if (typeof value !== 'boolean') throw new Error(`facts.${key} is not true or false`);
  return value;
}

// The picture a question shows: the first emoji in its stimulus.
function pictureOf(visual: Visual | undefined): string {
  if (visual?.kind === 'emojiGroup') return visual.emoji;
  throw new Error('The question has no picture');
}

// A word's letters said one by one: "c, a, n".
function spelled(word: string): Say {
  return word.split('').flatMap((letter, i): SayPart[] => (i === 0 ? [{ letter }] : [',', { letter }]));
}

// ---- Laying out words ----

// A word tile's width at height h: wide enough for its letters.
const tileWidth = (word: string, h: number): number => Math.max(h * 0.8, 0.42 * h * word.length + 0.25);

// One piece per word, side by side, centred between `left` and `left + room`. Shrinks to fit.
function wordRow(prefix: string, words: readonly string[], y: number, h = 1, left = 0.2, room = 9.6): Piece[] {
  let size = h;
  const widthAt = (s: number): number => words.reduce((sum, word) => sum + tileWidth(word, s), 0) + (words.length - 1) * 0.25 * s;
  while (widthAt(size) > room && size > 0.4) size -= 0.05;
  let x = left + (room - widthAt(size)) / 2;
  return words.map((word, i) => {
    const piece: Piece = { id: `${prefix}${i}`, look: text(word), x, y, w: tileWidth(word, size), h: size };
    x += tileWidth(word, size) + 0.25 * size;
    return piece;
  });
}

// One piece per letter, from (x, y).
function letterRow(prefix: string, word: string, x: number, y: number, step = 0.7, h = 1): Piece[] {
  return word.split('').map((letter, i) => ({ id: `${prefix}${i}`, look: text(letter), x: x + i * step, y, w: step, h }));
}

const letterIds = (prefix: string, word: string): string[] => word.split('').map((_, i) => `${prefix}${i}`);

// ---- E-K-C1 to E-K-C3 Sight words ----
// The question says a word; the child taps it among two or three written words.

const STACK: Record<number, number[]> = { 2: [1, 2.8], 3: [0.3, 1.9, 3.5] };

// The words stacked one above another, each as its letters, and a big clue letter on the left, hidden.
function sightScene(words: readonly string[]): Scene {
  const rows = STACK[words.length] ?? STACK[3] ?? [];
  return scene([
    { id: 'clue', look: text(words[0]?.charAt(0) ?? 'a'), x: 0.6, y: 1.5, w: 1.6, h: 1.6, gone: true },
    ...words.flatMap((word, i) => letterRow(`s${i}l`, word, 3.4, rows[i] ?? 0)),
  ]);
}

function sightWhy(question: Question): Moment[] {
  const target = str(question.facts, 'target');
  const words = strings(question.facts, 'options');
  const first = target.charAt(0);
  const start = sightScene(words);
  const clue = alter(start, (piece) => (piece.id === 'clue' ? { ...piece, look: text(first), gone: false, lit: true } : piece));
  const sameStart = words.map((word, i) => ({ word, i })).filter((each) => each.word.charAt(0).toLowerCase() === first.toLowerCase());
  const firsts = set(clue, sameStart.map((each) => `s${each.i}l0`), { lit: true });
  const at = words.indexOf(target);
  const found = alter(calm(firsts), (piece) => {
    if (piece.id.startsWith(`s${at}l`)) return { ...piece, lit: true };
    if (piece.id === 'clue') return piece;
    return { ...piece, dim: true };
  });
  const moments = [
    moment(['Listen to the word:', { word: target }, '.'], `Find: ${target}`, start),
    moment([{ word: target }, 'starts with the letter', { letter: first }, '.'], `${target} starts with ${first}`, firsts),
  ];
  if (sameStart.length > 1) {
    const both = set(calm(firsts), sameStart.flatMap((each) => letterIds(`s${each.i}l`, each.word)), { lit: true });
    moments.push(moment(['More than one word starts with', { letter: first }, '. So we check all the letters.'], 'Check all the letters.', both));
  }
  moments.push(moment(['This word is', ...spelled(target), '. It says', { word: target }, '.'], `This word is ${target}.`, found));
  return moments;
}

interface SightExample {
  words: [string, string, string]; // the word to find first
  pair: [string, string]; // two words with the same first letter; the first is found
}

const SIGHT_EXAMPLES: Record<string, SightExample> = {
  'E-K-C1': { words: ['can', 'jump', 'here'], pair: ['help', 'here'] },
  'E-K-C2': { words: ['look', 'play', 'you'], pair: ['three', 'two'] },
  'E-K-C3': { words: ['have', 'ride', 'was'], pair: ['went', 'want'] },
};

function sightLesson(skillId: string): Lesson {
  const example = SIGHT_EXAMPLES[skillId];
  if (!example) throw new Error(`No sight word example for ${skillId}`);
  const [target] = example.words;
  const first = target.charAt(0);
  const start = sightScene(example.words);
  const clue = alter(start, (piece) => (piece.id === 'clue' ? { ...piece, gone: false, lit: true } : piece));
  const firsts = set(clue, ['s0l0', 's1l0', 's2l0'], { lit: true });
  const pointed = pointAt(set(calm(firsts), ['clue', 's0l0'], { lit: true }), { id: 's0l0', look: text(first), x: 3.4, y: 0.3, w: 0.7, h: 1 });
  const whole = set(withoutHand(pointed), letterIds('s0l', target), { lit: true });
  const said = set(whole, [...letterIds('s1l', example.words[1]), ...letterIds('s2l', example.words[2])], { dim: true });

  const [find, other] = example.pair;
  const pairStart = alter(sightScene(example.pair), (piece) => (piece.id === 'clue' ? { ...piece, gone: false, lit: true } : piece));
  const pairFirsts = set(pairStart, ['s0l0', 's1l0'], { lit: true });
  // The first letter where the two words differ.
  const differ = find.split('').findIndex((letter, i) => other.charAt(i) !== letter);
  const pairNext = set(calm(pairFirsts), [`s0l${differ}`, `s1l${differ}`], { lit: true });
  const pairFound = set(set(calm(pairNext), letterIds('s0l', find), { lit: true }), letterIds('s1l', other), { dim: true });

  // A turn never asks for a word the lesson has just found.
  const shown = [...example.words, ...example.pair];
  const longer = (f: Record<string, unknown>): boolean => str(f, 'target').length > 1 && !shown.includes(str(f, 'target'));
  const one = turnQuestion(skillId, 1, longer);
  const two = turnQuestion(skillId, 3, (f) => longer(f) && str(f, 'target') !== str(one.facts, 'target'));
  return {
    parts: [
      show(moment(['Some words are in almost every book. We learn to know them just by looking.'], 'Words we know by looking.', start)),
      show(moment(['Let us find the word', { word: target }, '.'], `Find: ${target}`, start)),
      show(moment([{ word: target }, 'starts with the letter', { letter: first }, '.'], `${target} starts with ${first}`, clue)),
      show(moment(['Look at the first letter of each word.'], 'Look at each first letter.', firsts)),
      show(moment(['Only this word starts with', { letter: first }, '.'], `Only one starts with ${first}.`, pointed)),
      show(moment(['Check the whole word:', ...spelled(target), '.'], target.split('').join(', '), whole)),
      show(moment(['It says', { word: target }, '.'], `It says ${target}.`, said)),
      show(moment(['First find the first letter. Then check the whole word.'], 'First letter, then the whole word.', calm(said))),
      turn(one, sightWhy(one)),
      show(moment(['Sometimes two words start with the same letter.'], 'Two words, one first letter.', pairFirsts)),
      show(moment(['Let us find', { word: find }, '. Both words start with', { letter: find.charAt(0) }, '.'], `Find: ${find}`, pairFirsts)),
      show(moment(['So look at the next letters.', { word: find }, 'has the letter', { letter: find.charAt(differ) }, 'here.'], `${find} has ${find.charAt(differ)}`, pairNext)),
      show(moment(['This word says', { word: find }, '.'], `This word says ${find}.`, pairFound)),
      turn(two, sightWhy(two)),
      show(moment(['Find the first letter, then check every letter.'], 'Check every letter.', calm(pairFound))),
    ],
  };
}

// ---- E-K-D1 Capitals and periods ----
// Which sentence is written correctly: a capital at the start and a period at the end.

const PERIOD = 'dot';

// A written sentence as word tiles, with its period as a tile of its own.
function sentencePieces(prefix: string, sentence: string, y: number, h = 1): Piece[] {
  const ends = sentence.endsWith('.');
  const words = (ends ? sentence.slice(0, -1) : sentence).split(' ');
  const row = wordRow(`${prefix}w`, [...words, ...(ends ? ['.'] : [])], y, h);
  return row.map((piece, i) => (ends && i === words.length ? { ...piece, id: `${prefix}${PERIOD}` } : piece));
}

function capitalsWhy(question: Question): Moment[] {
  const options = strings(question.facts, 'options');
  const right = options.find((each) => /^[A-Z]/.test(each) && each.endsWith('.')) ?? '';
  const rows = STACK[options.length] ?? [];
  const start = scene(options.flatMap((each, i) => sentencePieces(`o${i}`, each, rows[i] ?? 0, 0.9)));
  const firsts = set(start, options.map((_, i) => `o${i}w0`), { lit: true });
  const ends = set(calm(start), options.map((each, i) => (each.endsWith('.') ? `o${i}${PERIOD}` : `o${i}w${each.split(' ').length - 1}`)), { lit: true });
  const at = options.indexOf(right);
  const found = alter(calm(start), (piece) => (piece.id.startsWith(`o${at}`) ? { ...piece, lit: true } : { ...piece, dim: true }));
  return [
    moment(['Let us check each sentence.'], 'Check each sentence.', start),
    moment(['Does it start with a capital letter?'], 'A capital at the start?', firsts),
    moment(['Does it end with a period?'], 'A period at the end?', ends),
    moment(['This one has both, so it is right.', right], right, found),
  ];
}

export function capitalsLesson(): Lesson {
  const sentence = 'The dog can jump.';
  const start = scene(sentencePieces('x', sentence, 2));
  const wrong = alter(start, (piece) => (piece.id === 'xw0' ? { ...piece, look: text('the') } : piece.id === `x${PERIOD}` ? { ...piece, gone: true } : piece));
  const firstWord = set(wrong, ['xw0'], { lit: true });
  const capital = alter(calm(firstWord), (piece) => (piece.id === 'xw0' ? { ...piece, look: text('The'), lit: true } : piece));
  const withDot = set(calm(capital), [`x${PERIOD}`], { gone: false, lit: true });
  const right = set(calm(withDot), ['xw0', `x${PERIOD}`], { lit: true });
  const one = turnQuestion('E-K-D1', 1);
  const two = turnQuestion('E-K-D1', 2, (f) => str(f, 'base') !== str(one.facts, 'base'));
  return {
    parts: [
      show(moment(['A sentence has a capital letter at the start, and a period at the end.'], 'Capital at the start. Period at the end.', start)),
      show(moment(['This sentence forgot both of them.'], 'the dog can jump', wrong)),
      show(moment(['The first word needs a capital letter. A capital is a big letter.'], 'The first word needs a capital.', firstWord)),
      show(moment(['Now the first word starts with a big', { letter: 'T' }, '.'], 'The', capital)),
      show(moment(['At the end goes a period. A period is a small dot.'], 'A period is a small dot.', withDot)),
      show(moment(['Now it is written the right way.', sentence], sentence, right)),
      show(moment(['Look at the start, then look at the end.'], 'Look at the start and the end.', calm(right))),
      turn(one, capitalsWhy(one)),
      show(moment(['A sentence with no dot at the end is not finished yet.'], 'No period: not finished.', set(calm(capital), ['xw3'], { lit: true }))),
      turn(two, capitalsWhy(two)),
      show(moment(['Capital at the start, period at the end.'], 'Capital at the start, period at the end.', calm(right))),
    ],
  };
}

// ---- E-K-D3 One and more than one ----
// Pick the word that matches the picture: cat or cats. Level 2 asks which word means one, or more than one.

function countable(one: string): { emoji: string; one: string; many: string } {
  const found = COUNTABLES.find((each) => each.one === one);
  if (!found) throw new Error(`No countable called ${one}`);
  return found;
}

// `count` pictures in a row above the table, centred.
function pictures(prefix: string, emoji: string, count: number, size = 1.5): Piece[] {
  const left = 5 - (count * size) / 2;
  return Array.from({ length: 4 }, (_, i) => ({ id: `${prefix}${i}`, look: art(emoji), x: i < count ? left + i * size : 5 - size / 2, y: 0.5, w: size, h: size, gone: i >= count }));
}

// The word as letters on the table, centred, with an s tile after it, hidden.
function pluralWord(prefix: string, one: string): Piece[] {
  const step = 0.75;
  const x = 5 - ((one.length + 1) * step) / 2;
  return [...letterRow(`${prefix}l`, one, x, 3.3, step), { id: `${prefix}s`, look: text('s'), x: x + one.length * step, y: 3.3, w: step, h: 1, gone: true }];
}

function pluralWhy(question: Question): Moment[] {
  const one = str(question.facts, 'target');
  const many = bool(question.facts, 'many');
  const thing = countable(one);
  if (typeof question.facts.count !== 'number') {
    // Written only, no picture: look at how each word ends. The word asked for is said last.
    const x = 5 - ((one.length + 1) * 0.75) / 2;
    const words = scene([...letterRow('a', thing.many, x, 1.4, 0.75), ...letterRow('b', one, x, 3.2, 0.75)]);
    const ends = set(words, [`a${one.length}`], { lit: true });
    const manySaid = moment([{ word: thing.many }, 'ends with', { letter: 's' }, ', so it means more than one.'], `${thing.many}: more than one`, set(ends, letterIds('a', thing.many), { lit: true }));
    const oneSaid = moment([{ word: one }, 'has no', { letter: 's' }, 'at the end, so it means just one.'], `${one}: just one`, set(calm(words), letterIds('b', one), { lit: true }));
    return [moment(['Look at the end of each word.'], 'Look at the ends.', ends), ...(many ? [oneSaid, manySaid] : [manySaid, oneSaid])];
  }
  const count = many ? num(question.facts, 'count') : 1;
  const start = scene([...pictures('p', thing.emoji, count), ...pluralWord('w', one)]);
  const counted = set(start, Array.from({ length: count }, (_, i) => `p${i}`), { lit: true });
  if (!many) {
    return [
      moment(['Let us look at the picture.'], 'Look at the picture.', start),
      moment(['There is just one, so we do not add', { letter: 's' }, '.'], 'Just one: no s.', counted),
      moment(['The word is', { word: one }, '.'], one, set(calm(counted), letterIds('wl', one), { lit: true })),
    ];
  }
  const withS = set(set(calm(counted), letterIds('wl', one), { lit: true }), ['ws'], { gone: false, lit: true });
  return [
    moment(['Let us look at the picture.'], 'Look at the picture.', start),
    moment(['There is more than one, so we add', { letter: 's' }, '.'], 'More than one: add s.', counted),
    moment(['The word is', { word: thing.many }, '.'], thing.many, withS),
  ];
}

export function pluralLesson(): Lesson {
  const ball = countable('ball');
  const start = scene([...pictures('p', ball.emoji, 1), ...pluralWord('w', 'ball')]);
  const oneBall = set(start, ['p0', ...letterIds('wl', 'ball')], { lit: true });
  const moreBalls = set(calm(oneBall), ['p0', 'p1', 'p2'], { gone: false, lit: true });
  const added = set(calm(moreBalls), ['ws'], { gone: false, lit: true });
  const frog = countable('frog');
  const frogs = scene([...pictures('f', frog.emoji, 2), ...pluralWord('v', 'frog')]);
  const frogsS = set(frogs, ['vs'], { gone: false, lit: true });
  const one = turnQuestion('E-K-D3', 1, (f) => bool(f, 'many'));
  const two = turnQuestion('E-K-D3', 2, (f) => !bool(f, 'many') && !['ball', 'frog', str(one.facts, 'target')].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['A word can tell us if there is one thing, or more than one.'], 'One, or more than one?', start)),
      show(moment(['Here is one ball. We say', { word: 'ball' }, '.'], 'one ball', oneBall)),
      show(moment(['Now there are more balls.'], 'More balls.', moreBalls)),
      show(moment(['More than one, so we add the letter', { letter: 's' }, 'at the end.'], 'Add s for more than one.', added)),
      show(moment(['Now the word says', { word: 'balls' }, '.'], 'balls', set(calm(added), [...letterIds('wl', 'ball'), 'ws'], { lit: true }))),
      show(moment(['Just one: no', { letter: 's' }, '. More than one: add', { letter: 's' }, '.'], 'One: no s. More: add s.', calm(added))),
      turn(one, pluralWhy(one)),
      show(moment(['Look at the end of the word.', { word: 'frogs' }, 'ends with', { letter: 's' }, ', so it means more than one.'], 'frogs ends with s: more than one.', frogsS)),
      turn(two, pluralWhy(two)),
      show(moment(['An', { letter: 's' }, 'at the end means more than one.'], 's at the end means more than one.', calm(frogsS))),
    ],
  };
}

// ---- E-K-D4 Names start with a capital ----
// Which one is written the right way: a name, or a sentence with a name and the word I.

const endWith = (value: string): Say => (/[.?!]$/.test(value) ? [value] : [value, '.']);

function namesWhy(question: Question): Moment[] {
  const options = strings(question.facts, 'options');
  const right = options[question.type === 'choice' ? question.answerIndex : 0] ?? '';
  const rows = STACK[options.length] ?? [];
  const start = scene(options.map((each, i) => ({ id: `o${i}`, look: text(each), x: 5 - tileWidth(each, 1) / 2, y: rows[i] ?? 0, w: tileWidth(each, 1), h: 1 })));
  const at = options.indexOf(right);
  const found = alter(start, (piece) => (piece.id === `o${at}` ? { ...piece, lit: true } : { ...piece, dim: true }));
  const sentence = right.includes(' ');
  return [
    moment(['Let us check each one.'], 'Check each one.', start),
    moment([sentence ? 'A name and the word I always start with a capital letter.' : 'A name starts with a capital letter, and the rest are small.'], sentence ? 'Names and I start with a capital.' : 'A name starts with a capital.', set(start, options.map((_, i) => `o${i}`), { lit: true })),
    moment(['This one is written the right way:', ...endWith(right)], right, found),
  ];
}

export function namesLesson(): Lesson {
  const start = scene(letterRow('n', 'sam', 3.8, 1.5, 0.8, 1.2));
  const big = alter(start, (piece) => (piece.id === 'n0' ? { ...piece, look: text('S'), lit: true } : piece));
  const rest = set(calm(big), ['n1', 'n2'], { lit: true });
  const sentence = scene([...letterRow('n', 'Sam', 0.8, 1.5, 0.8, 1.2), ...wordRow('i', ['and', 'I', 'play.'], 1.5, 1.2, 3.6, 6)]);
  const both = set(sentence, ['n0', 'i1'], { lit: true });
  const one = turnQuestion('E-K-D4', 2);
  const two = turnQuestion('E-K-D4', 3);
  return {
    parts: [
      show(moment(['A name is a special word. It always starts with a capital letter.'], 'A name starts with a capital.', start)),
      show(moment(['This name is', { word: 'Sam' }, '. Its first letter must be big.'], 'Sam', set(start, ['n0'], { lit: true }))),
      show(moment(['So we write a big', { letter: 'S' }, '.'], 'A big S', big)),
      show(moment(['The other letters stay small.'], 'The rest stay small.', rest)),
      show(moment(['A capital in the middle of a name is not right.'], 'No capital in the middle.', alter(calm(rest), (piece) => (piece.id === 'n1' ? { ...piece, look: text('A'), crossed: true } : piece)))),
      turn(one, namesWhy(one)),
      show(moment(['The word', { letter: 'I' }, 'is always a capital too, even in the middle of a sentence.'], 'I is always a capital.', both)),
      show(moment(['Sam and I play.'], 'Sam and I play.', calm(both))),
      turn(two, namesWhy(two)),
      show(moment(['Names and the word', { letter: 'I' }, 'always start with a capital letter.'], 'Names and I: always a capital.', calm(both))),
    ],
  };
}

// ---- E-K-D5 Question words: who, what, where ----
// Level 3: a picture; which question does it answer, who, what or where.

const KINDS = ['who', 'what', 'where'] as const;
const capWord = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

function answerOf(word: string): Answer {
  const found = ANSWERS.find((each) => each.word === word);
  if (!found) throw new Error(`No answer called ${word}`);
  return found;
}

// The three question words along the top, each over its own spot on the table.
function questionScene(): Scene {
  return scene(KINDS.map((kind, i) => ({ id: `q${kind}`, look: text(capWord(kind)), x: 0.6 + i * 3.2, y: 0.3, w: 2.4, h: 1 })));
}

const article = (word: string): string => (/^[aeiou]/.test(word) ? 'An' : 'A');

function questionWhy(question: Question): Moment[] {
  const answer = answerOf(str(question.facts, 'target'));
  const start = add(questionScene(), [{ id: 'pic', look: art(answer.emoji), x: 4, y: 1.8, w: 2, h: 2 }]);
  const lit = set(start, ['pic'], { lit: true });
  const moved = alter(calm(lit), (piece) => {
    if (piece.id === `q${answer.kind}`) return { ...piece, lit: true };
    if (piece.id === 'pic') return { ...piece, x: 0.8 + KINDS.indexOf(answer.kind) * 3.2, lit: true };
    return { ...piece, dim: true };
  });
  return [
    moment(['What is in the picture?'], 'What is it?', start),
    moment([article(answer.word), { word: answer.word }, `is ${ASKS_ABOUT[answer.kind]}.`], `${article(answer.word)} ${answer.word} is ${ASKS_ABOUT[answer.kind]}.`, lit),
    moment([capWord(ASKS_ABOUT[answer.kind]), 'answers the question', { word: answer.kind }, '.'], capWord(answer.kind), moved),
  ];
}

export function questionWordsLesson(): Lesson {
  const start = questionScene();
  const examples = ['girl', 'ball', 'school'].map(answerOf);
  const placed = add(start, examples.map((each, i) => ({ id: `e${i}`, look: art(each.emoji), x: 1 + i * 3.2, y: 2, w: 1.6, h: 1.6, gone: true })));
  const step = (from: Scene, i: number): Scene => set(set(calm(from), [`e${i}`], { gone: false, lit: true }), [`q${KINDS[i] ?? 'who'}`], { lit: true });
  const who = step(placed, 0);
  const what = step(who, 1);
  const where = step(what, 2);
  const fresh = (f: Record<string, unknown>): boolean => !['girl', 'ball', 'school'].includes(str(f, 'target'));
  const one = turnQuestion('E-K-D5', 3, (f) => fresh(f) && answerOf(str(f, 'target')).kind === 'where');
  const two = turnQuestion('E-K-D5', 3, (f) => fresh(f) && answerOf(str(f, 'target')).kind === 'who');
  return {
    parts: [
      show(moment(['We ask questions with special words: who, what, and where.'], 'Who? What? Where?', start)),
      show(moment([{ word: 'Who' }, 'asks about a person. A girl is a person.'], 'Who: a person', who)),
      show(moment([{ word: 'What' }, 'asks about a thing. A ball is a thing.'], 'What: a thing', what)),
      show(moment([{ word: 'Where' }, 'asks about a place. A school is a place.'], 'Where: a place', where)),
      show(moment(['Look at the picture. Is it a person, a thing, or a place?'], 'A person, a thing, or a place?', calm(where))),
      turn(one, questionWhy(one)),
      show(moment(['A person goes with who. A thing goes with what. A place goes with where.'], 'Who, what, where', set(calm(where), ['e0', 'e1', 'e2'], { lit: true }))),
      turn(two, questionWhy(two)),
      show(moment(['Ask yourself: is it a person, a thing, or a place?'], 'Person, thing, or place?', calm(where))),
    ],
  };
}

// ---- E-K-D6 Count the words ----
// How many words are in this sentence?

function countWordsMoments(sentence: string, prefix: string): { moments: Moment[]; end: Scene } {
  const words = sentence.split(' ');
  const start = scene(wordRow(prefix, words, 2.2, 1.1));
  const counted = countAlong(start, words.map((_, i) => `${prefix}${i}`));
  const all = set(counted.end, words.map((_, i) => `${prefix}${i}`), { lit: true });
  const n = words.length;
  return {
    moments: [moment(['Let us count the words. We point to each word once.'], 'Point to each word once.', start), ...counted.moments, moment(['There are', { number: n }, 'words.'], `There are ${n} words.`, all)],
    end: all,
  };
}

function countWordsWhy(question: Question): Moment[] {
  return countWordsMoments(str(question.facts, 'target'), 'w').moments;
}

export function countWordsLesson(): Lesson {
  const sentence = 'The dog can jump.';
  const words = sentence.split(' ');
  const start = scene(wordRow('x', words, 2.2, 1.1));
  // The hand points at the first space: just after the first word.
  const firstTile = start.pieces[0];
  const gaps = firstTile ? pointAt(start, { ...firstTile, x: firstTile.x + (firstTile.w ?? 1) - 0.4, w: 0.8 }) : start;
  const counted = countWordsMoments(sentence, 'x');
  const letters = set(calm(counted.end), ['x3'], { lit: true });
  const one = turnQuestion('E-K-D6', 1);
  const two = turnQuestion('E-K-D6', 2, (f) => str(f, 'target').split(' ').length >= 4 && str(f, 'target') !== str(one.facts, 'target'));
  return {
    parts: [
      show(moment(['A sentence is made of words. We can count them.'], 'We can count the words.', start)),
      show(moment(['Look for the spaces. A space comes between each word.'], 'A space between each word.', gaps)),
      ...shows(counted.moments),
      show(moment([{ word: 'jump' }, 'has four letters, but it is just one word.'], 'jump is one word.', letters)),
      show(moment(['Count the words, not the letters.'], 'Count words, not letters.', calm(letters))),
      turn(one, countWordsWhy(one)),
      show(moment(['Point to each word as you count, from left to right.'], 'Point and count, left to right.', firstTile ? pointAt(calm(letters), firstTile) : calm(letters))),
      turn(two, countWordsWhy(two)),
      show(moment(['One number for each word. The last number tells how many.'], 'The last number tells how many.', calm(letters))),
    ],
  };
}

// ---- E-K-E5 Real or make-believe ----
// A sentence about a picture: could it really happen?

function realScene(emoji: string, sentence: string): Scene {
  const h = 0.8;
  return scene([
    { id: 'pic', look: art(emoji), x: 4, y: 0.2, w: 2, h: 2 },
    { id: 'say', look: text(sentence), x: Math.max(0.1, 5 - tileWidth(sentence, h) / 2), y: 2.3, w: Math.min(9.8, tileWidth(sentence, h)), h },
    { id: 'real', look: text('Real'), x: 1, y: 3.8, w: 3, h: 1 },
    { id: 'make', look: text('Make-believe'), x: 4.6, y: 3.8, w: 4.6, h: 1 },
  ]);
}

function realWhy(question: Question): Moment[] {
  const sentence = str(question.facts, 'target');
  const entry = REAL_SENTENCES.find((each) => each.sentence === sentence);
  if (!entry) throw new Error(`No sentence "${sentence}"`);
  const start = realScene(pictureOf(question.stimulus), sentence);
  const read = set(start, ['say'], { lit: true });
  const answer = set(calm(start), [entry.real ? 'real' : 'make'], { lit: true });
  return [
    moment(['Listen.', sentence], sentence, read),
    moment(['Could this really happen?'], 'Could it really happen?', read),
    moment(entry.real ? ['Yes, it could. So it is real.'] : ['No, it could not. So it is', { word: 'make-believe' }, '.'], entry.real ? 'Real' : 'Make-believe', answer),
  ];
}

export function realLesson(): Lesson {
  const dog = '🐶';
  const start = realScene(dog, 'A dog can run.');
  const runs = set(start, ['say'], { lit: true });
  const real = set(calm(start), ['real', 'pic'], { lit: true });
  const reads = alter(calm(real), (piece) => (piece.id === 'say' ? { ...piece, look: text('A dog can read a book.'), x: 5 - tileWidth('A dog can read a book.', 0.8) / 2, w: tileWidth('A dog can read a book.', 0.8), lit: true } : piece));
  const make = set(calm(reads), ['make', 'pic'], { lit: true });
  const fresh = (f: Record<string, unknown>): boolean => !['A dog can run.', 'A dog can read a book.', 'A ball can talk.'].includes(str(f, 'target'));
  const one = turnQuestion('E-K-E5', 1, (f) => fresh(f) && REAL_SENTENCES.some((each) => each.sentence === str(f, 'target') && !each.real));
  const two = turnQuestion('E-K-E5', 2, (f) => fresh(f) && REAL_SENTENCES.some((each) => each.sentence === str(f, 'target') && each.real));
  return {
    parts: [
      show(moment(['Some things in stories could really happen. Some are make-believe.'], 'Real, or make-believe?', start)),
      show(moment(['Listen. A dog can run.'], 'A dog can run.', runs)),
      show(moment(['Could a dog really run? Yes! Dogs run every day. So it is real.'], 'Real', real)),
      show(moment(['Now listen. A dog can read a book.'], 'A dog can read a book.', reads)),
      show(moment(['Could a dog really read a book? No! So it is', { word: 'make-believe' }, '.'], 'Make-believe', make)),
      show(moment(['Ask yourself: could this really happen?'], 'Could it really happen?', calm(make))),
      turn(one, realWhy(one)),
      show(moment(['Things can be make-believe too. Listen. A ball can talk.'], 'A ball can talk.', set(realScene('⚽', 'A ball can talk.'), ['say'], { lit: true }))),
      show(moment(['Could a ball really talk? No! So it is', { word: 'make-believe' }, '.'], 'Make-believe', set(realScene('⚽', 'A ball can talk.'), ['make', 'pic'], { lit: true }))),
      turn(two, realWhy(two)),
      show(moment(['If it could really happen, it is real. If not, it is', { word: 'make-believe' }, '.'], 'Real, or make-believe.', calm(start))),
    ],
  };
}

// ---- E-K-E6 Which sentence matches the picture ----
// Read two or three sentences and pick the one that tells about the picture.

function sentenceFor(word: string): string {
  const found = SENTENCE_PICTURES.find((each) => each.word === word);
  if (!found) throw new Error(`No sentence about ${word}`);
  return found.sentence;
}

// The picture on the left, and the sentences stacked on the right as word tiles.
function matchScene(emoji: string, sentences: readonly string[]): Scene {
  const rows = STACK[sentences.length] ?? [];
  return scene([{ id: 'pic', look: art(emoji), x: 0.2, y: 1.4, w: 2.2, h: 2.2 }, ...sentences.flatMap((each, i) => wordRow(`o${i}w`, each.split(' '), rows[i] ?? 0, 0.9, 2.6, 7.3))]);
}

// The tile in a sentence that holds the word ("cat." holds cat).
const tileOf = (sentence: string, word: string): number => sentence.split(' ').findIndex((each) => each.replace(/[.?!]$/, '') === word);

function matchMoments(emoji: string, word: string, sentences: readonly string[]): Moment[] {
  const start = matchScene(emoji, sentences);
  const at = sentences.indexOf(sentenceFor(word));
  const right = sentences[at] ?? '';
  const pic = set(start, ['pic'], { lit: true });
  const key = set(pic, [`o${at}w${tileOf(right, word)}`], { lit: true });
  const found = alter(calm(key), (piece) => (piece.id.startsWith(`o${at}w`) || piece.id === 'pic' ? { ...piece, lit: true } : { ...piece, dim: true }));
  return [
    moment(['Look at the picture. It is', ...(/^[aeiou]/.test(word) ? ['an'] : ['a']), { word }, '.'], word, pic),
    moment(['Read each sentence, and look for the word', { word }, '.'], `Look for ${word}.`, key),
    moment(['This sentence matches the picture.', right], right, found),
  ];
}

function matchWhy(question: Question): Moment[] {
  const word = str(question.facts, 'target');
  return matchMoments(pictureOf(question.stimulus), word, strings(question.facts, 'options'));
}

export function matchLesson(): Lesson {
  const cat = SENTENCE_PICTURES.find((each) => each.word === 'cat');
  const emoji = cat?.emoji ?? '🐱';
  const sentences = [sentenceFor('bus'), sentenceFor('cat')];
  const worked = matchMoments(emoji, 'cat', sentences);
  const one = turnQuestion('E-K-E6', 1, (f) => str(f, 'target') !== 'cat');
  const two = turnQuestion('E-K-E6', 2, (f) => str(f, 'target') !== 'cat' && str(f, 'target') !== str(one.facts, 'target'));
  return {
    parts: [
      show(moment(['A picture and a sentence can tell about the same thing.'], 'Match the sentence to the picture.', matchScene(emoji, sentences))),
      ...shows(worked),
      show(moment(['The other sentence is about a bus, not a cat.'], 'Not about a cat.', set(calm(last(worked)), ['o0w4'], { lit: true }))),
      show(moment(['Name the picture. Then find the sentence with that word.'], 'Name it, then find the word.', calm(last(worked)))),
      turn(one, matchWhy(one)),
      turn(two, matchWhy(two)),
      show(moment(['Read every sentence, and find the one that tells about the picture.'], 'Read every sentence.', calm(last(worked)))),
    ],
  };
}

// ---- E-K-C4 Sight words in a sentence ----
// A sentence with a gap; drag in the one word that makes sense.

const GAP = 'gap';

// The sentence on the wall with an empty box for the gap, and the word cards on the table.
function gapScene(before: string, after: string, options: readonly string[]): Scene {
  const words = [...before.split(' '), GAP, ...after.split(' ')];
  const gapAt = before.split(' ').length;
  const row = wordRow('t', words.map((each) => (each === GAP ? 'help' : each)), 1.2, 1).map((piece, i) => (i === gapAt ? { ...piece, id: GAP, look: { kind: 'box' as const } } : piece));
  return scene([...row, ...wordRow('c', options, 3.6, 1, 1.5, 7)]);
}

// A word card moved into the gap (or back to its place on the table).
function intoGap(from: Scene, card: string, lit: boolean): Scene {
  const box = from.pieces.find((piece) => piece.id === GAP);
  return alter(from, (piece) => (piece.id === card && box ? { ...piece, x: box.x + ((box.w ?? 1) - (piece.w ?? 1)) / 2, y: box.y, lit } : piece));
}

function gapWhy(question: Question): Moment[] {
  if (question.type !== 'dragWord') throw new Error('Not a gap question');
  const options = strings(question.facts, 'options');
  const right = options[question.answerIndex] ?? '';
  const start = gapScene(question.before, question.after, options);
  const filled = `${question.before} ${right} ${question.after}`;
  return [
    moment(['Read the sentence. Then try each word in the gap.'], 'Try each word in the gap.', set(start, [GAP], { lit: true })),
    moment(['Only one word makes sense.', filled], filled, intoGap(set(calm(start), [GAP], { gone: true }), `c${options.indexOf(right)}`, true)),
  ];
}

export function gapLesson(): Lesson {
  const options = ['go', 'see', 'is'];
  const start = gapScene('I', 'a cat.', options);
  const gapLit = set(start, [GAP], { lit: true });
  const tryGo = intoGap(set(calm(start), [GAP], { gone: true }), 'c0', false);
  const back = set(start, [GAP], { gone: false });
  const trySee = intoGap(set(back, [GAP], { gone: true }), 'c1', true);
  // Not the worked example, and not the gap filled by a, a one-letter word read as a letter name.
  const fresh = (f: Record<string, unknown>): boolean => !['I see a cat.', 'I have a red hat.'].includes(str(f, 'target'));
  const one = turnQuestion('E-K-C4', 1, fresh);
  const two = turnQuestion('E-K-C4', 2, (f) => fresh(f) && str(f, 'target') !== str(one.facts, 'target'));
  return {
    parts: [
      show(moment(['This sentence has a word missing. We find the word that fits.'], 'A word is missing.', start)),
      show(moment(['Let us read it. I, something, a cat.'], 'I ___ a cat.', gapLit)),
      show(moment(['Try the word', { word: 'go' }, '. I go a cat. That does not make sense.'], 'I go a cat. No.', tryGo)),
      show(moment(['Try the word', { word: 'see' }, '. I see a cat. Yes, that makes sense!'], 'I see a cat. Yes!', trySee)),
      show(moment(['Read the sentence with each word. Keep the one that makes sense.'], 'Keep the word that makes sense.', calm(trySee))),
      turn(one, gapWhy(one)),
      turn(two, gapWhy(two)),
      show(moment(['Read the whole sentence again with your word in it.'], 'Read it again.', calm(trySee))),
    ],
  };
}

// ---- E-K-D2 Naming words ----
// Sort naming words into people, animals and things.

const NAMING: readonly { group: WordGroup; label: string; kind: string; many: string }[] = [
  { group: 'people', label: 'People', kind: 'a person', many: 'people' },
  { group: 'animals', label: 'Animals', kind: 'an animal', many: 'animals' },
  { group: 'things', label: 'Things', kind: 'a thing', many: 'things' },
];

function emojiOfWord(word: string): string {
  const found = GROUP_WORDS.find((each) => each.word === word);
  if (!found) throw new Error(`No picture for ${word}`);
  return found.emoji;
}

// Pictures along the top, and a labelled spot for each group on the table.
function sortScene(words: readonly string[]): Scene {
  const size = 1.3;
  const left = 5 - (words.length * (size + 0.2)) / 2;
  return scene([
    ...NAMING.map((each, i) => ({ id: `bin${i}`, look: text(each.label), x: 0.3 + i * 3.25, y: 4.6, w: 3, h: 0.9 })),
    ...words.map((word, i) => ({ id: `it${i}`, look: art(emojiOfWord(word)), x: left + i * (size + 0.2), y: 0.4, w: size, h: size })),
  ]);
}

// The pictures of one group slide down onto their spot.
function sortGroup(from: Scene, words: readonly string[], groups: readonly string[], bin: number): Scene {
  const group = NAMING[bin]?.group ?? 'people';
  const mine = words.map((_, i) => i).filter((i) => groups[i] === group);
  return alter(calm(from), (piece) => {
    const at = mine.findIndex((i) => piece.id === `it${i}`);
    if (at >= 0) return { ...piece, x: 0.4 + bin * 3.25 + at * 1.4, y: 3.1, lit: true };
    if (piece.id === `bin${bin}`) return { ...piece, lit: true };
    return piece;
  });
}

function sortSay(words: readonly string[], bin: number): Say {
  const each = NAMING[bin];
  if (!each) return [];
  const [first, second] = words;
  if (first === undefined) return [];
  if (second === undefined) return [article(first), { word: first }, `is ${each.kind}. It goes in`, `${each.label}.`];
  const names: Say = words.flatMap((word, i): Say => (i === 0 ? ['The', { word }] : [i === words.length - 1 ? 'and the' : ', the', { word }]));
  return [...names, `are ${each.many}. They go in`, `${each.label}.`];
}

function sortMoments(words: readonly string[], groups: readonly string[]): { moments: Moment[]; end: Scene } {
  let now = sortScene(words);
  const moments: Moment[] = [];
  NAMING.forEach((each, bin) => {
    const mine = words.filter((_, i) => groups[i] === each.group);
    if (mine.length === 0) return;
    now = sortGroup(now, words, groups, bin);
    moments.push(moment(sortSay(mine, bin), `${mine.join(', ')}: ${each.label}`, now));
  });
  return { moments, end: now };
}

function sortWhy(question: Question): Moment[] {
  const words = strings(question.facts, 'items');
  const groups = strings(question.facts, 'itemAttrs');
  return [moment(['Is each one a person, an animal, or a thing?'], 'A person, an animal, or a thing?', sortScene(words)), ...sortMoments(words, groups).moments];
}

export function namingLesson(): Lesson {
  const words = ['girl', 'dog', 'cup'];
  const groups = ['people', 'animals', 'things'];
  const start = sortScene(words);
  const sorted = sortMoments(words, groups);
  const one = turnQuestion('E-K-D2', 1);
  const two = turnQuestion('E-K-D2', 2);
  return {
    parts: [
      show(moment(['A naming word is the name of a person, an animal, or a thing.'], 'Naming words: people, animals, things.', start)),
      show(moment(['Here are three spots: people, animals, and things.'], 'People, Animals, Things', set(start, ['bin0', 'bin1', 'bin2'], { lit: true }))),
      ...shows(sorted.moments),
      show(moment(['Ask: is it a person, an animal, or a thing?'], 'Person, animal, or thing?', calm(sorted.end))),
      turn(one, sortWhy(one)),
      turn(two, sortWhy(two)),
      show(moment(['Every naming word names a person, an animal, or a thing.'], 'People, animals, things.', calm(sorted.end))),
    ],
  };
}

// ---- E-K-E1 Read a sentence ----
// Read a sentence, then tap the picture it tells about.

function emojiOfSentence(word: string): string {
  const found = SENTENCE_PICTURES.find((each) => each.word === word);
  if (!found) throw new Error(`No sentence picture for ${word}`);
  return found.emoji;
}

// The sentence as word tiles on the wall, the pictures on the table.
function readScene(sentence: string, pictureWords: readonly string[]): Scene {
  const size = 2;
  const left = 5 - (pictureWords.length * (size + 0.6) - 0.6) / 2;
  return scene([
    ...wordRow('w', sentence.split(' '), 0.6, 1.1),
    ...pictureWords.map((word, i) => ({ id: `p${i}`, look: art(emojiOfSentence(word)), x: left + i * (size + 0.6), y: 2.4, w: size, h: size })),
  ]);
}

// The picture's word inside the sentence, and the matching picture, both lit; the others dimmed.
function readFound(from: Scene, sentence: string, word: string, pictureWords: readonly string[]): Scene {
  const tile = `w${tileOf(sentence, word)}`;
  const pic = `p${pictureWords.indexOf(word)}`;
  return alter(calm(from), (piece) => (piece.id === tile || piece.id === pic ? { ...piece, lit: true } : piece.id.startsWith('p') ? { ...piece, dim: true } : piece));
}

function readWhy(question: Question): Moment[] {
  const sentence = str(question.facts, 'target');
  const pictureWords = strings(question.facts, 'options');
  const word = SENTENCE_PICTURES.find((each) => each.sentence === sentence)?.word ?? '';
  const start = readScene(sentence, pictureWords);
  const read = set(start, sentence.split(' ').map((_, i) => `w${i}`), { lit: true });
  return [
    moment(['Read each word.', sentence], sentence, read),
    moment(['The sentence says', { word }, '. So we tap the', { word }, '.'], word, readFound(start, sentence, word, pictureWords)),
  ];
}

export function readLesson(): Lesson {
  const sentence = 'I see a cat.';
  const pictureWords = ['dog', 'cat'];
  const start = readScene(sentence, pictureWords);
  const words = sentence.split(' ');
  let now = start;
  const reading: Moment[] = words.map((each, i) => {
    now = set(now, [`w${i}`], { lit: true });
    const plainWord = each.replace(/[.?!]$/, '');
    return moment([{ word: plainWord }], plainWord, now);
  });
  const found = readFound(now, sentence, 'cat', pictureWords);
  const one = turnQuestion('E-K-E1', 1, (f) => str(f, 'target') !== sentence);
  const two = turnQuestion('E-K-E1', 2, (f) => str(f, 'target') !== sentence && str(f, 'target') !== str(one.facts, 'target'));
  return {
    parts: [
      show(moment(['A sentence is made of words. We read them from left to right.'], 'Read from left to right.', start)),
      show(moment(['Let us read this one, one word at a time.'], 'One word at a time.', set(start, ['w0'], { lit: true }))),
      ...shows(reading),
      show(moment(['Now read it all together.', sentence], sentence, now)),
      show(moment(['The sentence says', { word: 'cat' }, '. So the cat is the right picture.'], 'cat', found)),
      show(moment(['The word', { word: 'cat' }, 'tells us which picture to pick.'], 'The word tells us.', calm(found))),
      turn(one, readWhy(one)),
      turn(two, readWhy(two)),
      show(moment(['Read every word, then find the picture that matches.'], 'Read every word.', calm(found))),
    ],
  };
}

// ---- E-K-E4 Story order ----
// Which happens first; then put all three pictures in order.

const ORDER_LABELS = ['First', 'Next', 'Last'];
const SLOT_X = [0.9, 4, 7.1];

function sequenceOf(id: string): Sequence {
  const found = SEQUENCES.find((each) => each.id === id);
  if (!found) throw new Error(`No story ${id}`);
  return found;
}

// The story's pictures in a mixed-up row, with First, Next and Last under the three places.
function orderScene(sequence: Sequence, shown: readonly string[]): Scene {
  return scene([
    ...ORDER_LABELS.map((label, i) => ({ id: `lab${i}`, look: text(label), x: (SLOT_X[i] ?? 0) - 0.2, y: 4.4, w: 2.4, h: 0.9, dim: true })),
    ...sequence.steps.map((step, i) => ({ id: `st${i}`, look: art(step.emoji), x: SLOT_X[shown.indexOf(step.word)] ?? 0, y: 1.2, w: 2, h: 2 })),
  ]);
}

function orderMoments(sequence: Sequence, shown: readonly string[]): { moments: Moment[]; end: Scene } {
  let now = orderScene(sequence, shown);
  const moments: Moment[] = [];
  // Pictures move out of the way of each other: the one going into place swaps with the one there.
  let places = [...shown];
  sequence.steps.forEach((step, i) => {
    const from = places.indexOf(step.word);
    const there = places[i];
    places = places.map((word, j) => (j === i ? step.word : j === from ? (there ?? word) : word));
    now = alter(calm(now), (piece) => {
      if (piece.id === `lab${i}`) return { ...piece, dim: undefined, lit: true };
      const index = sequence.steps.findIndex((_, k) => piece.id === `st${k}`);
      if (index < 0) return piece;
      const word = sequence.steps[index]?.word ?? '';
      return { ...piece, x: SLOT_X[places.indexOf(word)] ?? piece.x, lit: index === i ? true : undefined };
    });
    moments.push(moment([sequence.lines[i] ?? ''], `${ORDER_LABELS[i] ?? ''}: ${step.word}`, now));
  });
  return { moments, end: now };
}

function orderWhy(question: Question): Moment[] {
  const sequence = sequenceOf(str(question.facts, 'target'));
  const shown = question.type === 'order' ? strings(question.facts, 'items') : strings(question.facts, 'options');
  const done = orderMoments(sequence, shown);
  const [a, b, c] = sequence.steps.map((each) => each.word);
  return [
    moment(['What happens first? Then what? What happens last?'], 'First, next, last?', orderScene(sequence, shown)),
    ...done.moments,
    moment(['So the order is:', { word: a ?? '' }, ',', { word: b ?? '' }, ', and then', { word: c ?? '' }, '.'], `${a ?? ''}, ${b ?? ''}, ${c ?? ''}`, calm(done.end)),
  ];
}

export function storyOrderLesson(): Lesson {
  const rain = sequenceOf('rain');
  const mixed = ['rainbow', 'cloud', 'rain'];
  const start = orderScene(rain, mixed);
  const worked = orderMoments(rain, mixed);
  const three = (f: Record<string, unknown>): boolean => str(f, 'target') !== 'rain' && sequenceOf(str(f, 'target')).steps.length === 3;
  const one = turnQuestion('E-K-E4', 1, three);
  const two = turnQuestion('E-K-E4', 2, (f) => three(f) && str(f, 'target') !== str(one.facts, 'target'));
  return {
    parts: [
      show(moment(['Things happen in order: first, next, and last.'], 'First, next, last.', set(start, ['lab0', 'lab1', 'lab2'], { dim: undefined, lit: true }))),
      show(moment(['These pictures are mixed up. What happens first?'], 'What happens first?', start)),
      ...shows(worked.moments),
      show(moment(['First clouds, next rain, and last a rainbow.'], 'cloud, rain, rainbow', calm(worked.end))),
      show(moment(['Ask: what happens first? Then what? What happens last?'], 'First? Then? Last?', calm(worked.end))),
      turn(one, orderWhy(one)),
      turn(two, orderWhy(two)),
      show(moment(['Think about what happens first, next, and last.'], 'First, next, last.', calm(worked.end))),
    ],
  };
}

// ---- Picture answers with no spoken label: the question's own pictures, in a row on the table ----

function optionEmojis(question: Question): string[] {
  if (question.type !== 'choice') throw new Error('Not a choice question');
  return question.options.map((each) => pictureOf(each));
}

function rightIndex(question: Question): number {
  if (question.type !== 'choice') throw new Error('Not a choice question');
  return question.answerIndex;
}

// Pictures p0, p1, ... side by side, centred, `size` squares each.
function pictureRow(emojis: readonly string[], y: number, size = 2): Piece[] {
  const left = 5 - (emojis.length * (size + 0.6) - 0.6) / 2;
  return emojis.map((emoji, i) => ({ id: `p${i}`, look: art(emoji), x: left + i * (size + 0.6), y, w: size, h: size }));
}

// The right picture lit and the others dimmed.
function pickPicture(from: Scene, right: number, count: number): Scene {
  return alter(calm(from), (piece) => {
    if (piece.id === `p${right}`) return { ...piece, lit: true };
    if (/^p\d$/.test(piece.id) && Number(piece.id.slice(1)) < count) return { ...piece, dim: true };
    return piece;
  });
}

// ---- E-K-D7 Read an action word ----
// Read a word such as swim, then tap the picture of someone doing it. The word is never spoken in the question.

function action(verb: string): { verb: string; doing: string; emoji: string } {
  const found = ACTIONS.find((each) => each.verb === verb);
  if (!found) throw new Error(`No action called ${verb}`);
  return found;
}

// The word as letter tiles on the wall, the pictures on the table.
function actionScene(verb: string, emojis: readonly string[]): Scene {
  const step = 0.8;
  return scene([...letterRow('l', verb, 5 - (verb.length * step) / 2, 0.4, step, 1.1), ...pictureRow(emojis, 2.3)]);
}

function actionMoments(verb: string, emojis: readonly string[], right: number): Moment[] {
  const start = actionScene(verb, emojis);
  const read = set(start, letterIds('l', verb), { lit: true });
  const found = set(pickPicture(read, right, emojis.length), letterIds('l', verb), { lit: true });
  return [
    moment(['Read the letters:', ...spelled(verb), '.'], verb.split('').join(', '), read),
    moment(['The word says', { word: verb }, '.'], verb, read),
    moment(['Who is', action(verb).doing, '? This one!'], action(verb).doing, found),
  ];
}

function actionWhy(question: Question): Moment[] {
  return actionMoments(str(question.facts, 'target'), optionEmojis(question), rightIndex(question));
}

export function actionLesson(): Lesson {
  const emojis = [action('sleep').emoji, action('swim').emoji];
  const worked = actionMoments('swim', emojis, 1);
  const start = actionScene('swim', emojis);
  // Only words that are read the way they are spelled: never ski, surf, row, walk or ride.
  const plain = (f: Record<string, unknown>): boolean => ['run', 'lift', 'sleep'].includes(str(f, 'target'));
  const one = turnQuestion('E-K-D7', 1, plain);
  const two = turnQuestion('E-K-D7', 2, (f) => plain(f) && str(f, 'target') !== str(one.facts, 'target'));
  return {
    parts: [
      show(moment(['An action word tells what someone does.'], 'An action word tells what someone does.', start)),
      show(moment(['First we read the word. Then we find someone doing it.'], 'Read it, then find it.', set(start, ['l0'], { lit: true }))),
      ...shows(worked),
      show(moment(['The other picture shows sleeping, not swimming.'], 'Not sleeping.', set(calm(last(worked)), ['p0'], { lit: true }))),
      turn(one, actionWhy(one)),
      turn(two, actionWhy(two)),
      show(moment(['Read the word, then look for someone doing it.'], 'Read it, then find it.', calm(last(worked)))),
    ],
  };
}

// ---- E-K-E7 Read and answer ----
// Read a sentence, then answer who did it by tapping a picture.

// `other` is the second character in the sentence, when it has one: then the child must tell who does it from who gets it.
function whoMoments(sentence: string, ask: string, target: string, emojis: readonly string[], right: number, other?: string): Moment[] {
  const words = sentence.split(' ');
  const start = scene([...wordRow('w', words, 0.5, 1), ...pictureRow(emojis, 2.4)]);
  const read = set(start, words.map((_, i) => `w${i}`), { lit: true });
  const at = tileOf(sentence, target);
  const found = set(pickPicture(start, right, emojis.length), [`w${at}`], { lit: true });
  const out = [moment(['Read the sentence.', sentence], sentence, read)];
  if (other === undefined) {
    out.push(moment([ask, 'Look back at the sentence to find out.'], ask, set(calm(read), [`w${at}`], { lit: true })));
  } else {
    const otherAt = tileOf(sentence, other);
    const doer = at < otherAt ? target : other;
    const getter = at < otherAt ? other : target;
    out.push(moment(['The', { word: doer }, 'and the', { word: getter }, 'are both in the sentence.'], `${doer} and ${getter}`, set(calm(read), [`w${at}`, `w${otherAt}`], { lit: true })));
    out.push(moment(['The', { word: doer }, 'is the one doing it. The', { word: getter }, 'is the one it is done to.'], `${doer} does it.`, set(calm(read), [`w${Math.min(at, otherAt)}`], { lit: true })));
    out.push(moment([ask], ask, set(calm(read), [`w${at}`], { lit: true })));
  }
  out.push(moment(['The sentence tells us: the', { word: target }, '.'], `The ${target}.`, found));
  return out;
}

function whoWhy(question: Question): Moment[] {
  const sentence = str(question.facts, 'story');
  const other = WHO_SENTENCES.find((each) => each.sentence === sentence)?.others[0]?.word;
  return whoMoments(sentence, str(question.facts, 'ask'), str(question.facts, 'target'), optionEmojis(question), rightIndex(question), other);
}

export function whoLesson(): Lesson {
  const sentence = 'The frog hops on a log.';
  const emojis = ['🦆', '🐸'];
  const worked = whoMoments(sentence, 'Who hops?', 'frog', emojis, 1);
  const pair = 'The dog chases the cat.';
  const chase = whoMoments(pair, 'Who chases?', 'dog', ['🐱', '🐶'], 1, 'cat');
  const used = (f: Record<string, unknown>): boolean => ![sentence, pair].includes(str(f, 'story')) && WHO_SENTENCES.some((each) => each.sentence === str(f, 'story'));
  const one = turnQuestion('E-K-E7', 1, used);
  const two = turnQuestion('E-K-E7', 2, used);
  return {
    parts: [
      show(moment(['We can read a sentence, and then answer a question about it.'], 'Read, then answer.', scene(wordRow('w', sentence.split(' '), 0.5, 1)))),
      ...shows(worked),
      show(moment(['The duck is not in the sentence, so it is not the answer.'], 'The duck is not in it.', set(calm(last(worked)), ['p0'], { dim: true }))),
      show(moment(['The answer is right there in the sentence.'], 'The answer is in the sentence.', calm(last(worked)))),
      turn(one, whoWhy(one)),
      show(moment(['Sometimes two are in the sentence. Then we ask who does it.'], 'Two in the sentence: who does it?', calm(chase[0]?.scene ?? scene([])))),
      ...shows(chase),
      turn(two, whoWhy(two)),
      show(moment(['Read the sentence, then look back to find the answer.'], 'Look back to find the answer.', calm(last(chase)))),
    ],
  };
}

// ---- E-K-E2 Characters and setting, E-K-E3 Facts from a text ----
// The child hears a short text and a question, then taps a picture.

const sentencesOf = (passage: string): string[] => passage.split(/(?<=\.)\s+/);

const wordsOf = (line: string): string[] => line.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean);

// The sentence of the passage that answers the question: it names the answer and shares the most words with the question.
function answerSentence(passage: string, ask: string, target: string): string | undefined {
  const asked = wordsOf(ask);
  const naming = sentencesOf(passage).filter((each) => each.toLowerCase().includes(target.toLowerCase()));
  const score = (line: string): number => wordsOf(line).filter((word) => asked.includes(word)).length;
  return naming.reduce<string | undefined>((best, each) => (best === undefined || score(each) > score(best) ? each : best), undefined);
}

// `also` is another character in the story that is offered as a wrong answer.
function heardWhy(question: Question, passage: string, ask: string, also?: string): Moment[] {
  const target = str(question.facts, 'target');
  const emojis = optionEmojis(question);
  const start = scene(pictureRow(emojis, 1.6));
  const heard = answerSentence(passage, ask, target);
  const picked = pickPicture(start, rightIndex(question), emojis.length);
  return [
    moment(['Listen again.', ...sentencesOf(passage)], 'Listen again.', start),
    moment([ask], ask, start),
    ...(also === undefined ? [] : [moment(['The', { word: also }, 'is in the story too. So we listen for who did it.'], `The ${also} is in it too.`, start)]),
    heard === undefined ? moment(['The answer is:', { word: target }, '.'], target, picked) : moment(['We heard:', heard, 'So the answer is', { word: target }, '.'], target, picked),
  ];
}

function storyOf(question: Question): { text: string; ask: string; also?: string } {
  const [id, part] = str(question.facts, 'id').split('-');
  const story = K_STORIES.find((each) => each.id === id);
  if (!story) throw new Error(`No story ${id ?? ''}`);
  if (part !== 'who') return { text: story.text, ask: story.where.ask };
  // A wrong answer that is in the story too, such as the shark the fish swam away from.
  const also = story.who.answers.slice(1).find((each) => story.text.toLowerCase().includes(each.name))?.name;
  return { text: story.text, ask: story.who.ask, ...(also === undefined ? {} : { also }) };
}

export function storyLesson(): Lesson {
  const story = K_STORIES[0];
  if (!story) throw new Error('No stories');
  const start = scene([
    { id: 'book', look: art('📖'), x: 4, y: 0.6, w: 2, h: 2 },
    { id: 'who', look: art('🐷'), x: 1, y: 1.5, w: 2, h: 2, gone: true },
    { id: 'where', look: art('🚜'), x: 7, y: 1.5, w: 2, h: 2, gone: true },
    { id: 'whoL', look: text('Character'), x: 0.4, y: 4.2, w: 3.2, h: 0.8, gone: true },
    { id: 'whereL', look: text('Setting'), x: 6.6, y: 4.2, w: 2.8, h: 0.8, gone: true },
  ]);
  const listening = set(start, ['book'], { lit: true });
  const who = set(calm(listening), ['who', 'whoL'], { gone: false, lit: true });
  const where = set(calm(who), ['where', 'whereL'], { gone: false, lit: true });
  const fresh = (f: Record<string, unknown>): boolean => !str(f, 'id').startsWith(`${story.id}-`);
  const one = turnQuestion('E-K-E2', 1, fresh);
  // Never the snowman story's "where": the boy goes inside, and the story never says home.
  const two = turnQuestion('E-K-E2', 2, (f) => fresh(f) && str(f, 'id') !== 'k8-where' && str(f, 'id').split('-')[0] !== str(one.facts, 'id').split('-')[0]);
  return {
    parts: [
      show(moment(['A story has characters and a setting.'], 'Characters and setting', start)),
      show(moment(['Listen.', ...sentencesOf(story.text)], 'Listen.', listening)),
      show(moment(['The pig and the farmer are in the story. They are the characters.'], 'The pig and the farmer are characters.', who)),
      show(moment(['The story happens on the farm. The farm is the setting.'], 'The farm is the setting.', where)),
      show(moment(['Characters are who is in the story. The setting is where it happens.'], 'Who is in it? Where is it?', set(calm(where), ['whoL', 'whereL'], { lit: true }))),
      show(moment(['Now a question. Who rolled in the mud? The pig did.'], 'Who rolled in the mud? The pig.', set(calm(where), ['who'], { lit: true }))),
      turn(one, heardWhy(one, storyOf(one).text, storyOf(one).ask, storyOf(one).also)),
      turn(two, heardWhy(two, storyOf(two).text, storyOf(two).ask)),
      show(moment(['Listen for who is in the story, and where it happens.'], 'Who? Where?', calm(where))),
    ],
  };
}

function factOf(question: Question): { text: string; ask: string } {
  const [id, level] = str(question.facts, 'id').split('-');
  const fact = K_FACTS.find((each) => each.id === id);
  if (!fact) throw new Error(`No fact text ${id ?? ''}`);
  return { text: fact.text, ask: level === '1' ? fact.first.ask : fact.later.ask };
}

export function factLesson(): Lesson {
  const bees = K_FACTS[0];
  if (!bees) throw new Error('No fact texts');
  const [fly, make, live] = sentencesOf(bees.text);
  const start = scene([
    { id: 'bee', look: art('🐝'), x: 4, y: 0.3, w: 2, h: 2 },
    ...pictureRow(['🪽', '🍯', '🥛'], 2.6, 1.8).map((piece) => ({ ...piece, gone: true })),
  ]);
  const flies = set(start, ['bee', 'p0'], { gone: false, lit: true });
  const honey = set(calm(flies), ['p1'], { gone: false, lit: true });
  const hive = set(calm(honey), ['bee'], { lit: true });
  const asked = set(calm(hive), ['p2'], { gone: false });
  const answer = pickPicture(asked, 1, 3);
  // Never the two questions whose right picture is the whole animal (a squirrel for its tail, a fish for its fins).
  const fresh = (f: Record<string, unknown>): boolean => !str(f, 'id').startsWith(`${bees.id}-`) && !['kf6-1', 'kf4-2'].includes(str(f, 'id'));
  const one = turnQuestion('E-K-E3', 1, fresh);
  const two = turnQuestion('E-K-E3', 2, (f) => fresh(f) && str(f, 'id').split('-')[0] !== str(one.facts, 'id').split('-')[0]);
  return {
    parts: [
      show(moment(['Some books tell us true facts. We listen for the fact that answers the question.'], 'Listen for the fact.', start)),
      show(moment([fly ?? ''], fly ?? '', flies)),
      show(moment([make ?? ''], make ?? '', honey)),
      show(moment([live ?? ''], live ?? '', hive)),
      show(moment(['Now the question: what do bees make?'], 'What do bees make?', asked)),
      show(moment(['We heard: bees make honey. So the answer is honey.'], 'honey', answer)),
      show(moment(['Think back to what you heard. Find the fact that answers the question.'], 'Find the fact.', calm(answer))),
      turn(one, heardWhy(one, factOf(one).text, factOf(one).ask)),
      turn(two, heardWhy(two, factOf(two).text, factOf(two).ask)),
      show(moment(['Listen closely, then find the fact that answers the question.'], 'Listen closely.', calm(answer))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'E-K-D7': actionLesson,
  'E-K-E7': whoLesson,
  'E-K-E2': storyLesson,
  'E-K-E3': factLesson,
  'E-K-C4': gapLesson,
  'E-K-D2': namingLesson,
  'E-K-E1': readLesson,
  'E-K-E4': storyOrderLesson,
  'E-K-C1': () => sightLesson('E-K-C1'),
  'E-K-C2': () => sightLesson('E-K-C2'),
  'E-K-C3': () => sightLesson('E-K-C3'),
  'E-K-D1': capitalsLesson,
  'E-K-D3': pluralLesson,
  'E-K-D4': namesLesson,
  'E-K-D5': questionWordsLesson,
  'E-K-D6': countWordsLesson,
  'E-K-E5': realLesson,
  'E-K-E6': matchLesson,
};
