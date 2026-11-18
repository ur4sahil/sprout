import { LINES } from '../../audio/lines';
import { useEffect, useState } from 'react';
import { hasPass } from '../../app/pin';
import { useAppStore } from '../../app/store';
import { speak, stop } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import LinkButton from '../../components/LinkButton';
import { localDay, now } from '../../lib/clock';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child } from '../../storage/schema';
import Gate from '../parent/Gate';

interface Props {
  child: Child;
  onDone: () => void;
}

export const EXTRA_MINUTES = 10;

// Shown when the parent's daily minutes are used up. It speaks, so a child who cannot read knows why.
// A grown-up can add 10 minutes for today through the PIN gate.
export default function DailyLimit({ child, onDone }: Props) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    void speak(LINES.dailyLimit, child.settings.speechRate);
    return () => stop();
  }, [child]);

  async function addTime(): Promise<void> {
    const today = localDay();
    const already = child.settings.extraMinutes.day === today ? child.settings.extraMinutes.minutes : 0;
    const next: Child = { ...child, settings: { ...child.settings, extraMinutes: { day: today, minutes: already + EXTRA_MINUTES } }, updatedAt: now().toISOString() };
    try {
      await (await openRepo()).repo.saveChild(next);
      // Home reads the child again and opens with the extra time.
      useAppStore.getState().setChild(next);
    } catch (error) {
      logError(error);
    }
    setAsking(false);
  }

  if (asking && !hasPass()) return <Gate onPass={() => void addTime()} onCancel={() => setAsking(false)} />;
  return (
    <FullScreenCard emoji="🌙" title="All done for today" line="Great work. See you tomorrow!" name="limit">
      <BigButton size="kid" onClick={onDone}>
        <span aria-hidden="true">👋 </span>Bye for now
      </BigButton>
      <LinkButton onClick={() => (hasPass() ? void addTime() : setAsking(true))}>Grown-ups: add {EXTRA_MINUTES} minutes</LinkButton>
    </FullScreenCard>
  );
}
