import { nowIso } from '../lib/clock';
import { ImportError, parseExportFile } from '../storage/exportFile';
import type { ImportReport, Repo } from '../storage/repo';

// Export and import for the parent data screen (plan section 4).

export function exportName(day: string): string {
  return `sprout-backup-${day}.json`;
}

// Everything that is backed up, as the text of one file.
export async function exportText(repo: Repo): Promise<string> {
  return JSON.stringify(await repo.exportAll());
}

// Hands the file to the iPad's share sheet. Inside a Home Screen app a plain download does nothing,
// so sharing is tried first. Where a browser cannot share files, it falls back to a download.
export async function shareExport(repo: Repo, day: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const text = await exportText(repo);
  const name = exportName(day);
  const file = typeof File === 'undefined' ? null : new File([text], name, { type: 'application/json' });
  if (file && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sprout backup' });
      await repo.updateDeviceState({ lastExportAt: nowIso() });
      return 'shared';
    } catch (error) {
      // Closing the share sheet is not a failure. Anything else: the device would not share, so download instead.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  await repo.updateDeviceState({ lastExportAt: nowIso() });
  return 'downloaded';
}

// Reads a backup file and merges it into this device. It never wipes anything.
// Throws ImportError, with words a parent can read, when the file is not a Sprout backup.
export async function importText(repo: Repo, text: string): Promise<ImportReport> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('This is not a Sprout backup file.');
  }
  return repo.importAll(parseExportFile(parsed));
}
