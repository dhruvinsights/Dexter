import { create } from 'zustand';

/**
 * UI shell state — which sidebar panel is open. Only one feature panel is
 * mounted at a time (KeepTrack-style slide-in), keeping the 3D viewport clear.
 */
export type PanelId =
  | 'live'
  | 'scenario'
  | 'timeMachine'
  | 'forecast'
  | 'ai'
  | 'knowledge'
  | 'customTle'
  | 'region'
  | 'settings';

interface UIStore {
  activePanel: PanelId | null;
  openPanel: (id: PanelId) => void;
  closePanel: () => void;
  togglePanel: (id: PanelId) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activePanel: 'live',
  openPanel: (id) => set({ activePanel: id }),
  closePanel: () => set({ activePanel: null }),
  togglePanel: (id) => set((s) => ({ activePanel: s.activePanel === id ? null : id })),
}));
