// Grade 2 phonics and word lists (plan section 8, Language Arts grade 2). One picture keeps one name
// across every list.

export interface TeamWord {
  word: string;
  team: string; // the letters that make the sound: ai in rain, igh in light
  emoji: string;
}
const teams = (list: [string, string, string][]): readonly TeamWord[] => list.map(([word, team, emoji]) => ({ word, team, emoji }));

// A.1 More vowel teams. Level 1 and 2: ai, ay, ee, ea, oa, ow. Level 3: igh and ie. At level 1 the picture is
// not named, so every picture is one a child names one way: a plate is not a tray, a game pad is not play, one
// foot is not feet, and a shield is not a knight.
export const TEAMS_2: readonly string[] = ['ai', 'ay', 'ee', 'ea', 'oa', 'ow'];
export const TEAM_WORDS_2 = teams([
  ['rain', 'ai', '🌧️'], ['snail', 'ai', '🐌'], ['train', 'ai', '🚂'], ['crayon', 'ay', '🖍️'], ['hay', 'ay', '🌾'],
  ['tree', 'ee', '🌳'], ['bee', 'ee', '🐝'], ['sheep', 'ee', '🐑'], ['leaf', 'ea', '🍃'], ['peach', 'ea', '🍑'], ['seal', 'ea', '🦭'],
  ['boat', 'oa', '⛵'], ['goat', 'oa', '🐐'], ['soap', 'oa', '🧼'], ['bow', 'ow', '🎀'], ['snow', 'ow', '❄️'], ['bowl', 'ow', '🥣'],
]);
export const TEAMS_LONG_I: readonly string[] = ['igh', 'ie'];
export const LONG_I_WORDS = teams([['light', 'igh', '💡'], ['night', 'igh', '🌙'], ['pie', 'ie', '🥧'], ['tie', 'ie', '👔'], ['fries', 'ie', '🍟']]);

// A.2 Bossy r. ar and or sound different; er, ir and ur all sound the same, so the spelling is learned.
export const R_TEAMS: readonly string[] = ['ar', 'or', 'er', 'ir', 'ur'];
export const R_WORDS = teams([
  ['car', 'ar', '🚗'], ['star', 'ar', '⭐'], ['jar', 'ar', '🫙'], ['shark', 'ar', '🦈'], ['corn', 'or', '🌽'], ['fork', 'or', '🍴'], ['horse', 'or', '🐴'], ['storm', 'or', '⛈️'],
  ['her', 'er', '👩'], ['fern', 'er', '🌿'], ['bird', 'ir', '🐦'], ['shirt', 'ir', '👕'], ['girl', 'ir', '👧'], ['turtle', 'ur', '🐢'], ['nurse', 'ur', '🧑‍⚕️'], ['purse', 'ur', '👛'],
]);

// A.3 Two-syllable words, split where a reader splits them.
export const TWO_PARTS: readonly { word: string; parts: [string, string]; emoji: string }[] = (
  [
    ['rabbit', 'rab', 'bit', '🐇'], ['basket', 'bas', 'ket', '🧺'], ['kitten', 'kit', 'ten', '🐱'], ['muffin', 'muf', 'fin', '🧁'], ['napkin', 'nap', 'kin', '🧻'], ['pencil', 'pen', 'cil', '✏️'],
    ['tiger', 'ti', 'ger', '🐯'], ['robot', 'ro', 'bot', '🤖'], ['pumpkin', 'pump', 'kin', '🎃'], ['window', 'win', 'dow', '🪟'], ['monkey', 'mon', 'key', '🐒'], ['candle', 'can', 'dle', '🕯️'],
  ] as [string, string, string, string][]
).map(([word, a, b, emoji]) => ({ word, parts: [a, b], emoji }));
export const ONE_PART_WORDS: readonly string[] = ['cat', 'dog', 'sun', 'fish', 'tree', 'boat', 'star', 'cake'];
export const THREE_PART_WORDS: readonly string[] = ['banana', 'butterfly', 'dinosaur', 'elephant', 'tomato', 'computer'];

// B.1 Prefixes. The base word, and what the new word means.
export const PREFIXED: readonly { word: string; prefix: 'un' | 're'; base: string; meaning: string }[] = [
  { word: 'unhappy', prefix: 'un', base: 'happy', meaning: 'not happy' },
  { word: 'unlock', prefix: 'un', base: 'lock', meaning: 'the opposite of lock' },
  { word: 'unkind', prefix: 'un', base: 'kind', meaning: 'not kind' },
  { word: 'untie', prefix: 'un', base: 'tie', meaning: 'the opposite of tie' },
  { word: 'unsafe', prefix: 'un', base: 'safe', meaning: 'not safe' },
  { word: 'unpack', prefix: 'un', base: 'pack', meaning: 'the opposite of pack' },
  { word: 'redo', prefix: 're', base: 'do', meaning: 'do again' },
  { word: 'reread', prefix: 're', base: 'read', meaning: 'read again' },
  { word: 'refill', prefix: 're', base: 'fill', meaning: 'fill again' },
  { word: 'retell', prefix: 're', base: 'tell', meaning: 'tell again' },
  { word: 'rebuild', prefix: 're', base: 'build', meaning: 'build again' },
  { word: 'replay', prefix: 're', base: 'play', meaning: 'play again' },
];

// B.2 Suffixes, with the base word, what the word means and a sentence it fits. Each meaning is the base word
// with the meaning of its ending: ful "full of", less "without", er "more ... than another", est "the most ... of
// all". A noun takes ful and less, a describing word takes er and est.
export const SUFFIXED: readonly { word: string; suffix: 'ful' | 'less' | 'er' | 'est'; base: string; meaning: string; sentence: string }[] = [
  { word: 'helpful', suffix: 'ful', base: 'help', meaning: 'full of help', sentence: 'She is ___ and carries my bag.' },
  { word: 'careful', suffix: 'ful', base: 'care', meaning: 'full of care', sentence: 'Be ___ with the hot cup.' },
  { word: 'playful', suffix: 'ful', base: 'play', meaning: 'full of play', sentence: 'The ___ puppy runs after the ball.' },
  { word: 'careless', suffix: 'less', base: 'care', meaning: 'without care', sentence: 'He was ___ and dropped the eggs.' },
  { word: 'fearless', suffix: 'less', base: 'fear', meaning: 'without fear', sentence: 'The ___ girl climbs the tall tree.' },
  { word: 'useless', suffix: 'less', base: 'use', meaning: 'without use', sentence: 'A pen with no ink is ___.' },
  { word: 'taller', suffix: 'er', base: 'tall', meaning: 'more tall than another', sentence: 'My brother is ___ than me.' },
  { word: 'faster', suffix: 'er', base: 'fast', meaning: 'more fast than another', sentence: 'A car is ___ than a bike.' },
  { word: 'smaller', suffix: 'er', base: 'small', meaning: 'more small than another', sentence: 'A mouse is ___ than a cat.' },
  { word: 'tallest', suffix: 'est', base: 'tall', meaning: 'the most tall of all', sentence: 'The giraffe is the ___ animal in the zoo.' },
  { word: 'fastest', suffix: 'est', base: 'fast', meaning: 'the most fast of all', sentence: 'She is the ___ runner in the class.' },
  { word: 'smallest', suffix: 'est', base: 'small', meaning: 'the most small of all', sentence: 'The ___ kitten sleeps in the box.' },
];

// B.3 Contractions.
export const CONTRACTIONS: readonly { short: string; long: string; sentence: string }[] = [
  { short: "can't", long: 'can not', sentence: 'I ___ find my shoe.' },
  { short: "don't", long: 'do not', sentence: 'We ___ have a cat.' },
  { short: "isn't", long: 'is not', sentence: 'The bus ___ here yet.' },
  { short: "it's", long: 'it is', sentence: '___ time for lunch.' },
  { short: "I'm", long: 'I am', sentence: '___ six years old.' },
  { short: "we're", long: 'we are', sentence: '___ going to the park.' },
  { short: "you're", long: 'you are', sentence: '___ my best friend.' },
  { short: "didn't", long: 'did not', sentence: 'She ___ see the bird.' },
  { short: "I'll", long: 'I will', sentence: '___ help you clean up.' },
  { short: "they're", long: 'they are', sentence: '___ playing in the snow.' },
];

// B.4 Synonyms and antonyms. Level 3 uses the harder words.
// Shut goes with closed, not close: close can also be said to mean near, and these words are heard.
export const SYNONYMS: readonly (readonly [string, string])[] = [['big', 'large'], ['small', 'little'], ['happy', 'glad'], ['quick', 'fast'], ['shout', 'yell'], ['begin', 'start'], ['sick', 'ill'], ['shut', 'closed']];
export const ANTONYMS: readonly (readonly [string, string])[] = [['hot', 'cold'], ['up', 'down'], ['full', 'empty'], ['early', 'late'], ['push', 'pull'], ['wet', 'dry'], ['loud', 'quiet'], ['win', 'lose']];
export const SYNONYMS_HARD: readonly (readonly [string, string])[] = [['huge', 'giant'], ['tiny', 'small'], ['angry', 'mad'], ['easy', 'simple'], ['scared', 'afraid'], ['smart', 'clever']];
export const ANTONYMS_HARD: readonly (readonly [string, string])[] = [['brave', 'scared'], ['never', 'always'], ['shallow', 'deep'], ['noisy', 'silent'], ['rough', 'smooth'], ['asleep', 'awake']];

// B.5 Homophones: words that sound the same. Each sentence takes exactly one of its group.
export const HOMOPHONES: readonly { group: readonly string[]; word: string; sentence: string }[] = [
  { group: ['to', 'two', 'too'], word: 'two', sentence: 'I have ___ dogs.' },
  { group: ['to', 'two', 'too'], word: 'to', sentence: 'We walk ___ school.' },
  { group: ['to', 'two', 'too'], word: 'too', sentence: 'The soup is ___ hot.' },
  { group: ['there', 'their'], word: 'there', sentence: 'Put the box over ___.' },
  { group: ['there', 'their'], word: 'their', sentence: 'The kids lost ___ ball.' },
  { group: ['for', 'four'], word: 'four', sentence: 'A dog has ___ legs.' },
  { group: ['for', 'four'], word: 'for', sentence: 'This gift is ___ you.' },
  { group: ['see', 'sea'], word: 'sea', sentence: 'Fish swim in the ___.' },
  { group: ['see', 'sea'], word: 'see', sentence: 'I can ___ the moon.' },
  { group: ['one', 'won'], word: 'won', sentence: 'Our team ___ the game.' },
  { group: ['one', 'won'], word: 'one', sentence: 'I ate ___ apple.' },
  { group: ['right', 'write'], word: 'write', sentence: 'I can ___ my name.' },
];

// C.1 Nouns, verbs, adjectives.
export const NOUNS_2: readonly string[] = ['dog', 'ball', 'tree', 'house', 'teacher', 'apple', 'river', 'book'];
export const VERBS_2: readonly string[] = ['run', 'jump', 'swim', 'write', 'sing', 'climb', 'throw', 'sleep'];
export const ADJECTIVES_2: readonly string[] = ['big', 'red', 'soft', 'happy', 'cold', 'tall', 'noisy', 'shiny'];

// C.2 Plurals.
export const PLURALS_S: readonly (readonly [string, string])[] = [['cat', 'cats'], ['book', 'books'], ['tree', 'trees'], ['frog', 'frogs'], ['box', 'boxes'], ['bus', 'buses'], ['dish', 'dishes'], ['fox', 'foxes'], ['lunch', 'lunches'], ['glass', 'glasses']];
export const PLURALS_IES: readonly (readonly [string, string])[] = [['baby', 'babies'], ['pony', 'ponies'], ['berry', 'berries'], ['puppy', 'puppies'], ['city', 'cities'], ['story', 'stories'], ['party', 'parties']];
export const PLURALS_ODD: readonly (readonly [string, string])[] = [['mouse', 'mice'], ['foot', 'feet'], ['child', 'children'], ['tooth', 'teeth'], ['man', 'men'], ['goose', 'geese'], ['woman', 'women']];

// C.3 Past tense.
export const PAST_ED: readonly (readonly [string, string])[] = [['jump', 'jumped'], ['play', 'played'], ['walk', 'walked'], ['help', 'helped'], ['look', 'looked'], ['call', 'called'], ['pull', 'pulled'], ['kick', 'kicked']];
export const PAST_ODD: readonly (readonly [string, string])[] = [['run', 'ran'], ['see', 'saw'], ['go', 'went'], ['eat', 'ate'], ['sit', 'sat'], ['swim', 'swam'], ['make', 'made'], ['come', 'came']];
// A sentence that needs the past: "Yesterday we ___ to the park." with the verb it needs, and the words that
// tell it already happened (each sentence starts with them).
export const PAST_SENTENCES: readonly { verb: string; sentence: string; clue: string }[] = [
  { verb: 'go', sentence: 'Yesterday we ___ to the park.', clue: 'Yesterday' },
  { verb: 'eat', sentence: 'Last night I ___ a big dinner.', clue: 'Last night' },
  { verb: 'jump', sentence: 'Yesterday the frog ___ into the pond.', clue: 'Yesterday' },
  { verb: 'see', sentence: 'Last week I ___ a rainbow.', clue: 'Last week' },
  { verb: 'play', sentence: 'Yesterday we ___ tag at recess.', clue: 'Yesterday' },
  { verb: 'run', sentence: 'Yesterday Sam ___ to the bus.', clue: 'Yesterday' },
  { verb: 'swim', sentence: 'Last summer we ___ in the lake.', clue: 'Last summer' },
  { verb: 'help', sentence: 'Yesterday I ___ Mom bake a cake.', clue: 'Yesterday' },
];

// C.4 Punctuation. Each item: the sentence written right, and the wrong ways it is offered beside it. An owner is
// a name, never a word like dog that could mean more than one, so "The dogs' bone" can never be right too.
export const PUNCTUATION: readonly { kind: 'capital' | 'comma' | 'apostrophe'; right: string; wrong: readonly string[] }[] = [
  { kind: 'capital', right: 'My friend Maya lives in Ohio.', wrong: ['My friend maya lives in Ohio.', 'My friend Maya lives in ohio.'] },
  { kind: 'capital', right: 'We went to see Grandpa Joe.', wrong: ['We went to see grandpa joe.', 'We went to see Grandpa joe.'] },
  { kind: 'capital', right: 'Ben and I play in Texas.', wrong: ['ben and I play in Texas.', 'Ben and i play in texas.'] },
  { kind: 'capital', right: 'Lily has a dog named Rex.', wrong: ['lily has a dog named Rex.', 'Lily has a dog named rex.'] },
  { kind: 'comma', right: 'I like apples, pears, and grapes.', wrong: ['I like apples pears and grapes.', 'I like, apples pears, and grapes.'] },
  { kind: 'comma', right: 'We need milk, eggs, and bread.', wrong: ['We need milk eggs and bread.', 'We need, milk eggs and, bread.'] },
  { kind: 'comma', right: 'She has a cat, a dog, and a fish.', wrong: ['She has a cat a dog and a fish.', 'She has, a cat a dog, and a fish.'] },
  { kind: 'comma', right: 'Red, blue, and green are colors.', wrong: ['Red blue and green are colors.', 'Red, blue and, green are colors.'] },
  { kind: 'apostrophe', right: "That is Tom's hat.", wrong: ['That is Toms hat.', "That is Toms' hat."] },
  { kind: 'apostrophe', right: "Ben's kite is red.", wrong: ['Bens kite is red.', "Bens' kite is red."] },
  { kind: 'apostrophe', right: "I sat on Mia's bike.", wrong: ['I sat on Mias bike.', "I sat on Mias' bike."] },
  { kind: 'apostrophe', right: "Dad's car is blue.", wrong: ['Dads car is blue.', "Dads' car is blue."] },
];
