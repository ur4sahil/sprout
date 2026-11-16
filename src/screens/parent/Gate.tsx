import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { PIN_LENGTH, hasPin, lockedFor, tryPin } from '../../app/pin';
import { useAppStore } from '../../app/store';
import BigButton from '../../components/BigButton';
import FormCard from '../../components/FormCard';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import PinPad from '../../components/PinPad';
import TextField from '../../components/TextField';
import { logError } from '../../lib/errorLog';
import { failureMessage, signIn } from '../../storage/account';
import { openRepo } from '../../storage/index';
import type { Family } from '../../storage/schema';
import ChoosePin from './ChoosePin';

interface Props {
  onPass: () => void;
  onCancel: () => void;
}

// "Grown-ups only": the family's 4-digit PIN on a number pad. Five wrong tries lock it for a minute.
// "Forgot PIN" asks for the account password, checks it with the server, then lets the parent choose a new PIN.
export default function Gate({ onPass, onCancel }: Props) {
  const account = useAppStore((s) => s.account);
  const [family, setFamily] = useState<Family | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [step, setStep] = useState<'pin' | 'password' | 'newPin'>('pin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void openRepo()
      .then(({ repo }) => repo.getFamily())
      .then((saved) => {
        if (alive) setFamily(saved);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [step]);

  async function typed(pin: string): Promise<void> {
    if (!family) return;
    setBusy(true);
    const result = await tryPin(family, pin);
    setBusy(false);
    if (result === 'ok') onPass();
    else if (result === 'locked') setMessage(`Too many tries. Wait ${Math.ceil(lockedFor() / 1000)} seconds, then try again.`);
    else setMessage('That PIN is not right.');
  }

  async function checkPassword(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (account.status !== 'signedIn' || busy) return;
    setBusy(true);
    setMessage(null);
    const result = await signIn(account.email, password);
    setBusy(false);
    setPassword('');
    if (result.ok) setStep('newPin');
    else setMessage(result.reason === 'invalid' ? 'That password is not right.' : failureMessage(result.reason));
  }

  if (!family) return <FormCard title="Grown-ups only" lead="One moment." mark="🔒" onSubmit={(event) => event.preventDefault()}>{null}</FormCard>;
  // A family with no PIN yet chooses one. A parent who proved the password chooses a new one.
  if (!hasPin(family) || step === 'newPin') return <ChoosePin title={step === 'newPin' ? 'Choose a new PIN' : undefined} onDone={onPass} onCancel={onCancel} />;

  if (step === 'password') {
    return (
      <FormCard title="Forgot PIN" lead="Type the account password. Then you can choose a new PIN. This needs the internet." mark="🔑" onSubmit={(event) => void checkPassword(event)}>
        {message && <Notice role="alert">{message}</Notice>}
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onValue={setPassword} />
        <BigButton type="submit" disabled={busy || password.length === 0}>
          {busy ? 'Checking' : 'Check password'}
        </BigButton>
        <LinkButton
          onClick={() => {
            setMessage(null);
            setStep('pin');
          }}
        >
          Back
        </LinkButton>
      </FormCard>
    );
  }

  return (
    <FormCard title="Grown-ups only" lead="Type the family PIN." mark="🔒" onSubmit={(event) => event.preventDefault()}>
      {message && <Notice role="alert">{message}</Notice>}
      <PinPad length={PIN_LENGTH} disabled={busy} label="PIN" onComplete={(pin) => void typed(pin)} />
      <LinkButton
        onClick={() => {
          setMessage(null);
          setStep('password');
        }}
      >
        Forgot PIN
      </LinkButton>
      <LinkButton onClick={onCancel}>Cancel</LinkButton>
    </FormCard>
  );
}
