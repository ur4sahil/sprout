import type { z } from 'zod';
import { canonicalJson } from '../engine/canonical';
import { isDead, laterWins, mergeChild, mergeSkillState, recount } from '../engine/merge';
import { nowIso } from '../lib/clock';
import { logError } from '../lib/errorLog';
import type { Backend, StoreName } from './backend';
import { CHILD_STORES } from './backend';
import { EXPORT_FORMAT, EXPORT_VERSION, parseExportFile } from './exportFile';
import type { ExportFile, ImportReport, Repo } from './repo';
import type { Attempt, AwardEarned, Child, DeviceState, DiagnosticProgress, DiagnosticResult, Family, Flag, Plan, Session, SkillState } from './schema';
import {
  attemptSchema,
  audioClipSchema,
  awardEarnedSchema,
  childSchema,
  deviceStateSchema,
  diagnosticProgressSchema,
  diagnosticResultSchema,
  familySchema,
  flagSchema,
  planSchema,
  sessionSchema,
  skillStateSchema,
} from './schema';

// Every rule a Repo follows, written once over a plain Backend:
// each record read passes its schema, a record that fails is quarantined and left out,
// rows made before a child's reset are dead, and any write to a backed-up record sets `dirty`.

const EPOCH = '1970-01-01T00:00:00.000Z';

type Put = { store: StoreName; key: string; value: unknown };
type Remove = { store: StoreName; key: string };

const keys = {
  skillState: (s: Pick<SkillState, 'childId' | 'skillId'>) => `${s.childId}|${s.skillId}`,
  award: (a: Pick<AwardEarned, 'childId' | 'awardId'>) => `${a.childId}|${a.awardId}`,
  progress: (p: Pick<DiagnosticProgress, 'childId' | 'subject'>) => `${p.childId}|${p.subject}`,
};

// When each child-owned row was made, for the reset rule.
const madeAt: Record<string, (row: never) => string> = {
  skillStates: (row: SkillState) => row.updatedAt,
  attempts: (row: Attempt) => row.createdAt,
  sessions: (row: Session) => row.startedAt,
  awards: (row: AwardEarned) => row.earnedAt,
  diagnostics: (row: DiagnosticResult) => row.takenAt,
  flags: (row: Flag) => row.createdAt,
  diagnosticProgress: (row: DiagnosticProgress) => row.updatedAt,
};

function timeOf(store: StoreName, row: unknown): string {
  const read = madeAt[store] as ((row: unknown) => string) | undefined;
  return read ? read(row) : EPOCH;
}

export function makeRepo(backend: Backend): Repo {
  async function parse<S extends z.ZodType>(store: StoreName, key: string, raw: unknown, schema: S): Promise<z.infer<S> | null> {
    const result = schema.safeParse(raw);
    if (result.success) return result.data;
    // Keep an untouched copy, say so, and leave it out. Never crash a screen.
    const error = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    await backend.quarantine({ store, key, raw, error, at: nowIso() });
    logError(new Error(`A saved ${store} record could not be read (${key})`));
    return null;
  }

  async function readAll<S extends z.ZodType>(store: StoreName, schema: S, childId?: string): Promise<z.infer<S>[]> {
    const rows = childId === undefined ? await backend.all(store) : await backend.byChild(store, childId);
    const out: z.infer<S>[] = [];
    for (const row of rows) {
      const value = await parse(store, row.key, row.value, schema);
      if (value !== null) out.push(value);
    }
    return out;
  }

  async function allChildren(): Promise<Child[]> {
    return readAll('children', childSchema);
  }

  async function resetTimes(): Promise<Map<string, string | null>> {
    return new Map((await allChildren()).map((child) => [child.id, child.resetAt]));
  }

  // Rows of one child that are still alive after any reset.
  async function alive<S extends z.ZodType<{ childId: string }>>(store: StoreName, schema: S, childId?: string): Promise<z.infer<S>[]> {
    const resets = await resetTimes();
    const rows = await readAll(store, schema, childId);
    return rows.filter((row) => !isDead(timeOf(store, row), resets.get(row.childId) ?? null));
  }

  async function readDevice(): Promise<DeviceState> {
    const raw = await backend.get('device', 'device');
    const parsed = raw === undefined ? null : await parse('device', 'device', raw, deviceStateSchema);
    return parsed ?? deviceStateSchema.parse({ id: 'device' });
  }

  // The extra write that marks the device as holding changes not yet backed up.
  async function dirtyPut(): Promise<Put[]> {
    const device = await readDevice();
    return device.dirty ? [] : [{ store: 'device', key: 'device', value: { ...device, dirty: true } }];
  }

  async function save(puts: Put[], removes: Remove[] = []): Promise<void> {
    await backend.write({ puts: [...puts, ...(await dirtyPut())], removes });
  }

  const repo: Repo = {
    async listChildren() {
      return (await allChildren()).filter((child) => child.deletedAt === null).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },
    async saveChild(c) {
      await save([{ store: 'children', key: c.id, value: childSchema.parse(c) }]);
    },
    async resetChild(childId) {
      const raw = await backend.get('children', childId);
      const child = raw === undefined ? null : await parse('children', childId, raw, childSchema);
      if (!child) return;
      const at = nowIso();
      const removes: Remove[] = [];
      for (const store of CHILD_STORES) {
        for (const row of await backend.byChild(store, childId)) removes.push({ store, key: row.key });
      }
      await save([{ store: 'children', key: childId, value: { ...child, resetAt: at, updatedAt: at } }], removes);
    },
    async getSkillStates(childId) {
      return alive('skillStates', skillStateSchema, childId);
    },
    async saveSkillState(s) {
      await save([{ store: 'skillStates', key: keys.skillState(s), value: skillStateSchema.parse(s) }]);
    },
    async addAttempt(a) {
      if ((await backend.get('attempts', a.id)) !== undefined) return; // only ever added
      await save([{ store: 'attempts', key: a.id, value: attemptSchema.parse(a) }]);
    },
    async listAttempts(childId, opts) {
      const rows = (await alive('attempts', attemptSchema, childId))
        .filter((a) => (opts.skillId === undefined || a.skillId === opts.skillId) && (opts.since === undefined || a.createdAt >= opts.since) && (opts.until === undefined || a.createdAt <= opts.until))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      return opts.limit === undefined ? rows : rows.slice(Math.max(0, rows.length - Math.max(0, opts.limit)));
    },
    async saveSession(s) {
      await save([{ store: 'sessions', key: s.id, value: sessionSchema.parse(s) }]);
    },
    async listSessions(childId, since) {
      return (await alive('sessions', sessionSchema, childId))
        .filter((s) => since === undefined || s.startedAt >= since)
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
    },
    async listAwards(childId) {
      return (await alive('awards', awardEarnedSchema, childId)).sort((a, b) => a.earnedAt.localeCompare(b.earnedAt) || a.awardId.localeCompare(b.awardId));
    },
    async addAward(a) {
      // An award, once earned, is never taken back or re-dated.
      const existing = await backend.get('awards', keys.award(a));
      if (existing !== undefined) {
        const resets = await resetTimes();
        const old = awardEarnedSchema.safeParse(existing);
        if (old.success && !isDead(old.data.earnedAt, resets.get(a.childId) ?? null)) return;
      }
      await save([{ store: 'awards', key: keys.award(a), value: awardEarnedSchema.parse(a) }]);
    },
    async listPlans() {
      return (await readAll('plans', planSchema)).filter((plan) => plan.deletedAt === null).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },
    async savePlan(p) {
      await save([{ store: 'plans', key: p.id, value: planSchema.parse(p) }]);
    },
    async listDiagnostics(childId) {
      return (await alive('diagnostics', diagnosticResultSchema, childId)).sort((a, b) => a.takenAt.localeCompare(b.takenAt) || a.id.localeCompare(b.id));
    },
    async saveDiagnostic(d) {
      await save([{ store: 'diagnostics', key: d.id, value: diagnosticResultSchema.parse(d) }]);
    },
    async listFlags() {
      return (await alive('flags', flagSchema)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },
    async saveFlag(f) {
      await save([{ store: 'flags', key: f.id, value: flagSchema.parse(f) }]);
    },
    async getDiagnosticProgress(childId, subject) {
      const found = (await alive('diagnosticProgress', diagnosticProgressSchema, childId)).find((p) => p.subject === subject);
      return found ?? null;
    },
    async saveDiagnosticProgress(p) {
      await save([{ store: 'diagnosticProgress', key: keys.progress(p), value: diagnosticProgressSchema.parse(p) }]);
    },
    // Voice clips and the device record stay on the device, so they never set `dirty`.
    async getClip(key) {
      const raw = await backend.get('clips', key);
      return raw === undefined ? null : await parse('clips', key, raw, audioClipSchema);
    },
    async saveClip(c) {
      await backend.write({ puts: [{ store: 'clips', key: c.key, value: audioClipSchema.parse(c) }] });
    },
    async deleteClip(key) {
      await backend.write({ removes: [{ store: 'clips', key }] });
    },
    async listClipKeys() {
      return (await backend.keys('clips')).sort();
    },
    async getFamily() {
      const raw = await backend.get('family', 'family');
      const parsed = raw === undefined ? null : await parse('family', 'family', raw, familySchema);
      return parsed ?? { id: 'family', pinSalt: null, pinHash: null, updatedAt: EPOCH };
    },
    async saveFamily(f) {
      await save([{ store: 'family', key: 'family', value: familySchema.parse(f) }]);
    },
    getDeviceState: readDevice,
    async saveDeviceState(d) {
      await backend.write({ puts: [{ store: 'device', key: 'device', value: deviceStateSchema.parse(d) }] });
    },
    async countQuarantined() {
      return (await backend.quarantined()).length;
    },
    async exportAll() {
      const file: ExportFile = {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportedAt: nowIso(),
        children: await allChildren(), // soft-deleted ones too, so a delete travels
        skillStates: await alive('skillStates', skillStateSchema),
        attempts: await alive('attempts', attemptSchema),
        sessions: await alive('sessions', sessionSchema),
        awards: await alive('awards', awardEarnedSchema),
        plans: await readAll('plans', planSchema),
        diagnostics: await alive('diagnostics', diagnosticResultSchema),
        flags: await alive('flags', flagSchema),
        diagnosticProgress: await alive('diagnosticProgress', diagnosticProgressSchema),
        family: await repo.getFamily(),
        quarantined: await backend.quarantined(),
      };
      return file;
    },
    async importAll(input) {
      // Checked in full before anything is changed. A bad file throws and leaves the device as it was.
      const file = parseExportFile(input);
      const report: ImportReport = { added: 0, updated: 0, skipped: 0 };
      const puts: Put[] = [];
      const removes: Remove[] = [];
      const same = (a: unknown, b: unknown): boolean => canonicalJson(a) === canonicalJson(b);

      // Children first: their reset times decide which other rows are dead.
      const localChildren = new Map((await allChildren()).map((child) => [child.id, child]));
      const resets = new Map<string, string | null>([...localChildren].map(([id, child]) => [id, child.resetAt]));
      for (const incoming of file.children) {
        const local = localChildren.get(incoming.id);
        const merged = local ? mergeChild(local, incoming) : incoming;
        if (!local) report.added += 1;
        else if (same(local, merged)) report.skipped += 1;
        else report.updated += 1;
        if (!local || !same(local, merged)) puts.push({ store: 'children', key: merged.id, value: merged });
        resets.set(merged.id, merged.resetAt);
      }
      const dead = (store: StoreName, row: { childId: string }): boolean => isDead(timeOf(store, row), resets.get(row.childId) ?? null);

      // A later reset from another device removes this device's older rows for that child.
      const removed = new Set<string>();
      for (const [childId, resetAt] of resets) {
        if (resetAt === null || resetAt === (localChildren.get(childId)?.resetAt ?? null)) continue;
        for (const store of CHILD_STORES) {
          for (const row of await backend.byChild(store, childId)) {
            const time = timeOf(store, row.value);
            if (typeof time === 'string' && time < resetAt) {
              removes.push({ store, key: row.key });
              removed.add(`${store}|${row.key}`);
            }
          }
        }
      }

      // Plans: the later copy wins.
      const localPlans = new Map((await readAll('plans', planSchema)).map((plan) => [plan.id, plan]));
      for (const incoming of file.plans) {
        const local = localPlans.get(incoming.id);
        if (!local) {
          puts.push({ store: 'plans', key: incoming.id, value: incoming });
          report.added += 1;
        } else if (laterWins<Plan>(local, incoming) === incoming) {
          puts.push({ store: 'plans', key: incoming.id, value: incoming });
          report.updated += 1;
        } else report.skipped += 1;
      }

      // Rows that are only ever added.
      const touched = new Set<string>(); // child|skill pairs that gained attempts
      const addOnly = async <T extends { childId: string }>(store: StoreName, rows: T[], keyOf: (row: T) => string, onAdd?: (row: T) => void): Promise<void> => {
        const have = new Set(await backend.keys(store));
        for (const row of rows) {
          const key = keyOf(row);
          const present = have.has(key) && !removed.has(`${store}|${key}`);
          if (dead(store, row) || present) {
            report.skipped += 1;
            continue;
          }
          have.add(key);
          puts.push({ store, key, value: row });
          report.added += 1;
          onAdd?.(row);
        }
      };
      await addOnly('attempts', file.attempts, (a) => a.id, (a) => touched.add(keys.skillState(a)));
      await addOnly('sessions', file.sessions, (s) => s.id);
      await addOnly('awards', file.awards, keys.award);
      await addOnly('diagnostics', file.diagnostics, (d) => d.id);
      await addOnly('flags', file.flags, (f) => f.id);

      // Skill states: merged, then answer counts recounted from the joined attempt log.
      const localStates = new Map((await readAll('skillStates', skillStateSchema)).filter((s) => !dead('skillStates', s)).map((s) => [keys.skillState(s), s]));
      const incomingStates = new Map(file.skillStates.filter((s) => !dead('skillStates', s)).map((s) => [keys.skillState(s), s]));
      report.skipped += file.skillStates.length - incomingStates.size;
      const joinedLog = async (): Promise<Attempt[]> => {
        const localLog = (await readAll('attempts', attemptSchema)).filter((a) => !dead('attempts', a));
        const added = puts.filter((put) => put.store === 'attempts').map((put) => put.value as Attempt);
        return [...localLog, ...added];
      };
      const log = touched.size > 0 ? await joinedLog() : [];
      for (const key of new Set([...incomingStates.keys(), ...touched])) {
        const local = localStates.get(key);
        const incoming = incomingStates.get(key);
        let merged = local && incoming ? mergeSkillState(local, incoming) : (incoming ?? local);
        if (!merged) continue;
        if (touched.has(key)) merged = recount(merged, log);
        if (!local) report.added += 1;
        else if (same(local, merged)) {
          if (incoming) report.skipped += 1;
          continue;
        } else report.updated += 1;
        puts.push({ store: 'skillStates', key, value: merged });
      }

      // Diagnostic progress and the family record: the later copy wins.
      const localProgress = new Map((await readAll('diagnosticProgress', diagnosticProgressSchema)).filter((p) => !dead('diagnosticProgress', p)).map((p) => [keys.progress(p), p]));
      for (const incoming of file.diagnosticProgress) {
        const key = keys.progress(incoming);
        const local = localProgress.get(key);
        if (dead('diagnosticProgress', incoming)) report.skipped += 1;
        else if (!local) {
          puts.push({ store: 'diagnosticProgress', key, value: incoming });
          report.added += 1;
        } else if (laterWins(local, incoming) === incoming) {
          puts.push({ store: 'diagnosticProgress', key, value: incoming });
          report.updated += 1;
        } else report.skipped += 1;
      }
      const family: Family = await repo.getFamily();
      if (laterWins(family, file.family) === file.family) {
        puts.push({ store: 'family', key: 'family', value: file.family });
        report.updated += 1;
      } else report.skipped += 1;

      if (puts.length > 0 || removes.length > 0) await save(puts, removes);
      return report;
    },
  };
  return repo;
}
