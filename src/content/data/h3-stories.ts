// Sentences, sequences and names for plan section 15 wave H3: Language Arts pre-K D and
// kindergarten C.4, D.4 to D.6 and E.4 to E.7. Made-up first names only.

import type { Pic } from './h3-words';

const pic = ([word, emoji]: readonly [string, string]): Pic => ({ word, emoji });

// ---- Things that happen in order (pre-K D.1, kindergarten E.4) ----
// Each sequence has one order only. Sequences in groups that sit close are never offered
// against each other: after rain a plant could grow.

export type StepGroup = 'weather' | 'growing' | 'food' | 'day';

export interface Sequence {
  id: string;
  group: StepGroup;
  steps: readonly Pic[];
  lines: readonly string[]; // one sentence for each step, said in the explanation
}

const SEQUENCE_ROWS: [string, StepGroup, [string, string][], string[]][] = [
  ['rain', 'weather', [['cloud', '☁️'], ['rain', '🌧️'], ['rainbow', '🌈']], ['Clouds fill the sky.', 'Rain falls.', 'A rainbow comes out.']],
  ['snowman', 'weather', [['snow', '🌨️'], ['snowman', '⛄'], ['water', '💧']], ['Snow falls.', 'We build a snowman.', 'The sun melts it into water.']],
  ['ice', 'weather', [['ice', '🧊'], ['water', '💧']], ['Here is some ice.', 'It melts into water.']],
  ['grow', 'growing', [['baby', '👶'], ['boy', '👦'], ['man', '👨']], ['First a baby.', 'The baby grows into a boy.', 'The boy grows into a man.']],
  ['chick', 'growing', [['egg', '🥚'], ['hatching chick', '🐣'], ['hen', '🐔']], ['An egg is laid.', 'A chick hatches out.', 'The chick grows into a hen.']],
  ['plant', 'growing', [['plant', '🌱'], ['flower', '🌸']], ['A little plant comes up.', 'It grows a flower.']],
  ['bread', 'food', [['wheat', '🌾'], ['bread', '🍞'], ['sandwich', '🥪']], ['Wheat grows in a field.', 'The wheat is baked into bread.', 'The bread makes a sandwich.']],
  ['popcorn', 'food', [['corn', '🌽'], ['popcorn', '🍿']], ['Here is some corn.', 'It pops into popcorn.']],
  ['morning', 'day', [['alarm clock', '⏰'], ['toothbrush', '🪥'], ['school', '🏫']], ['The alarm clock rings.', 'We brush our teeth.', 'We go to school.']],
  ['mail', 'day', [['pencil', '✏️'], ['envelope', '✉️'], ['mailbox', '📫']], ['We write a note with a pencil.', 'We put the note in an envelope.', 'The envelope goes in the mailbox.']],
  ['dress', 'day', [['sock', '🧦'], ['shoe', '👟']], ['First we put on a sock.', 'Then the shoe goes on.']],
];

export const SEQUENCES: readonly Sequence[] = SEQUENCE_ROWS.map(([id, group, steps, lines]) => ({ id, group, steps: steps.map(pic), lines }));

export const STEP_CLOSE: readonly (readonly [StepGroup, StepGroup])[] = [['weather', 'growing']];

// ---- Who did it? (pre-K D.2, heard; kindergarten E.7, read) ----
// `others` are the other characters in the sentence. They are offered as wrong answers.

export interface WhoSentence {
  sentence: string;
  ask: string;
  answer: Pic;
  others: readonly Pic[];
}

const WHO_ROWS: [string, string, [string, string], [string, string][]][] = [
  ['The duck swims in the pond.', 'Who swims?', ['duck', '🦆'], []],
  ['The cat naps on the bed.', 'Who naps?', ['cat', '🐱'], []],
  ['The frog hops on a log.', 'Who hops?', ['frog', '🐸'], []],
  ['The pig rolls in the mud.', 'Who rolls in the mud?', ['pig', '🐷'], []],
  ['The bee buzzes by a flower.', 'Who buzzes?', ['bee', '🐝'], []],
  ['The lion roars at the sun.', 'Who roars?', ['lion', '🦁'], []],
  ['The girl reads a book.', 'Who reads?', ['girl', '👧'], []],
  ['The horse runs up the hill.', 'Who runs up the hill?', ['horse', '🐴'], []],
  ['The dog chases the cat.', 'Who chases?', ['dog', '🐶'], [['cat', '🐱']]],
  ['The girl hugs the dog.', 'Who gets a hug?', ['dog', '🐶'], [['girl', '👧']]],
  ['The duck follows the hen.', 'Who follows?', ['duck', '🦆'], [['hen', '🐔']]],
  ['The boy feeds the pig.', 'Who gets fed?', ['pig', '🐷'], [['boy', '👦']]],
  ['The frog jumps over the fish.', 'Who jumps?', ['frog', '🐸'], [['fish', '🐟']]],
  ['The baby waves at the man.', 'Who waves?', ['baby', '👶'], [['man', '👨']]],
  ['The cow looks at the rabbit.', 'Who looks?', ['cow', '🐄'], [['rabbit', '🐰']]],
  ['The woman pats the horse.', 'Who gets a pat?', ['horse', '🐴'], [['woman', '👩']]],
  ['The mouse runs from the cat.', 'Who runs away?', ['mouse', '🐭'], [['cat', '🐱']]],
  ['The man helps the girl.', 'Who helps?', ['man', '👨'], [['girl', '👧']]],
];

export const WHO_SENTENCES: readonly WhoSentence[] = WHO_ROWS.map(([sentence, ask, answer, others]) => ({ sentence, ask, answer: pic(answer), others: others.map(pic) }));

// Every character in the list, for wrong answers that are not in the sentence.
export const WHO_CHARACTERS: readonly Pic[] = [...new Map(WHO_SENTENCES.flatMap((each) => [each.answer, ...each.others]).map((each) => [each.word, each])).values()];

// ---- Real or make-believe (kindergarten E.5) ----

export interface RealSentence {
  sentence: string;
  real: boolean;
  subject: Pic;
  thing: boolean; // about a thing or the sky, not an animal or a person
}

const REAL_ROWS: [string, boolean, [string, string], boolean][] = [
  ['A dog can run.', true, ['dog', '🐶'], false],
  ['A fish can swim.', true, ['fish', '🐟'], false],
  ['A bird can fly.', true, ['bird', '🐦'], false],
  ['A frog can jump.', true, ['frog', '🐸'], false],
  ['A cat can climb a tree.', true, ['cat', '🐱'], false],
  ['A cow can eat grass.', true, ['cow', '🐄'], false],
  ['A baby can cry.', true, ['baby', '👶'], false],
  ['A duck can swim in a pond.', true, ['duck', '🦆'], false],
  ['A dog can read a book.', false, ['dog', '🐶'], false],
  ['A fish can ride a bike.', false, ['fish', '🐟'], false],
  ['A pig can fly in the sky.', false, ['pig', '🐷'], false],
  ['A frog can drive a car.', false, ['frog', '🐸'], false],
  ['A cat can bake a cake.', false, ['cat', '🐱'], false],
  ['A cow can jump over the moon.', false, ['cow', '🐄'], false],
  ['A bear can talk on the phone.', false, ['bear', '🐻'], false],
  ['A rabbit can drive a bus.', false, ['rabbit', '🐰'], false],
  ['A car can go fast.', true, ['car', '🚗'], true],
  ['A tree can grow tall.', true, ['tree', '🌳'], true],
  ['A boat can float.', true, ['boat', '⛵'], true],
  ['A plane can fly.', true, ['plane', '✈️'], true],
  ['The sun is hot.', true, ['sun', '☀️'], true],
  ['A ball can roll.', true, ['ball', '⚽'], true],
  ['A rocket can go to the moon.', true, ['rocket', '🚀'], true],
  ['A clock can tell the time.', true, ['clock', '🕐'], true],
  ['A car can sing a song.', false, ['car', '🚗'], true],
  ['A tree can dance.', false, ['tree', '🌳'], true],
  ['A boat can eat lunch.', false, ['boat', '⛵'], true],
  ['A plane can read a book.', false, ['plane', '✈️'], true],
  ['The sun can wave at us.', false, ['sun', '☀️'], true],
  ['A ball can talk.', false, ['ball', '⚽'], true],
  ['A rocket can sleep in a bed.', false, ['rocket', '🚀'], true],
  ['A clock can jump rope.', false, ['clock', '🕐'], true],
];

export const REAL_SENTENCES: readonly RealSentence[] = REAL_ROWS.map(([sentence, real, subject, thing]) => ({ sentence, real, subject: pic(subject), thing }));

// ---- Count the words (kindergarten D.6) ----

export const COUNT_SENTENCES: readonly string[] = [
  'I run.', 'We sing.', 'Dogs bark.', 'Birds fly.', 'Fish swim.', 'Sit down.', 'Come here.', 'Look up.',
  'I see you.', 'We can run.', 'The cat sat.', 'He can hop.', 'The fox ran.', 'I like cake.', 'She can swim.', 'Look at me.',
  'The dog can jump.', 'I like my bed.', 'The sun is hot.', 'She has a pet.', 'We go to school.', 'I see a bug.', 'The pig is big.', 'My hat is red.',
  'I see a red hat.', 'We go to the park.', 'The duck can swim fast.', 'I have a big dog.', 'My cat likes to nap.', 'He has a blue ball.', 'The bird sings a song.', 'We like to play ball.',
  'The cat is on the mat.', 'The frog sat on a log.', 'I can see the big moon.', 'The dog ran to the park.', 'I want to go to bed.', 'The bug is on my hat.', 'We can play in the snow.', 'He can see a red bus.',
];

// ---- Sight words in a sentence (kindergarten C.4) ----
// `wrong` words do not fit the gap. Words that could fit are never offered. The gap is never last,
// because the screen puts a space between the gap and the words after it.

export interface GapSentence {
  before: string;
  after: string;
  answer: string;
  wrong: readonly string[];
}

const GAP_ROWS: [string, string, string, string[]][] = [
  ['I', 'a cat.', 'see', ['go', 'is']],
  ['The dog can', 'fast.', 'run', ['the', 'my']],
  ['We', 'to the park.', 'go', ['is', 'my']],
  ['Look at', 'ball.', 'my', ['go', 'can']],
  ['I can', 'you.', 'see', ['is', 'my']],
  ['The cat is', 'the box.', 'in', ['go', 'can']],
  ['Can you', 'me?', 'help', ['is', 'the']],
  ['It is a', 'dog.', 'big', ['go', 'and']],
  ['I have', 'red hat.', 'a', ['go', 'is']],
  ['We', 'a pet.', 'have', ['is', 'to']],
  ['The sun is', 'in the sky.', 'up', ['the', 'and']],
  ['Come and', 'with me.', 'play', ['the', 'is']],
  ['Where', 'my cat?', 'is', ['go', 'the']],
  ['I like', 'red ball.', 'the', ['go', 'is']],
];

export const GAP_SENTENCES: readonly GapSentence[] = GAP_ROWS.map(([before, after, answer, wrong]) => ({ before, after, answer, wrong }));

// The whole sentence with its word in the gap.
export const filled = (gap: GapSentence): string => `${gap.before} ${gap.answer} ${gap.after}`;

// ---- Question words (kindergarten D.5) ----

export type QuestionWord = 'who' | 'what' | 'where';
export const QUESTION_WORDS: readonly QuestionWord[] = ['who', 'what', 'where'];

export interface Answer {
  word: string;
  emoji: string;
  kind: QuestionWord;
}

const ANSWER_ROWS: Record<QuestionWord, [string, string][]> = {
  who: [['girl', '👧'], ['boy', '👦'], ['baby', '👶'], ['man', '👨'], ['woman', '👩'], ['king', '🤴']],
  what: [['cup', '🥤'], ['ball', '⚽'], ['box', '📦'], ['key', '🔑'], ['book', '📖'], ['bed', '🛏️']],
  where: [['house', '🏠'], ['school', '🏫'], ['beach', '🏖️'], ['castle', '🏰'], ['hospital', '🏥'], ['park', '🏞️']],
};

export const ANSWERS: readonly Answer[] = QUESTION_WORDS.flatMap((kind) => ANSWER_ROWS[kind].map(([word, emoji]) => ({ word, emoji, kind })));

// What each question word asks about, as the explanation says it.
export const ASKS_ABOUT: Record<QuestionWord, string> = { who: 'a person', what: 'a thing', where: 'a place' };

// ---- Names (pre-K A.7, kindergarten D.4) ----

export const NAMES: readonly string[] = ['Sam', 'Mia', 'Leo', 'Ava', 'Max', 'Zoe', 'Ben', 'Kim', 'Tom', 'Ana', 'Jay', 'Eva', 'Dan', 'Amy', 'Gus', 'Pia'];
export const LONG_NAMES: readonly string[] = ['Rosa', 'Luca', 'Nina', 'Omar', 'Hugo', 'Ruby', 'Jade', 'Vera', 'Theo', 'Cora'];

// Sentences with a name and the word I. {name} is filled in.
export const NAME_SENTENCES: readonly string[] = ['I see {name}.', 'I like {name}.', '{name} and I play.', 'I sit with {name}.', '{name} and I run.', 'I help {name}.'];

// ---- Which sentence matches the picture (kindergarten E.6): uses sentencePictures.ts. ----
