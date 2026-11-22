// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PRAISE, centsWords, letterName, loneSound, numberWords, saySegments, sayWords, soundClipKey, soundFallback, timeWords } from '../../src/audio/say';
import { stepSay } from '../../src/audio/stepSay';
import { SOUNDS, SOUND_KEYS, isSoundKey } from '../../src/engine/letterSounds';
import { validateQuestion } from '../../src/engine/validate';

describe('numberWords', () => {
  it('writes 0 to 10,000 as words', () => {
    const cases: [number, string][] = [
      [0, 'zero'], [1, 'one'], [9, 'nine'], [10, 'ten'], [11, 'eleven'], [12, 'twelve'], [13, 'thirteen'], [15, 'fifteen'], [19, 'nineteen'],
      [20, 'twenty'], [21, 'twenty-one'], [30, 'thirty'], [40, 'forty'], [47, 'forty-seven'], [50, 'fifty'], [80, 'eighty'], [99, 'ninety-nine'],
      [100, 'one hundred'], [101, 'one hundred one'], [110, 'one hundred ten'], [115, 'one hundred fifteen'], [342, 'three hundred forty-two'],
      [500, 'five hundred'], [999, 'nine hundred ninety-nine'], [1000, 'one thousand'], [2406, 'two thousand four hundred six'], [9999, 'nine thousand nine hundred ninety-nine'], [10000, 'ten thousand'],
    ];
    for (const [n, words] of cases) expect(numberWords(n), String(n)).toBe(words);
  });

  it('has a different, digit-free word for every number', () => {
    const all = Array.from({ length: 1001 }, (_, n) => numberWords(n));
    expect(new Set(all).size).toBe(1001);
    for (const words of all) expect(words).toMatch(/^[a-z -]+$/);
  });

  it('passes anything else through as digits rather than guessing', () => {
    expect(numberWords(10001)).toBe('10001');
    expect(numberWords(-3)).toBe('-3');
    expect(numberWords(2.5)).toBe('2.5');
  });
});

describe('times and money', () => {
  it('says times as a digital clock is read (the owner\'s choice, Nov 22, 2026), never "half past"', () => {
    expect(timeWords(8, 0)).toBe("eight o'clock");
    expect(timeWords(8, 5)).toBe('eight oh five');
    expect(timeWords(8, 15)).toBe('eight fifteen');
    expect(timeWords(8, 30)).toBe('eight thirty');
    expect(timeWords(8, 45)).toBe('eight forty-five');
    expect(timeWords(3, 30)).toBe('three thirty');
    expect(timeWords(12, 45)).toBe('twelve forty-five');
    expect(timeWords(10, 10)).toBe('ten ten');
    expect(sayWords(['It is', { time: { hour: 8, minute: 30 } }, '.'])).toBe('It is eight thirty.');
  });

  it('says a time part and the same time written in a step with the same words, for every time on a clock', () => {
    for (let hour = 1; hour <= 12; hour += 1) {
      for (let minute = 0; minute < 60; minute += 1) {
        const written = `${hour}:${String(minute).padStart(2, '0')}`;
        const part = sayWords(['It is', { time: { hour, minute } }, '.']);
        expect(sayWords(stepSay(`It is ${written}.`) ?? []), written).toBe(part);
        expect(part, written).toBe(`It is ${timeWords(hour, minute)}.`);
        expect(part, written).not.toMatch(/half|quarter|past|\bto\b/);
      }
    }
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
    expect(sayWords([{ time: { hour: 3, minute: 30 } }])).toBe('three thirty');
    expect(sayWords([{ cents: 25 }])).toBe('twenty-five cents');
    expect(sayWords([{ sound: 'm' }])).toBe('the sound of em');
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

describe('letter sounds', () => {
  it('has the sounds the owner chose, in one list, each shown between slashes', () => {
    const short = ['a', 'e', 'i', 'o', 'u'];
    const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'];
    const twoLetters = ['sh', 'ch', 'th', 'wh', 'ng', 'ck'];
    const long = ['long-a', 'long-e', 'long-i', 'long-o', 'long-u'];
    // oo (as in moon) and air (as in chair) were added on Nov 22, 2026.
    const teams = ['ai', 'ay', 'ee', 'ea', 'oa', 'ie', 'igh', 'oi', 'oy', 'ou', 'ow', 'oo', 'ar', 'er', 'ir', 'ur', 'or', 'air'];
    expect(SOUND_KEYS).toEqual([...short, ...consonants, ...twoLetters, ...long, ...teams]);
    for (const key of SOUND_KEYS) {
      expect(SOUNDS[key].shown, key).toMatch(/^\/[a-zāēīōū]+\/$/);
      expect(SOUNDS[key].letters, key).toMatch(/^[a-z]{1,3}$/);
      expect(SOUNDS[key].as.length, key).toBeGreaterThan(1);
    }
    expect(SOUNDS.b.shown).toBe('/b/');
    expect(SOUNDS['long-a'].shown).toBe('/ā/');
    expect(isSoundKey('sh')).toBe(true);
    expect(isSoundKey('zz')).toBe(false);
    expect(isSoundKey('toString')).toBe(false);
  });

  it('until the recordings exist, a sound is said by its letters, from one function', () => {
    expect(sayWords(soundFallback('b'))).toBe('the sound of bee');
    expect(sayWords(soundFallback('sh'))).toBe('the sound of ess, aitch');
    expect(sayWords(soundFallback('long-a'))).toBe('the sound of long ay');
    expect(sayWords(soundFallback('igh'))).toBe('the sound of eye, jee, aitch');
    expect(sayWords(soundFallback('oo'))).toBe('the sound of oh, oh');
    expect(sayWords(soundFallback('air'))).toBe('the sound of ay, eye, are');
    expect(sayWords(['Bat starts with', { sound: 'b' }, '.'])).toBe('Bat starts with the sound of bee.');
  });

  it('is played from its recording once inside a sentence, and three times when it is all there is to say', () => {
    expect(soundClipKey('b', false)).toBe('sound:b:once');
    expect(soundClipKey('long-a', true)).toBe('sound:long-a:three');
    expect(loneSound([{ sound: 'b' }])).toBe('b');
    expect(loneSound(['', { sound: 'sh' }, '.'])).toBe('sh');
    expect(loneSound(['Bat starts with', { sound: 'b' }])).toBeNull();
    expect(loneSound([{ sound: 'b' }, { sound: 'a' }])).toBeNull();
    const have = new Set(['sound:b:once', 'sound:b:three']);
    expect(saySegments(['Bat starts with', { sound: 'b' }, '.'], (key) => have.has(key))).toEqual([
      { kind: 'voice', text: 'Bat starts with' },
      { kind: 'clip', key: 'sound:b:once', fallback: 'the sound of bee' },
      { kind: 'voice', text: '.' },
    ]);
    expect(saySegments([{ sound: 'b' }], (key) => have.has(key))).toEqual([{ kind: 'clip', key: 'sound:b:three', fallback: 'the sound of bee' }]);
    // With no recording, it is words in the sentence.
    expect(saySegments(['Bat starts with', { sound: 'b' }, '.'])).toEqual([{ kind: 'voice', text: 'Bat starts with the sound of bee.' }]);
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
