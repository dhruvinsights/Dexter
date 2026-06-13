import { create } from 'zustand';

export interface CustomSat {
  id: string;
  name: string;
  line1: string;
  line2: string;
  /** Derived from the TLE for a quick summary. */
  inclinationDeg: number;
  periodMin: number;
}

interface CustomSatStore {
  sats: CustomSat[];
  add: (s: CustomSat) => void;
  remove: (id: string) => void;
}

const KEY = 'dexter.customSats';

function load(): CustomSat[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as CustomSat[];
  } catch {
    return [];
  }
}

function persist(sats: CustomSat[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sats));
  } catch {
    /* ignore */
  }
}

export const useCustomSats = create<CustomSatStore>((set) => ({
  sats: load(),
  add: (s) =>
    set((st) => {
      const sats = [s, ...st.sats.filter((x) => x.id !== s.id)];
      persist(sats);
      return { sats };
    }),
  remove: (id) =>
    set((st) => {
      const sats = st.sats.filter((x) => x.id !== id);
      persist(sats);
      return { sats };
    }),
}));
