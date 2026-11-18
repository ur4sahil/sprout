import type { Lesson } from './types';

// The chapters of a lesson (game feel, phase 6): each stretch of shown moments between turns is one chapter, and
// each turn is one. A chapter dot under the stage replays from the chapter's first part.
export interface Chapter {
  start: number; // the index of its first part
  end: number; // one past its last part
  kind: 'show' | 'turn';
}

export function chaptersOf(lesson: Lesson): Chapter[] {
  const chapters: Chapter[] = [];
  lesson.parts.forEach((part, index) => {
    const last = chapters.at(-1);
    if (part.kind === 'show' && last?.kind === 'show' && last.end === index) last.end = index + 1;
    else chapters.push({ start: index, end: index + 1, kind: part.kind });
  });
  return chapters;
}

// The chapter a part is in, or -1 once the lesson is over.
export function chapterAt(chapters: readonly Chapter[], partIndex: number): number {
  return chapters.findIndex((chapter) => partIndex >= chapter.start && partIndex < chapter.end);
}
