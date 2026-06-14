/**
 * CelesTrak SATCAT owner codes → flag emoji, display name, and a category
 * colour for the Live Sky "by country" scheme. Covers the common owners; the
 * long tail falls back to a neutral marker.
 */
interface Owner {
  flag: string;
  name: string;
  color: [number, number, number]; // 0..1 RGB
}

const US: [number, number, number] = [0.25, 0.6, 1.0]; // blue
const RU: [number, number, number] = [1.0, 0.3, 0.3]; // red
const CN: [number, number, number] = [1.0, 0.85, 0.2]; // yellow
const EU: [number, number, number] = [0.4, 1.0, 0.6]; // green
const OTHER: [number, number, number] = [0.7, 0.7, 0.75]; // grey

export const OWNERS: Record<string, Owner> = {
  US: { flag: '🇺🇸', name: 'United States', color: US },
  CIS: { flag: '🇷🇺', name: 'Russia / CIS', color: RU },
  SU: { flag: '🇷🇺', name: 'USSR', color: RU },
  RU: { flag: '🇷🇺', name: 'Russia', color: RU },
  PRC: { flag: '🇨🇳', name: 'China', color: CN },
  FR: { flag: '🇫🇷', name: 'France', color: EU },
  JPN: { flag: '🇯🇵', name: 'Japan', color: [1, 0.5, 0.5] },
  IND: { flag: '🇮🇳', name: 'India', color: [1, 0.6, 0.2] },
  UK: { flag: '🇬🇧', name: 'United Kingdom', color: EU },
  ESA: { flag: '🇪🇺', name: 'ESA', color: EU },
  EU: { flag: '🇪🇺', name: 'EU', color: EU },
  EUME: { flag: '🇪🇺', name: 'EUMETSAT', color: EU },
  GER: { flag: '🇩🇪', name: 'Germany', color: EU },
  IT: { flag: '🇮🇹', name: 'Italy', color: EU },
  CA: { flag: '🇨🇦', name: 'Canada', color: [1, 0.4, 0.4] },
  SES: { flag: '🇱🇺', name: 'SES (Luxembourg)', color: EU },
  ITSO: { flag: '🛰️', name: 'Intelsat', color: OTHER },
  ISS: { flag: '🛰️', name: 'ISS (Intl.)', color: [1, 1, 1] },
   globalstar: { flag: '🇺🇸', name: 'Globalstar', color: US },
  ORB: { flag: '🌐', name: 'Orbcomm', color: OTHER },
  SKOR: { flag: '🇰🇷', name: 'South Korea', color: [0.5, 0.7, 1] },
  KOR: { flag: '🇰🇷', name: 'South Korea', color: [0.5, 0.7, 1] },
  ISRA: { flag: '🇮🇱', name: 'Israel', color: [0.5, 0.8, 1] },
  SPN: { flag: '🇪🇸', name: 'Spain', color: EU },
  BRAZ: { flag: '🇧🇷', name: 'Brazil', color: EU },
  AUS: { flag: '🇦🇺', name: 'Australia', color: [1, 0.7, 0.3] },
  TURK: { flag: '🇹🇷', name: 'Türkiye', color: RU },
  UAE: { flag: '🇦🇪', name: 'UAE', color: EU },
  ARGN: { flag: '🇦🇷', name: 'Argentina', color: [0.6, 0.8, 1] },
};

const FALLBACK: Owner = { flag: '🛰️', name: 'Unknown', color: OTHER };

export function ownerInfo(code: string | undefined): Owner {
  if (!code) return FALLBACK;
  return OWNERS[code] ?? OWNERS[code.toUpperCase()] ?? FALLBACK;
}
