// Word lists of plan section 15 wave H4 (Language Arts grades 1 and 2): ABC order, word groups,
// shades of meaning, words with two meanings, guide words and group names.

// ---- Grade 1 B.5 ABC order: every word starts with a different letter ----
export const ABC_WORDS_1: readonly string[] = [
  'apple', 'ball', 'cat', 'dog', 'egg', 'fish', 'goat', 'hat', 'jam', 'kite', 'lion', 'moon',
  'nest', 'pig', 'queen', 'rain', 'sun', 'top', 'van', 'web', 'yak', 'zoo',
];

// ---- Grade 2 B.8 ABC order to the second letter: each group shares a first letter, never a second ----
export const ABC_GROUPS_2: readonly (readonly string[])[] = [
  ['bag', 'bed', 'bird', 'black', 'box', 'brown', 'bus'],
  ['sand', 'seed', 'ship', 'sky', 'snow', 'sock', 'star', 'sun'],
  ['table', 'tent', 'tiger', 'top', 'truck', 'tub'],
  ['map', 'men', 'milk', 'moon', 'mud'],
  ['pan', 'pen', 'pig', 'plum', 'pot', 'pup'],
  ['cake', 'clap', 'coat', 'crab', 'cup'],
];

// ---- Grade 2 B.9 Guide words: words across the alphabet, for a dictionary page ----
export const DICTIONARY_WORDS: readonly string[] = [
  'ant', 'bat', 'bell', 'cake', 'cup', 'dig', 'duck', 'egg', 'fan', 'fox', 'game', 'gift', 'hen', 'hop',
  'ink', 'jam', 'jet', 'kite', 'lamp', 'log', 'map', 'mop', 'nest', 'nut', 'owl', 'pan', 'pig', 'rain',
  'rock', 'sand', 'sock', 'tent', 'top', 'van', 'web', 'wig', 'yak', 'zip',
];

// ---- Grade 1 B.6 Word groups. A word is in one group only. ----
export const WORD_GROUPS: readonly { name: string; words: readonly string[] }[] = [
  { name: 'colors', words: ['red', 'blue', 'green', 'pink', 'brown', 'purple'] },
  { name: 'clothes', words: ['shirt', 'sock', 'hat', 'coat', 'dress', 'boot'] },
  { name: 'foods', words: ['bread', 'milk', 'egg', 'rice', 'soup', 'cake'] },
  { name: 'body parts', words: ['hand', 'foot', 'nose', 'ear', 'knee', 'arm'] },
  { name: 'things that go', words: ['bus', 'car', 'train', 'boat', 'truck', 'bike'] },
];

// ---- Grade 2 B.6 Shades of meaning: weakest first ----
export const SHADES: readonly (readonly [string, string, string])[] = [
  ['warm', 'hot', 'boiling'],
  ['cool', 'cold', 'freezing'],
  ['whisper', 'talk', 'shout'],
  ['walk', 'jog', 'sprint'],
  ['nibble', 'eat', 'gobble'],
  ['sip', 'drink', 'gulp'],
  ['good', 'great', 'amazing'],
  ['damp', 'wet', 'soaked'],
  ['tap', 'knock', 'bang'],
];

// ---- Grade 2 B.7 Words with two meanings. Each sentence uses the meaning in the same place. ----
// An action meaning has no "to" in front, so "uses fly to mean move through the air" reads right.
export interface TwoMeanings {
  word: string;
  meanings: readonly [string, string];
  sentences: readonly [string, string];
}
export const TWO_MEANINGS: readonly TwoMeanings[] = [
  { word: 'bat', meanings: ['an animal that flies at night', 'a stick for hitting a ball'], sentences: ['The bat flew out of the cave.', 'She hit the ball with the bat.'] },
  { word: 'bark', meanings: ['the sound a dog makes', 'the outside of a tree'], sentences: ['The dog let out a loud bark.', 'The bark on the old tree is rough.'] },
  { word: 'ring', meanings: ['a band worn on a finger', 'make a bell sound'], sentences: ['Mom wears a gold ring.', 'The bell will ring at noon.'] },
  { word: 'fly', meanings: ['a small bug with wings', 'move through the air'], sentences: ['A fly sat on my cake.', 'Birds can fly up high.'] },
  { word: 'duck', meanings: ['a bird that swims', 'bend down fast'], sentences: ['A duck swam in the pond.', 'Duck under the low branch!'] },
  { word: 'park', meanings: ['a place with grass to play', 'stop a car and leave it'], sentences: ['We had a picnic at the park.', 'Dad will park the car here.'] },
  { word: 'watch', meanings: ['a small clock worn on the wrist', 'look at something'], sentences: ['My new watch tells the time.', 'We like to watch the birds.'] },
  { word: 'top', meanings: ['a toy that spins', 'the highest part'], sentences: ['The top spun round and round.', 'We climbed to the top of the hill.'] },
];

// ---- Grade 2 C.5 Group names ----
export const COLLECTIVES: readonly { group: string; things: string; emoji: string }[] = [
  { group: 'herd', things: 'cows', emoji: '🐄' },
  { group: 'flock', things: 'birds', emoji: '🐦' },
  { group: 'school', things: 'fish', emoji: '🐟' },
  { group: 'pack', things: 'wolves', emoji: '🐺' },
  { group: 'swarm', things: 'bees', emoji: '🐝' },
  { group: 'pride', things: 'lions', emoji: '🦁' },
  { group: 'bunch', things: 'grapes', emoji: '🍇' },
  { group: 'stack', things: 'pancakes', emoji: '🥞' },
];
