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
| Real-time diagnostic with grade-level estimate | Yes, per ladder | 7 |
| Personal recommendations | Yes, "Today's picks" | 2, 5 |
| Awards board and certificates | Yes | 7 |
| Parent analytics: usage, scores, trouble spots, question log | Yes | 8 |
| Skill plans a parent assigns | Yes | 8 |
| Works on phone, tablet, laptop, offline | Yes, installable web app | 9 |
| Sync across devices | Yes, one family backup file on Cloudflare | 10 |
| Parent sign-in | Yes, email and password, with a forgot-password code by email | A |
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

- **Sign in once, then offline.** A parent signs in on each iPad at first run. After that the app reads and writes only the device, so it works with no network. The network is needed again only to sign in after 30 days and to back up.
- **Deterministic questions.** Every question comes from a skill, a level and a seed number. Tests can replay any question, and the parent log can redraw it exactly.
- **Tap, never drag.** Sorting and matching use tap-then-tap. It suits small hands and needs no drag library.
- **Few dependencies.** Six runtime packages. No CSS framework, no chart library, no drag library.
- **One build phase per session.** Small steps with a gate each, not one giant prompt.
- **Install first.** On an iPad the Home Screen app keeps its own storage, separate from Safari. Children are created inside the installed app, so nothing is left behind in a browser tab.
- **Ids, never positions.** Anything saved about a skill or a ladder stores the skill id. Adding content later can then never shift saved progress.
- **Listen and read questions never leak.** A question that asks a child to hear a target never prints it, and a question that asks a child to read never speaks the words.
- **One free service.** One Cloudflare Worker serves the app, signs parents in, sends the sign-in code and holds the backup. There is no second provider and nothing to pay for.
- **A public repo with nothing private in it.** No secret, no email address and no real name is ever committed. They live in Cloudflare settings.

## 2. How to run this plan in Claude Code

Export this doc as Markdown, save it as `docs/PLAN.md` in a new empty repo, then run one phase per session.

### Setup, once

1. Create an empty public GitHub repo, for example `sprout`. Because it is public, nothing private ever goes into it.
2. Add this plan as `docs/PLAN.md`.
3. Open the repo in Claude Code and paste the kickoff prompt below.
4. After Phase 0, do step A (hosting and sign-in). It puts the app at `https://sprout.logstocks.com`, and every push to `main` is tested and deployed by Cloudflare. The iPad hand checks need HTTPS. A plain local-network address will not run the app, because speech, saved storage and id creation all need a secure address.

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
```

## 3. Stack, setup and file structure

The stack is Vite, React and TypeScript. One Cloudflare Worker on the LogStocks account serves the built app and a small `/api` for sign-in and backup, at `sprout.logstocks.com`. It uses D1 for accounts, R2 for the backup file and the voice pack, and Cloudflare email for the sign-in code. All of it is on the free plan.

### Dependencies

| Package | Purpose | Added in |
| --- | --- | --- |
| `react`, `react-dom` | UI | Phase 0 |
| `react-router-dom` | Routes | Phase 0 |
| `zustand` | App state | Phase 0 |
| `idb` | IndexedDB wrapper for local storage | Phase 3 |
| `zod` | Validates stored data, imports, item banks and API requests | Step A |
| `wrangler`, `@cloudflare/workers-types` | Runs, types and deploys the Worker. Build-time only | Step A |
| `vite`, `typescript`, `@vitejs/plugin-react` | Build | Phase 0 |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `fake-indexeddb` | Tests | Phase 0 |
| `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks` | Lint | Phase 0 |
| `@playwright/test` | Gallery screenshot and browser smoke tests | Phase 4a |
| `tsx` | Runs the TypeScript scripts, such as the content dump | Step A |
| `@types/react`, `@types/react-dom`, `@types/node` | Type definitions that strict TypeScript needs | Phase 0 |
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
  "dev:worker": "wrangler dev",
  "deploy": "npm run verify && wrangler deploy",
  "clips": "bash scripts/make-clips.sh",
  "content:dump": "tsx scripts/content-dump.ts",
  "check:videos": "node scripts/check-videos.mjs",
  "verify": "npm run typecheck && npm run lint && npm run test && npm run build"
}
```

`npm run dev` proxies `/api` to the local Worker started by `npm run dev:worker`. The local Worker uses wrangler's local D1 and R2, and prints the sign-in code in the terminal instead of sending an email.

### Styling

Plain CSS with custom properties in `src/styles/tokens.css`, plus one CSS module per component. No framework. Tokens cover colour, spacing, radius, type scale and the six score-stage colours.

### File structure

```text
sprout/
  CLAUDE.md
  docs/PLAN.md
  index.html
  wrangler.jsonc             the Worker: static files, D1, R2, email, address
  .dev.vars                  local secrets, ignored by git
  .dev.vars.example          made-up values with example.com addresses, committed
  worker/                    runs on Cloudflare, no React, no browser APIs
    index.ts                 routes /api, everything else is the built app
    auth.ts                  sign-in, password, sessions, lockout
    backup.ts                GET and PUT of the family backup file (Phase 10)
    voicePack.ts             GET of the voice pack (Phase 4b)
    store.ts                 Store interface, D1 version, in-memory version
    mailer.ts                Mailer interface, Cloudflare version, in-memory version
    schema.sql               D1 tables, section 4
  public/                    icons, manifest
  scripts/
    content-dump.ts          writes review/<batch>.md
    check-videos.mjs         Phase 12
    make-clips.sh            makes the voice pack on the Mac (Phase 4b)
  review/                    content dumps and the gallery screenshot
  e2e/smoke.spec.ts
  src/
    main.tsx
    app/
      App.tsx
      routes.tsx             the only place routes are declared
      store.ts               zustand store: active child, settings, session
    lib/
      clock.ts               now(), nowIso(), localDay(), freezable in tests
      ids.ts                 uuid helper
      errorLog.ts            last 20 errors, saved in the device record
    engine/                  pure TypeScript, no React, no browser APIs
      rng.ts                 seeded random (mulberry32) + helpers
      seed.ts                seedFor(child, skill, kind, n), section 5
      types.ts               Question, Visual, Say, Response, Skill types
      check.ts               check(question, response) -> boolean
      validate.ts            invariants every question must satisfy
      canonical.ts           canonical form of a Visual, used to compare options
      skillscore.ts          section 6
      review.ts              spaced review boxes, section 7
      recommend.ts           Today's picks, section 7
      diagnostic.ts          placement walk, section 7
      merge.ts               merges two copies of one record, section 4
      awards.ts              award rules
    content/
      catalogue.ts           every Skill row, section 8
      ladders.ts             every ladder as a list of skill ids, section 7
      templates.ts           prompt and explanation wording by family, section 8
      registry.ts            skillId -> generator, built from generators/
      videos.json            Phase 12
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
      exportFile.ts          export and import, with share-sheet hand-off
      account.ts             talks to /api/auth, keeps the sign-in state
      sync.ts                backup sync with the Worker (Phase 10)
    audio/
      speech.ts              speak(), stop(), voice selection
      say.ts                 turns Say parts into words a voice reads correctly
      clips.ts               plays a voice-pack clip in place of the device voice
      sfx.ts                 short tones made with WebAudio, no files
    visuals/                 one component per Visual kind, section 5
    items/                   one component per question type, section 5
    screens/
      kid/                   ProfilePicker, InstallGuide, Home, Play, SubjectPage,
                             Practice, Lesson, Review, SessionSummary, Awards,
                             Diagnostic, Pop, Pairs
      parent/                ParentGate, Dashboard, Scores, TroubleSpots,
                             QuestionLog, Plans, Settings, DataTools,
                             SoundCheck, SetPin
      account/               SignIn, SetPassword
      dev/                   Gallery, ReviewSamples (development builds only)
    components/              shared UI: ScoreRing, BigButton, Modal, Bar,
                             ErrorBoundary
    styles/tokens.css
  tests/                     mirrors src/ and worker/, plus:
    generators.all.test.ts   every skill, every level, 300 seeds
    oracles.test.ts
    oracles/                 one file per oracle, never imported by src/
    golden/                  one file per skill, plus lists.json
```

The `engine/` and `content/` folders must not import from React or touch `window`. That keeps all scoring and question logic testable in plain Node.

### Target device: iPad

The main device is an iPad running the app from its Home Screen icon. Phones and laptops must also work, and the iPad decides every trade-off.

| iPad behaviour | Rule for the build |
| --- | --- |
| Safari can clear a site's saved data after about a week without visits, unless the site is installed to the Home Screen | Call `navigator.storage.persist()` on first run. In a Safari tab on an iPad or iPhone the app shows only the install guide. Children are created inside the installed app |
| The Home Screen app has its own storage and its own sign-in, separate from Safari | Nothing made in a Safari tab carries over. The manifest, icons and Apple meta tags ship in step A, so the app can be installed before the first hand check. The parent signs in inside the installed app. The install guide has a small "Use in this browser anyway" link with a warning, for laptops and for testing. It leads to the sign-in screen, which only a parent can pass |
| iPads show no automatic install prompt | The guide shows the Share button, then "Add to Home Screen", with pictures |
| A link in an email opens Safari, not the installed app | The sign-in email carries a six-digit code to type into the app. It never carries a link |
| Speech is silent until the first tap | The profile tap speaks first |
| Double-tap zooms and long-press opens a menu | `touch-action: manipulation`, `-webkit-touch-callout: none` and `user-select: none` on kid screens |
| Pulling down reloads the page | `overscroll-behavior: none` on the app shell |
| Browser bars change the screen height | `dvh` units only |
| The screen dims mid-lesson | Request a screen wake lock during practice and lessons, and ignore a refusal |
| Emoji look the same on every Apple device | No picture set needs bundling for version 1 |
| Voices differ by device | Prefer the voices named Samantha, Ava or Allison, then any English (US) voice |
| A download link is unreliable inside the Home Screen app | Export hands the file to the share sheet (`navigator.share` with a file). A download link is the fallback on laptops |
| Swiping in from the left edge goes back a page | Kid navigation replaces history, so there is no page to swipe back to. A `popstate` guard puts the child back on the current kid screen |
| The Home Screen app can stay open for days without reloading | Check for a new build on launch and each time the app comes back to the front, at most once an hour. Apply it on the profile picker or home screen, never in the middle of a question |
| Sound effects stay silent until the audio context is resumed inside a tap | The profile tap resumes the WebAudio context as well as speaking |
| The mute setting in Control Center can silence sound effects while the voice still plays | The sound check screen says so in plain words |
| Speech, saved storage and `crypto.randomUUID` need HTTPS | Hand checks use `https://sprout.logstocks.com`, never a local-network address |
| Unmuted video cannot be started from a button outside the video frame | The child taps YouTube's own play button. See Video safety in section 10 |
| Script-written storage can be cleared, a server cookie is sturdier | The session is a server-set `HttpOnly` cookie. The device record only remembers when it expires |
| Speaking straight after cancelling can drop the new sentence | `speak()` waits 60 ms between cancel and speak |

Browser tests run in Playwright's WebKit engine at 1024 by 768, 820 by 1180 and 390 by 844. Playwright's WebKit is not iPad Safari: it has no Home Screen mode, no real voices, and may not run the service worker. Where a browser test cannot run in WebKit, it runs in Chromium and the iPad hand check in section 12 covers the gap. Browser tests do not sign in for real. They answer every `/api` request themselves with a signed-in reply, so they need no Worker and no network.

### Continuous checks

There is no GitHub Actions workflow. The repo is connected to Cloudflare Workers Builds, with `npm run verify` as the build command and `npx wrangler deploy` as the deploy command. A push to `main` that fails any check is never deployed, and the build log shows why. The build does not run Playwright. `npm run verify` is also run locally before every push. Step A removes the `.github/workflows/verify.yml` file that the first scaffold added. Wrap the app in one error boundary that shows "Something went wrong" with a button back to the profile picker, and keeps the last 20 errors in the device record (section 4) for the parent data screen.

## 4. Data model

Twelve record types hold everything: the seven below and five more under Additions at the end of this section. They live in IndexedDB on the device. From Phase 10, ten of them are also kept in one family backup file on Cloudflare. Voice clips and the device record stay on the device.

### Records (src/storage/schema.ts)

Define each as a zod schema and infer the TypeScript type from it. All ids are UUID strings made on the device. All times are ISO strings in UTC. A `day` is the device's local calendar date, `YYYY-MM-DD`, stamped by `localDay()` when the record is made. Daily goals, daily minutes, days practised, the 14-day charts and "one check-in a day" all read `day`, never a UTC time.

```ts
type Grade = 'PK' | 'K' | '1' | '2' | '3' | '4' | '5';
type SkillGrade = Grade | 'all';             // 'all' is used by Reasoning
type ItemType = 'choice' | 'multiSelect' | 'tapCount' | 'numberPad'
              | 'order' | 'sort' | 'match' | 'tiles';

interface ChildSettings {
  gentleScoring: boolean;      // default true for PK and K, false above
  sessionLength: number;       // questions per session: PK 6, K 8, 1+ 10
  speechRate: number;          // 0.7 to 1.1, default 0.85
  autoSpeak: boolean;          // default true for PK, K, 1
  showTimer: boolean;          // default false. The only clock a child can ever see
  dailyGoalQuestions: number;  // default 15, shown as a ring of stars on the home screen
  allowVideos: boolean;        // default true
  dailyMinutes: number;        // 0 means no limit, default 0
  preReader: boolean;          // default true for PK and K
}

interface Child {
  id: string; name: string; avatar: string;   // avatar = one emoji
  grade: Grade; settings: ChildSettings;
  resetAt: string | null;      // rows for this child made before this time are dead, see Reset
  createdAt: string; updatedAt: string; deletedAt: string | null;
}

interface SkillState {
  childId: string; skillId: string;
  score: number;               // 0..100 integer
  bestScore: number;           // highest score ever reached, drives milestone celebrations
  streak: number;              // consecutive correct, resets on a miss
  attempts: number; correct: number;
  recent: boolean[];           // last 10 results, newest last
  masteredAt: string | null;
  placedOut: boolean;          // set by the diagnostic
  reviewBox: number;           // 0..4
  reviewDueAt: string | null;  // due once today's local day reaches this time's local day
  lastPracticedAt: string | null;
  updatedAt: string;
}

interface Attempt {
  id: string; childId: string; skillId: string; sessionId: string;
  level: 1 | 2 | 3 | 4;        // the level actually asked, after clamping to the skill's maxLevel
  seed: number;                // the seed that produced the question shown
  itemType: ItemType;
  response: unknown;           // exactly what the child submitted
  contentVersion: number;      // the skill's version when answered
  snapshot: { prompt: string; correct: string; given: string };  // plain-text record that never changes
  correct: boolean;
  ms: number;                  // question shown to answer submitted, capped at 120,000
  scoreBefore: number; scoreAfter: number;
  kind: 'practice' | 'review' | 'diagnostic';
  day: string;                 // local calendar date
  createdAt: string;
}

interface Session {
  id: string; childId: string;
  kind: 'practice' | 'review' | 'diagnostic';
  skillId: string | null; startedAt: string; endedAt: string | null;
  questions: number; correct: number;
  day: string;                 // local calendar date of startedAt
}

interface AwardEarned { childId: string; awardId: string; earnedAt: string; }

interface Plan {
  id: string; name: string; skillIds: string[]; childIds: string[];
  createdAt: string; updatedAt: string; deletedAt: string | null;
}

interface DiagnosticResult {
  id: string; childId: string;
  subject: 'math' | 'ela';
  ladderId: string;
  placementSkillId: string | null;  // the skill to start on. null = passed the whole ladder
  estimateGrade: Grade | null;      // grade of the placement skill. null when there is no estimate
  estimateFraction: number | null;  // 0.4 = 40% through that grade on this ladder
  takenAt: string;
}
```

Notes on these records:

- **Minutes** for a day are the sum of that day's capped `ms`. The cap stops one abandoned question from counting as an hour. The daily limit and the dashboard both use this sum.
- **`bestScore`** only goes up. A milestone at 50, 80, 90 or 100 is celebrated when a new score crosses it and `bestScore` was below it. Dropping and climbing back never celebrates twice. Placing out sets `bestScore` to 80 with no celebration.
- **Every field added after version 1** gets a zod default. An old record then loads with the default instead of failing.

### Repo interface (src/storage/repo.ts)

```ts
interface Repo {
  listChildren(): Promise<Child[]>;               // leaves out soft-deleted children
  saveChild(c: Child): Promise<void>;
  resetChild(childId: string): Promise<void>;     // see Reset
  getSkillStates(childId: string): Promise<SkillState[]>;
  saveSkillState(s: SkillState): Promise<void>;
  addAttempt(a: Attempt): Promise<void>;
  listAttempts(childId: string, opts: { since?: string; until?: string; skillId?: string; limit?: number }): Promise<Attempt[]>;
  saveSession(s: Session): Promise<void>;
  listSessions(childId: string, since?: string): Promise<Session[]>;
  listAwards(childId: string): Promise<AwardEarned[]>;
  addAward(a: AwardEarned): Promise<void>;
  listPlans(): Promise<Plan[]>;
  savePlan(p: Plan): Promise<void>;
  listDiagnostics(childId: string): Promise<DiagnosticResult[]>;
  saveDiagnostic(d: DiagnosticResult): Promise<void>;
  listFlags(): Promise<Flag[]>;
  saveFlag(f: Flag): Promise<void>;
  getDiagnosticProgress(childId: string, subject: 'math' | 'ela'): Promise<DiagnosticProgress | null>;
  saveDiagnosticProgress(p: DiagnosticProgress): Promise<void>;
  getClip(key: string): Promise<AudioClip | null>;
  saveClip(c: AudioClip): Promise<void>;
  deleteClip(key: string): Promise<void>;
  listClipKeys(): Promise<string[]>;
  getFamily(): Promise<Family>;                   // returns defaults when nothing is saved
  saveFamily(f: Family): Promise<void>;
  getDeviceState(): Promise<DeviceState>;         // returns defaults when nothing is saved
  saveDeviceState(d: DeviceState): Promise<void>;
  countQuarantined(): Promise<number>;
  exportAll(): Promise<ExportFile>;               // the ten backed-up record types
  importAll(file: ExportFile): Promise<ImportReport>;   // validates with zod first
}
```

Rules:

- `idbRepo` opens database `sprout` version 1 with one object store per record type, plus a `quarantine` store. Attempts are indexed by `childId`, by `[childId, skillId]` and by `[childId, createdAt]`.
- If IndexedDB fails to open, the app falls back to `memoryRepo` and shows a banner: "Progress will not be saved on this device."
- Every record read from storage passes through its zod schema. A record that still fails after defaults are applied is copied to `quarantine`, logged, and left out of the result. It never crashes a screen and is never silently overwritten. The parent data screen shows "N saved items could not be read" when the count is above zero, and the export file includes them untouched.
- First run creates no children and no plans. The parent creates each child in a two-step setup (name and avatar, then grade). Child setup sits on the parent side. Until the PIN gate is built in Phase 8a, the sign-in screen is what keeps it to parents. From Phase 7, a child's first visit opens the diagnostic before the home screen, with a "Skip for now" button.
- **Import merges.** `importAll` adds the file to what is on the device using the same merge rules as sync, below. It never wipes the device. The report says how many records were added, updated and skipped.
- **Reset.** `resetChild` sets the child's `resetAt` to now and deletes that child's skill states, attempts, sessions, awards, diagnostic results, diagnostic progress and flags from the device. Any row for that child made before `resetAt` is dead everywhere: every read ignores it, import skips it, and sync removes it. This is what lets a reset survive a second iPad and a sync. A reset cannot be undone by importing an older export, so the reset dialog says it is final and offers an export first.

### Sign-in and backup service (`worker/`)

One Cloudflare Worker does four jobs: it serves the built app, signs parents in, emails the sign-in code, and stores the family backup file. It runs on the LogStocks Cloudflare account at `sprout.logstocks.com`, on the free plan.

**Settings in `wrangler.jsonc`.** Claude Code checks the current Cloudflare docs for the exact key names when it builds step A.

| Setting | Value |
| --- | --- |
| Static files | The `dist` folder. Unknown paths return `index.html`, so deep links load. Paths under `/api` go to the Worker first |
| D1 database | `sprout`, bound as `DB` |
| R2 bucket | `sprout-backups`, bound as `BACKUPS` |
| Email | A `send_email` binding, `MAIL`. It can only send to addresses verified on the account, which costs nothing |
| Address | `sprout.logstocks.com` as a custom domain |
| Plain setting | `ENVIRONMENT` is `production` |

**Private settings, set with `wrangler secret put`, never in the repo.**

| Secret | Holds |
| --- | --- |
| `PARENT_EMAILS` | The one or two email addresses allowed to have an account, separated by commas |
| `AUTH_PEPPER` | A long random value mixed into every stored password hash |
| `MAIL_FROM` | The sender address. Chosen in step A after checking the domain's existing mail records |

`.dev.vars` holds test values for local runs, with `ENVIRONMENT` set to `dev`. Git ignores it. Only when `ENVIRONMENT` is `dev` does the Worker print the code instead of emailing it. A test reads `wrangler.jsonc` and fails if it says anything but `production`.

**D1 tables (`worker/schema.sql`).**

```sql
create table users (
  email      text primary key,        -- lower case
  pw_hash    text not null,
  pw_salt    text not null,
  created_at text not null,
  updated_at text not null
);

create table sessions (
  token_hash text primary key,        -- SHA-256 of the cookie value
  email      text not null,
  created_at text not null,
  expires_at text not null
);
create index sessions_email on sessions (email);

create table email_codes (
  email      text primary key,        -- one live code per address
  code_hash  text not null,
  sent_at    text not null,
  expires_at text not null,
  tries      integer not null default 0
);

create table login_attempts (
  email        text primary key,
  window_start text not null,
  count        integer not null
);
```

**Routes.** Requests and replies are JSON, checked with zod.

| Route | Needs a session | What it does |
| --- | --- | --- |
| `POST /api/auth/start` | No | Takes an email. If it is on the list, emails a six-digit code. The reply is the same whether or not it is on the list |
| `POST /api/auth/password` | No | Takes the email, the code and a new password key. Checks the code, saves the password, ends every older session for that email and starts a new one. Used for the first sign-up and for a forgotten password |
| `POST /api/auth/login` | No | Takes the email and password key. Starts a session |
| `GET /api/auth/session` | Yes | Returns the email and when the session ends |
| `POST /api/auth/logout` | Yes | Ends this session |
| `POST /api/auth/logout-all` | Yes | Ends every session for this email, on every device |
| `GET /api/backup` | Yes | Returns the backup file and its version. Phase 10 |
| `PUT /api/backup` | Yes | Stores a new backup file if the version it was built on is still the current one. Phase 10 |
| `GET /api/voice-pack` | Yes | Returns the voice pack. Phase 4b |

Any other path under `/api` returns 401 without a session and 404 with one. It never returns the app page.

**Sign-in rules.**

- Only addresses in `PARENT_EMAILS` can have an account. All of them share the one family. There is no second family and no sign-up for anyone else.
- A code is six digits, lasts 10 minutes and allows 5 tries. Only its hash is stored. A new code can be asked for once a minute, and it replaces the old one.
- A password is at least 10 characters. The app never sends the password itself. The device stretches it first: PBKDF2 with SHA-256, 310,000 rounds, salted with `sprout:` plus the lower-case email. The result is the password key. The Worker stores an HMAC-SHA256 of the user's random salt plus the password key, keyed with `AUTH_PEPPER`, and compares in constant time. The slow step runs on the device because the free plan gives a Worker only a few milliseconds of processor time per request.
- Five wrong passwords for one email lock sign-in for that email for 15 minutes. Setting a new password by emailed code clears the lock.
- A session is 32 random bytes in a cookie named `__Host-sprout`, set `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, for 30 days. D1 stores only its hash. The 30 days are fixed from sign-in and are never extended.
- Every request that changes something must be JSON, or the gzip file for the backup, and its `Origin` must be the app's own address.
- The Worker logs no email address, code, password key or cookie.

### Backup sync rules (Phase 10)

Sync is one file. The whole family's progress is saved as a single compressed file in R2, `family.json.gz`. Its contents are exactly an export file (see Versions, below) holding the ten backed-up record types.

- The device is always what the app reads from and writes to. Sync runs in the background and never blocks a screen.
- Sync runs on launch, at the end of each session and when the app returns to the front, at most once every 5 minutes, and never in the middle of a question.
- The repo sets `dirty` in the device record on any write to a backed-up record.

**One sync run (`src/storage/sync.ts`)**

1. Ask for the file, sending the version this device last saw. "Not changed" means the server has nothing new.
2. If a newer file came back: unzip it, check it with zod, and merge it into the device with the same code that import uses. Remember its version.
3. If `dirty` is set: export, zip, and upload, naming the version this upload was built on. With no file on the server yet, the upload says "only if none exists".
4. If the server answers that the version has moved on (another iPad uploaded in between), go back to step 1. After 3 rounds, stop and wait for the next run.
5. On success, clear `dirty` and save the new version and the time in the device record.

A failed run changes nothing on the device and is tried again next time. The parent data screen shows "Last backup" with the time, or the last error in plain words.

**The Worker's side (`worker/backup.ts`)**

- It checks the session, that the upload is a gzip file, and that it is under 25 MB. It never opens the file.
- The version is the R2 object's etag. A conditional write refuses an upload built on an older version, so two iPads can never overwrite each other blindly.
- Before the first upload of each day, it copies the current file to `history/<date>.json.gz`. An R2 lifecycle rule deletes history copies after 14 days. To go back to an earlier day, download that copy from the Cloudflare dashboard and import it in the app. Import merges, so it restores what is missing without wiping anything.

**A new iPad.** Straight after the first sign-in the app runs one sync before showing the profile picker, with the message "Getting your family's progress". The children and their scores then appear on the new iPad.

**Merging two copies of one record (`src/engine/merge.ts`)**

- Children and plans: the copy with the later `updatedAt` wins. For a child, `resetAt` is the later of the two.
- Attempts, sessions, awards, diagnostic results and flags are only ever added. A record whose id is already on the device is skipped.
- Skill state: `attempts`, `correct` and `recent` are recounted from the attempt log after any merge that brought in attempts for that skill, so two iPads never lose each other's answers. `score`, `streak`, `masteredAt` and the review fields come from the copy with the later `lastPracticedAt`. `bestScore` is the higher of the two. `placedOut` is true if either copy says so.
- Diagnostic progress and the family record: the copy with the later `updatedAt` wins.
- Deletes of children and plans are soft (`deletedAt`), so they travel like any other change.

**Reset across devices**

- A reset sets the child's `resetAt`. The next upload from that device no longer contains the child's older rows.
- A device that merges a child with a later `resetAt` than its own deletes its local rows for that child made before it, and never uploads them again.

### Additions: flags, diagnostic progress, voice clips, family, device record

```ts
interface Flag {                    // a parent marks a question as wrong or confusing
  id: string; childId: string; attemptId: string;
  skillId: string; level: number; seed: number;
  note: string; createdAt: string; resolvedAt: string | null;
}

interface DiagnosticProgress {      // lets a diagnostic stop and resume
  childId: string; subject: 'math' | 'ela';
  ladders: Record<string, {         // keyed by ladder id
    currentSkillId: string | null;  // the skill being tested now
    passed: string[];               // skill ids
    failed: string[];               // skill ids
    asked: number; done: boolean;
  }>;
  sittings: number; done: boolean; updatedAt: string;
}

interface AudioClip {               // one clip from the voice pack, kept on the device only
  key: string;                      // 'letter:a', 'number:7', 'phrase:great-job'
  bytes: ArrayBuffer;               // raw audio. Never a Blob: Blobs do not store reliably
  mimeType: string;                 // 'audio/mp4'
  packVersion: string;              // the voice pack this clip came from
}

interface Family {                  // one record for the whole family, backed up
  id: 'family';
  pinSalt: string | null;           // null until a parent sets the PIN
  pinHash: string | null;           // PBKDF2 of the 4-digit PIN with pinSalt. Never the PIN itself
  updatedAt: string;
}

interface DeviceState {             // one record per device, never backed up
  id: 'device';
  muted: boolean;                   // covers the voice and sound effects
  signedInEmail: string | null;     // kept on the device only, never exported
  sessionExpiresAt: string | null;  // from the server. Past this, the app locks
  lastSyncAt: string | null;
  backupVersion: string | null;     // the server file version this device last merged
  dirty: boolean;                   // a backed-up record changed since the last upload
  voicePackVersion: string | null;
  persistGranted: boolean | null;   // answer from navigator.storage.persist()
  lastExportAt: string | null;
  browserModeAccepted: boolean;     // parent chose "Use in this browser anyway"
  catalogueVersion: number;         // see Catalogue growth in section 7
  errors: { at: string; message: string; stack: string | null }[];   // last 20
}
```

Flags, diagnostic progress and the family record are backed up. Voice clips and the device record stay on the device. An export does not include the clips, because any signed-in iPad can download the voice pack again.

### Versions and changes over time

- **Local database.** `idbRepo` keeps a numbered list of upgrade steps. Opening an older database runs the missing steps in order. A test opens a version 1 fixture with the newest code.
- **Export file.** Every export starts with `{ "format": "sprout-export", "version": 1 }`. Import refuses a newer version with a clear message and upgrades an older one.
- **Skill ids are permanent.** Never rename or reuse one. A retired skill stays in the catalogue with `retired: true` and is hidden from children. Its history stays in parent reports.
- **Skill versions.** Each skill has a `version`. `tests/golden/<skillId>.json` stores the output of `example()` and seeds 1 to 10 at each level. If output changes, the test fails until the version is bumped and the golden file is regenerated on purpose.
- **Word lists.** Every generator names the data files it reads in `lists`. `tests/golden/lists.json` holds a hash of each data file. Changing a list fails the test and prints every skill that reads it. Each of those skills gets a version bump and a new golden file in the same change.
- **Old attempts stay true.** Each attempt stores a plain-text `snapshot` of the prompt, the correct answer and the child's answer. The question log redraws the full question only when the attempt's `contentVersion` matches the skill's current version. Otherwise it shows the snapshot.

### Keeping progress safe

- **Install before anything else.** In a Safari tab on an iPad or iPhone the app shows the install guide and nothing else. The Home Screen app has its own storage and its own sign-in, so a child created in the tab would be left behind. The guide has a small "Use in this browser anyway" link with that warning. It leads to the sign-in screen, which only a parent can pass. Laptops and desktop browsers skip the guide.
- Ask for persistent storage on first run and show the result on the parent data screen.
- Until backup sync ships in Phase 10, the parent data screen shows the date of the last export and nudges for a new one every 7 days. After that it shows the time of the last backup, and nudges only if no backup has succeeded for 7 days.
- Export hands the file to the share sheet, so it can be saved to Files or sent by AirDrop from inside the Home Screen app.

### Your Cloudflare checklist (step A)

Claude Code does everything it can through `wrangler`. These are the parts only you can do.

- [ ] Run `npx wrangler login` and choose the LogStocks account.
- [ ] Give Claude Code the one or two parent email addresses. They go into a private Cloudflare setting, never into the repo.
- [ ] Cloudflare emails each of those addresses a confirmation link. Click it. Only confirmed addresses can be sent a sign-in code.
- [ ] Create the public GitHub repo and connect it under Workers Builds, with `npm run verify` as the build command and `npx wrangler deploy` as the deploy command.
- [ ] Answer one question about the domain's mail. Claude Code reads the existing mail records for `logstocks.com` first and changes nothing there without asking.
- [ ] Open `https://sprout.logstocks.com` on each iPad, add it to the Home Screen, and sign in inside the installed app.

Claude Code does these with `wrangler`, and reports each one: create the D1 database and run `schema.sql`, create the R2 bucket and its 14-day history rule, set the three secrets, and attach the address.

## 5. Question engine

Every question is plain data produced by a pure function of skill, level and seed. Screens only draw that data and report what the child tapped.

### Seeded random (src/engine/rng.ts)

Use mulberry32. Expose `makeRng(seed)` returning `{ int(min, max), pick(arr), shuffle(arr), sample(arr, n), bool(p) }`. `int` is inclusive at both ends. `shuffle` and `sample` return new arrays.

### Visuals

A `Visual` is a small description of a picture. One React component draws each kind. Stimuli, answer options and explanations all use the same set.

| Kind | Fields | Draws |
| --- | --- | --- |
| `emojiGroup` | emoji, count, layout: `row`, `grid5`, `scatter`, slots (scatter only) | Countable objects. `grid5` wraps every 5. `scatter` puts the objects in the listed slots of a fixed 5 by 4 grid of positions that never overlap. The generator picks the slots with its rng, so two groups of 7 do not look alike |
| `text` | value, size: `m`, `l`, `xl` | A numeral, letter or word |
| `shape` | shape, color, size: `s`, `m`, `l`, rotation | Inline SVG: circle, square, triangle, rectangle, hexagon, star, heart, oval, diamond |
| `solid` | solid: cube, sphere, cone, cylinder | Inline SVG 3D shape |
| `tenFrame` | filled, frames: 1 or 2 | Ten frame with counters |
| `baseTen` | hundreds, tens, ones | Place-value blocks |
| `numberLine` | min, max, step, marked\[\], hidden\[\] | Number line with a point or blanks |
| `equation` | parts: (number, operator or `blank`)\[\] | `3 + □ = 7`, horizontal |
| `sequence` | items: (Visual or `blank`)\[\] | A row with a missing slot, for patterns |
| `matrix` | cells: (Visual or `blank`)\[4\] | 2 by 2 reasoning grid |
| `clock` | hour, minute | Analog clock face. The hour hand sits at hour plus minute/60, so at half past it is halfway to the next number |
| `coins` | coins: a list of `penny`, `nickel`, `dime`, `quarter` | Drawn coins, described under More visuals |
| `graph` | type: `picture` or `bar`, categories: {label, emoji, value}\[\] | Simple graph |
| `ruler` | lengthUnits, startUnit, object: `pencil`, `crayon`, `ribbon` | A drawn object lying above a ruler, from startUnit to startUnit plus lengthUnits. Never an emoji, which would stretch out of shape |
| `fraction` | shape, parts, shaded, equal | Partitioned circle or rectangle. `equal: false` draws parts of clearly different sizes |
| `row` | children: Visual\[\] | Lays visuals side by side |

Rules: every visual scales to its container, has an `aria-label` built from its fields, and never relies on colour alone when colour is not the thing being asked. Red against green, or blue against purple, is never the only difference between two options, except in Find the colour above level 1. Every visual may also carry an optional \`speak\` label, read aloud when a non-reader taps it. \`emojiGroup\` takes an optional \`crossed\` count for subtraction pictures.
A `speak` label is dropped in `listen` and `read` questions, as set out under Question data. Two visuals count as the same picture when `canonical.ts` gives them the same form: a turned circle is still a circle, a square turned a quarter turn is the same square, and a flipped symmetric shape is unchanged.

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
| `tiles` | Taps letter or word tiles into blanks | `{ tiles: string[] }` | the tiles, joined with nothing between them, equal `answer` |

### Question data (src/engine/types.ts)

```ts
type FactValue = number | string | boolean | FactValue[] | { [key: string]: FactValue };

// Spoken text is a list of parts, so say.ts knows what each piece is.
type SayPart =
  | string                                        // plain words: no digits, no symbols
  | { letter: string }                            // a letter name: 'a' is said "ay"
  | { word: string }                              // a word said as a word: 'a', 'I', 'read'
  | { number: number }
  | { time: { hour: number; minute: number } }
  | { cents: number };
type Say = SayPart[];

interface QuestionBase {
  skillId: string; level: 1 | 2 | 3 | 4; seed: number;
  key: string;                 // skillId | level | canonical JSON of facts, leaving out facts.options
  facts: Record<string, FactValue>;   // every value that decides the content. The oracle reads only this
  mode: 'look' | 'listen' | 'read';
  prompt: { text: string; speak: Say };
  stimulus?: Visual;
  explanation: {
    speak: Say;                // one or two short sentences
    steps: string[];           // 1 to 4 short lines shown on screen
    visual?: Visual;           // the picture that shows why
  };
}

type Question =
  | QuestionBase & { type: 'choice'; options: Visual[]; answerIndex: number; fixedOrder?: true; twins?: true }
  | QuestionBase & { type: 'multiSelect'; options: Visual[]; answerIndexes: number[] }
  | QuestionBase & { type: 'tapCount'; emoji: string; shown: number; answer: number }
  | QuestionBase & { type: 'numberPad'; answer: number; maxDigits: number }
  | QuestionBase & { type: 'order'; items: Visual[]; answerOrder: number[] }
  | QuestionBase & { type: 'sort'; items: Visual[]; bins: { label: string; speak: Say; icon?: Visual }[]; answerBin: number[] }
  | QuestionBase & { type: 'match'; left: Visual[]; right: Visual[]; answerPairs: [number, number][] }
  | QuestionBase & { type: 'tiles'; slots: number; bank: string[]; answer: string };
```

**The three modes**

| Mode | Used for | Rules |
| --- | --- | --- |
| `look` | Most questions | The on-screen prompt and the spoken prompt say the same thing. Options and pictures may carry a `speak` label |
| `listen` | Hear a letter, number or word and find it | The target is only in `prompt.speak`. `prompt.text` is the neutral sentence, such as "Find the letter." No option or stimulus carries a `speak` label, so tapping around cannot reveal the answer. The screen shows a large speaker button to hear it again |
| `read` | Read a word, sentence or story | The words the child must read are never spoken, before or after a tap. Only the instruction is spoken |

When the device is muted or has no voice, a `listen` question cannot be answered. Picks leave those skills out, and opening one shows a picture card asking for the sound to be turned on.

**Two flags on `choice`**

- `fixedOrder` is for answers that always sit in the same place, such as True and False, the signs greater, less and equal, or the three end marks. They are not shuffled.
- `twins` is for "Which one is different". The wrong options are all the same picture, and the answer is the one that differs.

### Generator contract (src/content/generators)

```ts
interface SkillGenerator {
  skillId: string;
  maxLevel: 1 | 2 | 3 | 4;
  itemTypes: ItemType[];
  lists: string[];                                  // data files it reads, such as ['countables']
  pool?: Partial<Record<1 | 2 | 3 | 4, number>>;    // how many different questions a level has, when fewer than 8
  generate(level: number, rng: Rng): Question;      // pure, no Date, no Math.random
  example(): Question;                              // fixed seed, used by Learn with an example
  lesson(): LessonStep[];                           // four beats, section 8
  oracle: OracleId;                                 // independent answer check, see Facts and oracles
}
```

`maxLevel` and `itemTypes` also appear on the catalogue row, where screens read them. A test fails if the two disagree.

**Keys.** A question's `key` is its skill id, its level and the canonical JSON of its `facts`, leaving out `facts.options`. Two questions with the same key are the same question to a child, whatever order the options are in.

**Seeds (`src/engine/seed.ts`).** `seedFor(childId, skillId, kind, n)` is a 32-bit FNV-1a hash of those four values joined with `|`. `n` is how many attempts the child has already made at that skill and kind. No clock and no random call is involved, so any question can be replayed.

**Registry.** `registry.ts` exposes `nextQuestion(skillId, level, seed, recentKeys)`.

1. It clamps `level` to the skill's `maxLevel` and generates.
2. If the question's `key` is in the repeat window it retries with `seed + 1`, up to 20 times.
3. The repeat window is the child's last 6 keys for that skill. For a level with a declared `pool`, the window is the smaller of 6 and the pool size minus 1, so a level with 2 questions only avoids an immediate repeat.
4. If all 20 tries repeat, it returns the last one. It never throws.
5. The question it returns carries the seed that actually produced it, and that seed is what the attempt stores.

### Invariants (src/engine/validate.ts)

`validateQuestion(q)` returns a list of problems. An empty list means valid. The generator test suite runs it over every skill, every level, 300 seeds.

1. `prompt.speak` and `explanation.speak` are non-empty. Their string parts contain no digits and none of `+`, `-` between numbers, `=`, `□`, `<`, `>`, `_`. Numbers, letters, times and money are typed `Say` parts. Words such as "plus", "equals" and "blank" are written out.
2. No field is `undefined`, `NaN` or an empty array.
3. `choice`: 2 to 4 options, `answerIndex` in range. Without `twins`, every pair of options is a different picture by canonical form. With `twins`, the wrong options are all the same picture and the answer is different from them.
4. `multiSelect`: 1 or more correct, at least 1 incorrect.
5. `tapCount`: `1 <= answer <= shown <= 12`.
6. `numberPad`: answer is a non-negative integer that fits `maxDigits`.
7. `order`, `sort`, `match`: answers cover every item exactly once. `sort` uses every bin at least once.
8. `tiles`: the answer can be built from the bank, and the bank holds at least 2 tiles that are not needed. No other arrangement of bank tiles that fills the slots spells a word that sounds like the answer, using the sound-alike list in section 9.
9. Same skill, level and seed always produce a deeply equal question.
10. Across 300 seeds each level yields at least 8 distinct `key` values. A level with a declared `pool` must yield at least the smaller of 8 and the pool, and never more keys than the pool.
11. The position of the correct option is spread out. For a question with n options, over 300 seeds no index holds more than 1/n plus 15% of the answers: 65% for 2 options, 48% for 3, 40% for 4. A `fixedOrder` question is checked the other way round: each option is the right answer in at least 10% of seeds.
12. Option counts by the skill's grade: pre-K and kindergarten use at most 3. Grade 1 and above use up to 4. Reasoning (`all`) uses 3 at levels 1 and 2 and 4 at levels 3 and 4.
13. `facts` is present, holds every key its oracle needs, and `key` matches the facts.
14. `listen`: `prompt.text` does not contain the target named in `facts.target`, and no option or stimulus carries a `speak` label.
15. `read`: no visual that shows the words in `facts.read` carries a `speak` label, and `prompt.speak` does not contain those words.
16. Look-alikes that a screen font cannot tell apart never share a question: capital I with lowercase l or the digit 1, and the letter O with the digit 0.

Whether exactly one option is right is the oracle test's job, not `validateQuestion`'s.

### Distractor rules

Wrong options must be plausible mistakes, not random noise.

- **Counting:** answer plus or minus 1, then plus or minus 2, kept inside the skill's range and above zero.
- **Addition and subtraction:** off by one, the other operation's result, and one operand repeated.
- **Comparing:** groups never tie unless the skill teaches "equal". For "more" at level 1 the gap is at least 3, at level 3 the gap is 1.
- **Patterns:** offer the other elements of the same pattern. Never offer an option that could also continue the pattern.
- **Letters:** prefer look-alikes (b d p q, m n, u v, E F, O Q) from level 2 up.
- **Shapes and colours:** when the question is about shape, all options share one colour. When it is about colour, all share one shape.
- **Words:** distractors come from the same list and differ in the feature being tested.
- **Letter or number sorting:** never use O, I, l, S, Z or B, nor 0, 1, 2, 5 or 8. Each has a look-alike on the other side.
- **Number order:** numeral options are shown smallest to largest and are not shuffled. The right answer still moves, because it is a different numeral each time.
- **Plants and food:** these two groups never appear in the same question, because fruit and vegetables are both. Fish is never offered against the food group.
- **Number rules:** a "what is the rule" question always shows two example pairs, and the generator throws away any set that more than one rule fits. "2 is to 4" alone fits both plus 2 and double.
- **Mirror and turn:** only the L shape and the flag are used for mirror questions. Every other shape is its own mirror image, or looks like a turn of itself.

### Authored item banks (src/content/banks)

Some skills cannot be generated, such as reading a short passage. Those live in JSON files as arrays of `Question` objects without `seed`. Each carries `facts: { id }`, which gives it a key, and its skill names the `authored` oracle. A bank skill's generator picks one by `rng`. Banks are validated by the same `validateQuestion` at test time.

### More visuals the catalogue needs

These complete the visual set. Build them in Phase 4a with the rest.

| Kind or field | Fields | Draws |
| --- | --- | --- |
| `bar` | length in units, color | A horizontal or vertical bar, for comparing and ordering lengths |
| `array` | rows, cols, emoji | Objects in equal rows, for repeated addition |
| `tally` | count | Tally marks in bundles of five |
| `scale` | left: a list of numbers and at most one `blank`, right: a list of numbers | A balance scale sitting level, with number blocks on each pan |
| `foldPunch` | fold: `vertical` or `horizontal`, state: `folded` or `unfolded`, holes: a list of {col, row} | A paper square, folded with its punched holes, or unfolded with all its holes |
| `emojiGroup.layout` | adds `dice` | Dot positions as on a die, 1 to 6 |
| `emojiGroup.numbered` | boolean | A small count under each object, used in explanations |
| `emojiGroup.emoji2`, `count2` | a second emoji and its count | A second kind of object in the same group, for two-colour dot cards |
| `shape.shape` | adds `arrow`, `lShape`, `flag`, `pentagon`, `trapezoid` | The first three have no symmetry, so turns and flips are visible. The last two are for naming shapes by sides |
| `shape.flip` | boolean | Mirrors the shape left to right |
| `shape.open` | boolean | Draws the outline with a gap, for open and closed shapes |
| `matrix.cells` | 4 or 9 cells | A 3 by 3 grid for pattern completion |

**Paper folding.** The paper is a 4 by 4 grid of cells. Column 0 is at the left and row 0 is at the top. A `vertical` fold brings the right half over onto the left, so the folded paper shows columns 0 and 1. A `horizontal` fold brings the bottom half up onto the top, so the folded paper shows rows 0 and 1. A hole is always given as a cell of the half that shows. Unfolding a vertical fold copies each hole to column 3 minus its column. Unfolding a horizontal fold copies each hole to row 3 minus its row. Holes sit inside cells, never on the fold line.

**Coins.** Coins are drawn as SVG with their true relative sizes and colours: a copper penny, then nickel, dime and quarter in silver, with the dime smallest. The dime and quarter have ridged edges. Each face carries a simple emblem and no words or numbers, so the picture never gives away the name or the value: a shield on the penny, a domed building on the nickel, a torch on the dime, an eagle on the quarter. No portraits.

### Facts and oracles

Structure checks cannot tell whether the marked answer is true. Oracles do that.

- Every question carries `facts`: every value the generator chose, such as `{ a: 3, b: 4 }`.
- For `choice` and `multiSelect`, `facts.options` lists the plain value of each option in the order shown, such as `[2, 3, 4]`. It is left out of the `key`.
- Every skill names an `oracle`. An oracle is a small function in `tests/oracles/` that works out the right answer from `facts` alone, in the shape of the question type: one value, a set of values, an order, a bin for each item, or pairs.
- Generators never import oracles, and oracles never import generators or templates. Two separate pieces of code then have to agree.
- `tests/oracles.test.ts` runs every skill, level and 300 seeds. It fails if the marked answer differs from the oracle's, or if any wrong option is also right by the oracle.
- **A known limit.** The arithmetic and logic oracles are fully independent. The word-list oracles read the same section 9 lists as the generators. They catch a generator misusing a list, not a mistake in the list. The review sheet covers the lists.
- **When they are written.** Phase 1 writes the oracles marked P1. Every content phase writes any oracle it still needs first, with unit tests, before the first generator that uses it.

| Oracle | Facts it needs | Right answer | Phase |
| --- | --- | --- | --- |
| `count` | n | n | P1 |
| `add` | a, b, and c for three addends | a plus b (plus c) | P1 |
| `subtract` | a, b | a minus b | P1 |
| `missing` | a, b, total, blank | The value that makes a plus b equal total | P1 |
| `compare` | values, ask: `most`, `least`, `equal` or `sign` | Index of the greatest or least, whether all are equal, or the sign between two values | P1 |
| `order` | values | Indexes sorted smallest to largest | P1 |
| `sequence` | start, step, length, blankIndex | start plus step times blankIndex | P1 |
| `pattern` | unit, shown | unit at position shown modulo unit length | P1 |
| `attribute` | target, optionAttrs | Index of the option whose attribute equals the target | P1 |
| `oddOne` | optionAttrs | Index of the one option whose attribute differs from all the others | P1 |
| `sortBy` | itemAttrs, binAttrs | The bin for each item | P1 |
| `matchEqual` | leftValues, rightValues | The pairs whose values are equal | P1 |
| `twoStep` | a, op1, b, op2, c | a, then op1 b, then op2 c | Content |
| `multiply` | rows, cols, ask | rows times cols, or the matching repeated addition | Content |
| `makeTen` | a, b | "10 plus" a plus b minus 10 | Content |
| `series` | start, steps (a repeating list), blankIndex | The value at the blank | Content |
| `numberRule` | examples (pairs), base | The one rule among plus n, minus n and double that fits every example, applied to base. Fails when more than one rule fits | Content |
| `line` | min, step, index | min plus step times index | Content |
| `place` | hundreds, tens, ones, ask | The number, the digit, the value of a digit, or the expanded form | Content |
| `parity` | values | Even or odd for each value | Content |
| `time` | hour, minute | The time as text | Content |
| `money` | coins, ask | Sum of cents, the coin name, or the coin worth more | Content |
| `measure` | startUnit, lengthUnits | lengthUnits | Content |
| `graph` | values, ask | The value, the largest, the smallest, or the difference | Content |
| `fraction` | parts, equal, ask | Name of the fraction, or whether parts are equal | Content |
| `shapeFacts` | shape, ask: `sides`, `corners`, `name`, `solid`, `closed` | Looked up in a table inside the oracle | Content |
| `letter` | letter, ask: `upper`, `lower`, `next`, `before`, `kind` | The matching letter, the neighbour in the alphabet, or letter against number | Content |
| `wordSet` | target, relation | Looked up in the section 9 lists. Relations: `firstSound`, `firstLetter`, `lastLetter`, `middleVowel`, `rhyme`, `family`, `category`, `syllables`, `opposite`, `same`, `plural`, `partOfSpeech`, `describing`, `vowelLength`, `digraph`, `blend`, `vowelTeam`, `silentE`, `analogyPair`, `riddle`, `sentencePicture`, `sightWord` | Content |
| `spell` | word, parts | The word's letters in order, or its word parts for a compound word | Content |
| `sentence` | base, ask: `capital`, `period`, `both`, `endMark` | The correctly written sentence, or its end mark | Content |
| `analogy` | from, to, base | base with the same attribute change applied | Content |
| `matrix` | rowAttrs, colAttrs, blank | The cell that fits its row and column, for 2 by 2 and 3 by 3 | Content |
| `transform` | shape, startTurn, turns, flip | The quarter-turn position and flip of the result | Content |
| `fold` | fold, holes | The list of holes after unfolding | Content |
| `truth` | left, right | Whether the two sides are equal | Content |
| `authored` | none | Skipped by the oracle test. Covered by the review sheet only | Content |

**Which oracle each skill uses**

```text
Math PK  A.1-A.4 count      A.5-A.6 attribute   A.7 matchEqual   A.8 count
         B.1-B.2 compare    C.1-C.2 attribute   C.3 compare      D.1 oddOne
         D.2 pattern        D.3 sortBy
Math K   A.1-A.3 count      A.4-A.7 sequence    B.1-B.2 compare  B.3 order
         C.1-C.4 add        C.5-C.7 subtract    C.8-C.9 missing  C.10 add
         C.11 subtract      D.1 place           E.1-E.2 attribute
         E.3 shapeFacts     F.1 compare         F.2 sortBy (levels 1-2), compare (level 3)
         G.1 pattern
Math 1   A.1-A.2 sequence   A.3 place           A.4 compare      A.5 add, subtract
         B.1 add            B.2 subtract        B.3 add          B.4 makeTen
         B.5 missing        B.6 truth           B.7-B.8 add      B.9-B.10 add, subtract
         C.1 time           C.2 order           C.3 graph        C.4 money
         D.1 fraction       D.2 shapeFacts      E.1 sequence
Math 2   A.1-A.2 place      A.3 compare         A.4 sequence     A.5 parity
         A.6 line           B.1-B.2 add         B.3-B.4 subtract B.5 add
         B.6 subtract       B.7 add, subtract   B.8 multiply     B.9 add, subtract
         B.10 twoStep       C.1 time            C.2 money        C.3 measure
         C.4 graph          D.1 shapeFacts      D.2 fraction
ELA PK   A.1-A.2 letter     A.3 matchEqual      A.4 letter       A.5 sortBy
         B.1-B.3 wordSet    C.1-C.2 wordSet
ELA K    A.1 letter         A.2 matchEqual      B.1-B.4 wordSet  B.5 spell
         B.6 wordSet        B.7 sortBy          C.1-C.2 wordSet  C.3 wordSet, spell
         D.1 sentence       D.2 sortBy          D.3 wordSet      E.1 wordSet
ELA 1    A.1 wordSet        A.2 wordSet, spell  A.3-A.4 wordSet  A.5 sortBy
         B.1 wordSet, spell B.2 spell           B.3 wordSet      C.1 sortBy
         C.2 wordSet        C.3 sentence        D.1 authored
Reason.  A.1 oddOne         A.2 wordSet         A.3 analogy      A.4 matrix
         A.5-A.6 transform  A.7 pattern         A.8 numberRule   A.9 wordSet
         A.10 series        A.11 missing        A.12 fold        A.13 matrix
         A.14 wordSet
```

A skill with two oracles uses the first for its lower levels and the second where its question type or its ask changes. The generator names the oracle on each question through `facts.oracle` when it has more than one.

### Content review sheet

Tests cannot judge whether a question reads well to a child. A review sheet lets a person do that quickly.

- `npm run content:dump -- <batch>` writes `review/<batch>.md`. For each skill and level it prints 3 sample questions as plain text: the prompt, each option's label, the right answer and the explanation.
- At the end of every content phase Claude Code reads its own dump against the templates in section 8 and reports anything doubtful.
- You skim the same file. Ten minutes covers a batch.
- A dev-only route `/dev/review/:skillId` shows the same samples drawn with the real components.

## 6. Skill Score

The score runs 0 to 100, rises quickly at first, slows near the top, and climbs the last ten points two at a time. That mirrors how IXL's score feels. The numbers are an original design.

### Stages

| Score | Stage | Question level | Shown as |
| --- | --- | --- | --- |
| 0, never tried | Not started | 1 | Grey ring |
| 0 to 39 | Getting started | 1 | Light blue ring |
| 40 to 69 | Practising | 2 | Blue ring |
| 70 to 79 | Practising | 3 | Blue ring |
| 80 to 89 | Proficient | 3 | Green ring, ribbon |
| 90 to 99 | Challenge zone | 4 | Gold ring, flame |
| 100 | Mastered | 4 | Deep gold medal |

There are six stages and six stage colours, defined once in `tokens.css`.

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
5. **Mastery.** Reaching 100 sets `masteredAt` and schedules the first review. After that, extra practice never lowers the score. Only a failed review does (section 7). A failed review sets the score to 85, clears `masteredAt` and the review date, and puts the skill back in box 0. Awards already earned are kept.
6. **After a miss.** The next single question is one level easier, minimum level 1.
7. **Gentle mode** is on by default for pre-K and kindergarten profiles. A parent can switch it per child.
8. **Level asked.** Take the stage's level, lower it by one after a miss (rule 6), then clamp it to the skill's `maxLevel`. Many pre-K skills have two or three levels.
9. **Best score.** `bestScore` is the highest score the skill has reached. A milestone is celebrated only when a new score crosses it and `bestScore` was below it.

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

Also test: fifteen correct answers in a row from 0 reach exactly 100, and no sequence of 1,000 seeded random answers ever leaves the 0 to 100 range. A child who drops from 82 to 77 and climbs back past 80 crosses the 80 milestone once, not twice. A failed review of a mastered skill gives 85, no medal and box 0. A skill with `maxLevel` 2 is never asked at level 3.

## 7. Adaptive layer

Four pure modules decide what a child sees next: the diagnostic places them, recommendations pick three skills a day, review brings mastered skills back, and trouble spots flag where they are stuck.

### Open access, like IXL

Every skill is open to every child at all times. Nothing is locked. Prerequisites exist only to steer recommendations.

### Diagnostic (src/engine/diagnostic.ts)

A ladder is an ordered list of skill ids that build on each other across grades. The ladders are listed at the end of this section. The diagnostic covers Math and Language Arts and walks one ladder at a time. Reasoning is not diagnosed.

**Which ladders are walked.** A ladder is walked when it has 4 or more skills and its first skill is at or below the child's grade. On every other ladder no questions are asked, and the placement is the ladder's first skill at or above the child's grade.

**The walk.** The walk keeps the set of skills passed and the set failed. Positions are places on the ladder.

1. **Start** at the last placement if there is one. Otherwise start at the first skill of the child's grade on that ladder. If the ladder has no skill in that grade, start at the first skill of the next grade up that has one, or at the top skill if there is none.
2. **Test a skill** with 2 questions at level 2, clamped to the skill's `maxLevel`. Both correct is a pass. Both wrong is a fail. One of each: ask a third and let the majority decide.
3. **Keep the record consistent.** If a fail lands at or below an earlier pass, the fail wins and the passes at or above it are dropped.
4. **Pick the next skill.** With no fail yet, climb: 2 positions above the pass, then 4, then 8, stopping at the top skill. With no pass yet, go down the same way, stopping at the bottom skill. Once there is both a pass and a fail, test the middle untested skill between them, rounding down. A skill is never tested twice in one diagnostic.
5. **Stop** when the lowest fail sits directly above the highest pass, when the top skill is passed, when the bottom skill is failed, or after 14 questions (8 for pre-K).
6. **Placement** is the skill directly above the highest pass, the first skill if nothing passed, or none if the top skill passed.

Effects:

- Skills below the placement with a score under 80 are set to 80 and flagged `placedOut`, with `bestScore` raised to 80. An existing higher score is never lowered. Nothing is celebrated.
- The estimate is the grade of the placement skill, plus the share of that grade's skills on the ladder that sit below the placement. Show it as "Kindergarten, 40% through" when the ladder has 3 or more skills in that grade. With fewer, show "Working on" and the skill's name. When the top skill passed, show "Finished this ladder" and no estimate.
- A large "I don't know yet" button counts as wrong and keeps a child from guessing.
- A child can stop at any point. Progress is saved after every answer, so a stopped diagnostic picks up where it left off.
- Diagnostic answers are logged with kind `diagnostic`, with the same score before and after. They never change a Skill Score directly.
- Results store skill ids, never positions, so adding skills to a ladder later cannot move a saved placement.

### Today's picks (src/engine/recommend.ts)

`recommend(input)` returns up to 3 picks, each with a reason. Fill the list in this order:

| Priority | Reason | Rule |
| --- | --- | --- |
| 1 | `review` | A mastered skill whose `reviewDueAt` has passed. At most one pick |
| 2 | `plan` | The first unmastered skill in a plan assigned to this child |
| 3 | `troubleSpot` | A flagged skill. If any prerequisite is under 70, pick that prerequisite instead |
| 4 | `continue` | A skill scored 1 to 99 and practised in the last 14 days. Highest score first |
| 5 | `next` | The placement skill of each ladder. For a ladder with no placement yet, its first unmastered skill at or above the child's grade |

Variety rules: the three picks cover at least two strands when possible, never repeat a skill, and never lead with the skill from the child's last session. A skill whose next question would be a `listen` question is left out while the device is muted or has no voice. Retired skills and catalogue rows with no generator yet are never picked.

### Trouble spots

A skill is flagged when all three are true:

- It has 5 or more attempts in the last 14 days.
- Under 60% of its recent answers are correct. "Recent" is the last 10 answers, or all of them when there are fewer than 10.
- Its score is under 80.

Five right out of five is 100%, so a child who is doing well is never flagged for having answered only a few.

### Spaced review (src/engine/review.ts)

- Intervals by box: 2, 5, 12, 30, 60 days.
- Mastering a skill puts it in box 0, due in 2 days.
- A skill is due once today's local day reaches the local day of `reviewDueAt`. The time of day does not matter, so a child who practised at 5 pm on Monday can review at 9 am on Wednesday.
- A review asks 3 questions at level 3, clamped to the skill's `maxLevel`. A review session covers up to 4 due skills.
- 3 correct: move up one box, staying in box 4 at the top. 2 correct: stay in the box. Either way the next due date is today plus that box's interval.
- 0 or 1 correct: the skill drops to a score of 85, loses its medal, returns to box 0 with no due date, and goes back to normal practice.
- Review answers are logged with kind `review`. Apart from that drop to 85, they never change the score.

Every attempt is logged with a timestamp, so a research-grade scheduler such as FSRS, or Bayesian knowledge tracing, can replace these rules later without losing history.

### Ladders

A ladder holds only skills that truly build on each other. Telling time and counting coins both sit in measurement, yet neither prepares a child for the other, so they are separate ladders. Skills run in the order listed. `src/content/ladders.ts` stores each ladder as a list of skill ids.

| Subject | Ladder | Skills, in order |
| --- | --- | --- |
| Math | counting | Pre-K A.1 to A.8, K A.1 to A.7, grade 1 A.1 to A.2, grade 2 A.4 |
| Math | comparing | Pre-K B.1 to B.2, K B.1 to B.3, grade 1 A.4, grade 2 A.3, grade 3 A.3 |
| Math | add-subtract | K C.1 to C.11, grade 1 B.1 to B.10, grade 2 B.1 to B.10, grade 3 B.1 to B.4 |
| Math | place-value | K D.1, grade 1 A.3 and A.5, grade 2 A.1, A.2, A.6, grade 3 A.1, A.2, A.4 |
| Math | shapes | Pre-K C.1 to C.2, K E.1 to E.3, grade 1 D.2, grade 2 D.1, grade 3 G.1 |
| Math | length | Pre-K C.3, K F.1, grade 1 C.2, grade 2 C.3, grade 3 F.4, F.3 |
| Math | patterns | Pre-K D.1 to D.3, K G.1, grade 1 E.1, grade 2 A.5, grade 3 A.5 |
| Math | data | K F.2, grade 1 C.3, grade 2 C.4, grade 3 F.6, F.7 |
| Math | time | Grade 1 C.1, grade 2 C.1, grade 3 F.1, F.2 |
| Math | money | Grade 1 C.4, grade 2 C.2 |
| Math | fractions | Grade 1 D.1, grade 2 D.2, grade 3 G.2, E.1 to E.4 |
| Math | multiply-divide | Grade 3 C.1 to C.6, D.1 to D.3, C.7 (grade 2 B.8 stays on add-subtract, where saved placements already point) |
| Math | measures | Grade 3 F.5 |
| Language Arts | letters | Pre-K A.1 to A.5, K A.1 to A.2 |
| Language Arts | sounds | Pre-K B.1 to B.3, K B.1 to B.3, K B.6 |
| Language Arts | phonics | K B.4, B.5, B.7, grade 1 A.1 to A.5, grade 2 A.1 to A.3 |
| Language Arts | sight-words | K C.1 to C.3, grade 1 B.1 |
| Language Arts | grammar | K D.1 to D.3, grade 1 C.1 to C.3, grade 2 C.1 to C.4 |
| Language Arts | vocabulary | Pre-K C.1 to C.2, grade 1 B.2 to B.3, grade 2 B.1 to B.5 |
| Language Arts | reading | K E.1, grade 1 D.1, grade 2 D.1 to D.3 |
| Reasoning | figures | A.1 to A.7, A.12, A.13 |
| Reasoning | words-numbers | A.9, A.14, A.8, A.10, A.11 |

**Prerequisites come from ladders.** A skill's default prerequisite is the skill before it on its ladder, across grades. The first skill on a ladder has none. A catalogue row may add more. Prerequisites never come from a skill's position in its lettered category, because a category can mix unrelated ideas.

**Reasoning ladders are an order, not a staircase.** Odd one out does not prepare a child for paper folding. The two reasoning ladders only set the order in which picks offer the skills, easiest style first. They are never walked by the diagnostic, and every child starts at the first skill of each.

**Catalogue growth.** The code holds a `CATALOGUE_VERSION` number, raised in every content phase. On start, when it is higher than the device record's `catalogueVersion`, the app goes through each child's saved placements. Any skill that now sits below a placement on its ladder and has no saved state is placed out at 80. Then the device record is updated. A grade 1 skill added in a later phase therefore lands on the right side of every child's placement.

### Short sittings

A full diagnostic is far too long for one go, so it runs as short sittings over several days.

- One sitting covers one subject and ends at 12 questions for pre-K, 16 for kindergarten, 20 above that, or after 8 minutes, whichever comes first.
- A sitting works through the subject's ladders in the order of the table above. It may stop part-way through a ladder and pick it up next time. It ends with a sticker.
- The first visit opens sitting 1 in math. After that the home screen offers at most one "check-in" sitting per local day, swapping between math and Language Arts, until every walked ladder is placed.
- Expected length: a pre-K child has 5 math ladders and 3 Language Arts ladders to walk, about 5 sittings. A grade 2 child has up to 13, about 8 sittings.
- Picks work from the first day. Ladders not yet placed start at the child's grade.
- A parent can restart the diagnostic for one subject from settings. That clears the saved progress and results for the subject. It does not touch Skill Scores.

## 8. Skill catalogue

The launch catalogue holds 140 skills, organised the way IXL organises them: subject, grade, lettered category, numbered skill.

### Catalogue row (src/content/catalogue.ts)

```ts
interface Skill {
  id: string;          // 'M-K-C4' = Math, Kindergarten, category C, skill 4
  subject: 'math' | 'ela' | 'reasoning';
  grade: SkillGrade;   // 'PK', 'K', '1', '2', or 'all' for Reasoning
  category: string;    // 'C. Addition'
  code: string;        // 'C.4', shown to the child and parent
  name: string;        // 'Add to 10'
  strand: string;      // reporting group
  ladder: string;      // ladder id, section 7
  icon: Visual;        // picture tile for children who cannot read yet
  speakName: Say;      // short spoken name, such as 'Count to five'
  version: number;     // starts at 1; bump when any seed's output changes
  itemTypes: ItemType[];
  maxLevel: 1 | 2 | 3 | 4;
  prereqs: string[];   // extra prerequisites, on top of the ladder default in section 7
  retired?: true;      // hidden from children, history kept
  ccss?: string;       // Common Core code where one applies
  vaSol?: string;      // Virginia SOL code, filled in a later content pass
  video?: { youtubeId: string; title: string; source: string; seconds: number };  // curated in Phase 12
}
```

Ids: the subject letter is `M`, `E` or `R`. The grade part is `PK`, `K`, `1` or `2`. Reasoning has no grade part, so its ids look like `R-A4`.

Standards note: Virginia does not use Common Core. It uses its own Standards of Learning, revised in 2023, with strands NS, CE, MG, PS and PFA. The build ships with Common Core codes because they are stable and well documented. Mapping each skill to a Virginia code from the VDOE documents is a content task after Phase 11.

### How to read the tables

- **Type** is the question type from section 5. A level marked "typed" uses `numberPad`. A level that names another type, such as "sort:" or "tiles:", uses that type. Every other level uses the first type listed.
- **Rule** gives the levels in order, separated by slashes. A skill with fewer than four levels stops early.
- **Prerequisites** come from the ladder: each skill depends on the one before it on its ladder (section 7), not on the one before it in its category.
- Strands: CC counting, OA operations, NBT place value, MD measurement and data, G geometry, PA patterns.
- Spoken prompts are written out in words. For a `look` question the on-screen prompt is the same sentence.
- **Listen skills** hide the target on screen and give no spoken labels to options: Math pre-K A.5 and A.6. Language Arts pre-K A.1 and A.2, kindergarten C.1 to C.3, grade 1 A.3 (levels 1 and 2) and B.1.
- **Read skills** never speak the words to be read: Language Arts kindergarten B.4, B.6, B.7, D.1, D.3 (level 2) and E.1. Grade 1 A.3 (level 3), A.4, A.5, B.3, C.1, C.2, C.3 and D.1.
- **Fixed places.** True and False, the signs greater, less and equal, and the end marks use `fixedOrder`.
- **Small levels.** A level with fewer than 8 different questions declares its `pool`. Examples: cube or sphere, the four coins, count to 3.

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
| D.1 | Which one is different | PA | choice | Two alike and one different by colour / by shape / by size. Uses `twins` |
| D.2 | What comes next: AB patterns | PA | choice | AB by colour / by shape / by picture |
| D.3 | Sort into two groups | PA | sort | 4 items by colour / by shape / 6 items by size |

### Math, kindergarten (28 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Count to 20 | CC | choice, numberPad | 6 to 12 in rows of five / 11 to 20 / typed / scattered to 20, typed |
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
| C.4 | Add to 10 | OA | choice, numberPad | Sums to 7 / to 10 / typed / missing sum on the left, typed |
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
| F.2 | Sort and count | MD | sort, choice | Sort 5 items into 2 groups / sort 6 items / choice: a picture already sorted, which group has more |
| G.1 | Patterns: AAB, ABB, ABC | PA | choice | ABB or AAB / ABC / blank in the middle |

### Math, grade 1 (22 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Count to 120 | CC | choice, numberPad | Next number to 50 / to 100 / across 100, typed / before and after to 120, typed |
| A.2 | Skip count by 2s, 5s, 10s | CC | choice, numberPad | By 10s / by 5s / by 2s / missing number anywhere, typed |
| A.3 | Tens and ones | NBT | choice, numberPad | Blocks to numeral, to 30 / to 99 / typed / "how many tens in 47", typed |
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
| D.2 | Shape attributes | G | choice, multiSelect | Pick the shape with 4 sides / multiSelect: pick all with 3 corners / choice: closed or open shape |
| E.1 | Number patterns | PA | choice, numberPad | Plus 1 and plus 2 rows / plus 5, plus 10 / minus patterns, typed |

### Math, grade 2 (22 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Hundreds, tens, ones | NBT | choice, numberPad | Blocks to numeral to 199 / to 999 / typed / choice: value of a digit |
| A.2 | Expanded form | NBT | choice, numberPad | 300 plus 40 plus 2 to numeral / numeral to expanded / with zeros, typed |
| A.3 | Compare three-digit numbers | NBT | choice | Different hundreds / same hundreds / pick the sign |
| A.4 | Skip count by 5s, 10s, 100s | NBT | choice, numberPad | By 100s / by 10s from any number / by 5s, typed |
| A.5 | Even and odd | OA | choice, sort | Pairs of objects to 10 / numerals to 20 / sort: numerals to 100 |
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
| D.1 | Name shapes by sides | G | choice | Triangle or four-sided shape (square, rectangle, trapezoid, diamond) / pentagon, hexagon / pick by number of corners |
| D.2 | Halves, thirds, fourths | G | choice | Name the fraction shown / pick the shape showing thirds / equal shares of different shapes |

### Language Arts, pre-K (10 skills)

Strands: LT letters, PH sounds and phonics, WD words, GR grammar, RD reading.

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Find the uppercase letter | LT | choice | Hear a letter name, 2 options / 3 options / look-alike letters |
| A.2 | Find the lowercase letter | LT | choice | 2 options / 3 options / look-alikes: b d p q |
| A.3 | Match uppercase and lowercase | LT | match | 3 pairs, different shapes (A a, B b) / 3 pairs with look-alikes |
| A.4 | Find the same letter | LT | choice | See a letter, tap its twin: 2 options / 3 options / look-alikes |
| A.5 | Letter or number | LT | sort | 4 items / 6 items. Never the look-alikes listed under Distractor rules |
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
| B.3 | Middle vowel | PH | choice | Picture, spoken word, and the word with its vowel missing. Words with a, i or o, 3 options / all short vowels, 3 options that include the closest sound (e with i, o with u) |
| B.4 | Read a word, pick the picture | PH | choice | Short a words / all short vowels / words that differ by one letter |
| B.5 | Spell a word | PH | tiles | Picture and spoken word: 3 tiles in order plus 2 extra / plus 4 extra |
| B.6 | Rhyming words | PH | choice | Written words: which rhymes with cat / pick the one that does not rhyme |
| B.7 | Word families | PH | sort | Sort 4 words into two families / 6 words |
| C.1 | Sight words, set 1 | WD | choice | Hear a word, tap it: 3 options very different / similar length / same first letter |
| C.2 | Sight words, set 2 | WD | choice | Same rule as C.1 |
| C.3 | Sight words, set 3 | WD | choice, tiles | Levels 1 to 3 as C.1 / tiles: spell it |
| D.1 | Capitals and periods | GR | choice | Pick the correctly written sentence, built from the telling sentences in section 9: capital / period / both |
| D.2 | Naming words | GR | sort | Sort pictures with words into people, animals, things: 4 items / 6 items |
| D.3 | One and more than one | GR | choice | Picture of one or many, pick cat or cats / written only. Skips words whose plural looks the same, such as fish |
| E.1 | Read a sentence | RD | choice | A sentence from the sentence-picture list in section 9, pick the matching picture: 2 options / 3 options |

### Language Arts, grade 1 (12 skills)

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Digraphs: sh, ch, th, wh | PH | choice | Picture and word with a blank, pick the digraph: at the start / at the end (sh, ch and th only) |
| A.2 | Consonant blends | PH | choice, tiles | Pick the starting blend / pick the ending blend / spell with tiles |
| A.3 | Silent e | PH | choice | Hear a word, pick cap or cape / hear a word, pick it from 3 / see a picture, pick its word |
| A.4 | Vowel teams | PH | choice | ai, ee, oa words to pictures / pick the missing team |
| A.5 | Short or long vowel | PH | sort | Sort 4 words / 6 words |
| B.1 | Sight words, set 4 | WD | choice, tiles | Hear and tap / spell with tiles |
| B.2 | Compound words | WD | tiles | Picture and spoken word, build it from 2 word tiles: 2 extra tiles / 4 extra tiles |
| B.3 | Opposites and same meanings | WD | choice | Opposites / same meaning / mixed |
| C.1 | Naming and action words | GR | sort | Sort 4 words into nouns and verbs / 6 words |
| C.2 | Describing words | GR | choice | Pick the describing word in a sentence from section 9 / pick the describing word that fits a picture |
| C.3 | End marks | GR | choice | Period or question mark / adds exclamation mark |
| D.1 | Read a short story | RD | choice | Authored bank: 3-sentence story, who or what question / why question |

### Math, grade 3 (32 skills)

Added on Nov 17, 2026, at the owner's request, to raise the ceiling for a child ahead of grade 2. Spoken numbers go up to 10,000 from here (`numberWords`).

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | Thousands, hundreds, tens, ones | NBT | choice, numberPad | Blocks to numeral to 1,999 / to 9,999 / typed / choice: value of a digit |
| A.2 | Number names to 10,000 | NBT | choice | Words to numeral, no zeros / with a zero / numeral to words |
| A.3 | Compare four-digit numbers | NBT | choice, order | Different thousands / same thousands / pick the sign / order: 3 numbers, smallest first |
| A.4 | Round to 10 and 100 | NBT | choice, numberPad | Nearest ten, on a number line / nearest ten / nearest hundred / typed, either |
| A.5 | Number patterns | OA | choice, numberPad | Count by 2, 5, 10 / by 3, 4, 6, 25, up or down / by 50 or 100 to 1,000, typed |
| B.1 | Add within 1,000, regrouping | NBT | choice, numberPad | One regroup / two regroups / typed |
| B.2 | Subtract within 1,000, regrouping | NBT | choice, numberPad | One regroup / two regroups / two regroups, typed (never across a zero, whose explanation needs a step of its own) |
| B.3 | Estimate sums and differences | NBT | choice | Round both to tens, then add / to hundreds, then add or subtract / is the answer reasonable |
| B.4 | Two-step word problems | OA | numberPad | Add and subtract / with one multiplication / with one division |
| C.1 | Equal groups | OA | choice, numberPad | Groups picture to "3 groups of 4" / to 3 × 4 / how many in all, typed |
| C.2 | Arrays | OA | choice, numberPad | Array to rows times columns / product, typed / 3 × 4 is the same as 4 × 3 |
| C.3 | Multiply by 2, 5 and 10 | OA | choice, numberPad | By 2 and 10 / by 5 / mixed, typed |
| C.4 | Multiply by 3 and 4 | OA | choice, numberPad | By 3 / by 4 / mixed, typed |
| C.5 | Multiply by 6, 7, 8 and 9 | OA | choice, numberPad | By 6 and 7 / by 8 and 9 / mixed, typed |
| C.6 | Missing factor | OA | choice, numberPad | ? × 4 = 12 with a picture / no picture / typed |
| C.7 | Times multiples of 10 | NBT | choice, numberPad | 3 × 20 with tens rods / 3 × 40 / typed, to 9 × 90 |
| D.1 | Share equally | OA | choice, numberPad | Share a picture group into 2 or 3 / into up to 5 / typed |
| D.2 | Division facts | OA | choice, numberPad | Divide by 2, 5, 10 / by 3, 4 / by 6 to 9, typed |
| D.3 | Fact families | OA | choice | Pick the division that goes with 3 × 4 = 12 / the missing member / which does not belong |
| E.1 | Name fractions | NF | choice | Unit fractions of a shape / any fraction of a shape / of a set of objects |
| E.2 | Fractions on a number line | NF | choice | Halves and fourths / thirds and sixths / eighths |
| E.3 | Compare fractions | NF | choice | Same bottom number / same top number / pick the sign |
| E.4 | Equal fractions | NF | choice | Pictures side by side / on number lines / pick the equal one |
| F.1 | Time to the minute | MD | choice | Read the clock / match time to clock / quarter past and quarter to |
| F.2 | Elapsed time | MD | choice, numberPad | Whole hours later / half hours / minutes later, typed |
| F.3 | Area | MD | choice, numberPad | Count square units / rows times columns / typed |
| F.4 | Perimeter | MD | choice, numberPad | Add the sides on a grid / rectangle with two sides given / typed |
| F.5 | Mass and volume | MD | choice | Pick the sensible unit (grams, kilograms, liters) / read a balance / how much more, of two |
| F.6 | Scaled graphs | MD | choice, numberPad | Picture graph, one picture is 2 / bar graph with steps of 5 / how many more, typed |
| F.7 | Line plots | MD | choice, numberPad | How many at one length, in halves / which length has the most / how many in all, in fourths, typed |
| G.1 | Quadrilaterals | G | choice | Which is a quadrilateral / which is not / square, rectangle or trapezoid from a clue (read) |
| G.2 | Equal-area parts | G | choice, numberPad | What fraction is one equal part / which shape is cut into equal parts / how many parts make the whole, typed |

A.5, C.7, F.7, G.1 and G.2 are the five Common Core standards the Nov 17 audit found missing (3.OA.D.9, 3.NBT.A.3, 3.MD.B.4, 3.G.A.1, 3.G.A.2).

### Language Arts, grade 2 (15 skills)

Added on Nov 17, 2026, with Math grade 3. Compound words are already Grade 1 B.2, so grade 2 has homophones in their place.

| Code | Skill | Strand | Type | Rule by level |
| --- | --- | --- | --- | --- |
| A.1 | More vowel teams | PH | choice | ai, ay, ee, ea, oa, ow words to pictures / pick the missing team / igh and ie |
| A.2 | Bossy r: ar, or, er, ir, ur | PH | choice | ar or or / er, ir, ur sound the same: pick the spelling / mixed |
| A.3 | Two-syllable words | PH | choice | How many parts / pick where it splits / pick the word made of two parts |
| B.1 | Prefixes un and re | WD | choice | Pick the meaning of unhappy / pick the word that means "do again" / mixed |
| B.2 | Suffixes ful, less, er, est | WD | choice | Pick the meaning / pick the word that fits a sentence / mixed |
| B.3 | Contractions | WD | choice | Pick the contraction for two words / pick the two words / in a sentence |
| B.4 | Synonyms and antonyms | WD | choice | Same meaning / opposite / mixed, harder words |
| B.5 | Homophones | WD | choice | Pick the right word for a sentence: to, two, too; there, their; for, four / mixed |
| C.1 | Nouns, verbs, adjectives | GR | sort | Sort 3 words into 3 groups / 6 words |
| C.2 | Plurals | GR | choice | Add s or es / change y to ies / irregular: mice, feet, children |
| C.3 | Past tense | GR | choice | Add ed / irregular: ran, saw, went / in a sentence |
| C.4 | Punctuation | GR | choice | Capitals for names / commas in a list / apostrophe for owning |
| D.1 | Read a story | RD | choice | Authored bank: 5-sentence story, who or what / why |
| D.2 | Main idea | RD | choice | Authored bank: pick the best title / pick what it is mostly about |
| D.3 | Order of events | RD | order | Authored bank: put 3 events in order / 4 events |

### Added on Nov 17, 2026: curriculum gaps (built after Grade 3 Math and Grade 2 Language Arts)

The owner asked whether the app covers what curriculums teach. A check of each skill's Common Core tag against the Common Core lists found these gaps, and he chose to fill them. Rules by level are written when each is built, the same way as the tables above.

**Grade 3 Math, 5 more skills (Grade 3 becomes 32):** times a multiple of 10 (3.NBT.A.3), number patterns in the addition and times tables (3.OA.D.9), line plots with halves and fourths (3.MD.B.4), sorting quadrilaterals (3.G.A.1), shapes cut into equal-area parts (3.G.A.2).

**Math K to 2, about 12 skills:** position words, above, below, beside, next to (K.G.A.1); what can be measured (K.MD.A.1); shapes made from shapes (K.G.B.6, 1.G.A.2); order does not matter, 3 + 5 = 5 + 3 (1.OA.B.3); subtraction as a missing number (1.OA.B.4); count on to add (1.OA.C.5); measure in units, lining up (1.MD.A.2); add up to four numbers (2.NBT.B.6); measure in two units, estimate length, compare lengths (2.MD.A.2 to 2.MD.A.4); line plots (2.MD.D.9); rectangles split into rows and columns of squares (2.G.A.2).

**Reading comprehension K to 2, about 10 skills, from written story and fact banks:** characters and setting (RL.K.3, RL.1.3); retell in order (RL.1.2, RL.2.2); true or false from a story; the main topic of a fact text (RI.1.2, RI.2.2); facts from a short fact text (RI.K.1, RI.1.1); word meaning from the sentence around it (L.2.4.a).

**Harder Reasoning:** each of the 14 puzzles gets difficulty steps by age, and the missing puzzle types of gifted-screening tests are added (verbal analogies, number puzzles, figure matrices), so an able child keeps being stretched.

Built on Nov 17, 2026 (phase G):

| Skill | Code | Rule by level |
| --- | --- | --- |
| M-K-E4 | Position words (K.G.A.1) | Above or below / above, below or next to / which picture shows it |
| M-K-E5 | Shapes made from shapes (K.G.B.6) | Two pieces make which shape / up to six pieces / which pieces make it |
| M-K-F3 | What can be measured (K.MD.A.1) | What a ruler or scale tells / and a measuring cup / which tool to use |
| M-1-B11 | Order does not matter (1.OA.B.3) | 3 + 5 = 5 + ? / which is the same as 4 + 7 / typed, to 20 |
| M-1-B12 | Subtract by thinking of adding (1.OA.B.4) | With a picture, to 10 / without, to 20 / typed |
| M-1-B13 | Count on to add (1.OA.C.5) | Count on 1 or 2 on a number line / count on 3 / typed |
| M-1-C5 | Measure with paper clips (1.MD.A.2) | Count the clips / which row is lined up right / how many clips longer, typed |
| M-1-D3 | How many pieces make a shape (1.G.A.2) | Two-piece shapes and 4 triangles / up to 6 pieces / typed |
| M-2-B11 | Add up to four numbers (2.NBT.B.6) | Three numbers to 30 / four two-digit numbers to 100 / typed |
| M-2-C5 | Inches, feet and centimeters (2.MD.A.1 to A.3) | Inches or feet / which number is bigger or smaller / about how long |
| M-2-C6 | Compare lengths (2.MD.A.4) | Which is longer / how much longer / typed |
| M-2-C7 | Line plots (2.MD.D.9) | How many at one length / which length has the most / how many in all, typed |
| M-2-D3 | Rows and columns of squares (2.G.A.2) | How many squares / how many rows or columns / typed |
| E-K-E2 | Characters and setting, heard (RL.K.3) | Who / where |
| E-K-E3 | Facts from a text, heard (RI.K.1) | A fact from the first sentence / from a later one |
| E-1-D2 | Characters and setting (RL.1.3) | Who / where |
| E-1-D3 | Retell in order (RL.1.2) | Put 3 events in order / what happened last |
| E-1-D4 | True or false (RL.1.1) | Is this true / which sentence is true |
| E-1-D5 | Fact texts (RI.1.2) | Main topic / a fact from it |
| E-2-D4 | Retell a story (RL.2.2) | The best retelling / what happened in the middle |
| E-2-D5 | Fact texts (RI.2.2) | Main topic / a fact from it |
| E-2-D6 | Words in context (L.2.4.a) | What the word means / which word means it |

Phase I, part 1 (built Nov 17, 2026): Reasoning A.15 Word analogies (opposites and homes / babies, what animals give, colours / parts and tools with a near miss), A.16 Which word does not belong (a far group / a close group / five words), A.17 Number grids (rows count up by 1 / by a step / the first two add to the third). Part 2 adds a harder top level to each of A.1 to A.14.

Phase H (built Nov 17, 2026): the skill tables of its five waves are in `docs/waves/h1.md` to `docs/waves/h5.md` (170 skills in all).

Not covered, and not planned: writing and speaking, which a tapping app cannot mark; Virginia's own standards, not yet mapped (the `vaSol` field is empty).

### Reasoning (14 skills, all grades)

These follow the figure-based style of gifted-screening tests. All share the strand RS and use the `shape`, `sequence` and `matrix` visuals. Reasoning skills have grade `all`: one page with no grade tabs, and one awards board.

| Code | Skill | Type | Rule by level |
| --- | --- | --- | --- |
| A.1 | Odd one out | choice | 3 pictures, one from another group / 3 pictures from closer groups / 4 shapes, three the same and one differing by one attribute (`twins`) / 4 different shapes, three sharing a hidden rule: corners, colour or shape |
| A.2 | Which belongs | choice | Two examples from a group, pick a third / closer distractors / three examples, 4 options: two close, one far |
| A.3 | Figure analogies | choice | Big red circle is to small red circle as big blue square is to blank: one attribute changes / two change / three of four change (shape, colour, size, how many) |
| A.4 | Figure matrices | choice | 2 by 2 grid, rows share shape and columns share colour / size and count / rotation / 3 by 3, rows share colour, each row and column holds every shape once |
| A.5 | Turning shapes | choice | Next quarter turn of an arrow / of an L shape / skipping a turn / a quarter turn and a change of colour each step. Colour and starting turn vary |
| A.6 | Mirror images | choice | Pick the mirror of a flag / of an L shape / the wrong options are turned copies / two pieces in two colours: they swap and each flips |
| A.7 | Two-rule patterns | choice | Colour and size alternate on different beats / colour and shape / colour, size and a cycle of three shapes |
| A.8 | Number analogies | choice, numberPad | Two example pairs, then a third to finish: plus n / double / typed / times 3 to 5, or double then add or take away, typed |

### Adding skills later

Grades 3 to 5 and new subjects need no engine changes. Each new skill is one catalogue row plus one generator file, and the generator suite tests it automatically. Add them in batches of 10 to 16 with the content gate, and raise `CATALOGUE_VERSION` each time.

### More reasoning skills

Six more skills round out the reasoning set to cover picture, number and spatial question styles. Reasoning questions use 3 options at levels 1 and 2 and 4 options above that.

| Code | Skill | Type | Rule by level |
| --- | --- | --- | --- |
| A.9 | Picture analogies | choice | "Sock is to foot as glove is to blank": wrong options from other relations / from the same relation / backwards ("Foot is to sock as hand is to blank"), 4 options |
| A.10 | Number series | choice, numberPad | Plus 1 or plus 2 / plus 5, plus 10 or minus 1 / steps that alternate, typed / jumps that grow, or times 2 or 3, typed |
| A.11 | Number puzzles | choice, numberPad | Balance scale: 3 and blank balance 5 / both pans hold sums / typed / two or three boxes that hold the same number, typed |
| A.12 | Paper folding | choice | One fold, one hole at an outer corner / one hole next to the fold / two holes / three holes |
| A.13 | Pattern completion | choice | 3 by 3 striped tile with a missing corner / checkerboard with a missing middle / two attributes / every shape and colour once in each row and column, middle missing |
| A.14 | Picture riddles | choice | Spoken riddle with 2 pictures / 3 pictures / 4 pictures |

### Prompt and explanation templates

Every generator uses its family's wording. Text in braces is filled from `facts`. The "Remember" line is the rule the lesson ends on.

| Family | Prompt | Explanation | Remember |
| --- | --- | --- | --- |
| Count objects | How many {things} are there? | Let's count. {1, 2, ... n}. There are {n} {things}. | Touch each one once and say one number. |
| Tap that many | Tap {n} {things}. | Count as you tap. {1, 2, ... n}. Stop at {n}. | Stop when you say the number. |
| Find the number | Spoken: Find the number {n}. On screen: Find the number. | This is {n}. | Every number has its own shape. |
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
| Add | {a} plus {b} equals what? | Within 20: Start at {bigger}. Count on {smaller} more. {sum}. Larger numbers use the place-value rows in the next table. | Start with the bigger number. |
| Subtract | {a} take away {b} equals what? Grade 1 and up say "minus". | Within 20: Start with {a}. Take away {b}. {difference} are left. Larger numbers use the place-value rows in the next table. | Subtracting takes some away. |
| Make 10 | How many more to make 10? | {a} boxes are full. {b} are empty. {a} and {b} make 10. | Know your pairs that make 10. |
| Break apart | {n} is {a} and what? | {a} and {b} make {n}. | A number can split in many ways. |
| Teen numbers | 10 and {k} more is what number? | A full ten and {k} more is {10+k}. | Teen numbers are ten and some more. |
| Stories | The story from section 9. | {a} {plus or take away} {b} is {answer}. | Listen for joining or taking away. |
| Tens and ones | What number is this? | {t} tens is {10t}. {o} more ones makes {n}. | Count tens first, then ones. |
| Time | What time is it? | On the hour: The long hand points to 12. The short hand points to {h}. It is {h} o'clock. Half past: The long hand points to 6. The short hand is halfway between {h} and {h+1}. It is half past {h}. Other times: The short hand is just past {h}. The long hand points to {k}. Count by fives to {m}. It is {h} {m}. | Short hand shows the hour. |
| Coins | Which coin is this? | This is a {coin}. It is worth {v} cents. Look at its size, its colour and its picture. | Each coin has its own size and value. |
| Graphs | How many chose {x}? | Find {x}. Count its row. {n}. | Read one row at a time. |
| Equal shares | Which shape shows {halves}? | {halves} are {k} equal parts. | Equal parts are the same size. |
| Find the letter | Spoken: Find the letter {L}. On screen: Find the letter. | This is the letter {L}. | Every letter has a name. |
| First sound | Which one starts like {word}? | {word} and {answer} start with the same sound. | Listen to the very start. |
| Rhymes | Which one rhymes with {word}? | {word} and {answer} end the same way. They rhyme. | Rhymes sound the same at the end. |
| Syllables | How many claps in {word}? | The whole word is spoken. The screen shows it split into its parts, with one clap sound for each part. {n} claps. | Each clap has one vowel sound. |
| Sight words | Spoken: Find the word {w}. On screen: Find the word. | This word is {w}. | Some words we know by sight. |
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

### More templates

These cover every family the first table leaves out. Solid facts: a cube has 6 square faces. A sphere is round like a ball. A cone has a point and a round base. A cylinder has two round ends.

| Family | Prompt | Explanation | Remember |
| --- | --- | --- | --- |
| Put numbers in order | Put the numbers in order, smallest first. | {a} is the smallest. Then {b}. Then {c}. | Smaller numbers come first when we count. |
| Order by length | Put them in order, shortest first. | This one is the shortest. This one is the longest. | Line up one end, then look at the other. |
| Skip counting | What comes next? | We are counting by {step}s. {..., ...}. Next is {answer}. | Add the same amount each time. |
| Missing number in a row | Which number is missing? | Count along the row. The missing number is {answer}. | Count on from a number you know. |
| Missing part | {a} plus what equals {total}? | Start at {a}. Count up to {total}. That is {answer} more. | Count up to find the missing part. |
| True or false | Is this true? | The left side is {x}. The right side is {y}. They are {the same or not the same}. | Both sides must be the same amount. |
| Doubles | {a} plus {a} equals what? | Two groups of {a} make {sum}. | Doubles are two of the same. |
| Make ten to add | {a} plus {b}. Make a ten first. Which one is the same? | Move {k} from the {b} to the {a}. Now it is 10 and {r}. | Fill the ten first. |
| Hundreds, tens, ones | What number is this? | {h} hundreds is {100h}. {t} tens is {10t}. {o} ones. That makes {n}. | Hundreds, then tens, then ones. |
| Expanded form | {300} plus {40} plus {2} is what number? | {h} hundreds, {t} tens and {o} ones is {n}. | Each digit has its own place. |
| Compare with signs | Which sign goes between {a} and {b}? | Look at the biggest place first. {a} has more {hundreds or tens}. {a} is greater than {b}. | Compare the biggest place first. |
| Add, no regrouping | {a} plus {b} equals what? | Add the ones: {x} plus {y} is {z}. Add the tens. The answer is {sum}. | Ones with ones, tens with tens. |
| Add, regrouping | {a} plus {b} equals what? | Add the ones: {x} plus {y} is {z}. That is 1 ten and {r} ones. Add the tens and the extra ten. {sum}. | Ten ones make one ten. |
| Subtract, no regrouping | {a} minus {b} equals what? | Take away the ones. Take away the tens. {difference}. | Ones from ones, tens from tens. |
| Subtract, regrouping | {a} minus {b} equals what? | There are not enough ones. Trade 1 ten for 10 ones. Take away the ones, then the tens. {difference}. | Trade a ten when you need more ones. |
| Ten or a hundred more or less | What is {10} more than {n}? | Only the {tens} digit changes. {answer}. | Ten more changes the tens. |
| Even and odd | Is {n} even or odd? | Make pairs. {Every one has a partner, or one is left over}. {n} is {even or odd}. | Even numbers make pairs with none left over. |
| Number line | Which number is at the dot? | The marks go up by {step}. Count along. The dot is at {answer}. | Find the size of each jump first. |
| Arrays | How many in all? | There are {rows} rows of {cols}. {cols} plus {cols} is {total}. | Rows of the same size can be added. |
| Two-step stories | The story from section 9. | First, {a} {plus or minus} {b} is {x}. Then, {x} {plus or minus} {c} is {answer}. | Do one step at a time. |
| Ruler | How long is the {object}? | It starts at {s} and ends at {e}. Count the spaces between: {n}. | Count the spaces, not the marks. |
| How many more | How many more chose {x} than {y}? | {x} has {a}. {y} has {b}. {a} minus {b} is {n}. | "How many more" means subtract. |
| Count coins | How much money is this? | Start with the biggest coin and count on. {total} cents. | Start with the coin worth the most. |
| Sides and corners | How many sides does this shape have? | Count each side once. {n}. | Trace round the shape and count. |
| Name shapes by sides | Which shape is a {name}? | A {name} has {n} sides. | The number of sides gives the name. |
| Solid shapes | Find the {solid}. | This is a {solid}. {solid fact}. | Solid shapes are not flat. |
| Name a fraction | What part is shaded? | The shape has {k} equal parts. {s} is shaded. That is {name}. | Count the equal parts. |
| ABC order | Which letter comes next? | {A, B, C}. After {B} comes {C}. | Sing the alphabet to check. |
| Match letters | Match each big letter to its small letter. | Big {A} goes with small {a}, for each pair. | Every letter has a big shape and a small shape. |
| First, last or middle letter | Which letter does {word} start with? | {word} starts with the letter {L}. | Say the word slowly and listen. |
| Word families | Put each word in its family. | {cat} and {hat} both end in {at}. | Words in a family end the same way. |
| Digraphs and blends | Which letters are missing? | {ship} starts with {sh}. | Two letters can work together. |
| Silent e | Spoken: Find the word {cape}. On screen: Find the word. | The e at the end makes the {a} say its name. | An e at the end can change the vowel. |
| Vowel teams | Which letters are missing? | {rain} has {ai} in the middle. | Two vowels can make one sound. |
| Short or long vowel | Put each word in its group. | {cap} has a short vowel. {cape} has a long vowel. | A long vowel says its name. |
| Compound words | Build the word {sunflower}. | {sun} and {flower} make {sunflower}. | Two small words can make one big word. |
| Capitals and periods | Which sentence is written correctly? | A sentence starts with a capital letter and ends with a period. | Capital at the start, period at the end. |
| End marks | Which mark goes at the end? | A telling sentence ends with a period. An asking sentence ends with a question mark. A shout ends with an exclamation mark. Use the line that fits. | Asking sentences end with a question mark. |
| One and more than one | Which word matches the picture? | There {is one or are more than one}. We say {word}. | Add s for more than one. |
| Naming, action and describing words | Put each word in its group. | {dog} names something. {run} is something you do. | Naming words are people, animals and things. |
| Read a sentence | Which picture matches the sentence? | The sentence says {key word}. | Read every word. |
| Read a story | The question for that story. | The story says: {the sentence that holds the answer}. | Look back at the story. |
| Odd one out | Which one does not belong? | These are all {group}. This one is not. | Find what the others share. |
| Which belongs | Which one belongs with these? | These are both {group}. So is {answer}. | Find what they share. |
| Two-rule patterns | What comes next? | The colour goes {rule one}. The size goes {rule two}. Next is {answer}. | Follow one rule at a time. |
| Number analogies | Look at the pairs. What number finishes the last pair? | Each pair {adds n or doubles}. {base} becomes {answer}. | Find the rule that fits every pair. |
| Number series | What comes next? | The numbers go {up by n}. Next is {answer}. | Find the jump. |
| Number puzzles | What number makes the scale balance? | This side is {total}. The other side needs {answer} more. | Both sides must weigh the same. |
| Picture analogies | {Sock} goes with {foot}. {Glove} goes with what? | A {sock} goes on a {foot}. A {glove} goes on a {hand}. | Find how the first two go together. |
| Pattern completion | Which piece finishes the picture? | Follow the lines and colours into the gap. | The piece must match every edge. |
| Picture riddles | The riddle from section 9. | {answer} is the one that {riddle fact}. | Listen to every clue. |

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

R-A12 Paper folding, level 1           facts { fold: vertical, holes: [{ col: 0, row: 0 }] }
  stimulus     foldPunch folded: the right half lies over the left, one hole at the top left
  options      unfolded with holes at (0,0) and (3,0)   <- answer
               unfolded with one hole at (0,0)
               unfolded with holes at (0,0) and (0,3)
  note         a vertical fold copies each hole to column 3 minus its column

R-A8 Number analogies, level 1         facts { examples: [[2, 5], [4, 7]], base: 6 }
  prompt       Look at the pairs. What number finishes the last pair?
  stimulus     2 and 5, 4 and 7, 6 and blank
  options      8, 9, 12                 answer 9
  note         one pair such as [2, 4] is never enough: it fits both plus 2 and double

E-PK-A1 Find the uppercase letter, level 1   mode listen   facts { target: B }
  prompt.text  Find the letter.
  prompt.speak "Find the letter", then the letter part B
  options      B, M                     no spoken labels
  explanation  This is the letter B.

M-1-C1 Tell time, level 2              facts { hour: 3, minute: 30 }
  stimulus     clock, short hand halfway between 3 and 4, long hand on 6
  options      half past 3, half past 4, 3 o'clock      answer half past 3
  explanation  The long hand points to 6. The short hand is halfway between 3 and 4.
               It is half past 3.

E-PK-C2 Opposites, level 2             facts { target: hot, relation: opposite }
  prompt       Which one is the opposite of hot?
  options      cold (snowflake), night (moon), slow (turtle), each spoken on tap
  answer       cold
  explanation  Hot and cold are opposites.
```

### Common Core codes by skill

These are from memory and are the reviewer's starting point, not the final word. The Virginia mapping pass checks them against the Common Standards Project data. Pre-K and reasoning skills carry no code. Three grade 1 skills carry a grade 2 code, because Common Core places the idea a year later: skip counting (A.2), coins (C.4) and compound words (Language Arts B.2). Common Core has no code at all for counting by 2s.

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

Claude Code writes 20 original stories into `src/content/banks/readingStories.json` in the Language Arts grade 1 phase.

- Three sentences each, 5 to 8 words a sentence.
- Story words come only from the sight word sets, the short-vowel list, the grade 1 phonics lists and the word family list in section 9, plus the six story names. The endings s, es, ed and ing are allowed.
- Questions and options may also use these question words: why, does, because. The question is read aloud, so a child does not have to decode them.
- A test enforces both word rules for every story, question and option.
- Two questions a story: one who or what, one why or how. Three written options each.
- The answer to every question must be stated in the story. A reader should never have to guess.
- The story is not read aloud. The question is.

```text
Sam has a red hat. The hat is too big. Sam gives the hat to Max.
  Who gets the hat?  Max / Sam / Mia        Why does Sam give it away?  It is too big / It is red / It is wet

Mia can see a frog. The frog jumps on her hat. Now Mia has a wet hat.
  What jumps?  the frog / the dog / Mia     How did the hat get wet?  The frog jumped on it / Mia ran / It was hot
```

## 9. Content data

Generators draw words and pictures from these fixed lists, so Claude Code never has to invent content. Put each list in its own file under `src/content/data/`.

### Picture rules

- Version 1 uses the device's built-in emoji as pictures. That needs no image files and no network.
- Use only the emoji listed here. All are from 2018 or earlier, so they draw on older tablets.
- A picture a child must name always has its word spoken. Never rely on a child guessing what an emoji is called.
- Shapes, coins, clocks, blocks and frames are drawn as SVG, never emoji.
- One picture has one name. Where two lists once named the same picture differently, the lists below have been changed so they agree. The one exception is a picture that stands for a quality in an opposites or describing question: the fire picture is "hot" and the turtle is "slow" there.
- Letters are drawn in the system rounded font. Its lowercase a and g may not match the shapes a child is taught to write. That is a known limit, listed in section 14.

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

Fish has the same word for one and many, so plural questions skip it. Story problems use only things that can sit on a table or in a box: apples, cookies, balls, strawberries, bananas, cars, balloons and flowers.

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
['jacket','j','j','🧥'], ['key','k','k','🔑'], ['lion','l','l','🦁'], ['lemon','l','l','🍋'],
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

Each word is stored with its parts, because the explanation shows the split on screen. The voice says only the whole word. It cannot say a lone syllable reliably.

```ts
1: cat, dog, sun, fish, star, moon, frog, cake
2: ap-ple, rab-bit, tur-tle, piz-za, mon-key, rock-et, lem-on, ti-ger, rain-bow
3: ba-na-na 🍌, oc-to-pus 🐙, um-brel-la ☂️, el-e-phant 🐘, but-ter-fly 🦋,
   straw-ber-ry 🍓, di-no-saur 🦕, to-ma-to 🍅
```

### Word groups (categories.ts)

```ts
animals:  cat 🐱, dog 🐶, fish 🐟, frog 🐸, duck 🦆, pig 🐷, lion 🦁, elephant 🐘, monkey 🐵, rabbit 🐰
food:     apple 🍎, banana 🍌, pizza 🍕, cookie 🍪, bread 🍞, cheese 🧀, carrot 🥕, grapes 🍇
vehicles: car 🚗, bus 🚌, bike 🚲, plane ✈️, train 🚂, boat ⛵, rocket 🚀, tractor 🚜
clothes:  shirt 👕, pants 👖, dress 👗, sock 🧦, hat 🎩, shoe 👟, glove 🧤, scarf 🧣
plants:   tree 🌳, flower 🌸, cactus 🌵, clover 🍀
people:   girl 👧, boy 👦, baby 👶, man 👨, woman 👩, king 🤴
things:   cup 🥤, bed 🛏️, box 📦, key 🔑, ball ⚽, clock 🕐, book 📖, door 🚪
```

Plants and food never appear in the same question, and fish is never offered against food. Kindergarten D.2 sorts people, animals and things.

### Opposites (opposites.ts)

```ts
hot 🔥 / cold ❄️, day ☀️ / night 🌙, happy 😀 / sad 😢, up ⬆️ / down ⬇️,
fast 🐇 / slow 🐢, loud 🔊 / quiet 🔇
big / small: drawn with the shape visual at sizes l and s
```

Open and closed is left out, because the lock picture is already "lock" in the rhyme list.

### Short-vowel words (cvc.ts)

```ts
a: cat 🐱, hat 🎩, bat 🦇, van 🚐, pan 🍳, map 🗺️, bag 👜
e: bed 🛏️, hen 🐔, pen 🖊️, web 🕸️, leg 🦵
i: pig 🐷, pin 📌, lip 👄
o: dog 🐶, fox 🦊, box 📦
u: sun ☀️, bus 🚌, bug 🐛, cup 🥤, nut 🥜
```

Pot is left out of the picture list, because its picture is "soup" in the analogy list. It stays in the word family list as a written word.

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

Never put words that sound alike in one question: to, two, too; for, four; no, know; one, won; there, their; by, buy; be, bee; see, sea; I, eye; new, knew; our, hour; our, are; red, read; then, them; an, and, in, on; were, where; of, off; when, went, want.

The words "a" and "I" are spoken with a `word` part, so the voice says the word and not the letter name.

### Grade 1 phonics lists (phonics1.ts)

```ts
digraph starts:   ship 🚢, shoe 👟, shell 🐚, sheep 🐑, cheese 🧀, chick 🐥, cherry 🍒, thumb 👍, whale 🐋
digraph ends:     fish 🐟, dish 🍽️, brush 🖌️, peach 🍑, beach 🏖️, bath 🛁, tooth 🦷
blend starts:     frog 🐸, flag 🚩, star ⭐, snake 🐍, drum 🥁, crab 🦀, clock 🕐, plane ✈️,
                  spoon 🥄, truck 🚚, grapes 🍇
blend ends:       hand ✋, milk 🥛, tent ⛺, gift 🎁, ant 🐜, mask 😷, bank 🏦, plant 🌱
silent e:         cap/cape, kit/kite, tub/tube, pin/pine, can/cane, hop/hope, cub/cube, man/mane, not/note
silent e pictures: cap 🧢, pin 📌, pine 🌲, can 🥫, man 👨, note 📝
vowel teams:      rain 🌧️, train 🚂, snail 🐌, bee 🐝, tree 🌳, sheep 🐑, boat ⛵, goat 🐐, soap 🧼
compounds:        sun+flower 🌻, rain+bow 🌈, cup+cake 🧁, foot+ball 🏈, butter+fly 🦋, snow+man ⛄,
                  pop+corn 🍿, lady+bug 🐞, pan+cake 🥞, basket+ball 🏀, pine+apple 🍍, mail+box 📫
nouns:            dog ball tree bed girl car      verbs: run jump eat sing read swim
adjectives:       big red soft tall cold happy loud tiny
describing pictures: cold ❄️, happy 😀, loud 🔊, red 🍎, big 🐘, tiny 🐜, tall 🦒, soft 🧸
opposites:        big/small, hot/cold, up/down, fast/slow, happy/sad, open/shut, wet/dry, day/night
same:             big/large, small/little, happy/glad, fast/quick, shut/close, start/begin
```

- Digraph ends has 7 words, so that level declares a pool of 7.
- Compound words are built with word tiles from a picture and the spoken word. They are not matched half to half, because halves cross-match into other real words: snowball and footman, sunfish and starflower, sunroom.
- A describing-picture question never offers big and tall together.

### Sentences (sentences.ts)

```ts
telling:  "The cat is big."  "I see a red hat."  "We can run."  "The dog can jump."
          "I like my bed."  "The sun is hot."  "She has a pet."  "He can hop."
          "The pig is big."  "I have a cup."  "The fox ran."  "We go to the bus."
asking:   "Can you see the cat?"  "Where is my hat?"  "Is the sun hot?"  "Who has the cup?"
          "Do you like the dog?"  "What is in the box?"  "Can we go?"  "Is it a bug?"
shouting: "Look out!"  "Stop!"  "Help!"  "Oh no!"  "Wow!"  "We did it!"
```

- Kindergarten D.1 takes a telling sentence and builds the wrong options by lowering the first letter, dropping the period, or both.
- Grade 1 C.3 shows a sentence with its end mark taken off. Level 1 uses telling and asking sentences. Level 2 adds the shouting ones.

### Sentences with a picture (sentencePictures.ts)

```ts
"I see a cat." 🐱        "The sun is up." ☀️      "It is a red bus." 🚌     "I see a pig." 🐷
"Look at the dog." 🐶    "I have a hat." 🎩       "It is a big box." 📦     "The bug is little." 🐛
"I see a fox." 🦊        "Here is a cup." 🥤      "Look at my bed." 🛏️      "It is a pan." 🍳
"I see a bat." 🦇        "Here is a pen." 🖊️      "It is a van." 🚐         "I see a hen." 🐔
```

The wrong pictures are the answers to other sentences on this list.

### Sentences with a describing word (describing.ts)

```ts
"The big dog ran."  big          "I have a red ball."  red        "The bed is soft."  soft
"A tall tree fell."  tall        "The milk is cold."  cold        "The happy girl sang."  happy
"The loud drum woke me."  loud   "A tiny bug sat on me."  tiny
```

The options are words from the same sentence: the describing word, one naming word and one action word.

### Story templates (storyProblems.ts)

```ts
names: Sam, Mia, Leo, Ava, Max, Zoe
add:      "{name} has {a} {things}. {name} gets {b} more. How many {things} does {name} have now?"
add:      "{a} {things} are on the table. {b} more are in the box. How many {things} are there in all?"
subtract: "{name} has {a} {things}. {name} gives away {b}. How many {things} are left?"
subtract: "There are {a} {things}. {name} takes {b}. How many are left?"
compare:  "{name} has {a} {things}. {name2} has {b}. How many more does {name} have?"
addAdd:   "{name} has {a} {things}. {name} gets {b} more. Then {name} gets {c} more. How many {things} does {name} have now?"
addSub:   "{name} has {a} {things}. {name} gets {b} more. Then {name} gives away {c}. How many {things} does {name} have now?"
```

- Use the plural from the countables list, and the singular when the number is 1.
- In a compare story the first number is always the bigger one.
- A story is spoken one sentence at a time, each as its own utterance, so no single utterance runs past 12 seconds.

### A voice cannot say letter sounds

Browser speech cannot reliably pronounce a lone sound such as the first sound in ball. Every phonics prompt therefore uses whole words: "Which one starts like ball?" and "Which letter does sun start with?" Skills that need pure sounds, such as blending, wait for recorded audio on the roadmap.

### How things are said aloud (src/audio/say.ts)

A voice reading a lone letter often says the wrong thing, such as "uh" for a. Spoken text is therefore never one plain string. It is a list of `Say` parts (section 5), and `say.ts` turns each part into words a voice reads correctly. Because each part says what it is, the letter a, the word "a" and the "a" inside "Tap a balloon" can never be mixed up.

```ts
letter parts: a 'ay', b 'bee', c 'see', d 'dee', e 'ee', f 'eff', g 'jee', h 'aitch', i 'eye',
              j 'jay', k 'kay', l 'el', m 'em', n 'en', o 'oh', p 'pee', q 'cue', r 'are',
              s 'ess', t 'tee', u 'you', v 'vee', w 'double you', x 'ex', y 'why', z 'zee'
word parts:   passed to the voice as written
number parts: written as words by a function, 0 to 1,000 ('forty-seven')
time parts:   3:00 'three o'clock', 3:30 'half past three', 3:15 'three fifteen'
cents parts:  25 'twenty-five cents'
plain strings: must not contain digits or symbols. Write 'plus', 'take away' (K) or 'minus'
               (grade 1 up), 'equals', 'blank', 'is greater than', 'is less than'
```

Lookup order for a letter or number part: a voice-pack clip, then the spelling above through the device voice. Uppercase and lowercase use the same name. Parts are played one after another, so a clip can sit in the middle of a spoken sentence. With no voice pack on the device, everything goes through the device voice and nothing breaks.

### Analogy pairs (analogies.ts)

```ts
wornOn:   sock 🧦 : foot 🦶,  glove 🧤 : hand ✋,  glasses 👓 : eyes 👀
makes:    bee 🐝 : honey 🍯,  cow 🐄 : milk 🥛,  hen 🐔 : egg 🥚
usedWith: key 🔑 : lock 🔒,  pencil ✏️ : paper 📄,  spoon 🥄 : soup 🍲
livesIn:  fish 🐟 : water 🌊,  bird 🐦 : tree 🌳,  spider 🕷️ : web 🕸️
weather:  rain 🌧️ : umbrella ☂️,  sun ☀️ : sunglasses 🕶️,  snow ❄️ : scarf 🧣
```

An analogy uses two pairs from one relation. Every picture is spoken when tapped. At level 2 the wrong options come from the same relation: the second half of the third pair, and the second half of the example pair.

### Picture riddles (riddles.ts)

```ts
'Which one do you wear on your foot?'      shoe 👟
'Which one tells the time?'                clock 🕐
'Which one do you eat soup with?'          spoon 🥄
'Which one lives in water?'                fish 🐟
'Which one gives us milk?'                 cow 🐄
'Which one keeps you dry in the rain?'     umbrella ☂️
'Which one has wheels?'                    car 🚗
'Which one is very cold?'                  snow ❄️
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
| `/` | Profile picker: one big avatar button per child. In a Safari tab on an iPad or iPhone, the install guide instead | Kid |
| `/home` | Today's picks, daily goal, subjects, awards, review badge | Kid |
| `/play` | Runs today's picks one after another | Kid |
| `/subject/:subject` | Grade tabs, lettered categories, skills with score rings. Reasoning has no grade tabs | Kid |
| `/skill/:skillId` | Practice | Kid |
| `/skill/:skillId/learn` | Lesson: example, mini-lesson, video | Kid |
| `/review` | Review session for due skills | Kid |
| `/diagnostic` | Diagnostic, one sitting at a time | Kid |
| `/awards` | Awards boards | Kid |
| `/games/pop` | Pop | Kid |
| `/games/pairs` | Pairs | Kid |
| `/parent` | Parent gate | Parent |
| `/parent/dashboard` | Usage and summary per child | Parent |
| `/parent/scores` | Score grid | Parent |
| `/parent/trouble` | Trouble spots | Parent |
| `/parent/log` | Question log | Parent |
| `/parent/plans` | Skill plans | Parent |
| `/parent/settings` | Child profiles and settings | Parent |
| `/parent/sound` | Sound check | Parent |
| `/parent/pin` | Set or change the family PIN | Parent |
| `/signin` | Sign in, first sign-up and forgotten password | Account |
| `/parent/data` | Export, import, reset, backup status, sign out, credits | Parent |
| `/dev/gallery`, `/dev/review/:skillId` | Visual gallery and content samples. Registered only when `import.meta.env.DEV` is true, so they are not in the production build | Dev |

The Worker returns `index.html` for any path that is not a file and not under `/api`, so deep links load.

### Sign-in and first run

A parent signs in once on each iPad. Children never sign in and never see an email address or a password.

**What the app shows on launch, in this order**

1. In a Safari tab on an iPad or iPhone: the install guide.
2. If this device has no sign-in, or its 30 days have run out: the sign-in screen. Nothing else can be reached, on any path.
3. If the family has no PIN yet: the "Choose a grown-ups PIN" screen. This step arrives with the parent side in Phase 8a.
4. The profile picker.

**The sign-in screen**

- It asks for the email and password, with two links: "First time here" and "Forgot password". Both links do the same thing. They ask for the email, send a six-digit code, then show one screen asking for the code and a new password, typed twice.
- A wrong email, a wrong password and an address that is not on the list all get the same message: "That email or password is not right." The screen never says which.
- After five wrong passwords it says to wait 15 minutes or use "Forgot password".
- Signing in needs the network. With none, the screen says so in plain words.
- The fields are marked so the iPad's password manager can save and fill them.

**After signing in**

- The device record keeps the email and the date the session ends. From then on the app opens with no network.
- From 5 days before the end date, the profile picker shows one small line for grown-ups, "Sign in again by" and the date, and the parent dashboard shows a banner with a button. Signing in early starts a fresh 30 days.
- On the end date the app locks at its next launch, with or without a network. It never locks in the middle of a session. Nothing on the device is deleted. Progress is all there after the parent signs in.
- If the server says the session is no longer good before that date, because a parent chose "Sign out everywhere" or set a new password, the app locks at its next launch in the same way.
- "Sign out" and "Sign out everywhere" are on the parent data screen. Signing out leaves the children's progress on the device.

### Practice screen

Layout follows IXL: the question on the left, a status panel on the right. On phones the panel becomes a strip above the question.

- **Top bar:** back button, skill code and name, a Learn button.
- **Question area:** prompt with a speaker button, stimulus, answer area, Submit. A `listen` question shows a large speaker button where the target would be.
- **Status panel:** questions answered, Skill Score out of 100 in its stage colour, time elapsed only if the parent turned the timer on.

Answer flow:

1. The prompt is read aloud when the question appears, if auto-speak is on.
2. The child selects an answer and taps Submit. Pre-K profiles answer `choice` questions with one tap, unless the options carry spoken labels.
3. Inputs lock on submit. Taps in the first 400 ms after a question appears are ignored, which stops double-tap carry-over.
4. **Correct:** green highlight, a short chime, one spoken praise phrase, the score animates up, and the next question loads once the praise has finished: 1.2 seconds at the earliest, 2.5 at the latest. The next prompt never cuts the praise off.
5. **Wrong:** no buzzer. A panel shows "You answered" and "Correct answer" side by side, then the explanation steps and picture, read aloud. A "Got it" button loads the next question.
6. Each answer is saved before the next question renders. Leaving mid-session loses nothing.

Milestones at 50, 80, 90 and 100 each trigger a short full-screen celebration the first time they are crossed. "First time" is judged against `bestScore` (section 6), so dropping and climbing back never celebrates twice. At 100 the child sees the medal and the next pick.

IXL has no session end, so neither does this. After the child's session length, a soft break offers "Keep going" or "All done".

### Lessons and videos

Every skill offers three kinds of help from its Learn button.

1. **Learn with an example.** The generator's fixed `example()` question, solved step by step with narration.
2. **Mini-lesson.** A narrated, animated walk-through built from the same visuals. Every generator exports `lesson(): { speak: Say; text: string; visual: Visual }[]` with four steps, following the four beats in section 8. The player has play, pause, replay and step dots, and works offline.
3. **Video.** Shown only when the skill has a `video` entry, the device is online, and videos are on for that child, which is the default and a parent can switch off. It opens in a modal, as set out under Video safety.

Video links are not written into this plan. Phase 12 curates them, mostly from Khan Academy, and a script checks that each one loads before it is committed.

### Audio (src/audio)

- `speak(say, rate)` cancels anything playing, waits 60 ms, then plays each `Say` part in turn. It resolves when speech ends or after a timeout.
- The first speech must happen inside a tap, or mobile browsers stay silent. Tapping a child on the profile picker says "Hi" and their name, which unlocks the voice. The same tap resumes the WebAudio context, or sound effects stay silent.
- Wait up to one second for the voice list, then prefer a local English (US) voice.
- Start speech from an effect keyed on the question's `key`, and cancel in its cleanup. This avoids double speech in React strict mode.
- Keep every utterance under about 12 seconds. Long ones cut off on some phones.
- If speech is unavailable, show a muted speaker icon and carry on. Text stays visible.
- Sound effects are short tones made with WebAudio: a chime for correct, a fanfare for mastery, a soft clap for syllables. There is no sound for wrong. One mute setting in the device record covers the voice and the effects.

### Awards (src/engine/awards.ts)

There is one board for each subject and grade that has skills (Math pre-K, K, 1 and 2, Language Arts pre-K, K and 1), one board for Reasoning, and one Milestones board. A board is a grid of covered squares. Earning an award uncovers a sticker. `evaluateAwards(states, totals)` is a pure function that returns every award id earned so far.

| Award family | Board | Thresholds |
| --- | --- | --- |
| Skills mastered | Each subject board | 1, 3, 5, 10, 15, all. A threshold above the board's number of skills is left out |
| Every skill in a category at 80 or above | Each subject board | One per category. Placed-out skills count in full, so a category the child placed out of shows its sticker straight away, with no celebration |
| Questions answered, all subjects together | Milestones | 25, 50, 100, 250, 500, 1,000 |
| Days practised | Milestones | 3, 7, 14, 30 |
| Diagnostic finished | Milestones | One each for Math and Language Arts |

Days practised counts the different local `day` values with at least one answer. It is a total, not an unbroken streak, so a missed day never takes anything away. An award, once earned, is never taken back, even after a failed review. A parent can open a printable certificate for any completed category.

### Parent side

- **Gate:** "Grown-ups only" with a number pad for the family's 4-digit PIN. There is no maths question. A pass lasts 10 minutes and is held in memory only. Five wrong tries lock the gate for 1 minute. The PIN is one for the whole family: it is saved scrambled in the family record and travels to every iPad with the backup. A 4-digit PIN keeps a child out. It is not a security barrier, and the password is what protects the account.
- **Forgot the PIN:** the gate has a "Forgot PIN" link. It asks for the account password, checks it with the server, and then lets the parent choose a new PIN. It needs the network.
- **Dashboard:** per child, questions and minutes per day for the last 14 local days as SVG bars, the daily goal, skills mastered, current picks, and diagnostic levels by ladder.
- **Scores:** every skill by subject, grade and category with score, stage chip, attempts, accuracy, time spent and last practised. Sortable.
- **Trouble spots:** flagged skills, each with the three most recent missed questions redrawn, and a button to add the skill to a plan.
- **Question log:** every attempt, newest first, filtered by child, skill and date. Each row redraws the question from its skill, level and seed and shows the child's answer beside the correct one.
- **Plans:** name a plan, pick skills, order them, assign children. Nothing is created on first run. The screen offers one ready-made template, "Reasoning practice", holding all 14 reasoning skills in ladder order. Tapping "Use this plan" makes an ordinary plan from it.
- **Settings:** per child: grade, gentle scoring, session length, speech rate, auto-speak, timer, daily goal, daily minutes, pre-reader mode, videos, and restart diagnostic. For the device: mute. For the family: change the PIN.
- **Data:** export everything through the share sheet, import a file (it merges and never wipes), reset one child, the time of the last backup with a "Back up now" button, who is signed in and until when, sign out, sign out everywhere, storage and install status, any saved items that could not be read, flags, the last 20 errors, and credits.

### Look and feel

Use an original visual identity, not IXL's colours or layout details. Bright and calm, with a system rounded font stack so nothing loads from the network, large type, and six stage colours defined once in `tokens.css`. Support portrait and landscape from 360 px wide to desktop.

### Pre-reader mode

A child who cannot read must be able to use the whole kid side alone. Profiles with `preReader` on get these changes.

- **Home** shows one large Play button and three picture tiles for today's picks. Play runs the picks one after another. Each pick lasts one session length, and the spoken soft break between picks offers "Next one" or "All done". There are no menus in between.
- **Every skill is a picture tile:** its `icon`, its score ring, and its name in small text. Tapping the speaker corner says its `speakName`.
- **Subject pages** are a grid of tiles grouped by colour band, not a text list.
- **Buttons carry icons:** a house for home, a star for awards, a check mark for Submit, an arrow for Next.
- **Nothing important is text only.** Celebrations, breaks and the daily limit screen all speak.

### Kid lock and daily limit

- Leaving practice needs a press and hold of 2 seconds on the back button. A plain tap does nothing.
- Kid screens replace history instead of adding to it, so the iPad's swipe from the left edge has no page to go back to.
- When `dailyMinutes` is set and used up, the child sees a spoken "All done for today" screen with their stickers. A parent can add 10 minutes through the gate.
- Minutes are the sum of the day's answer times, each capped at two minutes, counted by local day.
- The setup guide tells the parent how to turn on the iPad's Guided Access, which keeps a child inside one app.

### Voice pack and sound check

A device voice says some letter names badly and differs from iPad to iPad. So the letter names, the numbers and a few short phrases are made once, ahead of time, as audio clips.

- **Making the pack.** `npm run clips` runs `scripts/make-clips.sh` on the Mac. It uses the built-in `say` command with the Samantha voice and `afconvert` to make about 150 small AAC clips: the 26 letter names, the numbers 0 to 100, and about 20 short phrases such as "Great job". It writes them into one file, `voice-pack.json`, with a version, and uploads that file to the R2 bucket.
- **Keeping it private.** Apple allows its voices for personal use, not for handing out. The clips are therefore never committed to the public repo. They sit in R2 and are served only to a signed-in iPad.
- **Getting it onto an iPad.** After sign-in, and whenever the pack's version changes, the app downloads the pack once and stores each clip in the device's `clips` store. After that it plays with no network.
- **Without the pack.** Every part falls back to the device voice. The app never waits for the pack.
- **Sound check** in parent settings plays every letter name, the numbers 0 to 20 and each sound effect, so a parent can hear exactly what the child will hear on that iPad. It also says whether the voice pack is on the device.
- If the voice plays but the chime does not, the sound check says to turn off mute in Control Center.
- A screen for recording clips in a parent's own voice, including the pure letter sounds no computer voice can make, is on the roadmap in section 14.

### Video safety

Videos are on by default, so the player has to keep a young child inside the app, and it has to do that within YouTube's rules.

- The player is YouTube's privacy-enhanced embed with YouTube's own controls. Nothing is drawn over it. YouTube's terms do not allow its player to be covered, and an iPad will not start unmuted video from a button outside the video frame. The child taps YouTube's own play button.
- The frame is sandboxed. Scripts are allowed. Pop-ups and top-level navigation are not. A tap on the YouTube logo or the video title then has nowhere to go.
- The app draws one control of its own, outside the frame: a large Close button.
- Each entry in `videos.json` stores the video's length in seconds. The app follows the play time through YouTube's player API and closes the modal 3 seconds before the end, before suggestions appear. Related videos are limited to the same channel.
- The Phase 12 gate includes a hand check on the iPad: tapping the logo and the title must not leave the app. If the sandbox does not hold there, videos are switched off for every child: `videos.json` carries `"enabled": false`, the lesson shows no video button, and the per-child videos setting is hidden. They stay off until the self-hosted player in section 14 replaces YouTube.
- A parent can remove any single video from the skill's row on the scores screen.
- Expect thin coverage for pre-K. Khan Academy's library starts in earnest at kindergarten, and the built-in lesson covers the rest.

### Scratchpad

From grade 1, a pencil button on the practice screen opens a drawing layer over the question for working things out. It supports a finger or Apple Pencil, has undo and clear, and is never saved.

### Games

IXL now offers skill games, so version 1 includes two. Both are offered after a finished session.

- **Pop:** balloons bob in place, each carrying an answer option. The child taps the one that answers the spoken question. Nothing floats away and nothing is timed. Ten questions a round. Pop draws on the child's in-progress skills whose current level is a `choice` question. Each answer is logged as normal practice and moves the Skill Score. When the child has no such skill, Pop is not offered.
- **Pairs:** a memory game of 6 face-down pairs, such as numerals and dot groups or uppercase and lowercase letters, drawn from the content lists for the child's grade. Pairs is a reward. It logs no attempts and never changes a Skill Score, because a missed flip is a slip of memory, not a wrong answer.

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

Some licences above are marked "from memory" or come from a secondary source. Confirm them on the publisher's site before leaning on that content. Illustrative Mathematics is CC BY, which asks for credit, so the parent data screen carries a short credits page naming it and every other open source used.

### Why Perseus is left out of version 1

Perseus is Khan Academy's own exercise renderer. It is a large multi-package codebase built around Khan's internal tools and item format. Pulling it in adds the biggest single risk to a clean first build, and pre-K to grade 2 does not need what it offers. The eight tap-based question types here cover those grades. Revisit it at grade 3, when children start typing fractions and expressions.

### A correction to my earlier note

I described OpenMoji as CC BY. It is CC BY-SA 4.0, which also asks that adapted artwork be shared under the same licence. That does not affect a private family app.

## 12. Build phases and gates

Twenty-two build steps, run in the order shown. Each step is one Claude Code session, except step 20, which is six. That makes 27 sessions. Phase labels are names, not the order. A phase is done only when `npm run verify` passes and every item in its gate is shown to pass.

| Step | Phase | Builds | Gate, beyond `npm run verify` |
| --- | --- | --- | --- |
| 1 | 0. Scaffold | Vite, React, TypeScript, dependencies, scripts, lint, test setup, `CLAUDE.md`, `tokens.css`, app shell with router, error boundary | Dev server starts. One render test passes. Built before the plan was revised, so step A finishes what it lacks |
| 2 | A. Hosting and sign-in | First, what the scaffold lacks: web app manifest, icons, Apple meta tags, six stage colours, `localDay()`, `tsx`, and removing `.github/workflows/verify.yml`. Then `wrangler.jsonc`, `worker/` with the auth routes, `schema.sql`, the D1 and in-memory stores, the mailer, `account.ts`, the SignIn and SetPassword screens, and the sign-in guard in the app shell | Worker tests with the in-memory store and mailer: an unlisted email gets the same reply and no email. A code fails after 10 minutes and after 5 wrong tries. Setting a password ends older sessions. Five wrong passwords lock for 15 minutes. A wrong email and a wrong password give the same reply. The cookie has every flag in section 4. An unknown `/api` path gives 401 without a session, never the app page. App tests: with no session every route shows the sign-in screen. A test searches every tracked file except `package-lock.json` and fails on any email address other than `example.com` ones. The build output contains the manifest. Your part: the Cloudflare checklist in section 4, then sign in on the iPad |
| 3 | 1. Engine core | `rng`, `seed`, `types` with `facts`, `Say` and the three modes, `check`, `validate`, `canonical`, the registry with pools, the P1 oracles in `tests/oracles/`, generator and oracle harnesses, golden-file and list-hash tests, the content dump script, three reference generators: M-PK-A2, M-K-B3, M-K-C4 | Same seed gives the same output. `seedFor` is stable. `check` tested for all 8 types. `validate` rejects one crafted bad question for each of the 16 invariants. Each oracle has its own unit tests. Harnesses pass for the 3 generators. A level with a pool of 2 never repeats back to back and never throws |
| 4 | 2. Scoring and adaptive | `skillscore`, `review`, `recommend`, `diagnostic`, `merge`, `awards`, and `ladders.ts` listing every ladder by skill id | Every row of the section 6 test table and its extra tests. One test per recommendation rule and variety rule. Trouble spots: 5 right out of 5 is not flagged, 2 right out of 5 is. Diagnostic, on made-up ladders: a simulated child who knows the first N skills is placed at N, give or take 1, for five values of N within 8 skills of the start, and is never placed above N plus 1 for any N. No skill is tested twice. A ladder that starts above the child's grade asks nothing. A sitting stops at its question cap and resumes. Merge: two copies of a skill state keep both devices' answer counts. Award thresholds, including the placed-out rule |
| 5 | 3. Storage | zod schemas with defaults for all twelve records, `memoryRepo`, `idbRepo` with upgrade steps and quarantine, reset, export and import with version header and merge, persistent-storage request, and the sign-in state kept in the device record | One contract suite runs against both repos. Export, wipe, import restores everything. The export holds no email address and no clips. After one sign-in, the app opens with the network off, and locks once the saved end date has passed. Import onto a device that already has data merges and wipes nothing. A corrupted record is quarantined, counted and not overwritten. A record missing a newer field loads with its default. A reset child's older rows are ignored on read and on import. A version 1 fixture opens with the newest code |
| 6 | 4a. Visuals | Playwright. Every visual in section 5, including the added ones, canonical forms, and the dev gallery at `/dev/gallery` | Each visual has an `aria-label`. Canonical tests: a turned square equals itself, a flipped L does not. The clock's hour hand at 3:30 sits halfway between 3 and 4. A WebKit screenshot of the gallery is saved to `review/gallery.png`, and Claude Code looks at it and reports anything overlapping, clipped or unreadable |
| 7 | 4b. Question types and audio | All 8 item components with the three modes, `speech`, `say`, `sfx`, `clips`, `scripts/make-clips.sh`, the `/api/voice-pack` route and the one-time pack download | Each item component turns simulated taps into the right response. A `listen` question shows no target and its options do not speak. `say` tests for every part type, including the letter a against the word "a". Speech tests with a mocked browser API: cancels and waits before speaking, never throws when the API is missing, plays parts in order with a clip in the middle. With no voice pack on the device, every part uses the device voice. The pack route gives 401 without a session. No audio file is in the repo. Your part: run `npm run clips` once on the Mac |
| 8 | 5a. Practice flow | Store, install guide, child setup, profile picker, practice screen, explanation panel, milestones, soft break, snapshots and `day` on attempts | Integration test: new child, 15 correct answers, score 100, medal shown, 15 attempts stored with snapshots and days, review scheduled. A wrong answer shows the explanation and moves the score per section 6. A milestone is not shown twice. A Safari tab on an iPad sees only the install guide. WebKit smoke test at the three sizes in section 3: no sideways scroll, a 3-question session completes |
| 9 | 5b. Kid navigation and lessons | Home with the daily goal ring, pre-reader mode with picture tiles and Play, subject pages, lesson player, review, kid lock, history replacement, daily limit, wake lock | A pre-reader profile can go from the profile picker through a full Play run without any text-only control. The lesson player steps through four beats. Hold-to-exit works, a tap does not, and a browser Back press leaves the child on the practice screen. The daily limit screen appears when the local day's minutes run out |
| 10 | 9. Offline and updates | Service worker, offline cache, update check on launch and on return to the front. The service worker never caches or answers anything under `/api` | Build output contains the service worker. A request under `/api` always goes to the network. Browser test: load, go offline, reload, answer a question. A newer build is picked up when the app returns to the front and is not applied in the middle of a question |
| 11 | 10. Backup sync | `worker/backup.ts`, `sync.ts`, the first-sync screen on a new iPad, backup status on the data screen | Worker tests: both routes give 401 without a session. An upload built on an old version is refused. The first upload of a day makes a history copy and the second does not. Something that is not a gzip file is refused. Client tests against a fake server: a second run with nothing changed uploads nothing. Two devices that both practised end with both sets of attempts and the same skill state. A refused upload merges and retries, and gives up after 3 rounds without losing anything. A reset on one device removes the child's old rows on the other. A failed run leaves the device untouched. A corrupt file from the server is refused and never merged |
| 12 | 6a. Math pre-K | Data files, 16 skills | Content gate, below |
| 13 | 6b. Math K, part 1 | Categories A, B, E, F, G: 16 skills | Content gate |
| 14 | 6c. Math K, part 2 | Categories C and D: 12 skills | Content gate |
| 15 | 6d. Language Arts pre-K | 10 skills, including the first `listen` skills | Content gate |
| 16 | 6e. Reasoning | 14 skills, analogy and riddle data | Content gate |
| 17 | 7. Diagnostic and awards | Diagnostic sittings screen, first-run flow, check-in card, the catalogue growth step, awards boards, celebrations | A simulated run over two sittings saves placements by skill id and flags placed-out skills. Raising `CATALOGUE_VERSION` with a new skill below a placement places that skill out. Mastering a skill uncovers the right award. A category made only of placed-out skills shows its sticker with no celebration |
| 18 | 8a. Parent side, part 1 | The PIN gate, the "Choose a PIN" step in first run, forgot PIN, dashboard with the sign-in reminder, scores, settings, data tools with share-sheet export, sign out, credits, sound check | The gate rejects a wrong PIN and locks for a minute after five. A PIN set on one device opens the gate on another after a sync. The saved family record never holds the PIN itself. Forgot PIN accepts the right password and refuses a wrong one. Export, wipe the device, import restores everything. Export, reset a child, import: the child stays reset. Signing out keeps the children's progress on the device |
| 19 | 8b. Parent side, part 2 | Trouble spots, question log, flags, plans with the ready-made template, the `/dev/review` route | A logged question redraws when versions match and shows its snapshot when they do not. A flag is saved and exported. An assigned plan changes the picks. No plan exists until a parent makes one |
| 20 | 11a to 11f. Later content | Six sessions: Math grade 1 A, C, D, E (12). Math grade 1 B (10). Math grade 2 A, C, D (12). Math grade 2 B (10). Language Arts K (16). Language Arts grade 1 (12) with the 20 stories | Content gate each session. The story word-list test passes |
| 21 | 12. Videos | `src/content/videos.json` with lengths, `scripts/check-videos.mjs`, the sandboxed player | The script requests YouTube's oEmbed endpoint for every id and fails on any that does not load. Playback closes before the end. Your hand check on the iPad: tapping the YouTube logo and the title does not leave the app. Skills with no good video stay empty. If the hand check fails, `"enabled": false` hides every video |
| 22 | 13. Scratchpad and games | Scratchpad layer, Pop, Pairs | Drawing works with touch and does not scroll the page. Pop logs attempts as practice, has nothing that moves away, and ends cleanly. Pairs logs nothing |

### Content gate

Every content step must show all of these.

- The generator suite passes for every new skill at every level over 300 seeds.
- Any oracle the batch needs was written and unit-tested before the first generator that uses it.
- The oracle test passes for every new skill.
- Golden files exist for every new skill, `tests/golden/lists.json` is up to date, and `CATALOGUE_VERSION` is raised by one.
- The catalogue test passes: ids unique, every row has a generator and the reverse, every skill has an icon, a ladder and a spoken name, prerequisites exist with no cycles, `maxLevel` and item types agree between row and generator, and every level with fewer than 8 questions declares its pool.
- Every skill exports a four-beat lesson.
- Claude Code has run `content:dump`, read it against the section 8 templates, and listed anything doubtful.

### Rules for every gate

- Claude Code pastes the full `npm run verify` output in its report.
- If a gate fails twice on the same problem, it stops and explains instead of working around it.
- If browser tests cannot run in the session because browsers will not install, it says so plainly and the integration tests stand as the gate. You then do the two-minute hand check below.

### Your hand check on the iPad after each step from 5a on

- [ ] Open the installed app from the Home Screen, at `sprout.logstocks.com`. Test children made during the build can be cleared with Reset.
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
| Generator suite | Vitest, `tests/generators.all.test.ts` | Every skill, every level, 300 seeds, every invariant from section 5 |
| Oracle suite | Vitest, `tests/oracles.test.ts` | Every skill, level and 300 seeds against an independent answer |
| Golden files | Vitest | Fixed seeds per skill, and a hash of every word list |
| Storage contract | Vitest with `fake-indexeddb` | The same tests against both repos |
| Component and flow tests | Testing Library with jsdom | Each question type, the practice loop, the parent gate, the question log |
| Browser smoke test | Playwright | WebKit at three screen sizes, a full session, offline reload. The offline reload runs in Chromium if WebKit cannot run the service worker |

All time-dependent tests freeze the clock through `lib/clock.ts`. No test uses the network.

### Known pitfalls

| Pitfall | Prevention written into this plan |
| --- | --- |
| Speech is silent on phones until a tap | The profile tap speaks first and unlocks audio |
| Voice list loads late, first prompt has no voice | Wait up to one second for voices before the first utterance |
| Prompt spoken twice in development | Speech runs in an effect keyed on the question, with cancel in cleanup |
| A voice reads symbols oddly | Spoken text spells out plus, minus, equals and blank. Invariant 1 enforces it |
| A voice cannot say single letter sounds | Phonics prompts use whole words only |
| Two options look the same, or two are correct | Invariant 3 with canonical forms, the oracle test, plus the pattern and sound-group rules |
| Sound-alike words as options in a listening question | The sound-alike list in section 9 |
| The correct answer is always in the same place | Invariant 11 |
| The same question twice in a row | The registry skips the last 6 keys, or fewer for a level with a small pool |
| Emoji missing on an older tablet | Only the listed emoji, all from 2018 or earlier |
| Scattered objects overlap and cannot be counted | The scatter layout uses fixed slots, never random coordinates |
| A double tap answers the next question | Inputs lock on submit and ignore the first 400 ms |
| Progress lost when the app closes mid-session | Every answer is saved before the next question |
| Storage unavailable in private browsing | Falls back to memory with a visible banner |
| A bad stored record crashes a screen | Every read is validated and bad records are skipped |
| Layout breaks under mobile browser bars | Use `dvh` units and scroll inside panels |
| Deep links return 404 | The Worker returns `index.html` for unknown paths outside `/api` |
| A stale service worker serves an old build | The app checks for a new build on launch and whenever it returns to the front, and applies it on the profile picker or home screen |
| A test needs a real Cloudflare account | The Worker reaches D1, R2 and email through interfaces with in-memory versions |
| Non-deterministic tests | No `Math.random`, no raw `Date` anywhere in engine or content |
| A video is removed or wrong | The check script, and the built-in mini-lesson never depends on a video |

Pitfalls added after the plan review:

| Pitfall | Prevention written into this plan |
| --- | --- |
| Safari clears saved progress on an iPad | Persistent storage request, Home Screen install, the backup on Cloudflare, export nudges until it ships |
| The sign-in email opens Safari instead of the app | Sign-in by typed code |
| A generator marks the wrong answer as correct | Oracles written separately from generators |
| Editing a generator rewrites history in the question log | Skill versions, golden files and attempt snapshots |
| A session runs out of room building too many skills | Content steps of 10 to 16 skills |
| A voice says "uh" for the letter a | The `say.ts` table, pre-made clips for letter names, and the sound check |
| A child cannot read the menus | Pre-reader mode |
| A video leads a child out to YouTube | The safe player in section 10 |
| A first diagnostic exhausts a 3-year-old | Short sittings |
| A skill is renamed and its progress is orphaned | Permanent skill ids |
| A blank white screen after an error | The error boundary |

Pitfalls added after the second review:

| Pitfall | Prevention written into this plan |
| --- | --- |
| A hear-and-tap question prints its own answer | `listen` mode and invariant 14 |
| Tapping an option reads the answer aloud | No spoken labels in `listen` and `read` questions, invariants 14 and 15 |
| A child doing well is flagged as struggling | Trouble spots use a share of recent answers |
| A stuck child is sent to an unrelated skill | Prerequisites follow ladders, not categories |
| The diagnostic tests one skill twice or never stops | The walk in section 7: no skill twice, clear stop rules |
| New content shifts a saved placement | Placements store skill ids, and the catalogue growth step runs on start |
| A reset child comes back after a sync | `resetAt` on the child, honoured by every read, import and sync |
| Two iPads overwrite each other's progress | Answer counts are rebuilt from the attempt log. `merge.ts` |
| A new field makes old records unreadable | zod defaults. Unreadable records are quarantined, never dropped or overwritten |
| Progress made in Safari vanishes after installing | The install guide comes first. Children are made inside the installed app |
| Evening practice counts as tomorrow | Every attempt and session carries the local `day` |
| The same milestone is celebrated again and again | `bestScore` |
| "2 is to 4" has two right answers | Two example pairs and the `numberRule` oracle |
| A flipped shape looks unchanged | Mirror questions use only the L and the flag. Canonical forms |
| Compound halves match more than one way | Compound words are built from tiles with a picture |
| The clock explanation is wrong at half past | Separate wording for half past, and an hour hand that moves with the minutes |
| A coin's printed words give away the answer | Emblems only, no words or numbers |
| Letters and digits that look alike are sorted against each other | The exclusion list in the distractor rules, and invariant 16 |
| The voice says "ay" for the word "a" | Typed `Say` parts |
| A two-option question fails the position check | Invariant 11 scales with the number of options |
| "Which one is different" fails the distinct-options check | `twins` |
| A small skill cannot reach 8 different questions | A declared `pool` |
| A memory game lowers a Skill Score | Pairs logs nothing |
| A drifting balloon acts as a timer | Pop balloons stay put |
| A video tap leads out to YouTube | A sandboxed frame, checked by hand on the iPad in Phase 12 |
| Swiping back skips the hold-to-exit | Kid navigation replaces history |
| Export does nothing inside the Home Screen app | The share sheet |
| Voice clips cannot be stored or tested | Stored as bytes with a type, never as a Blob |
| Sign-in emails stop arriving | Cloudflare email to confirmed addresses only. A parent who is already signed in on one iPad is not locked out of it |
| Hand checks fail on a local address | `https://sprout.logstocks.com` from step A |

Pitfalls added after the question round:

| Pitfall | Prevention written into this plan |
| --- | --- |
| A secret, an email address or a real name lands in the public repo | Private Cloudflare settings, `.dev.vars` ignored by git, and a test that searches the repo |
| A stranger makes an account | Only listed addresses can, and every other address gets the same reply and no email |
| Someone guesses the password | Ten characters at least, a 15-minute lock after five misses, and "Sign out everywhere" |
| The Worker runs out of processor time hashing a password | The slow stretch runs on the device. The Worker does one fast keyed hash |
| A stolen database copy reveals passwords | Only a salted, peppered hash of an already stretched key is stored. The pepper is not in the database |
| The app locks a child out in the middle of a session | The lock is checked at launch only, with a warning from 5 days before |
| A parent is offline on the day the sign-in runs out | The reminder, and early sign-in starts a fresh 30 days |
| Two iPads upload at once and one wipes the other | The upload names the version it was built on and is refused if that has moved on |
| A bad upload ruins the backup | Daily history copies for 14 days, and the file is checked with zod before any merge |
| An `/api` route is added without a session check | One guard in `worker/index.ts` covers every path outside the sign-in routes, and a test calls an unknown path |
| The backup file grows large after years of practice | The Worker's 25 MB limit is far above a year of family use. Splitting the file by month is on the roadmap |
| Apple voice clips are handed out publicly | They are never in the repo. R2 serves them only to a signed-in device |
| An old sign-in answer is served from the offline cache | The service worker never touches `/api` |
| A sign-in stub ships in the real app | There is no stub. Local runs use wrangler's local services, and a test pins `ENVIRONMENT` to `production` |
| The child learns the PIN | The parent changes it in settings. It reaches the other iPad with the next backup |
| Changing mail records breaks the domain's existing mail | Existing records are read first and nothing is changed without asking |

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
- [ ] No saved record points at a skill or ladder by position
- [ ] Every skill on the listen and read lists in section 8 uses that mode

**Security**

- [ ] No secrets, keys, email addresses or real names in the repo. Private Cloudflare settings only
- [ ] No undefined variables, no `any`, no unchecked data from storage or imports
- [ ] No `window.open`. Any external link has `rel="noopener noreferrer"` and sits behind the parent gate
- [ ] Every storage and sync write is awaited in try/catch with a visible error state
- [ ] Every `/api` route outside the sign-in routes checks the session first
- [ ] No reply or log line tells a listed email from an unlisted one, or carries a code, a password key or a cookie

**Runtime**

- [ ] Every early return in an async handler releases its loading or locked state
- [ ] Screens are flex columns with inner scroll, no sideways scroll at 360 px
- [ ] Tap targets on kid screens are at least 64 px
- [ ] The app starts and runs a full session with the network off
- [ ] Kid navigation never pushes a history entry
- [ ] No day is worked out from a UTC time

## 14. After version 1

These close the remaining gap with IXL. None needs a change to the engine.

| Next step | What it adds | Depends on |
| --- | --- | --- |
| Virginia SOL mapping | Each skill tagged with its 2023 Virginia code, a parent view by standard, and a check of the Common Core codes | VDOE documents |
| Grades 3 to 5 math | Multiplication, division, fractions, decimals, area. Adds KaTeX and a fraction keypad | The later-content pattern |
| Language Arts grade 2 and up | Longer reading passages, grammar, vocabulary | Item bank loader |
| Sound-based phonics skills | Blending and segmenting, using the parent's recorded letter sounds | Parent voice recording |
| Science and social studies | Authored item banks by grade | Item bank loader |
| More reasoning | Harder matrices, two-fold paper folding, verbal classification | Reasoning visuals |
| Smarter scheduling | FSRS for review timing, knowledge tracing for mastery, both fed by the attempt log | A few months of data |
| Real coin pictures | Photographs in place of drawn coins | An image source cleared for use |
| Weekly parent email | A summary of time, mastered skills and trouble spots | The Worker and its email sender |
| Printable worksheets | Any skill at any level as a PDF page from the same generators | None |
| Parent voice recording | A screen where a parent records letter names and pure letter sounds in their own voice, shared across iPads | The iPad microphone and R2 |
| Backup split by month | Older attempts move into one file per month, so each sync uploads only the current month | A backup file that has grown large |
| Self-hosted videos | Khan Academy's videos served from your own storage in a plain player, with no YouTube frame at all | Confirming the licence on Khan Academy's site, and R2 storage |
| Schoolbook letter shapes | A bundled font with the lowercase a and g that children are taught to write | A font cleared for use |
| Reasoning check-in | A light placement for reasoning, if picks prove too easy or too hard | A few weeks of data |

### Decisions made on Nov 15, 2026

- **Name:** Sprout.
- **First run:** each child starts with the diagnostic, then gets picks from the result.
- **Videos:** on from the start. Curated links appear as Phase 12 adds them.
- **Standards:** both. Common Core codes ship with the build and Virginia codes follow in a mapping pass.

Main device: iPad, running the app from the Home Screen. All 22 gaps from the plan review of Nov 15, 2026 are folded into the sections above.

### Choices made in the second plan fix, Nov 15, 2026

The second review found 78 problems. All are fixed in the sections above. These are the fixes that changed a rule, a score or what a child sees. Each is open to change.

- **Trouble spots:** flagged at under 60% of recent answers, not "fewer than 6 of 10".
- **Prerequisites:** follow the ladder, not the category.
- **Diagnostic:** Math and Language Arts only. A ladder that starts above the child's grade is skipped. The walk climbs 2, 4, then 8 skills and then halves the gap. The cap is 14 questions a ladder, 8 for pre-K.
- **Placed-out skills and awards:** they count in full. Changed in the question round, below.
- **Reset:** final. It survives sync and cannot be undone by import.
- **Two iPads:** answer counts are rebuilt from the log. The score comes from the copy practised most recently.
- **Import:** merges, never wipes.
- **Install first:** no children can be created in a Safari tab on an iPad without a parent choosing to.
- **Play:** one session length per pick, with a break between picks.
- **Pop:** balloons do not float away. **Pairs:** not scored.
- **Videos:** YouTube's own controls in a sandboxed frame, with a hand check on the iPad. If the check fails, videos are switched off.
- **Parent gate:** a 4-digit PIN only. Changed in the question round, below.
- **Starter plan:** a template the parent chooses to use, with all 14 reasoning skills.
- **Stage colours:** six, with light blue for Getting started.
- **Content changes:** middle vowel shows 3 options. Compound words are built from tiles. Silent e starts as hear-and-tap. Coins carry emblems, not words. Paper folding level 3 is two holes. Number analogies show two example pairs. Open and closed left the opposites list. Jet became jacket, feet became sheep, and pot left the picture list.
- **Build order:** Playwright moves to Phase 4a, and Reasoning gets its own session. Hosting and sign-in become step A, straight after the scaffold.

### Choices you made in the question round, Nov 15, 2026

Each of these was your answer to a question. They replace anything earlier in this list that says otherwise.

**Hosting and cost**

- **Where it lives:** the LogStocks Cloudflare account, at `sprout.logstocks.com`.
- **One Worker for everything:** the app, sign-in, the sign-in email and the backup. No Supabase and no Vercel.
- **Repo:** public on GitHub. Nothing private goes into it.
- **Tests on every push:** run by the Cloudflare deploy build. No GitHub Actions.

**Sign-in**

- **How:** email and password, with a forgot-password code by email.
- **Who:** only the listed parent emails. They are kept as a private Cloudflare setting.
- **First sign-up:** a code by email proves the address, then the parent sets a password.
- **Email sender:** Cloudflare email, to confirmed addresses.
- **When:** required at first run. After one sign-in the iPad works offline.
- **How long:** 30 days. Then the app locks until a parent signs in again.
- **Build order:** sign-in is built first, before the learning engine.
- **Existing mail on logstocks.com:** not known yet. The records are checked first and nothing is changed without asking.

**Grown-ups gate**

- **Gate:** a 4-digit PIN only, with no maths question.
- **One PIN for the family:** saved scrambled and shared across iPads.
- **Forgot PIN:** reset by typing the account password.

**Sync**

- **How:** one family backup file on Cloudflare.
- **Two iPads:** the most recent practice wins for the score, and answer counts from both are kept.

**Learning rules**

- **Trouble spot:** under 60% right.
- **Placement check:** Math and Language Arts.
- **Skills a child placed out of:** count in full toward stickers.
- **Reset:** final, with an export offered first.
- **Play button:** one session for each pick.
- **Reasoning plan:** a template the parent chooses to use.
- **Three rule fixes:** ladder prerequisites, the 14-question cap and six stage colours, all accepted.
- **Content swaps:** all accepted.

**Voice, time and extras**

- **Voice:** clips made ahead of time. Recording in a parent's voice moves to after launch.
- **Time limit:** both the in-app daily minutes and the Guided Access guide.
- **In version 1:** concept videos, Pop, Pairs and the Scratchpad all stay.
- **If the YouTube block fails on the iPad:** videos are switched off.
- **Name:** Sprout.

Two details were settled by the build plan, not by a question, and are open to change. The voice clips are kept in private storage, not in the public repo, because Apple allows its voices for personal use only. The password is stretched on the device, because the free Cloudflare plan gives very little processor time per request.

## 15. The next build, planned on Nov 17, 2026

The owner compared Sprout with IXL and chose to close five gaps: (1) more skills in every grade, (2) a running level for each topic, (4) more kinds of question, plus printable worksheets and fact fluency. They join the work already agreed that day: Grade 3 Math, Grade 2 Language Arts, the curriculum gaps (section 8) and harder Reasoning. Nothing here changes what an existing seed produces unless the step says so and bumps the skill's version.

### 15.1 Order of work

Each phase ends the same way: unit tests, the 300-seed and oracle suites, the level-rule tests, a content dump read through, the browser checks for the screens touched (on the Oracle box), a push when the owner says so.

| Phase | What | Size | Why here |
| --- | --- | --- | --- |
| A | Finish Grade 3 Math: fractions, time, area, perimeter, mass, graphs (10), and the 5 Common Core extras | 15 skills | Already under way |
| B | Running level for each topic (15.3) | Engine, dashboard | Small, and parents see it at once |
| C | Fact fluency (15.5) | Engine, one kid area, one parent page | Needs no new skills |
| D | Printable worksheets (15.6) | Parent page, print layout | Uses the generators as they are |
| E | New kinds of question (15.4) | 5 question types | New skills after this use them |
| F | Grade 2 Language Arts | 15 skills | Uses the new question types |
| G | Curriculum gaps: K to 2 Math, K to 2 reading | About 22 skills | Section 8 |
| H | More skills in every grade (15.2), in waves | About 150 skills over 5 waves | The biggest job; one grade band a wave |
| I | Harder Reasoning | 14 puzzles get age steps, 3 new puzzle types | After the content waves |

### 15.2 More skills in every grade

IXL lists 369 kindergarten Math skills. Many are one idea shown different ways: counting cubes, counting on frames, counting stickers, counting shapes. Sprout has 28. The aim is roughly to double each grade, chosen for children aged 4 to 8, not to match IXL's count.

- **Sibling skills.** One generator family can produce several catalogue skills that differ only in what is counted or shown (a `look` setting: pictures, ten frames, cubes, dot cards, tally marks, number lines). Each sibling is its own catalogue row with its own id, Skill Score and golden file. This is the cheap way to add variety without new maths.
- **New ideas** where a grade is thin: ordinal numbers (first, second), calendar and days of the week, more and less by 1 and 10, comparing with pictures and numerals mixed, even and odd with pictures, money in the earlier grades, word families and rhyming in more forms, beginning, middle and end sounds, and more sentence skills.
- **Waves.** H1: Math K and Grade 1 (about 40). H2: Math Pre-K and Grade 2 (about 35). H3: Language Arts Pre-K and K (about 30). H4: Language Arts Grade 1 and 2 (about 30). H5: Grade 3 Math (about 15). Each wave starts with its skill list written into section 8. On Nov 17, 2026 the owner said not to wait for his approval of the lists: build and test all five waves and phase I, then report.
- **Targets after all waves:** Math Pre-K 16 to about 35, K 28 to about 60, Grade 1 22 to about 50, Grade 2 22 to about 50, Grade 3 32 to about 47. Language Arts roughly doubles in each grade too.

### 15.3 A running level for each topic

IXL's real-time diagnostic keeps a level for each strand ("math level 350", mid-grade 3) that moves as the child works. Sprout gets the same, from what it already saves.

- **The level** is worked out for each ladder (counting, adding and subtracting, place value, phonics and so on), from the skill states on that ladder: the furthest skill the child has shown they know (mastered, placed past, or a Skill Score of 80 or more), plus part credit for the skill being worked on. The skill's grade turns that into a grade level, written like a school year: "about mid-grade 1" and, for a parent who wants the number, 1.5.
- **Moves with practice.** Worked out again whenever home or the dashboard opens. Nothing new is stored for today's level; a weekly snapshot of each level is stored so the dashboard can draw the line over time.
- **Where it shows:** the grown-ups dashboard, one row for each topic with its level, an arrow for the change since last week, and a small line for the last few months. A topic with nothing tried yet says "not tried yet", never a guess. Children never see a level.
- **Above the top:** a child past the last skill of a ladder shows "above Sprout's top level", the honest answer.
- **Tests:** pure functions with fixed skill states; a child who masters a skill moves up; a placed-out skill counts; a skill dropped below 80 by a failed review lowers the level.

### 15.4 New kinds of question

Five new item types, each with its component in `src/items/`, its check in `engine/check.ts`, its rules in `validate.ts`, its description for screen readers, its picture in the gallery, and a browser test with touch on the iPad sizes.

| Type | What the child does | First skills to use it |
| --- | --- | --- |
| `numberLineTap` | Taps a point on a number line | Number lines, rounding, fractions on a number line |
| `setClock` | Drags the clock hands to a time | Time to the hour, half hour, five minutes, minute |
| `buildBar` | Drags bars up to make a bar graph | Bar graphs, picture graphs |
| `columnSum` | Types digits into a written-out sum, with boxes for the carried and borrowed ones | Adding and subtracting within 1,000 |
| `dragWord` | Drags a word or number into the gap in a sentence or equation | Grammar, homophones, missing numbers |

- Existing skills gain a level that uses a new type only by adding a level at the top, so what existing seeds produce does not change. Where a level is replaced, the skill's version goes up and its golden file is renewed.
- Every new type works with one finger, has targets of at least 64px on kid screens, and gives the same "Not quite" walk-through on a miss.

### 15.5 Fact fluency

Knowing 7 + 8 or 6 × 7 at once, not by counting. XtraMath and IXL's Fluency Zone do this with timed rounds. The owner chose an always-on race for fast facts only; everywhere else a child sees no clock unless a parent turns it on.

- **Fact sets:** adding within 10, adding within 20, taking away within 10 and 20, times tables 2, 5, 10, then 3, 4, then 6 to 9, and division facts. A set opens when the child's grade reaches it, or a parent opens it.
- **Every fact is tracked on its own** (7 + 8 is one fact, 8 + 7 another), in a new record `factStates` with a zod default for old records: answers, right answers, and the time of each recent answer.
- **Fluent** means right and quick twice in a row: within 3 seconds for adding and taking away, 4 seconds for times and divide. The time is measured but not shown. A slow right answer still counts as right; it just does not make the fact fluent.
- **Rounds:** a short round of 20 facts, picked from the facts not yet fluent, with a few fluent ones mixed in to keep them. Every round is a race (the owner's choice, Nov 17, 2026): a race track shows the child's car moving with each right answer and how fast the round went. This is the one place a child sees time without a parent turning the timer on; the rule for practice is unchanged.
- **What the child sees:** a grid of the set's facts filling in with stars as they become fluent, and a "Fast facts" place in the home menu.
- **What the parent sees:** each child's grid, the facts that are slow or often wrong, and the share of each set that is fluent.
- **Skill Score is untouched.** Fact fluency is its own measure; a mastered skill stays mastered.

### 15.6 Printable worksheets

From the grown-ups area: pick a child, one or more skills (or "today's picks", or "trouble spots"), how many questions (10 or 20), and the level (the child's level, or one easier or harder). Sprout lays out a worksheet and an answer key and opens the iPad's print sheet. The certificate already prints this way.

- Questions come from the same generators with fixed seeds, so the answer key always matches. The seed is printed small in the corner, so the same sheet can be printed again.
- Each question type has a paper form: a choice question shows lettered options to circle; a number answer gets a box; ordering gets blanks to number; sorting gets lists to write into. Skills whose answer is a drag or a tap on a picture print as "draw a line" or "circle".
- Listen questions and questions that need sound are left off a worksheet, and the page says why.
- US Letter, black and white friendly, the child's name and date at the top, the app's drawn pictures in the questions.
- **Packs:** "This week's worksheets" puts the child's picks and trouble spots on 3 pages.
- Works offline. Nothing is uploaded.

### 15.7 Not in this plan

Science and social studies, Spanish, classrooms and teacher accounts, writing and speaking, Virginia SOL mapping (not chosen this time), and a check-in that tests every topic (not chosen).

### 15.8 The owner's choices on this plan, Nov 17, 2026

- The order of phases A to I as listed.
- Fast facts is always a race.
- About double the skills in every grade (about 150 new skills over five waves).


## 16. Lessons that teach (decided by the owner on Nov 17, 2026)

The owner watched the four-beat lessons with his children and found them unusable: plain statements over a still picture, no explanation of why, nothing for the child to do, and some lines wrong or repeated. They are replaced, grade by grade, starting with Kindergarten and Grade 1 (Math and Language Arts, 165 skills). Other grades keep the old lesson until their turn.

### What a lesson is

- One to two minutes. Show the idea with moving pictures, explain why it works, give the child two turns, and end on a one-line recap.
- A lesson is a list of parts. A `show` part is one **moment**: one spoken sentence (lesson pace: slower voice, one sentence at a time) and the **scene** as it is while that sentence is said. A `turn` part is a question the child answers.
- A scene is a stage of **pieces** (a picture, a numeral, a letter, a word tile, a base-ten block, a ten-frame, a box, a hand or an arrow), each with a stable id and a place on a grid. Moving from one moment to the next, each piece glides, grows, fades or lights up to its new state (CSS transitions keyed by id). Things light up as they are counted, groups slide together, a ten breaks into ones, a hand points. A child with reduced motion set sees each scene without the movement.
- Counting is said one number per moment while each piece lights in turn, so the voice and the picture never drift apart.
- A turn is a real question, made by the skill's own generator at a fixed level and seed, so validation and the oracles check it like any other question. It uses the same question components and Submit as practice. Right: the chime and a short praise, then on. Wrong: the turn's **why** moments replay the idea on that question (count again, one by one), and the child tries the same question once more. Wrong again: the right answer is shown and said, and the lesson carries on. Lesson turns never change a Skill Score.
- Controls: Pause and Play, Start again, and Back to practice. At the end: "Practise". Every control is at least 64 px. Nothing moves on before a turn is answered.
- The worked example tab stays. Its explanation is spoken at the lesson pace.

### How lessons are written

- `src/lessons/` holds the types, the stage component, the player and the **builders**: one function for each kind of teaching move (count along, join two groups, take some away, fill a ten-frame, make a teen number, hop on a number line, break a ten, say a word slowly sound by sound, swap a first sound, build a word from letters, light the words of a sentence, and so on). A skill's lesson is written with builders, so most lessons are a few lines and the same move looks the same everywhere.
- A generator gains `teach(): Lesson`. When it has one, the lesson screen plays it; otherwise the old four beats play.
- Tests for every lesson: each moment's speech passes the speech rules and the voice limits; piece ids are unique and every piece is inside the stage; each turn passes `validateQuestion` and its oracle; each turn's why ends with the turn's answer; a lesson's time is between 40 seconds and 2 minutes 30 seconds at the lesson pace (estimated from word count, with about 10 seconds for each turn); no two moments in a row say the same sentence.
- Browser test: one lesson of each builder kind is played through by touch in WebKit at phone and iPad size, answering one turn wrong and one right.

### Order

1. The player, the stage and the builders, with six sample lessons (K: count to 20, add with pictures, teen numbers, first letter, middle vowel; Grade 1: missing number). A screen recording goes to the owner before any more are written.
2. The rest of Kindergarten and Grade 1, family by family.
3. The lesson lines are recorded ahead at the lesson pace (`scripts/voice-reusable.ts`).

## 17. Mixed bag (decided by the owner on Nov 18, 2026)

- A "Mixed bag" button on home, any time. It teaches several things at once, not a test: 20 questions, 5 from each of up to 4 topics (ladders), shuffled together, all from skills the child is practising now (started, not mastered). No mastered skills are mixed in.
- Each answer counts as ordinary practice on its skill: the Skill Score moves as in practice, and a miss shows the "Not quite" walk-through with its steps.
- No separate report: it feeds the same scores, reviews and dashboard.

## 18. Today's plan (decided by the owner on Nov 18, 2026)

- "Today's plan" replaces "Today's picks" on home: one list, in order, each part ticked off when done.
  1. Review: mastered skills due today (3 questions each, as reviews are now).
  2. Keep going: skills the child is in the middle of.
  3. Learn something new: one new skill; it opens on the bulb's choice screen (video, lesson, example) before practice.
  4. Mixed bag (section 17).
- Each part has a fixed size of its own; the daily goal ring only counts questions answered.
- A grown-up sets the parts for each child in Settings: how many Keep going skills, whether to add something new each day, and the Mixed bag.
- Play becomes "Start today's plan" and works through the parts in order; any part can also be tapped on its own.
