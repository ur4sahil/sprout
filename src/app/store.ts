import { create } from 'zustand';
import type { Child } from '../storage/schema';

export type AccountState =
  | { status: 'checking' }
  | { status: 'signedOut'; offline: boolean }
  | { status: 'signedIn'; email: string; expiresAt: string };

export type FamilyLink = 'waiting' | 'ready' | 'offline';

interface AppState {
  activeChildId: string | null;
  child: Child | null; // the child using the app now
  sessionId: string | null;
  muted: boolean;
  account: AccountState;
  storageSaved: boolean; // false when progress cannot be saved on this device
  installGuide: boolean; // true in a Safari tab on an iPad or iPhone, until a parent chooses to carry on
  // The link to the server. 'waiting' on a device that has never fetched the family's records, until it has.
  // 'offline' when the server cannot be reached: the app carries on with the device's copy.
  link: FamilyLink;
  setLink: (link: FamilyLink) => void;
  // Goes up when records from another device arrive, so a screen showing a list reads it again.
  dataVersion: number;
  bumpData: () => void;
  updateReady: boolean; // a newer version of the app has been fetched and is waiting
  setUpdateReady: (ready: boolean) => void;
  updateTookOver: boolean; // the new version is in charge. The page loads again at the next safe moment
  setUpdateTookOver: (took: boolean) => void;
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
  link: 'waiting',
  setLink: (link) => set({ link }),
  dataVersion: 0,
  bumpData: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
  updateReady: false,
  setUpdateReady: (updateReady) => set({ updateReady }),
  updateTookOver: false,
  setUpdateTookOver: (updateTookOver) => set({ updateTookOver }),
  setChild: (child) => set({ child, activeChildId: child ? child.id : null, sessionId: null }),
  setSession: (sessionId) => set({ sessionId }),
  setMuted: (muted) => set({ muted }),
  setAccount: (account) => set({ account }),
  setStorageSaved: (storageSaved) => set({ storageSaved }),
  setInstallGuide: (installGuide) => set({ installGuide }),
}));
