// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { setVoiceEngine } from '../../src/audio/engine';
import { DEFAULT_RATE, LESSON_PAUSE_MS, ONE_PACE_PAUSE_MS } from '../../src/audio/speech';
import { EPISODES } from '../../src/stories/episodes';
import { line } from '../../src/stories/episodes/build';
import { WORDS_PER_SECOND, readingPlan, replySay, sentencesOf, storyText, storyWords, wordAt } from '../../src/stories/words';

const PER_WORD = 1000 / WORDS_PER_SECOND;

describe('the words of a page', () => {
  it('turns a written line into typed parts: numbers, letters and times never sit in plain words', () => {
    expect(line('Pip picked [8] berries.')).toEqual(['Pip picked ', { number: 8 }, ' berries.']);
    expect(line('It starts with [c].')).toEqual(['It starts with ', { letter: 'c' }, '.']);
    expect(line('Come at [@3], please.')).toEqual(['Come at ', { time: { hour: 3, minute: 0 } }, ', please.']);
  });

  it('prints numbers as numerals, letters as capitals and a time as one word, with punctuation kept beside them', () => {
    const words = storyWords(line('“Come at [@3],” said Pip. [1], [2], go! It is [c].'));
    expect(words.map((word) => word.shown)).toEqual(['“Come', 'at', '3 o\'clock,”', 'said', 'Pip.', '1,', '2,', 'go!', 'It', 'is', 'C.']);
    expect(words[2]?.say).toEqual([{ time: { hour: 3, minute: 0 } }]);
    expect(words[2]?.spoken).toBe(2); // "three o'clock"
    expect(words[5]?.say).toEqual([{ number: 1 }]);
    expect(words[10]?.say).toEqual([{ letter: 'c' }]);
    expect(storyText(line('Pip has [17] spots.'))).toBe('Pip has 17 spots.');
    // A letter sound is printed between slashes, and said alone on a tap.
    const sound = storyWords(['Bat starts with ', { sound: 'b' }, '.']);
    expect(sound.map((word) => word.shown)).toEqual(['Bat', 'starts', 'with', '/b/.']);
    expect(sound[3]?.say).toEqual([{ sound: 'b' }]);
  });

  it('says a tapped word alone, without its punctuation', () => {
    const words = storyWords(line('“Oh dear, where was I?” she said.'));
    expect(words.map((word) => word.say)).toEqual([[{ word: 'Oh' }], [{ word: 'dear' }], [{ word: 'where' }], [{ word: 'was' }], [{ word: 'I' }], [{ word: 'she' }], [{ word: 'said' }]]);
    expect(storyWords(line("Pip's spots."))[0]?.say).toEqual([{ word: "Pip's" }]);
  });

  it('finds sentences the way a reader does: a quote with a question mark inside a sentence does not end it', () => {
    const sentences = sentencesOf(storyWords(line('“Is it [@3] yet?” asked Finn. “Not yet,” said Olive.')));
    expect(sentences.map((sentence) => sentence.map((word) => word.shown).join(' '))).toEqual(['“Is it 3 o\'clock yet?” asked Finn.', '“Not yet,” said Olive.']);
  });
});

describe('when each word lights up', () => {
  it('shares the reading time evenly, one word after another', () => {
    const plan = readingPlan(storyWords(line('Pip has a red hat')));
    expect(plan.starts).toEqual([0, 1, 2, 3, 4].map((i) => i * PER_WORD));
    expect(plan.ends).toEqual([1, 2, 3, 4, 5].map((i) => i * PER_WORD));
    expect(plan.total).toBe(5 * PER_WORD);
  });

  it('gives a word the voice says as two words twice the time', () => {
    const plan = readingPlan(storyWords(line('Come at [@3] today')));
    expect(plan.ends[2]! - plan.starts[2]!).toBeCloseTo(2 * PER_WORD);
    expect(plan.total).toBeCloseTo(5 * PER_WORD);
  });

  it('keeps the last word of a sentence lit through the pause the lesson voice takes between sentences', () => {
    const plan = readingPlan(storyWords(line('Pip sat. Finn hopped.')));
    expect(plan.starts[2]).toBeCloseTo(2 * PER_WORD + LESSON_PAUSE_MS);
    expect(wordAt(plan, 2 * PER_WORD + LESSON_PAUSE_MS / 2)).toBe(1);
    // No pause after the very last sentence.
    expect(plan.total).toBeCloseTo(4 * PER_WORD + LESSON_PAUSE_MS);
  });

  it('keeps the word lit for the pause the voice makes now: 0.7 seconds once the server speaks with the new voices', () => {
    setVoiceEngine('piper');
    const plan = readingPlan(storyWords(line('Pip sat. Finn hopped.')));
    expect(plan.starts[2]).toBeCloseTo(2 * PER_WORD + ONE_PACE_PAUSE_MS);
    expect(plan.total).toBeCloseTo(4 * PER_WORD + ONE_PACE_PAUSE_MS);
  });

  it('runs faster for a faster speech rate', () => {
    const slow = readingPlan(storyWords(line('Pip has a red hat')), DEFAULT_RATE);
    const fast = readingPlan(storyWords(line('Pip has a red hat')), DEFAULT_RATE * 2);
    expect(fast.total).toBeCloseTo(slow.total / 2);
  });

  it('lights nothing before the start and after the end, and each word in its own time', () => {
    const plan = readingPlan(storyWords(line('Pip has a red hat')));
    expect(wordAt(plan, -1)).toBeNull();
    expect(wordAt(plan, 0)).toBe(0);
    expect(wordAt(plan, PER_WORD * 0.99)).toBe(0);
    expect(wordAt(plan, PER_WORD)).toBe(1);
    expect(wordAt(plan, PER_WORD * 4.5)).toBe(4);
    expect(wordAt(plan, plan.total)).toBeNull();
    expect(wordAt(readingPlan([]), 0)).toBeNull();
  });
});

describe('the reply to the closing question', () => {
  const episode = EPISODES[1]!;

  it('is warm whatever the answer, gives the story\'s answer and ends with "The end."', () => {
    const right = storyText(replySay(episode, episode.question.answer));
    const other = storyText(replySay(episode, (episode.question.answer + 1) % episode.question.options.length));
    expect(right).toBe(`Yes! ${episode.question.replyText} The end.`);
    expect(other).toBe(`Good thinking! ${episode.question.replyText} The end.`);
  });
});
