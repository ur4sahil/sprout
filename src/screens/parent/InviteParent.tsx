import { useEffect, useState } from 'react';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import Notice from '../../components/Notice';
import TextField from '../../components/TextField';
import { canInvite, failureMessage, makeInvite } from '../../storage/account';
import styles from './Parent.module.css';

// Grown-ups → Settings: a one-time link for another family's parent (the owner's choice, Nov 21, 2026). Shown only
// to the first family. The parent sends the link themselves (text, WhatsApp, email); whoever opens it makes an
// account with a family of their own, which this family never sees. Each link works once, for 7 days.
export default function InviteParent() {
  const [allowed, setAllowed] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void canInvite().then((yes) => {
      if (live) setAllowed(yes);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!allowed) return null;

  async function make() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await makeInvite();
    setBusy(false);
    if (result.ok) setLink({ url: result.url, expiresAt: result.expiresAt });
    else setMessage(failureMessage(result.reason));
  }

  async function share(url: string) {
    setMessage(null);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Join Sprout', text: 'Here is your invite to Sprout. Open it on the iPad or phone your child will use:', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage('Copied. Paste it into a message.');
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error instanceof Error && error.name === 'AbortError') return;
      setMessage('It could not be shared from here. Copy the link above instead.');
    }
  }

  const until = link ? new Date(link.expiresAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : '';
  return (
    <section className={styles.panel} aria-label="Invite another family" data-invite="">
      <h2>Invite another family</h2>
      <p>Make a link for another parent. They make their own account and add their own children; they never see yours, and you never see theirs. Each link works once.</p>
      {link && (
        <>
          <TextField label={`Invite link (works once, until ${until})`} type="text" name="invite-link" readOnly value={link.url} onValue={() => undefined} />
          <CenterRow>
            <BigButton onClick={() => void share(link.url)}>Send the link</BigButton>
          </CenterRow>
        </>
      )}
      {message && <Notice role="status">{message}</Notice>}
      <CenterRow>
        <BigButton tone={link ? 'quiet' : undefined} disabled={busy} onClick={() => void make()}>
          {busy ? 'Making a link…' : link ? 'Make another link' : 'Make an invite link'}
        </BigButton>
      </CenterRow>
    </section>
  );
}
