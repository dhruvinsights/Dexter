/**
 * Altitude shell discretisation shared by the seed builder (scripts/build-shells.ts)
 * and the source–sink debris engine (src/sim/debrisEngine.ts).
 *
 * LEO is the debris-critical regime, so the bands are finer there and coarser
 * toward MEO. Altitudes are mean altitude above Earth's surface, in km.
 */
export const EARTH_RADIUS_KM = 6371;
export const MU = 398600.4418; // Earth GM, km^3/s^2

export interface ShellBand {
  label: string;
  lo: number; // lower altitude bound, km
  hi: number; // upper altitude bound, km
}

export const SHELL_BANDS: ShellBand[] = [
  { label: '200-400km', lo: 200, hi: 400 },
  { label: '400-500km', lo: 400, hi: 500 },
  { label: '500-600km', lo: 500, hi: 600 },
  { label: '600-700km', lo: 600, hi: 700 },
  { label: '700-800km', lo: 700, hi: 800 },
  { label: '800-900km', lo: 800, hi: 900 },
  { label: '900-1000km', lo: 900, hi: 1000 },
  { label: '1000-1200km', lo: 1000, hi: 1200 },
  { label: '1200-1500km', lo: 1200, hi: 1500 },
  { label: '1500-2000km', lo: 1500, hi: 2000 },
  { label: '2000-5000km', lo: 2000, hi: 5000 },
];

/** Mid-altitude of a band, km. */
export function shellMidAltitude(b: ShellBand): number {
  return (b.lo + b.hi) / 2;
}

/** Spherical-shell volume between two altitudes, km^3. */
export function shellVolume(b: ShellBand): number {
  const rLo = EARTH_RADIUS_KM + b.lo;
  const rHi = EARTH_RADIUS_KM + b.hi;
  return (4 / 3) * Math.PI * (rHi ** 3 - rLo ** 3);
}

/** Index of the band containing altitude h (km), or -1 if outside all bands. */
export function shellIndexForAltitude(h: number): number {
  for (let i = 0; i < SHELL_BANDS.length; i++) {
    if (h >= SHELL_BANDS[i].lo && h < SHELL_BANDS[i].hi) return i;
  }
  return -1;
}

/**
 * Representative orbital lifetime (years) against atmospheric drag at a given
 * mean altitude, for a typical area-to-mass ratio object. This is an
 * order-of-magnitude fit to standard decay-lifetime curves (drag falls off
 * roughly exponentially with altitude through the thermosphere): ~months at
 * 300 km, ~25 yr near 600 km, centuries above 900 km. Solar activity would
 * modulate this ±, which we fold into a single nominal curve.
 */
export function dragLifetimeYears(altitudeKm: number): number {
  // Exponential fit anchored at 400 km ≈ 1 yr and 800 km ≈ 100 yr.
  // L(h) = L0 * exp((h - h0) / H)
  const h0 = 400;
  const L0 = 1.0;
  const H = 86.8; // scale so that L(800) ≈ 100 yr
  const L = L0 * Math.exp((altitudeKm - h0) / H);
  return Math.max(0.05, L); // floor ~18 days for very low orbits
}
