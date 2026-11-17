// Story problems for plan section 15, wave H1 (Math grade 1, B.15 and B.16).
// {name} is a made-up first name. {a}, {b}, {c}, {t} and {r} are numbers, always 2 or more, so the
// nouns after them are always plural.

// Three things added together (1.OA.A.2). `emoji` gives the picture of each of the three groups.
export interface ThreeStory {
  id: string;
  text: string;
  emoji: readonly [string, string, string];
  things: string; // what is counted in the end: "balloons"
}
export const THREE_STORIES: readonly ThreeStory[] = [
  { id: 'balloons', text: '{name} has {a} red balloons, {b} blue balloons and {c} green balloons. How many balloons does {name} have in all?', emoji: ['🎈', '🎈', '🎈'], things: 'balloons' },
  { id: 'ducks', text: 'There are {a} ducks in the pond, {b} ducks on the grass and {c} ducks by the tree. How many ducks are there in all?', emoji: ['🦆', '🦆', '🦆'], things: 'ducks' },
  { id: 'books', text: '{name} reads {a} books on Monday, {b} books on Tuesday and {c} books on Wednesday. How many books does {name} read in all?', emoji: ['📖', '📖', '📖'], things: 'books' },
  { id: 'bugs', text: 'In the garden there are {a} bees, {b} ladybugs and {c} butterflies. How many bugs are there in all?', emoji: ['🐝', '🐞', '🦋'], things: 'bugs' },
  { id: 'fruit', text: 'A bowl has {a} strawberries, {b} bananas and {c} apples. How many pieces of fruit are in the bowl?', emoji: ['🍓', '🍌', '🍎'], things: 'pieces of fruit' },
  { id: 'toys', text: '{name} has {a} toy cars, {b} toy trucks and {c} toy boats. How many toys does {name} have in all?', emoji: ['🚗', '🚚', '⛵'], things: 'toys' },
];

// A missing part (1.OA.A.1). kind: added (start {a}, now {t}: how many came), taken (start {t}, now {r}:
// how many went), start (some, then {b} more, now {t}: how many at the start).
export interface PartStory {
  id: string;
  kind: 'added' | 'taken' | 'start';
  text: string;
  emoji: string;
  things: string;
}
export const PART_STORIES: readonly PartStory[] = [
  { id: 'stickers', kind: 'added', text: '{name} has {a} stickers. {name} gets some more. Now {name} has {t} stickers. How many stickers did {name} get?', emoji: '⭐', things: 'stickers' },
  { id: 'birds', kind: 'added', text: '{a} birds sit in a tree. Some more birds come. Now there are {t} birds. How many birds came?', emoji: '🐦', things: 'birds' },
  { id: 'shells', kind: 'added', text: '{name} has {a} shells. {name} finds some more at the beach. Now {name} has {t} shells. How many shells did {name} find?', emoji: '🐚', things: 'shells' },
  { id: 'cookies', kind: 'taken', text: '{name} has {t} cookies. {name} gives some away. Now {name} has {r} cookies. How many cookies did {name} give away?', emoji: '🍪', things: 'cookies' },
  { id: 'frogs', kind: 'taken', text: '{t} frogs sit on a log. Some frogs jump into the pond. Now {r} frogs are on the log. How many frogs jumped?', emoji: '🐸', things: 'frogs' },
  { id: 'balloons', kind: 'taken', text: '{name} has {t} balloons. Some balloons float away. Now {name} has {r} balloons. How many balloons floated away?', emoji: '🎈', things: 'balloons' },
  { id: 'marbles', kind: 'start', text: '{name} has some marbles. {name} gets {b} more. Now {name} has {t} marbles. How many marbles did {name} have at the start?', emoji: '⚪', things: 'marbles' },
  { id: 'apples', kind: 'start', text: 'There are some apples in a basket. {name} puts in {b} more. Now there are {t} apples. How many apples were in the basket at the start?', emoji: '🍎', things: 'apples' },
];
