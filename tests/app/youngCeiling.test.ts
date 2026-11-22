import { describe, expect, it, vi } from 'vitest';
import { CHECK_IN_SUBJECTS, diagnosticLadders } from '../../src/app/checkIn';
import { isListenNext } from '../../src/app/childDay';
import { popTurn } from '../../src/app/games';
import { mixedTurn } from '../../src/app/mixedBag';
import { pickQuestion } from '../../src/app/usePractice';
import { reviewTurn } from '../../src/app/useReview';
import { buildSheet } from '../../src/app/worksheet';
import { CATALOGUE, skillById } from '../../src/content/catalogue';
import type { Skill } from '../../src/content/catalogue';
import { maxLevelFor } from '../../src/engine/grades';
import { REVIEW_LEVEL } from '../../src/engine/review';
import { teachingPart2For } from '../../src/lessons';
import type { Child, Grade, SkillState } from '../../src/storage/schema';
import { defaultSettings, newSkillState } from '../../src/storage/schema';

// A young child's ceiling (the owner's choice, Nov 22, 2026): a pre-K or kindergarten child is never asked number
// analogies (R-A8) above level 1, "goes up by 1" with dots, and masters it there. A grade 1 child climbs all four
// levels, as before. `maxLevelFor` decides it, and every place that chooses a level for a child reads it.

// The levels the day's summary asks the generators for, to see which level its listen check looks at.
const asked = vi.hoisted(() => [] as number[]);
vi.mock('../../src/content/registry', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/content/registry')>();
  return {
    ...real,
    generateQuestion: (skillId: string, level: number, seed: number) => {
      asked.push(level);
      return real.generateQuestion(skillId, level, seed);
    },
  };
});

const NOW = '2026-03-09T16:30:00.000Z';
const YOUNG: readonly Grade[] = ['PK', 'K'];
const OLDER: readonly Grade[] = ['1', '2', '3'];
const child = (grade: Grade): Child => ({ id: 'kid-1', name: 'Robin', avatar: '🐢', grade, settings: defaultSettings(grade), resetAt: null, levelWeeks: [], storiesRead: [], stickersPlaced: [], createdAt: NOW, updatedAt: NOW, deletedAt: null });
// In progress at a score that asks for the given stage: 95 is level 4, 75 level 3, 45 level 2.
const state = (score: number): SkillState => ({ ...newSkillState('kid-1', 'R-A8', NOW), attempts: 12, correct: 11, score, bestScore: score, recent: [true, true, true], lastPracticedAt: NOW });
const analogies = (): Skill => {
  const skill = skillById('R-A8');
  if (!skill) throw new Error('R-A8 is missing');
  return skill;
};

describe('the young-grade ceiling', () => {
  it('only number analogies has one, and it is level 1', () => {
    expect(CATALOGUE.filter((skill) => skill.youngMaxLevel !== undefined).map((skill) => [skill.id, skill.youngMaxLevel])).toEqual([['R-A8', 1]]);
  });

  it('caps a pre-K or kindergarten child at level 1 and leaves every other grade the whole skill', () => {
    for (const grade of YOUNG) expect(maxLevelFor(analogies(), grade), grade).toBe(1);
    for (const grade of [...OLDER, '4', '5'] as Grade[]) expect(maxLevelFor(analogies(), grade), grade).toBe(4);
    // A skill without a ceiling is asked to its top at every grade.
    for (const skill of CATALOGUE.filter((each) => each.youngMaxLevel === undefined)) {
      for (const grade of [...YOUNG, ...OLDER]) expect(maxLevelFor(skill, grade), `${skill.id} ${grade}`).toBe(skill.maxLevel);
    }
  });
});

describe('every place that chooses a level for a child reads the ceiling', () => {
  it('practice, at a score that asks for the top level', () => {
    for (const grade of YOUNG) for (const score of [45, 75, 95, 99]) expect(pickQuestion(child(grade), analogies(), state(score), []).level, `${grade} ${score}`).toBe(1);
    for (const grade of OLDER) {
      expect(pickQuestion(child(grade), analogies(), state(45), []).level).toBe(2);
      expect(pickQuestion(child(grade), analogies(), state(75), []).level).toBe(3);
      expect(pickQuestion(child(grade), analogies(), state(95), []).level).toBe(4);
    }
  });

  it('the short skip test, which asks at the hardest level the child is asked', () => {
    for (const grade of YOUNG) expect(pickQuestion(child(grade), analogies(), newSkillState('kid-1', 'R-A8', NOW), [], true).level, grade).toBe(1);
    for (const grade of OLDER) expect(pickQuestion(child(grade), analogies(), newSkillState('kid-1', 'R-A8', NOW), [], true).level, grade).toBe(4);
  });

  it('the Mixed bag', () => {
    for (const grade of YOUNG) expect(mixedTurn(child(grade), analogies(), state(95), []).level, grade).toBe(1);
    for (const grade of OLDER) expect(mixedTurn(child(grade), analogies(), state(95), []).level, grade).toBe(4);
  });

  it('Pop: a kindergarten child gets a level 1 balloon where a grade 1 child gets level 3, or none at the typed level', () => {
    for (const grade of YOUNG) {
      for (const score of [75, 95]) expect(popTurn(child(grade), state(score))?.question.level, `${grade} ${score}`).toBe(1);
    }
    for (const grade of OLDER) {
      expect(popTurn(child(grade), state(75))?.question.level).toBe(3);
      // Level 4 is typed, so Pop has no balloon question for it.
      expect(popTurn(child(grade), state(95))).toBeNull();
    }
  });

  it('a review', () => {
    for (const grade of YOUNG) expect(reviewTurn(child(grade), analogies(), 0, []).level, grade).toBe(1);
    for (const grade of OLDER) expect(reviewTurn(child(grade), analogies(), 0, []).level, grade).toBe(REVIEW_LEVEL);
  });

  it('the day\'s check on whether the next question is a listen question', () => {
    for (const grade of YOUNG) {
      asked.length = 0;
      expect(isListenNext(child(grade), analogies(), state(95))).toBe(false);
      expect(asked, grade).toEqual([1]);
    }
    for (const grade of OLDER) {
      asked.length = 0;
      isListenNext(child(grade), analogies(), state(95));
      expect(asked, grade).toEqual([4]);
    }
  });

  it('a worksheet, even one harder', () => {
    const sheet = (grade: Grade, shift: -1 | 0 | 1) => buildSheet([analogies()], [state(95)], { skillIds: ['R-A8'], count: 4, shift, seed: 3, grade }).items.map((item) => item.question.level);
    for (const grade of YOUNG) {
      expect(sheet(grade, 1), grade).toEqual([1, 1, 1, 1]);
      expect(sheet(grade, 0), grade).toEqual([1, 1, 1, 1]);
    }
    for (const grade of OLDER) {
      expect(sheet(grade, 0), grade).toEqual([4, 4, 4, 4]);
      expect(sheet(grade, -1), grade).toEqual([3, 3, 3, 3]);
    }
  });

  it('the check-in walks each skill only up to what the child is asked (Reasoning is never checked)', () => {
    for (const grade of [...YOUNG, ...OLDER]) {
      for (const subject of CHECK_IN_SUBJECTS) {
        for (const ladder of diagnosticLadders(subject, grade)) {
          for (const each of ladder.skills) expect(each.maxLevel, `${each.id} ${grade}`).toBe(maxLevelFor(skillById(each.id) as Skill, grade));
        }
      }
    }
  });

  it('the second lesson, which teaches the harder levels, is not offered to a child who is never asked them', () => {
    for (const grade of YOUNG) expect(teachingPart2For('R-A8', grade), grade).toBeNull();
    for (const grade of OLDER) expect(teachingPart2For('R-A8', grade), grade).not.toBeNull();
    // Every other skill's second lesson is offered as before.
    for (const grade of YOUNG) expect(teachingPart2For('R-A10', grade), grade).not.toBeNull();
  });
});
