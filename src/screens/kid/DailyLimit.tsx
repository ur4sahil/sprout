import { useEffect } from 'react';
import { speak, stop } from '../../audio/speech';
import BigButton from '../../components/BigButton';
import FullScreenCard from '../../components/FullScreenCard';
import type { Child } from '../../storage/schema';

interface Props {
  child: Child;
  onDone: () => void;
}

// Shown when the parent's daily minutes are used up. It speaks, so a child who cannot read knows why.
export default function DailyLimit({ child, onDone }: Props) {
  useEffect(() => {
    void speak(['All done for today. Great work. See you tomorrow.'], child.settings.speechRate);
    return () => stop();
  }, [child]);
  return (
    <FullScreenCard emoji="🌙" title="All done for today" line="Great work. See you tomorrow!" name="limit">
      <BigButton size="kid" onClick={onDone}>
        <span aria-hidden="true">👋 </span>Bye for now
      </BigButton>
    </FullScreenCard>
  );
}
