// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../../src/content/catalogue';
import { allLessons } from '../../src/lessons';
import { PLACES, backdropFor, castOn, lessonBackdrop } from '../../src/lessons/backdrops';
import { PALETTE } from '../../src/visuals/palette';

// The place behind each lesson (game feel, phase 6).

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const c = parseInt(hex.slice(at, at + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const tokens = readFileSync('src/styles/tokens.css', 'utf8');
const ring = /--color-brand:\s*(#[0-9a-f]{6})/i.exec(tokens)?.[1] ?? '';

describe('the places', () => {
  it('every skill with a lesson gets a place, and every lesson stands in its skill\'s place', () => {
    const skills = new Map(CATALOGUE.map((skill) => [skill.id, skill]));
    for (const [name, skillId, make] of allLessons()) {
      const skill = skills.get(skillId);
      expect(skill, name).toBeDefined();
      if (!skill) continue;
      const place = backdropFor(skill);
      expect(PLACES, name).toContain(place);
      const lesson = make();
      expect(lessonBackdrop(lesson), name).toBe(place);
      for (const part of lesson.parts) {
        for (const each of part.kind === 'show' ? [part.moment] : part.turn.why) expect(each.scene.backdrop, name).toBe(place);
      }
    }
  });

  it('every skill in the catalogue gets a place, by its topic', () => {
    for (const skill of CATALOGUE) expect(PLACES).toContain(backdropFor(skill));
    expect(backdropFor({ subject: 'math', ladder: 'counting' })).toBe('picnic');
    expect(backdropFor({ subject: 'math', ladder: 'add-subtract' })).toBe('stall');
    expect(backdropFor({ subject: 'math', ladder: 'place-value' })).toBe('workshop');
    expect(backdropFor({ subject: 'math', ladder: 'shapes' })).toBe('site');
    expect(backdropFor({ subject: 'math', ladder: 'money' })).toBe('shop');
    expect(backdropFor({ subject: 'ela', ladder: 'letters' })).toBe('treehouse');
    expect(backdropFor({ subject: 'ela', ladder: 'reading' })).toBe('nook');
    expect(backdropFor({ subject: 'reasoning', ladder: 'figures' })).toBe('pond');
  });

  it('the friend who teaches is the subject\'s: Sprout with Pip for Math, Olive for Language Arts, Finn for Reasoning', () => {
    expect(castOn('stall')).toEqual({ host: 'sprout', helper: 'pip' });
    expect(castOn('nook')).toEqual({ host: 'olive', helper: null });
    expect(castOn('treehouse').host).toBe('olive');
    expect(castOn('pond')).toEqual({ host: 'finn', helper: null });
    expect(castOn(undefined)).toEqual({ host: 'sprout', helper: null });
  });

  it('a dark numeral and the lit ring read clearly on every colour of every place', () => {
    for (const place of PLACES) {
      const colours = PALETTE.places[place];
      for (const [name, colour] of Object.entries({ ...colours.ground, ...colours.trim })) {
        expect(contrast(colour, PALETTE.ink), `${place} ${name} against a numeral`).toBeGreaterThanOrEqual(7);
        expect(contrast(colour, ring), `${place} ${name} against the lit ring`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
