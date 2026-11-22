import type { Skill } from '../content/catalogue';
import { skillById } from '../content/catalogue';
import { ALPHABET } from '../content/data/letters';
import { allGenerators, nextQuestion } from '../content/registry';
import { offeredTo } from '../engine/grades';
import type { Rng } from '../engine/rng';
import { seedFor } from '../engine/seed';
import { lastWasMiss, levelToAsk } from '../engine/skillscore';
import type { Question, Visual } from '../engine/types';
import type { Child, Grade, SkillState } from '../storage/schema';

// The two games offered after a finished session (plan section 10, Games).

// ---- Pop ----
// Balloons carry the answer options. Each answer is normal practice and moves the Skill Score.

export const POP_ROUND = 10;

export interface PopTurn {
  skill: Skill;
  state: SkillState;
  question: Extract<Question, { type: 'choice' }>;
}

// The question a skill would ask next in practice, when that is a choice question.
export function popTurn(child: Child, state: SkillState, recentKeys: readonly string[] = []): PopTurn | null {
  const skill = skillById(state.skillId);
  if (!skill || skill.retired || !offeredTo(skill, child.grade) || !allGenerators().some((generator) => generator.skillId === skill.id)) return null;
  // In progress: started, and not yet mastered or placed out.
  if (state.attempts === 0 || state.score >= 100 || state.placedOut) return null;
  const level = levelToAsk(state.score, lastWasMiss(state), skill.maxLevel);
  const question = nextQuestion(skill.id, level, seedFor(child.id, skill.id, 'practice', state.attempts), recentKeys);
  return question.type === 'choice' ? { skill, state, question } : null;
}

// The skills Pop can draw on. When there are none, Pop is not offered.
export function popSkills(child: Child, states: readonly SkillState[]): SkillState[] {
  return states.filter((state) => state.childId === child.id && popTurn(child, state) !== null).sort((one, two) => one.skillId.localeCompare(two.skillId));
}

// ---- Pairs ----
// A memory game of 6 face-down pairs. It is a reward: it logs nothing and changes no score.

export const PAIR_COUNT = 6;

export interface PairCard {
  id: number; // its place in the deck
  pair: number; // two cards with the same number go together
  visual: Visual;
  name: string; // what a screen reader says when the card is face up
}

export type PairKind = 'dots' | 'letters' | 'frames' | 'teenFrames' | 'doubles';

// What a grade's pairs are made of, from the content that grade practises.
const OLDER: readonly PairKind[] = ['doubles', 'teenFrames'];
export const PAIR_KINDS: Record<Grade, readonly PairKind[]> = { PK: ['dots'], K: ['letters', 'frames'], '1': ['teenFrames', 'letters'], '2': OLDER, '3': OLDER, '4': OLDER, '5': OLDER };

const numeral = (value: number): Visual => ({ kind: 'text', value: String(value), size: 'l' });
const letter = (value: string): Visual => ({ kind: 'text', value, size: 'l' });

function halves(kind: PairKind, rng: Rng): [{ visual: Visual; name: string }, { visual: Visual; name: string }][] {
  if (kind === 'letters') {
    // Capital I and small l look the same, so they never share a game.
    const letters = rng.sample(ALPHABET.filter((each) => each !== 'l'), PAIR_COUNT);
    return letters.map((each) => [{ visual: letter(each.toUpperCase()), name: `big ${each.toUpperCase()}` }, { visual: letter(each), name: `small ${each}` }]);
  }
  const numbers = kind === 'dots' || kind === 'frames' ? rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], PAIR_COUNT) : kind === 'teenFrames' ? rng.sample([11, 12, 13, 14, 15, 16, 17, 18, 19, 20], PAIR_COUNT) : rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10], PAIR_COUNT);
  return numbers.map((n) => {
    if (kind === 'dots') return [{ visual: numeral(n), name: `the number ${n}` }, { visual: { kind: 'emojiGroup', emoji: '⚫', count: n, layout: 'grid5' }, name: n === 1 ? '1 dot' : `${n} dots` }];
    if (kind === 'doubles') return [{ visual: { kind: 'equation', parts: [n, '+', n] }, name: `${n} plus ${n}` }, { visual: numeral(n * 2), name: `the number ${n * 2}` }];
    return [{ visual: numeral(n), name: `the number ${n}` }, { visual: { kind: 'tenFrame', filled: n, frames: n > 10 ? 2 : 1 }, name: `a ten frame showing ${n}` }];
  });
}

// Twelve cards, shuffled: six pairs of one kind for the child's grade.
export function pairsDeck(grade: Grade, rng: Rng): { kind: PairKind; cards: PairCard[] } {
  const kind = rng.pick(PAIR_KINDS[grade]);
  const cards = halves(kind, rng).flatMap(([one, two], pair) => [{ pair, ...one }, { pair, ...two }]);
  return { kind, cards: rng.shuffle(cards).map((card, id) => ({ id, ...card })) };
}
