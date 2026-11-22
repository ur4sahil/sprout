// Story problems for plan section 15, wave H1 (Math grade 1, B.15 and B.16).
// {name} is a made-up first name, said once; after it the story says {she} or {She} (STORY_PRONOUNS), so a
// name is never said four times in a row. {a}, {b}, {c}, {t} and {r} are numbers, always 2 or more, so the
// nouns after them are always plural.

// "she" or "he" for each name in STORY_NAMES (h1-things.ts).
export const STORY_PRONOUNS: Readonly<Record<string, 'she' | 'he'>> = { Mia: 'she', Leo: 'he', Ava: 'she', Sam: 'he', Zoe: 'she', Ben: 'he', Ivy: 'she', Max: 'he' };

// Three things added together (1.OA.A.2). `emoji` gives the picture of each of the three groups.
export interface ThreeStory {
  id: string;
  text: string;
  emoji: readonly [string, string, string];
  things: string; // what is counted in the end: "balloons"
}
export const THREE_STORIES: readonly ThreeStory[] = [
  { id: 'balloons', text: '{name} has {a} red balloons, {b} blue balloons and {c} green balloons. How many balloons does {she} have in all?', emoji: ['🎈', '🎈', '🎈'], things: 'balloons' },
  { id: 'ducks', text: 'There are {a} ducks in the pond, {b} ducks on the grass and {c} ducks by the tree. How many ducks are there in all?', emoji: ['🦆', '🦆', '🦆'], things: 'ducks' },
  { id: 'books', text: '{name} reads {a} books on Monday, {b} books on Tuesday and {c} books on Wednesday. How many books does {she} read in all?', emoji: ['📖', '📖', '📖'], things: 'books' },
  { id: 'bugs', text: 'In the garden there are {a} bees, {b} ladybugs and {c} butterflies. How many bugs are there in all?', emoji: ['🐝', '🐞', '🦋'], things: 'bugs' },
  { id: 'fruit', text: 'A bowl has {a} strawberries, {b} bananas and {c} apples. How many pieces of fruit are in the bowl?', emoji: ['🍓', '🍌', '🍎'], things: 'pieces of fruit' },
  { id: 'toys', text: '{name} has {a} toy cars, {b} toy trucks and {c} toy boats. How many toys does {she} have in all?', emoji: ['🚗', '🚚', '⛵'], things: 'toys' },
];

// A missing part (1.OA.A.1). kind: added (start {a}, now {t}: how many came), taken (start {t}, now {r}:
// how many went), start (some, then {b} more, now {t}: how many at the start). `thing` is one of `things`;
// `answer` is the last step, said in the story's words: {n} is the missing number, {things} fits it (1 sticker,
// 2 stickers), {were} is "was" or "were".
export interface PartStory {
  id: string;
  kind: 'added' | 'taken' | 'start';
  text: string;
  emoji: string;
  thing: string;
  things: string;
  answer: string;
}
export const PART_STORIES: readonly PartStory[] = [
  { id: 'stickers', kind: 'added', text: '{name} has {a} stickers. {She} gets some more. Now {she} has {t} stickers. How many stickers did {she} get?', emoji: '⭐', thing: 'sticker', things: 'stickers', answer: '{She} got {n} {things}.' },
  { id: 'birds', kind: 'added', text: '{a} birds sit in a tree. Some more birds come. Now there are {t} birds. How many birds came?', emoji: '🐦', thing: 'bird', things: 'birds', answer: '{n} {things} came.' },
  { id: 'shells', kind: 'added', text: '{name} has {a} shells. {She} finds some more at the beach. Now {she} has {t} shells. How many shells did {she} find?', emoji: '🐚', thing: 'shell', things: 'shells', answer: '{She} found {n} {things}.' },
  { id: 'cookies', kind: 'taken', text: '{name} has {t} cookies. {She} gives some away. Now {she} has {r} cookies. How many cookies did {she} give away?', emoji: '🍪', thing: 'cookie', things: 'cookies', answer: '{She} gave away {n} {things}.' },
  { id: 'frogs', kind: 'taken', text: '{t} frogs sit on a log. Some frogs jump into the pond. Now {r} frogs are on the log. How many frogs jumped?', emoji: '🐸', thing: 'frog', things: 'frogs', answer: '{n} {things} jumped.' },
  { id: 'balloons', kind: 'taken', text: '{name} has {t} balloons. Some balloons float away. Now {she} has {r} balloons. How many balloons floated away?', emoji: '🎈', thing: 'balloon', things: 'balloons', answer: '{n} {things} floated away.' },
  { id: 'marbles', kind: 'start', text: '{name} has some marbles. {She} gets {b} more. Now {she} has {t} marbles. How many marbles did {she} have at the start?', emoji: '⚪', thing: 'marble', things: 'marbles', answer: '{She} had {n} {things} at the start.' },
  { id: 'apples', kind: 'start', text: 'There are some apples in a basket. {name} puts in {b} more. Now there are {t} apples. How many apples were in the basket at the start?', emoji: '🍎', thing: 'apple', things: 'apples', answer: 'There {were} {n} {things} in the basket at the start.' },
];
