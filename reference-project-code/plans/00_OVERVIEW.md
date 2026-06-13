# Orbital Sentinel — Parallel Workstream Overview

## What We're Building

An AI-powered orbital sustainability decision-support platform that lets users compare orbital intervention strategies (ADR, Launch Caps, AI Traffic Management, Hybrid) using real MOCAT simulation data, KeepTrack visualization, and an LLM-based Orbital Sustainability Analyst.

---

## Parallel Workstreams

| # | File | Workstream | Owner Slot | Depends On |
|---|------|-----------|------------|------------|
| 1 | `01_DATA_LAYER.md` | CelesTrak TLE ingestion & Orbital State Builder | Person A | — |
| 2 | `02_MOCAT_SIMULATION.md` | MOCAT integration + Scenario precomputation | Person B | WS1 (initial state) |
| 3 | `03_METRICS_SCORING.md` | Metrics Extraction Engine + Sustainability Score | Person C | WS2 (outputs) |
| 4 | `04_FASTAPI_BACKEND.md` | FastAPI server, all endpoints, data contracts | Person D | WS3 (metrics schema) |
| 5 | `05_AI_AGENT.md` | IBM Granite / LLM Analyst Agent Service | Person E | WS4 (API contract) |
| 6 | `06_KEEPTRACK_FRONTEND.md` | KeepTrack UI customization + Orbital Sentinel shell | Person F | WS4 (API contract) |
| 7 | `07_REPORT_GENERATION.md` | PDF report, executive summary, policy brief export | Person G | WS5+WS6 |

---

## Architecture at a Glance

```
CelesTrak TLE
     │ WS1
     ▼
Orbital State Builder
     │
     ▼
MIT MOCAT Simulation ──── WS2
     │
     ▼
Metrics Engine ──────────── WS3
     │
     ▼
Sustainability Score
     │
     ▼
FastAPI Backend ─────────── WS4
     │         │
     ▼         ▼
AI Analyst   KeepTrack UI ── WS5 / WS6
     │         │
     └────┬────┘
          ▼
   Report Generator ─────── WS7
```

---

## Tech Stack Reference

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, TailwindCSS, ShadCN UI, Recharts, Zustand |
| Orbital Renderer | KeepTrack (cloned, customized) |
| Backend | Python 3.11, FastAPI, Pydantic v2 |
| Simulation | MIT MOCAT (Python) |
| AI | IBM watsonx / Granite-13b-instruct |
| Data | CelesTrak TLE REST API |
| Hosting | Railway (backend) + Electron (desktop) |
| Docs | Per-workstream .md files in `/plans/` |

---

## Communication Contract Between Workstreams

All workstreams communicate through the FastAPI contract defined in `04_FASTAPI_BACKEND.md`.

The backend is the **single source of truth** for all data shapes. Frontend and AI workstreams consume it. Metrics and MOCAT workstreams produce to it.

Use the shared types in `src/types/` (frontend) and `app/models/` (backend) — do not invent your own shapes.

---

## Daily Sync Checkpoints

| Checkpoint | When | What to share |
|---|---|---|
| Kickoff | Day 1 09:00 | Confirm ownership, read your workstream doc |
| Midday sync | Day 1–2 13:00 | Blockers, schema changes |
| Integration point | Day 3 10:00 | Backend API up, all workstreams connect |
| Demo dry-run | Day 3 18:00 | End-to-end run with real data |

---

## Definition of Done (Each Workstream)

- [ ] Core functionality implemented and manually tested
- [ ] Integrated with adjacent workstreams via API contract
- [ ] No hardcoded secrets or local file paths
- [ ] README section updated in this folder
- [ ] Tested on the shared demo scenario: **Baseline vs Hybrid Strategy**
