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

const EARTH_RADIUS_KM_EQ = 6378.137;

function tleChecksum(line: string): number {
  let sum = 0;
  for (const ch of line.slice(0, 68)) {
    if (ch >= '0' && ch <= '9') sum += Number(ch);
    else if (ch === '-') sum += 1;
  }
  return sum % 10;
}

/** Right-justified fixed-width field. */
function fw(value: string, width: number): string {
  return value.slice(0, width).padStart(width, ' ');
}

export interface TleParams {
  noradId: number;
  epochYear: number; // 2-digit
  epochDay: number; // day-of-year with fraction
  inclinationDeg: number;
  raanDeg: number;
  eccentricity: number; // 0..1
  argPerigeeDeg: number;
  meanAnomalyDeg: number;
  meanMotionRevPerDay: number;
}

/** Build a valid two-line element set (with checksums) from orbital params. */
export function buildTle(p: TleParams): { line1: string; line2: string } {
  const id = String(p.noradId).padStart(5, '0');
  const intlDesig = `${String(p.epochYear).padStart(2, '0')}001A`.padEnd(8, ' ');
  const epoch = `${String(p.epochYear).padStart(2, '0')}${p.epochDay.toFixed(8).padStart(12, '0')}`;

  let l1 = '1 ' + id + 'U ' + intlDesig + ' ' + epoch + ' ' + '.00000000' + ' ' + '00000-0' + ' ' + '00000-0' + ' 0 ' + ' 999';
  l1 = l1.padEnd(68, ' ');
  l1 += String(tleChecksum(l1));

  const ecc = Math.round(p.eccentricity * 1e7).toString().padStart(7, '0').slice(0, 7);
  let l2 =
    '2 ' +
    id +
    ' ' +
    fw(p.inclinationDeg.toFixed(4), 8) +
    ' ' +
    fw(p.raanDeg.toFixed(4), 8) +
    ' ' +
    ecc +
    ' ' +
    fw(p.argPerigeeDeg.toFixed(4), 8) +
    ' ' +
    fw(p.meanAnomalyDeg.toFixed(4), 8) +
    ' ' +
    fw(p.meanMotionRevPerDay.toFixed(8), 11) +
    '00001';
  l2 = l2.padEnd(68, ' ');
  l2 += String(tleChecksum(l2));

  return { line1: l1, line2: l2 };
}

/** Mean motion (rev/day) for a circular-ish orbit from apogee/perigee altitudes. */
export function meanMotionFromAltitudes(apogeeKm: number, perigeeKm: number): number {
  const ra = EARTH_RADIUS_KM_EQ + apogeeKm;
  const rp = EARTH_RADIUS_KM_EQ + perigeeKm;
  const a = (ra + rp) / 2;
  const periodSec = 2 * Math.PI * Math.sqrt((a * a * a) / MU);
  return 86400 / periodSec;
}

export function eccentricityFromAltitudes(apogeeKm: number, perigeeKm: number): number {
  const ra = EARTH_RADIUS_KM_EQ + apogeeKm;
  const rp = EARTH_RADIUS_KM_EQ + perigeeKm;
  return (ra - rp) / (ra + rp);
}

/** Current UTC epoch as {year2, dayOfYear} for a freshly created element set. */
export function nowEpoch(): { year: number; day: number } {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 1);
  const day = (now.getTime() - start) / 86400000 + 1;
  return { year: now.getUTCFullYear() % 100, day };
}

export { satellite };
