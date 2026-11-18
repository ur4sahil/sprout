# Game feel: the build spec

The owner's plan (Nov 18, 2026) is to make Sprout feel like a game without being one: a place a child visits. This file is the working spec for building it. `docs/PLAN.md` section 19 holds the decisions; this holds the detail. Children are 4 to 8 years old and use iPads.

## The seven rules (every part obeys them)
1. The learning is the play. Nothing fun sits between the child and the next question.
2. A miss is never a loss. No lives, no buzzer, no red, no character looking let down.
3. Missing a day costs nothing. Nothing wilts, a streak pauses and never resets, no guilt.
4. Nothing to buy, nothing random. Rewards are earned by learning and known in advance.
5. The grown-up's limits win: daily minutes, the plan's parts, the mute switch.
6. Short by design. A celebration is 1 to 3 seconds and a tap skips it.
7. Calm is an option. Calm mode (`child.settings.calm`, `:root[data-calm]`) and the device's Reduce Motion turn movement into short fades; particles are not drawn.

## What is already built (read these before adding to them)
- **Worlds:** `src/worlds/` (`types.ts`, `garden.ts`, `index.ts`). Everything about look and feel comes from the current world: `currentWorld()`. The garden is the only world so far. `growthStage(score, mastered)` gives a skill's stage 0 to 4.
- **Timings and movements:** tokens in `src/styles/tokens.css` (`--t-tap` 90ms, `--t-pop` 180ms, `--t-move` 320ms, `--lesson-glide` 650ms, `--t-scene` 900ms, `--ease-settle`, `--ease-bounce`). Global touch response and Calm mode in `src/styles/feel.css`. `data-arrive` on an element slides it in.
- **Sounds:** `src/audio/sounds.ts` (`playSound(name, step)`), 13 CC0 files in `public/sounds`. A tap sounds under every control while a child plays (`src/app/feel.ts`).
- **Particles:** `src/lib/particles.ts` and `src/components/ParticleBurst.tsx` (kinds: sparkle, star, petal, leaf, drop, confetti).
- **Answers:** `src/components/QuestionStage.tsx` (right answer pops, sparkles, `FlyStar` to the score; a miss wobbles in amber then shows the steps; `run` counts right answers in a row).
- **Lessons:** `src/lessons/` (182 lessons and 119 part 2 lessons as scene data), `src/components/LessonStage.tsx`, the host that acts on the stage (`src/lessons/actor.ts`, `src/components/StageActor.tsx`, drawn by `src/components/LessonHost.tsx`).
- **The plan for the day:** `src/app/todaysPlan.ts`, `src/components/TodayPlan.tsx`, `src/screens/kid/Home.tsx`.
- **Stickers:** `src/app/awardsRun.ts`, `src/screens/kid/Awards.tsx`.

## House rules for code (tests enforce most of these)
- Read `CLAUDE.md` at the repo root first. It lists the conventions.
- The repo is public: no real names, email addresses or secrets anywhere.
- One React component per file. Functional components with hooks.
- **No colour, pixel or rem value in a component or its CSS module.** Colours and sizes are tokens in `src/styles/tokens.css` (or `src/visuals/palette.ts` for drawn pictures). Add the tokens you need in one clearly marked block at the END of the `:root` block, headed by a comment naming your part (e.g. `/* the cast */`), so several people adding tokens do not collide.
- A CSS variable set from code is named `--set-*`.
- Comments are plain English a non-programmer could follow; say why, not what.
- Text a child sees is short and warm; text is also spoken, so every spoken line is a `Say` (see `src/engine/types.ts`): plain strings hold no digits or signs, numbers are `{ number }`, letters `{ letter }`, words `{ word }`.
- Everything works offline and with no network at first paint. No new npm packages without saying why in your report. No video files.
- Motion: use the timing tokens; give every animation a Calm mode and Reduce Motion form (usually: nothing, or a fade). Anything longer than a second can be skipped with a tap.
- Animate with CSS or the Web Animations API (`element.animate`), guarded for where it does not exist (the unit tests run in jsdom, which has no `animate` and no canvas drawing).
- Unit tests go beside the others in `tests/`. Pure logic gets a test; a component gets at least a render test in both normal and Calm mode.
- Do not edit: `src/storage/schema.ts` (ask in your report for any new saved setting), `src/styles/feel.css`, `src/worlds/types.ts` except by adding optional fields, other people's new directories, or anything in `src/content`.
- Do not commit, do not run Playwright, do not run `npm run verify` (others are editing the tree; run only your own tests, `npx tsc --noEmit -p .` and eslint on your files).

## The phases

### Phase 2b: a touch for each kind of question
Each question type in `src/items/` gets its own feel while answering and when right. `QuestionStage` adds `.correct` / `.missed` on the wrapper and `data-phase`; items can key their own right-answer animation off a new `data-right` attribute you may have `QuestionView` pass down, or off the wrapper class.

| Type (file) | While answering | When right |
|---|---|---|
| choice (`ChoiceItem`) | the option lifts under the finger; the chosen one stays raised | the chosen card flips to show a tick |
| multiSelect | each pick gets a small numbered pin | pins pop into ticks one after another (40ms stagger) |
| tapCount | each tapped object bounces and shows its number | objects line up; the total stamps in |
| numberPad | keys press with `tick`; digits drop into the box | the number glows |
| order | a dragged tile tilts toward travel and casts a larger shadow; others slide apart | tiles link and "chug" once together |
| sort | a bin lifts its edge as a tile comes near | each bin gives a happy shake |
| match | a line follows the finger from an item to its partner | each line turns into a bow (a small knot shape) |
| tiles (spelling) | letters click into slots (`drop`); a wrong slot lets the tile slide back | letters light in turn |
| numberLineTap | a small frog (the world may name the hopper) hops to the tapped place | it lands; the number lights |
| setClock | hands turn with soft `tick`s | one `star` chime |
| buildBar | bars rise with `pop`s | bars wave, tallest last |
| columnSum | a carried digit hops up to the next column | the answer underlines itself |
| dragWord | the gap widens as the word nears | the sentence glows left to right |
| fillShape | pieces snap in with `drop`; a wrong piece slides back | the filled shape glows and turns once |

Sounds use `playSound` with the current world's names where one fits. Nothing may change what an item reports through `onChange`, its accessibility labels, or its size on screen. Pre-reader mode and the existing tests must keep passing.

### Phase 3: the cast
Four characters as rigs: separate drawn SVG parts moved by CSS/JS, in the flat style of `LessonHost` (which is today's Sprout; rebuild it inside the cast so the lesson stage keeps working).

- New directory `src/cast/`. `Character` component: `<Character who="sprout|pip|olive|finn" mood={...} lookAt={{x,y}|null} talking={boolean|number} size?/>`.
- Who: **Sprout** (a round green sprout, two leaves on top; everywhere), **Pip** (a ladybug; Math), **Olive** (an owl; Language Arts, and the story reader), **Finn** (a frog; Reasoning). `castFor(subject)` returns the friend.
- Parts: body, head, two eyes each with pupil and lid, brows, mouth, two arms with hands, feet, and one signature part (Sprout's leaves, Pip's wings, Olive's ear tufts, Finn's throat).
- Mouth: 6 shapes (closed, small, wide, round, smile, big smile). `talking` true = a talk loop; a number 0 to 1 = mouth openness, so a caller can drive it from audio loudness. Provide `useLoudness(audioElementOrNode)` in `src/cast/` that returns 0 to 1 from the playing audio where WebAudio allows, and falls back to a loop.
- Eyes: blink every 3 to 6 seconds; pupils turn toward `lookAt`.
- Always: a slow breathing bob; the signature part sways.
- Moods (states): idle, greet (hop in and wave), talk, listen (lean in), think (hand to chin, eyes up), point, cheer (0.6s hop, eyes smiling), cheerBig (1.5s jump and spin, arms up), encourage (soft smile, open hands), sleep (curled, a "z"), peek (lean in from an edge).
- Never: a frown, a disappointed look, or covering an answer.
- Spoken lines: `src/cast/lines.ts`: for each character and each of greet, cheer, cheerBig, encourage, think, goodnight: 4 to 6 short `Say` lines, never the same twice running (`pickLine(who, kind, lastIndex)`).
- A test page is not needed; write a render test for every character × mood, in normal and Calm mode.

### Phase 4: the garden (home)
Home becomes the child's garden. Built as its own screen component that `Home.tsx` will later show in place of the plan list; build `src/garden/` and a `Garden` screen component that takes the same data Home has (`ChildDay` from `src/app/childDay.ts`: states, plan, reviewsDue).

- One wide scene, scrolled sideways by finger, drawn in SVG with three layers that move at different speeds (far hills, middle, near). Three areas side by side: Number Meadow (math), Word Woods (ela), Puzzle Pond (reasoning).
- Each topic (a ladder in `src/content/ladders.ts`) is a flower bed; each skill in the child's grade, or started, is a plant in one of 5 stages from `growthStage`: seed packet, sprout, plant with bud, bud opening, bloom with a visiting butterfly or bee. Draw the 5 stages as parts so a plant can grow from one to the next with an animation (`growTo(stage)`).
- A plant whose review is due droops slightly with a small watering can beside it.
- Today's plan is a path of stepping stones from Sprout to each of today's plants, in order (review: watering can; practice per subject; new skill: seed packet; mixed bag: basket, greyed with a padlock when locked). Done stones become flower patches. A big button: "Follow the path" (then "Keep going", then "Path done!").
- The sun, top right: fills with the plan's progress (`planProgress`) and shows the count.
- Life: leaves sway, clouds drift. Light follows the real clock (morning, afternoon, evening, night with stars). All ambient motion stops in Calm mode.
- Tapping a plant: it bounces, a small card shows the skill's name, its stage in the world's words, and buttons Practice / Lesson.
- A signpost opens the existing lists: All skills (the subject pages), Stickers, and (later) the story book. Switch child and the Grown-ups gate stay reachable.
- Only draw what is near the screen (a child may have 100+ plants): group by bed and skip beds far off screen.
- Everything the garden shows is worked out from saved scores; it saves nothing new.
- The garden's words, colours and plant drawings belong to the world: add what you need to the garden world pack (optional fields on `World`), not to the screen.

### Phase 5: the payoff
- After a practice session ends (the soft break, leaving, or mastery), a short "growth show" (about 3 seconds, a tap skips it): the skill's plant at its stage before, water and light fall, it grows to its stage now (or stays, and rustles), then three facts appear one by one (answers right, new score, days in a row), then buttons "Next on the path" and "Back to the garden".
- Reaching 100: the full bloom: petals fly, a butterfly lands, the subject's friend does the big cheer.
- Review becomes watering: each plant under review is shown in a pot; each right answer pours a little water; done plants stand tall.
- The Mixed bag is a basket: a card flies out for each question, its border in the subject's colour, and the friend in the corner changes with the subject.
- During practice, a small plant for the skill sits in the status panel and grows live when the score crosses a stage.

### Phase 6: lessons 2.0
All on the lesson stage, so every lesson gets it and none is rewritten.
- Backdrops by topic (a `backdrop` per scene is already a field): picnic (counting, comparing), stall (adding, taking away), workshop (place value), site (shapes), shop (measuring, time, money), treehouse (letters and sounds), nook (reading, sentences, stories), pond (reasoning). A function picks the backdrop from the skill's category or strand; each is drawn in SVG like the table in `LessonStage`.
- The teacher: the host on the stage is the cast member for the lesson's subject (Sprout with Pip helping for math, Olive for language, Finn for reasoning).
- A camera: the stage zooms gently (scale and translate, `--lesson-glide`) toward the focus `actorFocus` already finds, and back out when nothing is in focus. Never so far that a piece leaves the stage.
- Acting: the host looks toward the child when a turn starts, nods on the last moment before a turn, and does a small hop when a count finishes.
- Props with life: a piece that lands bounces (exists as `lively`); `cell` counters clack (`drop` sound) as they appear.
- Chapter dots under the stage: one per part of the lesson between turns; tapping one replays from there.
- The turn inside the scene: while a turn is asked, the host stays visible beside the question, waiting and watching (`listen`).

### Phase 7: collecting and stories
- **Sticker book:** `Awards` becomes a book with pages that turn. A new sticker is peeled and pressed on by the child's tap. Unearned stickers show as dotted outlines with what earns them.
- **Garden things:** some stickers are objects (bench, birdhouse, lanterns, pond frog) the child drags into the garden; where they are put is saved per child (needs a new saved record: describe it in your report, do not add it yourself).
- **Visitors:** when a subject area has 5, 15 and 30 plants in bloom, an animal moves in (a hedgehog, ducks, a deer), announced by Sprout.
- **Days in a row:** counted from days with the plan's first part done. A missed day pauses the count; two free rest days a week. No message ever mentions a missed day. Shown as a row of small suns.
- **Stories:** "The Garden Year", short picture-book episodes, one unlocked each day the plan is finished, kept in a story book. 6 to 8 pages each, 60 to 90 seconds, read by Olive, words lighting as spoken, a drawn scene per page using the cast. Each is a small problem in the garden solved with something a K to Grade 1 child is learning. Each ends settled (no cliff-hangers). One unscored question at the end. Data in `src/stories/` as typed episode objects (pages: scene description as pieces/cast poses, the `Say`, the text); a `StoryReader` component plays one.
- **Weekly postcard:** a week with 4 or more plan days makes a postcard on the grown-ups dashboard.

### Phase 8: polish
- Music: a soft loop for the garden, a lighter one in practice, a lullaby at night; ducked under any voice; off during questions that are read aloud; a Music switch per child; the mute switch silences all.
- Seasons: the garden's palette follows the month.
- The profile screen: each child's card is their avatar in front of a small picture of their own garden; tapping one flies into the garden.
- Fast facts, Pairs and Pop in the same style (sounds, friends, particles).
- Screen changes: garden to a skill pushes in toward that plant; back pulls out.
- An old-device fallback: if frames drop, turn off the far layers and particles.
