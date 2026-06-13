/**
 * Fetch REAL orbital data from CelesTrak's public GP (General Perturbations) API
 * and write it to public/tle/TLE.txt — the catalogue Dexter's Live Sky mode
 * propagates with SGP4.
 *
 * This is the same upstream data KeepTrack uses (CelesTrak republishes the
 * USSF 18th Space Defense Squadron catalogue). We pull it directly rather than
 * through a 3rd-party proxy, so there is no API key and no mock layer.
 *
 *   Usage:
 *     npx tsx scripts/fetch-celestrak.ts                 # GROUP=active (default)
 *     npx tsx scripts/fetch-celestrak.ts active          # operational payloads (~11k)
 *     npx tsx scripts/fetch-celestrak.ts cosmos-2251-debris
 *     npx tsx scripts/fetch-celestrak.ts active,starlink,last-30-days
 *     npx tsx scripts/fetch-celestrak.ts --force         # ignore the 2h cache
 *
 * CelesTrak rules we honour (https://celestrak.org/NORAD/documentation/gp-data-formats.php):
 *   - GP data updates at most every 2 hours → we skip re-download if TLE.txt is
 *     younger than 2h (CelesTrak blocks IPs that poll faster).
 *   - We check HTTP status and abort on errors (repeated errors → firewall block).
 *   - We request only the groups asked for ("download only the data you need").
 */

import { mkdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = resolve(ROOT, 'public', 'tle', 'TLE.txt');
const GP_BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2h — CelesTrak's update cadence
const USER_AGENT = 'Dexter/0.1 (orbital sustainability simulator; contact: visiarise@gmail.com)';

function parseArgs(argv: string[]): { groups: string[]; force: boolean } {
  const force = argv.includes('--force');
  const positional = argv.filter((a) => !a.startsWith('--'));
  const groups = (positional[0] ?? 'active')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
  return { groups, force };
}

/** TLE/3LE: count "1 " lines (each object = name? + line1 + line2). */
function countObjects(tleText: string): number {
  return tleText.split('\n').filter((l) => l.startsWith('1 ')).length;
}

async function fetchGroup(group: string): Promise<string> {
  const url = `${GP_BASE}?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
  process.stdout.write(`  → ${url}\n`);

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  // CelesTrak firewalls IPs that ignore HTTP errors — fail loudly.
  if (!res.ok) {
    throw new Error(`CelesTrak responded ${res.status} ${res.statusText} for GROUP=${group}`);
  }

  const text = await res.text();

  // CelesTrak returns a plain-text error body ("Invalid query...") with a 200.
  if (text.trim().toLowerCase().startsWith('invalid') || text.includes('No GP data found')) {
    throw new Error(`CelesTrak: no data for GROUP=${group} (${text.trim().slice(0, 80)})`);
  }
  return text.trim();
}

async function main() {
  const { groups, force } = parseArgs(process.argv.slice(2));

  // Honour CelesTrak's 2h cadence unless --force.
  if (!force && existsSync(OUT_PATH)) {
    const ageMs = Date.now() - statSync(OUT_PATH).mtimeMs;
    if (ageMs < CACHE_MAX_AGE_MS) {
      const mins = Math.round(ageMs / 60000);
      process.stdout.write(
        `TLE.txt is ${mins} min old (< 2h). CelesTrak updates every 2h — skipping.\n` +
          `Pass --force to override.\n`,
      );
      return;
    }
  }

  process.stdout.write(`Fetching CelesTrak GP data for: ${groups.join(', ')}\n`);

  const blocks: string[] = [];
  for (const group of groups) {
    blocks.push(await fetchGroup(group));
  }

  const combined = `${blocks.join('\n')}\n`;
  const count = countObjects(combined);
  if (count === 0) {
    throw new Error('Fetched 0 objects — refusing to overwrite TLE.txt.');
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, combined, 'utf-8');

  const sizeMb = (Buffer.byteLength(combined) / 1024 / 1024).toFixed(2);
  process.stdout.write(
    `\n✓ Wrote ${count.toLocaleString()} objects (${sizeMb} MB) to public/tle/TLE.txt\n` +
      `  Source: CelesTrak GP API · format TLE · ${new Date().toISOString()}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`\n✗ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
