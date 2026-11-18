import type { Who } from '../cast/types';
import type { Skill } from '../content/catalogue';
import type { BackdropName, Lesson } from './types';

// The place each lesson happens in (game feel, phase 6): a backdrop for each topic, and the friend who teaches there.

export const PLACES = ['picnic', 'stall', 'workshop', 'site', 'shop', 'treehouse', 'nook', 'pond'] as const;
export type Place = (typeof PLACES)[number];

// A topic is a skill's ladder (plan section 7): it says what a skill is about more closely than its category, and
// it is the same in every grade.
const BY_LADDER: Readonly<Record<string, Place>> = {
  counting: 'picnic',
  comparing: 'picnic',
  patterns: 'picnic',
  'add-subtract': 'stall',
  'multiply-divide': 'stall',
  'place-value': 'workshop',
  shapes: 'site',
  fractions: 'site',
  length: 'shop',
  measures: 'shop',
  time: 'shop',
  money: 'shop',
  data: 'shop',
  letters: 'treehouse',
  sounds: 'treehouse',
  phonics: 'treehouse',
  'sight-words': 'nook',
  vocabulary: 'nook',
  grammar: 'nook',
  reading: 'nook',
};

// A ladder added later still gets a place: the subject's own.
const BY_SUBJECT: Readonly<Record<Skill['subject'], Place>> = { math: 'picnic', ela: 'nook', reasoning: 'pond' };

export function backdropFor(skill: Pick<Skill, 'subject' | 'ladder'>): Place {
  if (skill.subject === 'reasoning') return 'pond';
  return BY_LADDER[skill.ladder] ?? BY_SUBJECT[skill.subject];
}

// Who teaches in each place: Sprout for Math, with Pip helping; Olive for Language Arts; Finn for Reasoning.
// The plain table (lessons written before the places) keeps Sprout alone.
export interface StageCast {
  host: Who;
  helper: Who | null;
}

const MATH: StageCast = { host: 'sprout', helper: 'pip' };
const CAST: Readonly<Record<BackdropName, StageCast>> = {
  table: { host: 'sprout', helper: null },
  picnic: MATH,
  stall: MATH,
  workshop: MATH,
  site: MATH,
  shop: MATH,
  treehouse: { host: 'olive', helper: null },
  nook: { host: 'olive', helper: null },
  pond: { host: 'finn', helper: null },
};

export function castOn(backdrop: BackdropName | undefined): StageCast {
  return CAST[backdrop ?? 'table'];
}

// The place a whole lesson stands in: the backdrop of its first scene.
export function lessonBackdrop(lesson: Lesson): BackdropName | undefined {
  for (const part of lesson.parts) {
    const first = part.kind === 'show' ? part.moment : part.turn.why[0];
    if (first) return first.scene.backdrop;
  }
  return undefined;
}
