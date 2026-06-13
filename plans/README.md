# Orbital Sentinel — Frontend / Simulator Plans

This folder is the planning set for the **simulator front-end, visualization, and integration layer**
of Orbital Sentinel — an orbital sustainability simulation & decision-support platform.

> This is a **real, long-term product**, not a hackathon throwaway. Plans are phased by capability.

## Read in order

| # | Doc | What it covers |
|---|-----|----------------|
| 00 | [Product Vision](00_PRODUCT_VISION.md) | Why this exists, who it's for, what success means, what it is *not* |
| 01 | [System Architecture](01_SYSTEM_ARCHITECTURE.md) | The whole platform + where this repo sits; native R3F supersedes the iframe plan |
| 02 | [Simulator & Visualization](02_SIMULATOR_AND_VISUALIZATION.md) | **Core doc.** Two render modes; the MOCAT representative-particle bridge; rendering strategy |
| 03 | [Data Contracts](03_DATA_CONTRACTS.md) | Typed boundary to the backend; provider interfaces; open questions |
| 04 | [Frontend Architecture](04_FRONTEND_ARCHITECTURE.md) | Folders, Zustand state, routing, the black-and-white design system |
| 05 | [Roadmap](05_ROADMAP.md) | Phase 0→7, by capability; Phases 0–3 need no backend |
| 06 | [Integration & Mocking](06_INTEGRATION_AND_MOCKING.md) | Build on mocks now, flip to live API later |

## The three ideas that matter most

1. **Reuse the art, rebuild the engine.** KeepTrack's Earth/skybox textures and satellite models are
   assets we keep; its WebGL renderer and tracking UI are not our foundation. The original codebase is
   preserved in [`../reference-project-code/`](../reference-project-code/) for reference only.

2. **MOCAT gives population-per-shell-per-year, not trajectories.** So Scenario mode renders evolving
   *density and risk* via representative particles — never faked individual orbits. Live Sky mode (real
   TLEs + SGP4) is the separate "real objects right now" view. ([02](02_SIMULATOR_AND_VISUALIZATION.md))

3. **Two boundaries protect everything:** the *data contract* (backend ↔ frontend) and the *provider
   abstraction* (data source ↔ renderer). Together they let this frontend be built and demoed entirely
   on mocks, then connected to the live platform with a config flip.

## Status

Planning complete. Next: **Phase 0 — scaffold the Vite + React + R3F app** and copy reusable assets
from `reference-project-code/public/`. See [05_ROADMAP.md](05_ROADMAP.md).
