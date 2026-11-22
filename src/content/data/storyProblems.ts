// Story templates (plan section 9). The things in a story come from STORY_COUNTABLES.
//
// Words in braces are filled in by the generator:
//   {name}, {name2}     a name from STORY_NAMES
//   {she}, {She}        the pronoun of {name} (STORY_PRONOUNS): "she" or "he", with a capital at the start of a sentence
//   {a}, {b}, {c}       the numbers, spoken as numbers
//   {things}            the plural word: apples
//   {thingsA}           the word that fits the number a: 1 apple, 2 apples
//   {areA}, {areB}      "is" when that number is 1, otherwise "are"
// Every template is a list of sentences. Each one is spoken as its own sentence.
//
// A story names a person once, then says "he" or "she" (the owner's choice, Nov 22, 2026): "Sam has 2 apples. He gets
// 1 more. How many apples does he have now?" A story with two people keeps their names, where a pronoun would leave a
// child unsure which one is meant: "Sam has 5 apples. Mia has 2. How many more does Sam have?"

export const STORY_NAMES: readonly string[] = ['Sam', 'Mia', 'Leo', 'Ava', 'Max', 'Zoe'];

// The one pronoun of each name. Every name a story can use is here, and it agrees with the grade 1 and grade 2 story
// lists (h1-stories.ts and h2-stories.ts), so a name is "he" or "she" wherever it is told.
export const STORY_PRONOUNS: Readonly<Record<string, 'he' | 'she'>> = { Sam: 'he', Mia: 'she', Leo: 'he', Ava: 'she', Max: 'he', Zoe: 'she' };

// The other forms of a pronoun: "Max gives him 17 more." and "Is his answer reasonable?"
export const PRONOUN_FORMS: Readonly<Record<'he' | 'she', { him: string; his: string }>> = { he: { him: 'him', his: 'his' }, she: { him: 'her', his: 'her' } };

export type StoryKind = 'gets' | 'table' | 'givesAway' | 'takes' | 'compare' | 'addAdd' | 'addSub';

export const STORY_TEMPLATES: Record<StoryKind, readonly string[]> = {
  // add
  gets: ['{name} has {a} {thingsA}.', '{She} gets {b} more.', 'How many {things} does {she} have now?'],
  table: ['{a} {thingsA} {areA} on the table.', '{b} more {areB} in the box.', 'How many {things} are there in all?'],
  // subtract
  givesAway: ['{name} has {a} {thingsA}.', '{She} gives away {b}.', 'How many {things} are left?'],
  takes: ['There {areA} {a} {thingsA}.', '{name} takes {b}.', 'How many are left?'],
  // compare: the first number is always the bigger one. Two people, so both keep their names.
  compare: ['{name} has {a} {thingsA}.', '{name2} has {b}.', 'How many more does {name} have?'],
  // two steps
  addAdd: ['{name} has {a} {thingsA}.', '{She} gets {b} more.', 'Then {she} gets {c} more.', 'How many {things} does {she} have now?'],
  addSub: ['{name} has {a} {thingsA}.', '{She} gets {b} more.', 'Then {she} gives away {c}.', 'How many {things} does {she} have now?'],
};
