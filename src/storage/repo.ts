import type {
  Attempt,
  AudioClip,
  AwardEarned,
  Child,
  DeviceState,
  DiagnosticProgress,
  DiagnosticResult,
  DiagnosticSubject,
  Family,
  Flag,
  Plan,
  Session,
  SkillState,
} from './schema';

// The only way the app reads and writes saved data (plan section 4).

export interface QuarantinedItem {
  store: string;
  key: string;
  raw: unknown; // exactly what was found, untouched
  error: string;
  at: string;
}

// The ten backed-up record types, plus anything that could not be read.
export interface ExportFile {
  format: 'sprout-export';
  version: number;
  exportedAt: string;
  children: Child[];
  skillStates: SkillState[];
  attempts: Attempt[];
  sessions: Session[];
  awards: AwardEarned[];
  plans: Plan[];
  diagnostics: DiagnosticResult[];
  flags: Flag[];
  diagnosticProgress: DiagnosticProgress[];
  family: Family;
  quarantined: QuarantinedItem[];
}

export interface ImportReport {
  added: number;
  updated: number;
  skipped: number;
}

export interface Repo {
  listChildren(): Promise<Child[]>; // leaves out soft-deleted children
  saveChild(c: Child): Promise<void>;
  resetChild(childId: string): Promise<void>;
  getSkillStates(childId: string): Promise<SkillState[]>;
  saveSkillState(s: SkillState): Promise<void>;
  addAttempt(a: Attempt): Promise<void>;
  // Oldest first. With a limit, the newest `limit` of them.
  listAttempts(childId: string, opts: { since?: string; until?: string; skillId?: string; limit?: number }): Promise<Attempt[]>;
  saveSession(s: Session): Promise<void>;
  listSessions(childId: string, since?: string): Promise<Session[]>;
  listAwards(childId: string): Promise<AwardEarned[]>;
  addAward(a: AwardEarned): Promise<void>;
  listPlans(): Promise<Plan[]>; // leaves out soft-deleted plans
  savePlan(p: Plan): Promise<void>;
  listDiagnostics(childId: string): Promise<DiagnosticResult[]>;
  saveDiagnostic(d: DiagnosticResult): Promise<void>;
  listFlags(): Promise<Flag[]>;
  saveFlag(f: Flag): Promise<void>;
  getDiagnosticProgress(childId: string, subject: DiagnosticSubject): Promise<DiagnosticProgress | null>;
  saveDiagnosticProgress(p: DiagnosticProgress): Promise<void>;
  getClip(key: string): Promise<AudioClip | null>;
  saveClip(c: AudioClip): Promise<void>;
  deleteClip(key: string): Promise<void>;
  listClipKeys(): Promise<string[]>;
  getFamily(): Promise<Family>; // returns defaults when nothing is saved
  saveFamily(f: Family): Promise<void>;
  getDeviceState(): Promise<DeviceState>; // returns defaults when nothing is saved
  saveDeviceState(d: DeviceState): Promise<void>; // replaces the whole record. App code uses updateDeviceState
  // Changes only the fields given, on the record as it is at that moment. Safe when several jobs run at once.
  updateDeviceState(change: Partial<Omit<DeviceState, 'id'>>): Promise<DeviceState>;
  countQuarantined(): Promise<number>;
  exportAll(): Promise<ExportFile>; // the ten backed-up record types
  importAll(file: ExportFile): Promise<ImportReport>; // validates with zod first
}
