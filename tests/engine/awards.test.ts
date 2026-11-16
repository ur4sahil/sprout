// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Skill } from '../../src/content/catalogue';
import type { AwardTotals } from '../../src/engine/awards';
import { allAwards, boardOf, evaluateAwards, isQuietAward } from '../../src/engine/awards';
import type { SkillState } from '../../src/storage/schema';
import { newSkillState } from '../../src/storage/schema';

const NOW = '2026-03-02T15:00:00.000Z';
const NONE: AwardTotals = { questionsAnswered: 0, daysPractised: 0, diagnosticsFinished: { math: false, ela: false } };

function skill(id: string, subject: Skill['subject'], grade: Skill['grade'], code: string, change: Partial<Skill> = {}): Skill {
  return {
    id,
    subject,
    grade,
    category: `${code.split('.')[0]}. Group`,
    code,
    name: id,
    strand: 'X',
    ladder: 'x',
    icon: { kind: 'text', value: id, size: 'm' },
    speakName: ['Test'],
    version: 1,
    itemTypes: ['choice'],
    maxLevel: 4,
    prereqs: [],
    ...change,
  };
}

// A board of 16 pre-K math skills in two categories, a board of 4, and reasoning.
const PK = Array.from({ length: 16 }, (_, i) => skill(`M-PK-${i < 8 ? 'A' : 'B'}${(i % 8) + 1}`, 'math', 'PK', `${i < 8 ? 'A' : 'B'}.${(i % 8) + 1}`));
const SMALL = Array.from({ length: 4 }, (_, i) => skill(`E-K-A${i + 1}`, 'ela', 'K', `A.${i + 1}`));
const REASON = [skill('R-A1', 'reasoning', 'all', 'A.1'), skill('R-A2', 'reasoning', 'all', 'A.2')];
const SKILLS = [...PK, ...SMALL, ...REASON];

const mastered = (skillId: string): SkillState => ({ ...newSkillState('kid', skillId, NOW), score: 100, bestScore: 100, masteredAt: NOW });
const scored = (skillId: string, score: number, placedOut = false): SkillState => ({ ...newSkillState('kid', skillId, NOW), score, bestScore: score, placedOut });

describe('boards', () => {
  it('there is one board for each subject and grade, and one for reasoning', () => {
    expect(boardOf(PK[0] as Skill)).toBe('math-PK');
    expect(boardOf(SMALL[0] as Skill)).toBe('ela-K');
    expect(boardOf(REASON[0] as Skill)).toBe('reasoning');
  });

  it('leaves out a mastered threshold above the board\'s number of skills', () => {
    const ids = allAwards(SKILLS).map((award) => award.id);
    expect(ids.filter((id) => id.startsWith('mastered:math-PK:'))).toEqual(['1', '3', '5', '10', '15', 'all'].map((n) => `mastered:math-PK:${n}`));
    expect(ids.filter((id) => id.startsWith('mastered:ela-K:'))).toEqual(['1', '3', 'all'].map((n) => `mastered:ela-K:${n}`));
    expect(ids.filter((id) => id.startsWith('mastered:reasoning:'))).toEqual(['mastered:reasoning:1', 'mastered:reasoning:all']);
    expect(ids).toContain('category:math-PK:A');
    expect(ids).toContain('category:math-PK:B');
    expect(ids.filter((id) => id.startsWith('questions:'))).toHaveLength(6);
    expect(ids.filter((id) => id.startsWith('days:'))).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('evaluateAwards', () => {
  it('earns nothing from nothing', () => {
    expect(evaluateAwards([], NONE, SKILLS)).toEqual([]);
  });

  it('skills mastered: 1, 3, 5, 10, 15 and all, each exactly at its threshold', () => {
    const earnedWith = (count: number): string[] =>
      evaluateAwards(PK.slice(0, count).map((s) => mastered(s.id)), NONE, SKILLS).filter((id) => id.startsWith('mastered:math-PK'));
    expect(earnedWith(0)).toEqual([]);
    expect(earnedWith(1)).toEqual(['mastered:math-PK:1']);
    expect(earnedWith(2)).toEqual(['mastered:math-PK:1']);
    expect(earnedWith(3)).toEqual(['mastered:math-PK:1', 'mastered:math-PK:3']);
    expect(earnedWith(4)).toHaveLength(2);
    expect(earnedWith(5)).toHaveLength(3);
    expect(earnedWith(9)).toHaveLength(3);
    expect(earnedWith(10)).toHaveLength(4);
    expect(earnedWith(14)).toHaveLength(4);
    expect(earnedWith(15)).toHaveLength(5);
    expect(earnedWith(16)).toEqual(['1', '3', '5', '10', '15', 'all'].map((n) => `mastered:math-PK:${n}`));
  });

  it('mastering on one board earns nothing on another', () => {
    const earned = evaluateAwards(PK.map((s) => mastered(s.id)), NONE, SKILLS);
    expect(earned.some((id) => id.includes('ela-K') || id.includes('reasoning'))).toBe(false);
  });

  it('a placed-out skill is not a mastered skill', () => {
    const earned = evaluateAwards(PK.map((s) => scored(s.id, 80, true)), NONE, SKILLS);
    expect(earned.some((id) => id.startsWith('mastered:'))).toBe(false);
  });

  it('a category sticker needs every skill in the category at 80 or above', () => {
    const allA = PK.slice(0, 8).map((s) => scored(s.id, 80));
    expect(evaluateAwards(allA, NONE, SKILLS)).toContain('category:math-PK:A');
    expect(evaluateAwards(allA, NONE, SKILLS)).not.toContain('category:math-PK:B');
    const oneLow = [...PK.slice(0, 7).map((s) => scored(s.id, 100)), scored((PK[7] as Skill).id, 79)];
    expect(evaluateAwards(oneLow, NONE, SKILLS)).not.toContain('category:math-PK:A');
    const oneMissing = PK.slice(0, 7).map((s) => scored(s.id, 100));
    expect(evaluateAwards(oneMissing, NONE, SKILLS)).not.toContain('category:math-PK:A');
  });

  it('placed-out skills count in full toward a category, and that sticker shows with no celebration', () => {
    const placed = PK.slice(0, 8).map((s) => scored(s.id, 80, true));
    const earned = evaluateAwards(placed, NONE, SKILLS);
    expect(earned).toContain('category:math-PK:A');
    expect(isQuietAward('category:math-PK:A', placed, SKILLS)).toBe(true);
    // Once the child has really worked on one of them, the sticker is celebrated.
    const mixed = [...placed.slice(0, 7), scored((PK[7] as Skill).id, 85)];
    expect(isQuietAward('category:math-PK:A', mixed, SKILLS)).toBe(false);
    expect(isQuietAward('mastered:math-PK:1', placed, SKILLS)).toBe(false);
    expect(isQuietAward('questions:25', placed, SKILLS)).toBe(false);
  });

  it('a retired skill is left out of every count', () => {
    const skills = SKILLS.map((s) => (s.id === 'E-K-A4' ? { ...s, retired: true as const } : s));
    const earned = evaluateAwards(SMALL.slice(0, 3).map((s) => mastered(s.id)), NONE, skills);
    expect(earned).toContain('mastered:ela-K:all');
    expect(earned).toContain('category:ela-K:A');
  });

  it('questions answered: 25, 50, 100, 250, 500 and 1,000', () => {
    const at = (questionsAnswered: number): string[] => evaluateAwards([], { ...NONE, questionsAnswered }, SKILLS);
    expect(at(24)).toEqual([]);
    expect(at(25)).toEqual(['questions:25']);
    expect(at(99)).toEqual(['questions:25', 'questions:50']);
    expect(at(1000)).toEqual([25, 50, 100, 250, 500, 1000].map((n) => `questions:${n}`));
  });

  it('days practised: 3, 7, 14 and 30', () => {
    const at = (daysPractised: number): string[] => evaluateAwards([], { ...NONE, daysPractised }, SKILLS);
    expect(at(2)).toEqual([]);
    expect(at(3)).toEqual(['days:3']);
    expect(at(13)).toEqual(['days:3', 'days:7']);
    expect(at(30)).toEqual(['days:3', 'days:7', 'days:14', 'days:30']);
  });

  it('one award for each finished diagnostic', () => {
    expect(evaluateAwards([], { ...NONE, diagnosticsFinished: { math: true, ela: false } }, SKILLS)).toEqual(['diagnostic:math']);
    expect(evaluateAwards([], { ...NONE, diagnosticsFinished: { math: true, ela: true } }, SKILLS)).toEqual(['diagnostic:math', 'diagnostic:ela']);
  });

  it('every award it returns is one that exists', () => {
    const everything = evaluateAwards(SKILLS.map((s) => mastered(s.id)), { questionsAnswered: 5000, daysPractised: 400, diagnosticsFinished: { math: true, ela: true } }, SKILLS);
    const known = allAwards(SKILLS).map((award) => award.id);
    expect(everything.slice().sort()).toEqual(known.slice().sort());
  });
});
