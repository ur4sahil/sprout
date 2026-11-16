// Word groups (plan section 9).
// Plants and food never appear in the same question, and fish is never offered against food.

export type WordGroup = 'animals' | 'food' | 'vehicles' | 'clothes' | 'plants' | 'people' | 'things';

const ROWS: Record<WordGroup, [string, string][]> = {
  animals: [['cat', '🐱'], ['dog', '🐶'], ['fish', '🐟'], ['frog', '🐸'], ['duck', '🦆'], ['pig', '🐷'], ['lion', '🦁'], ['elephant', '🐘'], ['monkey', '🐵'], ['rabbit', '🐰']],
  food: [['apple', '🍎'], ['banana', '🍌'], ['pizza', '🍕'], ['cookie', '🍪'], ['bread', '🍞'], ['cheese', '🧀'], ['carrot', '🥕'], ['grapes', '🍇']],
  vehicles: [['car', '🚗'], ['bus', '🚌'], ['bike', '🚲'], ['plane', '✈️'], ['train', '🚂'], ['boat', '⛵'], ['rocket', '🚀'], ['tractor', '🚜']],
  clothes: [['shirt', '👕'], ['pants', '👖'], ['dress', '👗'], ['sock', '🧦'], ['hat', '🎩'], ['shoe', '👟'], ['glove', '🧤'], ['scarf', '🧣']],
  plants: [['tree', '🌳'], ['flower', '🌸'], ['cactus', '🌵'], ['clover', '🍀']],
  people: [['girl', '👧'], ['boy', '👦'], ['baby', '👶'], ['man', '👨'], ['woman', '👩'], ['king', '🤴']],
  things: [['cup', '🥤'], ['bed', '🛏️'], ['box', '📦'], ['key', '🔑'], ['ball', '⚽'], ['clock', '🕐'], ['book', '📖'], ['door', '🚪']],
};

export interface GroupWord {
  word: string;
  emoji: string;
  group: WordGroup;
}

export const WORD_GROUPS = Object.keys(ROWS) as WordGroup[];

export const GROUP_WORDS: readonly GroupWord[] = WORD_GROUPS.flatMap((group) => ROWS[group].map(([word, emoji]) => ({ word, emoji, group })));

// Two groups that must not meet in one question.
export function groupsClash(one: WordGroup, two: WordGroup): boolean {
  return (one === 'plants' && two === 'food') || (one === 'food' && two === 'plants');
}

// Fish is an animal that is also eaten, so it never meets the food group.
export function wordClashesWithGroup(word: string, group: WordGroup): boolean {
  return word === 'fish' && group === 'food';
}
