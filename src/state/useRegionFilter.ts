import { create } from 'zustand';

/**
 * Ground-region filter — "objects over this region". Consumed by the live
 * field to highlight satellites whose sub-point falls within `radiusKm` of
 * (latDeg, lonDeg), computed via satellite.js eciToGeodetic.
 */
interface RegionFilter {
  active: boolean;
  latDeg: number;
  lonDeg: number;
  radiusKm: number;
  set: (p: Partial<Pick<RegionFilter, 'latDeg' | 'lonDeg' | 'radiusKm'>>) => void;
  setActive: (a: boolean) => void;
}

export const useRegionFilter = create<RegionFilter>((set) => ({
  active: false,
  latDeg: 0,
  lonDeg: 0,
  radiusKm: 1000,
  set: (p) => set(p),
  setActive: (a) => set({ active: a }),
}));
