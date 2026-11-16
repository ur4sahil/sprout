// Rhyme families (plan section 9). Words in one family rhyme. Words from two families never do.

export interface PictureWord {
  word: string;
  emoji: string;
}

const FAMILIES: [string, string][][] = [
  [['cat', '🐱'], ['hat', '🎩'], ['bat', '🦇']],
  [['dog', '🐶'], ['frog', '🐸']],
  [['bee', '🐝'], ['tree', '🌳'], ['key', '🔑']],
  [['star', '⭐'], ['car', '🚗']],
  [['moon', '🌙'], ['spoon', '🥄']],
  [['fish', '🐟'], ['dish', '🍽️']],
  [['fox', '🦊'], ['box', '📦']],
  [['cake', '🍰'], ['snake', '🐍']],
  [['mouse', '🐭'], ['house', '🏠']],
  [['boat', '⛵'], ['goat', '🐐']],
  [['bear', '🐻'], ['pear', '🍐']],
  [['ring', '💍'], ['king', '🤴']],
  [['pan', '🍳'], ['van', '🚐']],
  [['clock', '🕐'], ['sock', '🧦'], ['lock', '🔒']],
];

export const RHYME_FAMILIES: readonly (readonly PictureWord[])[] = FAMILIES.map((family) => family.map(([word, emoji]) => ({ word, emoji })));
