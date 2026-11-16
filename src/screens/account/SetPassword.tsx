import { useState } from 'react';
import type { FormEvent } from 'react';
import BigButton from '../../components/BigButton';
import FormCard from '../../components/FormCard';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import TextField from '../../components/TextField';
import { MIN_PASSWORD_LENGTH, failureMessage, requestCode, setPasswordWithCode } from '../../storage/account';
import styles from './SetPassword.module.css';

interface Props {
  initialEmail: string;
  onBack: () => void;
  onDone: () => void;
}

// First sign-up and forgotten password are the same two steps:
// ask for a code by email, then type the code and a new password.
export default function SetPassword({ initialEmail, onBack, onDone }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestCode(email);
      if (result.ok) setStep('code');
      else setMessage(failureMessage(result.reason));
    } catch {
      setMessage(failureMessage('server'));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setMessage('The code is six digits.');
      return;
    }
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
      const result = await setPasswordWithCode(email, code.trim(), password);
      if (result.ok) onDone();
      else setMessage(failureMessage(result.reason));
    } catch {
      setMessage(failureMessage('server'));
    } finally {
      setBusy(false);
    }
  }

  if (step === 'email') {
    return (
      <FormCard title="Set a password" lead="We will email you a six-digit code." onSubmit={sendCode}>
        <TextField label="Email" type="email" name="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={email} onValue={setEmail} />
        {message && <Notice role="alert">{message}</Notice>}
        <BigButton type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Email me a code'}
        </BigButton>
        <LinkButton onClick={onBack}>Back to sign in</LinkButton>
      </FormCard>
    );
  }

  return (
    <FormCard title="Check your email" lead="If that email is on the family list, a six-digit code is on its way. It works for 10 minutes." onSubmit={savePassword}>
      {/* Lets the password manager save the email with the new password. */}
      <input className={styles.hidden} type="email" name="email" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" />
      <TextField label="Code from the email" type="text" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onValue={setCode} />
      <TextField label="New password" type="password" name="new-password" autoComplete="new-password" required value={password} onValue={setPassword} />
      <TextField label="New password again" type="password" name="new-password-again" autoComplete="new-password" required value={again} onValue={setAgain} />
      {message && <Notice role="alert">{message}</Notice>}
      <BigButton type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save password and sign in'}
      </BigButton>
      <LinkButton
        onClick={() => {
          setMessage(null);
          setStep('email');
        }}
      >
        Send a new code
      </LinkButton>
      <LinkButton onClick={onBack}>Back to sign in</LinkButton>
    </FormCard>
  );
}
