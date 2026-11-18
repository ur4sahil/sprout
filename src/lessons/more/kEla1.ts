import { CVC_WORDS } from '../../content/data/cvc';
import { WORD_FAMILIES } from '../../content/data/families';
import { CLAP_WORDS, SOUND_SPLITS } from '../../content/data/h3-sounds';
import { SYLLABLE_WORDS } from '../../content/data/syllables';
import type { Question, Say } from '../../engine/types';
import { add, alter, art, calm, countAlong, ids, moment, pointAt, scene, set, str, text, turnQuestion, withoutHand } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Kindergarten Language Arts lessons (plan section 16): ABC order, vowels, last letter, rhymes,
// counting sounds, changing one letter and where a letter is. Letters are said by their names and
// words as whole words: the voice never says a lone sound.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });
const last = (moments: Moment[]): Scene => moments.at(-1)?.scene ?? scene([]);
const spelled = (letters: string): Say => letters.split('').map((letter) => ({ letter }));
// "a, e, i, o, and u" with commas, so the voice says each one clearly.
const listed = (letters: readonly string[]): Say => letters.flatMap((letter, i): Say => (i === 0 ? [{ letter }] : i === letters.length - 1 ? [', and', { letter }] : [',', { letter }]));
const list = (facts: Record<string, unknown>, key: string): string[] => {
  const value = facts[key];
  if (!Array.isArray(value)) throw new Error(`facts.${key} is not a list`);
  return value.map(String);
};
const options = (facts: Record<string, unknown>): string[] => list(facts, 'options');

const CLAPPED = [...SYLLABLE_WORDS, ...CLAP_WORDS];

function emojiFor(word: string): string {
  const found = CVC_WORDS.find((each) => each.word === word) ?? SOUND_SPLITS.find((each) => each.word === word) ?? CLAPPED.find((each) => each.word === word);
  if (!found) throw new Error(`No picture for ${word}`);
  return found.emoji;
}

// A word as one letter tile for each letter. Ids are prefix0, prefix1, ...
function wordTiles(prefix: string, word: string, x: number, y: number, step = 1, size = 1): Piece[] {
  return word.split('').map((letter, i) => ({ id: `${prefix}${i}`, look: text(letter), x: x + i * step, y, w: size, h: size }));
}

// ---- E-K-A1 ABC order ----

const shift = (letter: string, by: number): string => String.fromCharCode(letter.charCodeAt(0) + by);
const SLOT = 1.7;
const slotX = (i: number): number => 1.75 + i * SLOT;

// Four letters in a row on the table, with an empty box where one is missing.
function abcScene(prefix: string, letters: string[], blank: number): Scene {
  return scene([
    ...letters.map((letter, i) => ({ id: `${prefix}${i}`, look: text(letter), x: slotX(i), y: 1.8, w: 1.4, h: 1.4, gone: i === blank })),
    { id: `${prefix}box`, look: { kind: 'box' as const }, x: slotX(blank), y: 1.8, w: 1.4, h: 1.4 },
  ]);
}

function abcMoments(prefix: string, letters: string[], blank: number): Moment[] {
  const start = abcScene(prefix, letters, blank);
  const next = blank === letters.length - 1;
  const answer = letters[blank] as string;
  const asked: Say = [next ? 'Which letter comes next?' : 'Which letter is missing at the start?'];
  const out: Moment[] = [moment(asked, next ? 'Which letter comes next?' : 'Which letter is missing?', set(start, [`${prefix}box`], { lit: true }))];
  // Say the letters we can see, one at a time, in order.
  let now = calm(start);
  letters.forEach((letter, i) => {
    if (i === blank) return;
    now = set(now, [`${prefix}${i}`], { lit: true });
    const piece = now.pieces.find((each) => each.id === `${prefix}${i}`);
    if (piece) now = pointAt(now, piece);
    out.push(moment([{ letter }], letter, now));
  });
  const filled = set(set(withoutHand(now), [`${prefix}box`], { gone: true }), [`${prefix}${blank}`], { gone: false, lit: true });
  const neighbour = (next ? letters[blank - 1] : letters[blank + 1]) as string;
  if (next) {
    out.push(moment(['After', { letter: neighbour }, 'comes', { letter: answer }, '.'], `After ${neighbour} comes ${answer}.`, filled));
  } else {
    // Say the letters that lead up to the row, so the child can hear which one comes just before it.
    const back = Math.min(3, answer.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0));
    const lead = [...Array.from({ length: back }, (_, i) => shift(answer, i - back)), answer, neighbour];
    out.push(moment([lead[0]?.toLowerCase() === 'a' ? 'Start from the beginning:' : 'Say the letters in order:', ...listed(lead), '. The one just before', { letter: neighbour }, 'is', { letter: answer }, '.'], `Before ${neighbour} comes ${answer}.`, filled));
  }
  out.push(moment([...listed(letters), '. Now the row is in order.'], letters.join(', '), set(filled, ids(prefix, letters.length), { lit: true })));
  return out;
}

function abcWhy(question: Question): Moment[] {
  const letter = str(question.facts, 'letter');
  if (question.facts.ask === 'before') return abcMoments('w', [shift(letter, -1), letter, shift(letter, 1), shift(letter, 2)], 0);
  return abcMoments('w', [shift(letter, -2), shift(letter, -1), letter, shift(letter, 1)], 3);
}

export function abcOrderLesson(): Lesson {
  const upper = abcMoments('x', ['A', 'B', 'C', 'D'], 3);
  const lower = abcMoments('y', ['d', 'e', 'f', 'g'], 0);
  const first = turnQuestion('E-K-A1', 1, (f) => str(f, 'letter').toLowerCase() !== 'c');
  const second = turnQuestion('E-K-A1', 3);
  return {
    parts: [
      show(moment(['The letters always come in the same order. We call it', { letter: 'A' }, { letter: 'B' }, { letter: 'C' }, 'order.'], 'Letters come in ABC order.', abcScene('x', ['A', 'B', 'C', 'D'], 3))),
      ...upper.map(show),
      show(moment(['Say the letters in order. The letter you say next is the answer.'], 'Say them in order. The next one is the answer.', calm(last(upper)))),
      show(moment(['Sometimes the missing letter is at the start of the row.'], 'The missing letter can be first.', abcScene('y', ['d', 'e', 'f', 'g'], 0))),
      ...lower.map(show),
      turn(first, abcWhy(first)),
      turn(second, abcWhy(second)),
      show(moment(['Say the letters in order, and you will find the one that is missing.'], 'Say the letters in order.', calm(last(lower)))),
    ],
  };
}

// ---- E-K-A4 Vowels ----

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const isVowel = (letter: string): boolean => VOWELS.includes(letter.toLowerCase());

// The five vowels along the top, in the case of the letters below them.
function vowelRow(big: boolean): Piece[] {
  return VOWELS.map((letter, i) => ({ id: `v${i}`, look: text(big ? letter.toUpperCase() : letter), x: 2.5 + i, y: 0.2 }));
}
const vowelId = (letter: string): string => `v${VOWELS.indexOf(letter.toLowerCase())}`;

// Letters to choose from, spread out on the table.
function choices(prefix: string, letters: string[]): Piece[] {
  const left = 5 - (letters.length * 2 - 0.6) / 2;
  return letters.map((letter, i) => ({ id: `${prefix}${i}`, look: text(letter), x: left + i * 2, y: 2.4, w: 1.4, h: 1.4 }));
}

// Check each letter against the five vowels, then say the answer.
function vowelCheck(prefix: string, letters: string[], start: Scene, answer: string, wantVowel: boolean): Moment[] {
  let now = calm(start);
  const out: Moment[] = [];
  letters.forEach((letter, i) => {
    const id = `${prefix}${i}`;
    const vowel = isVowel(letter);
    now = vowel ? set(calm(now), [id, vowelId(letter)], { lit: true }) : set(calm(now), [id], { dim: true });
    const piece = now.pieces.find((each) => each.id === id);
    if (piece) now = pointAt(now, piece);
    out.push(moment([{ letter }, vowel ? 'is one of the five, so it is a vowel.' : 'is not one of the five, so it is not a vowel.'], `${letter} ${vowel ? 'is' : 'is not'} a vowel.`, now));
  });
  const at = letters.indexOf(answer);
  const end = set(alter(withoutHand(now), (piece) => ({ ...piece, lit: undefined, dim: piece.id.startsWith(prefix) && piece.id !== `${prefix}${at}` ? true : undefined })), [`${prefix}${at}`], { lit: true });
  out.push(moment(['So the letter that is', wantVowel ? 'a vowel' : 'not a vowel', 'is', { letter: answer }, '.'], `The answer is ${answer}.`, end));
  return out;
}

function vowelWhy(question: Question): Moment[] {
  const letters = options(question.facts);
  const answer = str(question.facts, 'answer');
  const wantVowel = question.facts.target === 'vowel';
  const big = answer === answer.toUpperCase();
  const start = scene([...vowelRow(big), ...choices('w', letters)]);
  const row = big ? VOWELS.map((each) => each.toUpperCase()) : VOWELS;
  return [
    moment(['The vowels are', ...listed(row), '.'], `The vowels are ${row.join(', ')}.`, set(start, ids('v', 5), { lit: true })),
    moment([wantVowel ? 'Which letter is a vowel?' : 'Which letter is not a vowel?'], wantVowel ? 'Which is a vowel?' : 'Which is not a vowel?', calm(start)),
    ...vowelCheck('w', letters, start, answer, wantVowel),
  ];
}

export function vowelsLesson(): Lesson {
  const top = vowelRow(false).map((piece) => ({ ...piece, gone: true }));
  const empty = scene(top);
  const shown = set(empty, ids('v', 5), { gone: false, lit: true });
  const cat = add(calm(shown), wordTiles('c', 'cat', 3.5, 2.4));
  const pick = scene([...vowelRow(false), ...choices('x', ['t', 'o'])]);
  const odd = scene([...vowelRow(false), ...choices('y', ['a', 'm', 'e'])]);
  const tryOne = vowelCheck('x', ['t', 'o'], pick, 'o', true);
  const tryTwo = vowelCheck('y', ['a', 'm', 'e'], odd, 'm', false);
  const first = turnQuestion('E-K-A4', 1);
  const second = turnQuestion('E-K-A4', 3);
  return {
    parts: [
      show(moment(['Five letters are special. They are called vowels.'], 'Five letters are vowels.', empty)),
      show(moment(['The vowels are', ...listed(VOWELS), '.'], 'a, e, i, o, u', shown)),
      show(moment(['Almost every word has a vowel in it.'], 'Words have vowels.', cat)),
      show(moment([{ word: 'cat' }, 'has the vowel', { letter: 'a' }, 'in the middle.'], 'cat has the vowel a.', set(calm(cat), ['c1', 'v0'], { lit: true }))),
      show(moment(['Which letter is a vowel? Let us check each one.'], 'Which letter is a vowel?', pick)),
      ...tryOne.map(show),
      show(moment(['To find a vowel, look for', ...listed(VOWELS), '.'], 'Look for a, e, i, o, u.', set(calm(pick), ids('v', 5), { lit: true }))),
      show(moment(['Sometimes we look for the letter that is not a vowel.'], 'Which is not a vowel?', odd)),
      ...tryTwo.map(show),
      turn(first, vowelWhy(first)),
      turn(second, vowelWhy(second)),
      show(moment(['Remember the five vowels:', ...listed(VOWELS), '.'], 'The vowels: a, e, i, o, u.', set(calm(odd), ids('v', 5), { lit: true }))),
    ],
  };
}

// ---- E-K-B2 Last letter of a word ----

// A big picture with the word's letters as tiles under it, centred on the stage.
function wordPieces(prefix: string, word: string, x: number): Piece[] {
  const left = x - word.length / 2;
  return [
    { id: `${prefix}p`, look: art(emojiFor(word)), x: x - 1, y: 0.3, w: 2, h: 2 },
    ...word.split('').map((letter, i) => ({ id: `${prefix}l${i}`, look: text(letter), x: left + i, y: 3, gone: true })),
  ];
}

const article = (word: string): string => (word === 'sun' ? 'This is the' : /^[aeiou]/.test(word) ? 'This is an' : 'This is a');

function lastMoments(word: string, prefix: string): Moment[] {
  const start = scene(wordPieces(prefix, word, 4));
  const letters = word.split('').map((_, i) => `${prefix}l${i}`);
  const written = set(start, letters, { gone: false });
  const end = word.slice(-1);
  return [
    moment([article(word), { word }, '.'], word, set(start, [`${prefix}p`], { lit: true })),
    moment(['Here is how we write', { word }, '.'], word, written),
    moment(['Listen to how it ends:', { word }, '.'], `Listen: ${word}`, set(written, [`${prefix}p`], { lit: true })),
    moment([{ word }, 'ends with the letter', { letter: end }, '.'], `${word} ends with ${end}`, set(written, [`${prefix}l${word.length - 1}`], { lit: true })),
  ];
}

function lastWhy(question: Question): Moment[] {
  const word = str(question.facts, 'target');
  return [moment(['Let us look at the word.'], 'Look at the word.', scene(wordPieces('w', word, 4))), ...lastMoments(word, 'w')];
}

export function lastLetterLesson(): Lesson {
  const cat = lastMoments('cat', 'x');
  const hat: Piece[] = [
    { id: 'hp', look: art(emojiFor('hat')), x: 7.5, y: 0.3, w: 2, h: 2 },
    { id: 'hl', look: text('t'), x: 8, y: 3, lit: true },
  ];
  const both = add(calm(last(cat)), hat);
  // Never lip: its picture is a mouth.
  const fresh = (f: Record<string, unknown>): boolean => !['cat', 'hat', 'lip'].includes(str(f, 'target'));
  const first = turnQuestion('E-K-B2', 1, fresh);
  const second = turnQuestion('E-K-B2', 1, (f) => fresh(f) && str(f, 'target').slice(-1) !== str(first.facts, 'target').slice(-1));
  return {
    parts: [
      show(moment(['Every word ends with a sound, and that sound is written with a letter.'], 'Each word ends with a sound and a letter.', scene(wordPieces('x', 'cat', 4)))),
      ...cat.map(show),
      show(moment([{ word: 'hat' }, 'ends the same way, so it ends with', { letter: 't' }, 'too.'], 'hat ends with t too', set(both, ['xl2'], { lit: true }))),
      show(moment(['Say the word slowly. The very last sound tells you the last letter.'], 'Say it slowly. Listen to the end.', calm(both))),
      turn(first, lastWhy(first)),
      turn(second, lastWhy(second)),
      show(moment(['Say the word, and listen to how it ends.'], 'Listen to how it ends.', calm(both))),
    ],
  };
}

// ---- E-K-B6 Rhyming words ----

const TOP = 0.6;
const LOW = 2.8;
const OPTION_X = [0.4, 3.5, 6.6];
const rhymes = (one: string, two: string): boolean => one.slice(1) === two.slice(1);
const ends = (prefix: string): string[] => [`${prefix}1`, `${prefix}2`];

// A word with the target on top and the options in a row on the table.
function rhymeScene(target: string | null, words: string[]): Scene {
  return scene([...(target ? wordTiles('t', target, 3.5, TOP) : []), ...words.flatMap((word, i) => wordTiles(`o${i}`, word, OPTION_X[i] as number, LOW))]);
}

function rhymeMoments(target: string, words: string[]): Moment[] {
  const start = rhymeScene(target, words);
  const out: Moment[] = [moment(['Which word rhymes with', { word: target }, '?'], `Which word rhymes with ${target}?`, set(start, ids('t', 3), { lit: true }))];
  let now = calm(start);
  words.forEach((word, i) => {
    const p = `o${i}`;
    if (rhymes(word, target)) {
      now = set(calm(now), [...ends('t'), ...ends(p)], { lit: true });
      out.push(moment([{ word: target }, ',', { word }, '. Both end in', ...spelled(target.slice(1)), '.'], `${target}, ${word}: same end`, now));
    } else {
      now = set(set(calm(now), ends('t'), { lit: true }), ids(p, 3), { dim: true });
      out.push(moment([{ word: target }, ',', { word }, '. They end in different ways.'], `${target}, ${word}: different end`, now));
    }
  });
  const at = words.findIndex((word) => rhymes(word, target));
  const answer = words[at] as string;
  // The rhyme slides up beside the word.
  const joined = alter(calm(now), (piece) => {
    if (piece.id.startsWith('t')) return { ...piece, x: piece.x - 2, lit: true };
    if (piece.id.startsWith(`o${at}`)) return { ...piece, x: 5 + Number(piece.id.slice(2)), y: TOP, lit: true };
    return piece;
  });
  out.push(moment(['So', { word: answer }, 'rhymes with', { word: target }, '.'], `${answer} rhymes with ${target}`, joined));
  return out;
}

// Two words rhyme and one does not: find the different one.
function oddMoments(words: string[], ending: string): Moment[] {
  const start = rhymeScene(null, words);
  const same = words.filter((word) => word.slice(1) === ending);
  const odd = words.find((word) => word.slice(1) !== ending) as string;
  const sameIds = words.flatMap((word, i) => (word.slice(1) === ending ? ends(`o${i}`) : []));
  const oddAt = words.indexOf(odd);
  const marked = set(calm(start), sameIds, { lit: true });
  return [
    moment(['Two words rhyme. Look at how each word ends.'], 'Look at the ends.', start),
    moment([{ word: same[0] as string }, 'and', { word: same[1] as string }, 'both end in', ...spelled(ending), '.'], `${same.join(' and ')} end in ${ending}`, marked),
    moment([{ word: odd }, 'ends in a different way, so', { word: odd }, 'is the different one.'], `${odd} is different`, set(set(marked, ids(`o${oddAt}`, 3), { lit: true }), sameIds, { lit: false })),
  ];
}

function rhymeWhy(question: Question): Moment[] {
  const words = options(question.facts);
  if (question.facts.relation === 'notFamily') return oddMoments(words, str(question.facts, 'target'));
  return rhymeMoments(str(question.facts, 'target'), words);
}

export function rhymingLesson(): Lesson {
  const pair = scene([...wordTiles('a', 'cat', 1.5, 2), ...wordTiles('b', 'hat', 5.5, 2)]);
  const worked = rhymeMoments('bat', ['bug', 'sat', 'pin']);
  const odd = oddMoments(['pig', 'hop', 'wig'], 'ig');
  const first = turnQuestion('E-K-B6', 1, (f) => str(f, 'target') !== 'bat');
  const second = turnQuestion('E-K-B6', 2, (f) => str(f, 'target') !== 'ig' && str(f, 'target') !== str(first.facts, 'target').slice(1));
  return {
    parts: [
      show(moment(['Words that rhyme sound the same at the end.'], 'Rhymes sound the same at the end.', pair)),
      show(moment(['Listen:', { word: 'cat' }, ',', { word: 'hat' }, '.'], 'cat, hat', set(pair, [...ids('a', 3), ...ids('b', 3)], { lit: true }))),
      show(moment(['Both words end in', { letter: 'a' }, { letter: 't' }, '.'], 'Both end in at.', set(pair, [...ends('a'), ...ends('b')], { lit: true }))),
      show(moment(['So', { word: 'cat' }, 'and', { word: 'hat' }, 'rhyme.'], 'cat and hat rhyme.', set(pair, [...ids('a', 3), ...ids('b', 3)], { lit: true }))),
      ...worked.map(show),
      show(moment(['Look at the end of each word. When the ends match, the words rhyme.'], 'Same end: they rhyme.', calm(last(worked)))),
      ...odd.map(show),
      turn(first, rhymeWhy(first)),
      turn(second, rhymeWhy(second)),
      show(moment(['Listen to the ends of the words to find a rhyme.'], 'Listen to the ends.', calm(pair))),
    ],
  };
}

// ---- E-K-B10 Count the sounds ----

// The picture, and the word split into its sounds: one tile for each sound, wider when letters work together.
function soundScene(prefix: string, word: string): Scene {
  const split = SOUND_SPLITS.find((each) => each.word === word);
  if (!split) throw new Error(`No sounds for ${word}`);
  const widths = split.sounds.map((sound) => (sound.length === 1 ? 1 : 1.6));
  const gap = 0.5;
  let x = 5 - (widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1)) / 2;
  const tiles = split.sounds.map((sound, i) => {
    const piece: Piece = { id: `${prefix}s${i}`, look: text(sound), x, y: 2.8, w: widths[i], h: 1, gone: true };
    x += (widths[i] as number) + gap;
    return piece;
  });
  return scene([{ id: `${prefix}p`, look: art(split.emoji), x: 4, y: 0.2, w: 2, h: 2 }, ...tiles]);
}

function soundMoments(prefix: string, word: string): Moment[] {
  const start = soundScene(prefix, word);
  const tiles = start.pieces.filter((piece) => piece.id.startsWith(`${prefix}s`));
  const split = set(start, tiles.map((piece) => piece.id), { gone: false });
  const together = tiles.find((piece) => piece.look.kind === 'text' && piece.look.text.length > 1);
  const out: Moment[] = [
    moment(['Listen:', { word }, '.'], word, set(start, [`${prefix}p`], { lit: true })),
    moment(['Say it slowly, and split it into its sounds.'], 'Say it slowly.', split),
  ];
  if (together && together.look.kind === 'text') {
    out.push(moment(['The letters', ...spelled(together.look.text), 'work together to make one sound.'], `${together.look.text} is one sound`, set(split, [together.id], { lit: true })));
  }
  const counted = countAlong(split, tiles.map((piece) => piece.id));
  out.push(...counted.moments);
  out.push(moment([{ word }, 'has', { number: tiles.length }, 'sounds.'], `${word} has ${tiles.length} sounds.`, set(counted.end, tiles.map((piece) => piece.id), { lit: true })));
  return out;
}

const soundsWhy = (question: Question): Moment[] => soundMoments('w', str(question.facts, 'target'));
const sounds = (word: string): readonly string[] => SOUND_SPLITS.find((each) => each.word === word)?.sounds ?? [];

export function countSoundsLesson(): Lesson {
  const sun = soundMoments('x', 'sun');
  const hand = soundMoments('z', 'hand');
  const fish = soundMoments('y', 'fish');
  const first = turnQuestion('E-K-B10', 1, (f) => !['sun', 'fish', 'hand'].includes(str(f, 'target')));
  const second = turnQuestion('E-K-B10', 2, (f) => sounds(str(f, 'target')).some((sound) => sound.length > 1) && str(f, 'target') !== 'fish');
  return {
    parts: [
      show(moment(['Words are made of sounds. Let us count the sounds in a word.'], 'Count the sounds in a word.', soundScene('x', 'sun'))),
      ...sun.map(show),
      show(moment(['Say the word slowly. Count one for each sound you hear.'], 'One count for each sound.', calm(last(sun)))),
      show(moment(['Some words have more sounds.'], 'Some words have more sounds.', soundScene('z', 'hand'))),
      ...hand.map(show),
      turn(first, soundsWhy(first)),
      show(moment(['Sometimes two letters make just one sound.'], 'Two letters can make one sound.', soundScene('y', 'fish'))),
      ...fish.map(show),
      show(moment([{ word: 'fish' }, 'has', { number: 4 }, 'letters, but only', { number: 3 }, 'sounds.'], 'fish: 4 letters, 3 sounds', calm(last(fish)))),
      turn(second, soundsWhy(second)),
      show(moment(['Count the sounds you hear, not the letters you see.'], 'Count the sounds, not the letters.', calm(last(sun)))),
    ],
  };
}

// ---- E-K-B11 Change one letter ----

const PLACE = ['first', 'middle', 'last'];

function swapMoments(prefix: string, from: string, to: string): Moment[] {
  const at = from.split('').findIndex((letter, i) => letter !== to.charAt(i));
  const old = from.charAt(at);
  const fresh = to.charAt(at);
  const place = PLACE[at === 0 ? 0 : at === from.length - 1 ? 2 : 1] as string;
  const tileX = 1.5 + at * 1.2;
  const start = scene([
    ...wordTiles(`${prefix}l`, from, 1.5, 2.6, 1.2, 1.1),
    { id: `${prefix}n`, look: text(fresh), x: tileX, y: 0.6, w: 1.1, h: 1.1, gone: true },
    { id: `${prefix}p`, look: art(emojiFor(to)), x: 6.5, y: 1, w: 2.2, h: 2.2, dim: true },
  ]);
  const word = ids(`${prefix}l`, from.length);
  const out = set(calm(start), [`${prefix}l${at}`], { crossed: true, lit: true });
  const put = set(set(out, [`${prefix}l${at}`], { gone: true }), [`${prefix}n`], { gone: false, lit: true, y: 2.6 });
  return [
    moment(['This word is', { word: from }, '.'], from, set(start, word, { lit: true })),
    moment(['We want to make', { word: to }, '.'], `Make ${to}.`, set(start, [`${prefix}p`], { lit: true, dim: false })),
    moment(['Say them both:', { word: from }, ',', { word: to }, '. Only the', `${place} letter changes.`], `Only the ${place} letter changes.`, set(start, [`${prefix}l${at}`], { lit: true })),
    moment(['Take away', { letter: old }, '.'], `Take away ${old}.`, out),
    moment(['Put in', { letter: fresh }, '.'], `Put in ${fresh}.`, put),
    moment([{ word: from }, 'becomes', { word: to }, '. The new letter is', { letter: fresh }, '.'], `${from} becomes ${to}`, set(set(put, [...word.filter((id) => id !== `${prefix}l${at}`), `${prefix}n`], { lit: true }), [`${prefix}p`], { lit: true, dim: false })),
  ];
}

const swapWhy = (question: Question): Moment[] => swapMoments('w', str(question.facts, 'from'), str(question.facts, 'target'));

export function changeLetterLesson(): Lesson {
  const hat = swapMoments('x', 'cat', 'hat');
  const pin = swapMoments('y', 'pan', 'pin');
  const cat = swapMoments('z', 'can', 'cat');
  const first = turnQuestion('E-K-B11', 1, (f) => str(f, 'target') !== 'hat');
  const second = turnQuestion('E-K-B11', 3, (f) => str(f, 'target') !== 'pin');
  return {
    parts: [
      show(moment(['Change one letter, and you make a new word.'], 'Change one letter, make a new word.', calm(hat[0]?.scene ?? scene([])))),
      ...hat.map(show),
      show(moment(['Say both words. Find the letter that changes. That is the new letter you need.'], 'Find the letter that changes.', calm(last(hat)))),
      turn(first, swapWhy(first)),
      show(moment(['The letter that changes can be the last one.'], 'It can be the last letter.', calm(cat[0]?.scene ?? scene([])))),
      ...cat.map(show),
      show(moment(['It can be in the middle, too.'], 'It can be the middle letter.', calm(pin[0]?.scene ?? scene([])))),
      ...pin.map(show),
      turn(second, swapWhy(second)),
      show(moment(['Find the letter that changes, and put in the new one.'], 'Swap the letter that changes.', calm(last(pin)))),
    ],
  };
}

// ---- E-K-B13 Where is the letter ----

const placeX = (i: number): number => 2.9 + i * 1.5;

function placeScene(prefix: string, word: string): Scene {
  return scene([
    { id: `${prefix}p`, look: art(emojiFor(word)), x: 4, y: 0, w: 2, h: 2 },
    ...word.split('').map((letter, i) => ({ id: `${prefix}${i}`, look: text(letter), x: placeX(i), y: 2.7, w: 1.2, h: 1.2 })),
  ]);
}

// Walk the letters from left to right, naming each place, until the letter asked for.
function placeMoments(prefix: string, word: string, letter: string): Moment[] {
  const at = word.indexOf(letter);
  const start = placeScene(prefix, word);
  const out: Moment[] = [moment(['Where is the letter', { letter }, 'in', { word }, '?'], `Where is ${letter} in ${word}?`, set(start, [`${prefix}p`], { lit: true }))];
  let now = calm(start);
  for (let i = 0; i <= at; i += 1) {
    const id = `${prefix}${i}`;
    const place = PLACE[i] as string;
    now = alter(now, (piece) => (piece.id === id ? { ...piece, badge: place, lit: i === at ? true : undefined, dim: i === at ? undefined : true } : piece));
    const piece = now.pieces.find((each) => each.id === id);
    if (piece) now = pointAt(now, piece);
    const own = word.charAt(i);
    out.push(i === at ? moment(['Here is', { letter }, '. It is the', `${place} letter in`, { word }, '.'], `${letter} is the ${place} letter.`, now) : moment([{ letter: own }, `is the ${place} letter. It is not`, { letter }, '.'], `${own} is ${place}.`, now));
  }
  return out;
}

function placeWhy(question: Question): Moment[] {
  return placeMoments('w', str(question.facts, 'target'), str(question.facts, 'letter'));
}

export function letterPlaceLesson(): Lesson {
  const cat = placeScene('x', 'cat');
  const label = (from: Scene, i: number): Scene => {
    const marked = alter(from, (piece) => (piece.id === `x${i}` ? { ...piece, badge: PLACE[i], lit: true } : piece.id.startsWith('x') && piece.id !== 'xp' ? { ...piece, lit: undefined } : piece));
    const piece = marked.pieces.find((each) => each.id === `x${i}`);
    return piece ? pointAt(marked, piece) : marked;
  };
  const one = label(cat, 0);
  const two = label(one, 1);
  const three = label(two, 2);
  const sun = placeMoments('y', 'sun', 'n');
  const first = turnQuestion('E-K-B13', 1, (f) => !['sun', 'cat'].includes(str(f, 'target')));
  const second = turnQuestion('E-K-B13', 2, (f) => f.letter === str(f, 'target').charAt(1) && !['sun', 'cat', str(first.facts, 'target')].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['A short word has a first letter, a middle letter, and a last letter.'], 'first, middle, last', cat)),
      show(moment(['We read from left to right.'], 'Read left to right.', pointAt(cat, cat.pieces[1] as Piece))),
      show(moment([{ letter: 'c' }, 'is the first letter.'], 'c is first.', one)),
      show(moment([{ letter: 'a' }, 'is the middle letter.'], 'a is in the middle.', two)),
      show(moment([{ letter: 't' }, 'is the last letter.'], 't is last.', three)),
      ...sun.map(show),
      show(moment(['Point to each letter from left to right: first, middle, last.'], 'Left to right: first, middle, last.', withoutHand(last(sun)))),
      turn(first, placeWhy(first)),
      turn(second, placeWhy(second)),
      show(moment(['Left to right: first, middle, and last.'], 'first, middle, last', withoutHand(three))),
    ],
  };
}

// ---- E-K-A2 Uppercase and lowercase, all letters ----

const PAIR_ROWS = [0.2, 1.6, 3.0, 4.4];

// Big letters down the left, small letters mixed up down the right.
function pairScene(prefix: string, bigs: string[], smalls: string[]): Scene {
  return scene([
    ...bigs.map((letter, i) => ({ id: `${prefix}B${i}`, look: text(letter.toUpperCase()), x: 2, y: PAIR_ROWS[i] as number, w: 1.2, h: 1.2 })),
    ...smalls.map((letter, i) => ({ id: `${prefix}s${i}`, look: text(letter), x: 6.8, y: PAIR_ROWS[i] as number, w: 1.2, h: 1.2 })),
  ]);
}

// Each small letter slides over beside its big letter.
function pairMoments(prefix: string, bigs: string[], smalls: string[]): Moment[] {
  let now = pairScene(prefix, bigs, smalls);
  return bigs.map((letter, i) => {
    const at = smalls.indexOf(letter);
    now = alter(calm(now), (piece) => {
      if (piece.id === `${prefix}B${i}`) return { ...piece, lit: true };
      if (piece.id === `${prefix}s${at}`) return { ...piece, x: 3.4, y: PAIR_ROWS[i] as number, lit: true };
      return piece;
    });
    return moment(['Big', { letter: letter.toUpperCase() }, 'goes with small', { letter }, '.'], `${letter.toUpperCase()} goes with ${letter}`, now);
  });
}

function pairWhy(question: Question): Moment[] {
  const bigs = list(question.facts, 'leftValues');
  const smalls = list(question.facts, 'rightValues');
  return [moment(['Let us find a partner for each big letter.'], 'Find each big letter a partner.', pairScene('w', bigs, smalls)), ...pairMoments('w', bigs, smalls)];
}

export function bigSmallLettersLesson(): Lesson {
  const bigs = ['a', 'g', 'r', 'e'];
  const smalls = ['r', 'e', 'a', 'g'];
  const start = pairScene('x', bigs, smalls);
  const paired = pairMoments('x', bigs, smalls);
  const lookAlikes = ['b', 'd', 'p'];
  const alike = scene([
    ...lookAlikes.map((letter, i) => ({ id: `k${i}`, look: text(letter), x: 2.4 + i * 2, y: 2.6, w: 1.4, h: 1.4 })),
    ...lookAlikes.map((letter, i) => ({ id: `K${i}`, look: text(letter.toUpperCase()), x: 2.4 + i * 2, y: 0.6, w: 1.4, h: 1.4, gone: true })),
  ]);
  // Each big letter appears above its own small letter, one at a time.
  let partnered = alike;
  const partners = lookAlikes.map((letter, i) => {
    partnered = set(calm(partnered), [`K${i}`, `k${i}`], { gone: false, lit: true });
    return moment(['Big', { letter: letter.toUpperCase() }, 'goes with small', { letter }, '.'], `${letter.toUpperCase()} goes with ${letter}`, partnered);
  });
  const first = turnQuestion('E-K-A2', 1, (f) => !list(f, 'leftValues').some((letter) => bigs.includes(letter)));
  const second = turnQuestion('E-K-A2', 2);
  return {
    parts: [
      show(moment(['Every letter has two shapes: a big one and a small one.'], 'Big shape, small shape.', start)),
      show(moment(['Here are big letters, and here are small letters, all mixed up.'], 'Big letters and small letters', set(start, ids('xs', 4), { lit: true }))),
      ...paired.map(show),
      show(moment(['Some small letters look like their big letter. Some look very different.'], 'Some look alike. Some look different.', calm(last(paired)))),
      show(moment(['Small', { letter: 'b' }, ',', { letter: 'd' }, ', and', { letter: 'p' }, 'look alike. Look closely at which way each one faces.'], 'b, d and p look alike.', set(alike, ids('k', 3), { lit: true }))),
      ...partners.map(show),
      turn(first, pairWhy(first)),
      turn(second, pairWhy(second)),
      show(moment(['Find the small shape that goes with each big letter.'], 'Match big to small.', calm(last(paired)))),
    ],
  };
}

// ---- E-K-A3 Match big and small words ----

const WORD_ROWS = [0.4, 2.1, 3.8];

// Each word as letter tiles: big words on the left, small words mixed up on the right.
function wordMatchScene(prefix: string, bigs: string[], smalls: string[]): Scene {
  return scene([
    ...bigs.flatMap((word, i) => wordTiles(`${prefix}B${i}`, word.toUpperCase(), 0.8, WORD_ROWS[i] as number, 0.9, 0.9)),
    ...smalls.flatMap((word, i) => wordTiles(`${prefix}s${i}`, word, 6.6, WORD_ROWS[i] as number, 0.9, 0.9)),
  ]);
}

// Each small word slides over beside its big word.
function wordMatchMoments(prefix: string, bigs: string[], smalls: string[]): Moment[] {
  let now = wordMatchScene(prefix, bigs, smalls);
  return bigs.map((word, i) => {
    const at = smalls.indexOf(word);
    now = alter(calm(now), (piece) => {
      if (piece.id.startsWith(`${prefix}B${i}`)) return { ...piece, lit: true };
      if (piece.id.startsWith(`${prefix}s${at}`)) return { ...piece, x: piece.x - 2.7, y: WORD_ROWS[i] as number, lit: true };
      return piece;
    });
    return moment(['Big', { word }, 'goes with small', { word }, '. Every letter matches.'], `${word.toUpperCase()} goes with ${word}`, now);
  });
}

function wordMatchWhy(question: Question): Moment[] {
  const bigs = list(question.facts, 'leftValues');
  const smalls = list(question.facts, 'rightValues');
  return [moment(['Match each big word to its small word. Check every letter.'], 'Check every letter.', wordMatchScene('w', bigs, smalls)), ...wordMatchMoments('w', bigs, smalls)];
}

export function bigSmallWordsLesson(): Lesson {
  const pair = scene([...wordTiles('a', 'CAT', 1.5, 1.8, 1, 1), ...wordTiles('b', 'cat', 5.5, 1.8, 1, 1)]);
  // Which small word goes with PEN? pin, pen and pan differ only in the middle.
  const smalls = ['pin', 'pen', 'pan'];
  const check = scene([...wordTiles('t', 'PEN', 0.8, WORD_ROWS[1] as number, 0.9, 0.9), ...smalls.flatMap((word, i) => wordTiles(`o${i}`, word, 6.6, WORD_ROWS[i] as number, 0.9, 0.9))]);
  const middles = (i: number): string[] => ['t1', `o${i}1`];
  const pin = set(set(check, ['t0', 'o00'], { lit: true }), middles(0), { lit: true });
  const pinOut = set(calm(check), ids('o0', 3), { dim: true });
  const pen = set(pinOut, [...ids('t', 3), ...ids('o1', 3)], { lit: true });
  const joined = alter(pen, (piece) => (piece.id.startsWith('o1') ? { ...piece, x: piece.x - 2.7, y: WORD_ROWS[1] as number } : piece));
  const first = turnQuestion('E-K-A3', 1, (f) => !list(f, 'leftValues').includes('cat'));
  const second = turnQuestion('E-K-A3', 3, (f) => !list(f, 'leftValues').includes('pen'));
  return {
    parts: [
      show(moment(['A word can be written in big letters or in small letters. It is still the same word.'], 'Big or small, the same word.', pair)),
      show(moment(['Big', { word: 'cat' }, 'goes with small', { word: 'cat' }, '.'], 'CAT goes with cat', set(pair, [...ids('a', 3), ...ids('b', 3)], { lit: true }))),
      show(moment(['Which small word goes with big', { word: 'pen' }, '?'], 'Which small word goes with PEN?', set(check, ids('t', 3), { lit: true }))),
      show(moment(['The first letters match, but look at the middle.', { word: 'pin' }, 'has', { letter: 'i' }, '.'], 'pin has i in the middle.', pin)),
      show(moment([{ word: 'pin' }, 'is not the same word.'], 'Not pin.', pinOut)),
      show(moment(['In', { word: 'pen' }, ', every letter matches.'], 'P-E-N matches p-e-n.', pen)),
      show(moment(['So big', { word: 'pen' }, 'goes with small', { word: 'pen' }, '.'], 'PEN goes with pen', joined)),
      show(moment(['Check every letter, not just the first one.'], 'Check every letter.', calm(joined))),
      turn(first, wordMatchWhy(first)),
      turn(second, wordMatchWhy(second)),
      show(moment(['Big or small, a word is the same when every letter matches.'], 'Every letter matches.', calm(pair))),
    ],
  };
}

// ---- E-K-A5 Letter, word or sentence ----

type Kind = 'letter' | 'word' | 'sentence';
const kindOf = (item: string): Kind => (item.includes(' ') ? 'sentence' : item.length === 1 ? 'letter' : 'word');
const BIN_LABEL: Record<Kind, string> = { letter: 'Letter', word: 'Word', sentence: 'Sentence' };
const BIN_PLACE: Record<Kind, { x: number; w: number }> = { letter: { x: 0.2, w: 2 }, word: { x: 2.4, w: 2.6 }, sentence: { x: 5.2, w: 4.6 } };

// The cards along the top, and the groups along the bottom.
function sortScene(prefix: string, items: string[], kinds: Kind[]): Scene {
  let short = 0;
  let long = 0;
  const cards = items.map((item, i): Piece => {
    if (kindOf(item) === 'sentence') {
      long += 1;
      return { id: `${prefix}${i}`, look: text(item), x: 0.5, y: 0.9 + long * 0.8, w: 7, h: 0.6 };
    }
    short += 1;
    return { id: `${prefix}${i}`, look: text(item), x: 0.5 + (short - 1) * 1.9, y: 0.3, w: 1.4, h: 1 };
  });
  const bins = kinds.map((kind): Piece => ({ id: `bin${kind}`, look: text(BIN_LABEL[kind]), x: BIN_PLACE[kind].x, y: 4.9, w: BIN_PLACE[kind].w, h: 0.8 }));
  return scene([...cards, ...bins]);
}

// Where a card sits once it is in its group: the n-th card of its kind.
function inBin(kind: Kind, n: number): Partial<Piece> {
  if (kind === 'letter') return { x: 0.3 + n * 0.9, y: 3.7, w: 0.8, h: 0.8 };
  if (kind === 'word') return { x: 2.4 + n * 1.3, y: 3.7, w: 1.3, h: 0.7 };
  return { x: 5.2, y: 3.45 + n * 0.6, w: 4.6, h: 0.5 };
}

function kindSay(item: string): Say {
  const kind = kindOf(item);
  if (kind === 'letter') return [{ letter: item }, 'is one letter on its own. It goes in the', 'Letter', 'group.'];
  if (kind === 'word') return [{ word: item }, 'is letters together. It goes in the', 'Word', 'group.'];
  return [item, 'That is words together, with a period at the end. It goes in the', 'Sentence', 'group.'];
}

function sortMoments(prefix: string, items: string[], kinds: Kind[]): Moment[] {
  let now = sortScene(prefix, items, kinds);
  const placed: Record<Kind, number> = { letter: 0, word: 0, sentence: 0 };
  return items.map((item, i) => {
    const kind = kindOf(item);
    const spot = inBin(kind, placed[kind]);
    placed[kind] += 1;
    now = set(set(calm(now), [`${prefix}${i}`], { ...spot, lit: true }), [`bin${kind}`], { lit: true });
    return moment(kindSay(item), `${item}: ${BIN_LABEL[kind].toLowerCase()}`, now);
  });
}

function sortWhy(question: Question): Moment[] {
  const items = list(question.facts, 'items');
  const kinds = list(question.facts, 'bins') as Kind[];
  return [moment(['Look at each card. Is it one letter, letters together, or words together?'], 'Letter, word or sentence?', sortScene('w', items, kinds)), ...sortMoments('w', items, kinds)];
}

export function printKindsLesson(): Lesson {
  const items = ['m', 'map', 'I see a map.'];
  const kinds: Kind[] = ['letter', 'word', 'sentence'];
  const start = sortScene('x', items, kinds);
  const sorted = sortMoments('x', items, kinds);
  const first = turnQuestion('E-K-A5', 1);
  const second = turnQuestion('E-K-A5', 2, (f) => list(f, 'items').every((item) => !list(first.facts, 'items').includes(item)));
  return {
    parts: [
      show(moment(['Letters, words, and sentences are different things. Let us sort them.'], 'Letter, word or sentence', start)),
      show(moment(['Here are three groups: letters, words, and sentences.'], 'Three groups', set(start, kinds.map((kind) => `bin${kind}`), { lit: true }))),
      ...sorted.map(show),
      show(moment(['Count the letters, and look for spaces between words.'], 'One letter? Spaces between words?', calm(last(sorted)))),
      turn(first, sortWhy(first)),
      turn(second, sortWhy(second)),
      show(moment(['One mark is a letter. Letters make a word. Words make a sentence.'], 'letter, word, sentence', calm(last(sorted)))),
    ],
  };
}

// ---- E-K-B4 Read a word, pick the picture ----

const PIC_X = [0.8, 4.1, 7.4];

function readScene(prefix: string, word: string, pictures: string[]): Scene {
  return scene([
    ...wordTiles(`${prefix}l`, word, 3.5, 0.4, 1.1, 1.1),
    ...pictures.map((each, i) => ({ id: `${prefix}p${i}`, look: art(emojiFor(each)), x: PIC_X[i] as number, y: 2.6, w: 1.8, h: 1.8 })),
  ]);
}

function readMoments(prefix: string, word: string, pictures: string[]): Moment[] {
  const start = readScene(prefix, word, pictures);
  const letters = ids(`${prefix}l`, word.length);
  const out: Moment[] = [
    moment(['Read the word. Look at every letter:', ...listed(word.split('')), '.'], word.split('').join(', '), set(start, letters, { lit: true })),
    moment(['Together, the letters say', { word }, '.'], word, set(calm(start), letters, { lit: true })),
  ];
  let now = calm(start);
  pictures.forEach((each, i) => {
    const id = `${prefix}p${i}`;
    const same = each === word;
    now = same ? set(calm(now), [id, ...letters], { lit: true }) : set(calm(now), [id], { dim: true });
    out.push(moment(['This is', each === 'sun' ? 'the' : /^[aeiou]/.test(each) ? 'an' : 'a', { word: each }, same ? '. It matches the word!' : '. It does not match.'], same ? `${each}: yes` : `${each}: no`, now));
  });
  out.push(moment(['So the word', { word }, 'goes with this picture.'], `${word} goes with this picture.`, now));
  return out;
}

const readWhy = (question: Question): Moment[] => readMoments('w', str(question.facts, 'target'), options(question.facts));

export function readWordLesson(): Lesson {
  const hat = readMoments('x', 'hat', ['bag', 'hat', 'sun']);
  const near = scene([...wordTiles('a', 'pan', 1.5, 1.6, 1.1, 1.1), ...wordTiles('b', 'pin', 5.5, 1.6, 1.1, 1.1)]);
  const first = turnQuestion('E-K-B4', 1, (f) => !['hat', 'pan', 'pin'].includes(str(f, 'target')));
  const second = turnQuestion('E-K-B4', 3, (f) => !['pan', 'pin'].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['Letters make words. When we read a word, we can find the picture it names.'], 'Read the word. Find its picture.', readScene('x', 'hat', ['bag', 'hat', 'sun']))),
      ...hat.map(show),
      show(moment(['Some words look almost the same, like', { word: 'pan' }, 'and', { word: 'pin' }, '.'], 'pan and pin', near)),
      show(moment(['Only the middle letter is different, so look at every letter.'], 'Look at every letter.', set(near, ['a1', 'b1'], { lit: true }))),
      turn(first, readWhy(first)),
      turn(second, readWhy(second)),
      show(moment(['Read every letter, then find the picture that matches.'], 'Read every letter.', calm(last(hat)))),
    ],
  };
}

// ---- E-K-B5 Spell a word ----

const BOX_X = (i: number): number => 3.6 + i * 1.3;

// The picture, three empty boxes, and the letter tiles to choose from on the table.
function spellScene(prefix: string, word: string, bank: string[]): Scene {
  return scene([
    { id: `${prefix}p`, look: art(emojiFor(word)), x: 0.5, y: 0.3, w: 2.2, h: 2.2 },
    ...word.split('').map((_, i) => ({ id: `${prefix}x${i}`, look: { kind: 'box' as const }, x: BOX_X(i), y: 0.8, w: 1.1, h: 1.1 })),
    ...bank.map((letter, i) => ({ id: `${prefix}b${i}`, look: text(letter), x: 0.6 + i * 1.3, y: 3.3, w: 1.1, h: 1.1 })),
  ]);
}

function spellMoments(prefix: string, word: string, bank: string[]): Moment[] {
  const start = spellScene(prefix, word, bank);
  const out: Moment[] = [moment(['Spell the word', { word }, '.'], `Spell ${word}.`, set(start, [`${prefix}p`], { lit: true }))];
  const used = new Set<number>();
  let now = calm(start);
  word.split('').forEach((letter, i) => {
    const from = bank.findIndex((each, at) => each === letter && !used.has(at));
    used.add(from);
    now = set(set(calm(now), [`${prefix}b${from}`], { x: BOX_X(i), y: 0.8, lit: true }), [`${prefix}x${i}`], { gone: true });
    out.push(moment([`Listen to the ${PLACE[i]} part of`, { word }, '. That is the letter', { letter }, '.'], `${PLACE[i]}: ${letter}`, now));
  });
  out.push(moment([...listed(word.split('')), 'spell', { word }, '.'], `${word.split('').join(', ')} spell ${word}`, set(now, [...used].map((at) => `${prefix}b${at}`), { lit: true })));
  return out;
}

function spellWhy(question: Question): Moment[] {
  if (question.type !== 'tiles') throw new Error('Spell a word asks with tiles');
  return spellMoments('w', str(question.facts, 'word'), question.bank);
}

export function spellWordLesson(): Lesson {
  const sun = spellMoments('x', 'sun', ['t', 'n', 's', 'u', 'b']);
  const first = turnQuestion('E-K-B5', 1, (f) => str(f, 'word') !== 'sun');
  const second = turnQuestion('E-K-B5', 2, (f) => str(f, 'word') !== 'sun' && str(f, 'word').charAt(1) !== str(first.facts, 'word').charAt(1));
  return {
    parts: [
      show(moment(['To spell a word, listen to its start, its middle, and its end, and find a letter for each.'], 'Start, middle, end: a letter for each.', spellScene('x', 'sun', ['t', 'n', 's', 'u', 'b']))),
      ...sun.map(show),
      show(moment(['Some letters are extra. Leave them out.'], 'Leave out the extra letters.', set(calm(last(sun)), ['xb0', 'xb4'], { dim: true }))),
      turn(first, spellWhy(first)),
      turn(second, spellWhy(second)),
      show(moment(['Start, middle, end: one letter for each part.'], 'Start, middle, end.', calm(last(sun)))),
    ],
  };
}

// ---- E-K-B7 Word families ----

// The words as tiles along the top, and a group for each family along the bottom.
function familyScene(prefix: string, words: string[], families: string[]): Scene {
  return scene([
    ...words.flatMap((word, i) => wordTiles(`${prefix}${i}`, word, 0.5 + (i % 3) * 3.2, i < 3 ? 0.2 : 1.6, 0.95, 0.9)),
    ...families.map((ending, i) => ({ id: `fam${i}`, look: text(`-${ending}`), x: i === 0 ? 1.5 : 6.5, y: 5, w: 2, h: 0.8 })),
  ]);
}

// Where a word's tiles sit once it is in its family: two words a row, two rows.
const familySpot = (family: number, n: number): { x: number; y: number } => ({ x: (family === 0 ? 0.3 : 5.3) + (n % 2) * 2.2, y: 3.4 + Math.floor(n / 2) * 0.8 });

function familyMoments(prefix: string, words: string[], families: { ending: string; first: string }[]): Moment[] {
  let now = familyScene(prefix, words, families.map((each) => each.ending));
  const out: Moment[] = families.map((family, f) =>
    moment(['Words like', { word: family.first }, 'go here. They all end in', ...spelled(family.ending), '.'], `-${family.ending}: words like ${family.first}`, set(calm(now), [`fam${f}`], { lit: true })),
  );
  const count = [0, 0];
  words.forEach((word, i) => {
    const f = families.findIndex((family) => word.endsWith(family.ending));
    const n = count[f] ?? 0;
    count[f] = n + 1;
    const spot = familySpot(f, n);
    now = alter(calm(now), (piece) => {
      if (piece.id === `fam${f}`) return { ...piece, lit: true };
      if (!piece.id.startsWith(`${prefix}${i}`) || piece.id.length !== prefix.length + String(i).length + 1) return piece;
      const at = Number(piece.id.slice(-1));
      return { ...piece, x: spot.x + at * 0.62, y: spot.y, w: 0.6, h: 0.6, lit: at > 0 };
    });
    out.push(moment([{ word }, 'ends in', ...spelled(word.slice(1)), '. It goes in that family.'], `${word} ends in ${word.slice(1)}`, now));
  });
  return out;
}

function familyWhy(question: Question): Moment[] {
  const words = list(question.facts, 'read');
  const endings = list(question.facts, 'binAttrs');
  const families = endings.map((ending) => ({ ending, first: (WORD_FAMILIES.find((each) => each.ending === ending)?.words[0] ?? '') }));
  return [moment(['Look at how each word ends.'], 'Look at the ends.', familyScene('w', words, endings)), ...familyMoments('w', words, families)];
}

export function wordFamiliesLesson(): Lesson {
  const words = ['hat', 'pig', 'bat', 'wig'];
  const families = [{ ending: 'at', first: 'cat' }, { ending: 'ig', first: 'big' }];
  const start = familyScene('x', words, ['at', 'ig']);
  const sorted = familyMoments('x', words, families);
  const first = turnQuestion('E-K-B7', 1, (f) => !list(f, 'binAttrs').includes('at'));
  const second = turnQuestion('E-K-B7', 2, (f) => list(f, 'binAttrs').every((ending) => !list(first.facts, 'binAttrs').includes(ending)));
  return {
    parts: [
      show(moment(['A word family is a group of words that end the same way.'], 'Word families end the same way.', start)),
      ...sorted.map(show),
      show(moment(['To sort a word, look at its end, and find the family with the same end.'], 'Same end, same family.', calm(last(sorted)))),
      turn(first, familyWhy(first)),
      turn(second, familyWhy(second)),
      show(moment(['Words in a family end the same way, and they rhyme.'], 'Families end the same way.', calm(last(sorted)))),
    ],
  };
}

// ---- E-K-B8 Same middle sound and E-K-B9 Same last sound ----

// The word at the top with its letters, and the pictures to choose from on the table, each with its letters under it.
function soundMatchScene(target: string, pictures: string[]): Scene {
  const x = pictures.length === 2 ? [2, 6.4] : [0.6, 4.1, 7.6];
  return scene([
    { id: 'tp', look: art(emojiFor(target)), x: 1.2, y: 0.1, w: 1.8, h: 1.8 },
    ...wordTiles('tl', target, 3.6, 0.5, 0.9, 0.85),
    ...pictures.flatMap((each, i) => [
      { id: `p${i}`, look: art(emojiFor(each)), x: x[i] as number, y: 2.3, w: 1.6, h: 1.6 },
      ...wordTiles(`l${i}`, each, (x[i] as number) - 0.15, 4.2, 0.65, 0.6).map((piece) => ({ ...piece, gone: true })),
    ]),
  ]);
}

function soundMatchMoments(target: string, pictures: string[], at: 1 | 2, answer: string): Moment[] {
  const place = at === 1 ? 'middle' : 'last';
  const start = soundMatchScene(target, pictures);
  const out: Moment[] = [
    moment(at === 1 ? ['Which one has the same middle sound as', { word: target }, '?'] : ['Which one ends with the same sound as', { word: target }, '?'], `Same ${place} sound as ${target}?`, set(start, ['tp'], { lit: true })),
    moment([{ word: target }, `has the letter`, { letter: target.charAt(at) }, at === 1 ? 'in the middle.' : 'at the end.'], `${target}: ${place} letter ${target.charAt(at)}`, set(start, [`tl${at}`], { lit: true })),
  ];
  let now = set(start, [`tl${at}`], { lit: true });
  pictures.forEach((each, i) => {
    const same = each.charAt(at) === target.charAt(at);
    now = set(set(now, ids(`l${i}`, 3), { gone: false }), [`l${i}${at}`], same ? { lit: true } : { dim: true });
    if (!same) now = set(now, [`p${i}`], { dim: true });
    out.push(moment(['Listen:', { word: target }, ',', { word: each }, '.', { word: each }, 'has', { letter: each.charAt(at) }, at === 1 ? 'in the middle.' : 'at the end.', same ? 'That is the same!' : 'That is different.'], `${target}, ${each}: ${each.charAt(at)}`, now));
  });
  const win = pictures.indexOf(answer);
  out.push(moment(['So', { word: answer }, at === 1 ? 'has the same middle sound as' : 'ends with the same sound as', { word: target }, '.'], `${answer} and ${target}`, set(now, [`p${win}`, 'tp'], { lit: true })));
  return out;
}

const soundMatchWhy = (at: 1 | 2) => (question: Question): Moment[] => soundMatchMoments(str(question.facts, 'target'), options(question.facts), at, str(question.facts, 'answer'));

function soundMatchLesson(skillId: string, at: 1 | 2): Lesson {
  const middle = at === 1;
  const example = middle ? soundMatchMoments('cat', ['sun', 'map', 'dog'], 1, 'map') : soundMatchMoments('dog', ['bed', 'leg', 'cup'], 2, 'leg');
  const used = middle ? 'cat' : 'dog';
  const first = turnQuestion(skillId, 1, (f) => str(f, 'target') !== used);
  const second = turnQuestion(skillId, middle ? 3 : 2, (f) => ![used, str(first.facts, 'target')].includes(str(f, 'target')));
  const why = soundMatchWhy(at);
  return {
    parts: [
      show(moment(middle ? ['Short words have a sound in the middle. We can match words by their middle sound.'] : ['Words end with a sound. We can match words by their last sound.'], middle ? 'Match the middle sound.' : 'Match the last sound.', calm(example[0]?.scene ?? scene([])))),
      ...example.map(show),
      show(moment(middle ? ['Say each word slowly, and listen to the middle. The same sound has the same letter.'] : ['Say each word slowly, and listen to the very end. The same sound has the same letter.'], middle ? 'Listen to the middle.' : 'Listen to the end.', calm(last(example)))),
      turn(first, why(first)),
      turn(second, why(second)),
      show(moment(middle ? ['Stretch the word out, and listen for its middle sound.'] : ['Stretch the word out, and listen for its last sound.'], middle ? 'Listen for the middle.' : 'Listen for the end.', calm(last(example)))),
    ],
  };
}

export const sameMiddleLesson = (): Lesson => soundMatchLesson('E-K-B8', 1);
export const sameEndLesson = (): Lesson => soundMatchLesson('E-K-B9', 2);

// ---- E-K-B12 Which word has more claps ----

function clapScene(words: string[]): Scene {
  return scene(
    words.flatMap((word, side) => {
      const parts = CLAPPED.find((each) => each.word === word)?.parts ?? [word];
      const left = side * 5 + 2.5 - (parts.length * 1.15 - 0.15) / 2;
      return [
        { id: `c${side}p`, look: art(emojiFor(word)), x: side * 5 + 1.5, y: 0.3, w: 2, h: 2 },
        ...parts.map((part, i) => ({ id: `c${side}s${i}`, look: text(part), x: left + i * 1.15, y: 3.3, w: 1, h: 0.6, gone: true })),
      ];
    }),
  );
}

function clapMoments(words: string[], more: string): Moment[] {
  let now = clapScene(words);
  const out: Moment[] = [moment(['Which word has more claps?'], 'Which has more claps?', now)];
  words.forEach((word, side) => {
    const parts = now.pieces.filter((piece) => piece.id.startsWith(`c${side}s`)).map((piece) => piece.id);
    now = set(set(calm(now), parts, { gone: false }), [`c${side}p`], { lit: true });
    out.push(moment(['Let us clap', { word }, '.'], `Clap ${word}.`, now));
    const counted = countAlong(now, parts);
    out.push(...counted.moments);
    now = set(counted.end, parts, { lit: true });
    out.push(moment([{ word }, 'has', { number: parts.length }, parts.length === 1 ? 'clap.' : 'claps.'], `${word}: ${parts.length}`, now));
  });
  const win = words.indexOf(more);
  out.push(moment(['So', { word: more }, 'has more claps.'], `${more} has more claps.`, set(calm(now), [`c${win}p`], { lit: true })));
  return out;
}

const clapWhy = (question: Question): Moment[] => clapMoments(options(question.facts), str(question.facts, 'target'));

export function moreClapsLesson(): Lesson {
  const robot = clapMoments(['cat', 'robot'], 'robot');
  const first = turnQuestion('E-K-B12', 1, (f) => !options(f).includes('cat') && !options(f).includes('robot'));
  const second = turnQuestion('E-K-B12', 2);
  return {
    parts: [
      show(moment(['Clap once for each part of a word. A long word has more claps.'], 'One clap for each part.', clapScene(['cat', 'robot']))),
      ...robot.map(show),
      show(moment(['Clap each word, and count the claps. The word with more claps is longer to say.'], 'Clap and count.', calm(last(robot)))),
      turn(first, clapWhy(first)),
      turn(second, clapWhy(second)),
      show(moment(['Clap the parts, count them, and find the bigger number.'], 'Clap, count, compare.', calm(last(robot)))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'E-K-A1': abcOrderLesson,
  'E-K-A4': vowelsLesson,
  'E-K-B2': lastLetterLesson,
  'E-K-B6': rhymingLesson,
  'E-K-B10': countSoundsLesson,
  'E-K-B11': changeLetterLesson,
  'E-K-B13': letterPlaceLesson,
  'E-K-A2': bigSmallLettersLesson,
  'E-K-A3': bigSmallWordsLesson,
  'E-K-A5': printKindsLesson,
  'E-K-B4': readWordLesson,
  'E-K-B5': spellWordLesson,
  'E-K-B7': wordFamiliesLesson,
  'E-K-B8': sameMiddleLesson,
  'E-K-B9': sameEndLesson,
  'E-K-B12': moreClapsLesson,
};

