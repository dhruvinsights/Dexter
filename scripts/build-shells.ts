/**
 * Build the REAL initial per-shell population for the physics engine.
 *
 * Source: CelesTrak SATCAT (satcat.csv), which carries APOGEE / PERIGEE /
 * OBJECT_TYPE / DECAY_DATE for the FULL tracked population (~69k objects),
 * including debris and rocket bodies — unlike the "active" GP/TLE file which
 * only lists operational payloads. We exclude already-decayed objects (those
 * with a DECAY_DATE) so the seed reflects the current on-orbit environment,
 * then bin each surviving object into an altitude shell by its mean altitude
 * ((apogee + perigee) / 2) and tally by type.
 *
 * This genuine current-state data SEEDS the MOCAT-style forward projection
 * (src/sim/mocat.ts) so the model starts from reality, not invented numbers.
 *
 * Run: npm run build-shells
 * Output: public/shells.json
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SHELL_BANDS, shellIndexForAltitude } from '../src/sim/shellDefs';

const SATCAT_URL = 'https://celestrak.org/pub/satcat.csv';

interface ShellSeed {
  label: string;
  payloads: number;
  debris: number;
  rocketBodies: number;
}

async function main() {
  console.log(`Fetching ${SATCAT_URL} …`);
  const res = await fetch(SATCAT_URL);
  if (!res.ok) throw new Error(`SATCAT fetch failed: ${res.status}`);
  const csv = await res.text();
  const lines = csv.split('\n');

  // Header: OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,
  //         OWNER,LAUNCH_DATE,LAUNCH_SITE,DECAY_DATE,PERIOD,INCLINATION,
  //         APOGEE,PERIGEE,RCS,...
  const TYPE = 3;
  const DECAY = 8;
  const APOGEE = 11;
  const PERIGEE = 12;

  const seeds: ShellSeed[] = SHELL_BANDS.map((b) => ({
    label: b.label,
    payloads: 0,
    debris: 0,
    rocketBodies: 0,
  }));

  let onOrbit = 0;
  let decayed = 0;
  let outside = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 13) continue;
    if (cols[DECAY]?.trim()) {
      decayed++;
      continue; // already re-entered — not part of the current environment
    }
    const apogee = parseFloat(cols[APOGEE]);
    const perigee = parseFloat(cols[PERIGEE]);
    if (!Number.isFinite(apogee) || !Number.isFinite(perigee)) continue;
    const meanAlt = (apogee + perigee) / 2;
    const k = shellIndexForAltitude(meanAlt);
    if (k < 0) {
      outside++; // GEO / MEO / HEO outside our LEO shell model
      continue;
    }
    const type = cols[TYPE]?.trim();
    if (type === 'DEB') seeds[k].debris++;
    else if (type === 'R/B') seeds[k].rocketBodies++;
    else seeds[k].payloads++; // PAY + UNK
    onOrbit++;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'CelesTrak SATCAT — real on-orbit objects (decayed excluded)',
    onOrbitBinned: onOrbit,
    decayedExcluded: decayed,
    outsideShells: outside,
    shells: seeds,
  };
  const path = resolve(process.cwd(), 'public/shells.json');
  writeFileSync(path, JSON.stringify(out, null, 2));

  const tot = seeds.reduce(
    (a, s) => ({ p: a.p + s.payloads, d: a.d + s.debris, r: a.r + s.rocketBodies }),
    { p: 0, d: 0, r: 0 },
  );
  console.log(
    `Wrote ${path}\n  on-orbit binned: ${onOrbit}  (decayed excluded: ${decayed}, outside LEO: ${outside})\n  payloads=${tot.p} debris=${tot.d} rocketBodies=${tot.r}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
