import { create } from 'zustand';

export type AccountState =
  | { status: 'checking' }
  | { status: 'signedOut'; offline: boolean }
  | { status: 'signedIn'; email: string; expiresAt: string };

interface AppState {
  activeChildId: string | null;
  sessionId: string | null;
  muted: boolean;
  account: AccountState;
  setActiveChild: (childId: string | null) => void;
  setSession: (sessionId: string | null) => void;
  setMuted: (muted: boolean) => void;
  setAccount: (account: AccountState) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeChildId: null,
  sessionId: null,
  muted: false,
  account: { status: 'checking' },
  setActiveChild: (activeChildId) => set({ activeChildId, sessionId: null }),
  setSession: (sessionId) => set({ sessionId }),
  setMuted: (muted) => set({ muted }),
  setAccount: (account) => set({ account }),
}));
