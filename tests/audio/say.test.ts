// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PRAISE, centsWords, letterName, numberWords, saySegments, sayWords, timeWords } from '../../src/audio/say';
import { validateQuestion } from '../../src/engine/validate';

describe('numberWords', () => {
  it('writes 0 to 1,000 as words', () => {
    const cases: [number, string][] = [
      [0, 'zero'], [1, 'one'], [9, 'nine'], [10, 'ten'], [11, 'eleven'], [12, 'twelve'], [13, 'thirteen'], [15, 'fifteen'], [19, 'nineteen'],
      [20, 'twenty'], [21, 'twenty-one'], [30, 'thirty'], [40, 'forty'], [47, 'forty-seven'], [50, 'fifty'], [80, 'eighty'], [99, 'ninety-nine'],
      [100, 'one hundred'], [101, 'one hundred one'], [110, 'one hundred ten'], [115, 'one hundred fifteen'], [342, 'three hundred forty-two'],
      [500, 'five hundred'], [999, 'nine hundred ninety-nine'], [1000, 'one thousand'],
    ];
    for (const [n, words] of cases) expect(numberWords(n), String(n)).toBe(words);
  });

  it('has a different, digit-free word for every number', () => {
    const all = Array.from({ length: 1001 }, (_, n) => numberWords(n));
    expect(new Set(all).size).toBe(1001);
    for (const words of all) expect(words).toMatch(/^[a-z -]+$/);
  });

  it('passes anything else through as digits rather than guessing', () => {
    expect(numberWords(1001)).toBe('1001');
    expect(numberWords(-3)).toBe('-3');
    expect(numberWords(2.5)).toBe('2.5');
  });
});

describe('times and money', () => {
  it('says times the way a child hears them', () => {
    expect(timeWords(3, 0)).toBe("three o'clock");
    expect(timeWords(3, 30)).toBe('half past three');
    expect(timeWords(3, 15)).toBe('three fifteen');
    expect(timeWords(3, 5)).toBe('three oh five');
    expect(timeWords(12, 45)).toBe('twelve forty-five');
    expect(timeWords(10, 10)).toBe('ten ten');
  });

  it('says cents, with one cent in the singular', () => {
    expect(centsWords(25)).toBe('twenty-five cents');
    expect(centsWords(1)).toBe('one cent');
    expect(centsWords(100)).toBe('one hundred cents');
  });
});

describe('letter names', () => {
  it('has a spelled-out name for all 26 letters, the same for big and small', () => {
    const names = 'abcdefghijklmnopqrstuvwxyz'.split('').map(letterName);
    expect(new Set(names).size).toBe(26);
    expect(letterName('a')).toBe('ay');
    expect(letterName('A')).toBe('ay');
    expect(letterName('w')).toBe('double you');
    expect(letterName('h')).toBe('aitch');
    // No name is just the bare letter, which a voice may read as a sound.
    for (const name of names) expect(name.length).toBeGreaterThan(1);
  });
});

describe('saySegments', () => {
  it('says long speech one sentence at a time, and leaves short speech as one piece', () => {
    const story = saySegments(['Sam has', { number: 4 }, 'apples.', 'Sam gets', { number: 3 }, 'more.', 'How many apples does Sam have now?']);
    expect(story).toEqual([
      { kind: 'voice', text: 'Sam has four apples.' },
      { kind: 'voice', text: 'Sam gets three more.' },
      { kind: 'voice', text: 'How many apples does Sam have now?' },
    ]);
    // Twelve words or fewer stay together, even with two sentences.
    expect(saySegments(['Start with', { number: 5 }, '. Take away', { number: 2 }, '.', { number: 3 }, 'are left.'])).toHaveLength(1);
    // Long speech with no sentence end stays whole, and nothing is lost.
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    expect(saySegments([long])).toEqual([{ kind: 'voice', text: long }]);
    expect(sayWords(['Sam has', { number: 4 }, 'apples.', 'Sam gets', { number: 3 }, 'more.', 'How many apples does Sam have now?'])).toBe(
      'Sam has four apples. Sam gets three more. How many apples does Sam have now?',
    );
  });

  it('the letter a, the word "a" and the "a" inside a sentence are three different things', () => {
    expect(saySegments([{ letter: 'a' }])).toEqual([{ kind: 'voice', text: 'ay' }]);
    expect(saySegments([{ word: 'a' }])).toEqual([{ kind: 'voice', text: 'a' }]);
    expect(saySegments(['Tap a balloon.'])).toEqual([{ kind: 'voice', text: 'Tap a balloon.' }]);
    // Together in one sentence, each keeps its own reading.
    expect(sayWords(['Find the letter', { letter: 'a' }, 'in the word', { word: 'a' }])).toBe('Find the letter ay in the word a');
  });

  it('handles every kind of part', () => {
    expect(sayWords(['plain words'])).toBe('plain words');
    expect(sayWords([{ letter: 'B' }])).toBe('bee');
    expect(sayWords([{ word: 'read' }])).toBe('read');
    expect(sayWords([{ number: 47 }])).toBe('forty-seven');
    expect(sayWords([{ time: { hour: 3, minute: 30 } }])).toBe('half past three');
    expect(sayWords([{ cents: 25 }])).toBe('twenty-five cents');
  });

  it('with no voice pack on the device, every part uses the device voice, joined into smooth sentences', () => {
    const segments = saySegments(['Start at', { number: 4 }, '. Count on', { number: 2 }, 'more.', { number: 6 }, '.']);
    expect(segments).toEqual([{ kind: 'voice', text: 'Start at four. Count on two more. six.' }]);
    expect(segments.every((segment) => segment.kind === 'voice')).toBe(true);
  });

  it('uses a clip where the device has one, in its place in the sentence', () => {
    const have = new Set(['letter:b', 'number:7']);
    const segments = saySegments(['Find the letter', { letter: 'B' }, 'and the number', { number: 7 }, 'and', { number: 8 }, '.'], (key) => have.has(key));
    expect(segments).toEqual([
      { kind: 'voice', text: 'Find the letter' },
      { kind: 'clip', key: 'letter:b', fallback: 'bee' },
      { kind: 'voice', text: 'and the number' },
      { kind: 'clip', key: 'number:7', fallback: 'seven' },
      { kind: 'voice', text: 'and eight.' },
    ]);
  });

  it('does not put a space before punctuation, and drops empty pieces', () => {
    expect(sayWords(['Then', { number: 5 }, '.'])).toBe('Then five.');
    expect(sayWords(['One', ',', 'two', '!'])).toBe('One, two!');
    expect(saySegments(['  ', ''])).toEqual([]);
    expect(saySegments([])).toEqual([]);
  });

  it('never gives the voice a digit or a symbol', () => {
    const everything = sayWords([{ number: 1000 }, { number: 0 }, { time: { hour: 12, minute: 5 } }, { cents: 99 }, { letter: 'q' }]);
    expect(everything).not.toMatch(/[0-9+=<>_]/);
  });
});

describe('praise', () => {
  it('has the five phrases from the plan, each with a clip key and speech that passes the speech rule', () => {
    expect(PRAISE.map((p) => sayWords(p.say))).toEqual(['Great job.', 'You got it.', 'Nice work.', "That's right.", 'Well done.']);
    expect(new Set(PRAISE.map((p) => p.key)).size).toBe(5);
    for (const phrase of PRAISE) {
      expect(phrase.key).toMatch(/^phrase:[a-z-]+$/);
      const probe = validateQuestion({
        skillId: 'T', level: 1, seed: 0, key: '', facts: { id: 'x' }, mode: 'look', type: 'numberPad', answer: 0, maxDigits: 1,
        prompt: { text: 'x', speak: phrase.say }, explanation: { speak: phrase.say, steps: ['x'] },
      }).filter((problem) => problem.startsWith('1:'));
      expect(probe).toEqual([]);
    }
  });
});
