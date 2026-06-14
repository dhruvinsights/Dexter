/**
 * Loads the real shell seed (public/shells.json) and runs the MOCAT-style engine
 * for every scenario, returning contract-shaped results plus the per-shell
 * Kessler-stability indicator. Falls back to a baked-in real distribution (the
 * values build-shells.ts produced from CelesTrak SATCAT) if the file is missing.
 */
import type { RawMOCATOutput } from '@/integration/contracts';
import { SCENARIOS } from '@/integration/mocks';
import { runMocat, shellStability, type ShellSeed } from './debrisEngine';

/** Baked-in fallback: real on-orbit distribution from CelesTrak SATCAT (2026-06). */
const FALLBACK_SEED: ShellSeed[] = [
  { label: '200-400km', payloads: 1330, debris: 22, rocketBodies: 25 },
  { label: '400-500km', payloads: 7982, debris: 133, rocketBodies: 60 },
  { label: '500-600km', payloads: 3888, debris: 333, rocketBodies: 78 },
  { label: '600-700km', payloads: 728, debris: 1019, rocketBodies: 116 },
  { label: '700-800km', payloads: 424, debris: 2161, rocketBodies: 152 },
  { label: '800-900km', payloads: 303, debris: 2519, rocketBodies: 115 },
  { label: '900-1000km', payloads: 394, debris: 1238, rocketBodies: 209 },
  { label: '1000-1200km', payloads: 775, debris: 1055, rocketBodies: 85 },
  { label: '1200-1500km', payloads: 970, debris: 965, rocketBodies: 84 },
  { label: '1500-2000km', payloads: 122, debris: 657, rocketBodies: 79 },
  { label: '2000-5000km', payloads: 51, debris: 350, rocketBodies: 47 },
];

export interface PhysicsBundle {
  seeds: ShellSeed[];
  results: Record<string, RawMOCATOutput>;
  stability: ReturnType<typeof shellStability>;
  seededFromReal: boolean;
}

export async function loadPhysics(): Promise<PhysicsBundle> {
  let seeds = FALLBACK_SEED;
  let seededFromReal = false;
  try {
    const res = await fetch('/shells.json');
    if (res.ok) {
      const data = (await res.json()) as { shells?: ShellSeed[] };
      if (Array.isArray(data.shells) && data.shells.length > 0) {
        seeds = data.shells;
        seededFromReal = true;
        console.info('[physics] seeded from real catalogue (shells.json)');
      }
    }
  } catch {
    console.warn('[physics] shells.json unavailable — using baked-in real seed');
  }

  const results: Record<string, RawMOCATOutput> = {};
  for (const cfg of SCENARIOS) results[cfg.scenario_id] = runMocat(cfg, seeds);

  return { seeds, results, stability: shellStability(seeds), seededFromReal };
}
