// Sentences with a picture (plan section 9).
// The wrong pictures in a question are the answers to other sentences on this list.

export interface SentencePicture {
  sentence: string;
  word: string; // the word the picture shows
  emoji: string;
}

const ROWS: [string, string, string][] = [
  ['I see a cat.', 'cat', '🐱'],
  ['The sun is up.', 'sun', '☀️'],
  ['It is a red bus.', 'bus', '🚌'],
  ['I see a pig.', 'pig', '🐷'],
  ['Look at the dog.', 'dog', '🐶'],
  ['I have a hat.', 'hat', '🎩'],
  ['It is a big box.', 'box', '📦'],
  ['The bug is little.', 'bug', '🐛'],
  ['I see a fox.', 'fox', '🦊'],
  ['Here is a cup.', 'cup', '🥤'],
  ['Look at my bed.', 'bed', '🛏️'],
  ['It is a pan.', 'pan', '🍳'],
  ['I see a bat.', 'bat', '🦇'],
  ['Here is a pen.', 'pen', '🖊️'],
  ['It is a van.', 'van', '🚐'],
  ['I see a hen.', 'hen', '🐔'],
];

export const SENTENCE_PICTURES: readonly SentencePicture[] = ROWS.map(([sentence, word, emoji]) => ({ sentence, word, emoji }));
