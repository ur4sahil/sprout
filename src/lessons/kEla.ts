import { CVC_WORDS } from '../content/data/cvc';
import { FIRST_SOUNDS } from '../content/data/firstSounds';
import type { Question, Visual } from '../engine/types';
import { add, alter, art, calm, moment, scene, set, str, text, turnQuestion } from './build';
import type { Lesson, LessonPart, Moment, Piece } from './types';

// Kindergarten Language Arts lessons (plan section 16).

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });

// The picture a question shows: the first emoji in its stimulus.
function pictureOf(visual: Visual | undefined): string {
  if (!visual) throw new Error('The question has no picture');
  if (visual.kind === 'emojiGroup') return visual.emoji;
  if (visual.kind === 'row') {
    for (const child of visual.children) {
      if (child.kind === 'emojiGroup') return child.emoji;
    }
  }
  throw new Error(`No picture in a ${visual.kind}`);
}

// A big picture with the word's letters as tiles under it, centred on the stage.
function wordPieces(prefix: string, word: string, emoji: string, x: number): Piece[] {
  const letters = word.split('');
  const left = x - letters.length / 2;
  return [
    { id: `${prefix}p`, look: art(emoji), x: x - 1, y: 0.3, w: 2, h: 2 },
    ...letters.map((letter, i) => ({ id: `${prefix}l${i}`, look: text(letter), x: left + i, y: 3, gone: true })),
  ];
}

// 'a' or 'an', as said before the word.
const article = (word: string): string => (/^[aeiou]/.test(word) ? 'This is an' : 'This is a');

function emojiFor(word: string): string {
  const found = FIRST_SOUNDS.find((each) => each.word === word) ?? CVC_WORDS.find((each) => each.word === word);
  if (!found) throw new Error(`No picture for ${word}`);
  return found.emoji;
}

// ---- E-K-B1 First letter of a word ----

function firstMoments(word: string, emoji: string, prefix: string): Moment[] {
  const start = scene(wordPieces(prefix, word, emoji, 5));
  const letters = word.split('').map((_, i) => `${prefix}l${i}`);
  const written = set(start, letters, { gone: false });
  const first = word[0] ?? '';
  return [
    moment([article(word), { word }, '.'], word, set(start, [`${prefix}p`], { lit: true })),
    moment(['Here is how we write', { word }, '.'], word, written),
    moment(['Listen to how it starts:', { word }, '.'], `Listen: ${word}`, set(written, [`${prefix}p`], { lit: true })),
    moment([{ word }, 'starts with the letter', { letter: first }, '.'], `${word} starts with ${first}`, set(written, [`${prefix}l0`], { lit: true })),
  ];
}

function firstWhy(question: Question): Moment[] {
  const word = str(question.facts, 'target');
  return [moment(['Let us look at the word.'], 'Look at the word.', scene(wordPieces('w', word, pictureOf(question.stimulus), 5))), ...firstMoments(word, pictureOf(question.stimulus), 'w')];
}

export function firstLetterLesson(): Lesson {
  const sun = firstMoments('sun', emojiFor('sun'), 'x');
  const end = sun.at(-1)?.scene ?? scene([]);
  // Sock starts the same way: its picture and its first letter join the sun.
  const sock: Piece[] = [
    { id: 'kp', look: art(emojiFor('sock')), x: 7.5, y: 0.3, w: 2, h: 2 },
    { id: 'kl', look: text('s'), x: 8, y: 3, lit: true },
  ];
  const both = add(calm(end), sock);
  const first = turnQuestion('E-K-B1', 1, (f) => str(f, 'target').length <= 5);
  const second = turnQuestion('E-K-B1', 1, (f) => str(f, 'target') !== str(first.facts, 'target') && str(f, 'target').length <= 5);
  return {
    parts: [
      show(moment(['Every word starts with a sound, and that sound is written with a letter.'], 'Each word starts with a sound and a letter.', scene(wordPieces('x', 'sun', emojiFor('sun'), 5)))),
      ...sun.map(show),
      show(moment([{ word: 'sock' }, 'starts the same way, so it starts with', { letter: 's' }, 'too.'], 'sock starts with s too', set(both, ['xl0'], { lit: true }))),
      show(moment(['Say the word slowly. The very first sound tells you the first letter.'], 'Say it slowly. Listen to the start.', calm(both))),
      turn(first, firstWhy(first)),
      turn(second, firstWhy(second)),
      show(moment(['Say the word, and listen to how it starts.'], 'Listen to how it starts.', calm(both))),
    ],
  };
}

// ---- E-K-B3 Middle vowel ----

function middleMoments(word: string, emoji: string, prefix: string): Moment[] {
  const start = scene(wordPieces(prefix, word, emoji, 5));
  const written = set(start, word.split('').map((_, i) => `${prefix}l${i}`), { gone: false });
  const middle = word[1] ?? '';
  return [
    moment([article(word), { word }, '.'], word, set(written, [`${prefix}p`], { lit: true })),
    moment([{ word }, 'has a start, a middle, and an end.'], 'start, middle, end', set(written, [`${prefix}l0`, `${prefix}l1`, `${prefix}l2`], { lit: true })),
    moment(['The middle letter is', { letter: middle }, '.'], `The middle is ${middle}`, set(written, [`${prefix}l1`], { lit: true })),
  ];
}

function middleWhy(question: Question): Moment[] {
  const word = str(question.facts, 'target');
  return middleMoments(word, pictureOf(question.stimulus), 'w');
}

export function middleVowelLesson(): Lesson {
  const pan = middleMoments('pan', emojiFor('pan'), 'x');
  const panEnd = pan.at(-1)?.scene ?? scene([]);
  // Change the middle letter: pan becomes pin, and the picture changes with it.
  const toPin = alter(calm(panEnd), (piece) => {
    if (piece.id === 'xp') return { ...piece, look: art(emojiFor('pin')) };
    if (piece.id === 'xl1') return { ...piece, look: text('i'), lit: true };
    return piece;
  });
  const vowels: Piece[] = ['a', 'e', 'i', 'o', 'u'].map((letter, i) => ({ id: `v${i}`, look: text(letter), x: 2.5 + i, y: 4.6, lit: true }));
  const first = turnQuestion('E-K-B3', 1);
  const second = turnQuestion('E-K-B3', 1, (f) => str(f, 'target')[1] !== str(first.facts, 'target')[1]);
  return {
    parts: [
      show(moment(['Short words often have three sounds: a start, a middle, and an end.'], 'start, middle, end', scene(wordPieces('x', 'pan', emojiFor('pan'), 5)))),
      ...pan.map(show),
      show(moment(['Change the middle letter, and you make a new word.'], 'Change the middle letter.', calm(panEnd))),
      show(moment(['With', { letter: 'i' }, 'in the middle,', { word: 'pan' }, 'becomes', { word: 'pin' }, '.'], 'pan becomes pin', toPin)),
      show(moment(['The middle letter is often one of these:', { letter: 'a' }, ',', { letter: 'e' }, ',', { letter: 'i' }, ',', { letter: 'o' }, ', and', { letter: 'u' }, '.'], 'a, e, i, o, u', add(calm(toPin), vowels))),
      turn(first, middleWhy(first)),
      turn(second, middleWhy(second)),
      show(moment(['Say the word slowly, and listen for the middle.'], 'Listen for the middle.', add(calm(toPin), vowels))),
    ],
  };
}
