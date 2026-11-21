import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import BigButton from '../../components/BigButton';
import FormCard from '../../components/FormCard';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import TextField from '../../components/TextField';
import { MIN_PASSWORD_LENGTH, checkResetLink, failureMessage, resetWithLink } from '../../storage/account';
import styles from './SetPassword.module.css';

interface Props {
  token: string;
  onSignIn: () => void;
  onDone: () => void;
}

// Opened from a reset link (/reset#<token>) that the first family sent to a parent they invited: a new password.
// Invited parents get no emailed codes, so this is their "Forgot password" (the owner's choice A, Nov 21, 2026).
export default function ResetWithLink({ token, onSignIn, onDone }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void checkResetLink(token).then((result) => {
      if (!live) return;
      if (result.ok) setEmail(result.email);
      else setMessage(failureMessage(result.reason));
    });
    return () => {
      live = false;
    };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || email === null) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage(`Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`);
      return;
    }
    if (password !== again) {
      setMessage('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await resetWithLink(token, email, password);
      if (result.ok) onDone();
      else setMessage(failureMessage(result.reason));
    } catch {
      setMessage(failureMessage('server'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormCard mark="🌱" title="Set a new password" lead={email ? `For ${email}.` : 'Checking the link…'} onSubmit={submit}>
      {/* Lets the password manager save the email with the new password. */}
      <input className={styles.hidden} type="email" name="email" autoComplete="username" value={email ?? ''} readOnly tabIndex={-1} aria-hidden="true" />
      <TextField label="New password" type="password" name="new-password" autoComplete="new-password" required value={password} onValue={setPassword} />
      <TextField label="New password again" type="password" name="new-password-again" autoComplete="new-password" required value={again} onValue={setAgain} />
      {message && <Notice role="alert">{message}</Notice>}
      <BigButton type="submit" disabled={busy || email === null}>
        {busy ? 'Saving…' : 'Save password and sign in'}
      </BigButton>
      <LinkButton onClick={onSignIn}>Back to sign in</LinkButton>
    </FormCard>
  );
}
