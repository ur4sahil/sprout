import { z } from 'zod';
import type { ExportFile } from './repo';
import {
  attemptSchema,
  awardEarnedSchema,
  childSchema,
  diagnosticProgressSchema,
  diagnosticResultSchema,
  familySchema,
  flagSchema,
  planSchema,
  sessionSchema,
  skillStateSchema,
} from './schema';

// The export file (plan section 4, Versions). Every export starts with its format and version.

export const EXPORT_FORMAT = 'sprout-export';
export const EXPORT_VERSION = 1;

const quarantinedSchema = z.object({ store: z.string(), key: z.string(), raw: z.unknown(), error: z.string(), at: z.string() });

export const exportFileSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int().min(1),
  exportedAt: z.string().min(1),
  children: z.array(childSchema),
  skillStates: z.array(skillStateSchema),
  attempts: z.array(attemptSchema),
  sessions: z.array(sessionSchema),
  awards: z.array(awardEarnedSchema),
  plans: z.array(planSchema),
  diagnostics: z.array(diagnosticResultSchema),
  flags: z.array(flagSchema),
  diagnosticProgress: z.array(diagnosticProgressSchema),
  family: familySchema,
  quarantined: z.array(quarantinedSchema).default([]),
});

export class ImportError extends Error {}

// One step for each older version: step N turns a version N file into version N + 1.
const UPGRADES: Record<number, (file: Record<string, unknown>) => Record<string, unknown>> = {};

// Checks a file before anything is changed. Throws ImportError with a message a parent can read.
export function parseExportFile(input: unknown): ExportFile {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new ImportError('This is not a Sprout backup file.');
  let file = input as Record<string, unknown>;
  if (file.format !== EXPORT_FORMAT) throw new ImportError('This is not a Sprout backup file.');
  const version = file.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) throw new ImportError('This backup file has no version.');
  if (version > EXPORT_VERSION) {
    throw new ImportError('This backup was made by a newer version of Sprout. Update the app on this device, then try again.');
  }
  for (let from = version; from < EXPORT_VERSION; from += 1) {
    const upgrade = UPGRADES[from];
    if (!upgrade) throw new ImportError('This backup is too old to read.');
    file = { ...upgrade(file), version: from + 1 };
  }
  const parsed = exportFileSchema.safeParse(file);
  if (!parsed.success) throw new ImportError('This backup file is damaged and cannot be read.');
  return parsed.data as ExportFile;
}

export function parseExportText(text: string): ExportFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('This is not a Sprout backup file.');
  }
  return parseExportFile(raw);
}

export function exportFileName(day: string): string {
  return `sprout-backup-${day}.json`;
}

// Hands the file to the share sheet, so it can be saved to Files or sent by AirDrop from inside
// the Home Screen app. Falls back to a download link on laptops. Returns how it was handed over.
export async function shareExport(file: ExportFile, day: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = exportFileName(day);
  const text = JSON.stringify(file);
  const blob = new File([text], name, { type: 'application/json' });
  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [blob] })) {
    try {
      await navigator.share({ files: [blob], title: 'Sprout backup' });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Sharing failed for another reason: fall through to a download.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
