/**
 * MOCAT-style orbital debris source–sink model.
 *
 * A physically grounded (if deliberately compact) implementation of the kind of
 * model MIT's MOCAT / ESA's MASTER use: the LEO population is discretised into
 * altitude shells, and each shell's payload / debris / rocket-body counts evolve
 * year-on-year under explicit physical source and sink terms:
 *
 *   SOURCES                              SINKS
 *   • launches (new payloads)            • atmospheric drag decay (→ lower shell
 *   • post-mission derelicts (failed       / re-entry)
 *     de-orbit)                          • post-mission disposal (PMD compliance)
 *   • collision fragments (NASA-style    • active debris removal (ADR)
 *     break-up yield)
 *
 * Collisions use the particle-in-a-box kinetic rate λ = ⟨σv⟩·N_i·N_j / V_shell,
 * the standard first-order approximation for collision frequency in a
 * well-mixed orbital shell. This is a real model — a deterministic projection
 * from real initial conditions — not measured telemetry and not a random mock.
 *
 * Initial conditions come from public/shells.json (real on-orbit counts binned
 * from CelesTrak SATCAT). See scripts/build-shells.ts.
 */
import type { RawMOCATOutput, ScenarioConfig } from '@/integration/contracts';
import { SHELL_BANDS, shellMidAltitude, shellVolume, dragLifetimeYears } from './shellDefs';

export interface ShellSeed {
  label: string;
  payloads: number;
  debris: number;
  rocketBodies: number;
}

// ── Physical constants (documented, order-of-magnitude representative) ──

/**
 * Collision kernel ⟨σ·v_rel⟩ for a representative catalogued-object pair, in
 * km³/yr. σ = π(r₁+r₂)² with r ≈ 1 m → σ ≈ 1.26e-5 km²; v_rel ≈ 10 km/s in LEO;
 * ×3.156e7 s/yr.
 */
const COLLISION_KERNEL = 3.97e3;

/** Trackable (>10 cm) fragments produced by one catastrophic break-up (NASA SBM, order). */
const FRAGMENTS_PER_CATASTROPHIC = 400;

/** Active-payload operational life before retirement (years) → retirement rate. */
const MISSION_LIFE_YEARS = 5;
const RETIRE_RATE = 1 / MISSION_LIFE_YEARS;

/** Fraction of a collision pair that is "active vs active" gets avoidance benefit. */
function pmdComplianceFor(intervention: ScenarioConfig['intervention']): number {
  switch (intervention) {
    case 'hybrid':
      return 0.9;
    case 'ai_traffic_mgmt':
      return 0.75;
    case 'adr':
    case 'launch_cap':
      return 0.65;
    default:
      return 0.6; // baseline ~ today's real-world PMD compliance
  }
}

interface ShellState {
  S: number; // active payloads
  D: number; // debris (fragments + derelict payloads)
  R: number; // rocket bodies
}

/**
 * Run the source–sink projection for one scenario, returning the contract-shaped
 * RawMOCATOutput consumed by the existing Scenario / Forecasting UI.
 */
export function runMocat(config: ScenarioConfig, seeds: ShellSeed[]): RawMOCATOutput {
  const years = config.simulation_years;
  const K = SHELL_BANDS.length;
  const pmd = pmdComplianceFor(config.intervention);
  const caEff = config.collision_avoidance_efficiency;
  const launchMult = config.launch_rate_multiplier;
  const adrTargets = new Set(config.adr_target_shells ?? []);

  const volume = SHELL_BANDS.map(shellVolume);
  const decayFrac = SHELL_BANDS.map((b) => Math.min(1, 1 / dragLifetimeYears(shellMidAltitude(b))));

  // Launch profile: distribute new payloads across shells in proportion to where
  // payloads are seeded today (real launch demand is concentrated, e.g. ~550 km).
  const seedPay = seeds.map((s) => s.payloads);
  const seedPaySum = seedPay.reduce((a, b) => a + b, 0) || 1;
  const launchProfile = seedPay.map((p) => p / seedPaySum);
  const annualLaunches = config.annual_launch_rate * launchMult;

  const state: ShellState[] = seeds.map((s) => ({ S: s.payloads, D: s.debris, R: s.rocketBodies }));

  const payloads_per_shell: number[][] = [];
  const debris_per_shell: number[][] = [];
  const rocket_bodies_per_shell: number[][] = [];
  const collisions_per_shell: number[][] = [];

  const snapshot = () => {
    payloads_per_shell.push(state.map((s) => Math.round(s.S)));
    debris_per_shell.push(state.map((s) => Math.round(s.D)));
    rocket_bodies_per_shell.push(state.map((s) => Math.round(s.R)));
  };

  // t = 0 (real initial conditions); collisions at t=0 are zero by convention.
  snapshot();
  collisions_per_shell.push(new Array(K).fill(0));

  for (let t = 1; t <= years; t++) {
    // Compute per-shell collision counts from the CURRENT state, then apply all
    // sources/sinks to produce next year's state.
    const collThisYear = new Array(K).fill(0);
    const fragAdds = new Array(K).fill(0);
    const collisionLosses = state.map(() => ({ S: 0, D: 0, R: 0 }));

    for (let k = 0; k < K; k++) {
      const { S, D, R } = state[k];
      const N = S + D + R;
      if (N < 2) continue;
      const kernel = COLLISION_KERNEL / volume[k];

      // Total collision pairs (well-mixed): ½N². Split the avoidance benefit by
      // the share of pairs that involve at least one maneuverable active payload.
      const totalPairs = 0.5 * N * N;
      const activeShare = S / N; // P(at least one active) ≈ 1-(1-S/N)²; use linear proxy
      const pInvolvesActive = 1 - (1 - activeShare) * (1 - activeShare);
      const effPairs = totalPairs * (1 - pInvolvesActive * caEff);
      const collisions = kernel * effPairs;

      collThisYear[k] = collisions;

      // Each catastrophic collision removes its 2 participants (by species share)
      // and injects fragments. Conserve which species is destroyed via shares.
      const destroyed = Math.min(N, 2 * collisions);
      collisionLosses[k].S = destroyed * (S / N);
      collisionLosses[k].D = destroyed * (D / N);
      collisionLosses[k].R = destroyed * (R / N);
      fragAdds[k] = collisions * FRAGMENTS_PER_CATASTROPHIC;
    }

    // Build next state.
    const next: ShellState[] = state.map((s) => ({ ...s }));

    for (let k = 0; k < K; k++) {
      // ── collision losses + fragment source ──
      next[k].S -= collisionLosses[k].S;
      next[k].D -= collisionLosses[k].D;
      next[k].R -= collisionLosses[k].R;
      next[k].D += fragAdds[k];

      // ── launches (new active payloads) ──
      next[k].S += annualLaunches * launchProfile[k];

      // ── retirement / PMD: a fraction of active payloads reach end-of-life ──
      const retiring = state[k].S * RETIRE_RATE;
      next[k].S -= retiring;
      // Compliant ones are disposed (removed); non-compliant become derelict debris.
      next[k].D += retiring * (1 - pmd);

      // ── ADR: remove debris from targeted shells ──
      if (adrTargets.has(k) && config.adr_rate > 0) {
        next[k].D = Math.max(0, next[k].D - config.adr_rate);
      }
    }

    // ── atmospheric drag decay: uncontrolled D and R sink to the shell below;
    //    from the lowest shell they re-enter (leave the system). Active payloads
    //    station-keep, so they don't decay. Apply after sources. ──
    for (let k = 0; k < K; k++) {
      const f = decayFrac[k];
      const dDecay = next[k].D * f;
      const rDecay = next[k].R * f;
      next[k].D -= dDecay;
      next[k].R -= rDecay;
      if (k > 0) {
        next[k - 1].D += dDecay;
        next[k - 1].R += rDecay;
      } // k === 0 → re-entry, removed
    }

    for (let k = 0; k < K; k++) {
      next[k].S = Math.max(0, next[k].S);
      next[k].D = Math.max(0, next[k].D);
      next[k].R = Math.max(0, next[k].R);
    }

    state.splice(0, K, ...next);
    snapshot();
    collisions_per_shell.push(collThisYear.map((c) => Number(c.toFixed(3))));
  }

  const total_objects_per_year = payloads_per_shell.map((_, t) =>
    payloads_per_shell[t].reduce((a, b) => a + b, 0) +
    debris_per_shell[t].reduce((a, b) => a + b, 0) +
    rocket_bodies_per_shell[t].reduce((a, b) => a + b, 0),
  );
  const total_collisions_per_year = collisions_per_shell.map((row) =>
    Number(row.reduce((a, b) => a + b, 0).toFixed(3)),
  );

  return {
    scenario_id: config.scenario_id,
    simulation_years: years,
    shells: SHELL_BANDS.map((b) => b.label),
    timesteps: Array.from({ length: years + 1 }, (_, i) => i),
    payloads_per_shell,
    debris_per_shell,
    rocket_bodies_per_shell,
    collisions_per_shell,
    total_objects_per_year,
    total_collisions_per_year,
    ran_at: new Date().toISOString(),
    runtime_seconds: 0,
  };
}

/**
 * Per-shell stability ("Kessler") indicator at the current seed state: the ratio
 * of collisional debris-production rate to drag removal rate. A value > 1 means
 * the shell generates trackable debris faster than the atmosphere can clear it —
 * i.e. it is super-critical / on a runaway (Kessler) trajectory.
 */
export type ShellStatus = 'stable' | 'marginal' | 'growing' | 'critical';

export interface StabilityRow {
  label: string;
  altitude: number;
  objects: number;
  debris: number;
  lifetimeYears: number; // drag-clearing timescale at this altitude
  ratio: number; // debris production / removal (clamped for display)
  status: ShellStatus;
}

export function shellStability(seeds: ShellSeed[]): StabilityRow[] {
  return SHELL_BANDS.map((b, k) => {
    const s = seeds[k];
    const N = s.payloads + s.debris + s.rocketBodies;
    const V = shellVolume(b);
    const lifetime = dragLifetimeYears(shellMidAltitude(b));
    const collisions = (COLLISION_KERNEL / V) * 0.5 * N * N;
    const fragRate = collisions * FRAGMENTS_PER_CATASTROPHIC; // new debris / yr
    const decayRate = (s.debris + s.rocketBodies) / lifetime; // removed / yr
    const rawRatio = decayRate > 0 ? fragRate / decayRate : fragRate > 0 ? Infinity : 0;
    const ratio = Number.isFinite(rawRatio) ? Math.min(rawRatio, 999) : 999;

    // Categorise: above ~700 km drag barely clears debris, so any production is
    // effectively permanent accumulation (critical); low shells self-clean.
    let status: ShellStatus;
    if (ratio < 0.5) status = 'stable';
    else if (ratio < 1) status = 'marginal';
    else if (ratio < 5) status = 'growing';
    else status = 'critical';

    return {
      label: b.label,
      altitude: shellMidAltitude(b),
      objects: N,
      debris: s.debris,
      lifetimeYears: lifetime,
      ratio,
      status,
    };
  });
}
