import { useEffect, useState } from 'react';
import { useAppStore } from '../../app/store';
import BigButton from '../../components/BigButton';
import CenterRow from '../../components/CenterRow';
import FormCard from '../../components/FormCard';
import Notice from '../../components/Notice';
import type { SyncOutcome } from '../../storage/sync';
import { syncNow } from '../../storage/sync';

// Straight after the first sign-in on a device: one sync before the profile picker,
// so the children and their scores are there when it opens.
export default function FirstSync() {
  const [problem, setProblem] = useState<SyncOutcome | null>(null);
  const [round, setRound] = useState(0);
  const done = (): void => useAppStore.getState().setFirstSync(false);

  useEffect(() => {
    let alive = true;
    void syncNow().then((result) => {
      if (!alive) return;
      if (result.outcome === 'uploaded' || result.outcome === 'upToDate') done();
      else setProblem(result.outcome);
    });
    return () => {
      alive = false;
    };
  }, [round]);

  return (
    <FormCard title="Getting your family's progress" lead={problem === null ? 'One moment.' : 'That did not work.'} mark="🌱" onSubmit={(event) => event.preventDefault()}>
      {problem === null ? (
        <Notice role="status">Fetching the backup.</Notice>
      ) : (
        <>
          <Notice role="alert">
            {problem === 'offline' ? 'This device is not online.' : 'The backup could not be fetched.'} You can carry on. Progress from your other devices will appear here after the next backup.
          </Notice>
          <CenterRow>
            <BigButton
              onClick={() => {
                setProblem(null);
                setRound(round + 1);
              }}
            >
              Try again
            </BigButton>
            <BigButton onClick={done}>Carry on</BigButton>
          </CenterRow>
        </>
      )}
    </FormCard>
  );
}
