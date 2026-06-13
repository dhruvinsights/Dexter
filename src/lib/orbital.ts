import * as satellite from 'satellite.js';

const MU = 398600.4418; // km^3/s^2, Earth's gravitational parameter
const EARTH_RADIUS_KM = 6371;

export interface OrbitalElements {
  inclinationDeg: number;
  eccentricity: number;
  raanDeg: number;
  argPerigeeDeg: number;
  periodMin: number;
  apogeeKm: number;
  perigeeKm: number;
  semiMajorKm: number;
}

export interface LiveState {
  latDeg: number;
  lonDeg: number;
  altKm: number;
  velocityKmS: number;
}

/** Static orbital elements derived from a parsed SGP4 record. */
export function elementsFromRec(rec: satellite.SatRec): OrbitalElements {
  const nRadPerMin = rec.no; // mean motion, radians/minute
  const nRadPerSec = nRadPerMin / 60;
  const a = Math.cbrt(MU / (nRadPerSec * nRadPerSec)); // semi-major axis, km
  const e = rec.ecco;
  return {
    inclinationDeg: (rec.inclo * 180) / Math.PI,
    eccentricity: e,
    raanDeg: (rec.nodeo * 180) / Math.PI,
    argPerigeeDeg: (rec.argpo * 180) / Math.PI,
    periodMin: (2 * Math.PI) / nRadPerMin,
    apogeeKm: a * (1 + e) - EARTH_RADIUS_KM,
    perigeeKm: a * (1 - e) - EARTH_RADIUS_KM,
    semiMajorKm: a,
  };
}

/** Live geodetic position + speed at a given time (ms). */
export function liveStateAt(rec: satellite.SatRec, timeMs: number): LiveState | null {
  const date = new Date(timeMs);
  const pv = satellite.propagate(rec, date);
  if (!pv || typeof pv.position === 'boolean' || typeof pv.velocity === 'boolean') return null;
  const gmst = satellite.gstime(date);
  const geo = satellite.eciToGeodetic(pv.position, gmst);
  const v = pv.velocity;
  return {
    latDeg: satellite.degreesLat(geo.latitude),
    lonDeg: satellite.degreesLong(geo.longitude),
    altKm: geo.height,
    velocityKmS: Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  };
}

interface FlagInfo {
  emoji: string;
  country: string;
}

/**
 * Best-effort country/flag from the catalogue name. CelesTrak TLEs carry no
 * country field, so we map the large, recognisable constellations and naming
 * conventions. Unknown objects fall back to a neutral marker.
 */
export function flagFromName(name: string): FlagInfo {
  const n = name.toUpperCase();
  const rules: [RegExp, string, string][] = [
    [/STARLINK|GPS|USA|NAVSTAR|IRIDIUM|GLOBALSTAR|ONEWEB|INTELSAT|GOES|NOAA|LANDSAT/, '🇺🇸', 'United States'],
    [/COSMOS|COSMOS|KOSMOS|GLONASS|METEOR|RESURS|SOYUZ|PROGRESS|LUCH/, '🇷🇺', 'Russia'],
    [/BEIDOU|YAOGAN|GAOFEN|TIANGONG|SHIJIAN|FENGYUN|CSS \(/, '🇨🇳', 'China'],
    [/GALILEO|SENTINEL|METOP/, '🇪🇺', 'European Union'],
    [/COSMO-SKYMED|SICRAL/, '🇮🇹', 'Italy'],
    [/HIMAWARI|QZS|IGS|ALOS/, '🇯🇵', 'Japan'],
    [/CARTOSAT|RISAT|GSAT|IRNSS|INSAT/, '🇮🇳', 'India'],
    [/KOMPSAT|KOREASAT/, '🇰🇷', 'South Korea'],
    [/AMOS|OFEK/, '🇮🇱', 'Israel'],
    [/RADARSAT|SCISAT/, '🇨🇦', 'Canada'],
    [/SKYNET|TOPSAT/, '🇬🇧', 'United Kingdom'],
  ];
  for (const [re, emoji, country] of rules) {
    if (re.test(n)) return { emoji, country };
  }
  return { emoji: '🛰️', country: 'Unknown' };
}

export { satellite };
