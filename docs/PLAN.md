# Family Learning App Build Plan

Nov 15, 2026

## 1. Scope

This plan builds the whole IXL platform feature set for one family, then fills it with content grade by grade. Working name in this plan: **Sprout**. Rename freely.

### What gets built

| IXL feature | In this build | Phase |
| --- | --- | --- |
| Skills organised by subject, grade and strand | Yes. Math, Language Arts, Reasoning at launch | 6 |
| Skill Score 0 to 100 with stages and a challenge zone (IXL's version is called SmartScore) | Yes, own algorithm with the same feel | 2 |
| Unlimited generated questions | Yes. Every skill is a code generator | 6, 11 |
| Many question types | Eight types, all tap-based | 4 |
| Explanation after a wrong answer | Yes, spoken and visual | 5 |
| Learn with an example | Yes, on every skill, plus a narrated mini-lesson and optional concept videos | 5 |
| Audio for early grades | Yes, every prompt is read aloud | 4 |
| Real-time diagnostic with grade-level estimate | Yes, per strand | 7 |
| Personal recommendations | Yes, "Today's picks" | 2, 5 |
| Awards board and certificates | Yes | 7 |
| Parent analytics: usage, scores, trouble spots, question log | Yes | 8 |
| Skill plans a parent assigns | Yes | 8 |
| Works on phone, tablet, laptop, offline | Yes, installable web app | 9 |
| Sync across devices | Yes, Supabase | 10 |
| Science, social studies, Spanish | Engine supports them. Content comes after version 1 | Roadmap |

### Content at launch

- **Math:** pre-K, kindergarten, grade 1, grade 2 (88 skills).
- **Language Arts:** pre-K, kindergarten, grade 1 (38 skills).
- **Reasoning:** 14 skills in the style of gifted-screening tests.
- Total: 140 skills, each with up to four difficulty levels.

### Three honest limits

1. **IXL has thousands of skills built by a large team over two decades.** No single build matches that. This plan matches the platform, then makes each new skill cheap: one generator file, one catalogue row, automatic tests.
2. **No plan can promise zero bugs on the first run.** What this plan does is stop bugs reaching you. Every phase ends with a pass/fail gate that Claude Code must clear before moving on.
3. **IXL's questions and its exact SmartScore formula are proprietary.** Nothing here copies them. Skill names follow public standards and the scoring is an original design.

### Design decisions that protect the first run

- **Local-first.** The app works fully with no account and no keys. Sync is added last, behind a flag, so nothing blocks on credentials.
- **Deterministic questions.** Every question comes from a skill, a level and a seed number. Tests can replay any question, and the parent log can redraw it exactly.
- **Tap, never drag.** Sorting and matching use tap-then-tap. It suits small hands and needs no drag library.
- **Few dependencies.** Six runtime libraries. No CSS framework, no chart library, no drag library.
- **One build phase per session.** Small steps with a gate each, not one giant prompt.

## 2. How to run this plan in Claude Code

Export this doc as Markdown, save it as `docs/PLAN.md` in a new empty repo, then run one phase per session.

### Setup, once

1. Create an empty GitHub repo, for example `sprout`.
2. Add this plan as `docs/PLAN.md`.
3. Open the repo in Claude Code and paste the kickoff prompt below.

### Kickoff prompt

```text
Read docs/PLAN.md in full before writing anything.

Build Phase 0 only. Follow section 3 for setup and section 12 for the
phase gate. Create CLAUDE.md from the rules in section 2 of the plan.

Rules for every phase:
- Do exactly one phase. Stop when its gate passes and report the gate output.
- Run `npm run verify` before you say a phase is done. Paste the result.
- If the gate fails, fix the cause. Never weaken, skip or delete a test.
- Do not add a dependency that is not listed in section 3. Ask first.
- No placeholders, no TODO stubs, no mock data in shipped screens.
- Commit at the end of the phase with message "Phase N: <name>".
```

### Prompt for each later phase

```text
Read docs/PLAN.md and CLAUDE.md. Run `npm run verify` first and confirm
it passes. Then build Phase N only, to the gate in section 12.
```

### Rules to put in CLAUDE.md

Claude Code reads this file at the start of every session, so these rules hold across phases.

```markdown
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
```

## 3. Stack, setup and file structure

The stack is Vite, React and TypeScript, hosted on Vercel, with Supabase added in Phase 10. It matches your other projects.

### Dependencies

| Package | Purpose | Added in |
| --- | --- | --- |
| `react`, `react-dom` | UI | Phase 0 |
| `react-router-dom` | Routes | Phase 0 |
| `zustand` | App state | Phase 0 |
| `idb` | IndexedDB wrapper for local storage | Phase 3 |
| `zod` | Validates stored data, imports and item banks | Phase 1 |
| `@supabase/supabase-js` | Sync | Phase 10 |
| `vite`, `typescript`, `@vitejs/plugin-react` | Build | Phase 0 |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `fake-indexeddb` | Tests | Phase 0 |
| `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks` | Lint | Phase 0 |
| `@playwright/test` | One browser smoke test | Phase 5 |
| `vite-plugin-pwa` | Installable, offline | Phase 9 |

Version rule: install the current stable release of each on the current Node LTS, commit `package-lock.json`, and do not upgrade during the build.

Deliberately left out: Tailwind, UI kits, chart libraries, drag-and-drop libraries, animation libraries, Khan Academy's Perseus. Section 11 explains the Perseus decision.

### Scripts in package.json

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "typecheck": "tsc --noEmit",
  "lint": "eslint . --max-warnings 0",
  "test": "vitest run",
  "e2e": "playwright test",
  "verify": "npm run typecheck && npm run lint && npm run test && npm run build"
}
```

### Styling

Plain CSS with custom properties in `src/styles/tokens.css`, plus one CSS module per component. No framework. Tokens cover colour, spacing, radius, type scale and the five score-stage colours.

### File structure

```text
sprout/
  CLAUDE.md
  docs/PLAN.md
  index.html
  public/                    icons, manifest
  supabase/migrations/       SQL from section 4 (Phase 10)
  e2e/smoke.spec.ts
  src/
    main.tsx
    app/
      App.tsx
      routes.tsx             the only place routes are declared
      store.ts               zustand store: active child, settings, session
    lib/
      clock.ts               now() wrapper, freezable in tests
      ids.ts                 uuid helper
    engine/                  pure TypeScript, no React, no browser APIs
      rng.ts                 seeded random (mulberry32) + helpers
      types.ts               Question, Visual, Response, Skill types
      check.ts               check(question, response) -> boolean
      validate.ts            invariants every question must satisfy
      skillscore.ts          section 6
      review.ts              spaced review boxes, section 7
      recommend.ts           Today's picks, section 7
      diagnostic.ts          placement staircase, section 7
      awards.ts              award rules
    content/
      catalogue.ts           every Skill row, section 8
      registry.ts            skillId -> generator, built from generators/
      data/                  word lists and emoji sets, section 9
      generators/
        math/pk/*.ts  math/k/*.ts  math/g1/*.ts  math/g2/*.ts
        ela/pk/*.ts   ela/k/*.ts   ela/g1/*.ts
        reasoning/*.ts
      banks/*.json           authored items (reading passages)
    storage/
      repo.ts                Repo interface
      idbRepo.ts             IndexedDB implementation
      memoryRepo.ts          in-memory, used in tests and as fallback
      schema.ts              zod schemas for every stored record
      sync.ts                Supabase sync (Phase 10)
    audio/
      speech.ts              speak(), stop(), voice selection
      sfx.ts                 short tones made with WebAudio, no files
    visuals/                 one component per Visual kind, section 5
    items/                   one component per question type, section 5
    screens/
      kid/                   ProfilePicker, Home, SubjectPage, Practice,
                             LearnExample, SessionSummary, Awards,
                             Diagnostic
      parent/                ParentGate, Dashboard, Scores, TroubleSpots,
                             QuestionLog, Plans, Settings, DataTools
    components/              shared UI: ScoreRing, BigButton, Modal, Bar
    styles/tokens.css
  tests/                     mirrors src/, plus tests/generators.all.test.ts
```

The `engine/` and `content/` folders must not import from React or touch `window`. That keeps all scoring and question logic testable in plain Node.

### Target device: iPad

The main device is an iPad running the app from its Home Screen icon. Phones and laptops must also work, and the iPad decides every trade-off.

| iPad behaviour | Rule for the build |
| --- | --- |
| Safari can clear a site's saved data after about a week without visits, unless the site is installed to the Home Screen | Call `navigator.storage.persist()` on first run. Show an "Add to Home Screen" guide until the app runs standalone. Install and sync are built straight after the kid flow |
| iPads show no automatic install prompt | The guide shows the Share button, then "Add to Home Screen", with pictures |
| A link in an email opens Safari, not the installed app | Sync sign-in uses a typed six-digit code |
| Speech is silent until the first tap | The profile tap speaks first |
| Double-tap zooms and long-press opens a menu | `touch-action: manipulation`, `-webkit-touch-callout: none` and `user-select: none` on kid screens |
| Pulling down reloads the page | `overscroll-behavior: none` on the app shell |
| Browser bars change the screen height | `dvh` units only |
| The screen dims mid-lesson | Request a screen wake lock during practice and lessons, and ignore a refusal |
| Emoji look the same on every Apple device | No picture set needs bundling for version 1 |
| Voices differ by device | Prefer the voices named Samantha, Ava or Allison, then any English (US) voice |

Browser tests run in Playwright's WebKit engine at 1024 by 768, 820 by 1180 and 390 by 844.

### Continuous checks

Add `.github/workflows/verify.yml` in Phase 0. It runs `npm ci` and `npm run verify` on every push and pull request. Wrap the app in one error boundary that shows "Something went wrong" with a button back to the profile picker, and keeps the last 20 errors for the parent data screen.

## 4. Data model

Ten record types hold everything: the seven below and three more under Additions at the end of this section. They live in IndexedDB on the device and, from Phase 10, in matching Supabase tables.

### Records (src/storage/schema.ts)

Define each as a zod schema and infer the TypeScript type from it. All ids are UUID strings made on the device. All times are ISO strings.

```ts
type Grade = 'PK' | 'K' | '1' | '2' | '3' | '4' | '5';

interface ChildSettings {
  gentleScoring: boolean;      // default true for PK and K, false above
  sessionLength: number;       // questions per session: PK 6, K 8, 1+ 10
  speechRate: number;          // 0.7 to 1.1, default 0.85
  autoSpeak: boolean;          // default true for PK, K, 1
  showTimer: boolean;          // default false
  dailyGoalQuestions: number;  // default 15
  allowVideos: boolean;        // default true
  dailyMinutes: number;        // 0 means no limit, default 0
  preReader: boolean;          // default true for PK and K
}

interface Child {
  id: string; name: string; avatar: string;   // avatar = one emoji
  grade: Grade; settings: ChildSettings;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}

interface SkillState {
  childId: string; skillId: string;
  score: number;               // 0..100 integer
  streak: number;              // consecutive correct, resets on a miss
  attempts: number; correct: number;
  recent: boolean[];           // last 10 results, newest last
  masteredAt: string | null;
  placedOut: boolean;          // set by the diagnostic
  reviewBox: number;           // 0..4
  reviewDueAt: string | null;
  lastPracticedAt: string | null;
  updatedAt: string;
}

interface Attempt {
  id: string; childId: string; skillId: string; sessionId: string;
  level: 1 | 2 | 3 | 4; seed: number; itemType: ItemType;
  response: unknown;           // exactly what the child submitted
  contentVersion: number;      // the skill's version when answered
  snapshot: { prompt: string; correct: string; given: string };  // plain-text record that never changes
  correct: boolean; ms: number;
  scoreBefore: number; scoreAfter: number;
  kind: 'practice' | 'review' | 'diagnostic';
  createdAt: string;
}

interface Session {
  id: string; childId: string;
  kind: 'practice' | 'review' | 'diagnostic';
  skillId: string | null; startedAt: string; endedAt: string | null;
  questions: number; correct: number;
}

interface AwardEarned { childId: string; awardId: string; earnedAt: string; }

interface Plan {
  id: string; name: string; skillIds: string[]; childIds: string[];
  createdAt: string; updatedAt: string; deletedAt: string | null;
}

interface DiagnosticResult {
  id: string; childId: string; ladderId: string;
  placementIndex: number;      // index into the strand's skill ladder
  levelEstimate: number;       // e.g. 0.4 = 40% through kindergarten
  takenAt: string;
}
```

### Repo interface (src/storage/repo.ts)

```ts
interface Repo {
  listChildren(): Promise<Child[]>;
  saveChild(c: Child): Promise<void>;
  getSkillStates(childId: string): Promise<SkillState[]>;
  saveSkillState(s: SkillState): Promise<void>;
  addAttempt(a: Attempt): Promise<void>;
  listAttempts(childId: string, opts: { since?: string; skillId?: string; limit?: number }): Promise<Attempt[]>;
  saveSession(s: Session): Promise<void>;
  listSessions(childId: string, since?: string): Promise<Session[]>;
  listAwards(childId: string): Promise<AwardEarned[]>;
  addAward(a: AwardEarned): Promise<void>;
  listPlans(): Promise<Plan[]>;
  savePlan(p: Plan): Promise<void>;
  listDiagnostics(childId: string): Promise<DiagnosticResult[]>;
  saveDiagnostic(d: DiagnosticResult): Promise<void>;
  exportAll(): Promise<ExportFile>;
  importAll(file: ExportFile): Promise<void>;   // validates with zod first
}
```

Rules:

- `idbRepo` opens database `sprout` version 1 with one object store per record type. Attempts are indexed by `childId` and by `[childId, skillId]`.
- If IndexedDB fails to open, the app falls back to `memoryRepo` and shows a banner: "Progress will not be saved on this device."
- Every record read from storage passes through its zod schema. A record that fails is skipped and logged, never crashes a screen.
- First run seeds nothing. The parent creates each child in a two-step setup (name and avatar, then grade). From Phase 7, a child's first visit opens the diagnostic before the home screen, with a "Skip for now" button.

### Supabase schema (Phase 10, supabase/migrations/0001\_init.sql)

```sql
create table children (
  id uuid primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  avatar text not null,
  grade text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table skill_state (
  child_id uuid not null references children(id) on delete cascade,
  skill_id text not null,
  owner uuid not null default auth.uid(),
  score int not null check (score between 0 and 100),
  streak int not null default 0,
  attempts int not null default 0,
  correct int not null default 0,
  recent jsonb not null default '[]'::jsonb,
  mastered_at timestamptz,
  placed_out boolean not null default false,
  review_box int not null default 0,
  review_due_at timestamptz,
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (child_id, skill_id)
);

create table attempts (
  id uuid primary key,
  child_id uuid not null references children(id) on delete cascade,
  owner uuid not null default auth.uid(),
  skill_id text not null,
  session_id uuid not null,
  level int not null,
  seed bigint not null,
  item_type text not null,
  response jsonb,
  content_version int not null default 1,
  snapshot jsonb,
  correct boolean not null,
  ms int not null,
  score_before int not null,
  score_after int not null,
  kind text not null,
  created_at timestamptz not null
);
create index attempts_child_time on attempts (child_id, created_at desc);

create table sessions (
  id uuid primary key,
  child_id uuid not null references children(id) on delete cascade,
  owner uuid not null default auth.uid(),
  kind text not null,
  skill_id text,
  started_at timestamptz not null,
  ended_at timestamptz,
  questions int not null default 0,
  correct int not null default 0
);

create table awards (
  child_id uuid not null references children(id) on delete cascade,
  award_id text not null,
  owner uuid not null default auth.uid(),
  earned_at timestamptz not null,
  primary key (child_id, award_id)
);

create table plans (
  id uuid primary key,
  owner uuid not null default auth.uid(),
  name text not null,
  skill_ids text[] not null default '{}',
  child_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table diagnostic_results (
  id uuid primary key,
  child_id uuid not null references children(id) on delete cascade,
  owner uuid not null default auth.uid(),
  ladder_id text not null,
  placement_index int not null,
  level_estimate numeric not null,
  taken_at timestamptz not null
);

-- Row level security: a signed-in parent sees only their own rows.
do $$
declare t text;
begin
  foreach t in array array['children','skill_state','attempts','sessions',
                           'awards','plans','diagnostic_results',
                           'flags','diagnostic_progress'] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy own_rows on %I for all using (owner = auth.uid()) with check (owner = auth.uid())', t);
  end loop;
end $$;
```

### Sync rules (Phase 10)

- Sign-in is parent email with a six-digit code typed into the app. On an iPad a magic link opens in Safari, not in the installed app, so the sign-in would never reach it. Children never sign in.
- The device is always the source the app reads from. Sync runs in the background on start, on session end, and every 5 minutes while online.
- Attempts, sessions, awards and diagnostics are append-only. Push with upsert on the primary key, so a retry never duplicates.
- Children, plans and skill state use last write wins on `updated_at`.
- Deletes are soft (`deleted_at`) so they sync.
- With no Supabase env vars, the sync module is a no-op and the sign-in button is hidden.

### Additions: flags, diagnostic progress, recorded sounds

```ts
interface Flag {                    // a parent marks a question as wrong or confusing
  id: string; childId: string; attemptId: string;
  skillId: string; level: number; seed: number;
  note: string; createdAt: string; resolvedAt: string | null;
}

interface DiagnosticProgress {      // lets a diagnostic stop and resume
  childId: string; subject: 'math' | 'ela' | 'reasoning';
  ladders: Record<string, { index: number; passed: number[]; failed: number[]; asked: number; done: boolean }>;
  sittings: number; done: boolean; updatedAt: string;
}

interface AudioClip {               // a sound the parent recorded, kept on the device
  key: string;                      // 'letter:a', 'sound:sh', 'number:7'
  blob: Blob; createdAt: string;
}
```

Add to `Repo`: `listFlags`, `saveFlag`, `getDiagnosticProgress`, `saveDiagnosticProgress`, `getClip`, `saveClip`, `listClipKeys`. Flags and diagnostic progress sync. Audio clips stay local in version 1.

```sql
create table flags (
  id uuid primary key,
  child_id uuid not null references children(id) on delete cascade,
  owner uuid not null default auth.uid(),
  attempt_id uuid not null,
  skill_id text not null,
  level int not null,
  seed bigint not null,
  note text not null default '',
  created_at timestamptz not null,
  resolved_at timestamptz
);

create table diagnostic_progress (
  child_id uuid not null references children(id) on delete cascade,
  subject text not null,
  owner uuid not null default auth.uid(),
  ladders jsonb not null default '{}'::jsonb,
  sittings int not null default 0,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (child_id, subject)
);
```

Place both `create table` statements above the row level security block in the migration.

### Versions and changes over time

- **Local database.** `idbRepo` keeps a numbered list of upgrade steps. Opening an older database runs the missing steps in order. A test opens a version 1 fixture with the newest code.
- **Export file.** Every export starts with `{ "format": "sprout-export", "version": 1 }`. Import refuses a newer version with a clear message and upgrades an older one.
- **Skill ids are permanent.** Never rename or reuse one. A retired skill stays in the catalogue with `retired: true` and is hidden from children. Its history stays in parent reports.
- **Skill versions.** Each skill has a `version`. `tests/golden/<skillId>.json` stores the output of `example()` and seeds 1, 2 and 3 at each level. If output changes, the test fails until the version is bumped and the golden file is regenerated on purpose.
- **Old attempts stay true.** Each attempt stores a plain-text `snapshot` of the prompt, the correct answer and the child's answer. The question log redraws the full question only when the attempt's `contentVersion` matches the skill's current version. Otherwise it shows the snapshot.

### Keeping progress safe

- Ask for persistent storage on first run and show the result on the parent data screen.
- Until the app runs from the Home Screen, show a parent-side banner: "Install Sprout so progress is not cleared."
- Until sync is signed in, the parent data screen shows the date of the last export and nudges for a new one every 7 days.

### Your Supabase checklist (Phase 10)

- [ ] Create the project and run `0001_init.sql` in the SQL editor.
- [ ] Authentication, Email: keep email sign-in on, and edit the template so it shows the six-digit code (`{{ .Token }}`), not only a link.
- [ ] Authentication, URL configuration: set the site URL to the Vercel address and add `http://localhost:5173` as a redirect.
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel, then redeploy.
- [ ] Sign in once on each iPad from the parent data screen.

## 5. Question engine

Every question is plain data produced by a pure function of skill, level and seed. Screens only draw that data and report what the child tapped.

### Seeded random (src/engine/rng.ts)

Use mulberry32. Expose `makeRng(seed)` returning `{ int(min, max), pick(arr), shuffle(arr), sample(arr, n), bool(p) }`. `int` is inclusive at both ends. `shuffle` and `sample` return new arrays.

### Visuals

A `Visual` is a small description of a picture. One React component draws each kind. Stimuli, answer options and explanations all use the same set.

| Kind | Fields | Draws |
| --- | --- | --- |
| `emojiGroup` | emoji, count, layout: `row`, `grid5`, `scatter` | Countable objects. `grid5` wraps every 5. `scatter` uses fixed non-overlapping slots |
| `text` | value, size: `m`, `l`, `xl` | A numeral, letter or word |
| `shape` | shape, color, size: `s`, `m`, `l`, rotation | Inline SVG: circle, square, triangle, rectangle, hexagon, star, heart, oval, diamond |
| `solid` | solid: cube, sphere, cone, cylinder | Inline SVG 3D shape |
| `tenFrame` | filled, frames: 1 or 2 | Ten frame with counters |
| `baseTen` | hundreds, tens, ones | Place-value blocks |
| `numberLine` | min, max, step, marked\[\], hidden\[\] | Number line with a point or blanks |
| `equation` | parts: (number, operator or `blank`)\[\] | `3 + □ = 7`, horizontal |
| `sequence` | items: (Visual or `blank`)\[\] | A row with a missing slot, for patterns |
| `matrix` | cells: (Visual or `blank`)\[4\] | 2 by 2 reasoning grid |
| `clock` | hour, minute | Analog clock face |
| `coins` | coins: (`penny`, `nickel`, `dime`, `quarter`)\[\] | Drawn coins with value-neutral faces |
| `graph` | type: `picture` or `bar`, categories: {label, emoji, value}\[\] | Simple graph |
| `ruler` | lengthUnits, object emoji | Object above a ruler |
| `fraction` | shape, parts, shaded | Partitioned circle or rectangle |
| `row` | children: Visual\[\] | Lays visuals side by side |

Rules: every visual scales to its container, has an `aria-label` built from its fields, and never relies on colour alone when colour is not the thing being asked. Every visual may also carry an optional \`speak\` label, read aloud when a non-reader taps it. \`emojiGroup\` takes an optional \`crossed\` count for subtraction pictures.

### Question types

Eight types, all tap-based. IXL's drag-and-drop becomes tap-then-tap.

| Type | Child does | Response shape | Correct when |
| --- | --- | --- | --- |
| `choice` | Taps one of 2 to 4 options | `{ index }` | index equals `answerIndex` |
| `multiSelect` | Taps every option that fits, then Submit | `{ indexes[] }` | set equals `answerIndexes` |
| `tapCount` | Taps that many objects from a group, then Submit | `{ count }` | count equals `answer` |
| `numberPad` | Types a number on an on-screen pad, then Submit | `{ value }` | value equals `answer` |
| `order` | Taps items in order; tap again to undo | `{ order[] }` | order equals `answerOrder` |
| `sort` | Taps an item, then a bin | `{ bins: number[] }` | every item is in its `answerBin` |
| `match` | Taps a left item, then its partner on the right | `{ pairs: [l, r][] }` | pairs equal `answerPairs` |
| `tiles` | Taps letter or word tiles into blanks | `{ tiles: string[] }` | joined tiles equal `answer` |

### Question data (src/engine/types.ts)

```ts
interface QuestionBase {
  skillId: string; level: 1 | 2 | 3 | 4; seed: number;
  key: string;                 // canonical content key, used to avoid repeats
  facts: Record<string, number | string | boolean | number[] | string[]>;  // raw values behind the question
  prompt: { text: string; speak: string };
  stimulus?: Visual;
  explanation: {
    speak: string;             // one or two short sentences
    steps: string[];           // 1 to 4 short lines shown on screen
    visual?: Visual;           // the picture that shows why
  };
}

type Question =
  | QuestionBase & { type: 'choice'; options: Visual[]; answerIndex: number }
  | QuestionBase & { type: 'multiSelect'; options: Visual[]; answerIndexes: number[] }
  | QuestionBase & { type: 'tapCount'; emoji: string; shown: number; answer: number }
  | QuestionBase & { type: 'numberPad'; answer: number; maxDigits: number }
  | QuestionBase & { type: 'order'; items: Visual[]; answerOrder: number[] }
  | QuestionBase & { type: 'sort'; items: Visual[]; bins: { label: string; speak: string; icon?: Visual }[]; answerBin: number[] }
  | QuestionBase & { type: 'match'; left: Visual[]; right: Visual[]; answerPairs: [number, number][] }
  | QuestionBase & { type: 'tiles'; slots: number; bank: string[]; answer: string };
```

### Generator contract (src/content/generators)

```ts
interface SkillGenerator {
  skillId: string;
  maxLevel: 1 | 2 | 3 | 4;
  generate(level: number, rng: Rng): Question;   // pure, no Date, no Math.random
  example(): Question;                            // fixed seed, used by Learn with an example
  lesson(): LessonStep[];                         // four beats, section 8
  oracle: OracleId;                               // independent answer check, see Facts and oracles
}
```

`registry.ts` exposes `nextQuestion(skillId, level, seed, recentKeys)`. It clamps level to `maxLevel`, generates, and if the question's `key` is in `recentKeys` (the last 6 for that child and skill) it retries with `seed + 1`, up to 20 times.

### Invariants (src/engine/validate.ts)

`validateQuestion(q)` returns a list of problems. An empty list means valid. The generator test suite runs it over every skill, every level, 300 seeds.

1. `prompt.speak` and `explanation.speak` are non-empty and contain no symbols a voice would misread (`+`, `=`, `□`, `<`, `>`). Write "plus", "equals", "blank".
2. No field is `undefined`, `NaN` or an empty array.
3. `choice`: 2 to 4 options, all visually distinct (compare canonical JSON), `answerIndex` in range. Exactly one option is correct by the skill's own rule.
4. `multiSelect`: 1 or more correct, at least 1 incorrect.
5. `tapCount`: `1 <= answer <= shown <= 12`.
6. `numberPad`: answer is a non-negative integer that fits `maxDigits`.
7. `order`, `sort`, `match`: answers cover every item exactly once. `sort` uses every bin at least once.
8. `tiles`: the answer can be built from the bank, and the bank holds at least 2 tiles that are not needed.
9. Same skill, level and seed always produce a deeply equal question.
10. Across 300 seeds each level yields at least 8 distinct `key` values, or the skill declares a smaller finite set in the catalogue.
11. The position of the correct option is spread out: over 300 seeds no single index holds more than 45% of answers.
12. Pre-K and kindergarten questions use at most 3 options. Grade 1 and above use up to 4.

### Distractor rules

Wrong options must be plausible mistakes, not random noise.

- **Counting:** answer plus or minus 1, then plus or minus 2, kept inside the skill's range and above zero.
- **Addition and subtraction:** off by one, the other operation's result, and one operand repeated.
- **Comparing:** groups never tie unless the skill teaches "equal". For "more" at level 1 the gap is at least 3, at level 3 the gap is 1.
- **Patterns:** offer the other elements of the same pattern. Never offer an option that could also continue the pattern.
- **Letters:** prefer look-alikes (b d p q, m n, u v, E F, O Q) from level 2 up.
- **Shapes and colours:** when the question is about shape, all options share one colour. When it is about colour, all share one shape.
- **Words:** distractors come from the same list and differ in the feature being tested.

### Authored item banks (src/content/banks)

Some skills cannot be generated, such as reading a short passage. Those live in JSON files as arrays of `Question` objects without `seed`. A bank skill's generator picks one by `rng`. Banks are validated by the same `validateQuestion` at test time.

### More visuals the catalogue needs

These complete the visual set. Build them in Phase 4a with the rest.

| Kind or field | Fields | Draws |
| --- | --- | --- |
| `bar` | length in units, color | A horizontal or vertical bar, for comparing and ordering lengths |
| `array` | rows, cols, emoji | Objects in equal rows, for repeated addition |
| `tally` | count | Tally marks in bundles of five |
| `foldPunch` | fold: `vertical` or `horizontal`, hole: {col, row} on a 4 by 4 grid, state: `folded` or `unfolded` | A paper square, folded with one punched hole, or unfolded with its holes |
| `emojiGroup.layout` | adds `dice` | Dot positions as on a die, 1 to 6 |
| `emojiGroup.numbered` | boolean | A small count under each object, used in explanations |
| `shape.shape` | adds `arrow`, `lShape`, `flag` | Shapes with no symmetry, so turns and flips are visible |
| `shape.flip` | boolean | Mirrors the shape left to right |
| `matrix.cells` | 4 or 9 cells | A 3 by 3 grid for pattern completion |

Coins are drawn as SVG with their true relative sizes and colours: a copper penny, then nickel, dime and quarter in silver, with the dime smallest. Each shows the words real coins carry: ONE CENT, FIVE CENTS, ONE DIME, QUARTER DOLLAR. No portraits.

### Facts and oracles

Structure checks cannot tell whether the marked answer is true. Oracles do that.

- Every question carries `facts`: the raw values the generator chose, such as `{ a: 3, b: 4 }`.
- Every skill names an `oracle`. An oracle is a small function in `tests/oracles/` that works out the right answer from `facts` alone.
- Oracles are written in Phase 1, before any content, and generators must never import them. Two separate pieces of code then have to agree.
- `tests/oracles.test.ts` runs every skill, level and 300 seeds. It fails if the marked answer differs from the oracle's, or if any wrong option equals the oracle's answer.

| Oracle | Facts it needs | Right answer |
| --- | --- | --- |
| `count` | n | n |
| `add`, `subtract` | a, b, and c for three addends | a plus b (plus c), or a minus b |
| `missing` | a, b, total, blank | The value that makes a plus b equal total |
| `compare` | values, ask: `most`, `least` or `equal` | Index of the greatest or least, or whether all are equal |
| `order` | values | Indexes sorted smallest to largest |
| `sequence` | start, step, length, blankIndex | start plus step times blankIndex |
| `pattern` | unit, shown | unit at position shown modulo unit length |
| `place` | hundreds, tens, ones, ask | The number, or the digit or value asked for |
| `time` | hour, minute | The time as text |
| `money` | cents | Sum of cents, or the coin name |
| `graph` | values, ask | The value, the largest, the smallest, or the difference |
| `fraction` | parts, equal | Name of the fraction, or whether parts are equal |
| `attribute` | target, optionAttrs | Index of the option whose attribute equals the target |
| `wordSet` | target, relation: `firstSound`, `rhyme`, `family`, `category`, `syllables` | Looked up in the section 9 lists |
| `spell` | word | The word's letters in order |
| `analogy` | from, to, base | base with the same attribute change applied |
| `matrix` | rowAttrs, colAttrs, blank | The cell that fits its row and column |
| `truth` | left, right | Whether the two sides are equal |
| `authored` | none | Skipped by the oracle test. Covered by the review sheet only |

Add this as invariant 13: `facts` is present and holds every key its oracle needs.

### Content review sheet

Tests cannot judge whether a question reads well to a child. A review sheet lets a person do that quickly.

- `npm run content:dump -- <batch>` writes `review/<batch>.md`. For each skill and level it prints 3 sample questions as plain text: the prompt, each option's label, the right answer and the explanation.
- At the end of every content phase Claude Code reads its own dump against the templates in section 8 and reports anything doubtful.
- You skim the same file. Ten minutes covers a batch.
- A dev-only route `/dev/review/:skillId` shows the same samples drawn with the real components.

## 6. Skill Score

The score runs 0 to 100, rises quickly at first, slows near the top, and needs five correct answers in a row to finish. That mirrors how IXL's score feels. The numbers are an original design.

### Stages

| Score | Stage | Question level | Shown as |
| --- | --- | --- | --- |
| 0, never tried | Not started | 1 | Grey ring |
| 0 to 39 | Getting started | 1 | Blue ring |
| 40 to 69 | Practising | 2 | Blue ring |
| 70 to 79 | Practising | 3 | Blue ring |
| 80 to 89 | Proficient | 3 | Green ring, ribbon |
| 90 to 99 | Challenge zone | 4 | Gold ring, flame |
| 100 | Mastered | 4 | Gold medal |

### Rules (src/engine/skillscore.ts)

`applyAnswer(state, correct, gentle)` is a pure function that returns the new score, streak and mastered flag.

| Score before | Gain when correct | Loss when wrong | Loss in gentle mode |
| --- | --- | --- | --- |
| 0 to 29 | 10 | 2 | 1 |
| 30 to 49 | 8 | 4 | 2 |
| 50 to 69 | 6 | 6 | 3 |
| 70 to 79 | 5 | 7 | 4 |
| 80 to 89 | 4 | 8 | 4 |
| 90 to 99 | 2 | 8 | 4 |

1. **Streak bonus.** Below 90, add `min(3, max(0, streakBefore - 1))` to the gain. No bonus in the challenge zone.
2. **Challenge gate.** A gain from below 90 can never land above 90. The child enters the challenge zone at exactly 90.
3. **Bounds.** The score never goes below 0 or above 100.
4. **Streak.** A correct answer adds 1. A wrong answer resets it to 0.
5. **Mastery.** Reaching 100 sets `masteredAt` and schedules the first review. After that, extra practice never lowers the score. Only a failed review does (section 7).
6. **After a miss.** The next single question is one level easier, minimum level 1.
7. **Gentle mode** is on by default for pre-K and kindergarten profiles. A parent can switch it per child.

A child who answers everything correctly from zero masters a skill in 15 questions. A typical run is 20 to 30.

### Required unit tests

| Score, streak before | Answer | Mode | Score, streak after |
| --- | --- | --- | --- |
| 0, 0 | correct | any | 10, 1 |
| 10, 1 | correct | any | 20, 2 |
| 20, 2 | correct | any | 31, 3 |
| 31, 3 | correct | any | 41, 4 |
| 41, 4 | correct | any | 52, 5 |
| 86, 6 | correct | any | 90, 7 |
| 92, 5 | correct | any | 94, 6 |
| 98, 3 | correct | any | 100, 4, mastered |
| 85, 4 | wrong | standard | 77, 0 |
| 85, 4 | wrong | gentle | 81, 0 |
| 93, 2 | wrong | gentle | 89, 0 |
| 1, 0 | wrong | standard | 0, 0 |
| 100 mastered, 2 | wrong | standard | 100, 0 |

Also test: fifteen correct answers in a row from 0 reach exactly 100, and no sequence of 1,000 random answers ever leaves the 0 to 100 range.

## 7. Adaptive layer

Four pure modules decide what a child sees next: the diagnostic places them, recommendations pick three skills a day, review brings mastered skills back, and trouble spots flag where they are stuck.

### Open access, like IXL

Every skill is open to every child at all times. Nothing is locked. Prerequisites exist only to steer recommendations.

### Diagnostic (src/engine/diagnostic.ts)

A ladder is a chain of skills that build on each other across grades. The ladders are listed at the end of this section. The diagnostic walks one ladder at a time.

1. Start at the first skill of the child's grade on that ladder, or at the last placement if one exists.
2. Ask 2 questions from the current skill at level 2.
3. Both correct: mark the skill passed and move up 2 skills. Both wrong: mark it failed and move down 2. One of each: ask a third and let the majority decide, then move 1.
4. Stop the ladder when the lowest failed skill sits directly above the highest passed skill, or after 12 questions (8 for pre-K), or when the walk hits either end of the ladder twice.
5. Placement is the skill after the highest pass, or the first skill if nothing passed.

Effects:

- Skills below the placement with a score under 80 are set to 80 and flagged `placedOut`. An existing higher score is never lowered.
- The level estimate is the grade plus the fraction of that grade's ladder skills below the placement. Show it as "Kindergarten, 40% through".
- A large "I don't know yet" button counts as wrong and keeps a child from guessing.
- A child can stop at any point. Progress is saved after every answer, so a stopped diagnostic picks up where it left off.
- Diagnostic answers are logged with kind `diagnostic` and never change a Skill Score directly.

### Today's picks (src/engine/recommend.ts)

`recommend(input)` returns up to 3 picks, each with a reason. Fill the list in this order:

| Priority | Reason | Rule |
| --- | --- | --- |
| 1 | `review` | A mastered skill whose `reviewDueAt` has passed. At most one pick |
| 2 | `plan` | The first unmastered skill in a plan assigned to this child |
| 3 | `troubleSpot` | A flagged skill. If any prerequisite is under 70, pick that prerequisite instead |
| 4 | `continue` | A skill scored 1 to 99 and practised in the last 14 days. Highest score first |
| 5 | `next` | The placement skill of each strand, or the first unmastered skill of the child's grade |

Variety rules: the three picks cover at least two strands when possible, never repeat a skill, and never lead with the skill from the child's last session.

### Trouble spots

A skill is flagged when it has 5 or more attempts in the last 14 days, fewer than 6 of the last 10 answers correct, and a score under 80.

### Spaced review (src/engine/review.ts)

- Intervals by box: 2, 5, 12, 30, 60 days.
- Mastering a skill puts it in box 0, due in 2 days.
- A review asks 3 questions at level 3. A review session covers up to 4 due skills.
- 3 correct: move up one box. 2 correct: stay in the box. Either way the next due date is today plus that box's interval.
- 0 or 1 correct: the skill drops to a score of 85, loses its medal and returns to normal practice.

Every attempt is logged with a timestamp, so a research-grade scheduler such as FSRS, or Bayesian knowledge tracing, can replace these rules later without losing history.

### Ladders

A ladder holds only skills that truly build on each other. Telling time and counting coins both sit in measurement, yet neither prepares a child for the other, so they are separate ladders. Skills run in the order listed.

| Subject | Ladder | Skills, in order |
| --- | --- | --- |
| Math | counting | Pre-K A.1 to A.8, K A.1 to A.7, grade 1 A.1 to A.2, grade 2 A.4 |
| Math | comparing | Pre-K B.1 to B.2, K B.1 to B.3, grade 1 A.4, grade 2 A.3 |
| Math | add-subtract | K C.1 to C.11, grade 1 B.1 to B.10, grade 2 B.1 to B.10 |
| Math | place-value | K D.1, grade 1 A.3 and A.5, grade 2 A.1, A.2, A.6 |
| Math | shapes | Pre-K C.1 to C.2, K E.1 to E.3, grade 1 D.2, grade 2 D.1 |
| Math | length | Pre-K C.3, K F.1, grade 1 C.2, grade 2 C.3 |
| Math | patterns | Pre-K D.1 to D.3, K G.1, grade 1 E.1, grade 2 A.5 |
| Math | data | K F.2, grade 1 C.3, grade 2 C.4 |
| Math | time | Grade 1 C.1, grade 2 C.1 |
| Math | money | Grade 1 C.4, grade 2 C.2 |
| Math | fractions | Grade 1 D.1, grade 2 D.2 |
| Language Arts | letters | Pre-K A.1 to A.5, K A.1 to A.2 |
| Language Arts | sounds | Pre-K B.1 to B.3, K B.1 to B.3, K B.6 |
| Language Arts | phonics | K B.4, B.5, B.7, grade 1 A.1 to A.5 |
| Language Arts | sight-words | K C.1 to C.3, grade 1 B.1 |
| Language Arts | grammar | K D.1 to D.3, grade 1 C.1 to C.3 |
| Language Arts | vocabulary | Pre-K C.1 to C.2, grade 1 B.2 to B.3 |
| Language Arts | reading | K E.1, grade 1 D.1 |
| Reasoning | figures | A.1 to A.7, A.12, A.13 |
| Reasoning | words-numbers | A.9, A.14, A.8, A.10, A.11 |

The diagnostic walks only ladders with 4 or more skills. On shorter ladders the child simply starts at their grade's skill.

### Short sittings

A full diagnostic is far too long for one go, so it runs as short sittings over several days.

- One sitting covers one subject and ends at 12 questions for pre-K, 16 for kindergarten, 20 above that, or after 8 minutes, whichever comes first.
- A sitting works through 2 or 3 ladders, then stops with a sticker.
- The first visit opens sitting 1 in math. After that the home screen offers at most one "check-in" sitting a day until every ladder is placed.
- Picks work from the first day. Ladders not yet placed start at the child's grade.
- A parent can restart the diagnostic for one subject from settings.

## 8. Skill catalogue

The launch catalogue holds 140 skills, organised the way IXL organises them: subject, grade, lettered category, numbered skill.

### Catalogue row (src/content/catalogue.ts)

```ts
interface Skill {
  id: string;          // 'M-K-C4' = Math, Kindergarten, category C, skill 4
  subject: 'math' | 'ela' | 'reasoning';
  grade: Grade;
  category: string;    // 'C. Addition'
  code: string;        // 'C.4', shown to the child and parent
  name: string;        // 'Add to 10'
  strand: string;      // reporting group
  ladder: string;      // diagnostic ladder, section 7
  icon: Visual;        // picture tile for children who cannot read yet
  speakName: string;   // short spoken name, e.g. 'Count to five'
  version: number;     // starts at 1; bump when any seed's output changes
  itemTypes: ItemType[];
  maxLevel: 1 | 2 | 3 | 4;
  prereqs: string[];   // skill ids
  ccss?: string;       // Common Core code where one applies
  vaSol?: string;      // Virginia SOL code, filled in a later content pass
  video?: { youtubeId: string; title: string; source: string };  // curated in Phase 12
}
```

Standards note: Virginia does not use Common Core. It uses its own Standards of Learning, revised in 2023, with strands NS, CE, MG, PS and PFA. The build ships with Common Core codes because they are stable and well documented. Mapping each skill to a Virginia code from the VDOE documents is a content task after Phase 11.

### How to read the tables

- **Type** is the question type from section 5. Two types means lower levels use the first and upper levels the second.
- **Rule** gives the levels in order, separated by slashes. A skill with fewer than four levels stops early.
- Default prerequisite: each skill depends on the one before it in its category, unless the rule names another.
- Strands: CC counting, OA operations, NBT place value, MD measurement and data, G geometry, PA patterns.
- Spoken prompts are written out in words. The on-screen prompt is the same sentence.

### Math, pre-K (16 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Count to 3 | CC | choice | 1 to 3 objects in a row / scattered |
| A.2 | Count to 5 | CC | choice | 1 to 5 in a row / grid / scattered |
| A.3 | Count to 10 | CC | choice | 4 to 7 in a row / 6 to 10 in rows of five / scattered to 10 |
| A.4 | Tap that many | CC | tapCount | "Tap 2 apples": answer 1 to 3 of 6 shown / 1 to 5 of 8 / 4 to 8 of 10 |
| A.5 | Find the number, 1 to 5 | CC | choice | Hear a number, tap the numeral: 2 options / 3 options |
| A.6 | Find the number, 1 to 10 | CC | choice | 3 options far apart / neighbours / includes 6 and 9 |
| A.7 | Match numbers to groups | CC | match | 3 pairs within 1 to 5 / within 1 to 10 |
| A.8 | Dot cards | CC | choice | Dice patterns 1 to 4 / 1 to 6 / two-colour dots to 6 |
| B.1 | Which has more | CC | choice | Two groups, gap of 3 or more / gap 2 / gap 1, up to 10 |
| B.2 | Which has fewer | CC | choice | Same as B.1, asking for fewer |
| C.1 | Find the shape | G | choice | Circle, square, triangle / adds rectangle, star, heart / mixed sizes and turns |
| C.2 | Find the colour | G | choice | Red, blue, yellow / adds green, orange, purple / adds pink, brown, black |
| C.3 | Big and small | MD | choice | Big or small, 2 options / biggest or smallest of 3 / tall, short, long |
| D.1 | Which one is different | PA | choice | Two alike and one different by colour / by shape / by size |
| D.2 | What comes next: AB patterns | PA | choice | AB by colour / by shape / by picture |
| D.3 | Sort into two groups | PA | sort | 4 items by colour / by shape / 6 items by size |

### Math, kindergarten (28 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Count to 20 | CC | choice, numberPad | 6 to 12 in rows of five / 11 to 20 / type the count / scattered to 20, typed |
| A.2 | Ten frames to 10 | CC | choice, numberPad | 1 to 5 / 6 to 10 / typed |
| A.3 | Ten frames to 20 | NBT | choice, numberPad | 11 to 15 / 11 to 20 / typed |
| A.4 | What comes next | CC | choice, numberPad | To 10 / to 20 / to 50 / to 100, typed |
| A.5 | Before and after | CC | choice | After, to 10 / before, to 10 / either, to 20 / either, to 100 |
| A.6 | Missing number | CC | choice, numberPad | Row of 4, blank at end, to 10 / blank anywhere, to 20 / to 50 / typed, to 100 |
| A.7 | Count by tens | CC | choice | Next ten to 50 / to 100 / missing ten anywhere |
| B.1 | More, fewer or equal | CC | choice | Two groups to 5 / to 10 / includes equal groups |
| B.2 | Compare numbers | CC | choice | "Which is greater" to 5 / to 10 / greater or less to 20 |
| B.3 | Put numbers in order | CC | order | 3 numbers to 5 / 3 numbers to 10 / 4 numbers to 20 |
| C.1 | Add with pictures to 5 | OA | choice | Two picture groups, sums to 3 / to 5 |
| C.2 | Add to 5 | OA | choice, numberPad | Equation, sums to 5 / with zero / typed |
| C.3 | Add with pictures to 10 | OA | choice | Sums 4 to 7 / 6 to 10 |
| C.4 | Add to 10 | OA | choice, numberPad | Sums to 7 / to 10 / typed / missing sum on the left |
| C.5 | Subtract with pictures to 5 | OA | choice | Crossed-out pictures, start 2 to 3 / start 4 to 5 |
| C.6 | Subtract to 5 | OA | choice, numberPad | Equation within 5 / with zero / typed |
| C.7 | Subtract to 10 | OA | choice, numberPad | Within 7 / within 10 / typed |
| C.8 | Make 10 | OA | choice, numberPad | Ten frame with 5 to 9 filled / 1 to 9 filled / equation only, typed |
| C.9 | Break apart numbers | OA | choice | 5 is 2 and blank, totals to 5 / to 8 / to 10 |
| C.10 | Addition stories | OA | choice, numberPad | Spoken story with pictures, sums to 5 / to 10 / no pictures, typed |
| C.11 | Subtraction stories | OA | choice, numberPad | Within 5 / within 10 / no pictures, typed |
| D.1 | Teen numbers | NBT | choice | Ten frame plus ones to numeral / 10 plus 4 equals blank / 16 is 10 and blank |
| E.1 | Name flat shapes | G | choice | Hear a name, tap the shape: 3 basic / adds hexagon, oval, diamond / turned shapes |
| E.2 | Name solid shapes | G | choice | Cube and sphere / adds cone and cylinder / flat or solid |
| E.3 | Sides and corners | G | choice, numberPad | Count sides of triangle, square / adds rectangle, hexagon / count corners, typed |
| F.1 | Compare length and height | MD | choice | Longer of 2 bars / shorter or taller of 2 / longest or shortest of 3 |
| F.2 | Sort and count | MD | sort, choice | Sort 5 items into 2 groups / 6 items / then "which group has more" |
| G.1 | Patterns: AAB, ABB, ABC | PA | choice | ABB or AAB / ABC / blank in the middle |

### Math, grade 1 (22 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Count to 120 | CC | choice, numberPad | Next number to 50 / to 100 / across 100, typed / before and after to 120 |
| A.2 | Skip count by 2s, 5s, 10s | CC | choice, numberPad | By 10s / by 5s / by 2s / missing number anywhere, typed |
| A.3 | Tens and ones | NBT | choice, numberPad | Blocks to numeral, to 30 / to 99 / typed / "how many tens in 47" |
| A.4 | Compare two-digit numbers | NBT | choice | Greater of two, different tens / same tens / pick the sign: greater, less, equal |
| A.5 | Ten more, ten less | NBT | choice, numberPad | Ten more / ten less / typed, either |
| B.1 | Add within 20 | OA | choice, numberPad | Sums to 12 / to 20 / typed |
| B.2 | Subtract within 20 | OA | choice, numberPad | From 12 or less / from 20 or less / typed |
| B.3 | Doubles and near doubles | OA | choice, numberPad | Doubles to 5 plus 5 / to 10 plus 10 / near doubles, typed |
| B.4 | Make ten to add | OA | choice | Two ten frames, 9 plus n / 8 plus n / 7 plus n, pick the matching ten-and-some |
| B.5 | Missing number in an equation | OA | choice, numberPad | 3 plus blank equals 7, to 10 / to 20 / subtraction blanks, typed |
| B.6 | True or false equations | OA | choice | 4 plus 1 equals 5 / 3 plus 2 equals 2 plus 3 / mixed operations to 20 |
| B.7 | Add three numbers | OA | choice, numberPad | Sums to 10 / to 20 with a ten pair / typed |
| B.8 | Add two-digit and one-digit | NBT | choice, numberPad | No regrouping / regrouping / typed |
| B.9 | Add and subtract tens | NBT | choice, numberPad | 30 plus 20 / 70 minus 40 / 34 plus 20, typed |
| B.10 | Word problems within 20 | OA | choice, numberPad | Add to / take from / compare, typed |
| C.1 | Tell time: hour and half hour | MD | choice | Hours / half hours / match a clock to a written time |
| C.2 | Order by length | MD | order | 3 bars / 4 bars / 4 bars with close lengths |
| C.3 | Picture graphs | MD | choice, numberPad | Read one category / most or least / how many more, typed |
| C.4 | Coins | MD | choice | Name penny, nickel, dime, quarter / value of one coin / which coin is worth more |
| D.1 | Halves and fourths | G | choice | Equal or not equal parts / pick the shape showing halves / halves or fourths |
| D.2 | Shape attributes | G | choice, multiSelect | Pick the shape with 4 sides / pick all with 3 corners / closed or open shapes |
| E.1 | Number patterns | PA | choice, numberPad | Plus 1 and plus 2 rows / plus 5, plus 10 / minus patterns, typed |

### Math, grade 2 (22 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Hundreds, tens, ones | NBT | choice, numberPad | Blocks to numeral to 199 / to 999 / typed / value of a digit |
| A.2 | Expanded form | NBT | choice, numberPad | 300 plus 40 plus 2 to numeral / numeral to expanded / with zeros, typed |
| A.3 | Compare three-digit numbers | NBT | choice | Different hundreds / same hundreds / pick the sign |
| A.4 | Skip count by 5s, 10s, 100s | NBT | choice, numberPad | By 100s / by 10s from any number / by 5s, typed |
| A.5 | Even and odd | OA | choice, sort | Pairs of objects to 10 / numerals to 20 / sort numerals to 100 |
| A.6 | Number lines to 100 | NBT | choice, numberPad | Marked point, steps of 10 / steps of 5 / steps of 1, typed |
| B.1 | Add within 100, no regrouping | NBT | choice, numberPad | Two-digit plus one-digit / two-digit plus two-digit / typed |
| B.2 | Add within 100, regrouping | NBT | choice, numberPad | Plus one-digit / plus two-digit / typed |
| B.3 | Subtract within 100, no regrouping | NBT | choice, numberPad | Minus one-digit / minus two-digit / typed |
| B.4 | Subtract within 100, regrouping | NBT | choice, numberPad | Minus one-digit / minus two-digit / typed |
| B.5 | Add within 1,000 | NBT | choice, numberPad | Plus hundreds / no regrouping / one regroup, typed |
| B.6 | Subtract within 1,000 | NBT | choice, numberPad | Minus hundreds / no regrouping / one regroup, typed |
| B.7 | Add or subtract 10 or 100 | NBT | choice, numberPad | Plus or minus 10 / plus or minus 100 / across a hundred, typed |
| B.8 | Arrays and repeated addition | OA | choice, numberPad | Count an array to 3 by 3 / match array to 3 plus 3 plus 3 / to 5 by 5, typed |
| B.9 | One-step word problems to 100 | OA | choice, numberPad | Add / subtract / compare, typed |
| B.10 | Two-step word problems | OA | numberPad | Add then add / add then subtract |
| C.1 | Time to five minutes | MD | choice | Quarter hours / five-minute marks / match clock to time |
| C.2 | Count coins | MD | choice, numberPad | Same coins / two kinds / three kinds, typed in cents |
| C.3 | Measure with a ruler | MD | choice, numberPad | Whole units from zero / typed / object not starting at zero |
| C.4 | Bar graphs | MD | choice, numberPad | Read a bar / most and least / how many more, typed |
| D.1 | Name shapes by sides | G | choice | Triangle, quadrilateral / pentagon, hexagon / pick by number of angles |
| D.2 | Halves, thirds, fourths | G | choice | Name the fraction shown / pick the shape showing thirds / equal shares of different shapes |

### Language Arts, pre-K (10 skills)

Strands: LT letters, PH sounds and phonics, WD words, GR grammar, RD reading.

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Find the uppercase letter | LT | choice | Hear a letter name, 2 options / 3 options / look-alike letters |
| A.2 | Find the lowercase letter | LT | choice | 2 options / 3 options / look-alikes: b d p q |
| A.3 | Match uppercase and lowercase | LT | match | 3 pairs, different shapes (A a, B b) / 3 pairs with look-alikes |
| A.4 | Find the same letter | LT | choice | See a letter, tap its twin: 2 options / 3 options / look-alikes |
| A.5 | Letter or number | LT | sort | 4 items / 6 items |
| B.1 | Starts with the same sound | PH | choice | "Which one starts like ball?" 2 spoken pictures / 3 pictures |
| B.2 | Rhymes | PH | choice | "Which one rhymes with cat?" 2 spoken pictures / 3 pictures |
| B.3 | Count syllables | PH | choice | Spoken word, 1 or 2 claps / 1 to 3 claps |
| C.1 | Word groups | WD | choice | "Which one is an animal?" 2 pictures / 3 pictures / mixed groups |
| C.2 | Opposites | WD | choice | Spoken pairs with pictures: big and small / hot and cold / day and night and more |

### Language Arts, kindergarten (16 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | ABC order | LT | choice, tiles | Next letter, A to G / whole alphabet / letter before / fill a row of 4 |
| A.2 | Uppercase and lowercase, all letters | LT | match | 4 pairs / 4 pairs with look-alikes |
| B.1 | First letter of a word | PH | choice | Picture and spoken word, pick its first letter: 3 options / look-alikes |
| B.2 | Last letter of a word | PH | choice | Same, last letter, short words only |
| B.3 | Middle vowel | PH | choice | Picture, spoken word and c\_t: pick from 3 vowels / all 5 vowels |
| B.4 | Read a word, pick the picture | PH | choice | Short a words / all short vowels / words that differ by one letter |
| B.5 | Spell a word | PH | tiles | Picture and spoken word: 3 tiles in order plus 2 extra / plus 4 extra |
| B.6 | Rhyming words | PH | choice | Written words: which rhymes with cat / pick the one that does not rhyme |
| B.7 | Word families | PH | sort | Sort 4 words into two families / 6 words |
| C.1 | Sight words, set 1 | WD | choice | Hear a word, tap it: 3 options very different / similar length / same first letter |
| C.2 | Sight words, set 2 | WD | choice | Same rule as C.1 |
| C.3 | Sight words, set 3 | WD | choice, tiles | Same as C.1 / spell it with tiles |
| D.1 | Capitals and periods | GR | choice | Pick the correct sentence: capital / period / both |
| D.2 | Naming words | GR | sort | Sort pictures with words into people, animals, things: 4 items / 6 items |
| D.3 | One and more than one | GR | choice | Picture of one or many, pick cat or cats / written only |
| E.1 | Read a sentence | RD | choice | Short sentence, pick the matching picture: 2 options / 3 options |

### Language Arts, grade 1 (12 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Digraphs: sh, ch, th, wh | PH | choice | Picture and word with a blank, pick the digraph: at the start / at the end |
| A.2 | Consonant blends | PH | choice, tiles | Pick the starting blend / pick the ending blend / spell with tiles |
| A.3 | Silent e | PH | choice | cap or cape for a picture / pick the long-vowel word / read and match |
| A.4 | Vowel teams | PH | choice | ai, ee, oa words to pictures / pick the missing team |
| A.5 | Short or long vowel | PH | sort | Sort 4 words / 6 words |
| B.1 | Sight words, set 4 | WD | choice, tiles | Hear and tap / spell with tiles |
| B.2 | Compound words | WD | match | Match 3 pairs of halves / 4 pairs |
| B.3 | Opposites and same meanings | WD | choice | Opposites / same meaning / mixed |
| C.1 | Naming and action words | GR | sort | Sort 4 words into nouns and verbs / 6 words |
| C.2 | Describing words | GR | choice | Pick the describing word in a short sentence / pick one that fits a picture |
| C.3 | End marks | GR | choice | Period or question mark / adds exclamation mark |
| D.1 | Read a short story | RD | choice | Authored bank: 3-sentence story, who or what question / why question |

### Reasoning (14 skills, all grades)

These follow the figure-based style of gifted-screening tests. All share the strand RS and use the `shape`, `sequence` and `matrix` visuals.

| Code | Skill | Type | Rule by level |
| --- | --- | --- | --- |
| A.1 | Odd one out | choice | 3 pictures, one from another group / 4 pictures / 4 shapes differing by one attribute |
| A.2 | Which belongs | choice | Two examples from a group, pick a third / closer distractors |
| A.3 | Figure analogies | choice | Big red circle is to small red circle as big blue square is to blank: one attribute changes / two change |
| A.4 | Figure matrices | choice | 2 by 2 grid, rows share shape and columns share colour / size and count / rotation |
| A.5 | Turning shapes | choice | Next quarter turn of an arrow / of an L shape / skipping a turn |
| A.6 | Mirror images | choice | Pick the flip of a simple shape / of an L or flag shape |
| A.7 | Two-rule patterns | choice | Colour and size alternate on different beats / colour and shape |
| A.8 | Number analogies | choice, numberPad | 2 is to 4 as 3 is to blank: plus n / doubles / typed |

### Adding skills later

Grades 3 to 5 and new subjects need no engine changes. Each new skill is one catalogue row plus one generator file, and the generator suite tests it automatically. Add them in batches of about 20 with the Phase 11 gate.

### More reasoning skills

Six more skills round out the reasoning set to cover picture, number and spatial question styles. Reasoning questions use 3 options at levels 1 and 2 and 4 options above that.

| Code | Skill | Type | Rule by level |
| --- | --- | --- | --- |
| A.9 | Picture analogies | choice | "Sock is to foot as glove is to blank": wrong options from other relations / from the same relation |
| A.10 | Number series | choice, numberPad | Plus 1 or plus 2 / plus 5, plus 10 or minus 1 / steps that alternate, typed |
| A.11 | Number puzzles | choice, numberPad | Balance scale: 3 plus blank matches 5 / both sides are sums / typed |
| A.12 | Paper folding | choice | One fold, hole in a corner / hole near the fold / hole on the fold line |
| A.13 | Pattern completion | choice | 3 by 3 striped tile with a missing corner / checkerboard with a missing middle / two attributes |
| A.14 | Picture riddles | choice | Spoken riddle with 2 pictures / 3 pictures |

### Prompt and explanation templates

Every generator uses its family's wording. Text in braces is filled from `facts`. The "Remember" line is the rule the lesson ends on.

| Family | Prompt | Explanation | Remember |
| --- | --- | --- | --- |
| Count objects | How many {things} are there? | Let's count. {1, 2, ... n}. There are {n} {things}. | Touch each one once and say one number. |
| Tap that many | Tap {n} {things}. | Count as you tap. {1, 2, ... n}. Stop at {n}. | Stop when you say the number. |
| Find the number | Find the number {n}. | This is {n}. | Every number has its own shape. |
| More or fewer | Which group has more? | This group has {a}. This group has {b}. {a} is more than {b}. | More means a bigger count. |
| Find the shape | Find the {shape}. | This is a {shape}. {shape fact}. | Count the sides and corners. |
| Find the colour | Find the {colour} one. | This one is {colour}. | Colours have names. |
| Big and small | Which one is {size word}? | This one is {size word}. | Look at them side by side. |
| Different one | Which one is different? | These two are both {same}. This one is {different}. | Look for what does not match. |
| Patterns | What comes next? | The pattern is {unit}, and it repeats. After {last} comes {answer}. | Find the part that repeats. |
| Next, before, after | What number comes after {n}? | Count {n-1}, {n}, {n+1}. {n+1} comes after {n}. | Counting goes up by one. |
| Ten frames | How many counters? | A full row is 5. {5 and k more} makes {n}. | A full frame is 10. |
| Compare numbers | Which number is greater? | {a} comes after {b} when we count. {a} is greater. | Later numbers are bigger. |
| Add with pictures | How many in all? | {a} and {b} more. Count them all. {sum}. | Adding puts groups together. |
| Add | {a} plus {b} equals what? | Start at {bigger}. Count on {smaller} more. {sum}. | Start with the bigger number. |
| Subtract | {a} take away {b} equals what? | Start with {a}. Take away {b}. {difference} are left. | Subtracting takes some away. |
| Make 10 | How many more to make 10? | {a} boxes are full. {b} are empty. {a} and {b} make 10. | Know your pairs that make 10. |
| Break apart | {n} is {a} and what? | {a} and {b} make {n}. | A number can split in many ways. |
| Teen numbers | 10 and {k} more is what number? | A full ten and {k} more is {10+k}. | Teen numbers are ten and some more. |
| Stories | The story from section 9. | {a} {plus or take away} {b} is {answer}. | Listen for joining or taking away. |
| Tens and ones | What number is this? | {t} tens is {10t}. {o} more ones makes {n}. | Count tens first, then ones. |
| Time | What time is it? | The short hand points to {h}. The long hand points to {12 or 6}. It is {time}. | Short hand shows the hour. |
| Coins | Which coin is this? | This is a {coin}. It is worth {v} cents. | Each coin has its own size and value. |
| Graphs | How many chose {x}? | Find {x}. Count its row. {n}. | Read one row at a time. |
| Equal shares | Which shape shows {halves}? | {halves} are {k} equal parts. | Equal parts are the same size. |
| Find the letter | Find the letter {L}. | This is the letter {L}. | Every letter has a name. |
| First sound | Which one starts like {word}? | {word} and {answer} start with the same sound. | Listen to the very start. |
| Rhymes | Which one rhymes with {word}? | {word} and {answer} end the same way. They rhyme. | Rhymes sound the same at the end. |
| Syllables | How many claps in {word}? | {syl, la, ble}. {n} claps. | Each clap has one vowel sound. |
| Sight words | Find the word {w}. | This word is {w}. | Some words we know by sight. |
| Read a word | Which picture matches this word? | The letters {c, a, t} spell {cat}. | Read left to right. |
| Spell a word | Spell {word}. | {word} is spelled {c, a, t}. | Say it slowly and listen. |
| Sorting | Put each one in its group. | {item} is {group}, for each item. | Things in a group share something. |
| Opposites | Which one is the opposite of {word}? | {word} and {answer} are opposites. | Opposites are as different as can be. |
| Analogies | Look at the first pair. Which one finishes the second pair the same way? | The first pair changes {attribute} from {x} to {y}. Do the same here. | Find what changed, then do it again. |
| Matrices | Which one goes in the empty box? | Each row has the same {row attribute}. Each column has the same {column attribute}. The box needs {answer}. | Check across, then check down. |
| Turning shapes | What comes next? | It makes a quarter turn each step. | Follow the turn. |
| Mirror images | Which one is the mirror picture? | A mirror flips left and right. | Left becomes right. |
| Paper folding | The paper is folded and punched. How does it look unfolded? | One punch goes through both layers. The holes sit the same distance from the fold. | Each layer gets a hole. |

Shape facts: a circle is round with no corners. A square has 4 equal sides. A triangle has 3 sides. A rectangle has 2 long sides and 2 short sides. A hexagon has 6 sides. A star has 5 points. An oval is a stretched circle. A diamond is a square standing on a corner.

Praise phrases, chosen at random: Great job. You got it. Nice work. That's right. Well done.

### Lesson beats

Every skill's `lesson()` returns four beats, each with a picture and one or two spoken sentences.

1. **See it.** Show the idea with one clear picture and name it.
2. **Watch me.** Solve one example aloud using the family's explanation wording.
3. **Try it together.** Show a second example, pause two seconds, then reveal the answer.
4. **Remember.** Say the family's "Remember" line.

### Worked examples for the harder skills

These fix the exact shape of questions that are easy to get subtly wrong.

```text
M-K-C8 Make 10, level 1                facts { a: 7, b: 3 }
  prompt       How many more to make 10?
  stimulus     tenFrame filled 7
  options      2, 3, 4                  answer 3
  explanation  7 boxes are full. 3 are empty. 7 and 3 make 10.

M-1-B4 Make ten to add, level 1        facts { a: 9, b: 4 }
  prompt       9 plus 4. Make a ten first. Which one is the same?
  stimulus     two ten frames: 9 filled, 4 filled
  options      "10 plus 3", "10 plus 4", "9 plus 3"     answer "10 plus 3"
  explanation  Move 1 from the 4 to the 9. Now it is 10 and 3. 10 plus 3 is 13.

R-A4 Figure matrices, level 1          facts { rowAttrs: [circle, square], colAttrs: [red, blue], blank: 3 }
  stimulus     matrix [red circle, blue circle, red square, blank]
  options      blue square, blue circle, red square     answer blue square
  explanation  The top row is circles. The bottom row is squares. The first column is
               red. The second column is blue. The box needs a blue square.

R-A12 Paper folding, level 1           facts { fold: vertical, hole: { col: 0, row: 0 } }
  stimulus     foldPunch folded, left half over right, hole top left
  options      unfolded with holes at (0,0) and (3,0)   <- answer
               unfolded with one hole at (0,0)
               unfolded with holes at (0,0) and (0,3)
  note         the unfolded state takes a list of holes

E-PK-C2 Opposites, level 2             facts { target: hot, relation: opposite }
  prompt       Which one is the opposite of hot?
  options      cold (snowflake), night (moon), slow (turtle), each spoken on tap
  answer       cold
  explanation  Hot and cold are opposites.
```

### Common Core codes by skill

These are from memory and are the reviewer's starting point, not the final word. The Virginia mapping pass checks them against the Common Standards Project data. Pre-K and reasoning skills carry no code.

```text
Math K   A.1 K.CC.B.5   A.2 K.CC.B.5   A.3 K.NBT.A.1  A.4 K.CC.A.2   A.5 K.CC.A.2
         A.6 K.CC.A.2   A.7 K.CC.A.1   B.1 K.CC.C.6   B.2 K.CC.C.7   B.3 K.CC.C.7
         C.1 K.OA.A.1   C.2 K.OA.A.5   C.3 K.OA.A.1   C.4 K.OA.A.2   C.5 K.OA.A.1
         C.6 K.OA.A.5   C.7 K.OA.A.2   C.8 K.OA.A.4   C.9 K.OA.A.3   C.10 K.OA.A.2
         C.11 K.OA.A.2  D.1 K.NBT.A.1  E.1 K.G.A.2    E.2 K.G.A.3    E.3 K.G.B.4
         F.1 K.MD.A.2   F.2 K.MD.B.3   G.1 none
Math 1   A.1 1.NBT.A.1  A.2 2.NBT.A.2  A.3 1.NBT.B.2  A.4 1.NBT.B.3  A.5 1.NBT.C.5
         B.1 1.OA.C.6   B.2 1.OA.C.6   B.3 1.OA.C.6   B.4 1.OA.C.6   B.5 1.OA.D.8
         B.6 1.OA.D.7   B.7 1.OA.A.2   B.8 1.NBT.C.4  B.9 1.NBT.C.6  B.10 1.OA.A.1
         C.1 1.MD.B.3   C.2 1.MD.A.1   C.3 1.MD.C.4   C.4 2.MD.C.8   D.1 1.G.A.3
         D.2 1.G.A.1    E.1 none
Math 2   A.1 2.NBT.A.1  A.2 2.NBT.A.3  A.3 2.NBT.A.4  A.4 2.NBT.A.2  A.5 2.OA.C.3
         A.6 2.MD.B.6   B.1 to B.4 2.NBT.B.5          B.5 2.NBT.B.7  B.6 2.NBT.B.7
         B.7 2.NBT.B.8  B.8 2.OA.C.4   B.9 2.OA.A.1   B.10 2.OA.A.1  C.1 2.MD.C.7
         C.2 2.MD.C.8   C.3 2.MD.A.1   C.4 2.MD.D.10  D.1 2.G.A.1    D.2 2.G.A.3
ELA K    A.1 RF.K.1.d   A.2 RF.K.1.d   B.1 RF.K.3.a   B.2 RF.K.2.d   B.3 RF.K.2.d
         B.4 RF.K.3     B.5 L.K.2.d    B.6 RF.K.2.a   B.7 RF.K.2.c   C.1 to C.3 RF.K.3.c
         D.1 L.K.2.a    D.2 L.K.1.b    D.3 L.K.1.c    E.1 RF.K.4
ELA 1    A.1 RF.1.3.a   A.2 RF.1.2.b   A.3 RF.1.3.c   A.4 RF.1.3.c   A.5 RF.1.2.a
         B.1 RF.1.3.g   B.2 L.2.4.d    B.3 L.1.5      C.1 L.1.1      C.2 L.1.1.f
         C.3 L.1.2.b    D.1 RL.1.1
```

### Reading stories (Language Arts grade 1, D.1)

Claude Code writes 20 original stories into `src/content/banks/stories.json` in the Language Arts grade 1 phase.

- Three sentences each, 5 to 8 words a sentence.
- Words come only from the sight word sets, the short-vowel list and the grade 1 phonics lists in section 9, the word family list, and the six story names. The endings s, es, ed and ing are allowed. A test enforces this for stories, questions and options.
- Two questions a story: one who or what, one why or how. Three written options each.
- The story is not read aloud. The question is.

```text
Sam has a red hat. The hat is too big. Sam gives the hat to Max.
  Who gets the hat?  Max / Sam / Mia        Why does Sam give it away?  It is too big / It is red / It is wet

Mia can see a frog. The frog jumps in a pot. Now Mia has a wet hat.
  What jumps?  the frog / the dog / Mia     How did the hat get wet?  The frog jumped in / Mia ran / It was hot
```

## 9. Content data

Generators draw words and pictures from these fixed lists, so Claude Code never has to invent content. Put each list in its own file under `src/content/data/`.

### Picture rules

- Version 1 uses the device's built-in emoji as pictures. That needs no image files and no network.
- Use only the emoji listed here. All are from 2018 or earlier, so they draw on older tablets.
- A picture a child must name always has its word spoken. Never rely on a child guessing what an emoji is called.
- Shapes, coins, clocks, blocks and frames are drawn as SVG, never emoji.

### Counting objects (countables.ts)

```ts
// [emoji, one, many]
['🍎','apple','apples'], ['⭐','star','stars'], ['🐟','fish','fish'],
['🚗','car','cars'], ['🎈','balloon','balloons'], ['🌸','flower','flowers'],
['🐞','ladybug','ladybugs'], ['🍪','cookie','cookies'], ['⚽','ball','balls'],
['🦆','duck','ducks'], ['🐸','frog','frogs'], ['🍓','strawberry','strawberries'],
['🐝','bee','bees'], ['🚀','rocket','rockets'], ['🐢','turtle','turtles'],
['🍌','banana','bananas']
```

### Colours (colors.ts)

```ts
red #E53935, blue #1E88E5, yellow #FDD835, green #43A047, orange #FB8C00,
purple #8E24AA, pink #EC407A, brown #6D4C41, black #212121
```

Never put red and green, or blue and purple, as the only two options in a colour question at level 1.

### First sounds (firstSounds.ts)

```ts
// [word, first letter, sound group, emoji]
['apple','a','a','🍎'], ['ball','b','b','⚽'], ['bear','b','b','🐻'], ['bus','b','b','🚌'],
['cat','c','k','🐱'], ['car','c','k','🚗'], ['cow','c','k','🐄'],
['dog','d','d','🐶'], ['duck','d','d','🦆'], ['door','d','d','🚪'],
['egg','e','e','🥚'], ['fish','f','f','🐟'], ['fox','f','f','🦊'], ['fire','f','f','🔥'],
['goat','g','g','🐐'], ['hat','h','h','🎩'], ['horse','h','h','🐴'], ['house','h','h','🏠'],
['jet','j','j','✈️'], ['key','k','k','🔑'], ['lion','l','l','🦁'], ['lemon','l','l','🍋'],
['moon','m','m','🌙'], ['mouse','m','m','🐭'], ['milk','m','m','🥛'],
['nose','n','n','👃'], ['octopus','o','o','🐙'],
['pig','p','p','🐷'], ['pizza','p','p','🍕'], ['pear','p','p','🍐'],
['rabbit','r','r','🐰'], ['rainbow','r','r','🌈'], ['ring','r','r','💍'],
['sun','s','s','☀️'], ['sock','s','s','🧦'], ['tiger','t','t','🐯'], ['tent','t','t','⛺'],
['umbrella','u','u','☂️'], ['van','v','v','🚐'], ['web','w','w','🕸️'],
['yarn','y','y','🧶'], ['zebra','z','z','🦓']
```

Options in one question must come from different sound groups. Cat and key share a group, so they never appear together.

### Rhyme families (rhymes.ts)

```ts
[['cat','🐱'],['hat','🎩'],['bat','🦇']],
[['dog','🐶'],['frog','🐸']],
[['bee','🐝'],['tree','🌳'],['key','🔑']],
[['star','⭐'],['car','🚗']],
[['moon','🌙'],['spoon','🥄']],
[['fish','🐟'],['dish','🍽️']],
[['fox','🦊'],['box','📦']],
[['cake','🍰'],['snake','🐍']],
[['mouse','🐭'],['house','🏠']],
[['boat','⛵'],['goat','🐐']],
[['bear','🐻'],['pear','🍐']],
[['ring','💍'],['king','🤴']],
[['pan','🍳'],['van','🚐']],
[['clock','🕐'],['sock','🧦'],['lock','🔒']]
```

### Syllables (syllables.ts)

```ts
1: cat, dog, sun, fish, star, moon, frog, cake
2: apple, rabbit, turtle, pizza, monkey, rocket, lemon, tiger, rainbow
3: banana 🍌, octopus 🐙, umbrella ☂️, elephant 🐘, butterfly 🦋,
   strawberry 🍓, dinosaur 🦕, tomato 🍅
```

### Word groups (categories.ts)

```ts
animals:  cat 🐱, dog 🐶, fish 🐟, frog 🐸, duck 🦆, pig 🐷, lion 🦁, elephant 🐘, monkey 🐵, rabbit 🐰
food:     apple 🍎, banana 🍌, pizza 🍕, cookie 🍪, bread 🍞, cheese 🧀, carrot 🥕, grapes 🍇
vehicles: car 🚗, bus 🚌, bike 🚲, plane ✈️, train 🚂, boat ⛵, rocket 🚀, tractor 🚜
clothes:  shirt 👕, pants 👖, dress 👗, socks 🧦, hat 🎩, shoe 👟, gloves 🧤, scarf 🧣
plants:   tree 🌳, flower 🌸, cactus 🌵, clover 🍀
```

### Opposites (opposites.ts)

```ts
hot 🔥 / cold ❄️, day ☀️ / night 🌙, happy 😀 / sad 😢, up ⬆️ / down ⬇️,
open 🔓 / closed 🔒, fast 🐇 / slow 🐢, loud 🔊 / quiet 🔇
big / small: drawn with the shape visual at sizes l and s
```

### Short-vowel words (cvc.ts)

```ts
a: cat 🐱, hat 🎩, bat 🦇, van 🚐, pan 🍳, map 🗺️, bag 👜
e: bed 🛏️, hen 🐔, pen 🖊️, web 🕸️, leg 🦵
i: pig 🐷, pin 📌, lip 👄
o: dog 🐶, fox 🦊, box 📦, pot 🍲
u: sun ☀️, bus 🚌, bug 🐛, cup 🥤, nut 🥜
```

### Word families (families.ts, text only)

```ts
-at: cat hat bat mat sat rat      -an: can fan man pan ran van
-ig: big dig fig pig wig          -op: hop mop pop top
-ug: bug hug mug rug              -et: jet net pet wet
-in: bin fin pin win              -ot: dot hot pot not
```

### Sight words (sightWords.ts)

These are the long-standing Dolch lists.

```ts
set1: a and away big blue can come down find for funny go help here I in is it jump little
set2: look make me my not one play red run said see the three to two up we where yellow you
set3: all am are at ate be black brown but came did do eat four get good have he into like
      must new no now on our out please pretty ran ride saw say she so soon that there they
      this too under want was well went what white who will with yes
set4: after again an any as ask by could every fly from give going had has her him his how
      just know let live may of old once open over put round some stop take thank them then
      think walk were when
```

Never put words that sound alike in one question: to, two, too; for, four; no, know; one, won; there, their; by, buy; be, bee; see, sea; I, eye; new, knew; our, hour; red, read.

### Grade 1 phonics lists (phonics1.ts)

```ts
digraphs:    ship 🚢, shoe 👟, shell 🐚, fish 🐟, cheese 🧀, chick 🐥, thumb 👍, bath 🛁, whale 🐋
blends:      frog 🐸, flag 🚩, star ⭐, snake 🐍, drum 🥁, crab 🦀, clock 🕐, plane ✈️,
             spoon 🥄, truck 🚚, grapes 🍇, hand ✋, milk 🥛, tent ⛺
silent e:    cap/cape, kit/kite, tub/tube, pin/pine, can/cane, hop/hope, cub/cube, man/mane, not/note
vowel teams: rain 🌧️, train 🚂, snail 🐌, bee 🐝, tree 🌳, feet 🦶, boat ⛵, goat 🐐, soap 🧼
compounds:   sun+flower, rain+bow, cup+cake, foot+ball, butter+fly, star+fish, snow+man,
             pop+corn, bed+room, tooth+brush
nouns:       dog ball tree bed girl car      verbs: run jump eat sing read swim
adjectives:  big red soft tall cold happy loud tiny
opposites:   big/small, hot/cold, up/down, fast/slow, happy/sad, open/shut, wet/dry, day/night
same:        big/large, small/little, happy/glad, fast/quick, shut/close, start/begin
```

### Story templates (stories.ts)

```ts
names: Sam, Mia, Leo, Ava, Max, Zoe
add:      "{name} has {a} {things}. {name} gets {b} more. How many {things} does {name} have now?"
add:      "{a} {things} are on the table. {b} more are in the box. How many {things} are there in all?"
subtract: "{name} has {a} {things}. {name} gives away {b}. How many {things} are left?"
subtract: "There are {a} {things}. {b} roll away. How many are left?"
compare:  "{name} has {a} {things}. {name2} has {b}. How many more does {name} have?"
```

Use the plural from the countables list, and the singular when the number is 1.

### A voice cannot say letter sounds

Browser speech cannot reliably pronounce a lone sound such as the first sound in ball. Every phonics prompt therefore uses whole words: "Which one starts like ball?" and "Which letter does sun start with?" Skills that need pure sounds, such as blending, wait for recorded audio on the roadmap.

### How things are said aloud (src/audio/say.ts)

A voice reading a lone letter often says the wrong thing, such as "uh" for a. All spoken text passes through `say.ts`, which swaps letters and numbers for spellings a voice reads correctly.

```ts
letters: a 'ay', b 'bee', c 'see', d 'dee', e 'ee', f 'eff', g 'jee', h 'aitch', i 'eye',
         j 'jay', k 'kay', l 'el', m 'em', n 'en', o 'oh', p 'pee', q 'cue', r 'are',
         s 'ess', t 'tee', u 'you', v 'vee', w 'double you', x 'ex', y 'why', z 'zee'
numbers: written as words by a function, 0 to 1,000 ('forty-seven')
symbols: + 'plus', - 'take away' (K) or 'minus' (grade 1 up), = 'equals', blank 'blank',
         > 'is greater than', < 'is less than'
times:   3:00 'three o'clock', 3:30 'half past three', 3:15 'three fifteen'
money:   25 cents 'twenty-five cents'
```

Lookup order for any letter, number or sound: a clip the parent recorded, then the spelling above through the device voice. Uppercase and lowercase use the same name.

### Analogy pairs (analogies.ts)

```ts
wornOn:   sock 🧦 : foot 🦶,  glove 🧤 : hand ✋,  hat 🎩 : head (face 🙂)
makes:    bee 🐝 : honey 🍯,  cow 🐄 : milk 🥛,  hen 🐔 : egg 🥚
usedWith: key 🔑 : lock 🔒,  pencil ✏️ : paper 📄,  spoon 🥄 : soup 🍲
livesIn:  fish 🐟 : water 🌊,  bird 🐦 : tree 🌳,  spider 🕷️ : web 🕸️
weather:  rain 🌧️ : umbrella ☂️,  sun ☀️ : sunglasses 🕶️,  snow ❄️ : scarf 🧣
```

An analogy uses two pairs from one relation. Every picture is spoken when tapped.

### Picture riddles (riddles.ts)

```ts
'Which one do you wear on your foot?'      shoe 👟
'Which one tells the time?'                clock 🕐
'Which one do you eat soup with?'          spoon 🥄
'Which one lives in water?'                fish 🐟
'Which one gives us milk?'                 cow 🐄
'Which one keeps you dry in the rain?'     umbrella ☂️
'Which one has wheels?'                    car 🚗
'Which one is very cold?'                  snowflake ❄️
'Which one opens a lock?'                  key 🔑
'Which one do you sleep in?'               bed 🛏️
'Which one can you read?'                  book 📖
'Which one can fly?'                       bird 🐦
```

Wrong options are the answers to other riddles. No answer on this list fits a second riddle, and any addition must keep that true.

## 10. Screens and experience

The app has two sides: a kid side that follows IXL's practice flow, and a parent side behind a gate that follows IXL's analytics.

### Routes (src/app/routes.tsx)

| Path | Screen | Side |
| --- | --- | --- |
| `/` | Profile picker: one big avatar button per child | Kid |
| `/home` | Today's picks, subjects, awards, review badge | Kid |
| `/subject/:subject` | Grade tabs, lettered categories, skills with score rings | Kid |
| `/skill/:skillId` | Practice | Kid |
| `/skill/:skillId/learn` | Lesson: example, mini-lesson, video | Kid |
| `/review` | Review session for due skills | Kid |
| `/diagnostic` | Diagnostic, one strand at a time | Kid |
| `/awards` | Awards board | Kid |
| `/parent` | Parent gate | Parent |
| `/parent/dashboard` | Usage and summary per child | Parent |
| `/parent/scores` | Score grid | Parent |
| `/parent/trouble` | Trouble spots | Parent |
| `/parent/log` | Question log | Parent |
| `/parent/plans` | Skill plans | Parent |
| `/parent/settings` | Child profiles and settings | Parent |
| `/parent/data` | Export, import, reset, sync sign-in | Parent |

Add a `vercel.json` rewrite of every path to `/index.html` so deep links load.

### Practice screen

Layout follows IXL: the question on the left, a status panel on the right. On phones the panel becomes a strip above the question.

- **Top bar:** back button, skill code and name, a Learn button.
- **Question area:** prompt with a speaker button, stimulus, answer area, Submit.
- **Status panel:** questions answered, Skill Score out of 100 in its stage colour, time elapsed only if the parent turned the timer on.

Answer flow:

1. The prompt is read aloud when the question appears, if auto-speak is on.
2. The child selects an answer and taps Submit. Pre-K profiles answer `choice` questions with one tap, unless the options carry spoken labels.
3. Inputs lock on submit. Taps in the first 400 ms after a question appears are ignored, which stops double-tap carry-over.
4. **Correct:** green highlight, a short chime, one spoken praise phrase, the score animates up, and the next question loads after 1.2 seconds.
5. **Wrong:** no buzzer. A panel shows "You answered" and "Correct answer" side by side, then the explanation steps and picture, read aloud. A "Got it" button loads the next question.
6. Each answer is saved before the next question renders. Leaving mid-session loses nothing.

Milestones at 50, 80, 90 and 100 each trigger a short full-screen celebration the first time they are crossed. At 100 the child sees the medal and the next pick.

IXL has no session end, so neither does this. After the child's session length, a soft break offers "Keep going" or "All done".

### Lessons and videos

Every skill offers three kinds of help from its Learn button.

1. **Learn with an example.** The generator's fixed `example()` question, solved step by step with narration.
2. **Mini-lesson.** A narrated, animated walk-through built from the same visuals. Each generator may export `lesson(): { speak: string; text: string; visual: Visual }[]` with four steps. Every generator must export it, following the four beats in section 8. The player has play, pause, replay and step dots, and works offline.
3. **Video.** Shown only when the skill has a `video` entry, the device is online, and videos are on for that child, which is the default and a parent can switch off. It opens in a modal using the privacy-enhanced YouTube embed with related videos limited. Add `allowVideos: boolean`, default true, to `ChildSettings`.

Video links are not written into this plan. Phase 12 curates them, mostly from Khan Academy, and a script checks that each one loads before it is committed.

### Audio (src/audio)

- `speak(text, rate)` cancels anything playing, then speaks. It resolves when speech ends or after a timeout.
- The first speech must happen inside a tap, or mobile browsers stay silent. Tapping a child on the profile picker says "Hi" and their name, which unlocks audio.
- Wait up to one second for the voice list, then prefer a local English (US) voice.
- Start speech from an effect keyed on the question's `key`, and cancel in its cleanup. This avoids double speech in React strict mode.
- Keep every utterance under about 12 seconds. Long ones cut off on some phones.
- If speech is unavailable, show a muted speaker icon and carry on. Text stays visible.
- Sound effects are short tones made with WebAudio: a chime for correct, a fanfare for mastery. There is no sound for wrong. A mute setting covers both.

### Awards (src/engine/awards.ts)

Each subject and grade has a board of covered squares. Earning an award uncovers a sticker. `evaluateAwards(states, totals)` is a pure function that returns every award id earned so far.

| Award family | Thresholds |
| --- | --- |
| Skills mastered in a grade | 1, 3, 5, 10, 15, all |
| Questions answered | 25, 50, 100, 250, 500, 1,000 |
| Days practised | 3, 7, 14, 30 |
| Every skill in a category at 80 or above | One per category |
| Diagnostic finished | One per subject |

Days practised counts total days, not an unbroken streak, so a missed day never takes anything away. A parent can open a printable certificate for any completed category.

### Parent side

- **Gate:** "Grown-ups only" with a multiplication question, two numbers from 6 to 9, typed on the number pad. A pass lasts 10 minutes and is held in memory only.
- **Dashboard:** per child, questions and minutes per day for the last 14 days as SVG bars, skills mastered, current picks, and diagnostic levels by strand.
- **Scores:** every skill by subject, grade and category with score, stage chip, attempts, accuracy, time spent and last practised. Sortable.
- **Trouble spots:** flagged skills, each with the three most recent missed questions redrawn, and a button to add the skill to a plan.
- **Question log:** every attempt, newest first, filtered by child, skill and date. Each row redraws the question from its skill, level and seed and shows the child's answer beside the correct one.
- **Plans:** name a plan, pick skills, order them, assign children. Ships with one starter plan, "Reasoning practice", holding the eight reasoning skills.
- **Settings:** per child grade, gentle scoring, session length, speech rate, auto-speak, timer, daily goal, videos.
- **Data:** export everything to a JSON file, import a file, reset one child, sign in for sync.

### Look and feel

Use an original visual identity, not IXL's colours or layout details. Bright and calm, with a system rounded font stack so nothing loads from the network, large type, and five stage colours defined once in `tokens.css`. Support portrait and landscape from 360 px wide to desktop.

### Pre-reader mode

A child who cannot read must be able to use the whole kid side alone. Profiles with `preReader` on get these changes.

- **Home** shows one large Play button and three picture tiles for today's picks. Play runs the picks back to back, 6 questions each, with no menus in between.
- **Every skill is a picture tile:** its `icon`, its score ring, and its name in small text. Tapping the speaker corner says its `speakName`.
- **Subject pages** are a grid of tiles grouped by colour band, not a text list.
- **Buttons carry icons:** a house for home, a star for awards, a check mark for Submit, an arrow for Next.
- **Nothing important is text only.** Celebrations, breaks and the daily limit screen all speak.

### Kid lock and daily limit

- Leaving practice needs a press and hold of 2 seconds on the back button. A plain tap does nothing.
- When `dailyMinutes` is set and used up, the child sees a spoken "All done for today" screen with their stickers. A parent can add 10 minutes through the gate.
- The setup guide tells the parent how to turn on the iPad's Guided Access, which keeps a child inside one app.

### Sound check and voice pack

- **Sound check** in parent settings plays every letter name, the numbers 0 to 20 and each sound-effect, so a parent can hear exactly what the child will hear on that iPad.
- **Voice pack** lets a parent record any of those in their own voice, plus the pure letter sounds a device voice cannot make. Recording uses the iPad microphone and asks permission once. Each clip can be replayed, redone or deleted.
- Recorded letter sounds unlock sound-based prompts later, such as "Which word starts with this sound?"

### Video safety

Videos are on by default, so the player keeps a young child inside the app.

- The embed hides YouTube's own controls. The app draws its own play, pause and close buttons.
- Clear panels cover the title bar and the YouTube logo, so taps there do nothing.
- Each entry in `videos.json` stores the video's length. Playback stops 3 seconds before the end, before suggestions appear.
- A parent can remove any single video from the skill's row on the scores screen.
- Expect thin coverage for pre-K. Khan Academy's library starts in earnest at kindergarten, and the built-in lesson covers the rest.

### Scratchpad

From grade 1, a pencil button on the practice screen opens a drawing layer over the question for working things out. It supports a finger or Apple Pencil, has undo and clear, and is never saved.

### Games

IXL now offers skill games, so version 1 includes two. Each uses real questions from the child's own in-progress skills, logs attempts as normal practice, and is offered after a finished session.

- **Pop:** balloons drift up carrying answer options. The child taps the one that answers the spoken question. Ten questions a round.
- **Pairs:** a memory game of 6 face-down pairs built from `match` content, such as numerals and dot groups or uppercase and lowercase letters.

### Flagging a question

Every row of the question log has a Flag button with an optional note. Flags are listed on the parent data screen and included in exports, so a bad question can be handed straight to Claude Code with its skill, level and seed.

## 11. Open sources and how each is used

Each source supplies the layer it does best. IXL supplies the shape of the product, open curricula supply the teaching sequence, and code written here supplies the questions.

| Source | Licence | Used for | When |
| --- | --- | --- | --- |
| IXL's public skill lists | Proprietary | Reference only: how skills are sized, named and ordered. No questions, text or art copied | Catalogue design |
| [Illustrative Mathematics K–5](https://curriculum.illustrativemathematics.org/k5/teachers/kindergarten/centers.html) | CC BY 4.0 | Order of math skills, problem types behind each generator, phrasing of explanations | Phases 6, 11 |
| Khan Academy videos | CC BY-NC-SA, per a secondary source | Concept videos linked from skills. Fine for a family app, not for resale | Phase 12 |
| [Khan Academy Perseus](https://github.com/Khan/perseus) | MIT | Not used in version 1. See below | Roadmap |
| KaTeX | MIT | Fraction and equation display from grade 3 | Roadmap |
| [Common Standards Project](https://github.com/commonstandardsproject/api) | Open database | Standards codes and descriptions in JSON, to fill `ccss` and state codes | After Phase 11 |
| [Virginia 2023 Mathematics SOL](https://www.doe.virginia.gov/home/showpublisheddocument/54558/638840373303330000) | Public state document | Fills `vaSol` so reports match what Fairfax schools teach | After Phase 11 |
| Core Knowledge Language Arts | CC BY-NC-SA, from memory | Phonics order for kindergarten and grade 1 | Phases 6, 11 |
| EngageNY / Eureka Math | CC BY-NC-SA, from memory | Extra problem types for generators | Phase 11 |
| Dolch sight word lists | Long published, widely reused | Sight word sets | Phase 11 |
| [OpenMoji](https://openmoji.org/faq) | CC BY-SA 4.0 | Optional upgrade: one consistent picture style on every device. Needs a credit line | Roadmap |
| [Oppia](https://github.com/oppia/oppia) | Apache 2.0 | Reference for lesson design. Its stack is Python and Angular, so no code is reused | Reference |
| FSRS, pyBKT | Open source, from memory | Later upgrades for review timing and mastery estimates | Roadmap |

Some licences above are marked "from memory" or come from a secondary source. Confirm them on the publisher's site before leaning on that content.

### Why Perseus is left out of version 1

Perseus is Khan Academy's own exercise renderer. It is a large multi-package codebase built around Khan's internal tools and item format. Pulling it in adds the biggest single risk to a clean first build, and pre-K to grade 2 does not need what it offers. The eight tap-based question types here cover those grades. Revisit it at grade 3, when children start typing fractions and expressions.

### A correction to my earlier note

I described OpenMoji as CC BY. It is CC BY-SA 4.0, which also asks that adapted artwork be shared under the same licence. That does not affect a private family app.

## 12. Build phases and gates

Twenty build steps, one per Claude Code session, run in the order shown. Phase labels are names, not the order. A phase is done only when `npm run verify` passes and every item in its gate is shown to pass.

| Step | Phase | Builds | Gate, beyond `npm run verify` |
| --- | --- | --- | --- |
| 1 | 0. Scaffold | Vite, React, TypeScript, dependencies, scripts, lint, test setup, `CLAUDE.md`, `tokens.css`, app shell with router, error boundary, GitHub Actions workflow | Dev server starts. One render test passes. The workflow file runs `npm run verify` |
| 2 | 1. Engine core | `rng`, `types` with `facts`, `check`, `validate`, registry, all oracles in `tests/oracles/`, generator and oracle harnesses, golden-file test, the content dump script, three reference generators: M-PK-A2, M-K-B3, M-K-C4 | Same seed gives the same output. `check` tested for all 8 types. `validate` rejects one crafted bad question per invariant. Each oracle has its own unit tests. Harnesses pass for the 3 generators |
| 3 | 2. Scoring and adaptive | `skillscore`, `review`, `recommend`, `diagnostic` with ladders and sittings, `awards` | Every row of the section 6 test table. One test per recommendation rule and variety rule. A simulated child who knows the first N skills of a ladder is placed at N, give or take 1, for five values of N. A sitting stops at its question cap and resumes. Award thresholds |
| 4 | 3. Storage | zod schemas for all ten records, `memoryRepo`, `idbRepo` with upgrade steps, export and import with version header, persistent-storage request | One contract suite runs against both repos. Export then import round-trips. A corrupted record is skipped without a crash. A version 1 fixture opens with the newest code |
| 5 | 4a. Visuals | Every visual in section 5, including the added ones, and the dev gallery at `/dev/gallery` | Each visual has an `aria-label`. A WebKit screenshot of the gallery is saved to `review/gallery.png`, and Claude Code looks at it and reports anything overlapping, clipped or unreadable |
| 6 | 4b. Question types and audio | All 8 item components, `speech`, `say`, `sfx`, clip playback | Each item component turns simulated taps into the right response. `say` tests for letters, numbers, symbols and times. Speech tests with a mocked browser API: cancels before speaking, never throws when the API is missing |
| 7 | 5a. Practice flow | Store, child setup, profile picker, practice screen, explanation panel, milestones, soft break, snapshots on attempts | Integration test: new child, 15 correct answers, score 100, medal shown, 15 attempts stored with snapshots, review scheduled. A wrong answer shows the explanation and moves the score per section 6. WebKit smoke test at the three sizes in section 3: no sideways scroll, a 3-question session completes |
| 8 | 5b. Kid navigation and lessons | Home, pre-reader mode with picture tiles and Play, subject pages, lesson player, review, kid lock, daily limit, wake lock | A pre-reader profile can go from the profile picker through a full Play run without any text-only control. The lesson player steps through four beats. Hold-to-exit works and a tap does not. The daily limit screen appears when minutes run out |
| 9 | 9. Install and deploy | Web app manifest, icons, service worker, `vercel.json`, Add to Home Screen guide, install banner | Build output contains the manifest and service worker. Browser test: load, go offline, reload, answer a question |
| 10 | 10. Sync | Supabase client, `sync.ts`, migration file, sign-in by emailed code on the data screen | Tests against a mocked client: a repeated push creates no duplicates, last write wins, sync is a no-op with no env vars. Your part: the Supabase checklist in section 4 |
| 11 | 6a. Math pre-K | Data files, 16 skills | Content gate, below |
| 12 | 6b. Math K, part 1 | Categories A, B, E, F, G: 16 skills | Content gate |
| 13 | 6c. Math K, part 2 | Categories C and D: 12 skills | Content gate |
| 14 | 6d. Language Arts pre-K and Reasoning | 10 and 14 skills, analogy and riddle data | Content gate |
| 15 | 7. Diagnostic and awards | Diagnostic sittings screen, first-run flow, check-in card, awards board, celebrations | A simulated run over two sittings saves placements and flags placed-out skills. Mastering a skill uncovers the right award |
| 16 | 8a. Parent side, part 1 | Gate, dashboard, scores, settings, data tools, sound check, voice pack | The gate rejects a wrong answer. Export, reset, import restores everything. A recorded clip is used in place of the device voice |
| 17 | 8b. Parent side, part 2 | Trouble spots, question log, flags, plans, the `/dev/review` route | A logged question redraws when versions match and shows its snapshot when they do not. A flag is saved and exported. An assigned plan changes the picks |
| 18 | 11a to 11f. Later content | Six sessions: Math grade 1 A, C, D, E (12). Math grade 1 B (10). Math grade 2 A, C, D (12). Math grade 2 B (10). Language Arts K (16). Language Arts grade 1 (12) with the 20 stories | Content gate each session. The story word-list test passes |
| 19 | 12. Videos | `src/content/videos.json` with lengths, `scripts/check-videos.mjs`, safe player | The script requests YouTube's oEmbed endpoint for every id and fails on any that does not load. Playback stops before the end. Skills with no good video stay empty |
| 20 | 13. Scratchpad and games | Scratchpad layer, Pop, Pairs | Drawing works with touch and does not scroll the page. Each game logs attempts as practice and ends cleanly |

### Content gate

Every content step must show all of these.

- The generator suite passes for every new skill at every level over 300 seeds.
- The oracle test passes for every new skill.
- Golden files exist for every new skill.
- The catalogue test passes: ids unique, every row has a generator and the reverse, every skill has an icon, a ladder and a spoken name, prerequisites exist with no cycles.
- Every skill exports a four-beat lesson.
- Claude Code has run `content:dump`, read it against the section 8 templates, and listed anything doubtful.

### Rules for every gate

- Claude Code pastes the full `npm run verify` output in its report.
- If a gate fails twice on the same problem, it stops and explains instead of working around it.
- If browser tests cannot run in the session because browsers will not install, it says so plainly and the integration tests stand as the gate. You then do the two-minute hand check below.

### Your hand check on the iPad after each step from 5a on

- [ ] Open the app on a phone and a tablet.
- [ ] Tap a child, hear the greeting.
- [ ] Answer five questions, one wrong on purpose.
- [ ] Close the app, reopen it, confirm the score is still there.
- [ ] Turn the device sideways and confirm nothing is cut off.

## 13. Tests, known pitfalls and audit

Three layers of tests catch problems before you see them, a pitfall list heads off the usual failures, and an audit closes every phase.

### Test layers

| Layer | Tool | Covers |
| --- | --- | --- |
| Engine unit tests | Vitest in Node | Random numbers, answer checking, scoring, review, recommendations, diagnostic, awards |
| Generator suite | Vitest, `tests/generators.all.test.ts` | Every skill, every level, 300 seeds, all 12 invariants from section 5 |
| Storage contract | Vitest with `fake-indexeddb` | The same tests against both repos |
| Component and flow tests | Testing Library with jsdom | Each question type, the practice loop, the parent gate, the question log |
| Browser smoke test | Playwright | WebKit at three screen sizes, a full session, offline reload |

All time-dependent tests freeze the clock through `lib/clock.ts`. No test uses the network.

### Known pitfalls

| Pitfall | Prevention written into this plan |
| --- | --- |
| Speech is silent on phones until a tap | The profile tap speaks first and unlocks audio |
| Voice list loads late, first prompt has no voice | Wait up to one second for voices before the first utterance |
| Prompt spoken twice in development | Speech runs in an effect keyed on the question, with cancel in cleanup |
| A voice reads symbols oddly | Spoken text spells out plus, minus, equals and blank. Invariant 1 enforces it |
| A voice cannot say single letter sounds | Phonics prompts use whole words only |
| Two options look the same, or two are correct | Invariant 3, plus the pattern and sound-group rules |
| Sound-alike words as options in a listening question | The sound-alike list in section 9 |
| The correct answer is always in the same place | Invariant 11 |
| The same question twice in a row | The registry skips the last 6 keys |
| Emoji missing on an older tablet | Only the listed emoji, all from 2018 or earlier |
| Scattered objects overlap and cannot be counted | The scatter layout uses fixed slots, never random coordinates |
| A double tap answers the next question | Inputs lock on submit and ignore the first 400 ms |
| Progress lost when the app closes mid-session | Every answer is saved before the next question |
| Storage unavailable in private browsing | Falls back to memory with a visible banner |
| A bad stored record crashes a screen | Every read is validated and bad records are skipped |
| Layout breaks under mobile browser bars | Use `dvh` units and scroll inside panels |
| Deep links return 404 on Vercel | The `vercel.json` rewrite |
| A stale service worker serves an old build | The worker updates on reload and the app shows "Update ready" |
| The build breaks with no Supabase keys | Sync is a no-op without env vars. Phase 10 tests this |
| Non-deterministic tests | No `Math.random`, no raw `Date` anywhere in engine or content |
| A video is removed or wrong | The check script, and the built-in mini-lesson never depends on a video |

Pitfalls added after the plan review:

| Pitfall | Prevention written into this plan |
| --- | --- |
| Safari clears saved progress on an iPad | Persistent storage request, Home Screen install, early sync, export nudges |
| The sign-in email opens Safari instead of the app | Sign-in by typed code |
| A generator marks the wrong answer as correct | Oracles written separately from generators |
| Editing a generator rewrites history in the question log | Skill versions, golden files and attempt snapshots |
| A session runs out of room building too many skills | Content steps of 10 to 16 skills |
| A voice says "uh" for the letter a | The `say.ts` table, sound check and voice pack |
| A child cannot read the menus | Pre-reader mode |
| A video leads a child out to YouTube | The safe player in section 10 |
| A first diagnostic exhausts a 3-year-old | Short sittings |
| A skill is renamed and its progress is orphaned | Permanent skill ids |
| A blank white screen after an error | The error boundary |

### Audit before any phase is reported done

This adapts your standing code audit to this project.

**Syntax**

- [ ] `npm run typecheck` and `npm run lint` pass with zero warnings
- [ ] Every component file has exactly one default export, named like its file
- [ ] No unbalanced JSX, no stray fragments, no commented-out blocks left behind

**Flow**

- [ ] Data traced end to end: child to session to attempt to skill state to awards to parent screens
- [ ] Every screen is registered in `routes.tsx`, and every route points to a real component
- [ ] Every catalogue skill has a generator, and every generator has a catalogue row
- [ ] Deleting or resetting a child removes or hides its skill states, attempts, sessions and awards

**Security**

- [ ] No secrets or keys in the repo. Env vars only
- [ ] No undefined variables, no `any`, no unchecked data from storage or imports
- [ ] No `window.open`. Any external link has `rel="noopener noreferrer"` and sits behind the parent gate
- [ ] Every storage and sync write is awaited in try/catch with a visible error state
- [ ] Row level security is on for every Supabase table

**Runtime**

- [ ] Every early return in an async handler releases its loading or locked state
- [ ] Screens are flex columns with inner scroll, no sideways scroll at 360 px
- [ ] Tap targets on kid screens are at least 64 px
- [ ] The app starts and runs a full session with the network off

## 14. After version 1

These close the remaining gap with IXL. None needs a change to the engine.

| Next step | What it adds | Depends on |
| --- | --- | --- |
| Virginia SOL mapping | Each skill tagged with its 2023 Virginia code, a parent view by standard, and a check of the Common Core codes | VDOE documents |
| Grades 3 to 5 math | Multiplication, division, fractions, decimals, area. Adds KaTeX and a fraction keypad | The later-content pattern |
| Language Arts grade 2 and up | Longer reading passages, grammar, vocabulary | Item bank loader |
| Sound-based phonics skills | Blending and segmenting, using the parent's recorded letter sounds | Voice pack |
| Science and social studies | Authored item banks by grade | Item bank loader |
| More reasoning | Harder matrices, two-fold paper folding, verbal classification | Reasoning visuals |
| Smarter scheduling | FSRS for review timing, knowledge tracing for mastery, both fed by the attempt log | A few months of data |
| Real coin pictures | Photographs in place of drawn coins | An image source cleared for use |
| Weekly parent email | A summary of time, mastered skills and trouble spots | Sync |
| Printable worksheets | Any skill at any level as a PDF page from the same generators | None |
| Voice pack sync | Recorded clips shared across iPads | Supabase storage |

### Decisions made on Nov 15, 2026

- **Name:** Sprout.
- **First run:** each child starts with the diagnostic, then gets picks from the result.
- **Videos:** on from the start. Curated links appear as Phase 12 adds them.
- **Standards:** both. Common Core codes ship with the build and Virginia codes follow in a mapping pass.

Main device: iPad, running the app from the Home Screen. All 22 gaps from the plan review of Nov 15, 2026 are folded into the sections above.
