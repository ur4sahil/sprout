import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import { failureMessage, signIn } from '../../storage/account';
import SetPassword from './SetPassword';
import styles from './SignIn.module.css';

export default function SignIn() {
  const navigate = useNavigate();
  const startedOffline = useAppStore((s) => s.account.status === 'signedOut' && s.account.offline);
  const [mode, setMode] = useState<'signIn' | 'setPassword'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    startedOffline ? failureMessage('offline') : null,
  );

  function done() {
    navigate('/', { replace: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await signIn(email, password);
      if (result.ok) done();
      else setMessage(failureMessage(result.reason));
    } catch {
      setMessage(failureMessage('server'));
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'setPassword') {
    return <SetPassword initialEmail={email} onBack={() => setMode('signIn')} onDone={done} />;
  }

  return (
    <main className={styles.screen}>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.mark} aria-hidden="true">
          🌱
        </div>
        <h1 className={styles.title}>Sprout</h1>
        <p className={styles.lead}>Grown-ups: sign in to set up this device.</p>

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
        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {message && (
          <p className={styles.message} role="alert">
            {message}
          </p>
        )}

        <button className={styles.primary} type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className={styles.links}>
          <button type="button" className={styles.link} onClick={() => setMode('setPassword')}>
            First time here
          </button>
          <button type="button" className={styles.link} onClick={() => setMode('setPassword')}>
            Forgot password
          </button>
        </div>
      </form>
    </main>
  );
}
