import { useEffect, useState } from 'react';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import Notice from '../../components/Notice';
import TextField from '../../components/TextField';
import { canInvite, failureMessage, invitedParents, makeInvite, makeResetLink } from '../../storage/account';
import styles from './Parent.module.css';

// Grown-ups → Settings: a one-time link for another family's parent (the owner's choice, Nov 21, 2026). Shown only
// to the first family. The parent sends the link themselves (text, WhatsApp, email); whoever opens it makes an
// account with a family of their own, which this family never sees. Each link works once, for 7 days.
export default function InviteParent() {
  const [allowed, setAllowed] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // The parents this family invited, each with a reset link once one is made (their "Forgot password").
  const [members, setMembers] = useState<{ email: string; joinedAt: string }[]>([]);
  const [resets, setResets] = useState<Record<string, { url: string; expiresAt: string }>>({});

  useEffect(() => {
    let live = true;
    void canInvite().then(async (yes) => {
      if (!live) return;
      setAllowed(yes);
      if (!yes) return;
      const list = await invitedParents();
      if (live && list) setMembers(list);
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

  async function share(url: string, text = 'Here is your invite to Sprout. Open it on the iPad or phone your child will use:') {
    setMessage(null);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Sprout', text, url });
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

  async function makeReset(email: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await makeResetLink(email);
    setBusy(false);
    if (result.ok) setResets((old) => ({ ...old, [email]: { url: result.url, expiresAt: result.expiresAt } }));
    else setMessage(failureMessage(result.reason));
  }

  const day = (iso: string): string => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
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
      {members.length > 0 && (
        <>
          <h3>Parents you invited</h3>
          <p>If one forgets their password, make them a reset link and send it the same way. It works once, for 3 days.</p>
          <ul className={styles.invited} aria-label="Parents you invited">
            {members.map((member) => {
              const made = resets[member.email];
              return (
                <li key={member.email} data-invited={member.email}>
                  <span>{member.email}</span>
                  {made ? (
                    <>
                      <TextField label={`Reset link for ${member.email} (works once, until ${day(made.expiresAt)})`} type="text" name="reset-link" readOnly value={made.url} onValue={() => undefined} />
                      <BigButton onClick={() => void share(made.url, 'Here is a link to set a new Sprout password:')}>Send the reset link</BigButton>
                    </>
                  ) : (
                    <BigButton tone="quiet" disabled={busy} onClick={() => void makeReset(member.email)}>
                      Make a reset link
                    </BigButton>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <CenterRow>
        <BigButton tone={link ? 'quiet' : undefined} disabled={busy} onClick={() => void make()}>
          {busy ? 'Making a link…' : link ? 'Make another link' : 'Make an invite link'}
        </BigButton>
      </CenterRow>
    </section>
  );
}
