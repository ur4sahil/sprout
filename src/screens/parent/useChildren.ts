import { useCallback, useEffect, useState } from 'react';
import { logError } from '../../lib/errorLog';
import { openRepo } from '../../storage/index';
import type { Child } from '../../storage/schema';

// The children on this device, and which one a grown-up screen is showing.
export function useChildren(): { children: Child[] | null; child: Child | null; pick: (id: string) => void; reload: () => void } {
  const [children, setChildren] = useState<Child[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let alive = true;
    void openRepo()
      .then(({ repo }) => repo.listChildren())
      .then((list) => {
        if (alive) setChildren(list);
      })
      .catch(logError);
    return () => {
      alive = false;
    };
  }, [round]);
  const reload = useCallback(() => setRound((n) => n + 1), []);
  const child = children?.find((candidate) => candidate.id === picked) ?? children?.[0] ?? null;
  return { children, child, pick: setPicked, reload };
}
