import { useEffect, useRef, useState } from 'react';
import { importText, shareExport } from '../../app/dataTools';
import { endPass } from '../../app/pin';
import { useAppStore } from '../../app/store';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import Notice from '../../components/Notice';
import SelectField from '../../components/SelectField';
import { localDay, localDayOf } from '../../lib/clock';
import { logError, recentErrors } from '../../lib/errorLog';
import { isInstalled } from '../../lib/platform';
import { failureMessage, signOut, signOutEverywhere } from '../../storage/account';
import { ImportError } from '../../storage/exportFile';
import { openRepo } from '../../storage/index';
import type { DeviceState, Flag } from '../../storage/schema';
import OnlineStatus from '../../components/OnlineStatus';
import ParentArea from './ParentArea';
import styles from './Parent.module.css';
import { useChildren } from './useChildren';

const CREDITS = [
  'Sprout was built for one family. It is not connected to IXL.',
  'The order of the math skills and the kinds of question follow Illustrative Mathematics K–5, © Illustrative Mathematics, used under the CC BY 4.0 licence.',
  'Pictures are the emoji that come with this device.',
  'Skills follow the Common Core State Standards. © Copyright 2010. National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved.',
  'Sound effects are from Interface Sounds by Kenney (kenney.nl), given to the public domain (CC0).',
  'Built with React, Vite, zustand, zod and idb, each under its own open licence.',
];

// Export, import, reset one child, backup, sign-in, storage, saved errors and credits.
export default function Data() {
  const account = useAppStore((s) => s.account);
  const storageSaved = useAppStore((s) => s.storageSaved);
  const { children, child, pick, reload } = useChildren();
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [unreadable, setUnreadable] = useState(0);
  const [flags, setFlags] = useState<Flag[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { repo } = await openRepo();
      const [state, count, list] = await Promise.all([repo.getDeviceState(), repo.countQuarantined(), repo.listFlags()]);
      if (!alive) return;
      setDevice(state);
      setUnreadable(count);
      setFlags(list.filter((flag) => flag.resolvedAt === null));
    })().catch(logError);
    return () => {
      alive = false;
    };
  }, [message]);

  const say = (text: string, bad = false): void => setMessage({ text, bad });

  async function run(job: () => Promise<void>): Promise<void> {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await job();
    } catch (error) {
      if (error instanceof ImportError) say(error.message, true);
      else {
        logError(error);
        say('That did not work. Try again.', true);
      }
    }
    setBusy(false);
  }

  const doExport = (): Promise<void> =>
    run(async () => {
      const outcome = await shareExport((await openRepo()).repo, localDay());
      if (outcome !== 'cancelled') say(outcome === 'shared' ? 'The backup file was shared.' : 'The backup file was saved to your downloads.');
    });

  const doImport = (file: File): Promise<void> =>
    run(async () => {
      const report = await importText((await openRepo()).repo, await file.text());
      say(`Imported. ${report.added} added, ${report.updated} updated, ${report.skipped} skipped.`);
      reload();
    });

  const doReset = (): Promise<void> =>
    run(async () => {
      if (!child) return;
      await (await openRepo()).repo.resetChild(child.id);
      setConfirming(false);
      say(`${child.name} starts again from the beginning.`);
      reload();
    });

  const leave = (everywhere: boolean): Promise<void> =>
    run(async () => {
      const result = await (everywhere ? signOutEverywhere() : signOut());
      if (result.ok) endPass();
      else say(failureMessage(result.reason), true);
    });

  const errors = recentErrors();
  const installed = typeof navigator !== 'undefined' && isInstalled(navigator, (query) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
  return (
    <ParentArea page="data" title="Data">
      {message && <Notice role={message.bad ? 'alert' : 'status'}>{message.text}</Notice>}

      <section className={styles.panel} aria-label="Backup file">
        <h2>Backup file</h2>
        <p className={styles.soft}>A backup file holds every child, score and answer. Importing a file adds to what is here. It never wipes anything.</p>
        <CenterRow>
          <BigButton disabled={busy} onClick={() => void doExport()}>
            Export everything
          </BigButton>
          <BigButton disabled={busy} onClick={() => fileInput.current?.click()}>
            Import a file
          </BigButton>
        </CenterRow>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          aria-hidden="true"
          tabIndex={-1}
          data-import-file=""
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void doImport(file);
          }}
        />
        {device?.lastExportAt && <p className={styles.soft}>Last export: {localDayOf(device.lastExportAt)}</p>}
      </section>

      <section className={styles.panel} aria-label="Saved online">
        <h2>Saved online</h2>
        <p className={styles.soft}>Your family's progress is kept online and on this device. Each change is sent as it happens, or when the internet is back, and every signed-in device shows the same children and scores.</p>
        <OnlineStatus />
      </section>

      {children !== null && children.length > 0 && child && (
        <section className={styles.panel} aria-label="Reset a child">
          <h2>Reset a child</h2>
          {children.length > 1 && <SelectField label="Child" value={child.id} options={children.map((each) => ({ value: each.id, label: each.name }))} onValue={pick} />}
          {!confirming ? (
            <BigButton disabled={busy} onClick={() => setConfirming(true)}>
              Reset {child.name}
            </BigButton>
          ) : (
            <>
              <Notice role="alert">
                This removes every score, answer and sticker for {child.name}, on every iPad. It cannot be undone. Export a backup file first if you may want them back.
              </Notice>
              <CenterRow>
                <BigButton disabled={busy} onClick={() => void doExport()}>
                  Export first
                </BigButton>
                <BigButton disabled={busy} onClick={() => void doReset()}>
                  Yes, reset {child.name}
                </BigButton>
                <BigButton disabled={busy} onClick={() => setConfirming(false)}>
                  Keep everything
                </BigButton>
              </CenterRow>
            </>
          )}
        </section>
      )}

      <section className={styles.panel} aria-label="Sign-in">
        <h2>Sign-in</h2>
        {account.status === 'signedIn' && (
          <p className={styles.soft} data-signed-in="">
            Signed in as {account.email} until {localDayOf(account.expiresAt)}.
          </p>
        )}
        <p className={styles.soft}>Signing out leaves the children's progress on this device.</p>
        <CenterRow>
          <BigButton disabled={busy} onClick={() => void leave(false)}>
            Sign out
          </BigButton>
          <BigButton disabled={busy} onClick={() => void leave(true)}>
            Sign out everywhere
          </BigButton>
        </CenterRow>
      </section>

      <section className={styles.panel} aria-label="This device">
        <h2>This device</h2>
        <ul className={styles.facts}>
          <li data-fact="storage">{storageSaved ? 'Progress is saved on this device.' : 'Progress cannot be saved on this device.'}</li>
          <li data-fact="persist">{device?.persistGranted === true ? 'The device has agreed to keep the saved progress.' : 'The device may clear saved progress if it runs short of space. The online backup protects it.'}</li>
          <li data-fact="installed">{installed ? 'Sprout is running from the Home Screen.' : 'Sprout is running in a browser tab.'}</li>
          <li data-fact="unreadable">Saved items that could not be read: {unreadable}</li>
          <li data-fact="flags">Flagged questions: {flags.length}</li>
        </ul>
        {flags.length > 0 && (
          <ul className={styles.facts}>
            {flags.map((flag) => (
              <li key={flag.id} data-flag={flag.id}>
                {flag.skillId}, level {flag.level}, seed {flag.seed}
                {flag.note ? `: ${flag.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panel} aria-label="Errors">
        <h2>The last {errors.length === 1 ? 'error' : `${errors.length} errors`}</h2>
        {errors.length === 0 ? (
          <p className={styles.soft}>None.</p>
        ) : (
          <ul className={styles.facts}>
            {errors.map((error, index) => (
              <li key={index} data-error="">
                {error.at}: {error.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panel} aria-label="Credits">
        <h2>Credits</h2>
        {CREDITS.map((line) => (
          <p key={line} className={styles.soft}>
            {line}
          </p>
        ))}
      </section>
    </ParentArea>
  );
}
