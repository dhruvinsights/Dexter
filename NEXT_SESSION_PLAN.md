# Dexter — Next Session Execution Plan

Context: previous session ended at ~96% budget. Current app state: Live Sky mode
works with real CelesTrak data (15,699 objects, public/tle/TLE.txt, fetched via
`npm run fetch-tle` / scripts/fetch-celestrak.ts), SGP4 worker, Time Machine,
click-to-select satellites (basic), color schemes, AI agent panel stub already
exist per src/App.tsx. typecheck/commit/push were NOT done — do that first.

## Phase 0 — close out prior session (do first, cheap)
1. `npx tsc -b` — fix any errors (liveSky.worker.ts SatEntry.name field, etc.)
2. Playwright smoke test: Scenario mode, Live Sky mode, Time Machine, click-select
3. `git add -A && git commit` (proper message) and push to `main` per user's request

## Phase 1 — clone agentic AI branch
- Source: https://github.com/dhruvinsights/Dexter/tree/agentic_orbital_pred
- `git fetch origin agentic_orbital_pred` then inspect file tree (don't blind-merge —
  this repo's structure has since diverged, e.g. plugins/ vs src/ vs reference-project-code/)
- Map its agent code (policy sandbox, year/cost/risk assessment, prediction model,
  LLM integration) into our `src/` structure — likely new `src/features/ai/` and
  `src/integration/agent/` modules
- Reconcile with existing `src/features/ai/AIAgentPanel.tsx` stub

## Phase 2 — sidebar-driven feature shell (UI restructure)
- Add a persistent left icon sidebar (KeepTrack-style bottom/side menu) — click an
  icon → a feature panel slides in (not all panels stacked at once)
- Candidates for sidebar entries: Live Sky, Scenario, Time Machine, Policy Sandbox,
  AI Agent / Knowledge Base, Forecasting, Settings (data sources/keys)
- Keep B&W aesthetic; this is purely a layout/IA change around existing panels

## Phase 3 — 3D / interaction features ported from KeepTrack (reference-project-code/)
Read reference-project-code/src for inspiration on each, then reimplement in R3F:
- Click satellite → camera zoom/fly-to + load real 3D model from public/meshes/
  (hubble/iridium/soyuz/tiangong/rocketbody/cubesats) at its propagated position
- Debris field around a selected object (nearby objects within some radius/orbit band)
- Sound effects on select/zoom (check reference-project-code for existing sfx assets)
- Earth click → lat/lon picker → "objects over this region" filter (ground-track
  based, using satellite.js eciToGeodetic)
- New satellite option: let user paste a custom TLE and track it alongside the catalog

## Phase 4 — Forecasting / Prediction page
- New route/sidebar panel: cost, risk, year-by-year projection UI
- Wire to the agentic prediction model from Phase 1's ported code
- Policy sandbox: user adjusts intervention params → see projected outcome (reuses
  existing Scenario/MOCAT mock pipeline in src/integration/, eventually backed by agent)

## Phase 5 — AI Agent backend correctness
- Ensure CelesTrak live data (public/tle/TLE.txt + any derived metrics) is what's
  actually passed to the LLM context — not stale mocks
- RAG pipeline: ingestion + embeddings + retrieval; vector store = "DB2" per user
  (likely means a generic vector DB they're calling DB2 — clarify if ambiguous,
  but build a config form regardless: host, port, database name, SSL/TLS, credentials)
- Model provider settings UI:
  - Local: Ollama (detect local Ollama at localhost:11434, or "electron version"
    per user — check if they mean a packaged local app), list local models for
    chat + embeddings
  - Remote: OpenAI and other API-key providers, stored via settings UI
- Knowledge base UI: show ingested documents/chunks, allow user upload (files →
  embed → store in configured vector DB)

## Open questions to ask user early next session (don't guess silently)
- "DB2" — do they mean IBM Db2, or a generic name for "the second database"
  (i.e. just a vector DB)? Confirm before building a Db2-specific driver.
- "Ollama electron version or local site from code" — clarify what local
  Ollama packaging they're referring to (electron app vs `ollama serve`)
