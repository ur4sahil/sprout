// Sight words: the long-standing Dolch lists (plan section 9).

export type SightSet = 1 | 2 | 3 | 4;

const ROWS: Record<SightSet, string> = {
  1: 'a and away big blue can come down find for funny go help here I in is it jump little',
  2: 'look make me my not one play red run said see the three to two up we where yellow you',
  3:
    'all am are at ate be black brown but came did do eat four get good have he into like ' +
    'must new no now on our out please pretty ran ride saw say she so soon that there they ' +
    'this too under want was well went what white who will with yes',
  4:
    'after again an any as ask by could every fly from give going had has her him his how ' +
    'just know let live may of old once open over put round some stop take thank them then ' +
    'think walk were when',
};

export const SIGHT_SETS: readonly SightSet[] = [1, 2, 3, 4];

export const SIGHT_WORDS: Readonly<Record<SightSet, readonly string[]>> = { 1: ROWS[1].split(' '), 2: ROWS[2].split(' '), 3: ROWS[3].split(' '), 4: ROWS[4].split(' ') };

export const ALL_SIGHT_WORDS: readonly string[] = SIGHT_SETS.flatMap((set) => SIGHT_WORDS[set]);

// Words that sound alike. Two words from one group never appear in one question.
// Some are not sight words themselves: they are kept so that letter tiles can never spell them.
export const SOUND_ALIKE: readonly (readonly string[])[] = [
  ['to', 'two', 'too'],
  ['for', 'four'],
  ['no', 'know'],
  ['one', 'won'],
  ['there', 'their'],
  ['by', 'buy'],
  ['be', 'bee'],
  ['see', 'sea'],
  ['I', 'eye'],
  ['new', 'knew'],
  ['our', 'hour'],
  ['our', 'are'],
  ['red', 'read'],
  ['then', 'them'],
  ['an', 'and', 'in', 'on'],
  ['were', 'where'],
  ['of', 'off'],
  ['when', 'went', 'want'],
];

export function soundAlike(one: string, two: string): boolean {
  return one !== two && SOUND_ALIKE.some((group) => group.includes(one) && group.includes(two));
}
