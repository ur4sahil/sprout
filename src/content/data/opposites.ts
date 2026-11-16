// Opposites (plan section 9). A picture here stands for a quality: the fire is "hot", the turtle is "slow".
// Big and small have no emoji. They are drawn with the shape visual at sizes l and s.
// Open and closed is left out, because the lock picture is already "lock" in the rhyme list.

export interface OppositeWord {
  word: string;
  emoji: string;
}

const PAIRS: [[string, string], [string, string]][] = [
  [['hot', '🔥'], ['cold', '❄️']],
  [['day', '☀️'], ['night', '🌙']],
  [['happy', '😀'], ['sad', '😢']],
  [['up', '⬆️'], ['down', '⬇️']],
  [['fast', '🐇'], ['slow', '🐢']],
  [['loud', '🔊'], ['quiet', '🔇']],
];

export const OPPOSITE_PAIRS: readonly (readonly [OppositeWord, OppositeWord])[] = PAIRS.map(([one, two]) => [
  { word: one[0], emoji: one[1] },
  { word: two[0], emoji: two[1] },
]);

// The pair with no emoji.
export const SIZE_PAIR: readonly [string, string] = ['big', 'small'];
