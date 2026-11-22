import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { awardSkills } from '../../src/app/awardsRun';
import { useAppStore } from '../../src/app/store';
import { CHECK_IN_SUBJECTS, diagnosticLadders } from '../../src/app/checkIn';
import { summariseDay } from '../../src/app/childDay';
import { popSkills } from '../../src/app/games';
import { mixedBagOrder } from '../../src/app/mixedBag';
import { CATALOGUE, skillById } from '../../src/content/catalogue';
import { LADDERS } from '../../src/content/ladders';
import { offeredTo } from '../../src/engine/grades';
import { rankCandidates } from '../../src/engine/recommend';
import { gardenSkills } from '../../src/garden/layout';
import type { Attempt, Child, Grade, Plan, SkillState } from '../../src/storage/schema';
import { defaultSettings, newSkillState } from '../../src/storage/schema';
import { openApp, setUp } from './practiceHelpers';

// Word puzzles from grade 1 only (the owner's choice, Nov 22, 2026): R-A15 "Word analogies" and R-A16 "Which word
// does not belong" are words only, so a pre-K or kindergarten child is never offered them, anywhere. From grade 1 they
// are offered as before. Every rule here is checked both ways.

const WORDS = ['R-A15', 'R-A16'];
const TODAY = '2026-03-09';
const NOW = `${TODAY}T16:30:00.000Z`;
const EARLIER = '2026-02-20T16:30:00.000Z';

const child = (grade: Grade): Child => ({ id: 'kid-1', name: 'Robin', avatar: '🐢', grade, settings: { ...defaultSettings(grade), planPractice: ['reasoning'], planNew: true, planMixed: true }, resetAt: null, levelWeeks: [], storiesRead: [], stickersPlaced: [], createdAt: NOW, updatedAt: NOW, deletedAt: null });
const state = (skillId: string, change: Partial<SkillState>): SkillState => ({ ...newSkillState('kid-1', skillId, EARLIER), ...change });
const mastered = (skillId: string): SkillState => state(skillId, { attempts: 15, correct: 15, score: 100, bestScore: 100, masteredAt: EARLIER, lastPracticedAt: EARLIER, reviewDueAt: '2026-03-01T12:00:00.000Z' });
let made = 0;
const answer = (skillId: string, right: boolean, day = TODAY): Attempt => ({ id: `${skillId}-${(made += 1)}`, childId: 'kid-1', skillId, sessionId: 's1', level: 1, seed: made, itemType: 'choice', response: { index: 0 }, contentVersion: 1, snapshot: { prompt: '', correct: '', given: '' }, correct: right, hinted: false, ms: 3000, scoreBefore: 0, scoreAfter: 0, kind: 'practice', day, createdAt: `${day}T15:00:00.000Z` });

// A child who already holds both puzzles, as one who used them before the rule would: the picture puzzles before them
// on their ladder are mastered (so R-A15 is next), R-A15 is mastered and due for review, R-A16 is in progress,
// practised today and a trouble spot, and a grown-up's plan names both.
const STATES: SkillState[] = [
  mastered('R-A9'),
  mastered('R-A14'),
  // R-A15 is the longest overdue, so it is the review Sprout would pick first.
  { ...mastered('R-A15'), reviewDueAt: '2026-02-25T12:00:00.000Z' },
  state('R-A16', { attempts: 6, correct: 2, score: 30, bestScore: 30, recent: [false, false, true, false, true, false], lastPracticedAt: NOW, updatedAt: NOW }),
];
const ATTEMPTS: Attempt[] = [...Array.from({ length: 4 }, (_, i) => answer('R-A16', i % 2 === 0, '2026-03-05')), answer('R-A16', false), answer('R-A16', true)];
const PLAN: Plan = { id: 'p1', name: 'Words', skillIds: ['R-A15', 'R-A16', 'R-A8'], childIds: ['kid-1'], createdAt: EARLIER, updatedAt: EARLIER, deletedAt: null };

function day(grade: Grade): ReturnType<typeof summariseDay> {
  return summariseDay({ child: child(grade), nowIso: NOW, states: STATES, attempts: ATTEMPTS, sessions: [], plans: [PLAN], diagnostics: [], canListen: true });
}
const inPlan = (summary: ReturnType<typeof summariseDay>): string[] => summary.plan.flatMap((part) => (part.kind === 'review' ? part.skillIds : part.kind === 'mixed' ? [] : [part.skillId]));
const ranked = (grade: Grade): string[] =>
  rankCandidates({ childId: 'kid-1', grade, nowIso: NOW, skills: CATALOGUE, ladders: LADDERS, states: STATES, plans: [PLAN], placements: {}, attemptsLast14Days: { 'R-A16': 6 }, lastSessionSkillId: null, canListen: true, isListenNext: () => false, hasGenerator: () => true }).map((pick) => pick.skillId);

describe('the word puzzles start at grade 1', () => {
  it('are the only skills with a youngest grade, and it is grade 1', () => {
    expect(CATALOGUE.filter((skill) => skill.fromGrade !== undefined).map((skill) => [skill.id, skill.fromGrade])).toEqual([['R-A15', '1'], ['R-A16', '1']]);
    for (const id of WORDS) {
      const skill = skillById(id);
      if (!skill) throw new Error(id);
      expect(offeredTo(skill, 'PK')).toBe(false);
      expect(offeredTo(skill, 'K')).toBe(false);
      for (const grade of ['1', '2', '3', '4', '5'] as Grade[]) expect(offeredTo(skill, grade)).toBe(true);
    }
    // Every other skill is offered at every grade, as before.
    for (const skill of CATALOGUE.filter((each) => !WORDS.includes(each.id))) expect(offeredTo(skill, 'PK'), skill.id).toBe(true);
  });

  it('are never Sprout\'s picks for a pre-K or kindergarten child: not next, not to continue, not a plan\'s, not a trouble spot', () => {
    for (const grade of ['PK', 'K'] as Grade[]) {
      const picks = ranked(grade);
      expect(picks.length, grade).toBeGreaterThan(0);
      for (const id of WORDS) expect(picks, grade).not.toContain(id);
      // The plan's next skill after the two puzzles is offered instead.
      expect(picks).toContain('R-A8');
    }
    expect(ranked('1')).toEqual(expect.arrayContaining(WORDS));
  });

  it('are never in a pre-K or kindergarten child\'s plan for today, nor reviewed; a grade 1 child gets both', () => {
    for (const grade of ['PK', 'K'] as Grade[]) {
      const summary = day(grade);
      expect(summary.plan.length, grade).toBeGreaterThan(0);
      for (const id of WORDS) {
        expect(inPlan(summary), grade).not.toContain(id);
        expect(summary.picks.map((pick) => pick.skillId), grade).not.toContain(id);
        expect(summary.reviewsDue, grade).not.toContain(id);
      }
    }
    const first = day('1');
    expect(first.reviewsDue).toContain('R-A15');
    expect(first.plan.find((part) => part.kind === 'keepGoing' && part.subject === 'reasoning')).toMatchObject({ skillId: 'R-A16' });
  });

  it('are never in a pre-K or kindergarten child\'s Mixed bag, nor in Pop; a grade 1 child has them', () => {
    for (const grade of ['PK', 'K'] as Grade[]) {
      for (const id of WORDS) expect(mixedBagOrder(STATES, LADDERS, grade), grade).not.toContain(id);
      expect(popSkills(child(grade), STATES).map((each) => each.skillId), grade).not.toContain('R-A16');
    }
    expect(mixedBagOrder(STATES, LADDERS, '1')).toContain('R-A16');
    expect(popSkills(child('1'), STATES).map((each) => each.skillId)).toContain('R-A16');
  });

  it('are never in the check-in, at any grade: Reasoning is never checked', () => {
    expect(CHECK_IN_SUBJECTS).toEqual(['math', 'ela']);
    for (const subject of CHECK_IN_SUBJECTS) for (const ladder of diagnosticLadders(subject)) for (const id of WORDS) expect(ladder.skills.map((skill) => skill.id)).not.toContain(id);
  });

  it('are not plants in a pre-K or kindergarten garden, even started; a grade 1 garden has them', () => {
    for (const grade of ['PK', 'K'] as Grade[]) for (const id of WORDS) expect(gardenSkills({ grade, states: STATES, skills: CATALOGUE, plan: [] }).map((skill) => skill.id), grade).not.toContain(id);
    expect(gardenSkills({ grade: '1', states: STATES, skills: CATALOGUE, plan: [] }).map((skill) => skill.id)).toEqual(expect.arrayContaining(WORDS));
  });

  it('do not count toward a pre-K or kindergarten child\'s stickers and certificates, and do from grade 1', () => {
    for (const grade of ['PK', 'K'] as Grade[]) for (const id of WORDS) expect(awardSkills(grade).map((skill) => skill.id), grade).not.toContain(id);
    expect(awardSkills('1').map((skill) => skill.id)).toEqual(expect.arrayContaining(WORDS));
    // A list for grown-ups to choose from, or a plan for several children, still holds every skill.
    expect(awardSkills().map((skill) => skill.id)).toEqual(expect.arrayContaining(WORDS));
  });
});

describe('the Reasoning page', () => {
  // The subject page never locks a skill: one above the child's grade sits under its own grade tab. Reasoning has no
  // grade tabs, so for a pre-K or kindergarten child the two word puzzles are left off the page.
  async function shown(grade: Grade): Promise<string[]> {
    const kid = await setUp(grade);
    useAppStore.getState().setChild(kid);
    openApp('/subject/reasoning');
    await screen.findByRole('heading', { name: /Reasoning/ });
    await waitFor(() => expect(document.querySelectorAll('[data-skill]').length).toBeGreaterThan(0));
    return [...document.querySelectorAll('[data-skill]')].map((tile) => tile.getAttribute('data-skill') ?? '');
  }
  const reasoning = CATALOGUE.filter((skill) => skill.subject === 'reasoning' && !skill.retired).map((skill) => skill.id);

  it('does not show a kindergarten child the word puzzles', async () => {
    const tiles = await shown('K');
    for (const id of WORDS) expect(tiles).not.toContain(id);
    expect(tiles).toEqual(reasoning.filter((id) => !WORDS.includes(id)));
    expect(screen.queryByRole('button', { name: /^Word analogies\./ })).toBeNull();
  });

  it('does not show a pre-K child the word puzzles', async () => {
    const tiles = await shown('PK');
    for (const id of WORDS) expect(tiles).not.toContain(id);
  });

  it('shows a grade 1 child every Reasoning skill, the word puzzles too', async () => {
    const tiles = await shown('1');
    expect(tiles).toEqual(reasoning);
    expect(screen.getByRole('button', { name: /^Word analogies\./ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Which word does not belong\./ })).toBeTruthy();
  });
});
