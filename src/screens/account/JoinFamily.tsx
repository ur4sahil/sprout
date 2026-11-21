import { useState } from 'react';
import type { FormEvent } from 'react';
import BigButton from '../../components/BigButton';
import FormCard from '../../components/FormCard';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import TextField from '../../components/TextField';
import { MIN_PASSWORD_LENGTH, failureMessage, joinWithInvite } from '../../storage/account';

interface Props {
  token: string;
  onSignIn: () => void;
  onDone: () => void;
}

// Opened from an invite link (/join#<token>): another family's parent makes an account with their email and a
// password. Their family starts empty; they add their own children next (the owner's choice, Nov 21, 2026).
export default function JoinFamily({ token, onSignIn, onDone }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
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
      const result = await joinWithInvite(token, email, password);
      if (result.ok) onDone();
      else setMessage(failureMessage(result.reason));
    } catch {
      setMessage(failureMessage('server'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormCard mark="🌱" title="Welcome to Sprout" lead="You were invited. Make your family's account: your email and a password." onSubmit={submit}>
      <TextField label="Email" type="email" name="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={email} onValue={setEmail} />
      <TextField label="New password" type="password" name="new-password" autoComplete="new-password" required value={password} onValue={setPassword} />
      <TextField label="New password again" type="password" name="new-password-again" autoComplete="new-password" required value={again} onValue={setAgain} />
      {message && <Notice role="alert">{message}</Notice>}
      <BigButton type="submit" disabled={busy}>
        {busy ? 'Making your account…' : 'Make my account'}
      </BigButton>
      <LinkButton onClick={onSignIn}>I already have an account</LinkButton>
    </FormCard>
  );
}
