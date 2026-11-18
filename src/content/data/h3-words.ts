// Word and picture lists for plan section 15 wave H3: Language Arts pre-K words (C.3 to C.7).
// One picture has one name, here and across the section 9 lists.

export interface Pic {
  word: string;
  emoji: string;
}

const pic = ([word, emoji]: readonly [string, string]): Pic => ({ word, emoji });

// ---- Things that go together (pre-K C.3) ----
// Pairs in one group are never offered against each other, nor are groups that sit close
// (an animal's food and other food). `CLASHES` lists more first words and partners that
// could be argued to go together: a dog does chew shoes.

export type GoGroup = 'pets' | 'food' | 'art' | 'clothes' | 'body' | 'sport';

export interface GoPair {
  first: Pic;
  second: Pic;
  group: GoGroup;
  why: string; // the sentence the explanation says
}

const GO_ROWS: [GoGroup, [string, string], [string, string], string][] = [
  ['pets', ['dog', '🐶'], ['bone', '🦴'], 'A dog chews a bone.'],
  ['pets', ['mouse', '🐭'], ['cheese', '🧀'], 'A mouse nibbles cheese.'],
  ['pets', ['monkey', '🐵'], ['banana', '🍌'], 'A monkey eats a banana.'],
  ['pets', ['rabbit', '🐰'], ['carrot', '🥕'], 'A rabbit munches a carrot.'],
  ['food', ['bread', '🍞'], ['butter', '🧈'], 'We put butter on bread.'],
  ['food', ['cookie', '🍪'], ['milk', '🥛'], 'A cookie goes with a glass of milk.'],
  ['food', ['cake', '🍰'], ['candle', '🕯️'], 'A candle goes on a cake.'],
  ['food', ['spoon', '🥄'], ['bowl', '🥣'], 'We eat from a bowl with a spoon.'],
  ['art', ['paint', '🎨'], ['brush', '🖌️'], 'We paint with a brush.'],
  ['art', ['envelope', '✉️'], ['mailbox', '📫'], 'An envelope goes in a mailbox.'],
  ['clothes', ['sock', '🧦'], ['shoe', '👟'], 'A sock goes in a shoe.'],
  ['body', ['toothbrush', '🪥'], ['tooth', '🦷'], 'A toothbrush cleans a tooth.'],
  ['sport', ['ball', '⚽'], ['goal', '🥅'], 'We kick a ball into a goal.'],
];

export const GO_PAIRS: readonly GoPair[] = GO_ROWS.map(([group, first, second, why]) => ({ group, first: pic(first), second: pic(second), why }));

// Groups whose partners could be argued for across them.
export const GO_CLOSE: readonly (readonly [GoGroup, GoGroup])[] = [
  ['pets', 'food'],
  ['body', 'art'],
  ['clothes', 'sport'],
];

// A first word and another pair's partner that could be argued to go together.
export const GO_CLASHES: readonly (readonly [string, string])[] = [
  ['dog', 'shoe'],
  ['dog', 'brush'],
  ['dog', 'goal'],
  ['mouse', 'shoe'],
  ['envelope', 'brush'],
];

// ---- Helpers and their things (pre-K C.7) ----
// "Who works with a tractor?" The answer is a person. `clash` names a helper who could be argued for.

export interface Helper {
  thing: Pic;
  helper: Pic;
  why: string;
  clash?: string;
}

const HELPER_ROWS: [[string, string], [string, string], string, string?][] = [
  [['fire truck', '🚒'], ['firefighter', '🧑‍🚒'], 'A firefighter rides in a fire truck.'],
  [['stethoscope', '🩺'], ['doctor', '🧑‍⚕️'], 'A doctor listens with a stethoscope.'],
  [['pan', '🍳'], ['cook', '🧑‍🍳'], 'A cook makes food in a pan.'],
  [['tractor', '🚜'], ['farmer', '🧑‍🌾'], 'A farmer drives a tractor.'],
  [['plane', '✈️'], ['pilot', '🧑‍✈️'], 'A pilot flies a plane.', 'astronaut'],
  [['rocket', '🚀'], ['astronaut', '🧑‍🚀'], 'An astronaut rides in a rocket.', 'pilot'],
  [['paint', '🎨'], ['artist', '🧑‍🎨'], 'An artist paints a picture.'],
  [['police car', '🚓'], ['police officer', '👮'], 'A police officer drives a police car.'],
  [['hammer', '🔨'], ['builder', '👷'], 'A builder bangs nails with a hammer.'],
];

export const HELPERS: readonly Helper[] = HELPER_ROWS.map(([thing, helper, why, clash]) => ({ thing: pic(thing), helper: pic(helper), why, ...(clash === undefined ? {} : { clash }) }));

// ---- Feelings (pre-K C.4) ----

export const FEELINGS: readonly Pic[] = (
  [
    ['happy', '😀'],
    ['sad', '😢'],
    ['angry', '😠'],
    ['scared', '😨'],
    ['surprised', '😮'],
    ['sleepy', '😴'],
  ] as const
).map(pic);

// A short thing that happens. `also` lists feelings that could be argued for, never offered beside it.
export interface FeelingStory {
  story: string;
  name: string;
  feeling: string;
  also: readonly string[];
}

const STORY_ROWS: [string, string, string, string[]][] = [
  ['Sam gets a new puppy.', 'Sam', 'happy', ['surprised']],
  ['Mia drops her ice cream on the ground.', 'Mia', 'sad', ['angry', 'surprised']],
  ['A big dog barks at Leo in the dark.', 'Leo', 'scared', ['surprised']],
  ['Ava stays up very late.', 'Ava', 'sleepy', []],
  ['Max opens a box and a toy jumps out.', 'Max', 'surprised', ['happy', 'scared']],
  ['Zoe builds a tall tower. Her brother kicks it down on purpose.', 'Zoe', 'angry', ['sad', 'surprised']],
  ['Ben plays tag with his best friend.', 'Ben', 'happy', []],
  ['Kim hears loud thunder in the night.', 'Kim', 'scared', ['surprised', 'sleepy']],
  ['Tom yawns and rubs his eyes.', 'Tom', 'sleepy', []],
  ['Ana loses her teddy at the park.', 'Ana', 'sad', ['scared']],
  ['Jay finds a frog in his shoe.', 'Jay', 'surprised', ['scared', 'happy']],
  ['Eva shares her toys, and her friend grabs them all and runs.', 'Eva', 'angry', ['sad', 'surprised']],
];

export const FEELING_STORIES: readonly FeelingStory[] = STORY_ROWS.map(([story, name, feeling, also]) => ({ story, name, feeling, also }));

// ---- Body words (pre-K C.5) ----

export const BODY_PARTS: readonly Pic[] = (
  [
    ['ear', '👂'],
    ['nose', '👃'],
    ['eye', '👁️'],
    ['hand', '✋'],
    ['foot', '🦶'],
    ['leg', '🦵'],
    ['tooth', '🦷'],
    ['arm', '💪'],
    ['tongue', '👅'],
  ] as const
).map(pic);

// What a body part is for: "Which one do you hear with?" `also` lists parts that could be argued for.
export interface BodyUse {
  ask: string; // the question, spoken
  part: string;
  why: string;
  also: readonly string[];
}

const USE_ROWS: [string, string, string, string[]][] = [
  ['Which one do you hear with?', 'ear', 'You hear with your ears.', []],
  ['Which one do you smell with?', 'nose', 'You smell with your nose.', []],
  ['Which one do you see with?', 'eye', 'You see with your eyes.', []],
  ['Which one do you taste with?', 'tongue', 'You taste with your tongue.', ['tooth']],
  ['Which one do you clap with?', 'hand', 'You clap with your hands.', ['arm']],
  ['Which one do you kick with?', 'foot', 'You kick with your foot.', ['leg']],
  ['Which one do you chew with?', 'tooth', 'You chew with your teeth.', ['tongue']],
  ['Which one do you wave with?', 'hand', 'You wave with your hand.', ['arm']],
];

export const BODY_USES: readonly BodyUse[] = USE_ROWS.map(([ask, part, why, also]) => ({ ask, part, why, also }));

// ---- Action words (pre-K C.6, heard; kindergarten D.7, read) ----

export interface Action {
  verb: string; // run
  doing: string; // running
  emoji: string;
}

const ACTION_ROWS: [string, string, string][] = [
  ['swim', 'swimming', '🏊'],
  ['run', 'running', '🏃'],
  ['ride', 'riding a bike', '🚴'],
  ['sleep', 'sleeping', '🛌'],
  ['climb', 'climbing', '🧗'],
  ['dance', 'dancing', '💃'],
  ['walk', 'walking', '🚶'],
  ['surf', 'surfing', '🏄'],
  ['ski', 'skiing', '⛷️'],
  ['juggle', 'juggling', '🤹'],
  ['row', 'rowing a boat', '🚣'],
  ['lift', 'lifting', '🏋️'],
  ['clap', 'clapping', '👏'],
  ['hug', 'hugging', '🫂'],
  ['sit', 'sitting', '🧘'],
  ['stand', 'standing', '🧍'],
];

export const ACTIONS: readonly Action[] = ACTION_ROWS.map(([verb, doing, emoji]) => ({ verb, doing, emoji }));

// The verbs a kindergarten child reads: short and spelled the way they sound.
// Never ski, surf, row, walk or ride: a kindergartner can not sound those out.
export const READ_VERBS: readonly string[] = ['swim', 'run', 'sleep', 'lift', 'clap', 'hug', 'sit', 'stand'];
