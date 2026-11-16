import type { ItemType, Level, Say, SkillGrade, Visual } from '../engine/types';

// Every skill row (plan section 8). Screens read skills from here.

export interface Skill {
  id: string; // 'M-K-C4' = Math, Kindergarten, category C, skill 4
  subject: 'math' | 'ela' | 'reasoning';
  grade: SkillGrade;
  category: string; // 'C. Addition'
  code: string; // 'C.4', shown to the child and parent
  name: string; // 'Add to 10'
  strand: string; // reporting group
  ladder: string; // ladder id, plan section 7
  icon: Visual; // picture tile for children who cannot read yet
  speakName: Say; // short spoken name
  version: number; // starts at 1; bump when any seed's output changes
  itemTypes: ItemType[];
  maxLevel: Level;
  prereqs: string[]; // extra prerequisites, on top of the ladder default
  retired?: true; // hidden from children, history kept
  ccss?: string; // Common Core code where one applies
  vaSol?: string; // Virginia SOL code, filled in a later content pass
  video?: { youtubeId: string; title: string; source: string; seconds: number };
}

// Raised by one in every content phase (plan section 7, Catalogue growth).
export const CATALOGUE_VERSION = 1;

export const CATALOGUE: readonly Skill[] = [
  {
    id: 'M-PK-A2',
    subject: 'math',
    grade: 'PK',
    category: 'A. Counting',
    code: 'A.2',
    name: 'Count to 5',
    strand: 'CC',
    ladder: 'counting',
    icon: { kind: 'emojiGroup', emoji: '🍎', count: 5, layout: 'row' },
    speakName: ['Count to', { number: 5 }],
    version: 1,
    itemTypes: ['choice'],
    maxLevel: 3,
    prereqs: [],
  },
  {
    id: 'M-K-B3',
    subject: 'math',
    grade: 'K',
    category: 'B. Comparing',
    code: 'B.3',
    name: 'Put numbers in order',
    strand: 'CC',
    ladder: 'comparing',
    icon: { kind: 'text', value: '1 2 3', size: 'l' },
    speakName: ['Put numbers in order'],
    version: 1,
    itemTypes: ['order'],
    maxLevel: 3,
    prereqs: [],
    ccss: 'K.CC.C.7',
  },
  {
    id: 'M-K-C4',
    subject: 'math',
    grade: 'K',
    category: 'C. Addition',
    code: 'C.4',
    name: 'Add to 10',
    strand: 'OA',
    ladder: 'add-subtract',
    icon: { kind: 'equation', parts: [2, '+', 3] },
    speakName: ['Add to', { number: 10 }],
    version: 1,
    itemTypes: ['choice', 'numberPad'],
    maxLevel: 4,
    prereqs: [],
    ccss: 'K.OA.A.2',
  },
];

export function skillById(id: string): Skill | undefined {
  return CATALOGUE.find((skill) => skill.id === id);
}
