# 01 — System Architecture

> How the whole platform fits together, and where this repository (frontend / simulator) sits.

---

## The Full Platform (all teams)

```
        ┌──────────────────────────────────────────────────────────────┐
        │                      BACKEND  (teammates)                      │
        │                                                                │
        │  CelesTrak TLE                                                 │
        │       │  WS1: Data Layer                                       │
        │       ▼                                                        │
        │  Orbital State Builder ──► OrbitalStateSnapshot                │
        │       │     (real objects binned into altitude shells)         │
        │       ▼                                                        │
        │  MOCAT Simulation (WS2) ──► RawMOCATOutput                     │
        │       │     (population per shell per year, per policy)         │
        │       ▼                                                        │
        │  Metrics Engine (WS3) ──► ScenarioMetrics + SustainabilityScore│
        │       │                                                        │
        │       ▼                                                        │
        │  FastAPI (WS4)  ◄──────────── single integration surface       │
        │       │            │                                           │
        │       ▼            ▼                                           │
        │  AI Analyst (WS5)  Reports (WS7)                               │
        └───────┬────────────────────────────────────────────────────────┘
                │   HTTP / JSON  +  SSE (AI streaming)
                │   ↕ the DATA CONTRACT (see 03_DATA_CONTRACTS.md)
        ┌───────┴────────────────────────────────────────────────────────┐
        │                  THIS REPO  (frontend / simulator)              │
        │                                                                 │
        │  ┌──────────────────────────────────────────────────────────┐  │
        │  │  Integration Layer  (api client + providers)              │  │
        │  │   • LiveSkyProvider    — CelesTrak TLE → SGP4 positions   │  │
        │  │   • ScenarioProvider   — /scenarios + /metrics → timeline │  │
        │  │   • AiAnalystClient    — /ai/* (SSE stream)               │  │
        │  └──────────────────────────────────────────────────────────┘  │
        │                       │ produces                                │
        │                       ▼                                         │
        │  ┌──────────────────────────────────────────────────────────┐  │
        │  │  Scene State  (one common model both modes render)        │  │
        │  └──────────────────────────────────────────────────────────┘  │
        │                       │ consumed by                             │
        │                       ▼                                         │
        │  ┌──────────────────────────────────────────────────────────┐  │
        │  │  Visualization Engine  (React Three Fiber)                │  │
        │  │   Earth · skybox · object field · orbits · risk overlays  │  │
        │  └──────────────────────────────────────────────────────────┘  │
        │                       │ wrapped by                              │
        │                       ▼                                         │
        │  ┌──────────────────────────────────────────────────────────┐  │
        │  │  Product UI  (React + Tailwind, B&W)                      │  │
        │  │   policy controls · timeline · compare · metrics · AI     │  │
        │  └──────────────────────────────────────────────────────────┘  │
        └─────────────────────────────────────────────────────────────────┘
```

## The Decision: Native Renderer, Not the reference project Embed

The original WS6 plan ([reference-project-code/plans/06_the reference project_FRONTEND.md](../reference-project-code/plans/06_the reference project_FRONTEND.md))
chose to run the reference project on a second port and embed it in an `<iframe>`, driving it over `postMessage`.

**We are superseding that decision.** We build the visualization natively in **React Three Fiber**
and reuse only the reference project's *art assets* (Earth/skybox textures, satellite models).

Why:

| iframe-embed the reference project (old plan) | Native R3F (this plan) |
|---|---|
| the reference project's tracking UI + errors leak through | We control every pixel; B&W, non-technical |
| `postMessage` bridge is fragile, async, untyped | Scene is bound directly to typed React state |
| Carries the reference project's whole heavy pipeline (catalog, workers, API-key failures) | We render only what we need |
| Can't faithfully render MOCAT shell-density data | Custom renderer designed for exactly this |
| Two build systems, two dev servers | One app, one build |

The full the reference project/Dexter codebase is preserved in [`reference-project-code/`](../reference-project-code/)
as a reference for rendering techniques and a source of assets — **not** as a runtime dependency.

## The Two Critical Boundaries

Everything in this architecture exists to protect two seams:

### 1. The Data Contract (backend ↔ frontend)
Backend is the single source of truth for data *shapes*. Frontend consumes typed mirrors of those
shapes. Neither side reaches into the other's internals. This lets us build the entire frontend today
against **mock data** that matches the contract, then swap to the live backend with near-zero changes.
See [03_DATA_CONTRACTS.md](03_DATA_CONTRACTS.md) and [06_INTEGRATION_AND_MOCKING.md](06_INTEGRATION_AND_MOCKING.md).

### 2. The Provider Abstraction (data source ↔ renderer)
The renderer never knows *where* object positions came from. It consumes **Scene State** — a flat list
of renderable objects with positions/types/states at the current time. Two providers implement the
same interface:

- **`LiveSkyProvider`** — real CelesTrak TLEs, propagated client-side with SGP4 (satellite.js/ootk),
  yielding true individual orbital motion. Used for the "what's up there now" view.
- **`ScenarioProvider`** — MOCAT shell-population time-series from the backend, expanded into a
  *representative particle field* whose density/risk animates across the simulated decades.

Adding a third data source later (a different sim engine, a recorded replay) means writing one more
provider — the renderer and UI are untouched. See [02_SIMULATOR_AND_VISUALIZATION.md](02_SIMULATOR_AND_VISUALIZATION.md).

## Technology Choices (and why)

| Concern | Choice | Rationale |
|---|---|---|
| App framework | **React 18 + TypeScript** | Team standard; typed contracts |
| Build tool | **Vite** | Fast, modern, simple worker/asset handling |
| 3D | **React Three Fiber + drei** | Declarative Three.js bound to React state |
| Styling | **Tailwind CSS** | B&W design system, fast iteration |
| State | **Zustand** | Tiny, works inside and outside the R3F render loop |
| Server state | **TanStack Query** | Caching/ret‑logic for backend calls |
| Orbital math | **satellite.js** (or ootk) | SGP4 for Live Sky mode only |
| Charts | **Recharts** (or visx) | Metrics panels supporting the 3D story |
| Validation | **Zod** | Runtime-validate backend payloads at the boundary |

## Repository Shape (top level)

```
Dexter/                      ← repo root (this project)
├── plans/                   ← these documents
├── reference-project-code/  ← original the reference project/Dexter (assets + reference only)
├── public/                  ← assets copied from reference (Earth, skybox, models)
├── src/                     ← the new application (see 04_FRONTEND_ARCHITECTURE.md)
├── index.html
├── package.json
└── vite.config.ts
```
