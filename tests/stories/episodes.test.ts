// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sayWords } from '../../src/audio/say';
import { voicePieces, voiceText } from '../../src/audio/voice';
import type { Say } from '../../src/engine/types';
import { EPISODES } from '../../src/stories/episodes';
import type { Episode } from '../../src/stories/types';
import { BACKDROPS } from '../../src/stories/types';
import { artKey } from '../../src/visuals/Art';
import { ART } from '../../src/visuals/artList';
import { sentencesOf, storyText, storyWords } from '../../src/stories/words';

// Every episode of "The Garden Year" obeys the rules that can be checked by a machine.

const WORDS_PER_SECOND = 1.9; // the lesson voice, the same figure as tests/lessons/lessons.test.ts
const PAUSE_SECONDS = 1.7; // a page turning, as between lesson moments
// Number words a story may not hide in plain words: a number is a { number } part. "one" stays allowed, because
// it is also a word ("one at a time", "the other one").
const NUMBER_WORDS = /\b(zero|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred)\b/i;

const spoken = (say: Say): string => sayWords(say).toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const hasArt = (emoji: string): boolean => ART.has(artKey(emoji));

function checkSay(say: Say, where: string): void {
  expect(say.length, `${where}: says something`).toBeGreaterThan(0);
  for (const part of say) {
    if (typeof part === 'string') {
      expect(part, `${where}: no digits or signs in plain words`).not.toMatch(/[0-9+=×÷%$<>#&*/@\\^~|_[\]{}]/);
      expect(part, `${where}: numbers are number parts`).not.toMatch(NUMBER_WORDS);
    } else if ('number' in part) {
      expect(Number.isInteger(part.number) && part.number >= 0 && part.number <= 1000, `${where}: a number from 0 to 1,000`).toBe(true);
    } else if ('letter' in part) {
      expect(part.letter, `${where}: one small letter`).toMatch(/^[a-z]$/);
    } else if ('time' in part) {
      expect(part.time.hour >= 1 && part.time.hour <= 12 && part.time.minute === 0, `${where}: a time to the hour`).toBe(true);
    }
  }
  // The recorded voice can take every sentence of it at the lesson pace.
  for (const piece of voicePieces(say, 'lesson')) expect(voiceText(piece), `${where}: the voice can say "${sayWords(piece)}"`).not.toBeNull();
}

function readingSeconds(episode: Episode): number {
  return episode.pages.reduce((sum, page) => sum + sayWords(page.say).split(/\s+/).filter(Boolean).length / WORDS_PER_SECOND + PAUSE_SECONDS, 0);
}

describe('The Garden Year', () => {
  it('has the first twelve episodes in order: spring 1 to 6, summer 7 to 12', () => {
    expect(EPISODES.map((episode) => episode.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(EPISODES.map((episode) => episode.season)).toEqual([...Array<string>(6).fill('spring'), ...Array<string>(6).fill('summer')]);
    expect(new Set(EPISODES.map((episode) => episode.id)).size).toBe(EPISODES.length);
    expect(new Set(EPISODES.map((episode) => episode.title)).size).toBe(EPISODES.length);
  });

  it('varies: every backdrop is used, and no two episodes in a row start in the same place', () => {
    const used = new Set(EPISODES.flatMap((episode) => episode.pages.map((page) => page.scene.backdrop)));
    expect([...used].sort()).toEqual([...BACKDROPS].sort());
    const starts = EPISODES.map((episode) => episode.pages[0]?.scene.backdrop);
    for (let i = 1; i < starts.length; i += 1) expect(starts[i], `episodes ${i} and ${i + 1}`).not.toBe(starts[i - 1]);
  });
});

describe.each(EPISODES.map((episode) => [episode.title, episode] as const))('the episode "%s"', (_title, episode) => {
  it('has six to eight pages and a cover picture the app can draw', () => {
    expect(episode.pages.length).toBeGreaterThanOrEqual(6);
    expect(episode.pages.length).toBeLessThanOrEqual(8);
    expect(hasArt(episode.cover), `cover ${episode.cover}`).toBe(true);
  });

  it('shows each page as one or two sentences of four to ten words, the same words Olive says', () => {
    episode.pages.forEach((page, i) => {
      const where = `page ${i + 1}`;
      expect(page.text, where).toBe(storyText(page.say));
      const sentences = sentencesOf(storyWords(page.say));
      expect(sentences.length, `${where}: "${page.text}"`).toBeGreaterThanOrEqual(1);
      expect(sentences.length, `${where}: "${page.text}"`).toBeLessThanOrEqual(2);
      for (const sentence of sentences) {
        const words = sentence.filter((word) => word.spoken > 0).length;
        const shown = sentence.map((word) => word.shown).join(' ');
        expect(words, `${where}: "${shown}"`).toBeGreaterThanOrEqual(4);
        expect(words, `${where}: "${shown}"`).toBeLessThanOrEqual(10);
      }
    });
  });

  it('speaks only valid Say parts: no digits or signs in plain words, numbers and letters as typed parts', () => {
    episode.pages.forEach((page, i) => checkSay(page.say, `page ${i + 1}`));
    checkSay(episode.question.say, 'question');
    checkSay(episode.question.reply, 'reply');
    episode.question.options.forEach((option, i) => checkSay(option.say, `option ${i + 1}`));
  });

  it('draws real scenes: a known backdrop, every friend once, no two things in one place, at most four props, every picture in the art set', () => {
    episode.pages.forEach((page, i) => {
      const where = `page ${i + 1}`;
      const { scene } = page;
      expect(BACKDROPS, where).toContain(scene.backdrop);
      expect(scene.props.length, where).toBeLessThanOrEqual(4);
      expect(new Set(scene.cast.map((spot) => spot.who)).size, `${where}: each friend once`).toBe(scene.cast.length);
      const taken = new Set<string>();
      const take = (place: string): void => {
        expect(taken.has(place), `${where}: two things at ${place}`).toBe(false);
        taken.add(place);
      };
      for (const spot of scene.cast) take(`${spot.at} ${spot.depth}`);
      for (const prop of scene.props) {
        take(`${prop.at} ${prop.depth}`);
        expect(prop.pictures.length, where).toBeGreaterThanOrEqual(1);
        expect(prop.pictures.length, where).toBeLessThanOrEqual(10);
        for (const emoji of prop.pictures) expect(hasArt(emoji), `${where}: ${emoji} is in the art set`).toBe(true);
      }
      if (scene.sign) {
        take(`${scene.sign.at} far`);
        expect(scene.sign.words, where).toMatch(/^[A-Za-z ]+$/);
      }
      if (scene.picture) take(`${scene.picture.at} sky`);
    });
  });

  it('reads aloud in 45 to 100 seconds', () => {
    const seconds = readingSeconds(episode);
    expect(seconds).toBeGreaterThanOrEqual(45);
    expect(seconds).toBeLessThanOrEqual(100);
  });

  it('ends with one question of two or three options, whose right answer the story states', () => {
    const { question } = episode;
    expect(question.options.length).toBeGreaterThanOrEqual(2);
    expect(question.options.length).toBeLessThanOrEqual(3);
    expect(question.answer).toBeGreaterThanOrEqual(0);
    expect(question.answer).toBeLessThan(question.options.length);
    expect(new Set(question.options.map((option) => option.text)).size).toBe(question.options.length);
    expect(question.text).toBe(storyText(question.say));
    expect(question.replyText).toBe(storyText(question.reply));
    for (const option of question.options) {
      expect(option.text).toBe(storyText(option.say));
      if (option.picture) expect(hasArt(option.picture), option.picture).toBe(true);
    }
    const right = question.options[question.answer];
    if (!right) throw new Error('no right answer');
    const answer = spoken(right.say);
    const story = episode.pages.map((page) => spoken(page.say)).join(' ');
    expect(` ${story} `, `the story says "${answer}"`).toContain(` ${answer} `);
    expect(` ${spoken(question.reply)} `, `the reply says "${answer}"`).toContain(` ${answer} `);
    // No wrong option is also given as the answer in the reply.
    for (const [i, option] of question.options.entries()) {
      if (i !== question.answer) expect(` ${spoken(question.reply)} `).not.toContain(` ${spoken(option.say)} `);
    }
  });
});
