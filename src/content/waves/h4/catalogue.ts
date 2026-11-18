import type { ItemType, Level, Say, Visual } from '../../../engine/types';
import type { Skill } from '../../catalogue';

// Catalogue rows added by plan section 15 wave H4. Appended to CATALOGUE after every earlier row.
// Language Arts grades 1 and 2; the skill table is in docs/waves/h4.md.

const CATEGORIES: Record<string, string> = { A: 'A. Phonics', B: 'B. Words', C: 'C. Grammar', D: 'D. Reading' };
const STRANDS: Record<string, string> = { A: 'PH', B: 'WD', C: 'GR', D: 'RD' };
const LADDERS: Record<string, string> = { A: 'phonics', B: 'vocabulary', C: 'grammar', D: 'reading' };

const word = (value: string): Visual => ({ kind: 'text', value, size: 'm' });
const emoji = (value: string): Visual => ({ kind: 'emojiGroup', emoji: value, count: 1, layout: 'row' });

// Names that read badly letter by letter are said another way.
const SPOKEN: Record<string, Say> = {
  'E-1-A6': ['Word endings'],
  'E-1-A7': ['Endings like duck, ring and pink'],
  'E-1-A8': [{ letter: 'y' }, 'as a vowel'],
  'E-1-C5': ['One or more'],
  'E-1-C9': ['Joining words'],
  'E-2-A4': ['Vowel sounds in coin, boy, mouse and cow'],
  'E-2-A5': ['Soft and hard', { letter: 'c' }, 'and', { letter: 'g' }],
  'E-2-A6': ['Silent letters'],
  'E-2-B8': ['ABC order to the second letter'],
};

// Skills whose questions have changed since the wave shipped, and the version each is on now.
const VERSIONS: Record<string, number> = { 'E-1-C8': 2 };

function skill(id: string, name: string, icon: Visual, itemTypes: ItemType[], maxLevel: Level, ccss: string, ladder?: string): Skill {
  const [, grade, code] = id.split('-') as [string, '1' | '2', string];
  const letter = code.charAt(0);
  return {
    id,
    subject: 'ela',
    grade,
    category: CATEGORIES[letter] as string,
    code: `${letter}.${code.slice(1)}`,
    name,
    strand: STRANDS[letter] as string,
    ladder: ladder ?? (LADDERS[letter] as string),
    icon,
    speakName: SPOKEN[id] ?? [name],
    version: VERSIONS[id] ?? 1,
    itemTypes,
    maxLevel,
    prereqs: [],
    ccss,
  };
}

export const ROWS: readonly Skill[] = [
  // Grade 1
  skill('E-1-A6', 'Endings s, ed, ing', word('jump + ed'), ['choice'], 3, 'L.1.4.c'),
  skill('E-1-A7', 'Endings ck, ng, nk', word('duck ring'), ['choice'], 3, 'RF.1.3.a'),
  skill('E-1-A8', 'Y as a vowel', word('fly baby'), ['sort', 'choice'], 3, 'RF.1.3'),
  skill('E-1-B4', 'Sight words, set 5', word('because'), ['choice'], 2, 'RF.1.3.g', 'sight-words'),
  skill('E-1-B5', 'ABC order', word('a b c'), ['choice', 'order'], 3, 'L.1.2'),
  skill('E-1-B6', 'Word groups', word('red blue'), ['choice'], 3, 'L.1.5.a'),
  skill('E-1-C4', 'Pronouns', word('he she'), ['choice'], 3, 'L.1.1.d'),
  skill('E-1-C5', 'One or more: runs or run', word('runs run'), ['choice'], 3, 'L.1.1.c'),
  skill('E-1-C6', 'Capitals for days and months', word('Monday'), ['choice'], 3, 'L.1.2.a'),
  skill('E-1-C7', 'Common and proper nouns', word('dog Rex'), ['choice', 'sort'], 3, 'L.1.1.b'),
  skill('E-1-C8', 'Question words', word('Who? Where?'), ['choice'], 3, 'L.1.1.j'),
  skill('E-1-C9', 'Joining words: and, but, or', word('and but or'), ['choice'], 2, 'L.1.1.g'),
  skill('E-1-D6', 'Story or facts', emoji('📚'), ['choice'], 2, 'RL.1.5'),
  skill('E-1-D7', 'Who is telling the story', emoji('🗣️'), ['choice'], 2, 'RL.1.6'),
  skill('E-1-D8', 'Feelings in a story', emoji('😊'), ['choice'], 2, 'RL.1.4'),
  // Grade 2
  skill('E-2-A4', 'Vowel sounds oi, oy, ou, ow', word('oi oy ou'), ['choice'], 3, 'RF.2.3.b'),
  skill('E-2-A5', 'Soft and hard c and g', word('city cat'), ['sort'], 3, 'RF.2.3'),
  skill('E-2-A6', 'Silent letters: kn, wr, mb', word('knife'), ['choice'], 3, 'RF.2.3.e'),
  skill('E-2-B6', 'Shades of meaning', word('warm hot'), ['choice', 'order'], 3, 'L.2.5.b'),
  skill('E-2-B7', 'Words with two meanings', word('bat'), ['choice'], 3, 'L.2.4.a'),
  skill('E-2-B8', 'ABC order to the second letter', word('sand sun'), ['choice', 'order'], 3, 'L.2.2'),
  skill('E-2-B9', 'Guide words', word('cake — fan'), ['choice'], 3, 'L.2.4.e'),
  skill('E-2-C5', 'Group names', emoji('🐝'), ['choice'], 3, 'L.2.1.a'),
  skill('E-2-C6', 'Myself, himself, herself', word('myself'), ['choice'], 3, 'L.2.1.c'),
  skill('E-2-C7', 'Adverbs', word('slowly'), ['choice'], 3, 'L.2.1.e'),
  skill('E-2-C8', 'Complete sentences', word('Who? Did?'), ['choice'], 3, 'L.2.1.f'),
  skill('E-2-D7', 'Text features', emoji('📑'), ['choice'], 3, 'RI.2.5'),
  skill('E-2-D8', 'Poems: rhyme and repeated lines', emoji('📝'), ['choice'], 2, 'RL.2.4'),
  skill('E-2-D9', 'Compare two stories', emoji('📖'), ['choice'], 2, 'RL.2.9'),
  skill('E-2-D10', "Author's purpose", emoji('✏️'), ['choice'], 2, 'RI.2.6'),
];
