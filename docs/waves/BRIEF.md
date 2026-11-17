# Plan 15 phase H: how a wave is built

Phase H roughly doubles the skills in each grade, in five waves built side by side (plan section 15.2).
Each wave works in its own copy of the repo and touches only its own files, so the five can be merged.

| Wave | Subject and grades | About |
| --- | --- | --- |
| H1 | Math Kindergarten and Grade 1 | 40 skills (about 20 each) |
| H2 | Math Pre-K and Grade 2 | 35 skills (Pre-K about 16, Grade 2 about 19) |
| H3 | Language Arts Pre-K and Kindergarten | 30 skills (Pre-K about 12, K about 18) |
| H4 | Language Arts Grade 1 and Grade 2 | 30 skills (about 15 each) |
| H5 | Math Grade 3 | 15 skills |

## Read first

- `CLAUDE.md` (all of it: the rules are strict and enforced by tests).
- `docs/PLAN.md` sections 5 (content engine and oracles), 8 (the skill tables of your grades), 9 (word lists) and 15.
- Two existing generator files of your subject and grade, to copy their style exactly, for example
  `src/content/generators/math/g3/measure.ts` and `src/content/generators/ela/g2/words.ts`, and their oracles in `tests/oracles/`.
- `tests/generators.all.test.ts` and `src/engine/validate.ts`: every rule your questions must pass.

## What to build

1. Choose the skills. Fill real gaps a curriculum (Common Core, and what IXL offers) teaches at that grade that the grade
   does not have yet (list the grade's skills from `src/content/catalogue.ts`). No near-duplicates of existing skills.
   Write the table into `docs/waves/<wave>.md` in the plan's format (Code | Skill | Strand | Type | Rule by level), with the
   Common Core code of each. The owner said not to wait for approval: build straight after writing the list.
2. Codes and ids: continue an existing category's numbering (Kindergarten A.7 is followed by A.8: id `M-K-A8`) or add a new
   lettered category after the last one (`H. Money`, ids `M-K-H1`...). Category names follow the grade's style. Ids are unique.
3. Generators in NEW files only: `src/content/generators/<math|ela>/<pk|k|g1|g2|g3>/<wave>-<topic>.ts`. Data lists in new
   files `src/content/data/<wave>-<topic>.ts`. Never edit an existing generator or data file.
4. Register through your wave's files only:
   - `src/content/waves/<wave>/generators.ts`: add each generator to `GENERATORS`.
   - `src/content/waves/<wave>/catalogue.ts`: one row for each skill in `ROWS` (copy the shape of an existing row; version 1).
   - `src/content/waves/<wave>/ladders.ts`: put each skill on the ladder it builds on (`{ ladder, skillId, after }`). Ladders
     never go down a grade. Read `src/content/ladders.ts` for the ids and order.
   - New oracles: name and facts in `src/engine/oracleFacts/<wave>.ts`, the oracle itself in `tests/oracles/waves/<wave>.ts`
     (a new file for a big one is fine, imported there). Reuse existing oracles where they fit. An oracle works out the answer
     from the facts and the lists independently; it never imports a generator.
5. Each skill: usually 3 levels; a lesson of four beats (see, watch, try, remember); an explanation of 1 to 4 short steps with
   a picture; prompt and explanation speech built from `Say` parts (numbers, letters and times as typed parts, never digits or
   symbols in a string). Pre-K and K: no more than 3 options, picture-first, a listen question never shows its target and its
   options never speak; a read question never speaks the words to read. Answer positions spread (validate rule 11). Levels
   with fewer than 8 different questions declare `pool`.
6. Use the existing question types and pictures (`src/engine/types.ts`, `src/visuals/`). New emoji are fine: run
   `npm run art` after adding them. Do not change `src/visuals`, `src/engine`, `src/items` or any screen.
7. Tests: a level-rules test file `tests/content/<wave>.test.ts` (like `tests/content/math3.test.ts`); golden files with
   `npm run golden`; a browser sweep spec `e2e/<wave>.spec.ts` like `e2e/ela2.spec.ts` (written, NOT run: browser tests never
   run on this Mac).

## Do not touch

`src/content/catalogue.ts` (and `CATALOGUE_VERSION`), `src/content/registry.ts`, `src/content/ladders.ts`,
`src/engine/types.ts`, `tests/oracles/index.ts`, `tests/content/ladders.test.ts`, `docs/PLAN.md`, `CLAUDE.md`, any other wave's
files. The ladder-count test and the check-in tests that count ladders will fail in your copy: that is expected, leave them;
they are updated once after the merge. Do not push. Do not run browser tests. Do not deploy.

## Done when

- `npx tsc --noEmit` and `npx eslint . --max-warnings 0` are clean.
- `npx vitest run tests/generators.all.test.ts tests/oracles.test.ts tests/golden.test.ts tests/content tests/oracles tests/visuals`
  passes, except `tests/content/ladders.test.ts`.
- Read `npm run content:dump -- <id prefix>` output for your skills and fix wording a child or parent would trip on.
- One commit on your branch: "Plan 15 wave <H1..H5>: <subject and grades>, <n> skills", stamped
  `ur4sahil <264262893+ur4sahil@users.noreply.github.com>` (`git -c user.name=... -c user.email=... commit`), ending with
  the two lines `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01SgAtviVTR6d5FNyMvDw7Yj`.
- No real people's names, no email addresses anywhere (made-up first names in stories are fine).
