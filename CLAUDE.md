# Sprout: project rules

- The spec is docs/PLAN.md. If code and plan disagree, stop and ask.
- TypeScript strict. No `any`, no `@ts-ignore`, no non-null `!` on data from storage.
- All randomness goes through `src/engine/rng.ts`. Never call Math.random().
- All dates go through `src/lib/clock.ts` so tests can freeze time.
- All persistence goes through the `Repo` interface. No direct localStorage or IndexedDB calls in components.
- All speech goes through `src/audio/speech.ts`.
- Every storage write is awaited inside try/catch and surfaces a visible error state on failure.
- One React component per file, one default export, file name matches component name.
- Every route is registered in `src/app/routes.tsx` and nowhere else.
- The repo is public. No secrets, no email addresses and no real names in it, in code, tests, fixtures or commit messages. Secrets live in Cloudflare Worker settings and in `.dev.vars`, which git ignores.
- Every `/api` route except the sign-in routes checks the session before doing anything else.
- The Worker reaches D1, R2 and email only through the interfaces in `worker/store.ts` and `worker/mailer.ts`, so tests run with in-memory versions.
- The Worker never reads or changes the backup file's contents. Merging happens on the device.
- No GitHub Actions. The Cloudflare build runs `npm run verify` before every deploy.
- No `window.open`. External links use `<a target="_blank" rel="noopener noreferrer">` and exist only in parent mode.
- Kid screens: tap targets at least 64px, no text-only instructions below grade 1, no timers unless the parent turned the timer on, nothing that moves away before the child answers, no negative sounds.
- Layout: mobile first, flex column, scroll inside panels, never horizontal page scroll. Use `dvh`, not `vh`.
- Every new skill needs: a generator file, a catalogue row, and a pass from the generator test suite.
- Before finishing any phase run the audit in section 13 of the plan.
- The score is called "Skill Score" everywhere in the app. Never show the word SmartScore.
- The main device is an iPad running the app from the Home Screen. Follow the iPad rules in section 3.
- Never change what an existing seed produces without bumping that skill's version and its golden file.
- Day boundaries use `localDay()` from `src/lib/clock.ts`. Never work out a day from a UTC string.
- A `listen` question never shows its target and its options never speak. A `read` question never speaks the words the child must read.
- Saved references are skill ids, never positions in a list.
- Kid navigation replaces history. It never pushes a new entry.
- Dev routes exist only when `import.meta.env.DEV` is true.
- Spoken text is built from `Say` parts. Letters, numbers, times and money are typed parts, never digits or symbols inside a string.
- New fields on a stored record always have a zod default, so old records still load.

## Working rules for every phase

- Do exactly one phase per session. Stop when its gate (plan section 12) passes and report the gate output.
- Run `npm run verify` before saying a phase is done, and paste the result.
- If the gate fails, fix the cause. Never weaken, skip or delete a test.
- Do not add a dependency that is not listed in plan section 3. Ask first.
- No placeholders, no TODO stubs, no mock data in shipped screens.
- Commit at the end of the phase with message "Phase N: <name>".
- Ask the owner in multiple-choice form before deciding anything the plan leaves open. Do not assume.
- A push to `main` deploys the family's live app. Push only when the owner asks.

## Build status

- Step 1, Phase 0 (scaffold), is built.
- Step 2, Phase A (hosting and sign-in), is built: the scaffold gaps, `wrangler.jsonc`, `worker/`, `account.ts`, the SignIn and SetPassword screens and the sign-in guard. Until Phase 3 adds the device record, the app asks the server for the session at every launch, so it does not open offline yet.
- `APP_ORIGIN` is a plain setting next to `ENVIRONMENT`. The Worker compares the `Origin` header of every write against it.
- Local run: copy `.dev.vars.example` to `.dev.vars`, run `npx wrangler d1 execute sprout --local --file worker/schema.sql` once, then `npm run dev:worker` and `npm run dev`. The sign-in code is printed in the Worker's terminal.
- The app is live at `https://sprout.logstocks.com`. Workers Builds is connected to this repo: a push to `main` runs `npm run verify`, then `npx wrangler deploy`.
- Browser tests were brought forward from Phase 4a at the owner's request. `npm run e2e` builds the app, starts the real Worker locally over HTTPS with a throwaway database, and drives every account screen in WebKit (iPad landscape, iPad portrait, phone, 360 px) and Chromium. `npm run e2e:live` runs read-only checks on the live site and never asks for a code. Neither runs in `npm run verify` or in the cloud build. Every new screen and button gets a browser test in the same phase.
- `public/_headers` sets the safety headers for pages and files. A Cloudflare redirect rule, for the Sprout address only, sends plain http to https.
- Step 3, Phase 1 (engine core), is built: `rng`, `seed`, `types`, `check`, `validate`, `canonical`, `describe`, the registry, twelve oracles in `tests/oracles/`, the 300-seed generator and oracle harnesses, golden files, and three reference skills (M-PK-A2, M-K-B3, M-K-C4).
- To change what a skill produces: raise its `version` in `catalogue.ts`, then run `npm run golden`. The golden test refuses a change without a version bump.
- A generator returns a `QuestionDraft`. The registry adds the skill id, level, seed and key.
- M-PK-A2 level 2 uses the `dice` layout. The plan says "grid", but a 5-wide grid of 1 to 5 objects is the same picture as a row.
- Step 4, Phase 2 (scoring and adaptive), is built: `skillscore`, `review`, `recommend` with trouble spots, `diagnostic` with sittings, `merge`, `awards`, `ladders.ts` with all 140 skill ids, and the zod record schemas in `src/storage/schema.ts` (written here because the engine needs the record types; Phase 3 adds the repos).
- Engine code reads dates only through `src/lib/clock.ts` (`localDayOf`, `addDays`, `daysBetween`). A test fails on `new Date` or `Date.now` inside `src/engine` or `src/content`.
- A ladder walk in `DiagnosticProgress` also saves `right` and `wrong` for the skill being tested, so a diagnostic stopped in the middle of a skill resumes exactly.
- `evaluateAwards(states, totals, skills)` takes the catalogue as a third argument.
- Step 5, Phase 3 (storage), is built: the `Repo` interface, `memoryRepo` and `idbRepo` over one shared rule layer (`repoCore.ts` on a plain `Backend`), quarantine, reset, export and import with merge, the persistent-storage request, the error list and the sign-in state in the device record.
- Launch rule: a saved end date that has not passed opens the app with or without a network. One that has passed locks it. If the server says the session is gone, the app stays open for that launch, clears the saved sign-in in the background, and locks at the next launch.
- To add an IndexedDB change: add a new step to `UPGRADES` in `idbRepo.ts`. Never edit a step that has shipped.
- In tests, every test starts with an empty `memoryRepo` (`tests/setup.ts`), and `stubServer()` freezes the app clock to the test server's clock.
- Step 6, Phase 4a (visuals), is built: one drawing component for each `Visual` kind in `src/visuals/`, `VisualView` to draw any of them, pure geometry in `geometry.ts`, the colour list, and the dev-only gallery at `/dev/gallery`.
- `npm run e2e:gallery` draws the gallery in WebKit, checks every picture fits its frame and has a label, and saves `review/gallery.png` (iPad width), and a phone-width copy plus one image for each section under `.e2e/gallery/`. Look at them after any change to a picture.
- A diamond is drawn as a square standing on a corner, so `canonical.ts` treats it as a square turned 45 degrees.
- Clock hands stop short of the numbers. A browser test fails if a hand reaches them.
- Next: step 7, Phase 4b, question types and audio.
