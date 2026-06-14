/**
 * Fetch CelesTrak's SATCAT and emit a compact NORAD → {owner, type} map so the
 * Live Sky view can colour dots by country and show real flags (CelesTrak TLE
 * files carry no country field; SATCAT does).
 *
 * Run: npm run fetch-satcat
 * Output: public/satcat.json  →  { "25544": ["ISS","PAY"], ... }
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = 'https://celestrak.org/pub/satcat.csv';

// OBJECT_TYPE → compact code
const TYPE: Record<string, string> = { PAYLOAD: 'PAY', 'ROCKET BODY': 'R/B', DEBRIS: 'DEB', UNKNOWN: 'UNK' };

async function main() {
  console.log(`Fetching ${URL} …`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`SATCAT fetch failed: ${res.status}`);
  const csv = await res.text();
  const lines = csv.split('\n');
  const out: Record<string, [string, string]> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 6) continue;
    const norad = cols[2]?.trim();
    const type = cols[3]?.trim();
    const owner = cols[5]?.trim();
    if (!norad) continue;
    out[norad] = [owner || 'TBD', TYPE[type] || 'UNK'];
  }
  const path = resolve(process.cwd(), 'public/satcat.json');
  writeFileSync(path, JSON.stringify(out));
  console.log(`Wrote ${Object.keys(out).length} records → ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
