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
- No secrets in the repo. Supabase keys come from env vars and the app must run without them.
- No `window.open`. External links use `<a target="_blank" rel="noopener noreferrer">` and exist only in parent mode.
- Kid screens: tap targets at least 64px, no text-only instructions below grade 1, no timers, no negative sounds.
- Layout: mobile first, flex column, scroll inside panels, never horizontal page scroll. Use `dvh`, not `vh`.
- Every new skill needs: a generator file, a catalogue row, and a pass from the generator test suite.
- Before finishing any phase run the audit in section 13 of the plan.
- The score is called "Skill Score" everywhere in the app. Never show the word SmartScore.
- The main device is an iPad running the app from the Home Screen. Follow the iPad rules in section 3.
- Never change what an existing seed produces without bumping that skill's version and its golden file.

## Working rules for every phase

- Do exactly one phase per session. Stop when its gate (plan section 12) passes and report the gate output.
- Run `npm run verify` before saying a phase is done, and paste the result.
- If the gate fails, fix the cause. Never weaken, skip or delete a test.
- Do not add a dependency that is not listed in plan section 3. Ask first.
- No placeholders, no TODO stubs, no mock data in shipped screens.
- Commit at the end of the phase with message "Phase N: <name>".

## Build status

- Phase 0 (scaffold) done. Next: Phase 1, engine core.
- Type packages `@types/react`, `@types/react-dom` and `@types/node` are installed beyond the plan's list; strict TypeScript cannot compile without them.
