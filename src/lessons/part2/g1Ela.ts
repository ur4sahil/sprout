import { ASKING, SHOUTING } from '../../content/data/sentences';
import { DAYS, PRONOUN_ENTRIES, QUESTIONS, SUBJECTS_ONE, WE_ENTRIES } from '../../content/data/h4-grammar';
import type { PronounEntry } from '../../content/data/h4-grammar';
import { END_PART_READ } from '../../content/data/h4-phonics';
import { WORD_GROUPS } from '../../content/data/h4-words';
import { BLEND_ENDS, BLEND_STARTS, OPPOSITES_1, SAME_MEANING, SILENT_E_PAIRS, SILENT_E_PICTURES } from '../../content/data/phonics1';
import type { PartWord } from '../../content/data/phonics1';
import type { Question, Say } from '../../engine/types';
import { alter, art, calm, moment, scene, set, str, text, turnQuestion } from '../build';
import type { Lesson, LessonPart, Moment, Piece, Scene } from '../types';

// Part 2 lessons (plan section 16) for Grade 1 Language Arts: a second short lesson for a skill's harder levels,
// offered once the child is about half way up the skill. The voice says letter names and whole words only.

const show = (m: Moment): LessonPart => ({ kind: 'show', moment: m });
const turn = (question: Question, why: Moment[]): LessonPart => ({ kind: 'turn', turn: { question, why } });
const spell = (value: string): Say => value.split('').map((letter) => ({ letter }));
const spaced = (value: string): string => value.split('').join(' ');
const last = (moments: Moment[]): Scene => moments.at(-1)?.scene ?? scene([]);
const cap = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
const listSay = (words: readonly string[]): string => (words.length < 2 ? (words[0] ?? '') : words.length === 2 ? words.join(' and ') : `${words.slice(0, -1).join(', ')}, and ${words.at(-1) ?? ''}`);

// How wide a word card is, in stage squares, for a card `h` squares tall.
const wide = (value: string, h = 1): number => Math.round(Math.max(1, value.length * 0.45 + 0.5) * h * 10) / 10;

// Word cards side by side, centred on a stage `cols` wide. Cards that would not fit are made smaller.
// Ids are prefix0, prefix1, ...
function cardRow(prefix: string, words: readonly string[], y: number, cols = 10, tall = 1, gap = 0.6): Piece[] {
  const span = (size: number): number => words.reduce((sum, each) => sum + wide(each, size), 0) + gap * (words.length - 1);
  let h = tall;
  while (h > 0.5 && span(h) > cols - 0.2) h = Math.round((h - 0.05) * 100) / 100;
  let x = Math.max(0, (cols - span(h)) / 2);
  return words.map((value, i) => {
    const piece: Piece = { id: `${prefix}${i}`, look: text(value), x: Math.round(x * 100) / 100, y, w: wide(value, h), h };
    x += wide(value, h) + gap;
    return piece;
  });
}

// The words of a choice (or move-the-word) question, as they are written.
function optionsOf(question: Question): string[] {
  if (question.type !== 'choice' && question.type !== 'dragWord') throw new Error('Not a choice question');
  return question.options.map((each) => (each.kind === 'text' ? each.value : ''));
}

function answerOf(question: Question): string {
  if (question.type !== 'choice' && question.type !== 'dragWord') throw new Error('Not a choice question');
  return optionsOf(question)[question.answerIndex] ?? '';
}

const words = (facts: Record<string, unknown>, key: string): string[] => {
  const value = facts[key];
  return Array.isArray(value) ? value.map(String) : [];
};

// ---- Spelling a whole word with letter tiles (E-1-A2 level 3, E-1-B1 level 2) ----

// A few letters put down together, and what is said as they go down.
interface Chunk {
  letters: string;
  say: Say;
}

// The picture (when the word has one), an empty box for each letter, and the letter tiles below.
function spellStart(prefix: string, word: string, emoji: string | null, bank: readonly string[]): Scene {
  const left = (10 - word.length) / 2;
  const top = emoji ? 2.6 : 1.6;
  const slots = word.split('').map((_, i): Piece => ({ id: `${prefix}s${i}`, look: { kind: 'box' }, x: left + i, y: top, w: 1, h: 1 }));
  const bankLeft = (10 - bank.length) / 2;
  const tiles = bank.map((letter, i): Piece => ({ id: `${prefix}b${i}`, look: text(letter), x: bankLeft + i + 0.05, y: 4.5, w: 0.9, h: 0.9 }));
  const pic: Piece[] = emoji ? [{ id: `${prefix}p`, look: art(emoji), x: 3.9, y: 0.2, w: 2.2, h: 2.2 }] : [];
  return scene([...pic, ...slots, ...tiles]);
}

// Say the word, put its letters down a chunk at a time, leave the two spare tiles, and read the spelling back.
function spellMoments(prefix: string, word: string, emoji: string | null, bank: readonly string[], chunks: readonly Chunk[]): Moment[] {
  const used = new Set<number>();
  // Which tile goes to each place of the word: the first tile with that letter that is still free.
  const from = word.split('').map((letter) => {
    const at = bank.findIndex((each, i) => each === letter && !used.has(i));
    used.add(at);
    return at;
  });
  const left = (10 - word.length) / 2;
  const top = emoji ? 2.6 : 1.6;
  let now = spellStart(prefix, word, emoji, bank);
  const moments: Moment[] = [moment(['Say the word slowly:', { word }, '.'], `Say: ${word}`, set(now, emoji ? [`${prefix}p`] : word.split('').map((_, i) => `${prefix}s${i}`), { lit: true }))];
  let done = 0;
  for (const chunk of chunks) {
    const places = Array.from({ length: chunk.letters.length }, (_, i) => done + i);
    now = alter(calm(now), (piece) => {
      const place = places.find((each) => piece.id === `${prefix}b${from[each] ?? -1}`);
      if (place !== undefined) return { ...piece, x: left + place + 0.05, y: top + 0.05, lit: true };
      if (places.some((each) => piece.id === `${prefix}s${each}`)) return { ...piece, gone: true };
      return piece;
    });
    done += chunk.letters.length;
    moments.push(moment(chunk.say, `${word.slice(0, done)}${'_'.repeat(word.length - done)}`, now));
  }
  const spare = bank.map((_, i) => i).filter((i) => !used.has(i)).map((i) => `${prefix}b${i}`);
  now = set(calm(now), spare, { dim: true });
  moments.push(moment(['Two tiles are left over. We do not need them.'], 'Two extra tiles', now));
  moments.push(moment([{ word }, 'is spelled', ...spell(word), '.'], `${word}: ${spaced(word)}`, set(now, from.map((i) => `${prefix}b${i}`), { lit: true })));
  return moments;
}

// The letters after the start of a word: the middle ones together, then the last one.
function restChunks(rest: string): Chunk[] {
  const middle = rest.slice(0, -1);
  const end = rest.slice(-1);
  return [
    ...(middle.length === 0 ? [] : [{ letters: middle, say: [middle.length === 1 ? 'Next comes' : 'Then come', ...spell(middle), '.'] as Say }]),
    ...(end.length === 0 ? [] : [{ letters: end, say: ['Last comes', { letter: end }, '.'] as Say }]),
  ];
}

// ---- E-1-A2 Consonant blends, part 2: spell the whole word ----

const BLEND_WORDS: readonly PartWord[] = [...BLEND_STARTS, ...BLEND_ENDS];
const blendOf = (word: string): PartWord => {
  const entry = BLEND_WORDS.find((each) => each.word === word);
  if (!entry) throw new Error(`No blend word ${word}`);
  return entry;
};

// The blend goes down as one pair, wherever it sits in the word.
function blendChunks(entry: PartWord): Chunk[] {
  const { word, part } = entry;
  if (word.startsWith(part)) return [{ letters: part, say: [{ word }, 'starts with a blend:', ...spell(part), '.'] }, ...restChunks(word.slice(part.length))];
  const before = word.slice(0, -part.length);
  return [
    { letters: before, say: [{ word }, 'starts with', ...spell(before), '.'] },
    { letters: part, say: ['It ends with a blend:', ...spell(part), '.'] },
  ];
}

function blendSpellWhy(question: Question): Moment[] {
  if (question.type !== 'tiles') throw new Error('Not a tiles question');
  const entry = blendOf(question.answer);
  return spellMoments('w', entry.word, entry.emoji, question.bank, blendChunks(entry));
}

function blendsPart2(): Lesson {
  const drum = blendOf('drum');
  const gift = blendOf('gift');
  const drumBank = ['m', 'k', 'd', 'u', 's', 'r'];
  const giftBank = ['t', 'n', 'g', 'f', 'i', 'b'];
  const one = spellMoments('x', drum.word, drum.emoji, drumBank, blendChunks(drum));
  const two = spellMoments('y', gift.word, gift.emoji, giftBank, blendChunks(gift));
  const first = turnQuestion('E-1-A2', 3, (f) => BLEND_STARTS.some((each) => each.word === str(f, 'target')) && !['drum', 'frog'].includes(str(f, 'target')) && str(f, 'target').length <= 4);
  const second = turnQuestion('E-1-A2', 3, (f) => BLEND_ENDS.some((each) => each.word === str(f, 'target')) && str(f, 'target') !== 'gift');
  return {
    parts: [
      show(moment(['You know how to find a missing blend. Now you will spell the whole word.'], 'Spell the whole word.', spellStart('x', drum.word, drum.emoji, drumBank))),
      ...one.map(show),
      show(moment(['In a blend you hear both letters. Put them side by side, in the order you hear them.'], 'd then r: dr', set(calm(last(one)), ['xb2', 'xb5'], { lit: true }))),
      turn(first, blendSpellWhy(first)),
      show(moment(['A blend can be at the end of a word, too.'], 'A blend at the end', spellStart('y', gift.word, gift.emoji, giftBank))),
      ...two.map(show),
      turn(second, blendSpellWhy(second)),
      show(moment(['Say the word slowly, and spell what you hear, from the start to the end.'], 'Spell from start to end.', calm(last(two)))),
    ],
  };
}

// ---- E-1-B1 Sight words, set 4, part 2: spell the word ----

function heartChunks(word: string): Chunk[] {
  return [{ letters: word.charAt(0), say: [{ word }, 'starts with', { letter: word.charAt(0) }, '.'] }, ...restChunks(word.slice(1))];
}

function sightSpellWhy(question: Question): Moment[] {
  if (question.type !== 'tiles') throw new Error('Not a tiles question');
  return spellMoments('w', question.answer, null, question.bank, heartChunks(question.answer));
}

function sightFourPart2(): Lesson {
  const fromBank = ['o', 'f', 't', 'm', 'r', 'b'];
  const one = spellMoments('x', 'from', null, fromBank, heartChunks('from'));
  const know = scene(cardRow('k', ['k', 'n', 'o', 'w'], 2, 10, 1.2, 0.2));
  const first = turnQuestion('E-1-B1', 2, (f) => str(f, 'target').length === 3 && str(f, 'target') !== 'old');
  const second = turnQuestion('E-1-B1', 2, (f) => str(f, 'target').length >= 4 && !['from', 'know', 'round', 'could'].includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['You know how to find a word you hear. Now you will spell it with letter tiles.'], 'Spell the word.', spellStart('x', 'from', null, fromBank))),
      ...one.map(show),
      show(moment(['We learn these words by heart. Think of every letter, in order.'], 'Every letter, in order', calm(last(one)))),
      turn(first, sightSpellWhy(first)),
      show(moment(['Some words have a tricky letter. In', { word: 'know' }, ', the', { letter: 'k' }, 'at the start is quiet.'], 'know: a quiet k', set(know, ['k0'], { lit: true }))),
      show(moment(['So we remember how it looks:', ...spell('know'), '.'], 'k n o w', set(know, ['k0', 'k1', 'k2', 'k3'], { lit: true }))),
      turn(second, sightSpellWhy(second)),
      show(moment(['Say the word, spell it letter by letter, then check the whole word.'], 'Say it, spell it, check it.', calm(know))),
    ],
  };
}

// ---- E-1-A3 Silent e, part 2: three words, and a picture ----

const pairOf = (value: string): readonly [string, string] => {
  const pair = SILENT_E_PAIRS.find((each) => each.includes(value));
  if (!pair) throw new Error(`No silent e pair for ${value}`);
  return pair;
};

function silentScene(prefix: string, options: readonly string[], emoji: string | null): Scene {
  const pic: Piece[] = emoji ? [{ id: `${prefix}p`, look: art(emoji), x: 3.9, y: 0.2, w: 2.2, h: 2.2 }] : [];
  return scene([...pic, ...cardRow(`${prefix}o`, options, emoji ? 3.6 : 2.4, 10, 1.2, 0.8)]);
}

// Take away the word that is quite different, then choose between the two that differ only by the e.
function silentMoments(prefix: string, target: string, options: readonly string[], emoji: string | null): Moment[] {
  const [short, long] = pairOf(target);
  const other = options.find((each) => each !== short && each !== long) ?? '';
  const id = (value: string): string => `${prefix}o${options.indexOf(value)}`;
  const vowel = target.charAt(1);
  const start = silentScene(prefix, options, emoji);
  const two = set(start, [id(other)], { dim: true, crossed: true });
  const rule: Say =
    target === long
      ? ['In', { word: target }, ', the', { letter: vowel }, 'says its name. So the word needs the quiet', { letter: 'e' }, '.']
      : ['In', { word: target }, ', the', { letter: vowel }, 'does not say its name. So there is no', { letter: 'e' }, 'at the end.'];
  return [
    moment(emoji ? ['Say the name of the picture:', { word: target }, '.'] : ['Listen for the word:', { word: target }, '.'], emoji ? 'Say its name.' : 'Listen.', emoji ? set(start, [`${prefix}p`], { lit: true }) : start),
    moment(['Look at the letters.', { word: other }, 'is a different word.'], `not ${other}`, set(two, [id(other)], { lit: true })),
    moment(['Two words are left:', { word: short }, ', and', { word: long }, '. Only one ends with an', { letter: 'e' }, '.'], `${short}  ${long}`, set(two, [id(short), id(long)], { lit: true })),
    moment(rule, target === long ? `${vowel} says its name: e at the end` : `${vowel} does not say its name: no e`, set(two, [id(target)], { lit: true })),
    moment(['The word is', { word: target }, '.'], target, set(set(two, [id(target === long ? short : long)], { dim: true }), [id(target)], { lit: true })),
  ];
}

function silentWhy(question: Question): Moment[] {
  const target = str(question.facts, 'target');
  const emoji = question.level === 3 ? (SILENT_E_PICTURES.find((each) => each.word === target)?.emoji ?? null) : null;
  return silentMoments('w', target, optionsOf(question), emoji);
}

function silentEPart2(): Lesson {
  const tubeOptions = ['tube', 'kit', 'tub'];
  const capOptions = ['cape', 'hop', 'cap'];
  const tube = silentMoments('x', 'tube', tubeOptions, null);
  const capPicture = SILENT_E_PICTURES.find((each) => each.word === 'cap')?.emoji ?? null;
  const capMoments = silentMoments('y', 'cap', capOptions, capPicture);
  const first = turnQuestion('E-1-A3', 2, (f) => !str(f, 'target').endsWith('e') && !['tub', 'cap'].includes(str(f, 'target')) && !words(f, 'options').some((each) => ['cap', 'cape', 'tub', 'tube'].includes(each)));
  const second = turnQuestion('E-1-A3', 3, (f) => str(f, 'target') === 'note');
  return {
    parts: [
      show(moment(['You know the quiet', { letter: 'e' }, 'at the end of a word. Now there are three words to choose from.'], 'Three words', silentScene('x', tubeOptions, null))),
      ...tube.map(show),
      show(moment(['Two of the words look almost the same. Check the end for an', { letter: 'e' }, '.'], 'tub or tube?', set(calm(last(tube)), ['xo0', 'xo2'], { lit: true }))),
      turn(first, silentWhy(first)),
      show(moment(['Sometimes you get a picture, and no one says the word. Then you say it.'], 'A picture', silentScene('y', capOptions, capPicture))),
      ...capMoments.map(show),
      turn(second, silentWhy(second)),
      show(moment(['When the vowel says its name, pick the word with the quiet', { letter: 'e' }, '.'], 'Vowel says its name: quiet e', calm(last(capMoments)))),
    ],
  };
}

// ---- E-1-A7 Endings ck, ng, nk, part 2: read three words and find the ending ----

const END_COLS = 11;
const endOf = (word: string): string => END_PART_READ.find((each) => each.word === word)?.part ?? word.slice(-2);

// The ending asked for on the wall, and each word on the table in two cards: its start, and its last two letters.
function endScene(part: string, options: readonly string[]): Scene {
  const cards = cardRow('c', options, 3.4, END_COLS, 1, 0.9).flatMap((piece, i): Piece[] => {
    const word = options[i] ?? '';
    const stem = word.slice(0, -2);
    const h = piece.h ?? 1;
    const stemWide = Math.round(((piece.w ?? 1) * stem.length * 10) / word.length) / 10;
    return [
      { id: `s${i}`, look: text(stem), x: piece.x, y: piece.y, w: stemWide, h },
      { id: `t${i}`, look: text(word.slice(-2)), x: piece.x + stemWide, y: piece.y, w: Math.round(((piece.w ?? 1) - stemWide) * 10) / 10, h },
    ];
  });
  return scene([{ id: 'q', look: text(part), x: (END_COLS - 2) / 2, y: 0.5, w: 2, h: 1.6 }, ...cards], END_COLS);
}

function endMoments(part: string, options: readonly string[]): Moment[] {
  const start = endScene(part, options);
  const right = options.findIndex((each) => each.endsWith(part));
  const moments: Moment[] = [
    moment(['Which word ends with', ...spell(part), '?'], `ends with ${part}?`, set(start, ['q'], { lit: true })),
    moment(['Look at the last two letters of each word.'], options.map((each) => each.slice(-2)).join('   '), set(start, options.map((_, i) => `t${i}`), { lit: true })),
  ];
  let now = start;
  options.forEach((word, i) => {
    if (i === right) return;
    moments.push(moment([{ word }, 'ends with', ...spell(endOf(word)), '. That is not it.'], `${word}: ${endOf(word)}`, set(now, [`t${i}`], { lit: true })));
    now = set(now, [`s${i}`, `t${i}`], { dim: true });
  });
  const word = options[right] ?? '';
  moments.push(moment([{ word }, 'ends with', ...spell(part), '.'], `${word} ends with ${part}`, set(now, ['q', `s${right}`, `t${right}`], { lit: true })));
  return moments;
}

function endWhy(question: Question): Moment[] {
  return endMoments(str(question.facts, 'target'), optionsOf(question));
}

function endPartsPart2(): Lesson {
  const shown = ['neck', 'long', 'tank'];
  const worked = endMoments('nk', shown);
  const fresh = (f: Record<string, unknown>): boolean => !words(f, 'options').some((each) => shown.includes(each));
  const first = turnQuestion('E-1-A7', 3, (f) => str(f, 'target') === 'ng' && fresh(f));
  const second = turnQuestion('E-1-A7', 3, (f) => str(f, 'target') === 'ck' && fresh(f) && !words(f, 'options').some((each) => words(first.facts, 'options').includes(each)));
  const pairs = scene(cardRow('p', ['ck', 'nk'], 2.2, 10, 1.6, 1.5));
  return {
    parts: [
      show(moment(['You know the endings', ...spell('ck'), ',', ...spell('ng'), ', and', ...spell('nk'), '. Now you will read three words, and find one ending.'], 'ck   ng   nk', endScene('nk', shown))),
      ...worked.map(show),
      show(moment(['Be careful.', ...spell('ng'), 'and', ...spell('nk'), 'both start with', { letter: 'n' }, '. Check both letters.'], 'ng and nk: check both letters', set(calm(last(worked)), ['t1', 't2'], { lit: true }))),
      turn(first, endWhy(first)),
      show(moment([...spell('ck'), 'and', ...spell('nk'), 'both end with', { letter: 'k' }, '. Look at the letter before the', { letter: 'k' }, '.'], 'ck and nk: look before the k', set(pairs, ['p0', 'p1'], { lit: true }))),
      turn(second, endWhy(second)),
      show(moment(['Read to the end of each word, and check its last two letters.'], 'Check the last two letters.', calm(pairs))),
    ],
  };
}

// ---- E-1-B3 Opposites and same meanings, part 2: the two kinds of question mixed ----

type Kind = 'opposite' | 'same';
const partnersIn = (pairs: readonly (readonly [string, string])[], value: string): string[] => pairs.flatMap(([one, two]) => (one === value ? [two] : two === value ? [one] : []));
const sameAs = (value: string): string[] => partnersIn(SAME_MEANING, value);
const oppositesOf = (value: string): string[] => [...new Set([value, ...sameAs(value)].flatMap((each) => partnersIn(OPPOSITES_1, each)).flatMap((each) => [each, ...sameAs(each)]))];
// A wrong option that would be right for the other kind of question.
const trapIn = (kind: Kind, target: string, options: readonly string[]): string | undefined => options.find((each) => (kind === 'opposite' ? sameAs(target) : oppositesOf(target)).includes(each));

function meaningScene(kind: Kind, target: string, options: readonly string[]): Scene {
  const ask = kind === 'opposite' ? 'opposite?' : 'the same?';
  return scene([
    { id: 'ask', look: text(ask), x: 0.3, y: 0.3, w: wide(ask, 0.8), h: 0.8 },
    { id: 'word', look: text(target), x: (10 - wide(target, 1.3)) / 2, y: 1.4, w: wide(target, 1.3), h: 1.3 },
    ...cardRow('o', options, 3.8, 10, 1, 0.8),
  ]);
}

function meaningMoments(kind: Kind, target: string, options: readonly string[], answer: string): Moment[] {
  const start = meaningScene(kind, target, options);
  const trap = trapIn(kind, target, options);
  const id = (value: string): string => `o${options.indexOf(value)}`;
  const moments: Moment[] = [
    moment(
      kind === 'opposite' ? ['Listen to the question. It asks for the opposite of', { word: target }, '.'] : ['Listen to the question. It asks for a word that means the same as', { word: target }, '.'],
      kind === 'opposite' ? `opposite of ${target}?` : `same as ${target}?`,
      set(start, ['ask', 'word'], { lit: true }),
    ),
  ];
  let now = start;
  if (trap) {
    now = set(start, [id(trap)], { crossed: true });
    moments.push(
      moment(
        kind === 'opposite' ? [{ word: trap }, 'means the same as', { word: target }, '. That is not the opposite.'] : [{ word: trap }, 'is the opposite of', { word: target }, '. It does not mean the same.'],
        `not ${trap}`,
        set(now, [id(trap)], { lit: true }),
      ),
    );
    now = set(now, [id(trap)], { dim: true });
  }
  moments.push(moment([{ word: target }, 'and', { word: answer }, kind === 'opposite' ? 'are opposites.' : 'mean the same.'], kind === 'opposite' ? `${target}, ${answer}: opposites` : `${target}, ${answer}: the same`, set(now, ['word', id(answer)], { lit: true })));
  return moments;
}

function meaningWhy(question: Question): Moment[] {
  return meaningMoments(str(question.facts, 'relation') === 'same' ? 'same' : 'opposite', str(question.facts, 'target'), optionsOf(question), answerOf(question));
}

function meaningsPart2(): Lesson {
  const options = ['glad', 'wet', 'sad'];
  const opposite = meaningMoments('opposite', 'happy', options, 'sad');
  const same = meaningMoments('same', 'happy', options, 'glad');
  const used = ['happy', 'glad', 'sad'];
  const trapped = (kind: Kind) => (f: Record<string, unknown>): boolean =>
    str(f, 'relation') === (kind === 'same' ? 'same' : 'opposite1') && !used.includes(str(f, 'target')) && trapIn(kind, str(f, 'target'), words(f, 'options')) !== undefined;
  const first = turnQuestion('E-1-B3', 3, trapped('opposite'));
  const second = turnQuestion('E-1-B3', 3, (f) => trapped('same')(f) && !sameAs(str(first.facts, 'target')).includes(str(f, 'target')) && !oppositesOf(str(first.facts, 'target')).includes(str(f, 'target')));
  return {
    parts: [
      show(moment(['You know opposites, and words that mean the same. Now the two kinds of question are mixed.'], 'Opposite, or the same?', meaningScene('opposite', 'happy', options))),
      ...opposite.map(show),
      show(moment(['So listen for the asking words: the opposite, or the same.'], 'opposite?   the same?', set(calm(last(opposite)), ['ask'], { lit: true }))),
      turn(first, meaningWhy(first)),
      show(moment(['Here are the same words, with a new question.'], 'A new question', meaningScene('same', 'happy', options))),
      ...same.map(show),
      turn(second, meaningWhy(second)),
      show(moment(['First hear what the question wants. Then pick the word.'], 'Hear the question first.', calm(last(same)))),
    ],
  };
}

// ---- E-1-B5 ABC order, part 2: four words ----

const ABC = 'abcdefghijklmnopqrstuvwxyz';
const ABC_COLS = 13;

// The alphabet on the wall, the words waiting in a row, and below it the row they go to, in order.
// The first `placed` words of the right order have gone down to their places.
function abcScene(shown: readonly string[], placed = 0): Scene {
  const sorted = [...shown].sort();
  const alphabet: Piece[] = ABC.split('').map((letter, i) => ({ id: `a${letter}`, look: text(letter), x: (i % 13) + 0.1, y: 0.1 + Math.floor(i / 13) * 0.9, w: 0.8, h: 0.8 }));
  const waiting = cardRow('w', shown, 2.4, ABC_COLS, 0.9, 0.7);
  const places = cardRow('n', sorted, 4.4, ABC_COLS, 0.9, 0.7);
  const cards = waiting.map((piece, i): Piece => {
    const at = sorted.indexOf(shown[i] ?? '');
    const place = places[at];
    return at < placed && place ? { ...piece, x: place.x, y: place.y } : piece;
  });
  return scene([...alphabet, ...cards], ABC_COLS);
}

// Find the first word, then the first of the words left, until every word is in its place.
function abcMoments(shown: readonly string[]): Moment[] {
  const sorted = [...shown].sort();
  const card = (word: string): string => `w${shown.indexOf(word)}`;
  const letter = (word: string): string => `a${word.charAt(0)}`;
  const moments: Moment[] = [moment(['Look at the first letter of each word.'], shown.map((each) => each.charAt(0)).join(', '), set(abcScene(shown), [...shown.map(card), ...shown.map(letter)], { lit: true }))];
  sorted.forEach((word, i) => {
    const next = sorted[i + 1] ?? '';
    const say: Say =
      i === 0
        ? [{ letter: word.charAt(0) }, 'comes first in the alphabet, so', { word }, 'goes first.']
        : i === sorted.length - 1
          ? ['Only', { word }, 'is left, so it goes last.']
          : i === sorted.length - 2
            ? ['Now', { letter: word.charAt(0) }, 'comes before', { letter: next.charAt(0) }, ', so', { word }, 'is next.']
            : ['Of the words left,', { letter: word.charAt(0) }, 'comes first. So', { word }, 'is next.'];
    moments.push(moment(say, sorted.slice(0, i + 1).join(', '), set(abcScene(shown, i + 1), [card(word), letter(word)], { lit: true })));
  });
  const all = sorted.flatMap((word): Say => [{ word }, ',']).slice(0, -1);
  moments.push(moment(['In ABC order:', ...all, '.'], sorted.join(', '), set(abcScene(shown, sorted.length), shown.map(card), { lit: true })));
  return moments;
}

function abcWhy(question: Question): Moment[] {
  if (question.type !== 'order') throw new Error('Not an order question');
  const shown = question.items.map((each) => (each.kind === 'text' ? each.value : ''));
  return [moment(['Put the words in ABC order.'], shown.join(', '), abcScene(shown)), ...abcMoments(shown)];
}

function abcOrderPart2(): Lesson {
  const shown = ['rain', 'hat', 'van', 'egg'];
  const worked = abcMoments(shown);
  const apart = (f: Record<string, unknown>, taken: readonly string[]): boolean => !str(f, 'target').split(' ').some((each) => taken.includes(each));
  const first = turnQuestion('E-1-B5', 3, (f) => apart(f, shown));
  const second = turnQuestion('E-1-B5', 3, (f) => apart(f, [...shown, ...str(first.facts, 'target').split(' ')]));
  return {
    parts: [
      show(moment(['You can put three words in ABC order. Now let us try four words.'], 'Four words', abcScene(shown))),
      ...worked.map(show),
      show(moment(['Go one word at a time. Each time, look only at the words that are left.'], 'One word at a time', calm(last(worked)))),
      turn(first, abcWhy(first)),
      show(moment(['If you are not sure which letter comes first, say the alphabet from the start.'], 'a b c d e f g ...', set(calm(last(worked)), ABC.slice(0, 13).split('').map((each) => `a${each}`), { lit: true }))),
      turn(second, abcWhy(second)),
      show(moment(['Find the first word, then the next, until no words are left.'], 'First, next, next, last', calm(last(worked)))),
    ],
  };
}

// ---- E-1-B6 Word groups, part 2: name the group ----

const GROUP_COLS = 12;
const groupOf = (value: string): { name: string; words: readonly string[] } => {
  const group = WORD_GROUPS.find((each) => each.words.includes(value));
  if (!group) throw new Error(`No group for ${value}`);
  return group;
};
// What is the same about every word of a group.
const GROUP_HINT: Record<string, string> = {
  colors: 'Each one is the name of a color.',
  clothes: 'You can wear every one of them.',
  foods: 'You can eat every one of them.',
  'body parts': 'Each one is a part of your body.',
  'things that go': 'Each one can take you from place to place.',
};

function nameScene(shown: readonly string[], options: readonly string[]): Scene {
  return scene([...cardRow('g', shown, 1, GROUP_COLS), ...cardRow('o', options, 3.6, GROUP_COLS, 0.9, 0.8)], GROUP_COLS);
}

function nameMoments(shown: readonly string[], options: readonly string[]): Moment[] {
  const right = groupOf(shown[0] ?? '').name;
  const wrong = options.find((each) => each !== right) ?? '';
  const start = nameScene(shown, options);
  const group = shown.map((_, i) => `g${i}`);
  const crossed = set(start, [`o${options.indexOf(wrong)}`], { crossed: true, dim: true });
  return [
    moment(['What is the same about', listSay(shown), '?'], shown.join(', '), set(start, group, { lit: true })),
    moment([GROUP_HINT[right] ?? 'They belong together.'], shown.join(', '), set(start, group, { lit: true, badge: '✓' })),
    moment(['Are they', wrong, '? No.'], `not ${wrong}`, set(crossed, [`o${options.indexOf(wrong)}`], { lit: true })),
    moment(['They are all', right, '.'], `${shown.join(', ')}: ${right}`, set(crossed, [...group, `o${options.indexOf(right)}`], { lit: true })),
  ];
}

function nameWhy(question: Question): Moment[] {
  return nameMoments(str(question.facts, 'target').split(', '), optionsOf(question));
}

function wordGroupsPart2(): Lesson {
  const shown = ['shirt', 'sock', 'hat'];
  const options = ['foods', 'clothes', 'colors'];
  const worked = nameMoments(shown, options);
  const eat = ['bread', 'egg', 'soup'];
  const eatScene = nameScene(eat, ['body parts', 'foods', 'things that go']);
  const nameOf = (f: Record<string, unknown>): string => groupOf(str(f, 'target').split(', ')[0] ?? '').name;
  const first = turnQuestion('E-1-B6', 3, (f) => !['clothes', 'foods'].includes(nameOf(f)));
  const second = turnQuestion('E-1-B6', 3, (f) => !['clothes', 'foods', nameOf(first.facts)].includes(nameOf(f)));
  return {
    parts: [
      show(moment(['You know how to find words that belong together. Now you will name their group.'], 'Name the group.', nameScene(shown, options))),
      show(moment(['Here are three words:', listSay(shown), '. Under them are three group names.'], shown.join(', '), set(nameScene(shown, options), ['o0', 'o1', 'o2'], { lit: true }))),
      ...worked.map(show),
      show(moment(['Ask what is the same about every word. That tells you the name of the group.'], 'What is the same?', calm(last(worked)))),
      turn(first, nameWhy(first)),
      show(moment(['Try', listSay(eat), '. What is the same about them?'], eat.join(', '), set(eatScene, ['g0', 'g1', 'g2'], { lit: true }))),
      show(moment(['You can eat every one of them, so they are all foods.'], `${eat.join(', ')}: foods`, set(eatScene, ['g0', 'g1', 'g2', 'o1'], { lit: true }))),
      turn(second, nameWhy(second)),
      show(moment(['Read all the words, find what is the same, and pick that group.'], 'Find what is the same.', calm(eatScene))),
    ],
  };
}

// ---- E-1-C3 End marks, part 2: move the mark to the end ----

const MARK_COLS = 12;
const MARK_NAME: Record<string, string> = { '.': 'period', '?': 'question mark', '!': 'exclamation mark' };
const MARK_RULE: Record<string, string> = { '.': 'A telling sentence ends with a period.', '?': 'An asking sentence ends with a question mark.', '!': 'A shout ends with an exclamation mark.' };
const MARKS = ['.', '?', '!'];

// The sentence with no mark, and the three marks below it. With `moved`, that mark sits at the end of the sentence.
function markScene(sentence: string, moved?: string): Scene {
  const h = Math.min(1, Math.floor((9.5 / (sentence.length * 0.45 + 0.5)) * 20) / 20);
  const w = wide(sentence, h);
  const x = Math.round(((MARK_COLS - w - 0.8) / 2) * 100) / 100;
  const marks = MARKS.map((value, i): Piece => (value === moved ? { id: `m${i}`, look: text(value), x: x + w, y: 1.3, w: 0.8, h, lit: true } : { id: `m${i}`, look: text(value), x: 3.5 + i * 2, y: 3.6, w: 1, h: 1 }));
  return scene([{ id: 's', look: text(sentence), x, y: 1.3, w, h }, ...marks], MARK_COLS);
}

function markMoments(sentence: string, mark: string): Moment[] {
  const start = markScene(sentence);
  const firstWord = sentence.split(' ')[0] ?? '';
  const clue: Say =
    mark === '?' ? ['It starts with', { word: firstWord }, ', and it asks something.'] : mark === '!' ? ['It is short and strong. It is a shout.'] : ['It does not ask, and it is not a shout. It tells us something.'];
  const at = `m${MARKS.indexOf(mark)}`;
  return [
    moment(['Read the sentence:', `${sentence}${mark}`], sentence, set(start, ['s'], { lit: true })),
    moment(clue, mark === '?' ? 'It asks.' : mark === '!' ? 'It is a shout.' : 'It tells.', set(start, ['s'], { lit: true, badge: mark === '?' ? 'ask' : mark === '!' ? 'shout' : 'tell' })),
    moment([MARK_RULE[mark] ?? ''], MARK_RULE[mark] ?? '', set(start, [at], { lit: true })),
    moment(['So move the', MARK_NAME[mark] ?? '', 'to the end.'], `${sentence}${mark}`, markScene(sentence, mark)),
  ];
}

function markWhy(question: Question): Moment[] {
  if (question.type !== 'dragWord') throw new Error('Not a move-the-word question');
  return markMoments(question.before, answerOf(question));
}

function endMarksPart2(): Lesson {
  const tell = markMoments('We can run', '.');
  const ask = markMoments('Can we go', '?');
  const lower = (list: readonly string[]): string[] => list.map((each) => each.slice(0, -1).toLowerCase());
  const first = turnQuestion('E-1-C3', 3, (f) => lower(ASKING).includes(str(f, 'base')) && !str(f, 'base').startsWith('can'));
  const second = turnQuestion('E-1-C3', 3, (f) => lower(SHOUTING).includes(str(f, 'base')) && !['oh no', 'stop'].includes(str(f, 'base')));
  return {
    parts: [
      show(moment(['You know the three end marks. Now you will move the right mark to the end yourself.'], '.   ?   !', markScene('We can run'))),
      ...tell.map(show),
      show(moment(['Now the word can comes first.'], 'Can we go', markScene('Can we go'))),
      ...ask.map(show),
      show(moment(['Look at the first word. Words like can, is, do, who, what, and where often start an asking sentence.'], 'Can ...?   Is ...?   Who ...?', set(calm(last(ask)), ['s'], { lit: true }))),
      turn(first, markWhy(first)),
      show(moment(['A shout is short, and full of feeling, like this one:', 'Oh no!'], 'Oh no!', markScene('Oh no', '!'))),
      turn(second, markWhy(second)),
      show(moment(['Does it tell, ask, or shout? Then move its mark to the end.'], 'tell .   ask ?   shout !', markScene('Oh no', '!'))),
    ],
  };
}

// ---- E-1-C4 Pronouns, part 2: with we ----

const WIDE_COLS = 12;
const EVERY_PRONOUN: readonly PronounEntry[] = [...PRONOUN_ENTRIES, ...WE_ENTRIES];
const PRONOUN_HINT: Record<string, string> = {
  he: 'That is one boy or man, so the word is he.',
  she: 'That is one girl or woman, so the word is she.',
  it: 'That is one animal or thing, so the word is it.',
  they: 'That is more than one, and I am not one of them. So the word is they.',
  we: 'I am in that group, so the word is we.',
};

// The first sentence with its naming part on its own card, the second sentence with a gap, and the choices.
function pronounScene(entry: PronounEntry, options: readonly string[], filled = false): Scene {
  return scene(
    [
      ...cardRow('a', [entry.noun, entry.first.slice(entry.noun.length + 1)], 0.5, WIDE_COLS, 0.8, 0.2),
      ...cardRow('b', [filled ? cap(entry.pronoun) : '___', entry.then], 1.7, WIDE_COLS, 0.8, 0.2),
      ...cardRow('o', options, 3.8, WIDE_COLS, 0.9, 0.8),
    ],
    WIDE_COLS,
  );
}

function pronounMoments(entry: PronounEntry, options: readonly string[]): Moment[] {
  const start = pronounScene(entry, options);
  const done = `${entry.first} ${cap(entry.pronoun)} ${entry.then}`;
  return [
    moment(['Who is the first sentence about?', entry.noun, '.'], entry.noun, set(start, ['a0'], { lit: true })),
    moment([PRONOUN_HINT[entry.pronoun] ?? ''], `${entry.noun}: ${entry.pronoun}`, set(start, ['a0', `o${options.indexOf(cap(entry.pronoun))}`], { lit: true })),
    moment(['So we say:', done], done, set(pronounScene(entry, options, true), ['b0'], { lit: true })),
  ];
}

const pronounEntry = (noun: string): PronounEntry => {
  const entry = EVERY_PRONOUN.find((each) => each.noun === noun);
  if (!entry) throw new Error(`No pronoun for ${noun}`);
  return entry;
};

function pronounWhy(question: Question): Moment[] {
  return pronounMoments(pronounEntry(str(question.facts, 'target')), optionsOf(question));
}

function pronounsPart2(): Lesson {
  const five = scene(cardRow('p', ['he', 'she', 'it', 'they', 'we'], 2.2, WIDE_COLS, 1.2, 0.7), WIDE_COLS);
  const weOptions = ['They', 'We', 'He', 'It'];
  const theyOptions = ['We', 'She', 'They', 'It'];
  const beach = pronounMoments(pronounEntry('Ben and I'), weOptions);
  const fort = pronounMoments(pronounEntry('Sam and Lin'), theyOptions);
  const first = turnQuestion('E-1-C4', 3, (f) => str(f, 'target') === 'My friends and I');
  const second = turnQuestion('E-1-C4', 3, (f) => pronounEntry(str(f, 'target')).pronoun === 'they' && str(f, 'target') !== 'Sam and Lin');
  return {
    parts: [
      show(moment(['You know he, she, it, and they. Now there is one more word to choose: we.'], 'he   she   it   they   we', set(five, ['p4'], { lit: true }))),
      show(moment(['We is for a group that has me in it.'], 'we: a group with me in it', set(five, ['p4'], { lit: true, badge: 'me too' }))),
      ...beach.map(show),
      show(moment(['Look for the word I. When I am in the group, use we.'], 'Ben and I: we', set(calm(last(beach)), ['a0', 'b0'], { lit: true }))),
      turn(first, pronounWhy(first)),
      show(moment(['Now look at a group that does not have me in it.'], 'Sam and Lin', pronounScene(pronounEntry('Sam and Lin'), theyOptions))),
      ...fort.map(show),
      turn(second, pronounWhy(second)),
      show(moment(['Ask who it is, how many there are, and if I am one of them.'], 'Who? How many? Am I in it?', set(five, ['p3', 'p4'], { lit: true }))),
    ],
  };
}

// ---- E-1-C5 One or more, part 2: action words mixed with is, has and was ----

// The sentence in three cards (who, the gap, the rest), and the two words to choose from.
function agreeScene(subject: string, end: string, options: readonly string[], filled?: string): Scene {
  return scene([...cardRow('s', [subject, filled ?? '___', end], 1.5, WIDE_COLS, 1, 0.25), ...cardRow('o', options, 3.7, WIDE_COLS, 1, 1.2)], WIDE_COLS);
}

function agreeMoments(subject: string, end: string, options: readonly string[]): Moment[] {
  const one = SUBJECTS_ONE.includes(subject);
  const single = options.find((each) => each.endsWith('s')) ?? '';
  const more = options.find((each) => each !== single) ?? '';
  const right = one ? single : more;
  const start = agreeScene(subject, end, options);
  const done = `${subject} ${right} ${end}`;
  return [
    moment(['Who is the sentence about?', subject, '.'], subject, set(start, ['s0'], { lit: true })),
    moment([one ? 'That is just one.' : 'That is more than one.'], one ? `${subject}: one` : `${subject}: more than one`, set(start, ['s0'], { lit: true, badge: one ? 'one' : 'more' })),
    moment(
      one ? ['For one, pick the word that ends with', { letter: 's' }, ':', { word: single }, '.'] : ['For more than one, pick the word with no', { letter: 's' }, 'at the end:', { word: more }, '.'],
      one ? `one: ${single}` : `more than one: ${more}`,
      set(start, [`o${options.indexOf(right)}`], { lit: true }),
    ),
    moment(['So we say:', done], done, set(agreeScene(subject, end, options, right), ['s1'], { lit: true })),
  ];
}

function agreeWhy(question: Question): Moment[] {
  const subject = str(question.facts, 'subject');
  const sentence = str(question.facts, 'target');
  return agreeMoments(subject, sentence.slice(sentence.indexOf('___') + 4), optionsOf(question));
}

function agreePart2(): Lesson {
  const forOne = ['runs', 'is', 'has', 'was'];
  const forMore = ['run', 'are', 'have', 'were'];
  const pairs = scene([...cardRow('a', forOne, 1.2, WIDE_COLS, 1, 1), ...cardRow('b', forMore, 3.4, WIDE_COLS, 1, 1)], WIDE_COLS);
  const they = agreeMoments('They', 'happy.', ['is', 'are']);
  const she = agreeScene('She', 'a song.', ['sing', 'sings']);
  const short = ['He', 'She', 'We', 'They'];
  const special = ['is', 'are', 'has', 'have', 'was', 'were'];
  const first = turnQuestion('E-1-C5', 3, (f) => short.includes(str(f, 'subject')) && words(f, 'options').some((each) => special.includes(each)) && !str(f, 'target').includes('happy'));
  const second = turnQuestion(
    'E-1-C5',
    3,
    (f) => !words(f, 'options').some((each) => special.includes(each)) && SUBJECTS_ONE.includes(str(f, 'subject')) !== SUBJECTS_ONE.includes(str(first.facts, 'subject')) && !str(f, 'target').includes('song') && str(f, 'subject') !== 'She',
  );
  return {
    parts: [
      show(moment(['You know that some words change for one, or for more than one. Now all those words are mixed.'], 'One or more?', pairs)),
      show(moment(['Look at the words for one:', listSay(forOne), '. Every one of them ends with', { letter: 's' }, '.'], `one: ${forOne.join(', ')}`, set(pairs, ['a0', 'a1', 'a2', 'a3'], { lit: true }))),
      show(moment(['The words for more than one do not end with', { letter: 's' }, ':', listSay(forMore), '.'], `more than one: ${forMore.join(', ')}`, set(pairs, ['b0', 'b1', 'b2', 'b3'], { lit: true }))),
      ...they.map(show),
      show(moment(['Watch out for the short words. He and she mean one. We and they mean more than one.'], 'he, she: one   we, they: more', calm(last(they)))),
      turn(first, agreeWhy(first)),
      show(moment(['She is just one, so we pick the word that ends with', { letter: 's' }, '. She sings a song.'], 'She sings a song.', set(agreeScene('She', 'a song.', ['sing', 'sings'], 'sings'), ['s0', 's1', 'o1'], { lit: true }))),
      turn(second, agreeWhy(second)),
      show(moment(['One, or more than one? For one, pick the word that ends with', { letter: 's' }, '.'], 'One: the word ends with s.', calm(she))),
    ],
  };
}

// ---- E-1-C6 Capitals for days and months, part 2: find the word that needs a capital ----

const bare = (value: string): string => value.replace(/[.?!]$/, '');

// The sentence a word to a card, and the words to choose from. With `fixed`, that word has its capital.
function capitalScene(shown: string, options: readonly string[], fixed?: string): Scene {
  const tiles = shown.split(' ').map((each) => (fixed && bare(each) === fixed ? cap(each) : each));
  return scene([...cardRow('w', tiles, 1.4, WIDE_COLS, 1, 0.3), ...cardRow('o', options, 3.7, WIDE_COLS, 0.9, 0.9)], WIDE_COLS);
}

function capitalMoments(shown: string, options: readonly string[], right: string): Moment[] {
  const start = capitalScene(shown, options);
  const tiles = shown.split(' ');
  const tile = (value: string): string => `w${tiles.findIndex((each) => bare(each) === value)}`;
  const option = (value: string): string => `o${options.indexOf(value)}`;
  const isDay = DAYS.some((each) => each.toLowerCase() === right);
  const moments: Moment[] = [moment(['Read the sentence:', shown], shown, set(start, tiles.map((_, i) => `w${i}`), { lit: true }))];
  let now = start;
  for (const each of options.filter((value) => value !== right)) {
    moments.push(moment(['Look at', { word: each }, '. It is not the name of a day or a month.'], `not ${each}`, set(now, [tile(each), option(each)], { lit: true })));
    now = set(now, [option(each)], { dim: true, crossed: true });
  }
  moments.push(
    moment([{ word: right }, isDay ? 'is a day of the week.' : 'is a month of the year.', 'It needs a capital', { letter: right.charAt(0).toUpperCase() }, '.'], `${right}: capital ${right.charAt(0).toUpperCase()}`, set(now, [tile(right), option(right)], { lit: true })),
    moment(['So we write:', shown.replace(right, cap(right))], shown.replace(right, cap(right)), set(capitalScene(shown, options, right), [tile(right)], { lit: true })),
  );
  return moments;
}

function capitalWhy(question: Question): Moment[] {
  return capitalMoments(str(question.facts, 'target'), optionsOf(question), answerOf(question));
}

function capitalsPart2(): Lesson {
  const shown = 'We swim on friday.';
  const options = ['swim', 'friday', 'on'];
  const worked = capitalMoments(shown, options, 'friday');
  const pair = scene(cardRow('d', ['birthday', 'sunday'], 2.2, WIDE_COLS, 1.2, 1.2), WIDE_COLS);
  const fixedPair = alter(pair, (piece) => (piece.id === 'd1' ? { ...piece, look: text('Sunday'), lit: true } : { ...piece, dim: true }));
  const first = turnQuestion('E-1-C6', 3, (f) => str(f, 'target').startsWith('The fair'));
  const second = turnQuestion('E-1-C6', 3, (f) => str(f, 'target').startsWith('My birthday') && str(f, 'target').split(' ').at(-1) !== str(first.facts, 'target').split(' ').at(-1) && !str(f, 'target').includes('june'));
  return {
    parts: [
      show(moment(['You know that days and months start with a capital letter. Now you will find the word that needs one.'], 'Which word needs a capital?', capitalScene(shown, options))),
      ...worked.map(show),
      show(moment(['Check each word. Ask: is it the name of a day, or the name of a month?'], 'A day? A month?', calm(last(worked)))),
      turn(first, capitalWhy(first)),
      show(moment(['Be careful.', { word: 'birthday' }, 'has the word day in it, but it is not the name of a day.'], 'birthday: not a day name', set(pair, ['d0'], { lit: true }))),
      show(moment(['Sunday is the name of a day, so it gets the capital letter.'], 'Sunday', fixedPair)),
      turn(second, capitalWhy(second)),
      show(moment(['Find the day or the month. That is the word that needs a capital letter.'], 'Find the day or the month.', calm(fixedPair))),
    ],
  };
}

// ---- E-1-C7 Common and proper nouns, part 2: sort the nouns ----

const SORT_COLS = 14;
const isProper = (value: string): boolean => value.charAt(0) !== value.charAt(0).toLowerCase();

// The two group names on the wall, and the nouns below. A noun listed in `placed` has gone up under its group name.
function sortScene(items: readonly string[], placed: readonly string[] = []): Scene {
  const labels: Piece[] = [
    { id: 'common', look: text('Common nouns'), x: 0.6, y: 0.1, w: wide('Common nouns', 0.8), h: 0.8 },
    { id: 'proper', look: text('Proper nouns'), x: 7.6, y: 0.1, w: wide('Proper nouns', 0.8), h: 0.8 },
  ];
  const cards = items.map((value, i): Piece => {
    const at = placed.indexOf(value);
    if (at < 0) return { id: `n${i}`, look: text(value), x: 0.5 + (i % 3) * 4.5, y: 3.9 + Math.floor(i / 3) * 0.95, w: wide(value, 0.7), h: 0.7 };
    const rank = placed.slice(0, at).filter((each) => isProper(each) === isProper(value)).length;
    return { id: `n${i}`, look: text(value), x: isProper(value) ? 8 : 1, y: 1.05 + rank * 0.85, w: wide(value, 0.7), h: 0.7 };
  });
  return scene([...labels, ...cards], SORT_COLS);
}

// The nouns with a small first letter go up together, then the special names.
function sortWhy(question: Question): Moment[] {
  if (question.type !== 'sort') throw new Error('Not a sorting question');
  const items = question.items.map((each) => (each.kind === 'text' ? each.value : ''));
  const id = (value: string): string => `n${items.indexOf(value)}`;
  const common = items.filter((each) => !isProper(each));
  const proper = items.filter(isProper);
  return [
    moment(['Look at how each noun starts: with a small letter, or with a capital letter?'], 'Small letter, or capital?', set(sortScene(items), items.map(id), { lit: true })),
    moment([listSay(common), 'start with a small letter. Each could be any one of its kind. They go with', 'Common nouns', '.'], `Common nouns: ${common.join(', ')}`, set(sortScene(items, common), ['common', ...common.map(id)], { lit: true })),
    moment([listSay(proper), 'are special names, with capital letters. They go with', 'Proper nouns', '.'], `Proper nouns: ${proper.join(', ')}`, set(sortScene(items, [...common, ...proper]), ['proper', ...proper.map(id)], { lit: true })),
  ];
}

function properNounsPart2(): Lesson {
  const items = ['park', 'Mia', 'Oak Park', 'girl'];
  const at = (placed: readonly string[], lit: readonly string[]): Scene => set(sortScene(items, placed), lit, { lit: true });
  const twoWords = scene(cardRow('t', ['Elm Street', 'Pine School'], 2.2, SORT_COLS, 1.1, 1.2), SORT_COLS);
  const fresh = (f: Record<string, unknown>, taken: readonly string[]): boolean => !words(f, 'items').some((each) => taken.includes(each));
  const first = turnQuestion('E-1-C7', 2, (f) => fresh(f, items));
  const second = turnQuestion('E-1-C7', 3, (f) => fresh(f, ['Oak Park', 'Mia']) && words(f, 'items').filter((each) => words(first.facts, 'items').includes(each)).length <= 1);
  return {
    parts: [
      show(moment(['You know that a proper noun is a special name. Now you will sort nouns into two groups.'], 'Common nouns   Proper nouns', at([], ['common', 'proper']))),
      show(moment(['Look at the word park. It starts with a small letter, and it could be any park.'], 'park: any park', at([], ['n0']))),
      show(moment(['So park is a common noun.'], 'park: common noun', at(['park'], ['n0', 'common']))),
      show(moment(['Oak Park is the name of one special park. See its capital letters.'], 'Oak Park: one special park', at(['park'], ['n2']))),
      show(moment(['So Oak Park is a proper noun.'], 'Oak Park: proper noun', at(['park', 'Oak Park'], ['n2', 'proper']))),
      show(moment(['Girl could be any girl. Mia is the name of one girl.'], 'girl   Mia', at(['park', 'Oak Park'], ['n1', 'n3']))),
      show(moment(['So girl is a common noun, and Mia is a proper noun.'], 'girl: common   Mia: proper', at(['park', 'Oak Park', 'girl', 'Mia'], ['n1', 'n3']))),
      show(moment(['In these words, a capital letter at the start tells you it is a special name.'], 'Capital letter: a special name', at(['park', 'Oak Park', 'girl', 'Mia'], ['n1', 'n2']))),
      turn(first, sortWhy(first)),
      show(moment(['Some special names have two words, like Elm Street, and Pine School. Both words start with a capital letter.'], 'Elm Street   Pine School', set(twoWords, ['t0', 't1'], { lit: true }))),
      turn(second, sortWhy(second)),
      show(moment(['Any one of its kind is a common noun. One special name is a proper noun.'], 'any one: common   special name: proper', calm(twoWords))),
    ],
  };
}

// ---- E-1-C8 Question words, part 2: with why ----

const ASK_RULE: Record<string, string> = {
  Who: 'Who asks about a person.',
  What: 'What asks about a thing.',
  Where: 'Where asks about a place.',
  When: 'When asks about a time.',
  Why: 'Why asks for a reason.',
};
const ANSWER_TELLS: Record<string, string> = {
  Who: 'The answer names a person.',
  What: 'The answer does not tell who, where, when, or why. It tells what.',
  Where: 'The answer tells a place.',
  When: 'The answer tells a time.',
  Why: 'The answer tells what made it happen. That is a reason.',
};
type Asked = (typeof QUESTIONS)[number];
const asked = (question: string): Asked => {
  const entry = QUESTIONS.find((each) => each.question === question);
  if (!entry) throw new Error(`No question ${question}`);
  return entry;
};

// The question with its first word missing, its answer under it, and the question words to choose from.
function askScene(entry: Asked, options: readonly string[], filled = false): Scene {
  return scene(
    [
      ...cardRow('q', [filled ? entry.word : '___', entry.question.slice(4)], 0.5, WIDE_COLS, 0.9, 0.2),
      ...cardRow('a', [entry.answer], 1.8, WIDE_COLS, 0.9),
      ...cardRow('o', options, 3.8, WIDE_COLS, 0.9, 0.7),
    ],
    WIDE_COLS,
  );
}

function askMoments(entry: Asked, options: readonly string[]): Moment[] {
  const start = askScene(entry, options);
  const done = entry.question.replace('___', entry.word);
  return [
    moment(['Read the answer first:', entry.answer], entry.answer, set(start, ['a0'], { lit: true })),
    moment([ANSWER_TELLS[entry.word] ?? ''], entry.answer, set(start, ['a0'], { lit: true, badge: entry.word === 'Why' ? 'a reason' : entry.word === 'When' ? 'a time' : entry.word === 'Where' ? 'a place' : entry.word === 'Who' ? 'a person' : 'a thing' })),
    moment([ASK_RULE[entry.word] ?? ''], ASK_RULE[entry.word] ?? '', set(start, [`o${options.indexOf(entry.word)}`], { lit: true })),
    moment(['So the question is:', done], done, set(askScene(entry, options, true), ['q0'], { lit: true })),
  ];
}

function askWhy(question: Question): Moment[] {
  return askMoments(asked(str(question.facts, 'target')), optionsOf(question));
}

function questionWordsPart2(): Lesson {
  const five = scene(cardRow('f', ['Who', 'What', 'Where', 'When', 'Why'], 2.2, WIDE_COLS, 1.1, 0.5), WIDE_COLS);
  const sad = asked('___ is Sam sad?');
  const sadOptions = ['When', 'Why', 'Who', 'What'];
  const worked = askMoments(sad, sadOptions);
  const party = asked('___ is the party?');
  const partyScene = askScene(party, ['Why', 'Where', 'When', 'Who'], true);
  const first = turnQuestion('E-1-C8', 3, (f) => asked(str(f, 'target')).word === 'Why' && str(f, 'target') !== sad.question);
  const second = turnQuestion('E-1-C8', 3, (f) => str(f, 'target') === '___ do you go to bed?');
  return {
    parts: [
      show(moment(['You know who, what, where, and when. Now we add one more question word: why.'], 'Who? What? Where? When? Why?', set(five, ['f4'], { lit: true }))),
      show(moment(['Why asks for a reason. A reason tells what made something happen.'], 'Why: a reason', set(five, ['f4'], { lit: true, badge: 'a reason' }))),
      ...worked.map(show),
      show(moment(['Here is a trick. Put the word because in front of the answer. Sam is sad, because he lost his ball.'], 'because he lost his ball', set(calm(last(worked)), ['a0'], { lit: true, badge: 'because' }))),
      show(moment(['If that sounds right, the question word is why.'], 'because ... : Why', set(calm(last(worked)), ['q0'], { lit: true }))),
      turn(first, askWhy(first)),
      show(moment(['Do not mix up why and when. On Friday tells a time, so this question starts with when.'], 'When is the party?', set(partyScene, ['q0', 'a0'], { lit: true }))),
      turn(second, askWhy(second)),
      show(moment(['Read the answer. Is it a person, a thing, a place, a time, or a reason?'], 'Who? What? Where? When? Why?', calm(five))),
    ],
  };
}

export const LESSONS: Readonly<Record<string, () => Lesson>> = {
  'E-1-A2': blendsPart2,
  'E-1-A3': silentEPart2,
  'E-1-A7': endPartsPart2,
  'E-1-B1': sightFourPart2,
  'E-1-B3': meaningsPart2,
  'E-1-B5': abcOrderPart2,
  'E-1-B6': wordGroupsPart2,
  'E-1-C3': endMarksPart2,
  'E-1-C4': pronounsPart2,
  'E-1-C5': agreePart2,
  'E-1-C6': capitalsPart2,
  'E-1-C7': properNounsPart2,
  'E-1-C8': questionWordsPart2,
};
