import { useEffect, useState } from 'react';
import { useAppStore } from '../app/store';
import { logError } from '../lib/errorLog';
import { openRepo, syncFamily, waitingToSend } from '../storage/index';
import BigButton from './BigButton';
import Notice from './Notice';

const WHEN = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// For the parent data screen: whether this device is in step with the server, how much it still
// has to send, and a button to do it now.
export default function OnlineStatus() {
  const link = useAppStore((s) => s.link);
  const [busy, setBusy] = useState(false);
  const [facts, setFacts] = useState<{ waiting: number; last: string | null } | null>(null);

  useEffect(() => {
    if (busy) return;
    let alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const [waiting, device] = [await waitingToSend(), await repo.getDeviceState()];
      if (alive) setFacts({ waiting, last: device.lastSyncAt });
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, [busy, link]);

  async function run(): Promise<void> {
    setBusy(true);
    try {
      await syncFamily();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {facts && (
        <Notice role="status">
          <span data-fact="last-sync">{facts.last ? `In step with the server: ${WHEN.format(new Date(facts.last))}.` : 'Not yet in step with the server.'}</span>{' '}
          <span data-fact="waiting">{facts.waiting === 0 ? 'Nothing is waiting to be sent.' : `${facts.waiting} ${facts.waiting === 1 ? 'change is' : 'changes are'} waiting to be sent.`}</span>
        </Notice>
      )}
      {link === 'offline' && <Notice role="alert">No internet. Changes are kept on this device and sent when it is back.</Notice>}
      <BigButton disabled={busy} onClick={() => void run()}>
        {busy ? 'Working' : 'Send and fetch now'}
      </BigButton>
    </>
  );
}
