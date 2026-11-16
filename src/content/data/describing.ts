// Sentences with a describing word (plan section 9).
// A question offers three words from the same sentence: the describing word, one naming word and one action word.

export interface DescribingSentence {
  sentence: string;
  describing: string;
  naming: string;
  action: string;
}

const ROWS: [string, string, string, string][] = [
  ['The big dog ran.', 'big', 'dog', 'ran'],
  ['I have a red ball.', 'red', 'ball', 'have'],
  ['The bed is soft.', 'soft', 'bed', 'is'],
  ['A tall tree fell.', 'tall', 'tree', 'fell'],
  ['The milk is cold.', 'cold', 'milk', 'is'],
  ['The happy girl sang.', 'happy', 'girl', 'sang'],
  ['The loud drum woke me.', 'loud', 'drum', 'woke'],
  ['A tiny bug sat on me.', 'tiny', 'bug', 'sat'],
];

export const DESCRIBING_SENTENCES: readonly DescribingSentence[] = ROWS.map(([sentence, describing, naming, action]) => ({ sentence, describing, naming, action }));
