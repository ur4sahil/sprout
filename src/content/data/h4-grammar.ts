// Grammar lists of plan section 15 wave H4 (Language Arts grades 1 and 2).

// ---- Grade 1 C.4 Pronouns ----
// The naming part and the word that can take its place.
export interface PronounEntry {
  noun: string;
  pronoun: 'he' | 'she' | 'it' | 'they' | 'we';
  then: string; // what comes after the pronoun in the second sentence
  first: string; // the first sentence
}
export const PRONOUN_ENTRIES: readonly PronounEntry[] = [
  { noun: 'Dad', pronoun: 'he', first: 'Dad made pancakes.', then: 'is a good cook.' },
  { noun: 'Mom', pronoun: 'she', first: 'Mom has a red hat.', then: 'wears it to the park.' },
  { noun: 'Ben', pronoun: 'he', first: 'Ben kicked the ball.', then: 'ran after it.' },
  { noun: 'Kim', pronoun: 'she', first: 'Kim reads a book.', then: 'likes the pictures.' },
  { noun: 'The dog', pronoun: 'it', first: 'The dog barks at the cat.', then: 'wants to play.' },
  { noun: 'The ball', pronoun: 'it', first: 'The ball rolled down the hill.', then: 'went into the pond.' },
  { noun: 'The kids', pronoun: 'they', first: 'The kids went to the zoo.', then: 'saw a big lion.' },
  { noun: 'Sam and Lin', pronoun: 'they', first: 'Sam and Lin made a fort.', then: 'played in it all day.' },
  { noun: 'Grandpa', pronoun: 'he', first: 'Grandpa grows carrots.', then: 'gives some to us.' },
  { noun: 'Nan', pronoun: 'she', first: 'Nan bakes bread.', then: 'shares it with me.' },
  { noun: 'The birds', pronoun: 'they', first: 'The birds sang in the tree.', then: 'flew away at night.' },
  { noun: 'My cat', pronoun: 'it', first: 'My cat sleeps a lot.', then: 'naps on my bed.' },
];
// "We" stands for a group with I in it.
export const WE_ENTRIES: readonly PronounEntry[] = [
  { noun: 'Ben and I', pronoun: 'we', first: 'Ben and I went to the beach.', then: 'dug in the sand.' },
  { noun: 'Mom and I', pronoun: 'we', first: 'Mom and I baked a cake.', then: 'ate it after lunch.' },
  { noun: 'My friends and I', pronoun: 'we', first: 'My friends and I play tag.', then: 'run very fast.' },
];

// ---- Grade 1 C.5 One or more ----
// Naming parts that are one, and naming parts that are more than one.
export const SUBJECTS_ONE: readonly string[] = ['The dog', 'The girl', 'Sam', 'My mom', 'The cat', 'He', 'She'];
export const SUBJECTS_MORE: readonly string[] = ['The dogs', 'The girls', 'The kids', 'We', 'They', 'The cats'];
// An action word for one, the same word for more than one, and how the sentence ends.
export const ACTIONS: readonly (readonly [string, string, string])[] = [
  ['runs', 'run', 'fast.'],
  ['jumps', 'jump', 'high.'],
  ['sings', 'sing', 'a song.'],
  ['eats', 'eat', 'lunch.'],
  ['sleeps', 'sleep', 'a lot.'],
  ['swims', 'swim', 'in the pool.'],
  ['plays', 'play', 'outside.'],
  ['reads', 'read', 'a book.'],
];
export const BE_HAVE: readonly (readonly [string, string, string])[] = [
  ['is', 'are', 'happy.'],
  ['has', 'have', 'a lot of toys.'],
  ['was', 'were', 'at home.'],
];

// ---- Grade 1 C.6 Capital letters for days and months ----
export const DAYS: readonly string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS: readonly string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// WHEN is filled with a day or a month.
export const DAY_SENTENCES: readonly string[] = ['We swim on WHEN.', 'Ben has art on WHEN.', 'We go to the park on WHEN.', 'Nan comes to visit on WHEN.'];
export const MONTH_SENTENCES: readonly string[] = ['My birthday is in WHEN.', 'We go on a trip in WHEN.', 'The fair comes in WHEN.', 'Our garden grows in WHEN.'];
// For "which word needs a capital": a naming word and an action word in the sentence too.
export const CAPITAL_WORD_SENTENCES: readonly { sentence: string; others: readonly [string, string] }[] = [
  { sentence: 'My birthday is in WHEN.', others: ['birthday', 'is'] },
  { sentence: 'We swim on WHEN.', others: ['swim', 'on'] },
  { sentence: 'The fair comes in WHEN.', others: ['fair', 'comes'] },
  { sentence: 'Ben has art on WHEN.', others: ['has', 'art'] },
];

// ---- Grade 1 C.7 Common and proper nouns ----
export const COMMON_NOUNS: readonly string[] = ['dog', 'girl', 'boy', 'city', 'street', 'park', 'school', 'teacher'];
export const PROPER_NOUNS: readonly string[] = ['Sam', 'Mia', 'Rex', 'Ohio', 'Texas', 'Elm Street', 'Oak Park', 'Pine School'];

// ---- Grade 1 C.8 Question words ----
// The question with its word left out, and an answer that only that word fits.
export const QUESTION_WORDS: readonly string[] = ['Who', 'What', 'Where', 'When', 'Why'];
export const QUESTIONS: readonly { word: string; question: string; answer: string }[] = [
  { word: 'Who', question: '___ is at the door?', answer: 'Grandma is at the door.' },
  { word: 'Who', question: '___ made this cake?', answer: 'Dad made it.' },
  { word: 'Who', question: '___ is your teacher?', answer: 'Mr. Green is my teacher.' },
  { word: 'What', question: '___ is in the box?', answer: 'A toy car is in the box.' },
  { word: 'What', question: '___ do you want to eat?', answer: 'I want soup.' },
  { word: 'What', question: '___ color is your bike?', answer: 'My bike is blue.' },
  { word: 'Where', question: '___ is the cat?', answer: 'The cat is under the bed.' },
  { word: 'Where', question: '___ do you live?', answer: 'I live on Elm Street.' },
  { word: 'Where', question: '___ did you put my hat?', answer: 'It is on the chair.' },
  { word: 'When', question: '___ is the party?', answer: 'The party is on Friday.' },
  { word: 'When', question: '___ do you go to bed?', answer: 'I go to bed at night.' },
  { word: 'When', question: '___ will Nan come?', answer: 'Nan will come after lunch.' },
  { word: 'Why', question: '___ is Sam sad?', answer: 'He lost his ball.' },
  { word: 'Why', question: '___ are you wet?', answer: 'I fell in the pond.' },
  { word: 'Why', question: '___ did the dog bark?', answer: 'It saw a cat.' },
];

// ---- Grade 1 C.9 Joining words and, but, or ----
export const JOINING_WORDS: readonly string[] = ['and', 'but', 'or'];
export const JOINING: readonly { word: string; sentence: string }[] = [
  { word: 'and', sentence: 'Sam ___ Lin are friends.' },
  { word: 'and', sentence: 'Mom ___ Dad are at home.' },
  { word: 'and', sentence: 'Ben ___ Max play ball.' },
  { word: 'and', sentence: 'The cat ___ the dog are asleep.' },
  { word: 'but', sentence: 'I like milk, ___ I do not like tea.' },
  { word: 'but', sentence: 'The sun is out, ___ it is cold.' },
  { word: 'but', sentence: 'He ran fast, ___ he did not win.' },
  { word: 'but', sentence: 'I wanted to play, ___ it rained.' },
  { word: 'or', sentence: 'Is it hot ___ cold?' },
  { word: 'or', sentence: 'Did you win ___ lose?' },
  { word: 'or', sentence: 'Is the cup full ___ empty?' },
  { word: 'or', sentence: 'Is it day ___ night?' },
];

// ---- Grade 2 C.6 Reflexive pronouns ----
export const REFLEXIVE_SUBJECTS: readonly { subject: string; reflexive: string }[] = [
  { subject: 'I', reflexive: 'myself' },
  { subject: 'Ben', reflexive: 'himself' },
  { subject: 'He', reflexive: 'himself' },
  { subject: 'Kim', reflexive: 'herself' },
  { subject: 'She', reflexive: 'herself' },
  { subject: 'We', reflexive: 'ourselves' },
  { subject: 'They', reflexive: 'themselves' },
  { subject: 'The kids', reflexive: 'themselves' },
  { subject: 'You', reflexive: 'yourself' },
];
export const REFLEXIVE_ACTIONS: readonly string[] = ['made lunch all by ___.', 'cleaned the room by ___.', 'built a fort by ___.', 'tied the laces by ___.'];
export const REFLEXIVES: readonly string[] = ['myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves'];

// ---- Grade 2 C.7 Adverbs ----
// A sentence with a describing word, a naming word, an action word and a word that tells how.
export const HOW_SENTENCES: readonly { sentence: string; adjective: string; noun: string; verb: string; adverb: string }[] = [
  { sentence: 'The old turtle walked slowly.', adjective: 'old', noun: 'turtle', verb: 'walked', adverb: 'slowly' },
  { sentence: 'The little bird sang sweetly.', adjective: 'little', noun: 'bird', verb: 'sang', adverb: 'sweetly' },
  { sentence: 'The big dog barked loudly.', adjective: 'big', noun: 'dog', verb: 'barked', adverb: 'loudly' },
  { sentence: 'The tall girl ran quickly.', adjective: 'tall', noun: 'girl', verb: 'ran', adverb: 'quickly' },
  { sentence: 'The new baby slept softly.', adjective: 'new', noun: 'baby', verb: 'slept', adverb: 'softly' },
  { sentence: 'The young kids played happily.', adjective: 'young', noun: 'kids', verb: 'played', adverb: 'happily' },
  { sentence: 'The cold rain fell gently.', adjective: 'cold', noun: 'rain', verb: 'fell', adverb: 'gently' },
  { sentence: 'The kind man smiled warmly.', adjective: 'kind', noun: 'man', verb: 'smiled', adverb: 'warmly' },
];
// A gap that takes the describing word (after is, was, are) or the word that tells how (after an action).
export const HOW_GAPS: readonly { sentence: string; adjective: string; adverb: string }[] = [
  { sentence: 'The dog barked ___.', adjective: 'loud', adverb: 'loudly' },
  { sentence: 'The dog is ___.', adjective: 'loud', adverb: 'loudly' },
  { sentence: 'The turtle walked ___.', adjective: 'slow', adverb: 'slowly' },
  { sentence: 'The turtle is ___.', adjective: 'slow', adverb: 'slowly' },
  { sentence: 'Mia ran ___.', adjective: 'quick', adverb: 'quickly' },
  { sentence: 'Mia is ___.', adjective: 'quick', adverb: 'quickly' },
  { sentence: 'The kids played ___.', adjective: 'happy', adverb: 'happily' },
  { sentence: 'The kids are ___.', adjective: 'happy', adverb: 'happily' },
  { sentence: 'The rain fell ___.', adjective: 'gentle', adverb: 'gently' },
  { sentence: 'The rain was ___.', adjective: 'gentle', adverb: 'gently' },
  { sentence: 'Sam shut the door ___.', adjective: 'quiet', adverb: 'quietly' },
  { sentence: 'The room was ___.', adjective: 'quiet', adverb: 'quietly' },
];

// ---- Grade 2 C.8 Complete sentences ----
export const COMPLETE: readonly string[] = [
  'The dog ran to the park.',
  'My mom makes good soup.',
  'We play tag at school.',
  'The sun is hot today.',
  'Ben found a shell.',
  'Birds sing in the morning.',
  'I like to read books.',
  'The cat sleeps on my bed.',
];
export const FRAGMENTS: readonly string[] = [
  'Ran to the park.',
  'My mom and her soup.',
  'At school after lunch.',
  'The big red ball.',
  'Found a shell on the.',
  'In the morning.',
  'The cat on my bed.',
  'Jumped over the log.',
];
