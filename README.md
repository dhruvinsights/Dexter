# Dexter — Orbital Sustainability Platform

Dexter is a real-time 3D space situational awareness and orbital sustainability
platform. It propagates the live public catalogue of ~16,000 tracked space
objects with real SGP4 physics, lets you scrub time across the whole sky,
create and track your own satellites, run policy/forecast scenarios, and query
an AI agent (with a retrieval-augmented knowledge base) about collision risk,
debris growth, and long-term orbital sustainability.

The stack is two parts:

- **Frontend** — a React + React Three Fiber single-page app (the 3D globe,
  HUD, panels, and simulation UI).
- **Backend** — a FastAPI service hosting the AI agents, embeddings/RAG
  pipeline, and a configurable vector database.

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick start](#quick-start)
5. [Frontend setup & run](#frontend-setup--run)
6. [Fetching real orbital data](#fetching-real-orbital-data)
7. [Backend setup & run (AI agents + physics)](#backend-setup--run-ai-agents--physics)
8. [Configuration reference](#configuration-reference)
   - [Vector database](#vector-database)
   - [Local models (Ollama)](#local-models-ollama)
   - [Remote models (OpenAI / compatible)](#remote-models-openai--compatible)
9. [Project structure](#project-structure)
10. [npm / scripts reference](#npm--scripts-reference)
11. [Troubleshooting](#troubleshooting)

---

## Features

### Live Sky (real catalogue, real physics)
- **Real GP/TLE catalogue** from CelesTrak (USSF 18th SDS data), ~16k objects.
- **SGP4 propagation in a Web Worker** — every object is propagated off the main
  thread for a smooth 60 fps globe.
- **Boot loader** — the app downloads, parses, and propagates the first epoch
  before revealing a populated sky (no empty globe on refresh).
- **Country-coloured dots** from the CelesTrak **SATCAT** (owner + object type):
  payload / rocket body / debris, or colour-by-country.
- **Click to select** any object → camera **flies to** it, loads a **real 3D
  model** (mesh chosen by object class), and draws its **true SGP4 orbit path**.
- **Draggable satellite readout** with the real **flag + country**, live
  latitude/longitude/altitude/velocity, and full orbital elements (apogee,
  perigee, inclination, eccentricity, RAAN, argument of perigee, period, SMA).

### Realistic 3D scene
- Day/night Earth with a **real Sun position** driving the terminator and night
  city-lights, a drifting **cloud** shell, and an **atmospheric rim glow**.
- Dimmed Milky Way panorama plus a crisp, temperature-tinted **starfield**.

### Time control
- **Date / Time picker** — a calendar (with day-of-year) plus hour/minute/second
  and propagation-rate controls. Set the clock to any instant; the catalogue
  re-propagates forward or backward in time.
- **Time Machine** — sweep through launch history, revealing objects as they
  reached orbit.

### Create your own satellites
- **BASIC** — name, NORAD ID, inclination, apogee, perigee.
- **ADVANCED** — full element set (epoch, RAAN, eccentricity, argument of
  perigee, mean anomaly, mean motion) with live **calculated parameters**
  (apogee/perigee/SMA/period/velocity).
- **TLE IMPORT** — paste a raw two-line element set.
- Every created object generates a valid checksummed TLE and is rendered in the
  3D scene at its real orbit — immediately clickable and zoomable.

### Scenario & forecasting
- **Scenario mode** — a representative debris-evolution simulation visualised as
  an animated particle field with year-by-year metrics.
- **Forecasting / policy sandbox** — adjust active-debris-removal and
  launch-rate parameters and see projected object count, collision risk, cost,
  and a sustainability grade.

### AI agent & knowledge base
- **AI Agent** panel — talks to the FastAPI backend with **SSE streaming**, a
  live health indicator, and structured analyses (risk assessment,
  sustainability, executive summary). Degrades gracefully to offline guidance
  when the backend isn't running.
- **Knowledge Base** — upload documents to embed into the vector store for
  retrieval-augmented answers.
- **Settings** — configure the AI endpoint, model provider (local Ollama /
  remote OpenAI-compatible), and the vector database connection.

### UX
- Persistent left **icon rail** that opens one slide-in feature panel at a time.
- Collapsible **Display** drawer (colour scheme, orbit paths, time-warp).
- Phosphor-green HUD aesthetic with subtle audio cues (mutable).

---

## Architecture

```
┌──────────────────────────────┐        ┌─────────────────────────────┐
│  Frontend (Vite + React)     │        │  Backend (FastAPI, Python)  │
│                              │        │                             │
│  • React Three Fiber scene   │  HTTP  │  • /api/ai/analyze (+ SSE)  │
│  • SGP4 Web Worker           │ ─────► │  • AI agents (risk, policy, │
│  • Zustand state             │  JSON  │    sustainability, summary) │
│  • Panels / HUD              │        │  • Embeddings + RAG         │
│                              │ ◄───── │  • Vector DB (configurable) │
│  public/tle/TLE.txt (GP)     │        │  • Physics engine           │
│  public/satcat.json (owners) │        │                             │
└──────────────────────────────┘        └─────────────────────────────┘
        ▲                                          ▲
        │ CelesTrak GP API                         │ CelesTrak / catalogue
        └──────────────────────────────────────────┘
```

- **Frontend** never requires the backend to run — Live Sky, Create Satellite,
  Time, Scenario, and Forecasting all work standalone against local data. The
  backend adds the AI agent, RAG, and richer analysis.
- **Coordinates**: ECI kilometres from SGP4 are scaled so Earth radius = 1 scene
  unit; the worker maps TEME `(x, y, z)` → scene `(x, z, -y)`.

---

## Prerequisites

- **Node.js** ≥ 18 and **npm**
- **Python** ≥ 3.10 (only for the AI backend)
- Internet access to fetch the orbital catalogue (one-time, scriptable)
- Optional: **Ollama** for local models, or an **OpenAI-compatible** API key
- Optional: a **vector database** (e.g. Qdrant, pgvector, Milvus, Chroma, or
  IBM Db2) for the knowledge base / RAG

---

## Quick start

```bash
# 1. Install frontend deps
npm install

# 2. Fetch the real orbital catalogue + owner metadata
npm run fetch-tle        # → public/tle/TLE.txt   (GP/TLE data)
npm run fetch-satcat     # → public/satcat.json   (owners + object types)

# 3. Run the app
npm run dev              # http://localhost:5173
```

The AI agent is optional — see [Backend setup](#backend-setup--run-ai-agents--physics).

---

## Frontend setup & run

```bash
npm install          # install dependencies
npm run dev          # start the Vite dev server (http://localhost:5173)
npm run build        # type-check (tsc -b) + production build → dist/
npm run preview      # preview the production build
npm run typecheck    # type-check only
```

The app defaults to **Live Sky** mode. On first load it shows a boot loader
while the catalogue downloads, parses, and propagates. Open the browser console
to see boot diagnostics:

```
[boot] downloading GP catalogue (/tle/TLE.txt)…
[boot] catalogue downloaded (2.6 MB) — parsing
[boot] catalogue parsed: 15699 objects — propagating first epoch (SGP4)
[boot] first positions propagated — live sky ready
[satcat] loaded 69352 catalogue records
[livefield] painted 15699 dots · scheme=objectType
[livefield] selected #25544 "ISS (ZARYA)" idx=… owner=US 🇺🇸 United States
```

---

## Fetching real orbital data

Two datasets power Live Sky. Both are produced by scripts and written into
`public/` so the app can serve them statically.

| Script | Output | What it is |
| --- | --- | --- |
| `npm run fetch-tle` | `public/tle/TLE.txt` | CelesTrak GP (General Perturbations) element sets — the propagated catalogue. |
| `npm run fetch-satcat` | `public/satcat.json` | CelesTrak SATCAT → compact `{ norad: [owner, type] }` map for flags, country colouring, and object class. |

```bash
# GP/TLE data — defaults to the "active" group; pass a group to change it
npm run fetch-tle
npx tsx scripts/fetch-celestrak.ts active     # ~11k operational payloads
# (the catalogue is also fetched live by the app if the file is absent)

# SATCAT owner/type metadata (~69k records → ~1.5 MB)
npm run fetch-satcat
```

> Re-run these periodically to refresh the catalogue. TLE accuracy degrades the
> further you propagate from each element set's epoch.

---

## Backend setup & run (AI agents + physics)

The backend lives in [`backend/`](backend/) and is a FastAPI service.

```bash
cd backend

# 1. Create a virtualenv and install dependencies
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Configure environment (see Configuration reference below)
cp .env.example .env
# …edit .env with your model provider + vector DB settings…

# 3. Run the API
uvicorn api.main:app --reload --port 8000
```

Once running:

- API root: `http://localhost:8000/` · interactive docs: `http://localhost:8000/docs`
- Point the frontend at it in the app's **Settings** panel (default
  `http://localhost:8000`), or via `VITE_AI_API_URL` at build time.

### AI endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/ai/analyze` | Run a structured analysis (risk / recommendation / sustainability / executive summary). |
| `GET` | `/api/ai/stream/{scenario_id}` | Stream analysis tokens (SSE) for the typewriter UI. |
| `GET` | `/api/ai/quick-summary/{scenario_id}` | One-shot executive summary. |
| `POST` | `/api/ai/compare` | Compare scenarios → policy recommendation. |
| `GET` | `/api/ai/health` | Health of LLM, embeddings, and database. |
| `GET` | `/api/ai/models` | Available models + analysis types. |

### Agents & physics

- **Agents** live in `backend/ai/agents/` — `risk_assessor`,
  `policy_recommender`, `sustainability_analyst`, `executive_summarizer`, and a
  `physics_engine`. They are orchestrated by `backend/ai/analyst.py`.
- **Embeddings / RAG** live in `backend/ai/embeddings/` (document processing +
  embedding client).
- See `backend/PHYSICS_ENGINE.md` and `backend/README_AI_AGENTS.md` for the
  deep dives.

---

## Configuration reference

Frontend runtime settings (AI endpoint, provider, vector DB) are editable in the
**Settings** panel and persisted to `localStorage`. Backend settings come from
`backend/.env`.

### Frontend env

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_AI_API_URL` | `http://localhost:8000` | AI backend base URL (also overridable at runtime in Settings). |

### Backend env (`backend/.env`)

```ini
# ── Model provider ──────────────────────────────
AI_PROVIDER=ollama          # ollama | openai
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=1024
AI_TOP_P=0.9

# ── Local models (Ollama) ───────────────────────
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=granite-code:8b
OLLAMA_EMBEDDING_MODEL=granite-embedding
OLLAMA_TIMEOUT=120

# ── Vector database ─────────────────────────────
DB2_HOST=localhost
DB2_PORT=50000
DB2_DATABASE=ORBITAL
DB2_USERNAME=your_username
DB2_PASSWORD=your_password

# ── App ─────────────────────────────────────────
LOG_LEVEL=INFO
ENVIRONMENT=development
```

### Vector database

The knowledge base / RAG pipeline stores document embeddings in a vector
database. The connection is **driver-agnostic** — configure it in the app's
**Settings → Vector Database** form (host, port, database/collection, SSL,
credentials) and on the backend via `.env`. Supported drivers include Qdrant,
pgvector, Milvus, Weaviate, Chroma, and IBM Db2.

If you use **IBM Db2** specifically:

```bash
cd backend
python config/setup_db2_schema.py        # create tables (uses config/db2_schema_enhanced.sql)
```

The schema and connection helper live in `backend/config/`.

### Local models (Ollama)

1. Install and start Ollama (or its packaged desktop app); both expose the same
   HTTP API at `http://localhost:11434`.
2. Pull a chat model and an embedding model, e.g.:
   ```bash
   ollama pull granite-code:8b
   ollama pull granite-embedding
   ```
3. Set `AI_PROVIDER=ollama` and the `OLLAMA_*` variables in `backend/.env`, or
   set the endpoint/model in the app's **Settings** panel.

### Remote models (OpenAI / compatible)

1. Set `AI_PROVIDER=openai` and provide your API key (and optional
   `OPENAI_BASE_URL` for a compatible endpoint) in `backend/.env`.
2. Or, in the app's **Settings → Model Provider → OpenAI**, paste the key and
   model name.

---

## Project structure

```
Dexter/
├─ src/
│  ├─ App.tsx                      # screen layout (globe + HUD + panels)
│  ├─ viz/                         # 3D scene
│  │  ├─ Scene.tsx                 # canvas root
│  │  ├─ Earth.tsx / sun.ts        # day/night Earth + real Sun
│  │  ├─ Skybox.tsx / Starfield.tsx
│  │  ├─ LiveField.tsx             # real catalogue point field (SGP4)
│  │  ├─ CustomSatField.tsx        # user-created satellites
│  │  ├─ SelectedOrbit.tsx         # true orbit of the selected object
│  │  ├─ EnhancedSatelliteModel.tsx# 3D model on selection
│  │  └─ EnhancedCameraControls.tsx# fly-to / zoom
│  ├─ features/
│  │  ├─ shell/                    # Sidebar, PanelHost, LoadingOverlay, drawers
│  │  ├─ live/                     # readout, Create Satellite, Date/Time picker
│  │  ├─ forecast/                 # forecasting + policy sandbox
│  │  ├─ ai/                       # AI agent panel
│  │  ├─ knowledge/                # knowledge base UI
│  │  └─ settings/                 # AI / model / vector DB settings
│  ├─ sim/liveSky.worker.ts        # SGP4 propagation worker
│  ├─ lib/                         # orbital math, SATCAT loader, owners, sound
│  ├─ state/                       # Zustand stores
│  └─ integration/                 # data contracts, mocks, AI client
├─ scripts/
│  ├─ fetch-celestrak.ts           # GP/TLE catalogue → public/tle/TLE.txt
│  └─ fetch-satcat.ts              # SATCAT owners/types → public/satcat.json
├─ public/
│  ├─ tle/TLE.txt                  # orbital catalogue (generated)
│  ├─ satcat.json                  # owner/type map (generated)
│  ├─ meshes/  textures/  audio/   # 3D assets
├─ backend/                        # FastAPI AI service (Python)
│  ├─ api/main.py                  # app entry (uvicorn api.main:app)
│  ├─ api/routers/ai.py            # AI endpoints
│  ├─ ai/                          # agents, embeddings, analyst, models
│  └─ config/                      # vector DB connection + schema
└─ index.html
```

---

## npm / scripts reference

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Type-check + production build to `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | TypeScript type-check only. |
| `npm run fetch-tle` | Download the GP/TLE catalogue → `public/tle/TLE.txt`. |
| `npm run fetch-satcat` | Download SATCAT owner/type map → `public/satcat.json`. |
| `uvicorn api.main:app --reload` | Run the backend AI service (from `backend/`). |

---

## Troubleshooting

- **No satellites appear / globe is empty.** Ensure `public/tle/TLE.txt` exists
  (`npm run fetch-tle`). Hard-reload (Cmd/Ctrl+Shift+R) after long dev sessions —
  hot-reloading the SGP4 Web Worker can leave it stale. Check the console for the
  `[boot] first positions propagated` line.
- **No flags / countries.** Run `npm run fetch-satcat` to generate
  `public/satcat.json`; without it, only a name-based heuristic is used.
- **AI panel says "backend offline".** Start the backend
  (`uvicorn api.main:app --reload`) and verify the endpoint in **Settings**.
- **Created satellite looks like a dot.** Select it — the marker becomes a real
  3D model when selected/zoomed.

---

## Data & licensing

Orbital data is sourced from CelesTrak's public GP API and SATCAT (republished
USSF 18th Space Defense Squadron catalogue). Respect CelesTrak's usage terms
when redistributing.
