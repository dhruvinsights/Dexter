/**
 * TypeScript mirror of the backend's data contract.
 * Field names are snake_case to match the FastAPI / Pydantic models exactly.
 * See plans/03_DATA_CONTRACTS.md.
 */

export type InterventionType =
  | 'baseline'
  | 'adr'
  | 'launch_cap'
  | 'ai_traffic_mgmt'
  | 'hybrid';

export interface ScenarioConfig {
  scenario_id: string;
  name: string;
  intervention: InterventionType;
  simulation_years: number;
  annual_launch_rate: number;
  adr_rate: number;
  adr_target_shells: number[] | null;
  launch_rate_multiplier: number;
  collision_avoidance_efficiency: number;
}

export interface RawMOCATOutput {
  scenario_id: string;
  simulation_years: number;
  shells: string[]; // labels, low → high altitude, e.g. "500-600km"
  timesteps: number[]; // [0 .. simulation_years]
  payloads_per_shell: number[][]; // [year][shell]
  debris_per_shell: number[][]; // [year][shell]
  rocket_bodies_per_shell: number[][]; // [year][shell]
  collisions_per_shell: number[][]; // [year][shell]
  total_objects_per_year: number[]; // [year]
  total_collisions_per_year: number[]; // [year]
  ran_at: string;
  runtime_seconds: number;
}

/** Parse an altitude band label like "500-600km" → { min, max } in km. */
export function parseShellLabel(label: string): { minKm: number; maxKm: number } {
  const m = label.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return { minKm: 0, maxKm: 0 };
  return { minKm: Number(m[1]), maxKm: Number(m[2]) };
}
