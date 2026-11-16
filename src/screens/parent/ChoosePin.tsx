import { useState } from 'react';
import { grantPass, savePin, PIN_LENGTH } from '../../app/pin';
import FormCard from '../../components/FormCard';
import LinkButton from '../../components/LinkButton';
import Notice from '../../components/Notice';
import PinPad from '../../components/PinPad';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';

interface Props {
  title?: string;
  onDone: () => void;
  onCancel?: () => void;
}

// A grown-up chooses the family's 4-digit PIN: typed once, then again to be sure.
export default function ChoosePin({ title = 'Choose a grown-ups PIN', onDone, onCancel }: Props) {
  const [first, setFirst] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function typed(pin: string): Promise<void> {
    setMessage(null);
    if (first === null) {
      setFirst(pin);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setMessage('Those two did not match. Start again.');
      return;
    }
    setBusy(true);
    try {
      await savePin((await openRepo()).repo, pin);
      grantPass();
      onDone();
    } catch (error) {
      logError(error);
      setFirst(null);
      setMessage('The PIN could not be saved. Try again.');
      setBusy(false);
    }
  }

  return (
    <FormCard
      title={title}
      lead={first === null ? 'Four digits that keep children out of the grown-ups area. It is the same on every iPad in the family.' : 'Type it once more.'}
      mark="🔒"
      onSubmit={(event) => event.preventDefault()}
    >
      {message && <Notice role="alert">{message}</Notice>}
      <PinPad key={first === null ? 'first' : 'again'} length={PIN_LENGTH} disabled={busy} label={first === null ? 'New PIN' : 'New PIN again'} onComplete={(pin) => void typed(pin)} />
      {onCancel && <LinkButton onClick={onCancel}>Cancel</LinkButton>}
    </FormCard>
  );
}
