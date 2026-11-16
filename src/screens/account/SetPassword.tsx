import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  MIN_PASSWORD_LENGTH,
  failureMessage,
  requestCode,
  setPasswordWithCode,
} from '../../storage/account';
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
      <main className={styles.screen}>
        <form className={styles.card} onSubmit={sendCode}>
          <h1 className={styles.title}>Set a password</h1>
          <p className={styles.lead}>We will email you a six-digit code.</p>
          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {message && (
            <p className={styles.message} role="alert">
              {message}
            </p>
          )}
          <button className={styles.primary} type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Email me a code'}
          </button>
          <button type="button" className={styles.link} onClick={onBack}>
            Back to sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className={styles.screen}>
      <form className={styles.card} onSubmit={savePassword}>
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.lead}>
          If that email is on the family list, a six-digit code is on its way. It works for 10
          minutes.
        </p>
        {/* Lets the password manager save the email with the new password. */}
        <input
          className={styles.hidden}
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
        />
        <label className={styles.field}>
          <span>Code from the email</span>
          <input
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>New password</span>
          <input
            type="password"
            name="new-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>New password again</span>
          <input
            type="password"
            name="new-password-again"
            autoComplete="new-password"
            required
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
        </label>
        {message && (
          <p className={styles.message} role="alert">
            {message}
          </p>
        )}
        <button className={styles.primary} type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save password and sign in'}
        </button>
        <button
          type="button"
          className={styles.link}
          onClick={() => {
            setMessage(null);
            setStep('email');
          }}
        >
          Send a new code
        </button>
        <button type="button" className={styles.link} onClick={onBack}>
          Back to sign in
        </button>
      </form>
    </main>
  );
}
