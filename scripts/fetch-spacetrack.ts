/**
 * Fetch the COMPLETE catalogue from Space-Track.org (USSF 18th Space Defense
 * Squadron) — every on-orbit tracked object (~28k), including all the debris and
 * dead payloads that CelesTrak's grouped GP feed omits. This is what gives a
 * KeepTrack-density field.
 *
 * Space-Track requires a FREE account (https://www.space-track.org). Put the
 * credentials in a gitignored `.env` at the repo root (or export them):
 *
 *     SPACETRACK_USER=you@example.com
 *     SPACETRACK_PASS=your-password
 *
 *   Usage:
 *     npx tsx scripts/fetch-spacetrack.ts          # full on-orbit catalogue → public/tle/TLE.txt
 *     npx tsx scripts/fetch-spacetrack.ts --force  # ignore the local freshness cache
 *
 * Space-Track rules we honour (https://www.space-track.org/documentation#api):
 *   - Throttle: << 30 requests/min and << 300/hour. We make exactly 2 (login + 1
 *     bulk query), so we are well under.
 *   - Re-download no more than a few times/day — element sets update ~3×/day.
 *     We skip if TLE.txt is younger than 6h unless --force.
 *
 * NOTE (5→6 digit catalogue numbers, ~2026-07-12): the legacy 3LE/TLE format
 * cannot represent NORAD ids ≥ 100000. When that cutover lands, switch the
 * `format/3le` below to `format/json` (OMM) and parse with satellite.js'
 * `json2satrec` in the worker. Until then 3LE keeps the existing pipeline intact.
 */

import { existsSync, readFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = resolve(ROOT, 'public', 'tle', 'TLE.txt');
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h — Space-Track updates ~3×/day

const LOGIN_URL = 'https://www.space-track.org/ajaxauth/login';
// All on-orbit objects (no decay date) with element sets from the last 30 days,
// ordered by catalogue number, as 3-line element sets (name + TLE pair).
const QUERY_URL =
  'https://www.space-track.org/basicspacedata/query/class/gp/decay_date/null-val/epoch/%3Enow-30/orderby/norad_cat_id/format/3le';

/** Read SPACETRACK_USER / SPACETRACK_PASS from the environment or a root .env. */
function loadCredentials(): { user: string; pass: string } {
  let user = process.env.SPACETRACK_USER;
  let pass = process.env.SPACETRACK_PASS;
  const envPath = resolve(ROOT, '.env');
  if ((!user || !pass) && existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^\s*(SPACETRACK_USER|SPACETRACK_PASS)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const val = m[2].replace(/^["']|["']$/g, '');
      if (m[1] === 'SPACETRACK_USER') user ??= val;
      else pass ??= val;
    }
  }
  if (!user || !pass) {
    throw new Error(
      'Missing Space-Track credentials. Add to a gitignored .env at the repo root:\n' +
        '  SPACETRACK_USER=you@example.com\n' +
        '  SPACETRACK_PASS=your-password\n' +
        'Register free at https://www.space-track.org',
    );
  }
  return { user, pass };
}

/** Space-Track 3LE name lines are prefixed with "0 " — strip it for clean TLE.txt. */
function normalise3le(text: string): string {
  return text
    .split('\n')
    .map((l) => (l.startsWith('0 ') ? l.slice(2).trimEnd() : l))
    .join('\n');
}

function countObjects(tleText: string): number {
  return tleText.split('\n').filter((l) => l.startsWith('1 ')).length;
}

async function main() {
  const force = process.argv.includes('--force');

  if (!force && existsSync(OUT_PATH)) {
    const ageMs = Date.now() - statSync(OUT_PATH).mtimeMs;
    if (ageMs < CACHE_MAX_AGE_MS) {
      const mins = Math.round(ageMs / 60000);
      process.stdout.write(
        `TLE.txt is ${mins} min old (< 6h). Space-Track updates ~3×/day — skipping.\n` +
          `Pass --force to override.\n`,
      );
      return;
    }
  }

  const { user, pass } = loadCredentials();

  process.stdout.write('Authenticating with Space-Track…\n');
  const login = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ identity: user, password: pass }),
    redirect: 'manual',
  });
  if (login.status >= 400) {
    throw new Error(`Space-Track login failed: ${login.status} ${login.statusText} (check credentials)`);
  }
  const cookie = login.headers.get('set-cookie');
  if (!cookie) throw new Error('Space-Track login returned no session cookie.');

  process.stdout.write('Downloading full on-orbit catalogue (this is ~6 MB)…\n');
  const res = await fetch(QUERY_URL, { headers: { Cookie: cookie } });
  if (!res.ok) {
    throw new Error(`Space-Track query failed: ${res.status} ${res.statusText}`);
  }
  const raw = await res.text();
  if (raw.trim().startsWith('<') || raw.toLowerCase().includes('error')) {
    throw new Error(`Space-Track returned an error body: ${raw.trim().slice(0, 120)}`);
  }

  const combined = `${normalise3le(raw).trim()}\n`;
  const count = countObjects(combined);
  if (count === 0) throw new Error('Fetched 0 objects — refusing to overwrite TLE.txt.');

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, combined, 'utf-8');

  const sizeMb = (Buffer.byteLength(combined) / 1024 / 1024).toFixed(2);
  process.stdout.write(
    `\n✓ Wrote ${count.toLocaleString()} objects (${sizeMb} MB) to public/tle/TLE.txt\n` +
      `  Source: Space-Track.org GP (full on-orbit catalogue) · ${new Date().toISOString()}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`\n✗ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
