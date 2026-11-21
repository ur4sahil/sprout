import { z } from 'zod';

// Every stored record (plan section 4). Types are inferred from the schemas.
// A field added after version 1 always gets a default, so old records still load.

export const gradeSchema = z.enum(['PK', 'K', '1', '2', '3', '4', '5']);
export type Grade = z.infer<typeof gradeSchema>;

export const itemTypeSchema = z.enum(['choice', 'multiSelect', 'tapCount', 'numberPad', 'order', 'sort', 'match', 'tiles', 'numberLineTap', 'setClock', 'buildBar', 'columnSum', 'dragWord', 'fillShape']);
export const kindSchema = z.enum(['practice', 'review', 'diagnostic']);
const levelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const iso = z.string().min(1);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const childSettingsSchema = z.object({
  gentleScoring: z.boolean(), // default true for PK and K, false above
  sessionLength: z.number().int().min(1).max(50), // questions per session: PK 6, K 8, 1+ 10
  speechRate: z.number().min(0.7).max(1.1), // default 0.85
  autoSpeak: z.boolean(), // default true for PK, K, 1
  showTimer: z.boolean(), // default false. The only clock a child can ever see
  dailyGoalQuestions: z.number().int().min(1).max(200), // no longer read: the goal is today's plan added up (Nov 18, 2026)
  allowVideos: z.boolean(), // default true
  dailyMinutes: z.number().int().min(0).max(600), // 0 means no limit
  preReader: z.boolean(), // default true for PK and K
  // Minutes a parent added through the gate on one local day, on top of dailyMinutes.
  extraMinutes: z.object({ day: z.string(), minutes: z.number().int().min(0).max(600) }).default({ day: '', minutes: 0 }),
  // Fast-facts sets a parent opened before the child's grade reaches them (plan section 15.5).
  factSets: z.array(z.string()).default([]),
  // Today's plan (plan section 18): the subjects with a Practice part each day (one skill each), and whether to add
  // something new and the Mixed bag.
  planPractice: z.array(z.enum(['math', 'ela', 'reasoning'])).default(['math', 'ela', 'reasoning']),
  planNew: z.boolean().default(true),
  planMixed: z.boolean().default(true),
  // How the app feels (plan section 19). Calm mode: movement becomes short fades. The world: where its look comes from.
  calm: z.boolean().default(false),
  world: z.enum(['garden']).default('garden'),
  // What the child's home shows: the garden, or the plain list of today's plan (kept in case the garden misbehaves on a device).
  homeView: z.enum(['garden', 'list']).default('garden'),
  // Soft music under the garden and practice (docs/GAME_FEEL.md, phase 8). The mute switch silences it too.
  music: z.boolean().default(true),
});
export type ChildSettings = z.infer<typeof childSettingsSchema>;

export function defaultSettings(grade: Grade): ChildSettings {
  const young = grade === 'PK' || grade === 'K';
  return {
    gentleScoring: young,
    sessionLength: grade === 'PK' ? 6 : grade === 'K' ? 8 : 10,
    speechRate: 0.85,
    autoSpeak: young || grade === '1',
    showTimer: false,
    dailyGoalQuestions: 15,
    allowVideos: true,
    dailyMinutes: 0,
    preReader: young,
    extraMinutes: { day: '', minutes: 0 },
    factSets: [],
    planPractice: ['math', 'ela', 'reasoning'],
    planNew: true,
    planMixed: true,
    calm: false,
    world: 'garden',
    homeView: 'garden',
    music: true,
  };
}

export const childSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  avatar: z.string().min(1), // one emoji
  grade: gradeSchema,
  settings: childSettingsSchema,
  resetAt: iso.nullable(), // rows for this child made before this time are dead
  // One snapshot of the topic levels a week (plan section 15.3), keyed by the week's Monday. A topic
  // the child has not tried is left out. The newest 26 weeks are kept.
  levelWeeks: z.array(z.object({ week: z.string(), at: iso, levels: z.record(z.string(), z.number()) })).default([]),
  // Stories the child has finished (docs/GAME_FEEL.md, phase 7): the episode's id, never its place in a list, and the
  // local day it was finished, which is what allows at most one new story a day.
  storiesRead: z.array(z.object({ episodeId: z.string().min(1), day: z.string() })).default([]),
  // Stickers the child has pressed into the sticker book: award ids.
  stickersPlaced: z.array(z.string().min(1)).default([]),
  createdAt: iso,
  updatedAt: iso,
  deletedAt: iso.nullable(),
});
export type Child = z.infer<typeof childSchema>;

export const skillStateSchema = z.object({
  childId: z.string().min(1),
  skillId: z.string().min(1),
  score: z.number().int().min(0).max(100),
  bestScore: z.number().int().min(0).max(100), // highest score ever reached
  streak: z.number().int().min(0), // consecutive correct, resets on a miss
  attempts: z.number().int().min(0),
  correct: z.number().int().min(0),
  hintedRight: z.number().int().min(0).default(0), // right answers given after a hint (they count for half)
  recent: z.array(z.boolean()).max(10), // last 10 results, newest last
  masteredAt: iso.nullable(),
  placedOut: z.boolean(), // set by the diagnostic
  reviewBox: z.number().int().min(0).max(4),
  reviewDueAt: iso.nullable(), // due once today's local day reaches this time's local day
  lastPracticedAt: iso.nullable(),
  updatedAt: iso,
});
export type SkillState = z.infer<typeof skillStateSchema>;

// One number fact for one child (plan section 15.5): 7 + 8 and 8 + 7 are two rows.
export const factStateSchema = z.object({
  childId: z.string().min(1),
  factId: z.string().min(1), // "7+8", "15-7", "6×7", "42÷6"
  answers: z.number().int().min(0),
  right: z.number().int().min(0),
  recent: z.array(z.object({ right: z.boolean(), ms: z.number().int().min(0) })).max(4), // newest last
  updatedAt: iso,
});
export type FactState = z.infer<typeof factStateSchema>;

export const attemptSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  skillId: z.string().min(1),
  sessionId: z.string().min(1),
  level: levelSchema, // the level actually asked
  seed: z.number().int().min(0), // the seed that produced the question shown
  itemType: itemTypeSchema,
  response: z.unknown(), // exactly what the child submitted
  contentVersion: z.number().int().min(1), // the skill's version when answered
  snapshot: z.object({ prompt: z.string(), correct: z.string(), given: z.string() }),
  correct: z.boolean(),
  hinted: z.boolean().default(false), // the child opened a hint on this question before answering
  ms: z.number().int().min(0).max(120_000), // question shown to answer submitted, capped
  scoreBefore: z.number().int().min(0).max(100),
  scoreAfter: z.number().int().min(0).max(100),
  kind: kindSchema,
  day, // local calendar date
  createdAt: iso,
});
export type Attempt = z.infer<typeof attemptSchema>;

export const sessionSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  kind: kindSchema,
  skillId: z.string().nullable(),
  startedAt: iso,
  endedAt: iso.nullable(),
  questions: z.number().int().min(0),
  correct: z.number().int().min(0),
  day, // local calendar date of startedAt
  mixed: z.boolean().default(false), // practice that was part of a Mixed bag (plan section 17)
});
export type Session = z.infer<typeof sessionSchema>;

export const awardEarnedSchema = z.object({ childId: z.string().min(1), awardId: z.string().min(1), earnedAt: iso });
export type AwardEarned = z.infer<typeof awardEarnedSchema>;

export const planSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  skillIds: z.array(z.string()),
  childIds: z.array(z.string()),
  createdAt: iso,
  updatedAt: iso,
  deletedAt: iso.nullable(),
});
export type Plan = z.infer<typeof planSchema>;

export const diagnosticSubjectSchema = z.enum(['math', 'ela']);
export type DiagnosticSubject = z.infer<typeof diagnosticSubjectSchema>;

export const diagnosticResultSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  subject: diagnosticSubjectSchema,
  ladderId: z.string().min(1),
  placementSkillId: z.string().nullable(), // the skill to start on. null = passed the whole ladder
  estimateGrade: gradeSchema.nullable(), // grade of the placement skill
  estimateFraction: z.number().min(0).max(1).nullable(), // 0.4 = 40% through that grade on this ladder
  takenAt: iso,
});
export type DiagnosticResult = z.infer<typeof diagnosticResultSchema>;

export const flagSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  attemptId: z.string().min(1),
  skillId: z.string().min(1),
  level: levelSchema,
  seed: z.number().int().min(0),
  note: z.string().max(500),
  createdAt: iso,
  resolvedAt: iso.nullable(),
});
export type Flag = z.infer<typeof flagSchema>;

export const ladderWalkSchema = z.object({
  currentSkillId: z.string().nullable(), // the skill being tested now
  right: z.number().int().min(0).default(0), // answers so far on the current skill
  wrong: z.number().int().min(0).default(0),
  passed: z.array(z.string()), // skill ids
  failed: z.array(z.string()), // skill ids
  asked: z.number().int().min(0),
  done: z.boolean(),
});
export type LadderWalk = z.infer<typeof ladderWalkSchema>;

export const diagnosticProgressSchema = z.object({
  childId: z.string().min(1),
  subject: diagnosticSubjectSchema,
  ladders: z.record(z.string(), ladderWalkSchema), // keyed by ladder id
  sittings: z.number().int().min(0),
  done: z.boolean(),
  lastSittingDay: z.string().default(''), // the local day the latest sitting ended, so home offers one check-in a day
  updatedAt: iso,
});
export type DiagnosticProgress = z.infer<typeof diagnosticProgressSchema>;

export const familySchema = z.object({
  id: z.literal('family'),
  pinSalt: z.string().nullable(), // null until a parent sets the PIN
  pinHash: z.string().nullable(), // PBKDF2 of the 4-digit PIN with pinSalt. Never the PIN itself
  removedVideos: z.array(z.string()).default([]), // skill ids whose video a parent took away, for every device
  updatedAt: iso,
});
export type Family = z.infer<typeof familySchema>;

export const loggedErrorSchema = z.object({ at: iso, message: z.string(), stack: z.string().nullable() });

export const deviceStateSchema = z.object({
  id: z.literal('device'),
  muted: z.boolean().default(false), // covers the voice and sound effects
  signedInEmail: z.string().nullable().default(null), // kept on the device only, never exported
  sessionExpiresAt: iso.nullable().default(null), // from the server. Past this, the app locks
  lastSyncAt: iso.nullable().default(null),
  backupVersion: z.string().nullable().default(null), // the server file version this device last merged
  dirty: z.boolean().default(false), // a backed-up record changed since the last upload
  voicePackVersion: z.string().nullable().default(null),
  persistGranted: z.boolean().nullable().default(null), // answer from navigator.storage.persist()
  lastExportAt: iso.nullable().default(null),
  browserModeAccepted: z.boolean().default(false), // parent chose "Use in this browser anyway"
  catalogueVersion: z.number().int().min(0).default(0),
  removedVideos: z.array(z.string()).default([]), // from before online storage. Moved into the family record, and no longer read
  movedOnline: z.boolean().default(false), // this device's older records have been sent up to the server
  errors: z.array(loggedErrorSchema).max(20).default([]), // last 20
});
export type DeviceState = z.infer<typeof deviceStateSchema>;

// One clip from the voice pack, kept on the device only. Bytes, never a Blob.
export interface AudioClip {
  key: string; // 'letter:a', 'number:7', 'phrase:great-job'
  bytes: ArrayBuffer;
  mimeType: string; // 'audio/mp4'
  packVersion: string;
}
export const audioClipSchema = z.object({
  key: z.string().min(1),
  // Checked by what it is, not by `instanceof`: a buffer made in another frame or worker is still a buffer.
  bytes: z.custom<ArrayBuffer>((value) => Object.prototype.toString.call(value) === '[object ArrayBuffer]', 'bytes must be an ArrayBuffer'),
  mimeType: z.string().min(1),
  packVersion: z.string().min(1),
});

export function newSkillState(childId: string, skillId: string, nowIso: string): SkillState {
  return {
    childId,
    skillId,
    score: 0,
    bestScore: 0,
    streak: 0,
    attempts: 0,
    correct: 0,
    hintedRight: 0,
    recent: [],
    masteredAt: null,
    placedOut: false,
    reviewBox: 0,
    reviewDueAt: null,
    lastPracticedAt: null,
    updatedAt: nowIso,
  };
}
