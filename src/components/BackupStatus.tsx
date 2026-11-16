import { useEffect, useState } from 'react';
import { logError } from '../lib/errorLog';
import { openRepo } from '../storage/index';
import type { SyncStatus } from '../storage/sync';
import { SYNC_MESSAGES, onSyncStatus, syncNow, syncStatus } from '../storage/sync';
import BigButton from './BigButton';
import Notice from './Notice';

const WHEN = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// For the parent data screen: when the family's progress was last backed up,
// or what went wrong in plain words, and a button to back up now.
export default function BackupStatus() {
  const [status, setStatus] = useState<SyncStatus>(syncStatus());
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => onSyncStatus(setStatus), []);
  // The time is read again after each run.
  useEffect(() => {
    if (status.running) return;
    let alive = true;
    void openRepo()
      .then(({ repo }) => repo.getDeviceState())
      .then((device) => {
        if (alive) setLastSyncAt(device.lastSyncAt);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [status]);

  const problem = status.last !== null && status.last !== 'uploaded' && status.last !== 'upToDate' ? SYNC_MESSAGES[status.last] : null;
  return (
    <>
      <Notice role="status">{lastSyncAt ? `Last backup: ${WHEN.format(new Date(lastSyncAt))}` : 'Not backed up yet.'}</Notice>
      {problem && !status.running && <Notice role="alert">{problem}</Notice>}
      <BigButton disabled={status.running} onClick={() => void syncNow()}>
        {status.running ? 'Backing up' : 'Back up now'}
      </BigButton>
    </>
  );
}
