import { create } from 'zustand';

interface AppState {
  activeChildId: string | null;
  sessionId: string | null;
  muted: boolean;
  setActiveChild: (childId: string | null) => void;
  setSession: (sessionId: string | null) => void;
  setMuted: (muted: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeChildId: null,
  sessionId: null,
  muted: false,
  setActiveChild: (activeChildId) => set({ activeChildId, sessionId: null }),
  setSession: (sessionId) => set({ sessionId }),
  setMuted: (muted) => set({ muted }),
}));
