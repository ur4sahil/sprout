import type { ItemType, Level, SkillGrade, Visual } from '../../../engine/types';
import type { Skill } from '../../catalogue';

// Catalogue rows added by plan section 15 wave H3. Appended to CATALOGUE after every earlier row.
// Language Arts pre-K (12 skills) and kindergarten (18 skills); the table is in docs/waves/h3.md.

const pic = (emoji: string): Visual => ({ kind: 'emojiGroup', emoji, count: 1, layout: 'row' });
const text = (value: string): Visual => ({ kind: 'text', value, size: 'xl' });
const two = (one: Visual, other: Visual): Visual => ({ kind: 'row', children: [one, other] });

const CATEGORIES: Record<string, Record<string, string>> = {
  PK: { A: 'A. Letters', B: 'B. Sounds', C: 'C. Words', D: 'D. Listening' },
  K: { A: 'A. Letters', B: 'B. Sounds and spelling', C: 'C. Sight words', D: 'D. Words and sentences', E: 'E. Reading' },
};

// Skills whose questions have changed since the wave shipped, and the version each is on now. Every skill went up
// one with the wording audit, round 2 (hints, letter sounds in the steps, clearer prompts).
const VERSIONS: Record<string, number> = {
  'E-PK-A6': 2, 'E-PK-A7': 2, 'E-PK-B4': 2, 'E-PK-B5': 2, 'E-PK-B6': 2, 'E-PK-C3': 2, 'E-PK-C4': 2, 'E-PK-C5': 2, 'E-PK-C6': 3, 'E-PK-C7': 2, 'E-PK-D1': 2, 'E-PK-D2': 2,
  'E-K-A3': 4, 'E-K-A4': 2, 'E-K-A5': 3, 'E-K-B8': 3, 'E-K-B9': 3, 'E-K-B10': 3, 'E-K-B11': 3, 'E-K-B12': 3, 'E-K-B13': 3,
  'E-K-C4': 2, 'E-K-D4': 2, 'E-K-D5': 2, 'E-K-D6': 2, 'E-K-D7': 3, 'E-K-E4': 2, 'E-K-E5': 2, 'E-K-E6': 2, 'E-K-E7': 2,
};

function row(grade: 'PK' | 'K', code: string, name: string, strand: string, ladder: string, icon: Visual, maxLevel: Level, itemTypes: ItemType[], ccss?: string): Skill {
  const letter = code.charAt(0);
  const id = `E-${grade}-${code.replace('.', '')}`;
  return {
    id,
    subject: 'ela',
    grade: grade as SkillGrade,
    category: CATEGORIES[grade]?.[letter] as string,
    code,
    name,
    strand,
    ladder,
    icon,
    speakName: [name],
    version: VERSIONS[id] ?? 1,
    itemTypes,
    maxLevel,
    prereqs: [],
    ...(ccss === undefined ? {} : { ccss }),
  };
}

export const ROWS: readonly Skill[] = [
  // Pre-K
  row('PK', 'A.6', 'Pictures that start with a letter', 'PH', 'letters', two(text('B'), pic('⚽')), 3, ['choice']),
  row('PK', 'A.7', 'Letters in a name', 'LT', 'letters', text('SAM'), 3, ['choice']),
  row('PK', 'B.4', 'Which one starts differently', 'PH', 'sounds', two(pic('🐻'), pic('🌙')), 2, ['choice']),
  row('PK', 'B.5', 'Rhyme or not', 'PH', 'sounds', two(pic('🐭'), pic('🏠')), 2, ['choice']),
  row('PK', 'B.6', 'Sort by first letter', 'PH', 'sounds', two(text('M'), pic('🐭')), 2, ['sort']),
  row('PK', 'C.3', 'Things that go together', 'WD', 'vocabulary', two(pic('🧦'), pic('👟')), 2, ['choice']),
  row('PK', 'C.4', 'Feelings', 'WD', 'vocabulary', two(pic('😀'), pic('😢')), 3, ['choice']),
  row('PK', 'C.5', 'Body words', 'WD', 'vocabulary', two(pic('👂'), pic('✋')), 3, ['choice']),
  row('PK', 'C.6', 'Action words', 'WD', 'vocabulary', pic('🏃'), 2, ['choice']),
  row('PK', 'C.7', 'Helpers and their things', 'WD', 'vocabulary', two(pic('🧑‍🌾'), pic('🚜')), 2, ['choice']),
  row('PK', 'D.1', 'What comes next', 'RD', 'vocabulary', two(pic('🥚'), pic('🐣')), 2, ['choice']),
  row('PK', 'D.2', 'Who did it', 'RD', 'vocabulary', pic('🦆'), 2, ['choice']),
  // Kindergarten
  row('K', 'A.3', 'Match big and small words', 'LT', 'letters', two(text('CAT'), text('cat')), 3, ['match'], 'RF.K.1.d'),
  row('K', 'A.4', 'Vowels', 'LT', 'letters', text('a e i o u'), 3, ['choice'], 'RF.K.3.b'),
  row('K', 'A.5', 'Letter, word or sentence', 'LT', 'letters', text('m  map'), 2, ['sort'], 'RF.K.1.c'),
  row('K', 'B.8', 'Same middle sound', 'PH', 'sounds', two(pic('🐱'), pic('🗺️')), 3, ['choice'], 'RF.K.2.d'),
  row('K', 'B.9', 'Same last sound', 'PH', 'sounds', two(pic('🐱'), pic('🥜')), 2, ['choice'], 'RF.K.2.d'),
  row('K', 'B.10', 'Count the sounds', 'PH', 'sounds', pic('🐟'), 2, ['choice'], 'RF.K.2.d'),
  row('K', 'B.11', 'Change one letter', 'PH', 'phonics', two(text('cat'), pic('🎩')), 3, ['choice'], 'RF.K.2.e'),
  row('K', 'B.12', 'Which word has more claps', 'PH', 'sounds', pic('🍉'), 3, ['choice'], 'RF.K.2.b'),
  row('K', 'B.13', 'Where is the letter', 'PH', 'sounds', text('_ _ t'), 2, ['choice'], 'RF.K.1.a'),
  row('K', 'C.4', 'Sight words in a sentence', 'WD', 'sight-words', text('I see'), 2, ['dragWord'], 'RF.K.3.c'),
  row('K', 'D.4', 'Names start with a capital', 'GR', 'grammar', text('Sam'), 3, ['choice'], 'L.K.2.a'),
  row('K', 'D.5', 'Question words: who, what, where', 'GR', 'grammar', two(pic('👧'), pic('🏫')), 3, ['choice'], 'L.K.1.d'),
  row('K', 'D.6', 'Count the words', 'GR', 'grammar', text('We can run.'), 2, ['choice'], 'RF.K.1.c'),
  row('K', 'D.7', 'Read an action word', 'GR', 'vocabulary', two(text('swim'), pic('🏊')), 2, ['choice'], 'L.K.1.b'),
  row('K', 'E.4', 'Story order', 'RD', 'reading', two(pic('☁️'), pic('🌈')), 2, ['choice', 'order'], 'RL.K.2'),
  row('K', 'E.5', 'Real or make-believe', 'RD', 'reading', pic('🐷'), 2, ['choice']),
  row('K', 'E.6', 'Which sentence matches the picture', 'RD', 'reading', pic('🐶'), 2, ['choice'], 'RF.K.4'),
  row('K', 'E.7', 'Read and answer', 'RD', 'reading', pic('🐸'), 2, ['choice'], 'RL.K.1'),
];
