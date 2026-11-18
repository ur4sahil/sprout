import { describe, expect, it } from 'vitest';
import { voiceText } from '../../src/audio/voice';
import { CAST_NAMES, castFor } from '../../src/cast/index';
import { LINES, LINE_KINDS, pickLine } from '../../src/cast/lines';
import { WHO } from '../../src/cast/types';
import { makeRng } from '../../src/engine/rng';

describe('what the friends say', () => {
  for (const who of WHO) {
    for (const kind of LINE_KINDS) {
      const lines = LINES[who][kind];

      it(`${who} has 4 to 6 different ${kind} lines`, () => {
        expect(lines.length).toBeGreaterThanOrEqual(4);
        expect(lines.length).toBeLessThanOrEqual(6);
        expect(new Set(lines.map((line) => JSON.stringify(line))).size).toBe(lines.length);
      });

      it(`every ${kind} line of ${who} is a valid Say the recorded voice can take`, () => {
        for (const line of lines) {
          expect(line.length).toBeGreaterThan(0);
          // The same rule the lessons are held to: no digit and no sign inside a plain string.
          for (const part of line) if (typeof part === 'string') expect(part, `"${part}" holds a digit or a sign`).not.toMatch(/[0-9+=×÷<>]/);
          const text = voiceText(line);
          expect(text, `${JSON.stringify(line)} cannot be recorded`).not.toBeNull();
          // Short: a friend never makes a speech.
          expect((text ?? '').split(' ').length).toBeLessThanOrEqual(12);
        }
      });

      it(`${who} never says the same ${kind} line twice running`, () => {
        const rng = makeRng(7);
        const heard = new Set<number>();
        let last: number | null = null;
        for (let i = 0; i < 300; i += 1) {
          const picked = pickLine(who, kind, last, rng);
          expect(picked.index).not.toBe(last);
          expect(picked.say).toBe(lines[picked.index]);
          heard.add(picked.index);
          last = picked.index;
        }
        // And every line gets its turn.
        expect(heard.size).toBe(lines.length);
      });
    }
  }

  it('picks without being handed a chooser, and still never repeats', () => {
    let last: number | null = null;
    for (let i = 0; i < 100; i += 1) {
      const picked = pickLine('sprout', 'cheer', last);
      expect(picked.index).not.toBe(last);
      last = picked.index;
    }
  });

  it('no line is unkind about a miss or a missed day', () => {
    const all = WHO.flatMap((who) => LINE_KINDS.flatMap((kind) => LINES[who][kind].map((line) => line.join(' ').toLowerCase())));
    for (const line of all) expect(line).not.toMatch(/\b(wrong|no,|bad|fail|missed|lost|hurry|quick|sad|oops)\b/);
  });
});

describe('who goes with which subject', () => {
  it('math is Pip, language arts is Olive, reasoning is Finn', () => {
    expect(castFor('math')).toBe('pip');
    expect(castFor('ela')).toBe('olive');
    expect(castFor('reasoning')).toBe('finn');
  });

  it('every friend has a name', () => {
    expect(WHO.map((who) => CAST_NAMES[who])).toEqual(['Sprout', 'Pip', 'Olive', 'Finn']);
  });
});
