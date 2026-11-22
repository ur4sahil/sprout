// Word puzzles for Reasoning A.15 and A.16 (plan section 15.1, phase I): the kinds gifted-screening tests use.
// The wording audit (Nov 22, 2026) chose everyday words a young child knows: a pig lives in a pen, not a sty, a crow
// is black (not coal), and key is only a door key (the key of a piano left the parts).

// Word pairs that share a relation. "Bird is to nest as bee is to hive."
export const VERBAL_RELATIONS: Record<string, { says: string; pairs: readonly (readonly [string, string])[] }> = {
  opposite: { says: 'is the opposite of', pairs: [['hot', 'cold'], ['up', 'down'], ['big', 'small'], ['day', 'night'], ['wet', 'dry'], ['fast', 'slow'], ['full', 'empty'], ['open', 'shut']] },
  home: { says: 'lives in', pairs: [['bird', 'nest'], ['bee', 'hive'], ['spider', 'web'], ['horse', 'stable'], ['fish', 'pond'], ['pig', 'pen']] },
  baby: { says: 'has a baby called', pairs: [['cat', 'kitten'], ['dog', 'puppy'], ['cow', 'calf'], ['sheep', 'lamb'], ['hen', 'chick'], ['bear', 'cub'], ['horse', 'foal']] },
  makes: { says: 'gives us', pairs: [['bee', 'honey'], ['cow', 'milk'], ['hen', 'egg'], ['sheep', 'wool'], ['tree', 'wood']] },
  colour: { says: 'is the color', pairs: [['grass', 'green'], ['sky', 'blue'], ['snow', 'white'], ['banana', 'yellow'], ['cherry', 'red'], ['crow', 'black']] },
  part: { says: 'is part of', pairs: [['wheel', 'car'], ['page', 'book'], ['petal', 'flower'], ['finger', 'hand'], ['leaf', 'tree'], ['nose', 'face']] },
  tool: { says: 'is used with', pairs: [['pencil', 'paper'], ['broom', 'floor'], ['spoon', 'soup'], ['brush', 'hair'], ['key', 'lock'], ['bat', 'ball']] },
};

// The sentence the explanation says for each pair, with its articles: "A bee lives in a hive."
export const PAIR_SENTENCES: Readonly<Record<string, string>> = {
  'hot|cold': 'Hot is the opposite of cold.',
  'up|down': 'Up is the opposite of down.',
  'big|small': 'Big is the opposite of small.',
  'day|night': 'Day is the opposite of night.',
  'wet|dry': 'Wet is the opposite of dry.',
  'fast|slow': 'Fast is the opposite of slow.',
  'full|empty': 'Full is the opposite of empty.',
  'open|shut': 'Open is the opposite of shut.',
  'bird|nest': 'A bird lives in a nest.',
  'bee|hive': 'A bee lives in a hive.',
  'spider|web': 'A spider lives in a web.',
  'horse|stable': 'A horse lives in a stable.',
  'fish|pond': 'A fish lives in a pond.',
  'pig|pen': 'A pig lives in a pen.',
  'cat|kitten': "A cat's baby is a kitten.",
  'dog|puppy': "A dog's baby is a puppy.",
  'cow|calf': "A cow's baby is a calf.",
  'sheep|lamb': "A sheep's baby is a lamb.",
  'hen|chick': "A hen's baby is a chick.",
  'bear|cub': "A bear's baby is a cub.",
  'horse|foal': "A horse's baby is a foal.",
  'bee|honey': 'A bee gives us honey.',
  'cow|milk': 'A cow gives us milk.',
  'hen|egg': 'A hen gives us eggs.',
  'sheep|wool': 'A sheep gives us wool.',
  'tree|wood': 'A tree gives us wood.',
  'grass|green': 'Grass is green.',
  'sky|blue': 'The sky is blue.',
  'snow|white': 'Snow is white.',
  'banana|yellow': 'A banana is yellow.',
  'cherry|red': 'A cherry is red.',
  'crow|black': 'A crow is black.',
  'wheel|car': 'A wheel is part of a car.',
  'page|book': 'A page is part of a book.',
  'petal|flower': 'A petal is part of a flower.',
  'finger|hand': 'A finger is part of a hand.',
  'leaf|tree': 'A leaf is part of a tree.',
  'nose|face': 'A nose is part of a face.',
  'pencil|paper': 'A pencil is used on paper.',
  'broom|floor': 'A broom is used on the floor.',
  'spoon|soup': 'A spoon is used to eat soup.',
  'brush|hair': 'A brush is used on hair.',
  'key|lock': 'A key is used in a lock.',
  'bat|ball': 'A bat is used to hit a ball.',
};

// A word that goes with a first word in another way, for the near miss of the hard level, beside the pairs of the
// other relations (a bee gives us honey, so honey is the near miss for "bee is to hive"). None of them fits the
// relation: a wheel is not part of round.
export const NEAR_MISSES: Readonly<Record<string, readonly string[]>> = {
  wheel: ['round'],
  page: ['read'],
  petal: ['pink'],
  finger: ['ring'],
  leaf: ['green'],
  nose: ['smell'],
  pencil: ['sharp'],
  broom: ['sweep'],
  spoon: ['stir'],
  tree: ['green'],
};

// A first word and a wrong word a child could argue go together: a bird lives in a tree too, a tree gives us paper,
// snow is cold. Never offered as an unrelated wrong word.
export const VERBAL_CLASHES: readonly (readonly [string, string])[] = [
  ['bird', 'tree'],
  ['bird', 'egg'],
  ['bee', 'tree'],
  ['bee', 'flower'],
  ['bee', 'yellow'],
  ['spider', 'tree'],
  ['cat', 'milk'],
  ['dog', 'ball'],
  ['bear', 'honey'],
  ['tree', 'paper'],
  ['tree', 'green'],
  ['snow', 'cold'],
  ['cherry', 'tree'],
  ['crow', 'nest'],
  ['crow', 'tree'],
  ['hot', 'soup'],
  ['open', 'book'],
  ['open', 'lock'],
  ['fast', 'car'],
  ['spoon', 'honey'],
  ['spoon', 'egg'],
  ['spoon', 'milk'],
  ['pencil', 'pen'],
  ['brush', 'paper'],
];

// A word few young children know. It may be a near miss to turn down, but it is never asked for or shown in an
// example pair.
export const NOT_ASKED: ReadonlySet<string> = new Set(['foal']);

// Groups of words for "which word does not belong". Close groups make the hard level.
export const WORD_CLASSES: Record<string, readonly string[]> = {
  fruit: ['apple', 'banana', 'grape', 'pear', 'peach', 'plum'],
  vegetable: ['carrot', 'pea', 'onion', 'potato', 'bean', 'corn'],
  farmAnimal: ['cow', 'pig', 'sheep', 'goat', 'hen', 'horse'],
  wildAnimal: ['lion', 'tiger', 'zebra', 'bear', 'wolf', 'fox'],
  land: ['car', 'bus', 'truck', 'bike', 'train', 'van'],
  water: ['boat', 'ship', 'canoe', 'raft', 'sailboat'],
  clothes: ['shirt', 'sock', 'hat', 'coat', 'scarf', 'dress'],
  furniture: ['chair', 'table', 'bed', 'sofa', 'desk', 'shelf'],
  colour: ['red', 'blue', 'green', 'yellow', 'pink', 'purple'],
  shape: ['circle', 'square', 'triangle', 'oval', 'star', 'heart'],
  weather: ['rain', 'snow', 'wind', 'storm', 'sunshine'],
};
export const CLOSE_CLASSES: readonly (readonly [string, string])[] = [['fruit', 'vegetable'], ['farmAnimal', 'wildAnimal'], ['land', 'water'], ['clothes', 'furniture'], ['colour', 'shape']];

// Words that are also a member of another group: a peach and a plum are colors too, so they are never the word
// that does not belong among colors.
export const ALSO_IN: Readonly<Record<string, readonly string[]>> = { colour: ['peach', 'plum'] };
