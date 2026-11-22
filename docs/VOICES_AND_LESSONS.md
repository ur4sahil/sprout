# Voices, acting friends and lessons for a 5-year-old: the build plan

Written Nov 22, 2026, from the owner's decisions of Nov 21 to 22 (plan section 20 lists them). This is the plan for
the next build: the new voices, the friend acting on the question screen, the lesson engine grown to the approved
"Make a ten" prototype, and every lesson rewritten for a kindergarten or grade 1 child. Each phase is shown to the
owner before the next starts. Nothing goes live without the owner's word.

The two prototypes the owner approved are the reference for look, timing and voice:
- the talking friends: https://claude.ai/artifact/XkkH4QUayBcFA536JzU2yR
- the lesson "Make a ten", version 5: https://claude.ai/artifact/XxgpJBLcQNq3HC7VHNvGpD

## What the owner decided

| Topic | Decision |
|---|---|
| Voices | Piper. Sprout `en_US-amy-medium`; Pip (Math) `ryan-medium`, made younger; Finn (Reasoning) `joe-medium`, made younger; Olive (Language Arts and the stories) `kristin-medium`. "Younger" is pitch and formant up by 1.12 with the tempo kept (ffmpeg `asetrate`, `aresample`, `atempo`). |
| Pace | One slow pace for every child: Piper `length_scale` 1.6, a 0.7 s pause after a sentence and 0.42 s after a comma between spoken parts. |
| Who speaks | The subject's friend says everything inside its subject: questions, hints, wrong-answer steps, praise, lessons and their examples. Sprout says everything outside: home, the garden, menus, today's plan, stickers, check-in openings, games. |
| Letter sounds | Chatterbox (its own voice), made once. Used in phonics questions, lessons, a tapped letter, hints and wrong-answer steps. Once inside a sentence, three times on its own. |
| The question screen | The friend talks with its mouth matching the sounds, reacts (bigger cheers: Pip flies a loop, Olive flaps and hoots, Finn jumps), can be tapped to hear the question again, is shown on phones too, and acts out: looks and points at what it is talking about. Small habits while it waits. Calm mode keeps only the mouth. |
| Lessons | The approved "Make a ten" shape (below). A wrong answer to a question inside a lesson gets its own small lesson, then the same question again; a second miss gets the answer said kindly and the lesson goes on. |
| Videos | Khan Academy first, calm teaching videos otherwise, no songs (done, live). |

## The lesson shape (every lesson)

1. A reason to care: a small story ("Pip is counting apples for a picnic").
2. The new idea made concrete and named: "A ten frame has ten spots. Five on the top. And five on the bottom." Then
   counted together.
3. I do: the friend shows one example. Every object is counted out loud, one number per object, as it moves.
4. We do: the child does the moving (taps the apples into the frame) while the friend counts each tap.
5. A quick, easy check before the real question.
6. You do: the child's own problem, the child doing the moves, then answering.
7. Praise for effort and a recap in the same words as before ("Fill the ten frame first. Then add the rest.").
8. Every question inside a lesson: a miss gets a small lesson (slow, concrete, counted out, the strategy said again),
   then the same question again. A second miss: the answer said kindly, move on. Never a loop, never a timer; if the
   child waits, the friend kindly repeats what to tap.

A lesson runs about 3 minutes at the slow pace.

## Phase 1: the voice switch

Built and checked on the test copy (sprout-staging) first. The owner switched the live app to Piper on Nov 22, 2026
(`VOICE_ENGINE` `piper` in `wrangler.jsonc`); Kokoro still runs behind `https://sprout-voice.logstocks.com` for a
switch back.

1. **Voice server (Oracle box).** A Piper server beside Kokoro (`sprout-piper.service`, `127.0.0.1:8881`, the same
   `/tts` request and key). The four voices from alignment-patched copies (`python -m piper.patch_voice_with_alignment`),
   so every sentence also yields its timings. Pip and Finn made younger in the server. One pace. MP3 out, plus a small
   timing file: the mouth shape for each sound and the start of each spoken part. Its own tunnel hostname for the test
   copy; the live hostname moves over at the switch.
2. **Worker.** New voice folders (`piper-<voice>-1.6/…`), one per friend; `WHO_VOICE` maps Sprout, Pip, Olive and
   Finn to their voices. The timing file is kept in R2 beside each MP3 and served with it. `VOICE_ID` changes, so no
   Kokoro file is ever served for a Piper sentence.
3. **App: who speaks.** Every speech call inside a subject names the subject's friend (`castFor(skill.subject)`):
   practice, review, Mixed bag, hints, the step walk, the check-in's questions, lessons and examples. Sprout for the rest.
4. **Letter sounds.** On the home Mac: 53 sounds (the keys in `src/engine/letterSounds.ts`) in two forms, about 106
   clips with Chatterbox. A listening page for the owner; any sound he does not like is made again. Uploaded to R2 as
   `sound/<key>/once` and `sound/<key>/three`, and wired into `src/audio/soundClips.ts` (round 1 of the wording audit
   built the plumbing and the fallback).
5. **Tests.** Worker voice routes with the in-memory store; who speaks on each screen; sound clips in and around a
   sentence; the timing file; a staging check that hears a question, a lesson line and a sound.

Done when: the owner listens on the iPad at sprout-staging.logstocks.com and agrees.

## Phase 2: the friend on the question screen

`PracticeFriend` grows into the acting friend of the approved demo:
- the mouth follows the timing file (the loudness when there is none);
- it looks and points at the question's picture while it reads, and at the answers while it waits;
- bigger reactions; a tap on the friend says the question again; small habits while it waits;
- shown on phones too, smaller, beside the question line; never over the question or a button;
- Calm mode and Reduce Motion: still poses, the mouth only; a slow iPad gets the light version.

Pointing at the exact part each step talks about ("the ones", "this apple") needs each skill's steps to say which
part they mean. That comes skill by skill, Math first, after the lessons.

Done when: the owner tries practice, review and Mixed bag on the iPad (test copy).

## Phase 3: the lesson engine, grown to the prototype

The engine already has spoken moments over a scene, pieces that keep their identity and move, ten-frame cells,
rods, cubes, badges, lit and crossed pieces, backdrops, a host that acts on the stage, and turns with a replay after
a miss (`src/lessons`, `LessonStage`, `useTeach`, `StageActor`). It grows:

1. **Spoken parts.** A moment can be a line of short parts ("One," "two," "three."), each with its own scene, so
   each apple moves on its number. Comma pause 0.42 s, sentence pause 0.7 s.
2. **The friend acts on the stage.** The lesson's friend is the subject's friend. It walks beside the piece being
   talked about, points straight at it (the arm turned from the shoulder), and looks at it. Reactions as on the
   question screen.
3. **New parts.** `do`: the child taps pieces to move them into place; the friend counts each tap; a gentle repeat if
   the child waits. `check`: an easy question. A turn's `why` is followed by the same question again (`again`).
4. **Sounds on landings.** Drop, pop, star and whoosh from the app's sound set, timed to where a piece lands.
5. **The stage kit**, in the approved look: the garden scene (sky, sun, clouds, hills, a fence, flowers that bloom at
   the end), the chalkboard whose sum changes piece by piece, the wooden ten frame with numbered spots and lit rows,
   apples and counters that drop, roll and hop, a number line with hop arcs, base-ten blocks that snap into a rod, the
   caption under the stage with the part being said picked out, confetti for the finish. Calm and light forms for all.
6. **Tests.** Every lesson checks itself (each piece it names exists, every `do` can be finished, every turn's
   question is valid, every line can be spoken); every lesson is drawn; one browser test plays "Make a ten" from end
   to end, taps included (on the Oracle box, at night).

Done when: "Make a ten", rebuilt inside the app, matches the approved prototype on the iPad.

## Phase 4: every lesson in the new shape

Written in waves by parallel agents from one template and checklist (the lesson shape above, the same strategy
words across a topic, a small lesson for every question asked). Each lesson is printed as a script
(`scripts/lesson-dump.ts`) and read before it is recorded; the owner checks a few from each wave in the test copy.

| Wave | Skills | Lessons today |
|---|---|---|
| L1 | Math kindergarten and grade 1 | 98 short lessons plus 82 part-2 lessons, rewritten |
| L2 | Language Arts kindergarten and grade 1 (uses the letter sounds) | 67 short lessons plus 20 part-2 lessons, rewritten |
| L3 | Reasoning | 17 plus 17 part-2, rewritten |
| L4 | Pre-K Math and Language Arts | none today: 54 new lessons |
| L5 | Grade 2 and grade 3 | none today: 126 new lessons |

## Phase 5: recording

Started Nov 22, 2026, on the owner's word, on the home Mac rather than the Oracle box, so the live voice machine
stays free for the children. `npx tsx scripts/voice-ahead.ts <out.tsv>` lists every sentence as
`key<TAB>voice<TAB>sentence`, with the Worker's own key and the app's own choice of speaker: about 147,000 lines, far
more than the estimate below, because every hint brings a worked example and Pop asks its questions again in Sprout's
voice. A recorder outside the repo runs the live voice machine's own `make()` over the list and keeps each sentence in
`sprout-voice` under its key, the timing first. Sentences already kept are skipped, so a list made again after a
wording change records only what changed. Browser tests never run on the Oracle box while the children may be using
Sprout.

| Order | What | Voices | About |
|---|---|---|---|
| 1 | Praise, "Not quite", hint and screen lines, letters, numbers 0 to 1,000 | all four | 5,000 lines, 1 hour |
| 2 | The friends' own lines | each its own | 110 lines |
| 3 | Skill names, today's plan lines | Sprout | 1,100 lines |
| 4 | Lessons, wave by wave as each is approved | the subject's friend | about 15,000 lines over the waves |
| 5 | Stories, pages and tapped words | Olive | 650 lines |
| 6 | The most common questions, about 50 of each skill and level | the subject's friend | 20,000 lines, overnight |
| - | Letter sounds | Chatterbox, on the home Mac | 106 clips |

Everything else is made the first time it is heard, in well under a second.

## Phase 6: the switch and the tidy-up

The owner listens on the test copy, then says push. The voice id change means old Kokoro files are never served;
switching back is one setting. After two quiet weeks: stop Kokoro on the Oracle box, delete the old Kokoro recordings
(with the owner's yes), remove the Kokoro test set-up from the home Mac. The 7-day R2 key made on Nov 22 is the recorder's
and expires on Nov 29.

## The wording audit alongside

Round 1 (shared causes, and the `hint`, `stepsSay` and sound tools) is committed (2084644). Round 2, seven agents in
parallel, one per grade group, fixes every remaining finding; it runs when the owner says, and in any case before
phase 5's recording of questions and lessons.
