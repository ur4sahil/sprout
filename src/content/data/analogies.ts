// Analogy pairs (plan section 9). An analogy uses two pairs from one relation.
// Every picture is spoken when tapped. `why` is the sentence the explanation says for the pair.

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
  ['livesIn', 'bird', '🐦', 'tree', '🌳', 'A bird lives in a tree.'],
  ['livesIn', 'spider', '🕷️', 'web', '🕸️', 'A spider lives in a web.'],
  ['weather', 'rain', '🌧️', 'umbrella', '☂️', 'In the rain we use an umbrella.'],
  ['weather', 'sun', '☀️', 'sunglasses', '🕶️', 'In the sun we wear sunglasses.'],
  ['weather', 'snow', '❄️', 'scarf', '🧣', 'In the snow we wear a scarf.'],
];

export const ANALOGY_PAIRS: readonly AnalogyPair[] = ROWS.map(([relation, word, emoji, word2, emoji2, why]) => ({
  relation,
  first: { word, emoji },
  second: { word: word2, emoji: emoji2 },
  why,
}));

// A first word and a second half from another relation that could be argued to go together.
// They are never offered in one question: a bird does lay an egg, and rain is water.
export const ANALOGY_CLASHES: readonly (readonly [string, string])[] = [
  ['bird', 'egg'],
  ['hen', 'tree'],
  ['rain', 'water'],
  ['snow', 'water'],
  ['fish', 'soup'],
  ['bee', 'tree'],
  ['sun', 'tree'],
];
