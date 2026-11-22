// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nudgeFor } from '../../src/app/hints';
import { spokenSteps } from '../../src/audio/stepSay';
import { K_FACTS, K_STORIES } from '../../src/content/banks/comprehension';
import type { PictureAnswer } from '../../src/content/banks/comprehension';
import { CATALOGUE } from '../../src/content/catalogue';
import { CVC_WORDS } from '../../src/content/data/cvc';
import { WORD_FAMILIES } from '../../src/content/data/families';
import { FIRST_SOUNDS } from '../../src/content/data/firstSounds';
import { CLAP_WORDS, SOUND_SPLITS } from '../../src/content/data/h3-sounds';
import { ANSWERS, SEQUENCES, WHO_SENTENCES } from '../../src/content/data/h3-stories';
import { ACTIONS, BODY_INSIDE, BODY_USES, HEARD_VERBS, HELPERS } from '../../src/content/data/h3-words';
import { SYLLABLE_WORDS } from '../../src/content/data/syllables';
import { generateQuestion } from '../../src/content/registry';
import { describeVisual, sayText } from '../../src/engine/describe';
import { givesAway } from '../../src/engine/giveaway';
import { isSoundKey } from '../../src/engine/letterSounds';
import type { Level, Question, Say } from '../../src/engine/types';

// The wording rules of Language Arts pre-K and kindergarten (the wording audit, round 2): every skill has a hint
// that never gives the answer, listen questions say "Listen.", phonics steps say the sound and then the letter,
// letter groups, endings and syllables are never said as text, and each step reads as a sentence.

const SEEDS = 150;
const all = (skillId: string, level: Level): Question[] => Array.from({ length: SEEDS }, (_, i) => generateQuestion(skillId, level, i + 1));
const SKILLS = CATALOGUE.filter((skill) => skill.id.startsWith('E-PK-') || skill.id.startsWith('E-K-'));
const levels = (max: number): Level[] => Array.from({ length: max }, (_, i) => (i + 1) as Level);
const everyQuestion = (skillId: string): Question[] => levels(SKILLS.find((skill) => skill.id === skillId)?.maxLevel ?? 1).flatMap((level) => all(skillId, level));
const GROUP: Question[] = SKILLS.flatMap((skill) => everyQuestion(skill.id));

const sounds = (say: Say | null | undefined): string[] => (say ?? []).flatMap((part) => (typeof part === 'object' && 'sound' in part ? [part.sound] : []));
const letters = (say: Say | null | undefined): string[] => (say ?? []).flatMap((part) => (typeof part === 'object' && 'letter' in part ? [part.letter.toLowerCase()] : []));
const said = (question: Question): Say[] => spokenSteps(question).map((say) => say ?? []);
const plainWords = (say: Say): string[] => say.flatMap((part) => (typeof part === 'string' ? part.toLowerCase().split(/[^a-z']+/) : 'word' in part ? [part.word.toLowerCase()] : [])).filter(Boolean);
const s = (question: Question, name: string): string => String(question.facts[name]);
const firstOf = (word: string): string => FIRST_SOUNDS.find((entry) => entry.word === word)?.letter ?? '?';

describe('every pre-K and kindergarten Language Arts skill', () => {
  it('offers its own hint at every level, which the hint panel shows first and which never gives the answer away', () => {
    for (const question of GROUP) {
      const hint = question.explanation.hint;
      expect(hint, `${question.skillId} level ${question.level}`).toBeDefined();
      if (hint === undefined) continue;
      expect(nudgeFor(question)?.text).toBe(hint.text);
      expect(givesAway(question, hint.text, hint.say ? sayText(hint.say) : null), `${question.skillId}: ${hint.text}`).toBe(false);
    }
  });

  it('says every step, and a spoken step that starts with a word starts with a capital, as a sentence does', () => {
    for (const question of GROUP) {
      for (const say of spokenSteps(question)) {
        expect(say, `${question.skillId}: ${question.explanation.steps.join(' / ')}`).not.toBeNull();
        const first = say?.[0];
        const opening = typeof first === 'string' ? first : first !== undefined && 'word' in first ? first.word : '';
        if (/^[a-z]/i.test(opening)) expect(opening.charAt(0), `${question.skillId}: ${sayText(say ?? [])}`).toBe(opening.charAt(0).toUpperCase());
      }
    }
  });

  it('writes each step as a sentence with a capital, unless it is a list of letters, sounds or claps', () => {
    for (const question of GROUP) {
      for (const step of question.explanation.steps) {
        if (/^[a-z]+([ ,·]+[a-z]+)*\.?$/.test(step)) continue;
        expect(step.charAt(0), `${question.skillId}: ${step}`).toMatch(/[A-Z0-9]/);
        // Never a label such as "Letters: t, M.", "This one is a vehicle: car." or "mop is a word: letters together."
        expect(step, question.skillId).not.toMatch(/^(Letters?|Numbers?): |^This one is [^:]+: |is a (word|sentence): /);
      }
    }
  });

  it('starts every listen question with "Listen." on screen', () => {
    const listen = GROUP.filter((question) => question.mode === 'listen');
    expect(new Set(listen.map((question) => question.skillId)).size).toBeGreaterThan(12);
    for (const question of listen) expect(question.prompt.text, question.skillId).toMatch(/^Listen[. ]/);
  });

  it('says what to do with tiles: tap the letters', () => {
    const tiles = GROUP.filter((question) => question.type === 'tiles');
    expect(new Set(tiles.map((question) => question.skillId))).toEqual(new Set(['E-K-A1', 'E-K-B5', 'E-K-C3']));
    for (const question of tiles) expect(question.prompt.text, question.skillId).toContain('Tap the letters');
  });
});

describe('phonics steps say the sound first, then the letter', () => {
  it('pre-K B.1: both words start with the sound of the word asked about', () => {
    for (const question of everyQuestion('E-PK-B1')) {
      expect(sounds(said(question)[0])).toEqual([firstOf(s(question, 'target'))]);
      expect(question.prompt.text).toBe(`Which one starts with the same sound as ${s(question, 'target')}?`);
    }
  });

  it('pre-K A.6: the picture starts with the sound, and the letter says it', () => {
    for (const question of everyQuestion('E-PK-A6')) {
      const letter = s(question, 'target');
      const [starts, says] = said(question);
      expect(sounds(starts)).toEqual([letter]);
      expect(letters(says)).toEqual([letter]);
      expect(sounds(says)).toEqual([letter]);
    }
  });

  it('pre-K B.4: the same sound for the group, then the sound the odd one starts with', () => {
    for (const question of everyQuestion('E-PK-B4')) {
      const odd = question.level === 1 ? s(question, 'answer') : s(question, 'target');
      const [same, other] = said(question);
      expect(sounds(same)).toHaveLength(1);
      expect(sounds(other)).toEqual([firstOf(odd)]);
      expect(sounds(same)).not.toEqual(sounds(other));
    }
    for (const question of all('E-PK-B4', 1)) expect(question.prompt.text).toBe(`Which one starts with a different sound from ${s(question, 'target')}?`);
  });

  it('pre-K B.6: each group starts with its sound, then its letter', () => {
    for (const question of everyQuestion('E-PK-B6')) {
      const bins = question.facts.bins as string[];
      said(question).forEach((say, i) => {
        expect(sounds(say)).toEqual([bins[i]]);
        expect(letters(say)).toEqual([bins[i]]);
      });
    }
  });

  it('kindergarten B.1, B.2, B.3, B.8 and B.9: the sound, then "The letter ... says ..."', () => {
    const letterOf: Record<string, (target: string) => string> = {
      'E-K-B1': (target) => target.charAt(0),
      'E-K-B2': (target) => target.slice(-1),
      'E-K-B3': (target) => target.charAt(1),
      'E-K-B8': (target) => target.charAt(1),
      'E-K-B9': (target) => target.slice(-1),
    };
    for (const [skillId, letterFor] of Object.entries(letterOf)) {
      for (const question of everyQuestion(skillId)) {
        const letter = letterFor(s(question, 'target'));
        const [heard, says] = said(question);
        expect(sounds(heard), skillId).toEqual([letter]);
        expect(sayText(says ?? []), skillId).toBe(`The letter ${letter} says ${sayText([{ sound: letter as 'b' }])}.`);
      }
    }
    for (const question of everyQuestion('E-K-B8')) expect(question.prompt.text).toBe(`Which one has the same middle sound as ${s(question, 'target')}?`);
    for (const question of everyQuestion('E-K-B9')) expect(question.prompt.text).toBe(`Which one ends with the same sound as ${s(question, 'target')}?`);
  });

  it('kindergarten B.4 and B.5: each letter of the word is sounded out before the word', () => {
    for (const skillId of ['E-K-B4', 'E-K-B5']) {
      for (const question of everyQuestion(skillId)) {
        const word = s(question, 'target');
        expect(sounds(said(question)[0]), skillId).toEqual(word.split(''));
        expect(CVC_WORDS.some((entry) => entry.word === word)).toBe(true);
      }
    }
  });

  it('kindergarten B.6 and B.7: an ending is said as its sounds, never as text ("end in et")', () => {
    const endingOf = (word: string): string => WORD_FAMILIES.find((family) => family.words.includes(word))?.ending ?? '?';
    for (const skillId of ['E-K-B6', 'E-K-B7']) {
      for (const question of everyQuestion(skillId)) {
        for (const say of said(question).filter((each) => sounds(each).length > 0)) {
          const heard = sounds(say);
          expect(heard.length % 2, skillId).toBe(0);
          for (let i = 0; i < heard.length; i += 2) expect(WORD_FAMILIES.map((family) => family.ending)).toContain(`${heard[i]}${heard[i + 1]}`);
        }
        for (const say of said(question)) for (const family of WORD_FAMILIES) expect(plainWords(say), skillId).not.toContain(family.ending);
      }
    }
    // A tapped family group reads its label's letters, never a word on one of the cards.
    for (const question of everyQuestion('E-K-B7')) {
      if (question.type !== 'sort') throw new Error('not a sort');
      const cards = question.facts.read as string[];
      for (const bin of question.bins) {
        expect(plainWords(bin.speak).some((word) => cards.includes(word))).toBe(false);
        expect(letters(bin.speak).join('')).toBe(bin.label.slice(1));
      }
    }
    for (const question of all('E-K-B6', 1)) expect(endingOf(s(question, 'target'))).not.toBe('?');
  });

  it('kindergarten B.11: the sound that changes, then the letter', () => {
    for (const question of everyQuestion('E-K-B11')) {
      const from = s(question, 'from');
      const to = s(question, 'target');
      const at = [...to].findIndex((letter, i) => letter !== from.charAt(i));
      const [, change, spell] = said(question);
      expect(sounds(change)).toEqual([from.charAt(at), to.charAt(at)]);
      expect(letters(spell)).toEqual([from.charAt(at), to.charAt(at)]);
    }
  });

  it('kindergarten B.10: each sound of the split is said in turn, and its hint is never the split', () => {
    for (const entry of SOUND_SPLITS) {
      expect(entry.keys).toHaveLength(entry.sounds.length);
      for (const key of entry.keys) expect(isSoundKey(key), `${entry.word}: ${key}`).toBe(true);
      // /oo/ has no recorded sound.
      expect(entry.sounds).not.toContain('oo');
    }
    for (const question of everyQuestion('E-K-B10')) {
      const entry = SOUND_SPLITS.find((each) => each.word === s(question, 'target'));
      expect(sounds(said(question)[0])).toEqual(entry?.keys);
      // No letter group (sh, ck, ai) is ever said as text.
      for (const say of said(question)) for (const part of entry?.sounds ?? []) if (part.length > 1) expect(plainWords(say)).not.toContain(part);
      expect(nudgeFor(question)?.text).not.toContain('·');
    }
  });
});

describe('a syllable is not a letter sound', () => {
  it('pre-K B.3 and kindergarten B.12 say only the whole word, never a part such as "ple" or "i"', () => {
    const partsOf = new Map([...SYLLABLE_WORDS, ...CLAP_WORDS].map((entry) => [entry.word, entry.parts]));
    for (const question of [...everyQuestion('E-PK-B3'), ...everyQuestion('E-K-B12')]) {
      const words = question.skillId === 'E-PK-B3' ? [s(question, 'target')] : (question.facts.options as string[]);
      for (const say of said(question)) {
        expect(letters(say), question.skillId).toEqual([]);
        // A part may be said only as a whole word of the question itself (cake, beside cup · cake).
        for (const word of words) for (const part of partsOf.get(word) ?? []) if (!words.includes(part)) expect(plainWords(say), `${word}: ${sayText(say)}`).not.toContain(part);
      }
    }
    for (const question of all('E-PK-B3', 2)) expect(question.prompt.text).toBe(`Clap the word ${s(question, 'target')}. How many claps?`);
  });
});

describe('pre-K words and listening', () => {
  it('C.1 asks for vehicles and clothes in everyday words, then names the group in full sentences', () => {
    for (const question of everyQuestion('E-PK-C1')) {
      expect(question.prompt.text).not.toMatch(/vehicle|piece of clothing/);
      if (s(question, 'target') === 'vehicles') expect(question.explanation.steps.at(-1)).toMatch(/ is a vehicle\.$/);
      if (s(question, 'target') === 'clothes') expect(question.explanation.steps[0]).toMatch(/^You wear /);
    }
  });

  it('C.5 never offers a picture that also shows the part asked for, and a plural is shown twice', () => {
    for (const level of [1, 2] as Level[]) {
      for (const question of all('E-PK-C5', level)) {
        const options = question.facts.options as string[];
        for (const [inner, outer] of BODY_INSIDE) if (s(question, 'target') === inner) expect(options).not.toContain(outer);
      }
    }
    for (const question of all('E-PK-C5', 3)) {
      const use = BODY_USES.find((each) => each.ask === s(question, 'ask'));
      expect(question.prompt.text).toBe(`Listen. ${use?.ask}`);
      const shown = question.explanation.visual;
      expect(shown?.kind === 'emojiGroup' ? shown.count : 0).toBe(use?.two === undefined ? 1 : 2);
    }
  });

  it('C.6 asks only about everyday actions', () => {
    const heard = new Set<string>();
    for (const question of everyQuestion('E-PK-C6')) for (const verb of question.facts.options as string[]) heard.add(verb);
    expect([...heard].sort()).toEqual([...HEARD_VERBS].sort());
    for (const verb of ['surf', 'ski', 'juggle', 'row', 'sit']) expect(HEARD_VERBS).not.toContain(verb);
    expect(ACTIONS.filter((each) => HEARD_VERBS.includes(each.verb))).toHaveLength(HEARD_VERBS.length);
  });

  it('C.7 asks with the verb its sentence uses, never "works with"', () => {
    for (const question of everyQuestion('E-PK-C7')) {
      const helper = HELPERS.find((each) => each.thing.word === s(question, 'target'));
      expect(question.prompt.text).toBe(helper?.ask);
      expect(question.prompt.text).not.toContain('works with');
    }
  });

  it('D.1 starts from the picture shown, never from the step before it', () => {
    for (const question of everyQuestion('E-PK-D1')) expect(question.explanation.steps[0]?.toLowerCase()).toContain(s(question, 'target'));
    expect(SEQUENCES.flatMap((sequence) => sequence.lines)).not.toContain('First a baby.');
  });

  it('D.2 never asks a pre-K child a passive question such as "Who gets fed?"', () => {
    for (const question of everyQuestion('E-PK-D2')) expect(s(question, 'ask')).not.toMatch(/gets fed/);
    // Kindergarten reads the written one.
    expect(WHO_SENTENCES.some((each) => each.ask === 'Who gets fed?' && each.heard !== undefined)).toBe(true);
  });

  it('A.7 says the name in the question', () => {
    for (const question of everyQuestion('E-PK-A7')) {
      const name = describeVisual(question.stimulus ?? 'blank');
      expect(question.prompt.text.toUpperCase()).toBe(`THIS NAME IS ${name}. WHICH LETTER IS IN ${name}?`);
    }
  });
});

describe('kindergarten letters, words and sentences', () => {
  it('A.3 says which word is big and which is small', () => {
    for (const question of everyQuestion('E-K-A3')) for (const say of said(question)) expect(sayText(say)).toMatch(/^Big \w+ goes with small \w+\.$/);
  });

  it('A.5 asks about sentences only when there is a sentence group', () => {
    for (const question of all('E-K-A5', 1)) expect(question.prompt.text).not.toContain('sentence');
    for (const question of all('E-K-A5', 2)) expect(question.prompt.text).toContain('sentence');
  });

  it('B.6 asks "Which word does not rhyme?" and never offers the word not, which the question says', () => {
    for (const question of all('E-K-B6', 2)) {
      expect(question.prompt.text).toBe('Which word does not rhyme?');
      expect(question.facts.options).not.toContain('not');
    }
  });

  it('D.1 and D.4 ask the same way, and D.1 points at the start, then the end, then both', () => {
    for (const question of [...everyQuestion('E-K-D1'), ...everyQuestion('E-K-D4')]) expect(question.prompt.text).toBe('Which one is written the right way?');
    for (const question of all('E-K-D1', 1)) expect(question.explanation.steps.slice(0, 2)).toEqual(['Look at the first letter of each one.', 'A sentence starts with a capital letter.']);
    for (const question of all('E-K-D1', 2)) expect(question.explanation.steps.slice(0, 2)).toEqual(['Look at the end of each one.', 'A sentence ends with a period.']);
  });

  it('D.3 says what in a written word means more than one: the s at its end', () => {
    for (const question of all('E-K-D3', 2)) {
      expect(question.explanation.steps.join(' ')).toMatch(/s at the end|the letter s/);
      expect(question.explanation.steps.join(' ')).not.toContain('There is');
    }
  });

  it('D.4 says one rule a sentence, and names the capital a name starts with', () => {
    for (const question of all('E-K-D4', 3)) expect(question.explanation.steps.slice(0, 2)).toEqual(['Names start with a capital letter.', 'The word I is always a capital letter.']);
    for (const question of all('E-K-D4', 1)) {
      const name = (question.facts.options as string[])[question.type === 'choice' ? question.answerIndex : 0] as string;
      expect(question.explanation.steps[1]).toBe(`${name} starts with a capital ${name.charAt(0)}.`);
    }
  });

  it('D.5 never ends its question on the question word, and a "what" is never also a place', () => {
    for (const question of [...all('E-K-D5', 1), ...all('E-K-D5', 2)]) expect(question.prompt.text).toBe(`Find the one that answers a ${s(question, 'target')} question.`);
    const what = ANSWERS.filter((each) => each.kind === 'what').map((each) => each.word);
    for (const place of ['bed', 'box']) expect(what).not.toContain(place);
  });

  it('E.1 and E.6 say the word the sentence has and what the picture shows', () => {
    for (const question of [...everyQuestion('E-K-E1'), ...everyQuestion('E-K-E6')]) {
      const steps = question.explanation.steps.join(' ');
      expect(steps).toMatch(/The sentence has the word \w+\. The picture shows (a|the) \w+\./);
      expect(steps).not.toContain('just like the picture');
    }
  });

  it('E.4 asks which one comes first, and E.5 asks whether it could really happen', () => {
    for (const question of all('E-K-E4', 1)) expect(question.prompt.text).toBe('Which one comes first?');
    for (const question of everyQuestion('E-K-E5')) {
      expect(question.prompt.text).toContain('Could this really happen? Real or make-believe?');
      expect(question.prompt.text).not.toContain('Is it');
    }
  });

  it('C.4 says to drag the word in', () => {
    for (const question of everyQuestion('E-K-C4')) expect(question.prompt.text).toContain('Drag it');
  });
});

describe('kindergarten heard stories and facts', () => {
  const answerOf = (question: Question): PictureAnswer | undefined => {
    const [id, part] = s(question, 'id').split('-');
    const story = K_STORIES.find((each) => each.id === id);
    if (story) return part === 'who' ? story.who : story.where;
    const fact = K_FACTS.find((each) => each.id === id);
    return part === '1' ? fact?.first : fact?.later;
  };

  it('E.2 and E.3 end on the sentence that holds the answer', () => {
    for (const question of [...everyQuestion('E-K-E2'), ...everyQuestion('E-K-E3')]) {
      const answer = answerOf(question);
      expect(question.explanation.steps.at(-1)).toBe(answer?.because);
    }
    for (const fact of K_FACTS) for (const answer of [fact.first, fact.later]) expect(fact.text).toContain(answer.because);
  });

  it('every answer picture shows the thing itself, never another creature doing it', () => {
    const pictures = K_FACTS.flatMap((fact) => [fact.first, fact.later]).flatMap((answer) => answer.answers.map((each) => each.emoji));
    for (const emoji of ['🦘', '🌱']) expect(pictures).not.toContain(emoji);
    const birds = K_FACTS.find((fact) => fact.id === 'kf8')?.first.answers.map((each) => each.emoji) ?? [];
    for (const animal of ['🐟', '🐘']) expect(birds).not.toContain(animal);
  });
});
