// Lists every sentence worth recording ahead of time in the Piper voices (plan section 20; docs/VOICES_AND_LESSONS.md,
// phase 5), each under the key the Worker keeps it at, so a child never waits for a sentence to be made.
// Run: npx tsx scripts/voice-ahead.ts <out.tsv>
//
// One line per sentence, key<TAB>voice<TAB>sentence, once for each key, in the order of the plan's phase 5 table:
//   1. praise, "Not quite", hint and screen lines, letters and numbers 0 to 1,000
//   2. the friends' own lines
//   3. skill names and today's plan
//   4. lessons and their worked examples, as they are today
//   5. stories, their pages and tapped words
//   6. the common questions (every skill, levels 1 to 3, seeds 1 to 50), fast facts and the check-in, in blocks:
//      the questions, the hint's worked examples, fast facts, the check-in, then Pop (Sprout's) at the very end
// `voice` is the Piper voice the voice machine is asked for (PIPER_VOICE: amy, ryan, kristin, joe), `sentence` the
// text exactly as the Worker hashes it, and `key` is piperKey(sentence, who), both from worker/voice.ts. A recording
// goes up under `key`, with its timing file beside it (timingKey). The report gives each group's and block's lines.
//
// Who says each line is the app's choice, not this script's. The new voices are switched on as the server switches
// them (setVoiceEngine('piper')), and each line goes to whoever the app's own code names at its call site: voiceFor
// or praiseFor where a screen names the speaker, Sprout where it names no one (the default of speak, warm and
// warmAll), Olive where the story reader names her. The call sites are named beside each line, and each line is made
// from the same functions and lines its call site uses. It is cut into the pieces the app sends, as `warm` does in
// src/audio/voice.ts: voicePieces, a letter sound with a recording left out (it plays from its own recording), and
// voiceText. Each piece then goes through the Worker's own POST /api/voice (piperVoice, with a store and a voice
// machine that only listen), so the sentence is the Worker's normalised text, and a piece it refuses (SAFE_TEXT, more
// than MAX_VOICE_TEXT characters) is counted and left out. A piece the app itself will not send is said by the
// device's own voice; it is counted the same way.
// The letter sounds are taken to be on the server (phase 5 uploads them). While one is missing, the app sends its
// sentences whole, with the sound said by its letters ("the sound of B"); those sentences are not listed.
import { writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlanPart } from '../src/app/todaysPlan';
import type { Pace } from '../src/audio/voice';
import type { Question, Say, Visual } from '../src/engine/types';
import type { PiperMaker, PiperVoice, VoiceStore, Who } from '../worker/voice';
import { PIPER_VOICE, piperKey, piperVoice } from '../worker/voice';

export const GROUPS = [1, 2, 3, 4, 5, 6] as const;
export type Group = (typeof GROUPS)[number];
export const GROUP_NAMES: Record<Group, string> = {
  1: 'praise, "Not quite", hint and screen lines, letters and numbers 0 to 1,000',
  2: "the friends' own lines",
  3: "skill names and today's plan",
  4: 'lessons and their worked examples',
  5: 'stories, their pages and tapped words',
  6: 'the common questions, fast facts and the check-in',
};
// Group 6 is written in these blocks, in this order, so a block can be cut out by its lines.
const GROUP_6_BLOCKS = ['question', 'hint example', 'fast facts', 'check-in', 'Pop'] as const;
const SEEDS = 50; // questions made for each skill and level
const LEVELS = [1, 2, 3] as const;
// Who a screen's words are said by when it names no one: speak(), warm() and warmAll() default to Sprout
// (src/audio/speech.ts, src/audio/voice.ts).
const UNNAMED: Who = 'sprout';
// The story reader names Olive for every page, question, reply and tapped word (src/stories/StoryReader.tsx).
const STORY_TELLER: Who = 'olive';

// One sentence to record.
export interface AheadLine {
  key: string;
  voice: PiperVoice;
  who: Who;
  sentence: string;
  group: Group;
  screen: string; // where it is heard
  skillId: string | null; // the skill whose question, lesson or name it comes from
  what: string; // where it was first found, for a person reading the report
}

// A piece that cannot be recorded: the app or the Worker refuses its text, so the device's own voice says it.
export interface Refused {
  group: Group;
  who: Who;
  what: string;
  words: string; // as the device voice says them
  by: 'app' | 'worker';
}

export interface Ahead {
  lines: AheadLine[];
  refused: Refused[]; // once for each speaker and words
  questions: number; // questions made for group 6
  leftOut: string[]; // what could not be made at all, and why
}

// What the app says that this list cannot hold.
export const NOT_COVERED: readonly string[] = [
  'The profile picker\'s "Hi" and the child\'s name (ProfilePicker.tsx): names are the family\'s own, never in the repo.',
  'A garden plant\'s "hear" line: its name, its stage of growth and, when its review is due, that it is ready for water (Garden.tsx). The stage and the watering come from the child\'s scores inside the garden screen, so the line is only reached by drawing it. Its name alone is listed (group 3).',
  'Questions at level 4 (asked from a Skill Score of 90, on the skills that have one) and at seeds past 50. A child\'s own seeds come from its id (seedFor), so its questions are a draw from the same generators.',
  'Sentences with a letter sound while that sound\'s recording is missing on the server: they go whole, with the sound said by its letters. A sound whose recording fails to load is said "the sound of B" in the voice.',
  'Anything said after a launch before the app has asked the server which voices it speaks with (src/app/updates.ts): until then it speaks as before the switch, all in Sprout\'s voice, letter sounds by their letters.',
];

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

// What the Worker makes of a request from the app: the sentence it hashes and the key it looks up, or null when it
// refuses the text. It runs the Worker's own route against a store that holds nothing and a voice machine that only
// notes what it is given, so none of the Worker's rules is copied here.
export async function workerReads(text: string, pace: Pace, who: Who): Promise<{ sentence: string; key: string } | null> {
  const heard: { sentence?: string; key?: string } = {};
  const store: VoiceStore = {
    get: async (key) => {
      heard.key = key;
      return null;
    },
    put: async () => undefined,
    getJson: async () => null,
    putJson: async () => undefined,
  };
  const maker: PiperMaker = {
    make: async (sentence) => {
      heard.sentence = sentence;
      return null;
    },
  };
  const request = new Request('https://sprout.invalid/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, pace, who }) });
  const reply = await piperVoice(store, maker, request, () => undefined);
  if (reply.status === 400) return null;
  if (heard.sentence === undefined || heard.key === undefined) throw new Error(`The Worker answered ${reply.status} for: ${text}`);
  return { sentence: heard.sentence, key: heard.key };
}

// Every sentence to record, found as described at the top. `seeds`: questions for each skill and level (50).
export async function voiceAhead(options: { seeds?: number } = {}): Promise<Ahead> {
  const seeds = options.seeds ?? SEEDS;
  // The app's modules are loaded here rather than at the top, so that when this runs as a script the stand-ins for
  // Vite (VITE_STAND_INS, below) are in place first. Under Vitest, Vitest loads them.
  const { resetVoiceEngine, setVoiceEngine } = await import('../src/audio/engine');
  const { serverSoundClips, setSoundClips } = await import('../src/audio/soundClips');
  const { soundClipOf, voicePieces, voiceText } = await import('../src/audio/voice');
  const { PRAISE, loneSound, sayWords } = await import('../src/audio/say');
  const { openingWords, spokenSteps } = await import('../src/audio/stepSay');
  const { LINES, MILESTONE_WORDS, chooseLine } = await import('../src/audio/lines');
  const { CAST_NAMES, LINES: FRIEND_LINES, LINE_KINDS, WHO, castFor, voiceFor } = await import('../src/cast');
  const { praiseFor } = await import('../src/app/usePractice');
  const { exampleFor, nudgeFor } = await import('../src/app/hints');
  const { factAskSay, factMissSay } = await import('../src/app/facts');
  const { awardSkills } = await import('../src/app/awardsRun');
  const { BOOK_LINES, howToEarn, stickerTelling, wordsSay } = await import('../src/app/stickerBook');
  const { CHECK_IN_SUBJECTS, diagnosticLadders } = await import('../src/app/checkIn');
  const { partSay } = await import('../src/components/TodayPlan');
  const { boardName } = await import('../src/screens/kid/Awards');
  const { exampleQuestion, generateQuestion, generatorFor } = await import('../src/content/registry');
  const { ALPHABET } = await import('../src/content/data/letters');
  const { videoFor } = await import('../src/content/videos');
  const { allAwards } = await import('../src/engine/awards');
  const { diagnosticLevel } = await import('../src/engine/diagnostic');
  const { FACT_SETS } = await import('../src/engine/facts');
  const { speakable } = await import('../src/items/itemProps');
  const { allLessons, lessonSays, teachingFor } = await import('../src/lessons');
  const { EPISODES } = await import('../src/stories/episodes');
  const { replySay, storyWords } = await import('../src/stories/words');

  // As on a device once the server has said it speaks with the new voices (src/app/updates.ts), with the server's
  // letter-sound recordings as the source (main.tsx).
  setVoiceEngine('piper');
  setSoundClips(serverSoundClips());
  try {
    const leftOut: string[] = [];
    const pending: { group: Group; screen: string; skillId: string | null; what: string; who: Who; pace: Pace; text: string }[] = [];
    const queued = new Set<string>();
    const refused: Refused[] = [];
    const refusedSeen = new Set<string>();
    const refuse = (entry: Refused): void => {
      const id = `${entry.who}|${entry.words}`;
      if (refusedSeen.has(id)) return;
      refusedSeen.add(id);
      refused.push(entry);
    };

    // One thing the app says, in the pieces it sends them in (as `warm` does).
    const sends = (group: Group, screen: string, skillId: string | null, what: string, words: Say, pace: Pace, who: Who): void => {
      const alone = loneSound(words) !== null;
      for (const piece of voicePieces(words, pace)) {
        if (soundClipOf(piece, alone) !== null) continue; // a letter sound, played from its own recording
        const text = voiceText(piece);
        if (text === null) {
          refuse({ group, who, what, words: sayWords(piece), by: 'app' });
          continue;
        }
        const id = `${who}|${text}`;
        if (queued.has(id)) continue;
        queued.add(id);
        pending.push({ group, screen, skillId, what, who, pace, text });
      }
    };

    // The pictures a child can tap to hear, as the question components say them (ChoiceItem, MultiSelectItem,
    // DragWordItem, OrderItem, SortItem, MatchItem): each one's own words, through speakable.
    const tapped = (question: Question): Say[] => {
      const pictures: readonly Visual[] =
        question.type === 'choice' || question.type === 'multiSelect' || question.type === 'dragWord'
          ? question.options
          : question.type === 'order' || question.type === 'sort'
            ? question.items
            : question.type === 'match'
              ? [...question.left, ...question.right]
              : [];
      return pictures.map((picture) => speakable(question, picture.speak)).filter((say): say is Say => say !== null);
    };

    // The skills that are built and not retired: the ones home, the subject pages and the sticker book show.
    const skills = awardSkills();
    const skillById = new Map(skills.map((skill) => [skill.id, skill]));
    const subjects = unique(skills.map((skill) => skill.subject));
    const firstQuestion = (subject: (typeof subjects)[number]): Question => {
      const skill = skills.find((each) => each.subject === subject);
      if (!skill) throw new Error(`No skill in ${subject}`);
      return generateQuestion(skill.id, 1, 1);
    };
    // The voice each subject's screens speak in (PracticeSession.tsx, ReviewSession.tsx, MixedBagSession.tsx,
    // Diagnostic.tsx, LessonPlayer.tsx).
    const friends = unique(subjects.map((subject) => voiceFor(subject)));

    // ---- 1. Praise, "Not quite", hint and screen lines, letters and numbers ----
    // The usual praise, in the voice praiseFor gives it (usePractice.ts, useReview.ts, useMixedBag.ts), and in a
    // lesson's turn in the teller's (useTeach.ts).
    const praisers = unique(subjects.flatMap((subject) => [praiseFor(firstQuestion(subject), 0, castFor(subject), { index: null }).who, voiceFor(subject)]));
    for (const who of praisers) for (const each of PRAISE) sends(1, 'question', null, 'praise', each.say, 'normal', who);
    // "Not quite" on its own, as a miss whose first step cannot be said opens: by the subject's friend in practice,
    // review and the Mixed bag (usePractice.ts, useReview.ts, useMixedBag.ts), and by Sprout in Pop (Pop.tsx).
    const asked = firstQuestion('math');
    const notQuite = openingWords({ ...asked, explanation: { ...asked.explanation, steps: [], stepsSay: undefined } });
    for (const who of unique([...friends, UNNAMED])) sends(1, 'question', null, '"Not quite"', notQuite, 'normal', who);
    // The hint's opening words, in the voice the question screens hand the hint (HintPanel.tsx).
    for (const who of friends) for (const words of [LINES.hintNudge, LINES.hintExample]) sends(1, 'question', null, 'hint', words, 'normal', who);
    // Practice's own cards: the break, the short test passed and the milestones (usePractice.ts).
    for (const who of friends) {
      sends(1, 'practice', null, 'break', LINES.nextOne, 'normal', who);
      sends(1, 'practice', null, 'known already', LINES.knownAlready, 'normal', who);
      for (const words of Object.values(MILESTONE_WORDS)) sends(1, 'practice', null, 'milestone', [words.title, words.line], 'normal', who);
    }
    // Screens that name no speaker: the daily limit (DailyLimit.tsx), new stickers on home (Home.tsx), the check-in's
    // closing lines (Diagnostic.tsx), the end of a review and of a Mixed bag (ReviewSession.tsx,
    // MixedBagSession.tsx), and the sticker book's (Awards.tsx).
    for (const words of [LINES.dailyLimit, LINES.checkInSitting, LINES.checkInDone, LINES.reviewDone, LINES.mixedDone]) sends(1, 'end card', null, 'screen line', words, 'normal', UNNAMED);
    for (const words of [LINES.newSticker, LINES.newStickers]) sends(1, 'home', null, 'new sticker', words, 'normal', UNNAMED);
    for (const words of [BOOK_LINES.press, BOOK_LINES.pressMany]) sends(1, 'sticker book', null, 'press it on', words, 'normal', UNNAMED);
    // The bulb's choice line, naming the subject's teller, with a video when the skill has one (LessonPlayer.tsx).
    for (const subject of subjects) {
      const teller = CAST_NAMES[voiceFor(subject)];
      sends(1, 'lesson choice', null, `choice, ${subject}`, chooseLine(teller, false), 'normal', UNNAMED);
      if (skills.some((skill) => skill.subject === subject && videoFor(skill.id) !== null)) sends(1, 'lesson choice', null, `choice with a video, ${subject}`, chooseLine(teller, true), 'normal', UNNAMED);
    }
    // The sticker book: each page's name as it turns, and what a sticker says when tapped (Awards.tsx).
    const awards = allAwards(skills);
    for (const board of unique(awards.map((award) => award.board))) sends(1, 'sticker book', null, `page ${board}`, wordsSay(boardName(board)), 'normal', UNNAMED);
    for (const award of awards) {
      sends(1, 'sticker book', null, `sticker ${award.id}`, stickerTelling(award).say, 'normal', UNNAMED);
      sends(1, 'sticker book', null, `how to earn ${award.id}`, howToEarn(award, boardName(award.board)).say, 'normal', UNNAMED);
    }
    // The grown-ups' sound check: every letter name, and the numbers 0 to 20 (SoundCheck.tsx).
    sends(1, 'sound check', null, 'letters', ALPHABET.map((letter) => ({ letter })), 'normal', UNNAMED);
    sends(1, 'sound check', null, 'numbers', Array.from({ length: 21 }, (_, number) => ({ number })), 'normal', UNNAMED);
    // A letter or a number on its own: a tapped picture in each subject's questions, check-in and lessons (the
    // screen's own voice), and a tapped number in a story (Olive).
    for (const who of unique([...friends, STORY_TELLER])) {
      for (const letter of ALPHABET) sends(1, 'letters and numbers', null, 'letter', [{ letter }], 'normal', who);
      for (let number = 0; number <= 1000; number += 1) sends(1, 'letters and numbers', null, 'number', [{ number }], 'normal', who);
    }

    // ---- 2. The friends' own lines, each in its own voice (praiseFor says a friend's cheer in its voice) ----
    for (const who of WHO) for (const kind of LINE_KINDS) for (const line of FRIEND_LINES[who][kind]) sends(2, 'friend', null, `${who}, ${kind}`, line, 'normal', who);

    // ---- 3. Skill names and today's plan, all on screens that name no speaker ----
    // A skill's name: its tile on a subject page (SubjectPage.tsx) and its plant tapped in the garden (Garden.tsx).
    for (const skill of skills) sends(3, 'home', skill.id, `${skill.id}, name`, skill.speakName, 'normal', UNNAMED);
    // Each part of today's plan as its card says it (TodayPlan.tsx), and as "Next up!" over the cards and between
    // the parts of a run (Home.tsx, Play.tsx). Then the plan done (Home.tsx).
    const parts: { part: PlanPart; skillId: string | null }[] = [
      { part: { kind: 'review', skillIds: [], answered: 0, done: false }, skillId: null },
      { part: { kind: 'mixed', answered: 0, size: 0, done: false, locked: true }, skillId: null },
      { part: { kind: 'mixed', answered: 0, size: 10, done: false, locked: false }, skillId: null },
      ...skills.flatMap((skill) => [
        { part: { kind: 'keepGoing', subject: skill.subject, skillId: skill.id, answered: 0, done: false } satisfies PlanPart, skillId: skill.id },
        { part: { kind: 'new', skillId: skill.id, answered: 0, done: false } satisfies PlanPart, skillId: skill.id },
      ]),
    ];
    for (const { part, skillId } of parts) {
      sends(3, 'home', skillId, `plan, ${part.kind}${skillId ? ` ${skillId}` : ''}`, partSay(part), 'normal', UNNAMED);
      sends(3, 'home', skillId, `next up, ${part.kind}${skillId ? ` ${skillId}` : ''}`, [...LINES.nextUp, ...partSay(part)], 'normal', UNNAMED);
    }
    sends(3, 'home', null, 'plan done', LINES.planDone, 'normal', UNNAMED);

    // ---- 4. Lessons and their worked examples, told by the subject's friend (LessonPlayer.tsx: voiceFor) ----
    for (const [name, skillId, make] of allLessons()) {
      const skill = skillById.get(skillId);
      if (!skill) {
        leftOut.push(`the lesson ${name}: its skill is not shown to children`);
        continue;
      }
      const who = voiceFor(skill.subject);
      const lesson = make();
      // Every moment, turn and why, asked for early at the lesson pace and said at it (useTeach.ts).
      for (const words of lessonSays(lesson)) sends(4, 'lesson', skillId, `${name} lesson`, words, 'lesson', who);
      for (const part of lesson.parts) {
        if (part.kind !== 'turn') continue;
        // A turn's question is said at the normal pace (useTeach.ts), and its pictures when tapped (TeachLesson.tsx).
        sends(4, 'lesson', skillId, `${name} turn`, part.turn.question.prompt.speak, 'normal', who);
        for (const words of tapped(part.turn.question)) sends(4, 'lesson', skillId, `${name} turn, tapped`, words, 'normal', who);
      }
    }
    for (const skill of skills) {
      const who = voiceFor(skill.subject);
      // The old four beats, for a skill with no lesson that teaches (LessonPlayer.tsx).
      if (teachingFor(skill.id) === null) {
        for (const beat of generatorFor(skill.id).lesson()) {
          sends(4, 'lesson', skill.id, `${skill.id} beat ${beat.beat}`, beat.speak, 'lesson', who);
          if (beat.reveal) sends(4, 'lesson', skill.id, `${skill.id} beat ${beat.beat}, answer`, beat.reveal.speak, 'lesson', who);
        }
      }
      // The worked example, its question and then its answer (LessonPlayer.tsx).
      const example = exampleQuestion(skill.id);
      sends(4, 'lesson', skill.id, `${skill.id} example`, example.prompt.speak, 'lesson', who);
      sends(4, 'lesson', skill.id, `${skill.id} example, answer`, example.explanation.speak, 'lesson', who);
    }

    // ---- 5. Stories: each page, the question and its replies at the lesson pace, and a tapped word ----
    for (const episode of EPISODES) {
      const told = [...episode.pages.map((page) => page.say), episode.question.say, ...episode.question.options.map((_, chosen) => replySay(episode, chosen))];
      for (const words of told) sends(5, 'story', null, episode.id, words, 'lesson', STORY_TELLER);
      for (const words of told) for (const word of storyWords(words)) if (word.say.length > 0) sends(5, 'story', null, `${episode.id}, tapped word`, word.say, 'normal', STORY_TELLER);
    }

    // ---- 6. The common questions, fast facts and the check-in, in blocks one after another ----
    const made = (skillId: string, level: number, seed: number): Question | null => {
      try {
        return generateQuestion(skillId, level, seed);
      } catch (error) {
        leftOut.push(`${skillId} level ${level} seed ${seed}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    };
    const sample: { question: Question; who: Who; tag: string }[] = [];
    for (const skill of skills) {
      // Practice, a review and the Mixed bag say a question in its subject friend's voice (PracticeSession.tsx,
      // ReviewSession.tsx, MixedBagSession.tsx, usePractice.ts, useReview.ts, useMixedBag.ts: voiceFor). A review
      // asks at most level 3 and the Mixed bag at the practice level, so both draw on the same questions.
      const who = voiceFor(skill.subject);
      for (const level of unique(LEVELS.map((each) => Math.min(each, skill.maxLevel)))) {
        for (let seed = 1; seed <= seeds; seed += 1) {
          const question = made(skill.id, level, seed);
          if (question) sample.push({ question, who, tag: `${skill.id} level ${level} seed ${seed}` });
        }
      }
    }
    const questions = sample.length;
    // The question as it appears (warmQuestion), "Not quite" with the first step (the opening words of a miss),
    // every step as the walk shows it and on "Hear again" (StepWalk.tsx), each tapped picture, and the hint's nudge
    // as it opens and on "Hear again" (HintPanel.tsx).
    for (const { question, who, tag } of sample) {
      const skillId = question.skillId;
      sends(6, 'question', skillId, `${tag}, question`, question.prompt.speak, 'normal', who);
      sends(6, 'question', skillId, `${tag}, not quite`, openingWords(question), 'normal', who);
      spokenSteps(question).forEach((step, i) => {
        if (step) sends(6, 'question', skillId, `${tag}, step ${i + 1}`, step, 'normal', who);
      });
      for (const words of tapped(question)) sends(6, 'question', skillId, `${tag}, tapped`, words, 'normal', who);
      const nudge = nudgeFor(question);
      if (nudge?.say) {
        sends(6, 'question', skillId, `${tag}, hint`, [...LINES.hintNudge, ' ', ...nudge.say], 'normal', who);
        sends(6, 'question', skillId, `${tag}, hint again`, nudge.say, 'normal', who);
      }
    }
    // The hint's worked example, another question of the same skill and level: the line that opens it, and
    // everything warmQuestion asks for as the hint opens and the walk says (HintPanel.tsx, StepWalk.tsx).
    for (const { question, who, tag } of sample) {
      const example = exampleFor(question);
      if (!example) continue;
      const skillId = question.skillId;
      sends(6, 'hint example', skillId, `${tag}, hint example`, [...LINES.hintExample, ' ', ...example.prompt.speak, ' ', ...(spokenSteps(example)[0] ?? [])], 'normal', who);
      sends(6, 'hint example', skillId, `${tag}, hint example question`, example.prompt.speak, 'normal', who);
      sends(6, 'hint example', skillId, `${tag}, hint example not quite`, openingWords(example), 'normal', who);
      spokenSteps(example).forEach((step, i) => {
        if (step) sends(6, 'hint example', skillId, `${tag}, hint example step ${i + 1}`, step, 'normal', who);
      });
    }
    // Fast facts are Math: each fact as it is asked and as a miss shows its answer (FactRace.tsx: voiceFor('math')).
    for (const set of FACT_SETS) {
      for (const fact of set.facts) {
        sends(6, 'fast facts', null, `fact ${fact.id}`, factAskSay(fact), 'normal', voiceFor('math'));
        sends(6, 'fast facts', null, `fact ${fact.id}, miss`, factMissSay(fact), 'normal', voiceFor('math'));
      }
    }
    // The check-in asks each ladder's skills at its own level, in the check-in subject friend's voice: the question
    // and each tapped picture. It marks nothing right or wrong and has no hints (Diagnostic.tsx).
    for (const subject of CHECK_IN_SUBJECTS) {
      const who = voiceFor(subject);
      for (const ladder of diagnosticLadders(subject)) {
        for (const each of ladder.skills) {
          for (let seed = 1; seed <= seeds; seed += 1) {
            const question = made(each.id, diagnosticLevel(each), seed);
            if (!question) continue;
            const tag = `check-in ${each.id} level ${question.level} seed ${seed}`;
            sends(6, 'check-in', each.id, `${tag}, question`, question.prompt.speak, 'normal', who);
            for (const words of tapped(question)) sends(6, 'check-in', each.id, `${tag}, tapped`, words, 'normal', who);
          }
        }
      }
    }
    // Pop asks a skill's next choice question on a screen that names no speaker, so Sprout says it, its "Not quite"
    // and its steps (Pop.tsx). It has no hints and its balloons do not speak. Last, so it can be left off the end.
    for (const { question, tag } of sample) {
      if (question.type !== 'choice') continue;
      const skillId = question.skillId;
      sends(6, 'Pop', skillId, `Pop, ${tag}, question`, question.prompt.speak, 'normal', UNNAMED);
      sends(6, 'Pop', skillId, `Pop, ${tag}, not quite`, openingWords(question), 'normal', UNNAMED);
      spokenSteps(question).forEach((step, i) => {
        if (step) sends(6, 'Pop', skillId, `Pop, ${tag}, step ${i + 1}`, step, 'normal', UNNAMED);
      });
    }

    // Each piece as the Worker reads it, keyed by piperKey: once for each key.
    const lines: AheadLine[] = [];
    const keys = new Set<string>();
    for (const each of pending) {
      const read = await workerReads(each.text, each.pace, each.who);
      if (read === null) {
        refuse({ group: each.group, who: each.who, what: each.what, words: each.text, by: 'worker' });
        continue;
      }
      const key = await piperKey(read.sentence, each.who);
      if (key !== read.key) throw new Error(`piperKey and the Worker disagree on: ${read.sentence}`);
      if (keys.has(key)) continue;
      keys.add(key);
      lines.push({ key, voice: PIPER_VOICE[each.who], who: each.who, sentence: read.sentence, group: each.group, screen: each.screen, skillId: each.skillId, what: each.what });
    }
    return { lines, refused, questions, leftOut };
  } finally {
    setSoundClips(null);
    resetVoiceEngine();
  }
}

// The app is built by Vite, which turns a style sheet into its class names and fills in import.meta.env. Node does
// neither, so while this script runs two loader hooks stand in: a style sheet loads as an empty module, and
// import.meta.env reads as in the live app's build. Nothing is drawn, so neither is ever looked at.
const VITE_STAND_INS = `
export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && new URL(url).pathname.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  const loaded = await nextLoad(url, context);
  if (loaded.format !== 'module' || loaded.source == null) return loaded;
  const source = typeof loaded.source === 'string' ? loaded.source : new TextDecoder().decode(loaded.source);
  if (!source.includes('import.meta.env')) return loaded;
  return { ...loaded, source: 'import.meta.env ??= { MODE: "production", DEV: false, PROD: true, SSR: false };\\n' + source };
}`;

function count<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, number> {
  const out = new Map<K, number>();
  for (const item of items) out.set(keyOf(item), (out.get(keyOf(item)) ?? 0) + 1);
  return out;
}

// The first and last line of the file that each block takes, counting from 1.
function spans<K>(lines: readonly AheadLine[], keyOf: (line: AheadLine) => K): Map<K, { from: number; to: number; n: number }> {
  const out = new Map<K, { from: number; to: number; n: number }>();
  lines.forEach((line, i) => {
    const span = out.get(keyOf(line));
    if (span) out.set(keyOf(line), { from: span.from, to: i + 1, n: span.n + 1 });
    else out.set(keyOf(line), { from: i + 1, to: i + 1, n: 1 });
  });
  return out;
}

function report(ahead: Ahead, out: string): void {
  const voices = Object.keys(PIPER_VOICE) as Who[];
  const cell = (group: Group, who: Who): number => ahead.lines.filter((line) => line.group === group && line.who === who).length;
  console.log(`${ahead.lines.length} sentences written to ${out} (${ahead.questions} questions made for group 6)`);
  console.log(`\n${['group', ...voices.map((who) => `${who} (${PIPER_VOICE[who]})`), 'all', 'lines'].join('\t')}`);
  const groups = spans(ahead.lines, (line) => line.group);
  for (const group of GROUPS) {
    const span = groups.get(group);
    console.log([`${group}. ${GROUP_NAMES[group]}`, ...voices.map((who) => cell(group, who)), span?.n ?? 0, span ? `${span.from}-${span.to}` : '-'].join('\t'));
  }
  const byVoice = count(ahead.lines, (line) => line.who);
  console.log(['all', ...voices.map((who) => byVoice.get(who) ?? 0), ahead.lines.length].join('\t'));
  const screens = spans(ahead.lines, (line) => `${line.group}. ${line.screen}`);
  console.log(`\nBy where they are heard (group 6 in blocks, by line):\n${[...screens].map(([screen, span]) => `  ${screen}: ${span.n}${screen.startsWith('6.') ? ` (lines ${span.from}-${span.to})` : ''}`).join('\n')}`);
  for (const block of GROUP_6_BLOCKS) if (!screens.has(`6. ${block}`)) console.log(`  6. ${block}: 0 new (each is already listed above, in the same voice)`);
  const app = ahead.refused.filter((each) => each.by === 'app');
  const worker = ahead.refused.filter((each) => each.by === 'worker');
  console.log(`\nNot written, said by the device's own voice: ${ahead.refused.length} (the app will not send ${app.length}; the Worker would refuse ${worker.length} more)`);
  const refusedByGroup = count(ahead.refused, (each) => each.group);
  for (const group of GROUPS) if (refusedByGroup.has(group)) console.log(`  group ${group}: ${refusedByGroup.get(group)}`);
  for (const group of GROUPS) {
    for (const each of ahead.refused.filter((one) => one.group === group).slice(0, 4)) console.log(`  e.g. ${each.who}, ${each.what}: ${each.words.length > 140 ? `${each.words.slice(0, 140)}...` : each.words}`);
  }
  if (ahead.leftOut.length > 0) console.log(`\nLeft out (${ahead.leftOut.length}):\n${ahead.leftOut.slice(0, 20).map((line) => `  - ${line}`).join('\n')}`);
  console.log(`\nNot covered:\n${NOT_COVERED.map((line) => `  - ${line}`).join('\n')}`);
}

async function main(): Promise<void> {
  const out = process.argv[2];
  if (!out) throw new Error('Usage: npx tsx scripts/voice-ahead.ts <out.tsv>');
  register(`data:text/javascript,${encodeURIComponent(VITE_STAND_INS)}`);
  const ahead = await voiceAhead();
  writeFileSync(out, ahead.lines.map((line) => `${line.key}\t${line.voice}\t${line.sentence}\n`).join(''));
  report(ahead, out);
}

// Run as a script, not when a test imports it.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
