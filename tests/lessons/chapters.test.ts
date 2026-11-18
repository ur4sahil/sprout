// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allLessons } from '../../src/lessons';
import { chapterAt, chaptersOf } from '../../src/lessons/chapters';

describe('the chapters of a lesson', () => {
  it('make one chapter for each stretch between turns and one for each turn, covering every part once', () => {
    for (const [name, , make] of allLessons()) {
      const lesson = make();
      const chapters = chaptersOf(lesson);
      let next = 0;
      for (const chapter of chapters) {
        expect(chapter.start, name).toBe(next);
        expect(chapter.end, name).toBeGreaterThan(chapter.start);
        if (chapter.kind === 'turn') expect(chapter.end - chapter.start, name).toBe(1);
        for (let i = chapter.start; i < chapter.end; i += 1) expect(lesson.parts[i]?.kind, name).toBe(chapter.kind);
        next = chapter.end;
      }
      expect(next, name).toBe(lesson.parts.length);
      // Two stretches of shown moments never sit side by side.
      chapters.forEach((chapter, i) => {
        if (i > 0 && chapter.kind === 'show') expect(chapters[i - 1]?.kind, name).toBe('turn');
      });
    }
  });

  it('finds the chapter a part is in, and none once the lesson is over', () => {
    const [, , make] = allLessons()[0]!;
    const lesson = make();
    const chapters = chaptersOf(lesson);
    expect(chapterAt(chapters, 0)).toBe(0);
    expect(chapterAt(chapters, lesson.parts.length)).toBe(-1);
  });
});
