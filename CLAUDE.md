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
- Next: step 3, Phase 1, engine core.
