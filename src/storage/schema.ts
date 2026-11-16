import { z } from 'zod';

// Every stored record (plan section 4). Types are inferred from the schemas.
// A field added after version 1 always gets a default, so old records still load.

export const gradeSchema = z.enum(['PK', 'K', '1', '2', '3', '4', '5']);
export type Grade = z.infer<typeof gradeSchema>;

export const itemTypeSchema = z.enum(['choice', 'multiSelect', 'tapCount', 'numberPad', 'order', 'sort', 'match', 'tiles']);
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
  dailyGoalQuestions: z.number().int().min(1).max(200), // default 15
  allowVideos: z.boolean(), // default true
  dailyMinutes: z.number().int().min(0).max(600), // 0 means no limit
  preReader: z.boolean(), // default true for PK and K
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
  };
}

export const childSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  avatar: z.string().min(1), // one emoji
  grade: gradeSchema,
  settings: childSettingsSchema,
  resetAt: iso.nullable(), // rows for this child made before this time are dead
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
  recent: z.array(z.boolean()).max(10), // last 10 results, newest last
  masteredAt: iso.nullable(),
  placedOut: z.boolean(), // set by the diagnostic
  reviewBox: z.number().int().min(0).max(4),
  reviewDueAt: iso.nullable(), // due once today's local day reaches this time's local day
  lastPracticedAt: iso.nullable(),
  updatedAt: iso,
});
export type SkillState = z.infer<typeof skillStateSchema>;

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
  updatedAt: iso,
});
export type DiagnosticProgress = z.infer<typeof diagnosticProgressSchema>;

export const familySchema = z.object({
  id: z.literal('family'),
  pinSalt: z.string().nullable(), // null until a parent sets the PIN
  pinHash: z.string().nullable(), // PBKDF2 of the 4-digit PIN with pinSalt. Never the PIN itself
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
  bytes: z.instanceof(ArrayBuffer),
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
    recent: [],
    masteredAt: null,
    placedOut: false,
    reviewBox: 0,
    reviewDueAt: null,
    lastPracticedAt: null,
    updatedAt: nowIso,
  };
}
