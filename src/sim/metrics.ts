/**
 * Derived quantities from a RawMOCATOutput, used by both the 3D field and the UI.
 * Everything the UI shows traces back to these so the 3D and the numbers always agree
 * (plans/02_SIMULATOR_AND_VISUALIZATION.md — fidelity rule).
 */

import type { RawMOCATOutput } from '@/integration/contracts';

/** Linearly interpolate a [year][shell] array at a fractional year for one shell. */
export function interpShell(arr: number[][], year: number, shell: number): number {
  const years = arr.length - 1;
  const ti = Math.min(years, Math.max(0, Math.floor(year)));
  const tn = Math.min(years, ti + 1);
  const f = year - ti;
  const a = arr[ti][shell];
  const b = arr[tn][shell];
  return a + (b - a) * f;
}

/** Interpolate a per-year scalar array at a fractional year. */
export function interpScalar(arr: number[], year: number): number {
  const years = arr.length - 1;
  const ti = Math.min(years, Math.max(0, Math.floor(year)));
  const tn = Math.min(years, ti + 1);
  const f = year - ti;
  return arr[ti] + (arr[tn] - arr[ti]) * f;
}

export interface YearMetrics {
  year: number;
  calendarYear: number;
  totalObjects: number;
  totalDebris: number;
  collisionsPerYear: number;
  sustainabilityScore: number; // 0..100 (illustrative)
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

const BASE_CALENDAR_YEAR = 2024;

function scoreToGrade(score: number): YearMetrics['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Illustrative sustainability score: starts high, degrades as debris load and
 * collision rate climb. Calibrated so baseline trends toward F over 30 years and
 * strong-intervention scenarios hold a better grade.
 */
export function metricsAtYear(output: RawMOCATOutput, year: number): YearMetrics {
  const totalObjects = interpScalar(output.total_objects_per_year, year);
  const totalDebris = output.debris_per_shell[Math.min(output.simulation_years, Math.round(year))]
    .reduce((a, b) => a + b, 0);
  const collisionsPerYear = interpScalar(output.total_collisions_per_year, year);

  const debrisPenalty = Math.min(60, totalDebris / 1500);
  const collisionPenalty = Math.min(40, collisionsPerYear * 1.2);
  const score = Math.max(0, Math.min(100, 100 - debrisPenalty - collisionPenalty));

  return {
    year,
    calendarYear: BASE_CALENDAR_YEAR + Math.round(year),
    totalObjects,
    totalDebris,
    collisionsPerYear,
    sustainabilityScore: Math.round(score),
    grade: scoreToGrade(score),
  };
}
