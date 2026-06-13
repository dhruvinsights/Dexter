/**
 * Live Sky SGP4 worker.
 *
 * Parses a real NORAD TLE catalogue and propagates every object with SGP4 off the
 * main thread, posting back a flat position buffer. This is REAL orbital data and
 * REAL physics (satellite.js) — see plans/02_SIMULATOR_AND_VISUALIZATION.md (Live Sky).
 */
import * as satellite from 'satellite.js';

const EARTH_RADIUS_KM = 6371;
const KM_TO_SCENE = 1 / EARTH_RADIUS_KM;

interface SatEntry {
  rec: satellite.SatRec;
  norad: string;
  name: string;
  launchYear: number;
}

let sats: SatEntry[] = [];

/**
 * The TLE international designator (columns 10-11 of line 1) encodes the
 * launch year as 2 digits. Sputnik-era objects (>= 57) are 19xx, everything
 * else is 20xx — same convention KeepTrack's Time Machine uses.
 */
function launchYearFromTle(l1: string): number {
  const yy = parseInt(l1.slice(9, 11), 10);
  if (Number.isNaN(yy)) return 1957;
  return yy >= 57 ? 1900 + yy : 2000 + yy;
}

function parseCatalogue(text: string, max: number): SatEntry[] {
  const lines = text.split('\n');
  const out: SatEntry[] = [];
  let lastName = '';
  for (let i = 0; i + 1 < lines.length; i++) {
    const l1 = lines[i]?.trim();
    const l2 = lines[i + 1]?.trim();
    // 3LE format interleaves a name line before each TLE pair; remember it.
    if (l1 && l1[0] !== '1' && l1[0] !== '2') {
      lastName = l1;
      continue;
    }
    if (!l1 || !l2 || l1[0] !== '1' || l2[0] !== '2') continue;
    try {
      const rec = satellite.twoline2satrec(l1, l2);
      if (rec.error === 0) {
        const norad = l1.slice(2, 7).trim();
        out.push({ rec, norad, name: lastName || `NORAD ${norad}`, launchYear: launchYearFromTle(l1) });
      }
    } catch {
      /* skip malformed */
    }
    lastName = '';
    i++; // consumed the pair
    // Only break if we've reached the max limit (allows loading all satellites when max is high enough)
    if (max > 0 && out.length >= max) break;
  }
  return out;
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === 'init') {
    sats = parseCatalogue(msg.text as string, msg.max ?? 20000);
    // send the NORAD id list + launch years once so the main thread can
    // label selections and drive the Time Machine
    self.postMessage({
      type: 'ready',
      count: sats.length,
      norads: sats.map((s) => s.norad),
      names: sats.map((s) => s.name),
      launchYears: sats.map((s) => s.launchYear),
    });
    return;
  }

  if (msg.type === 'tick') {
    const date = new Date(msg.time as number);
    const n = sats.length;
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const pv = satellite.propagate(sats[i].rec, date);
      const p = pv?.position;
      if (p && typeof p !== 'boolean') {
        // TEME (ECI) km → scene units, mapping Z(north) → scene Y(up)
        out[i * 3 + 0] = p.x * KM_TO_SCENE;
        out[i * 3 + 1] = p.z * KM_TO_SCENE;
        out[i * 3 + 2] = -p.y * KM_TO_SCENE;
      } else {
        // decayed / propagation error → hide at origin (inside Earth)
        out[i * 3 + 0] = 0;
        out[i * 3 + 1] = 0;
        out[i * 3 + 2] = 0;
      }
    }
    self.postMessage({ type: 'positions', buffer: out.buffer, count: n }, { transfer: [out.buffer] });
  }
};
