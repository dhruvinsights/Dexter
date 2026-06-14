/**
 * Deterministic scenario analytics.
 *
 * Every value here is COMPUTED from the MOCAT projection (RawMOCATOutput) and the
 * per-shell stability rows — no LLM, no randomness, no mock text. The Scenario
 * workspace renders these directly so the user can see exactly *why* a policy
 * performs the way it does. Re-running with the same inputs always yields the
 * same numbers.
 *
 * Data sources:
 *   • results[scenarioId]  — full [year][shell] population + collision arrays
 *   • baseline (baseline_2024) — the reference every policy is measured against
 *   • stability rows       — Kessler production/removal ratio per altitude shell
 *   • SCENARIOS configs    — the levers (ADR rate, launch cap, collision avoidance)
 */
import type { RawMOCATOutput, ScenarioConfig } from '@/integration/contracts';
import { parseShellLabel } from '@/integration/contracts';
import { SCENARIOS } from '@/integration/mocks';
import type { StabilityRow } from './debrisEngine';
import { metricsAtYear } from './metrics';

export const BASELINE_ID = 'baseline_2024';

export type Direction = 'good' | 'bad' | 'neutral';

export interface ImpactMetric {
  key: string;
  label: string;
  /** Formatted headline value, e.g. "−34%" or "B → C". */
  display: string;
  /** Raw signed number for sorting/colouring (positive = improvement vs baseline). */
  signed: number;
  direction: Direction;
  /** Deterministic factors behind the number — surfaced by the "Why?" toggle. */
  why: string[];
}

export interface RegionStat {
  shell: number;
  label: string;
  altKm: number;
  value: number; // metric-specific (objects, growth %, ratio, …)
  detail: string;
}

export interface ThreatObject {
  name: string;
  flag: string;
  kind: string;
  massKg: number;
  altKm: number;
  shell: number;
  shellStatus: string;
  why: string;
}

export interface TimelineRow {
  years: number;
  calendarYear: number;
  totalObjects: number;
  totalDebris: number;
  collisionsPerYear: number;
  grade: string;
  criticalShells: number;
  extrapolated: boolean;
}

export interface CompareRow {
  scenarioId: string;
  name: string;
  intervention: string;
  finalObjects: number;
  collisionReductionPct: number;
  debrisGrowthPct: number;
  sustGrade: string;
  costIndex: number;
}

// ── small helpers ────────────────────────────────────────────────────────────

export function configFor(scenarioId: string): ScenarioConfig | undefined {
  return SCENARIOS.find((c) => c.scenario_id === scenarioId);
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Per-shell total objects (payloads + debris + rocket bodies) at a given year. */
function shellTotals(o: RawMOCATOutput, year: number): number[] {
  const y = Math.min(o.simulation_years, Math.max(0, Math.round(year)));
  return o.shells.map(
    (_, k) => o.payloads_per_shell[y][k] + o.debris_per_shell[y][k] + o.rocket_bodies_per_shell[y][k],
  );
}

const altOf = (label: string) => {
  const { minKm, maxKm } = parseShellLabel(label);
  return (minKm + maxKm) / 2;
};

const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(0)}%`;
const fmtNum = (n: number) => Math.round(n).toLocaleString();

// ── 1. Scenario Impact Analysis (vs baseline) ────────────────────────────────

export function scenarioImpact(
  results: Record<string, RawMOCATOutput>,
  scenarioId: string,
): ImpactMetric[] {
  const s = results[scenarioId];
  const b = results[BASELINE_ID];
  if (!s || !b) return [];
  const cfg = configFor(scenarioId);
  const fy = s.simulation_years;

  // Collision reduction — cumulative collisions over the horizon vs baseline.
  const collS = sum(s.total_collisions_per_year);
  const collB = sum(b.total_collisions_per_year) || 1;
  const collisionReduction = (1 - collS / collB) * 100;

  // Debris growth — final vs initial, compared to baseline's growth.
  const initDebris = sum(s.debris_per_shell[0]) || 1;
  const growthS = ((sum(s.debris_per_shell[fy]) - initDebris) / initDebris) * 100;
  const growthB = ((sum(b.debris_per_shell[fy]) - initDebris) / initDebris) * 100;
  const debrisDelta = growthS - growthB; // negative pp = less growth than baseline

  // Sustainability score (0–100) at the horizon vs baseline.
  const scoreS = metricsAtYear(s, fy).sustainabilityScore;
  const scoreB = metricsAtYear(b, fy).sustainabilityScore;
  const scoreDelta = scoreS - scoreB;

  // Orbital capacity recovery — fewer resident objects than baseline = freed capacity.
  const objS = s.total_objects_per_year[fy];
  const objB = b.total_objects_per_year[fy] || 1;
  const capacityRecovery = ((objB - objS) / objB) * 100;

  // Cost index — relative economic/operational burden of the levers (baseline = 0).
  const cost = costIndex(scenarioId);

  const adrShells = cfg?.adr_target_shells ?? [];
  const adrNames = adrShells.map((k) => s.shells[k]).filter(Boolean);

  return [
    {
      key: 'collision',
      label: 'Collision Reduction',
      display: collisionReduction >= 0 ? `−${collisionReduction.toFixed(0)}%` : `+${(-collisionReduction).toFixed(0)}%`,
      signed: collisionReduction,
      direction: collisionReduction > 1 ? 'good' : collisionReduction < -1 ? 'bad' : 'neutral',
      why: [
        `Cumulative collisions over ${fy} yrs: ${collS.toFixed(1)} vs baseline ${collB.toFixed(1)}.`,
        cfg?.collision_avoidance_efficiency
          ? `Collision-avoidance manoeuvring removes ${(cfg.collision_avoidance_efficiency * 100).toFixed(0)}% of active-involved conjunctions.`
          : 'No collision-avoidance benefit in this policy.',
        adrShells.length
          ? `ADR clears fragments from ${adrNames.join(', ')}, lowering density-squared collision rate.`
          : 'No ADR — fragment population keeps feeding new collisions.',
      ],
    },
    {
      key: 'debris',
      label: 'Debris Growth Change',
      display: `${fmtPct(growthS)} (${debrisDelta >= 0 ? '+' : ''}${debrisDelta.toFixed(0)} pp vs base)`,
      signed: -debrisDelta,
      direction: debrisDelta < -1 ? 'good' : debrisDelta > 1 ? 'bad' : 'neutral',
      why: [
        `Debris ${fmtNum(initDebris)} → ${fmtNum(sum(s.debris_per_shell[fy]))} (${fmtPct(growthS)}).`,
        `Baseline grows ${fmtPct(growthB)} over the same period.`,
        adrShells.length
          ? `ADR removes ${cfg?.adr_rate}/yr from each targeted shell.`
          : 'No removal sink beyond atmospheric drag.',
      ],
    },
    {
      key: 'sustainability',
      label: 'Sustainability Score Change',
      display: `${scoreS} (${scoreDelta >= 0 ? '+' : ''}${scoreDelta} vs base)`,
      signed: scoreDelta,
      direction: scoreDelta > 1 ? 'good' : scoreDelta < -1 ? 'bad' : 'neutral',
      why: [
        `Score blends debris load and collision pressure at year ${fy}.`,
        `This policy: ${scoreS}/100 (grade ${metricsAtYear(s, fy).grade}); baseline: ${scoreB}/100 (grade ${metricsAtYear(b, fy).grade}).`,
      ],
    },
    {
      key: 'capacity',
      label: 'Orbital Capacity Recovery',
      display: capacityRecovery >= 0 ? `+${capacityRecovery.toFixed(0)}%` : `${capacityRecovery.toFixed(0)}%`,
      signed: capacityRecovery,
      direction: capacityRecovery > 1 ? 'good' : capacityRecovery < -1 ? 'bad' : 'neutral',
      why: [
        `Resident objects at year ${fy}: ${fmtNum(objS)} vs baseline ${fmtNum(objB)}.`,
        `Fewer objects = more usable volume in congested LEO shells.`,
      ],
    },
    {
      key: 'cost',
      label: 'Cost Index',
      display: `${cost}/100`,
      signed: -cost, // higher cost is "worse" for this neutral-ish lever
      direction: cost === 0 ? 'neutral' : cost > 60 ? 'bad' : 'neutral',
      why: [
        adrShells.length ? `ADR programme: ${cfg?.adr_rate} removals/yr × ${adrShells.length} shells.` : 'No ADR cost.',
        cfg && cfg.launch_rate_multiplier < 1
          ? `Launch cap to ${(cfg.launch_rate_multiplier * 100).toFixed(0)}% of demand carries economic opportunity cost.`
          : 'No launch restriction.',
        cfg?.collision_avoidance_efficiency
          ? `Traffic-management / autonomous avoidance infrastructure at ${(cfg.collision_avoidance_efficiency * 100).toFixed(0)}%.`
          : 'No traffic-management spend.',
      ],
    },
  ];
}

/** Relative cost index 0–100 (baseline = 0, highest-effort policy = 100). */
export function costIndex(scenarioId: string): number {
  const raw = (c?: ScenarioConfig) =>
    c
      ? c.adr_rate * (c.adr_target_shells?.length ?? 0) * 0.5 +
        (1 - c.launch_rate_multiplier) * 120 +
        c.collision_avoidance_efficiency * 80
      : 0;
  const max = Math.max(...SCENARIOS.map(raw), 1);
  return Math.round((raw(configFor(scenarioId)) / max) * 100);
}

/** Top high-risk regions = shells with the most projected collisions at the horizon. */
export function highRiskRegions(o: RawMOCATOutput, topN = 3): RegionStat[] {
  const fy = o.simulation_years;
  return o.collisions_per_shell[fy]
    .map((c, k) => ({
      shell: k,
      label: o.shells[k],
      altKm: altOf(o.shells[k]),
      value: c,
      detail: `${c.toFixed(2)} collisions/yr · ${fmtNum(shellTotals(o, fy)[k])} objects`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

// ── 2. Simulation Insights (deterministic, from the engine) ───────────────────

export function mostCongestedShells(o: RawMOCATOutput, topN = 5): RegionStat[] {
  const fy = o.simulation_years;
  const totals = shellTotals(o, fy);
  return totals
    .map((t, k) => ({
      shell: k,
      label: o.shells[k],
      altKm: altOf(o.shells[k]),
      value: t,
      detail: `${fmtNum(t)} objects · ${fmtNum(o.debris_per_shell[fy][k])} debris`,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

export function fastestGrowingDebris(o: RawMOCATOutput, topN = 5): RegionStat[] {
  const fy = o.simulation_years;
  return o.shells
    .map((label, k) => {
      const d0 = o.debris_per_shell[0][k] || 1;
      const dN = o.debris_per_shell[fy][k];
      const pct = ((dN - d0) / d0) * 100;
      return {
        shell: k,
        label,
        altKm: altOf(label),
        value: pct,
        detail: `${fmtNum(d0)} → ${fmtNum(dN)} debris (${fmtPct(pct)})`,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

/** Cascade hotspots = shells whose debris production outruns removal (ratio > 1). */
export function cascadeHotspots(stability: StabilityRow[], topN = 4): RegionStat[] {
  return stability
    .map((r, k) => ({
      shell: k,
      label: r.label,
      altKm: r.altitude,
      value: r.ratio,
      detail: `production/removal ${r.ratio >= 999 ? '∞' : r.ratio.toFixed(1)}× · ${r.status}`,
    }))
    .filter((r) => r.value >= 1)
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

/**
 * Recommended ADR targets = shells that are cascade-prone AND debris-heavy AND
 * high enough that drag won't self-clean them. Flags whether the current policy
 * already targets each.
 */
export function recommendedTargets(
  o: RawMOCATOutput,
  stability: StabilityRow[],
  scenarioId: string,
  topN = 3,
): RegionStat[] {
  const fy = o.simulation_years;
  const cfg = configFor(scenarioId);
  const targeted = new Set(cfg?.adr_target_shells ?? []);
  const maxDebris = Math.max(...o.debris_per_shell[fy], 1);
  return stability
    .map((r, k) => {
      const debrisNorm = o.debris_per_shell[fy][k] / maxDebris;
      const ratioNorm = Math.min(1, r.ratio / 10);
      const lifeNorm = Math.min(1, r.lifetimeYears / 100);
      const score = ratioNorm * 0.5 + debrisNorm * 0.3 + lifeNorm * 0.2;
      return {
        shell: k,
        label: r.label,
        altKm: r.altitude,
        value: score,
        detail: targeted.has(k)
          ? `priority ${(score * 100).toFixed(0)} · ✓ already targeted`
          : `priority ${(score * 100).toFixed(0)} · not yet targeted`,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

/**
 * Top threat objects — real, well-documented massive abandoned objects (the
 * actual ESA/NASA debris-removal priority list), ranked by mass weighted by the
 * Kessler risk of the shell each one sits in. So the *which objects matter most*
 * answer is driven by the simulation's own per-shell stability.
 */
const REAL_HEAVY_OBJECTS: Omit<ThreatObject, 'shell' | 'shellStatus' | 'why'>[] = [
  { name: 'Envisat', flag: '🇪🇺', kind: 'Defunct payload (8 t)', massKg: 8211, altKm: 768 },
  { name: 'SL-16 R/B (Zenit-2)', flag: '🇷🇺', kind: 'Rocket body', massKg: 9000, altKm: 850 },
  { name: 'ADEOS-II / Midori', flag: '🇯🇵', kind: 'Defunct payload', massKg: 3680, altKm: 803 },
  { name: 'H-2A R/B', flag: '🇯🇵', kind: 'Rocket body', massKg: 3000, altKm: 800 },
  { name: 'CZ-2 R/B (Long March)', flag: '🇨🇳', kind: 'Rocket body', massKg: 4000, altKm: 620 },
  { name: 'SL-8 R/B (Cosmos-3M)', flag: '🇷🇺', kind: 'Rocket body', massKg: 1440, altKm: 970 },
  { name: 'Cosmos-1408 fragments', flag: '🇷🇺', kind: 'ASAT debris parent', massKg: 1750, altKm: 480 },
  { name: 'Fengyun-1C fragments', flag: '🇨🇳', kind: 'ASAT debris parent', massKg: 880, altKm: 860 },
];

function shellForAlt(o: RawMOCATOutput, altKm: number): number {
  for (let k = 0; k < o.shells.length; k++) {
    const { minKm, maxKm } = parseShellLabel(o.shells[k]);
    if (altKm >= minKm && altKm < maxKm) return k;
  }
  return Math.max(0, o.shells.length - 1);
}

export function topThreatObjects(
  o: RawMOCATOutput,
  stability: StabilityRow[],
  topN = 5,
): ThreatObject[] {
  const maxMass = Math.max(...REAL_HEAVY_OBJECTS.map((d) => d.massKg));
  return REAL_HEAVY_OBJECTS.map((d) => {
    const shell = shellForAlt(o, d.altKm);
    const st = stability[shell];
    const ratioNorm = st ? Math.min(1, st.ratio / 10) : 0;
    const massNorm = d.massKg / maxMass;
    const risk = massNorm * 0.6 + ratioNorm * 0.4;
    return {
      ...d,
      shell,
      shellStatus: st?.status ?? 'unknown',
      why: `${(d.massKg / 1000).toFixed(1)} t at ${d.altKm} km — sits in the ${o.shells[shell]} shell (${st?.status ?? '—'}); a break-up here injects ~400 trackable fragments into a band drag can't clear.`,
      _risk: risk,
    } as ThreatObject & { _risk: number };
  })
    .sort((a, b) => (b as any)._risk - (a as any)._risk)
    .slice(0, topN)
    .map(({ ...t }) => t);
}

// ── 3. Future timeline projection (10/20/30/50/100 yr) ────────────────────────

const HORIZONS = [10, 20, 30, 50, 100];

export function timelineProjection(o: RawMOCATOutput): TimelineRow[] {
  const fy = o.simulation_years;

  // Annualised compound growth over the last decade of the sim, used to extend
  // beyond the simulated horizon (clearly flagged as extrapolated).
  const lo = Math.max(0, fy - 10);
  const span = fy - lo || 1;
  const gObj = Math.pow(o.total_objects_per_year[fy] / (o.total_objects_per_year[lo] || 1), 1 / span) - 1;
  const debrisAt = (y: number) => sum(o.debris_per_shell[Math.min(fy, y)]);
  const gDeb = Math.pow(debrisAt(fy) / (debrisAt(lo) || 1), 1 / span) - 1;

  return HORIZONS.map((h) => {
    const extrap = h > fy;
    const totalObjects = extrap
      ? o.total_objects_per_year[fy] * Math.pow(1 + gObj, h - fy)
      : o.total_objects_per_year[h];
    const totalDebris = extrap ? debrisAt(fy) * Math.pow(1 + gDeb, h - fy) : debrisAt(h);
    const collisionsPerYear = extrap
      ? o.total_collisions_per_year[fy] * Math.pow(1 + gObj, (h - fy) * 1.6)
      : o.total_collisions_per_year[h];
    const m = metricsAtYear(o, Math.min(fy, h));
    // crude critical-shell count at horizon: shells whose debris exceeds ~3× seed
    const crit = o.shells.filter(
      (_, k) => debrisAtShell(o, Math.min(fy, h), k) > 3 * o.debris_per_shell[0][k],
    ).length;
    return {
      years: h,
      calendarYear: 2024 + h,
      totalObjects,
      totalDebris,
      collisionsPerYear,
      grade: extrap ? gradeFromScore(Math.max(0, m.sustainabilityScore - (h - fy) * 0.4)) : m.grade,
      criticalShells: crit,
      extrapolated: extrap,
    };
  });
}

function debrisAtShell(o: RawMOCATOutput, year: number, k: number): number {
  return o.debris_per_shell[Math.min(o.simulation_years, year)][k];
}
function gradeFromScore(s: number): string {
  if (s >= 85) return 'A';
  if (s >= 70) return 'B';
  if (s >= 55) return 'C';
  if (s >= 40) return 'D';
  return 'F';
}

// ── 4. Scenario summary card ──────────────────────────────────────────────────

export interface ScenarioSummary {
  whatChanged: string;
  whyChanged: string;
  longTermConsequence: string;
  regionsBenefited: string;
  regionsAtRisk: string;
}

export function scenarioSummary(
  results: Record<string, RawMOCATOutput>,
  stability: StabilityRow[],
  scenarioId: string,
): ScenarioSummary {
  const s = results[scenarioId];
  const b = results[BASELINE_ID];
  const cfg = configFor(scenarioId);
  const fy = s.simulation_years;
  const impact = scenarioImpact(results, scenarioId);
  const coll = impact.find((m) => m.key === 'collision')!;
  const deb = impact.find((m) => m.key === 'debris')!;
  const timeline = timelineProjection(s);
  const end = timeline[timeline.length - 1];
  const baseEnd = timelineProjection(b)[timeline.length - 1];

  // Regions that improved most vs baseline (fewer objects), and those still hot.
  const sTot = shellTotals(s, fy);
  const bTot = shellTotals(b, fy);
  const benefited = s.shells
    .map((label, k) => ({ label, delta: bTot[k] - sTot[k] }))
    .sort((a, b2) => b2.delta - a.delta)
    .filter((r) => r.delta > 0)
    .slice(0, 2)
    .map((r) => r.label);
  const atRisk = cascadeHotspots(stability, 3).map((r) => r.label);

  const isBaseline = scenarioId === BASELINE_ID;

  return {
    whatChanged: isBaseline
      ? `Baseline — no intervention. Over ${fy} years the population grows from ${fmtNum(s.total_objects_per_year[0])} to ${fmtNum(s.total_objects_per_year[fy])} objects.`
      : `${coll.display} collisions and ${deb.display.split(' ')[0]} debris vs the no-action baseline, ending at ${fmtNum(s.total_objects_per_year[fy])} resident objects.`,
    whyChanged: isBaseline
      ? `Launches continue at ${cfg?.annual_launch_rate}/yr with today's ~60% disposal compliance; collision fragments accumulate in shells drag can't clear.`
      : [
          cfg?.adr_target_shells?.length ? `ADR removes ${cfg.adr_rate} objects/yr from ${cfg.adr_target_shells.length} shells` : '',
          cfg && cfg.launch_rate_multiplier < 1 ? `launches capped to ${(cfg.launch_rate_multiplier * 100).toFixed(0)}%` : '',
          cfg?.collision_avoidance_efficiency ? `${(cfg.collision_avoidance_efficiency * 100).toFixed(0)}% collision-avoidance` : '',
        ]
          .filter(Boolean)
          .join(', ') + ' — together breaking the fragment-feedback loop.',
    longTermConsequence: `By ${end.calendarYear} (extrapolated), ~${fmtNum(end.totalObjects)} objects vs ~${fmtNum(baseEnd.totalObjects)} under baseline — a ${(((baseEnd.totalObjects - end.totalObjects) / baseEnd.totalObjects) * 100).toFixed(0)}% difference. Projected grade: ${end.grade}.`,
    regionsBenefited: benefited.length ? benefited.join(', ') : 'No region materially improves over baseline.',
    regionsAtRisk: atRisk.length ? atRisk.join(', ') : 'No shell remains on a runaway trajectory.',
  };
}

// ── 5. Side-by-side comparison ────────────────────────────────────────────────

export function compareScenarios(results: Record<string, RawMOCATOutput>): CompareRow[] {
  const b = results[BASELINE_ID];
  return SCENARIOS.filter((c) => results[c.scenario_id]).map((c) => {
    const o = results[c.scenario_id];
    const fy = o.simulation_years;
    const collS = sum(o.total_collisions_per_year);
    const collB = sum(b.total_collisions_per_year) || 1;
    const initDebris = sum(o.debris_per_shell[0]) || 1;
    const growth = ((sum(o.debris_per_shell[fy]) - initDebris) / initDebris) * 100;
    return {
      scenarioId: c.scenario_id,
      name: c.name,
      intervention: c.intervention,
      finalObjects: o.total_objects_per_year[fy],
      collisionReductionPct: (1 - collS / collB) * 100,
      debrisGrowthPct: growth,
      sustGrade: metricsAtYear(o, fy).grade,
      costIndex: costIndex(c.scenario_id),
    };
  });
}
