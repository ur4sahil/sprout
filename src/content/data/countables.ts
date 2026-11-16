// Counting objects (plan section 9). Only these emoji are used for counting.

export interface Countable {
  emoji: string;
  one: string;
  many: string;
}

const ROWS: [string, string, string][] = [
  ['🍎', 'apple', 'apples'],
  ['⭐', 'star', 'stars'],
  ['🐟', 'fish', 'fish'],
  ['🚗', 'car', 'cars'],
  ['🎈', 'balloon', 'balloons'],
  ['🌸', 'flower', 'flowers'],
  ['🐞', 'ladybug', 'ladybugs'],
  ['🍪', 'cookie', 'cookies'],
  ['⚽', 'ball', 'balls'],
  ['🦆', 'duck', 'ducks'],
  ['🐸', 'frog', 'frogs'],
  ['🍓', 'strawberry', 'strawberries'],
  ['🐝', 'bee', 'bees'],
  ['🚀', 'rocket', 'rockets'],
  ['🐢', 'turtle', 'turtles'],
  ['🍌', 'banana', 'bananas'],
];

export const COUNTABLES: readonly Countable[] = ROWS.map(([emoji, one, many]) => ({ emoji, one, many }));

// Story problems use only things that can sit on a table or in a box.
export const STORY_COUNTABLES: readonly Countable[] = COUNTABLES.filter((thing) =>
  ['apple', 'cookie', 'ball', 'strawberry', 'banana', 'car', 'balloon', 'flower'].includes(thing.one),
);
