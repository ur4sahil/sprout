// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../src/content/catalogue';
import { LADDERS, gradeOfSkillId, ladderById, ladderOf, ladderPrerequisite } from '../../src/content/ladders';
import { gradeRank } from '../../src/engine/grades';

describe('ladders', () => {
  const all = LADDERS.flatMap((ladder) => ladder.skillIds);

  it('hold every skill built so far, each on exactly one ladder', () => {
    expect(all).toHaveLength(292);
    expect(new Set(all).size).toBe(292);
    const count = (prefix: string): number => all.filter((id) => id.startsWith(prefix)).length;
    expect([count('M-PK-'), count('M-K-'), count('M-1-'), count('M-2-'), count('M-3-')]).toEqual([32, 31, 27, 46, 47]);
    expect([count('E-PK-'), count('E-K-'), count('E-1-'), count('E-2-')]).toEqual([10, 18, 31, 33]);
    expect(count('R-')).toBe(17);
  });

  it('are the ladders in the plan, in its order', () => {
    expect(LADDERS.map((ladder) => ladder.id)).toEqual([
      'counting', 'comparing', 'add-subtract', 'place-value', 'shapes', 'length', 'patterns', 'data', 'time', 'money', 'fractions', 'multiply-divide', 'measures',
      'letters', 'sounds', 'phonics', 'sight-words', 'grammar', 'vocabulary', 'reading',
      'figures', 'words-numbers',
    ]);
    expect(LADDERS.map((ladder) => ladder.skillIds.length)).toEqual([25, 12, 45, 12, 17, 15, 12, 7, 6, 4, 10, 17, 1, 7, 7, 17, 5, 20, 15, 21, 9, 8]);
  });

  it('never go down a grade', () => {
    for (const ladder of LADDERS) {
      const ranks = ladder.skillIds.map((id) => gradeRank(gradeOfSkillId(id)));
      expect(ranks, ladder.id).toEqual(ranks.slice().sort((a, b) => a - b));
      expect(ladder.skillIds.every((id) => id.startsWith(ladder.subject === 'math' ? 'M-' : ladder.subject === 'ela' ? 'E-' : 'R-'))).toBe(true);
    }
  });

  it('match the plan at the places that are easy to get wrong', () => {
    expect(ladderById('counting')?.skillIds.slice(-6)).toEqual(['M-K-A7', 'M-1-A1', 'M-1-A2', 'M-2-A4', 'M-2-A11', 'M-2-A14']);
    expect(ladderById('place-value')?.skillIds).toEqual(['M-K-D1', 'M-1-A3', 'M-1-A5', 'M-2-A1', 'M-2-A12', 'M-2-A9', 'M-2-A2', 'M-2-A7', 'M-2-A6', 'M-3-A1', 'M-3-A2', 'M-3-A4']);
    expect(ladderById('sounds')?.skillIds).toEqual(['E-PK-B1', 'E-PK-B2', 'E-PK-B3', 'E-K-B1', 'E-K-B2', 'E-K-B3', 'E-K-B6']);
    expect(ladderById('phonics')?.skillIds.slice(0, 3)).toEqual(['E-K-B4', 'E-K-B5', 'E-K-B7']);
    expect(ladderById('figures')?.skillIds).toEqual(['R-A1', 'R-A2', 'R-A3', 'R-A4', 'R-A5', 'R-A6', 'R-A7', 'R-A12', 'R-A13']);
    expect(ladderById('words-numbers')?.skillIds).toEqual(['R-A9', 'R-A14', 'R-A15', 'R-A16', 'R-A8', 'R-A10', 'R-A11', 'R-A17']);
  });

  it('give each skill the one before it on its ladder as its prerequisite, across grades', () => {
    expect(ladderPrerequisite('M-PK-A1')).toBeNull();
    expect(ladderPrerequisite('M-PK-A2')).toBe('M-PK-A1');
    expect(ladderPrerequisite('M-K-A1')).toBe('M-PK-A13');
    expect(ladderPrerequisite('M-2-A4')).toBe('M-1-A2');
    expect(ladderPrerequisite('M-K-C1')).toBeNull();
    // Not the one before it in its lettered category.
    expect(ladderPrerequisite('M-1-A4')).toBe('M-K-B3');
    expect(ladderPrerequisite('not-a-skill')).toBeNull();
  });

  it('reasoning ladders are an order, not a staircase: no prerequisites', () => {
    expect(ladderPrerequisite('R-A2')).toBeNull();
    expect(ladderPrerequisite('R-A14')).toBeNull();
  });

  it('read the grade from a skill id', () => {
    expect(['M-PK-A1', 'E-K-B2', 'M-1-C3', 'M-2-D4', 'R-A9'].map(gradeOfSkillId)).toEqual(['PK', 'K', '1', '2', 'all']);
    expect(() => gradeOfSkillId('M-X-A1')).toThrow();
  });

  it('every catalogue row is on the ladder it names, with the grade its id says', () => {
    for (const skill of CATALOGUE) {
      expect(ladderOf(skill.id)?.id, skill.id).toBe(skill.ladder);
      expect(gradeOfSkillId(skill.id), skill.id).toBe(skill.grade);
    }
  });
});
