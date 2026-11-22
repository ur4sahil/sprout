// Analogy pairs (plan section 9). An analogy uses two pairs from one relation.
// Every picture is spoken when tapped. `why` is the sentence the explanation says for the pair.
// Each pair is one to one (the wording audit, Nov 22, 2026): a bird goes with a nest, not a tree, which a spider
// or a bee could live in too, and the weather pairs are gone, because rain, sun and snow each went with more than
// one of their pictures (an umbrella in the snow or the sun, sunglasses in the snow). 'weather' stays a relation
// name, with no pairs, because the lessons name it.

export type AnalogyRelation = 'wornOn' | 'makes' | 'usedWith' | 'livesIn' | 'weather';

export interface AnalogyPair {
  relation: AnalogyRelation;
  first: { word: string; emoji: string };
  second: { word: string; emoji: string };
  why: string;
}

const ROWS: [AnalogyRelation, string, string, string, string, string][] = [
  ['wornOn', 'sock', '🧦', 'foot', '🦶', 'A sock goes on a foot.'],
  ['wornOn', 'glove', '🧤', 'hand', '✋', 'A glove goes on a hand.'],
  ['wornOn', 'glasses', '👓', 'eyes', '👀', 'Glasses go on eyes.'],
  ['makes', 'bee', '🐝', 'honey', '🍯', 'A bee makes honey.'],
  ['makes', 'cow', '🐄', 'milk', '🥛', 'A cow makes milk.'],
  ['makes', 'hen', '🐔', 'egg', '🥚', 'A hen makes an egg.'],
  ['usedWith', 'key', '🔑', 'lock', '🔒', 'A key is used with a lock.'],
  ['usedWith', 'pencil', '✏️', 'paper', '📄', 'A pencil is used with paper.'],
  ['usedWith', 'spoon', '🥄', 'soup', '🍲', 'A spoon is used with soup.'],
  ['livesIn', 'fish', '🐟', 'water', '🌊', 'A fish lives in water.'],
  ['livesIn', 'bird', '🐦', 'nest', '🪺', 'A bird lives in a nest.'],
  ['livesIn', 'spider', '🕷️', 'web', '🕸️', 'A spider lives in a web.'],
];

export const ANALOGY_PAIRS: readonly AnalogyPair[] = ROWS.map(([relation, word, emoji, word2, emoji2, why]) => ({
  relation,
  first: { word, emoji },
  second: { word: word2, emoji: emoji2 },
  why,
}));

// A first word and a second half from another relation that could be argued to go together.
// They are never offered in one question: a bird does lay an egg, a hen sits on a nest, a pencil is held in a hand,
// and a spoon is used with honey, an egg or milk too.
export const ANALOGY_CLASHES: readonly (readonly [string, string])[] = [
  ['bird', 'egg'],
  ['fish', 'soup'],
  ['hen', 'nest'],
  ['bee', 'nest'],
  ['pencil', 'hand'],
  ['spoon', 'hand'],
  ['spoon', 'honey'],
  ['spoon', 'egg'],
  ['spoon', 'milk'],
];
