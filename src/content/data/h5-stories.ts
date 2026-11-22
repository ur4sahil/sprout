// Story templates for wave H5 (Math grade 3). A template is filled by `fill` in
// generators/math/g3/h5-parts.ts: {name} and {name2} are names from STORY_NAMES, {a} and {b} numbers,
// {things} and {thing} a story countable, {box} and {boxes} a container, {f} a fraction, {start} a time.

export interface Container {
  one: string;
  many: string;
}

export const CONTAINERS: readonly Container[] = [
  { one: 'bag', many: 'bags' },
  { one: 'box', many: 'boxes' },
  { one: 'basket', many: 'baskets' },
];

// What happens in a story, which decides the sign that solves it.
export type StoryKind = 'join' | 'separate' | 'compare' | 'groups' | 'array' | 'share' | 'groupsOf';

// In every story {a} is the first number told and {b} the second. In share and groupsOf, {a} is the total.
export const STORIES: Record<StoryKind, readonly string[]> = {
  join: [
    '{name} has {a} {things}. {name2} gives {name} {b} more. How many {things} does {name} have now?',
    '{name} picks {a} {things} in the morning and {b} more after lunch. How many {things} is that in all?',
  ],
  separate: [
    '{name} has {a} {things} and gives away {b}. How many {things} are left?',
    'There are {a} {things} in a basket. {name} takes out {b}. How many {things} are still in the basket?',
  ],
  compare: [
    '{name} has {a} {things}. {name2} has {b} {things}. How many more {things} does {name} have?',
    'A red ribbon is {a} inches long. A blue ribbon is {b} inches long. How many inches longer is the red ribbon?',
  ],
  groups: [
    '{name} has {a} {boxes}. Each {box} holds {b} {things}. How many {things} are there in all?',
    '{name} fills {a} {boxes} with {b} {things} in each. How many {things} is that in all?',
  ],
  array: [
    '{name} lines up {things} in {a} rows, with {b} in each row. How many {things} are there?',
    'A shop puts {things} on a shelf in {a} rows of {b}. How many {things} are on the shelf?',
  ],
  share: [
    '{name} shares {a} {things} equally among {b} friends. How many {things} does each friend get?',
    '{name} puts {a} {things} into {b} {boxes}, the same number in each. How many {things} go in each {box}?',
  ],
  groupsOf: [
    '{name} has {a} {things} and puts {b} in each {box}. How many {boxes} does {name} fill?',
    '{name} lines up {a} {things} in rows of {b}. How many rows are there?',
  ],
};

// What each story asks, said after "To find", in the same order as STORIES: B.6 asks for the sign in one question,
// "To find how many {things} each friend gets, which sign would you use?", in place of the story's own question.
export const FINDS: Record<StoryKind, readonly string[]> = {
  join: ['how many {things} {name} has now', 'how many {things} that is in all'],
  separate: ['how many {things} are left', 'how many {things} are still in the basket'],
  compare: ['how many more {things} {name} has', 'how many inches longer the red ribbon is'],
  groups: ['how many {things} there are in all', 'how many {things} that is in all'],
  array: ['how many {things} there are', 'how many {things} are on the shelf'],
  share: ['how many {things} each friend gets', 'how many {things} go in each {box}'],
  groupsOf: ['how many {boxes} {name} fills', 'how many rows there are'],
};

// Comparing parts of two things the same size. {f} is a fraction. `more` and `less` ask about two people, `most` and
// `least` about three; each answer is said with the story's own words: "Who drank more water?", "Zoe drank more water."
export interface FractionStory {
  same: string; // says the wholes are the same size
  did: string; // one person's part
  more: string;
  less: string;
  most: string;
  least: string;
}

export const FRACTION_STORIES: readonly FractionStory[] = [
  { same: 'The pizzas are the same size.', did: '{name} ate {f} of a pizza.', more: 'Who ate more pizza?', less: 'Who ate less pizza?', most: 'Who ate the most pizza?', least: 'Who ate the least pizza?' },
  { same: 'The fences are the same size.', did: '{name} painted {f} of a fence.', more: 'Who painted more?', less: 'Who painted less?', most: 'Who painted the most?', least: 'Who painted the least?' },
  { same: 'The bottles are the same size.', did: '{name} drank {f} of a bottle of water.', more: 'Who drank more water?', less: 'Who drank less water?', most: 'Who drank the most water?', least: 'Who drank the least water?' },
  { same: 'The trails are the same length.', did: '{name} walked {f} of a trail.', more: 'Who walked farther?', less: 'Who walked a shorter distance?', most: 'Who walked the farthest?', least: 'Who walked the shortest distance?' },
];

// A fraction of a group of things.
export const SET_STORIES: readonly string[] = [
  '{name} has {a} {things} and gives {f} of them to a friend. How many {things} does the friend get?',
  'There are {a} {things} on a table. {f} of them are put in a bag. How many {things} go in the bag?',
];

// A place made of two rectangles, measured in one unit. No place has "area" in its name: area is what is asked.
export const TWO_RECTANGLES: readonly { place: string; unit: string }[] = [
  { place: 'garden', unit: 'meters' },
  { place: 'rug', unit: 'feet' },
  { place: 'pool', unit: 'meters' },
];

// Things on a school day's schedule, any of which can come at any time of the day.
export const ACTIVITIES: readonly string[] = ['Reading', 'Art', 'Music', 'Science', 'Spelling', 'Gym', 'Library', 'Math'];

// About how many: {b} is rounded to the nearest ten, then multiplied by {a}. The question tells the child to round
// between the two parts, so "about" has one answer: "A bus has 68 seats. Round 68 to the nearest ten, then multiply.
// About how many seats are there on 5 buses?"
export const ESTIMATE_STORIES: readonly { setup: string; ask: string }[] = [
  { setup: 'A box holds {b} crayons.', ask: 'About how many crayons are in {a} boxes?' },
  { setup: '{name} reads {b} pages each day.', ask: 'About how many pages is that in {a} days?' },
  { setup: 'A bus has {b} seats.', ask: 'About how many seats are there on {a} buses?' },
];
