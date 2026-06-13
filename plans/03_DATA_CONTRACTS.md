# 03 — Data Contracts

> The typed boundary between this frontend and the backend team's API.
> These TypeScript types **mirror** the backend's Pydantic models. The backend is the source of truth
> for shapes; we validate at the boundary with Zod and never let raw payloads leak inward.

Backend reference: [reference-project-code/plans/04_FASTAPI_BACKEND.md](../reference-project-code/plans/04_FASTAPI_BACKEND.md)
(endpoint map), [01_DATA_LAYER.md](../reference-project-code/plans/01_DATA_LAYER.md) and
[02_MOCAT_SIMULATION.md](../reference-project-code/plans/02_MOCAT_SIMULATION.md) (model shapes).

---

## Endpoint Map (what we consume)

```
GET  /health                              → { status }
GET  /status                              → SystemStatus
GET  /api/data/orbital-state              → OrbitalStateSnapshot
GET  /api/data/catalogue/stats            → CatalogueStats
GET  /api/scenarios/                       → ScenarioConfig[]
GET  /api/scenarios/{id}/result            → RawMOCATOutput
POST /api/scenarios/run                     → { run_id, status }
GET  /api/scenarios/run/{run_id}/status     → SimulationRunStatus
GET  /api/metrics/{scenario_id}            → ScenarioMetrics
GET  /api/metrics/{scenario_id}/score      → SustainabilityScore
GET  /api/metrics/compare/all              → ComparisonResult
POST /api/ai/analyze                        → AiAnalysis
POST /api/ai/recommend                      → AiRecommendation
GET  /api/ai/stream/{scenario_id}          → SSE text stream
POST /api/reports/generate                  → { report_id }
GET  /api/reports/{report_id}/download      → PDF (binary)
```

Base URL via `VITE_API_BASE_URL` (default `http://localhost:8000`).

---

## Core Types (TypeScript mirror)

These live in `src/integration/contracts/`. Keep field names **snake_case to match the API** at the
boundary; map to camelCase only inside the app if desired (a single adapter function).

```ts
// ---- System ----
export interface SystemStatus {
  api: 'ready' | string;
  tle_cache: 'ready' | 'missing';
  precomputed_scenarios: string[];
  scenarios_ready: boolean;
  timestamp: string;
}

// ---- Data layer (WS1) ----
export type ObjectType = 'PAYLOAD' | 'ROCKET BODY' | 'DEBRIS' | 'UNKNOWN';

export interface OrbitalShellBin {
  shell_label: string;        // "500-600km"
  altitude_min_km: number;
  altitude_max_km: number;
  payload_count: number;
  debris_count: number;
  rocket_body_count: number;
  total_objects: number;
}

export interface OrbitalStateSnapshot {
  snapshot_id: string;
  epoch: string;
  shells: OrbitalShellBin[];
  total_payloads: number;
  total_debris: number;
  total_rocket_bodies: number;
  source: string;             // "CelesTrak"
}

export interface CatalogueStats {
  total_objects: number;
  fetched_at: string;
  breakdown: Record<ObjectType, number>;
}

// ---- Simulation (WS2) ----
export type InterventionType =
  | 'baseline' | 'adr' | 'launch_cap' | 'ai_traffic_mgmt' | 'hybrid';

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
  shells: string[];                       // shell labels, low→high altitude
  timesteps: number[];                    // [0..simulation_years]
  payloads_per_shell: number[][];         // [year][shell]
  debris_per_shell: number[][];           // [year][shell]
  rocket_bodies_per_shell: number[][];    // [year][shell]
  collisions_per_shell: number[][];       // [year][shell]
  total_objects_per_year: number[];       // [year]
  total_collisions_per_year: number[];    // [year]
  ran_at: string;
  runtime_seconds: number;
}

export interface SimulationRunStatus {
  run_id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  progress?: number;          // 0..1 if available
  scenario_id?: string;
}

// ---- Metrics (WS3) — shapes TBD with Person C; placeholder until confirmed ----
export interface ScenarioMetrics {
  scenario_id: string;
  survivability_pct: number;
  // ...confirm exact fields with WS3 before relying on them
  [k: string]: unknown;
}

export interface SustainabilityScore {
  scenario_id: string;
  total_score: number;        // 0..100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  // ...confirm sub-scores with WS3
  [k: string]: unknown;
}

export interface ComparisonResult {
  ranked: string[];           // scenario_ids best→worst
  winner: string;
  // ...confirm with WS3
  [k: string]: unknown;
}

// ---- AI (WS5) ----
export interface AiAnalysis { scenario_id: string; text: string; }
export interface AiRecommendation { recommendation: string; rationale: string; }
```

> ⚠️ **WS3 metrics/score/comparison shapes are not final.** Treat them as provisional until Person C
> confirms. Everything we *render in 3D* depends only on WS1 (`OrbitalStateSnapshot`) and WS2
> (`RawMOCATOutput`), which **are** specified — so the visualization is not blocked on WS3.

---

## Provider Interfaces (internal — renderer-facing)

The renderer never touches the contract types above directly. Providers translate
contract → `SceneState` (defined in [02_SIMULATOR_AND_VISUALIZATION.md](02_SIMULATOR_AND_VISUALIZATION.md)).

```ts
export interface SceneProvider {
  readonly mode: 'live' | 'scenario';
  /** Called when the user changes time (year for scenario, clock for live). */
  getSceneStateAt(time: SceneTime): SceneState;
  /** Total extent of the timeline, for the scrubber. */
  getTimeBounds(): { start: SceneTime; end: SceneTime };
  /** Optional async warm-up (fetch + precompute particle layout). */
  init(): Promise<void>;
  dispose(): void;
}

// Live: wraps SGP4 propagation of real elements
class LiveSkyProvider implements SceneProvider { /* mode = 'live' */ }

// Scenario: wraps RawMOCATOutput → representative particle field
class ScenarioProvider implements SceneProvider {
  constructor(output: RawMOCATOutput, snapshot?: OrbitalStateSnapshot) {}
  /* mode = 'scenario' */
}
```

This is the seam that lets us add new data sources (another sim engine, a recorded replay) by writing
one class, with zero renderer/UI changes.

---

## Boundary Discipline (rules)

1. **Validate on entry.** Every backend response is parsed through a Zod schema matching the type
   above. A malformed payload fails loudly at the edge, never deep in the renderer.
2. **Mock first.** Each endpoint has a mock implementation returning contract-valid data
   (see [06_INTEGRATION_AND_MOCKING.md](06_INTEGRATION_AND_MOCKING.md)). A single flag
   (`VITE_USE_MOCKS`) switches mock ↔ live.
3. **One client.** All HTTP goes through `src/integration/apiClient.ts` (base URL, interceptors,
   error normalization). No `fetch` scattered in components.
4. **Contracts are versioned with the team.** Any field change is a contract change — update this doc
   and the Zod schemas in the same PR, and ping the backend owner.

---

## Open Questions for the Backend Team

- [ ] **Per-object positions for Live Sky:** does the backend expose raw TLEs/GP elements, or only the
      shell-binned `OrbitalStateSnapshot`? Live mode needs per-object elements. If not exposed, the
      frontend fetches CelesTrak directly. **(Owner: WS1)**
- [ ] **Final `ScenarioMetrics` / `SustainabilityScore` / `ComparisonResult` shapes.** **(Owner: WS3)**
- [ ] **AI streaming:** confirm SSE event format for `/api/ai/stream/{scenario_id}`. **(Owner: WS5)**
- [ ] **Custom scenario runs:** is `POST /api/scenarios/run` available for live (non-precomputed)
      policy params, and what's the typical runtime/poll cadence? **(Owner: WS2/WS4)**
