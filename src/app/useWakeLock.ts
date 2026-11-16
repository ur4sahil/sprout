import { useEffect } from 'react';

interface WakeLockLike {
  release: () => Promise<void>;
}

// Keeps the screen from dimming during practice and lessons. A refusal is ignored.
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockLike | null = null;
    let gone = false;
    const ask = async (): Promise<void> => {
      try {
        const api = (navigator as unknown as { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }).wakeLock;
        if (!api || document.visibilityState !== 'visible') return;
        const got = await api.request('screen');
        if (gone) void got.release().catch(() => undefined);
        else lock = got;
      } catch {
        // Low battery, or the browser said no. The lesson carries on.
      }
    };
    // The lock is dropped when the app goes to the background, so ask again when it comes back.
    const onShow = (): void => {
      if (document.visibilityState === 'visible') void ask();
    };
    void ask();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', onShow);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}
