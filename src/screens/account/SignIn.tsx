import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/store';
import BigButton from '../../components/BigButton';
import FormCard from '../../components/FormCard';
import FormLinks from '../../components/FormLinks';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import TextField from '../../components/TextField';
import { failureMessage, inviteToken, signIn } from '../../storage/account';
import JoinFamily from './JoinFamily';
import SetPassword from './SetPassword';

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = inviteToken(location);
  const startedOffline = useAppStore((s) => s.account.status === 'signedOut' && s.account.offline);
  const [mode, setMode] = useState<'signIn' | 'setPassword'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [declinedInvite, setDeclinedInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(startedOffline ? failureMessage('offline') : null);

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

  // An invite link opens on making an account; "I already have an account" comes back here.
  if (token && mode === 'signIn' && !declinedInvite) {
    return <JoinFamily token={token} onSignIn={() => setDeclinedInvite(true)} onDone={done} />;
  }

  if (mode === 'setPassword') {
    return <SetPassword initialEmail={email} onBack={() => setMode('signIn')} onDone={done} />;
  }

  return (
    <FormCard mark="🌱" title="Sprout" lead="Grown-ups: sign in to set up this device." onSubmit={submit}>
      <TextField label="Email" type="email" name="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={email} onValue={setEmail} />
      <TextField label="Password" type="password" name="password" autoComplete="current-password" required value={password} onValue={setPassword} />
      {message && <Notice role="alert">{message}</Notice>}
      <BigButton type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </BigButton>
      <FormLinks>
        <LinkButton onClick={() => setMode('setPassword')}>First time here</LinkButton>
        <LinkButton onClick={() => setMode('setPassword')}>Forgot password</LinkButton>
      </FormLinks>
    </FormCard>
  );
}
