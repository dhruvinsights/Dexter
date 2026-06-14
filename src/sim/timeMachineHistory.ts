/**
 * Deterministic Time-Machine history.
 *
 * Reconstructs the orbital population at any year from the REAL catalogue — each
 * object carries its launch year (decoded from the TLE international designator)
 * and its SATCAT type (PAY / R/B / DEB). Counting objects launched up to a year
 * gives the historical population; differencing consecutive years gives growth.
 *
 * Plus a curated timeline of the major real events that shaped that population
 * (first launches, constellations, ASAT tests, the big collisions), so the user
 * sees *why* the curve bends when it does.
 */
import type { CatalogueEntry } from '@/state/useSimStore';

export interface YearStats {
  year: number;
  cumulative: number; // tracked objects launched up to & incl. this year
  payloads: number;
  rocketBodies: number;
  debris: number;
  addedThisYear: number;
  growthRatePct: number; // addedThisYear / previous cumulative
}

export type EventKind = 'milestone' | 'constellation' | 'debris';

export interface SpaceEvent {
  year: number;
  title: string;
  detail: string;
  kind: EventKind;
}

/** Major events in the space age, correlated with visible orbital growth. */
export const SPACE_EVENTS: SpaceEvent[] = [
  { year: 1957, title: 'Sputnik 1', detail: 'First artificial satellite (USSR) — the space age begins.', kind: 'milestone' },
  { year: 1958, title: 'Explorer 1', detail: 'First US satellite; discovers the Van Allen radiation belts.', kind: 'milestone' },
  { year: 1961, title: 'Vostok 1', detail: 'Yuri Gagarin becomes the first human in orbit.', kind: 'milestone' },
  { year: 1962, title: 'Telstar 1', detail: 'First active communications satellite — live transatlantic TV.', kind: 'milestone' },
  { year: 1965, title: 'Intelsat I (Early Bird)', detail: 'First commercial geostationary comsat.', kind: 'constellation' },
  { year: 1969, title: 'Apollo 11', detail: 'First crewed Moon landing; peak of the Apollo era.', kind: 'milestone' },
  { year: 1978, title: 'GPS Block I', detail: 'First GPS navigation satellite launched into MEO.', kind: 'constellation' },
  { year: 1981, title: 'STS-1', detail: 'First Space Shuttle flight opens the reusable-launch era.', kind: 'milestone' },
  { year: 1998, title: 'ISS assembly', detail: 'International Space Station construction begins in LEO.', kind: 'milestone' },
  { year: 1999, title: 'Iridium constellation', detail: 'First large LEO comms constellation (66 satellites at ~780 km).', kind: 'constellation' },
  { year: 2007, title: 'Fengyun-1C ASAT test', detail: 'China destroys a satellite at ~860 km — ~3,500 trackable fragments.', kind: 'debris' },
  { year: 2009, title: 'Iridium-33 / Cosmos-2251', detail: 'First major accidental collision — ~2,300 fragments at ~790 km.', kind: 'debris' },
  { year: 2019, title: 'Starlink deployment', detail: 'SpaceX begins mega-constellation launches — LEO population surges.', kind: 'constellation' },
  { year: 2021, title: 'Cosmos-1408 ASAT test', detail: 'Russian ASAT test at ~480 km — ~1,500 trackable fragments.', kind: 'debris' },
];

export function eventForYear(year: number): SpaceEvent | undefined {
  return SPACE_EVENTS.find((e) => e.year === year);
}

/** The most recent milestone at or before a year (for the "current era" label). */
export function latestEvent(year: number): SpaceEvent | undefined {
  let best: SpaceEvent | undefined;
  for (const e of SPACE_EVENTS) if (e.year <= year && (!best || e.year > best.year)) best = e;
  return best;
}

/** Bucket the catalogue once into per-year counts so per-year lookups are O(1). */
export interface HistoryIndex {
  minYear: number;
  maxYear: number;
  // cumulative[type] indexed by (year - minYear)
  cumTotal: number[];
  cumPay: number[];
  cumRb: number[];
  cumDeb: number[];
  addedPerYear: number[];
}

export function buildHistoryIndex(catalogue: CatalogueEntry[]): HistoryIndex {
  const NOW = new Date().getUTCFullYear();
  const minYear = 1957;
  const maxYear = NOW + 1;
  const span = maxYear - minYear + 1;
  const addPay = new Array(span).fill(0);
  const addRb = new Array(span).fill(0);
  const addDeb = new Array(span).fill(0);
  const added = new Array(span).fill(0);

  for (const r of catalogue) {
    const y = r.launchYear;
    if (!y || y < minYear || y > maxYear) continue;
    const i = y - minYear;
    added[i]++;
    if (r.type === 'DEB') addDeb[i]++;
    else if (r.type === 'R/B') addRb[i]++;
    else addPay[i]++; // PAY or unknown → payload
  }

  const cumTotal = new Array(span).fill(0);
  const cumPay = new Array(span).fill(0);
  const cumRb = new Array(span).fill(0);
  const cumDeb = new Array(span).fill(0);
  for (let i = 0; i < span; i++) {
    const prev = i > 0 ? i - 1 : 0;
    const base = i > 0 ? 1 : 0;
    cumTotal[i] = (base ? cumTotal[prev] : 0) + added[i];
    cumPay[i] = (base ? cumPay[prev] : 0) + addPay[i];
    cumRb[i] = (base ? cumRb[prev] : 0) + addRb[i];
    cumDeb[i] = (base ? cumDeb[prev] : 0) + addDeb[i];
  }
  return { minYear, maxYear, cumTotal, cumPay, cumRb, cumDeb, addedPerYear: added };
}

export function statsForYear(idx: HistoryIndex, year: number): YearStats {
  const y = Math.max(idx.minYear, Math.min(idx.maxYear, Math.floor(year)));
  const i = y - idx.minYear;
  const prevCum = i > 0 ? idx.cumTotal[i - 1] : 0;
  const added = idx.addedPerYear[i];
  return {
    year: y,
    cumulative: idx.cumTotal[i],
    payloads: idx.cumPay[i],
    rocketBodies: idx.cumRb[i],
    debris: idx.cumDeb[i],
    addedThisYear: added,
    growthRatePct: prevCum > 0 ? (added / prevCum) * 100 : 0,
  };
}
