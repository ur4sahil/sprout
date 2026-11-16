import { create } from 'zustand';
import type { Child } from '../storage/schema';

export type AccountState =
  | { status: 'checking' }
  | { status: 'signedOut'; offline: boolean }
  | { status: 'signedIn'; email: string; expiresAt: string };

interface AppState {
  activeChildId: string | null;
  child: Child | null; // the child using the app now
  sessionId: string | null;
  muted: boolean;
  account: AccountState;
  storageSaved: boolean; // false when progress cannot be saved on this device
  installGuide: boolean; // true in a Safari tab on an iPad or iPhone, until a parent chooses to carry on
  setChild: (child: Child | null) => void;
  setSession: (sessionId: string | null) => void;
  setMuted: (muted: boolean) => void;
  setAccount: (account: AccountState) => void;
  setStorageSaved: (saved: boolean) => void;
  setInstallGuide: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeChildId: null,
  child: null,
  sessionId: null,
  muted: false,
  account: { status: 'checking' },
  storageSaved: true,
  installGuide: false,
  setChild: (child) => set({ child, activeChildId: child ? child.id : null, sessionId: null }),
  setSession: (sessionId) => set({ sessionId }),
  setMuted: (muted) => set({ muted }),
  setAccount: (account) => set({ account }),
  setStorageSaved: (storageSaved) => set({ storageSaved }),
  setInstallGuide: (installGuide) => set({ installGuide }),
}));
