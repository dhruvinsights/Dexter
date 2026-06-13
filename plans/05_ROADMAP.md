# 05 — Roadmap

> Phased by **capability**, not calendar. This is a real product, so each phase ends at something
> demonstrable and stable, and nothing later depends on the live backend existing yet.

Legend: 🎯 milestone (demoable) · 🔌 depends on backend · ⭐ highest user-visible impact

---

## Phase 0 — Foundation
*Goal: a running R3F app with the architecture's skeleton in place.*

- [ ] Scaffold Vite + React + TS + Tailwind.
- [ ] Install R3F, drei, zustand, zod, satellite.js, TanStack Query.
- [ ] Copy reusable assets from `reference-project-code/public/` → `public/`
      (Earth textures, `skybox1k-gray.jpg`, a handful of `.obj` models).
- [ ] Create the folder skeleton from [04_FRONTEND_ARCHITECTURE.md](04_FRONTEND_ARCHITECTURE.md).
- [ ] Define `SceneState` / `RenderObject` / provider interfaces ([02](02_SIMULATOR_AND_VISUALIZATION.md),
      [03](03_DATA_CONTRACTS.md)).
- 🎯 **App boots to a black screen with a rotating textured Earth + grayscale starfield + orbit camera.**

## Phase 1 — Core Scene ⭐
*Goal: prove the whole "render from simulation data" loop against mocks.*

- [ ] `ObjectField` — `THREE.Points` + custom shader, fed from a flat position buffer.
- [ ] Render a static **mock `SceneState`** (a few thousand points around Earth).
- [ ] Mock `RawMOCATOutput` JSON (matching the real contract) for 4 scenarios.
- [ ] `ScenarioProvider` + `particleField` — expand shell counts into a seeded representative field.
- [ ] Timeline scrubber (shared control) → scrubbing years grows/thins the field and shifts risk colour.
- [ ] Collision flash events from `collisions_per_shell`.
- 🎯 ⭐ **Pick a policy, scrub 30 years, and watch congestion + collisions evolve in 3D — fully offline.**

## Phase 2 — Product Shell (B&W) ⭐
*Goal: it looks and feels like the product, legible to a non-expert.*

- [ ] Explore layout: 3D fills viewport; docked policy picker, timeline, metrics strip.
- [ ] Black-and-white design system + shared primitives (Panel, Button, Slider, Stat, Legend).
- [ ] Policy/scenario picker wired to `useSimStore.loadScenario`.
- [ ] Metrics strip (debris, collisions/yr, sustainability grade) reading the same arrays the 3D uses.
- [ ] Plain-language legends + hover readouts; risk shown as words + colour.
- 🎯 ⭐ **A non-technical user can navigate it and understand what a policy does, no glossary.**

## Phase 3 — Comparison & Interaction
*Goal: the analytical payoff — see trade-offs.*

- [ ] Compare view: two scenarios side by side (split 3D or synced dual-canvas) on the same timeline.
- [ ] Click a shell band → highlight + that shell's metrics over time.
- [ ] Metrics charts (Recharts) — collisions over time, debris by shell, score comparison.
- [ ] Camera focus presets (full globe, LEO shells, a chosen shell).
- 🎯 **Baseline vs Hybrid, side by side, with the divergence visible and explained.**

## Phase 4 — Live Backend Integration 🔌
*Goal: replace mocks with the real platform.*

- [ ] `apiClient` + Zod-validated endpoint modules ([03](03_DATA_CONTRACTS.md)).
- [ ] Flip `VITE_USE_MOCKS=false`; load real `ScenarioConfig[]` + `RawMOCATOutput`.
- [ ] Wire real metrics/score/comparison (after WS3 shapes finalize).
- [ ] `/status` driven readiness UI; graceful offline fallback to last-good/mock.
- 🎯 🔌 **Same UI, now driven by real CelesTrak-seeded MOCAT runs.**

## Phase 5 — Live Sky Mode 🔌
*Goal: the "real sky right now" contextual view.*

- [ ] Source per-object elements (backend TLE endpoint or CelesTrak direct — open question in [03](03_DATA_CONTRACTS.md)).
- [ ] `LiveSkyProvider` + `propagate.worker` (SGP4 off-thread, position buffers back).
- [ ] Mode toggle Live ↔ Scenario sharing the same renderer + timeline.
- [ ] Selected-object focus: `.obj` model + true orbit line.
- 🎯 🔌 **Toggle to a live, moving, real-object sky; toggle back to projected futures.**

## Phase 6 — AI Analyst & Reports 🔌
*Goal: explanation and export.*

- [ ] Docked AI analyst panel; SSE streaming from `/api/ai/stream/{scenario_id}`.
- [ ] Context-aware prompts (current scenario + visible metrics).
- [ ] Report export (`/api/reports/generate`) — scenario summary + screenshots.
- 🎯 🔌 **Ask "why is ADR better here?" and get a grounded, streamed explanation; export a brief.**

## Phase 7 — Polish & Credibility
*Goal: stakeholder-ready.*

- [ ] Performance pass (60fps @ 30k points; detail-K auto-tune).
- [ ] Onboarding / guided first-run; empty + error states.
- [ ] Accessibility, responsive down to laptop; optional Electron desktop build.
- [ ] Fidelity audit: every visible quantity traces to a real model output.
- 🎯 **Demoable to an actual space-sustainability stakeholder.**

---

## Critical Path & Parallelism

```
Phase 0 ─► Phase 1 ─► Phase 2 ─► Phase 3 ──┐
                                            ├─► (mocks → live)
Backend team: WS1·WS2·WS4 ──────────────────┘ Phase 4 ─► Phase 5/6
```

Phases 0–3 have **zero backend dependency** — built entirely against mocks that match the contract.
That's the whole point of the contract+provider design: your side ships and demos before the backend
is ready, then Phase 4 is a config flip, not a rewrite.

## Definition of Done (per phase)
- Demoable without backend (0–3) / against live API (4+).
- No regressions in the Explore core loop.
- Types + Zod schemas current with [03_DATA_CONTRACTS.md](03_DATA_CONTRACTS.md).
- Fidelity preserved: nothing rendered that the model didn't produce.
