// Story parts for the grade 2 word problems of plan section 15 wave H2: made-up first names and things
// a child collects. Every amount in these stories is 2 or more, so a thing is always said in the plural.

export const STORY_NAMES: readonly string[] = ['Mia', 'Leo', 'Ava', 'Sam', 'Zoe', 'Max', 'Lily', 'Ben', 'Nora', 'Eli'];

// After the first mention, a story with one person in it says "he" or "she", never the name again. These cover
// every name here and every name in storyProblems.ts.
export const PRONOUN: Readonly<Record<string, 'he' | 'she'>> = { Mia: 'she', Leo: 'he', Ava: 'she', Sam: 'he', Zoe: 'she', Max: 'he', Lily: 'she', Ben: 'he', Nora: 'she', Eli: 'he' };

export const COLLECTED: readonly string[] = ['stickers', 'marbles', 'shells', 'cards', 'crayons', 'blocks', 'beads', 'rocks'];

// Things to buy with coins, with a price in cents.
export const SHOP: readonly { emoji: string; name: string; cents: number }[] = [
  { emoji: '🍎', name: 'an apple', cents: 25 },
  { emoji: '🍌', name: 'a banana', cents: 20 },
  { emoji: '🍪', name: 'a cookie', cents: 35 },
  { emoji: '✏️', name: 'a pencil', cents: 15 },
  { emoji: '🎈', name: 'a balloon', cents: 30 },
  { emoji: '🧁', name: 'a cupcake', cents: 45 },
  { emoji: '🥤', name: 'a drink', cents: 40 },
  { emoji: '🍓', name: 'a strawberry', cents: 10 },
];
