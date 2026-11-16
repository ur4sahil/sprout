// Story templates (plan section 9). The things in a story come from STORY_COUNTABLES.
//
// Words in braces are filled in by the generator:
//   {name}, {name2}     a name from STORY_NAMES
//   {a}, {b}, {c}       the numbers, spoken as numbers
//   {things}            the plural word: apples
//   {thingsA}           the word that fits the number a: 1 apple, 2 apples
//   {areA}, {areB}      "is" when that number is 1, otherwise "are"
// Every template is a list of sentences. Each one is spoken as its own sentence.

export const STORY_NAMES: readonly string[] = ['Sam', 'Mia', 'Leo', 'Ava', 'Max', 'Zoe'];

export type StoryKind = 'gets' | 'table' | 'givesAway' | 'takes' | 'compare' | 'addAdd' | 'addSub';

export const STORY_TEMPLATES: Record<StoryKind, readonly string[]> = {
  // add
  gets: ['{name} has {a} {thingsA}.', '{name} gets {b} more.', 'How many {things} does {name} have now?'],
  table: ['{a} {thingsA} {areA} on the table.', '{b} more {areB} in the box.', 'How many {things} are there in all?'],
  // subtract
  givesAway: ['{name} has {a} {thingsA}.', '{name} gives away {b}.', 'How many {things} are left?'],
  takes: ['There {areA} {a} {thingsA}.', '{name} takes {b}.', 'How many are left?'],
  // compare: the first number is always the bigger one
  compare: ['{name} has {a} {thingsA}.', '{name2} has {b}.', 'How many more does {name} have?'],
  // two steps
  addAdd: ['{name} has {a} {thingsA}.', '{name} gets {b} more.', 'Then {name} gets {c} more.', 'How many {things} does {name} have now?'],
  addSub: ['{name} has {a} {thingsA}.', '{name} gets {b} more.', 'Then {name} gives away {c}.', 'How many {things} does {name} have now?'],
};
