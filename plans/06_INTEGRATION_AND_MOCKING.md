# 06 — Integration & Mocking Strategy

> How we build the entire frontend *now*, before the backend exists, and swap to the real API later
> with a config flip instead of a rewrite. This is the practical payoff of the contract + provider design.

---

## The Core Idea

Every backend interaction goes through a small **endpoint module** that returns a typed, Zod-validated
contract object. Each endpoint module has **two implementations behind one interface**:

```
features / providers
        │  call endpoints.scenarios.getResult(id)
        ▼
   endpoint module  ──┬── live impl  → apiClient → FastAPI
                      └── mock impl  → local JSON (contract-valid)
        ▲
   switched by VITE_USE_MOCKS
```

Components and providers **never know** which implementation is active. Flip one env flag to go live.

```ts
// integration/endpoints/scenarios.ts
import { USE_MOCKS } from '../config';
import * as live from './scenarios.live';
import * as mock from './scenarios.mock';
export const scenarios = USE_MOCKS ? mock : live;
```

`VITE_USE_MOCKS=true` (default during Phases 0–3) → `VITE_USE_MOCKS=false` (Phase 4) → done.

---

## What the Mocks Must Be

Mocks are **not** throwaway stubs. They are **contract-faithful fixtures** that look like real output,
so the UI built against them is the UI that ships. Requirements:

1. **Exact shape** — pass the same Zod schema as the live response.
2. **Plausible numbers** — use the published-literature effects from
   [reference-project-code/plans/02_MOCAT_SIMULATION.md](../reference-project-code/plans/02_MOCAT_SIMULATION.md)
   (`mocat_mock.py` `INTERVENTION_EFFECTS`): baseline debris growth ~1.04/yr, ADR ~0.96, hybrid ~0.93,
   etc. So the 3D field grows under baseline and recovers under ADR — the demo tells the true story.
3. **All four canonical scenarios** — `baseline_2024`, `adr_aggressive_2024`, `launch_cap_2024`,
   `hybrid_2024` (matching the backend's `DEMO_SCENARIOS`).
4. **Realistic size** — ~11 shells × 31 years, real-ish object counts (thousands per congested shell),
   so performance work is honest.

### Generating mocks
A tiny script (`src/integration/mocks/generate.ts` or a `scripts/` node script) produces the four
`RawMOCATOutput` JSONs from the same `INTERVENTION_EFFECTS` constants the backend uses. This keeps the
mock and the real model conceptually aligned, and lets us regenerate if shell binning changes.

```
src/integration/mocks/
├── orbital-state.json            # OrbitalStateSnapshot (initial shells)
├── scenarios.json                # ScenarioConfig[]
├── results/
│   ├── baseline_2024.json        # RawMOCATOutput
│   ├── adr_aggressive_2024.json
│   ├── launch_cap_2024.json
│   └── hybrid_2024.json
├── metrics/                      # provisional until WS3 finalizes
└── generate.ts                   # produces the above from shared constants
```

---

## The Swap (Phase 4) — what actually changes

When the backend is up:

1. Set `VITE_API_BASE_URL` and `VITE_USE_MOCKS=false`.
2. Each `*.live.ts` endpoint is just `apiClient.get(...)` + the **same Zod parse** the mock used.
3. Renderer, providers, UI, state — **untouched**. They consumed `SceneState`, never raw API.

If the live response fails validation, the Zod error fires at the boundary with a precise message —
you instantly know whether it's a frontend assumption or a backend contract drift, not a mystery crash
three layers deep.

### Resilience
- `/status` gates features: show "Scenarios precomputing…" until `scenarios_ready`.
- On a failed live call, fall back to last-good cached response (or mock) and surface a quiet banner —
  never a blank 3D scene. (We learned this lesson from KeepTrack's hard splash-screen hang.)

---

## Working With the Backend Team

- **Own the contract doc** ([03_DATA_CONTRACTS.md](03_DATA_CONTRACTS.md)) as the shared truth; any field
  change is a PR to it + the Zod schemas, plus a ping to the endpoint owner.
- **Resolve the open questions early** (per [03](03_DATA_CONTRACTS.md)): per-object TLE source for Live
  Sky, final WS3 metric shapes, AI SSE format, custom-run polling.
- **Integration test:** a thin script hits the live API and runs each response through our Zod schemas.
  Green = contract honored on both sides. Run it whenever the backend deploys.

---

## Why This De-Risks Everything

- Frontend progress is **decoupled** from backend progress — Phases 0–3 ship on mocks.
- The first real-API connection is a **flag flip**, validated by schemas, not an integration scramble.
- A teammate's breaking change surfaces as a **loud, localized Zod error**, not silent UI corruption.
- New data sources (another sim engine, recorded replays) = one new provider + one new endpoint impl.

> This is the discipline that turns "I'm lost modifying a huge codebase" into "I own a clean layer that
> plugs into the rest of the platform." The boundary is the product.
